# 06 — Handoff incident : lot L5 bloqué (missions d'intelligence)

Rédigé le 2026-08-18 pour reprise par un autre agent (ChatGPT). Lecture seule effectuée
jusqu'ici — **aucune correction appliquée**, aucun fichier modifié. Document autoportant :
lire dans l'ordre, sans supposer de contexte préalable.

---

## 1. Où en est le chantier

ADR-0020 « Missions d'intelligence », ordre strict `L0 → L1 → L2 → L3 → L5` :

- **L0 → L3 livrés, testés, commités et déployés en production** (commit `7f92749b`,
  déploiement Vercel `dpl_5fxWHt8zC9mBbg1xj7z6QJJ8GS1h`, alias `kredo-green.vercel.app`).
- `mission-001-run.json` importé sur le VPS n8n par Guillaume (fait).
- **L5 (le pilote)** est en cours : rejouer la mission `veille-analyse-mensuelle` sur la
  période déjà analysée par `intel-021` (juillet 2026), comparer les deux sorties.
  **C'est cette tentative de lancement qui a révélé les deux problèmes ci-dessous.**

Document faisant autorité sur tout le reste du chantier :
`docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md` (§2 état d'avancement,
§4 configuration par lot, §8 détail du lot L3). ADR complet :
`docs/adr/ADR-0020-missions-intelligence.md` (décisions normatives M-1 à M-7, à ne jamais
renégocier).

---

## 2. Ce qui vient de se passer (faits mesurés, pas supposés)

Mission lancée depuis le navigateur (aucune UI dédiée n'existe encore — L4 suspendu),
via `fetch` authentifié vers `/api/n8n/trigger` :

```json
{ "missionSlug": "veille-analyse-mensuelle",
  "selectors": [{ "kind": "veille_period", "periodStart": "2026-07-01", "periodEnd": "2026-07-31" }] }
```

Réponse : `202 { runId: "0100b480-d03c-4a1a-beec-fc6d7fc535e1", status: "queued" }`.

Exécution n8n `ID#83368` affichée **« Succeeded in 9.401s »** — **trompeur** : le workflow
a emprunté sa branche d'ÉCHEC interne (`Call LLM` → erreur → `Prepare Failure Callback` →
`Callback (Failure)`), pas la branche heureuse. « Succeeded » ne dit que « le workflow n'a
pas planté », pas « la mission a réussi ».

État en base (vérifié par SQL, lecture seule) :

- `ai_intelligence_results` (id `c9a9a3b8-5586-43b3-9a55-0975d8ee27b1`) : créé, correctement
  `result_type = "mission_report"`, `status = "failed"`, `title = "Mission —
  veille-analyse-mensuelle — échec"`, `content_json = {"error": "Échec du workflow
  mission-001-run"}` — message générique, sans détail exploitable.
- `ai_intelligence_runs` (id `0100b480-...`) : **reste bloqué à `status = "running"`**
  (`current_phase = 1`, `error_message = null`, `failed_at = null`, `completed_at = null`)
  alors que le callback a bien tenté de le faire passer à `"failed"`.

**Conclusion partielle : le callback lui-même (lot L3) a correctement traité ce payload
d'échec** — `saveResult` a persisté le bon `result_type` — mais l'étape suivante
(`updateRunStatus`) a échoué. Deux causes distinctes, sans rapport l'une avec l'autre.

---

## 3. Cause A — le nœud `Call LLM` a échoué (côté n8n, cause exacte inconnue)

Le nœud HTTP `Call LLM` (`POST https://api.anthropic.com/v1/messages`) est parti en erreur.
Le nœud `Prepare Failure Callback` (code JS dans `mission-001-run.json`) tente d'extraire un
message via `failure.error?.message || failure.message || failure.errorMessage`, sans
succès ici — d'où le message générique en base. **La vraie cause n'est visible que dans
l'UI n8n** : ouvrir l'exécution `ID#83368`, nœud `Call LLM`, panneau Output de la branche
Error.

Hypothèses à vérifier côté n8n (pas de diagnostic possible depuis Kredo) : credential
Anthropic invalide/expiré, `model.model` incorrect (`$json.model.model`, valeur fournie par
`assemble-mission-prompt.ts`), format de requête refusé, quota/rate limit.

🔴 **Rappel M-6 (ADR-0020)** : `mission-001-run.json` est figé, plus jamais modifié. Un
correctif de credential/config dans n8n (case du nœud, pas son code) n'enfreint pas cette
règle ; réécrire le JSON du workflow, si.

---

## 4. Cause B — bug de production préexistant, INDÉPENDANT du chantier missions

**C'est le problème le plus important de ce handoff.** Sans rapport avec les missions ni
avec le lot L3 : une régression dormante depuis deux semaines, qui vient de se révéler
parce que ce run-ci a échoué.

### Preuve

```sql
select tgname, pg_get_triggerdef(oid)
from pg_trigger where tgrelid = 'public.ai_intelligence_runs'::regclass and not tgisinternal;
```
→ `trg_notify_on_run_failed` (`AFTER UPDATE ON ai_intelligence_runs`) exécute
`notify_on_run_failed()`. Corps de la fonction (`pg_proc.prosrc`) :

```sql
if new.status = 'failed' and old.status is distinct from 'failed'
   and coalesce(current_setting('kredo.suppress_run_failed_notification', true), '') <> 'true'
then
  insert into user_notifications (workspace_id, user_id, notification_type, title, body, deep_link)
  values (...);
end if;
```

La table `user_notifications` a été **supprimée** par la migration
`supabase/migrations/20260804154634_064_remove_user_notifications_bell.sql` (2026-08-04) —
le trigger, lui, n'a jamais été mis à jour ni supprimé. Confirmé en production, logs
runtime Vercel (projet `prj_uYbZ6xhvNQYgGtuBdusGKDbO0ytu`) :

```
[callback] updateRunStatus failed: Error: relation "user_notifications" does not exist
2026-08-18T14:56:03Z · route /api/n8n/callback · déploiement dpl_5fxWHt8zC9mBbg1xj7z6QJJ8GS1h
```

### Conséquence

**Tout run qui échoue, sur n'importe lequel des ~12 workflows de production** (pas
seulement les missions), ne peut plus jamais transitionner vers `status = "failed"` : le
trigger fait échouer la transaction UPDATE entière ; `updateRunStatus()`
(`src/lib/n8n/runs.ts`) la rattrape en silence (« non bloquant : le résultat est déjà
sauvé, on log et on continue ») — comportement voulu pour ne pas faire échouer un callback
n8n sur un problème de notification, mais qui masque ici une vraie perte de signal. Le run
reste visible comme `running` indéfiniment.

**Périmètre mesuré, à ce stade** : 1 seul run actuellement bloqué depuis plus de 5 minutes
(le nôtre — requête `select count(*) from ai_intelligence_runs where status='running' and
started_at < now() - interval '5 minutes'` → 1). **L'étendue historique depuis le
2026-08-04 n'a PAS été mesurée** — nécessaire avant de corriger, pour savoir si un
rattrapage de données (runs faussement `running`) s'impose en plus du correctif de trigger.
Vérifier aussi si `reap_stale_intelligence_runs()` (fonction cron, schéma `private`) écrit
`status = 'failed'` par le même chemin — si oui, elle est probablement affectée aussi.

---

## 5. Prochaines étapes suggérées, dans l'ordre

1. **Mesurer l'étendue réelle de la cause B** avant toute correction : compter les runs
   `status = 'running'` sans `completed_at` ni `failed_at`, `started_at` ancien, tous
   `run_type` confondus, depuis le 2026-08-04.
2. **Corriger `notify_on_run_failed()`** par migration (`apply_migration` via MCP
   `supabase`, jamais écrite à la main en premier — piège déjà documenté 3 fois sur ce
   projet) : soit repointer vers une table de notification existante, soit neutraliser
   proprement l'`INSERT`, soit recréer une table adaptée. Ce correctif ne touche à rien du
   chantier missions et devrait être livré indépendamment.
3. **Diagnostiquer et corriger la cause A** côté n8n (Guillaume) : credential/config du
   nœud `Call LLM`, sans modifier `mission-001-run.json`.
4. **Relancer la mission** sur la même période, même appel :
   `POST /api/n8n/trigger { missionSlug: "veille-analyse-mensuelle", selectors: [{ kind:
   "veille_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" }] }` depuis un
   navigateur authentifié (pas de composeur dédié, L4 suspendu).
5. **Une fois `succeeded`** : comparer le `mission_report` produit à l'analyse `intel-021`
   déjà existante (`ai_intelligence_results.id = "f82cdd07-13fd-46b2-9f78-0e1859940d3f"`,
   `result_type = "strategic_watch_analysis"`, titre « Analyse stratégique de la veille —
   Juillet 2026 »). Critère de sortie L5 (§4 du handoff principal) : couverture des six
   catégories (`Finding.category` : tendance, signal_faible, reglementaire, opportunite,
   risque, autre) à qualité au moins équivalente.

---

## 6. Garde-fous à ne pas oublier

- **M-6** : `mission-001-run.json` figé, ne plus jamais le modifier.
- **M-1 / M-2** : aucune logique métier dans n8n ; toute validation de sortie LLM vit dans
  `src/features/intelligence-missions/domain/validate-mission-report.ts`, appelée depuis
  le callback Next.js, jamais dans un nœud n8n.
- `src/app/api/n8n/callback/route.ts` est le point d'arrivée unique de 12 workflows en
  production. Toute modification y suit la discipline du lot L3 : additions seulement,
  non-régression prouvée par test (le fichier `route.test.ts` compte aujourd'hui 13 tests,
  tous doivent continuer à passer inchangés), boucle de validation complète avant de
  committer (`typecheck && test && check:server-boundary && lint && build`, purger
  `.next` avant le build).
- Le VPS n8n est administré par Guillaume. **Aucun outil MCP n8n disponible en session
  agent sur ce projet** — JSON versionné + import manuel uniquement, jamais de handoff
  terminal pour n8n (rejeté explicitement par Guillaume).
- Toute nouvelle migration : `apply_migration` via MCP `supabase` d'abord, fichier local
  créé APRÈS avec le timestamp réellement assigné, jamais l'inverse.

---

## 7. Où lire le contexte complet

| Besoin | Fichier |
|---|---|
| État complet du chantier missions | `docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md` |
| Décisions normatives M-1 à M-7 | `docs/adr/ADR-0020-missions-intelligence.md` |
| Historique des sessions (L1, L3, correctif d'aiguillage) | `docs/JOURNAL-SESSIONS.md`, Sessions 46-48 |
| État de la base, migrations, conventions | `CLAUDE.md` § Supabase |
