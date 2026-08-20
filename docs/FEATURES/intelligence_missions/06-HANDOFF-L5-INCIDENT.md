# 06 — Handoff post-L5 : incident résolu, pilote validé

> **Statut** : ✅ incident clos — **L5 validé en production**.
> **Dernière mise à jour** : 2026-08-20.
> **Autorité normative** : `docs/adr/ADR-0020-missions-intelligence.md` (M-1 à M-7).
> **Historique d'implémentation** : `docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md`.
>
> Ce document remplace l'ancien handoff « L5 bloqué ». Il est autoportant et décrit
> l'état réel après résolution complète de l'incident, les corrections effectivement
> appliquées, la preuve du pilote L5 et la suite logique du chantier.

---

## 1. Résumé exécutif

Le moteur générique « Missions d'intelligence » défini par l'ADR-0020 est désormais
**prouvé de bout en bout sur données réelles**.

État du chantier :

| Lot | Contenu | État |
|---|---|---|
| Cadrage | ADR-0020, décisions M-1 à M-7 | ✅ Terminé |
| L0 | Contrats, catalogue TypeScript, preset pilote | ✅ Livré |
| L1 | CorpusProviders, budget, trace, assemblage prompt | ✅ Livré |
| L2 | Exécuteur n8n générique `mission-001-run` | ✅ Livré, corrigé une fois puis **refigé** |
| L3 | Callback, validation stricte `MissionReportV1`, `mission_report` | ✅ Livré |
| **L5** | Rejouer juillet 2026 et comparer à `intel-021` | ✅ **Validé le 2026-08-20** |
| L4 | Composeur UX Desktop + Mobile | ⏸️ À décider maintenant que L5 est prouvé |

Le pilote final :

- n8n : **exécution `#83406`** ;
- run Kredo : `581e4732-b949-4000-822f-14d86b951351` ;
- `run_type = mission:veille-analyse-mensuelle` ;
- `missionVersion = 3` ;
- corpus : **12/12 sources conservées**, 11 900 caractères ;
- run : **`succeeded`** ;
- résultat : `e476ba8b-a8e0-4701-b97d-3cd86e0ec372` ;
- `result_type = mission_report` ;
- résultat : **`succeeded`** ;
- titre : **« Veille mensuelle IA en entreprise : industrialisation, gouvernance et souveraineté comme leviers commerciaux »**.

La chaîne réellement validée est donc :

```text
Navigateur authentifié
  → POST /api/n8n/trigger
  → résolution serveur du MissionSpec
  → résolution / budget / trace du corpus
  → assemblage systemPrompt + userPrompt
  → création ai_intelligence_runs
  → mission-001-run (n8n)
  → Anthropic
  → callback Next.js signé
  → JSON.parse strict + validation MissionReportV1
  → vérification des SourceRef contre input_snapshot.trace
  → ai_intelligence_results(result_type = mission_report)
  → run succeeded
```

**Le critère fondateur du chantier est désormais démontré** : une intention est portée
par le catalogue TypeScript et exécutée par le workflow générique ; aucun workflow n8n
métier supplémentaire n'est nécessaire.

---

## 2. Références et artefacts faisant foi

### Décisions et handoffs

- `docs/adr/ADR-0020-missions-intelligence.md` — décisions normatives M-1 à M-7.
- `docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md` — construction L0→L3 et cahiers de lot historiques.
- **Ce document** — état courant après L5, résolution de l'incident et preuve de production.

### Code métier missions

```text
src/features/intelligence-missions/
  domain/
    mission-contracts.ts
    mission-catalog.ts
    mission-selectors.ts
    apply-corpus-budget.ts
    validate-mission-report.ts
    render-mission-report-text.ts
  data/
    assemble-mission-prompt.ts
    build-mission-launch.ts
    resolve-mission-corpus.ts
    corpus/
```

### Exécuteur générique

- `n8n/workflows/mission-001-run.json`
- `n8n/workflows/__tests__/mission-001-run.test.js`
- `n8n/workflows/mission-001-run.SETUP.md`

### Endpoints partagés

- `src/app/api/n8n/trigger/route.ts`
- `src/app/api/n8n/callback/route.ts`
- `src/lib/n8n/runs.ts`

---

## 3. Le pilote L5 — scénario exact

Mission testée :

```text
veille-analyse-mensuelle
```

Période :

```text
2026-07-01 → 2026-07-31
```

Déclenchement utilisé depuis un navigateur authentifié :

```js
fetch("/api/n8n/trigger", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    missionSlug: "veille-analyse-mensuelle",
    selectors: [{
      kind: "veille_period",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31"
    }]
  })
}).then(r => r.json()).then(console.log)
```

Corpus résolu en production :

- 2 digests + 10 articles ;
- 12 éléments demandés ;
- 12 conservés ;
- 0 écarté ;
- 11 900 caractères ;
- chaque source porte dans la trace son triplet `kind / table / id`, son titre et sa provenance.

Benchmark historique choisi pour la comparaison :

- résultat `intel-021` : `f82cdd07-13fd-46b2-9f78-0e1859940d3f` ;
- `result_type = strategic_watch_analysis` ;
- titre : **« Analyse stratégique de la veille — Juillet 2026 »**.

---

## 4. Incident L5 — chronologie complète

L'incident a révélé **deux familles de problèmes indépendantes** :

1. un drift de production Supabase affectant la transition des runs vers `failed` ;
2. trois défauts successifs sur le chemin de génération du premier vrai rapport de mission.

### 4.1 Première tentative — n8n `#83368`

Run :

```text
0100b480-d03c-4a1a-beec-fc6d7fc535e1
```

Le workflow n8n apparaissait « Succeeded », mais avait en réalité emprunté sa branche
d'échec interne. Le nœud `Call LLM` renvoyait :

```text
JSON parameter needs to be valid JSON
```

Un résultat d'échec avait été créé :

```text
c9a9a3b8-5586-43b3-9a55-0975d8ee27b1
result_type = mission_report
status = failed
```

Mais le run était resté `running` à cause du drift Supabase décrit au §5.

### 4.2 Deuxième tentative — n8n `#83403`

Run :

```text
af6da8dd-bc8f-4fcc-b062-811328fd1b05
```

Après correction du body `Call LLM`, Anthropic répond correctement. Le callback rejette
cependant la sortie :

```text
Rapport de mission invalide — $:
Sortie LLM non-JSON : Unexpected token '`', "```json ..."
```

Cause : contradiction dans `assemble-mission-prompt.ts` :

- la consigne exigeait un JSON brut sans bloc Markdown ;
- l'exemple de contrat était lui-même entouré par ` ```json ... ``` `.

Le modèle reproduisait donc exactement le format montré dans l'exemple.

### 4.3 Troisième tentative — n8n `#83404`

Run :

```text
5efbe17b-8580-4853-82f8-be937b04f48e
missionVersion = 2
```

Le Markdown est désormais absent, mais le JSON est tronqué :

```text
Sortie LLM non-JSON : Unterminated string in JSON at position 11911
```

Dans n8n, Anthropic indique explicitement :

```text
stop_reason = max_tokens
```

La limite de sortie du preset était encore :

```text
maxOutputTokens = 5000
```

### 4.4 Quatrième tentative — n8n `#83405`

Run :

```text
cfb20816-f115-4d6f-a9f4-9e4d59fa7fb0
```

Même symptôme (`stop_reason = max_tokens`), mais **ce run n'a pas testé la V3**.

Preuve temporelle :

- run créé à `2026-08-20 01:28:33 UTC` ;
- le snapshot Supabase porte encore `missionVersion = 2` ;
- déploiement Vercel du commit V3 devenu `READY` à `2026-08-20 01:29:28 UTC`.

Le run a donc été lancé environ une minute avant que la nouvelle production soit prête.
Il ne constitue pas une régression de la V3.

### 4.5 Cinquième tentative — n8n `#83406` — SUCCÈS

Run :

```text
581e4732-b949-4000-822f-14d86b951351
missionVersion = 3
```

Résultat :

```text
status = succeeded
completed_at = 2026-08-20 01:44:13.503+00
error_message = null
```

Résultat métier :

```text
id = e476ba8b-a8e0-4701-b97d-3cd86e0ec372
result_type = mission_report
status = succeeded
```

Le callback strict a accepté le JSON, validé la structure et vérifié les citations contre
la trace du corpus.

---

## 5. Cause B — drift Supabase sur les runs en échec — RÉSOLU

### 5.1 Symptôme initial

Lors de `#83368`, le callback avait correctement persisté le résultat d'échec mais la
transition du run `running → failed` échouait avec :

```text
relation "user_notifications" does not exist
```

Le trigger live `trg_notify_on_run_failed` appelait `notify_on_run_failed()`, dont le corps
tentait encore un `INSERT INTO user_notifications` alors que cette table avait été
supprimée.

### 5.2 Correction importante du diagnostic initial

L'ancien handoff concluait que la régression était « dormante depuis le 2026-08-04 ».
Cette formulation était **incorrecte**.

La migration repo et distante :

```text
20260804154634_064_remove_user_notifications_bell.sql
```

était bien présente et correcte : elle supprimait le trigger/fonction obsolètes et
redéfinissait le reaper sans `user_notifications`.

L'analyse du cron montre :

- **2013 exécutions réussies** jusqu'au 2026-08-17 23:20 UTC ;
- **97 exécutions en échec** entre le 2026-08-17 23:30 UTC et le 2026-08-18 15:30 UTC ;
- message d'échec : `relation "user_notifications" does not exist`.

Conclusion : l'état live correct a été **réintroduit / reverté hors de la migration 064**
entre environ 23:20 et 23:30 UTC le 17 août. Aucun élément disponible ne permet d'attribuer
avec certitude l'opération à un acteur ou une commande précise. Ne pas transformer cette
inférence en fait.

### 5.3 Correctif appliqué en production

Migration corrective appliquée d'abord via Supabase MCP :

```text
20260818153335_fix_ai_run_failure_notification_drift
```

Elle :

- supprime `trg_notify_on_run_failed` s'il existe ;
- supprime `notify_on_run_failed()` ;
- redéfinit `reap_stale_intelligence_runs()` sans aucune dépendance à
  `user_notifications`.

Fichier repo :

```text
supabase/migrations/20260818153335_fix_ai_run_failure_notification_drift.sql
```

Commit GitHub :

```text
6e310707e687743edf37b22a2fa3628849eaaaaf
```

### 5.4 Rattrapage effectué

Après correction, le reaper a repris **2 runs** :

1. la mission `0100b480-d03c-4a1a-beec-fc6d7fc535e1`, restée `running` ;
2. `646833c7-ead7-42c1-9d6f-289b4594165d`, `intel-020-communication`, restée `queued`.

Vérifications finales :

- `user_notifications` absente : attendu ;
- trigger obsolète absent : attendu ;
- aucun run stale `queued/running` au seuil 15/30 minutes ;
- cron `reap-stale-intelligence-runs` toujours actif toutes les 10 minutes ;
- transitions vers `failed` de nouveau fonctionnelles.

**Ce sujet est clos et indépendant du moteur de missions.**

---

## 6. Cause A1 — `Call LLM` perdait l'enveloppe — RÉSOLU

### Cause

Chemin original :

```text
Validate Envelope
  → Mark Run Running
  → Call LLM
```

`Validate Envelope` produit :

```text
systemPrompt
userPrompt
model
```

Mais `Mark Run Running` est un HTTP PATCH Supabase avec `Prefer: return=minimal`.
Sa sortie ne transporte donc pas l'enveloppe d'entrée.

`Call LLM` utilisait pourtant :

```text
$json.model.model
$json.model.maxOutputTokens
$json.systemPrompt
$json.userPrompt
```

À cet endroit, `$json` ne contenait plus ces valeurs. n8n échouait avant même l'appel à
Anthropic avec `JSON parameter needs to be valid JSON`.

### Correctif

Le body de `Call LLM` référence désormais explicitement le nœud source :

```js
={{ {
  model: $('Validate Envelope').item.json.model.model,
  max_tokens: $('Validate Envelope').item.json.model.maxOutputTokens,
  thinking: { type: 'disabled' },
  system: $('Validate Envelope').item.json.systemPrompt,
  messages: [{
    role: 'user',
    content: $('Validate Envelope').item.json.userPrompt
  }]
} }}
```

Le test `mission-001-run.test.js` protège cette propagation et interdit le retour aux
références `$json.model`, `$json.systemPrompt`, `$json.userPrompt` à cet emplacement.

Validation réalisée lors du correctif :

- test dédié workflow : **112 passed, 0 failed** ;
- `npm run test:n8n` : **114 ok, 0 échec** ;
- suite Vitest : **164/164 fichiers verts** ;
- typecheck + server boundary : **0 erreur**.

### Statut M-6

M-6 disait que `mission-001-run.json` était figé après import. Le défaut ci-dessus était un
**bug runtime du livrable L2 lui-même**. Une exception corrective tracée a donc été faite
sur le JSON versionné, puis la version corrigée a été réimportée manuellement sur le VPS.

> À partir de maintenant, `mission-001-run.json` est **de nouveau figé**.
> Ne pas l'utiliser comme emplacement pour corriger la logique métier, le parsing ou la
> qualité des sorties.

---

## 7. Cause A2 — exemple JSON contradictoire dans le prompt — RÉSOLU

Le validateur `validate-mission-report.ts` applique volontairement :

```text
JSON.parse(rawOutput)
```

sans aucune heuristique :

- pas de suppression de fences Markdown ;
- pas de récupération jusqu'au dernier `}` ;
- pas de réparation de JSON ;
- une sortie invalide fait échouer le run.

Cette doctrine M-2 n'a **pas** été relâchée.

Le correctif a été fait à la source dans :

```text
src/features/intelligence-missions/data/assemble-mission-prompt.ts
```

La consigne actuelle exige :

```text
Réponds UNIQUEMENT par l'objet JSON brut.
Le premier caractère de ta réponse doit être { et le dernier }.
N'ajoute aucun texte avant ou après.
N'utilise jamais de bloc Markdown, de balises ```json ou de backticks.
```

Les fences autour de l'exemple JSON ont été supprimées.

Le preset a été versionné de `1 → 2` à cette occasion.

---

## 8. Cause A3 — sortie LLM tronquée à 5 000 tokens — RÉSOLU

Les exécutions `#83404` puis `#83405` ont montré :

```text
stop_reason = max_tokens
```

Le callback rejetait logiquement un JSON inachevé (`Unterminated string in JSON`).

Correctif du preset `veille-analyse-mensuelle` :

```text
version: 3
maxOutputTokens: 8000
```

Le prompt impose aussi une sortie réellement synthétique :

- `executiveSummary` : maximum 8 phrases ;
- `findings` : maximum 8 constats ;
- `statement` : maximum 3 phrases ;
- `recommendations` : maximum 5 ;
- `rationale` : maximum 3 phrases ;
- priorité aux éléments structurants plutôt qu'à l'exhaustivité ;
- déduplication des sources dans `sourceRefs`.

Commit :

```text
3a105fdf0ec3d0e963e36f51b7d855c10ef32054
```

Validation associée :

- `npx vitest run src/features/intelligence-missions` : **111 passed, 0 failed** ;
- `npm run typecheck` : **0 erreur** ;
- `npm test` : **164/164 fichiers, 1629 tests verts**.

Déploiement production Vercel :

```text
dpl_CknvRHFaoERj7UUVtozzgcfYZciX
```

Commit déployé : `3a105fdf...`, état `READY`.

Aliases de production incluant :

```text
kredo-green.vercel.app
kredo-sales-app.vercel.app
```

---

## 9. Preuve métier L5 — comparaison avec `intel-021`

### Ancien résultat spécialisé

```text
id = f82cdd07-13fd-46b2-9f78-0e1859940d3f
result_type = strategic_watch_analysis
```

Le contrat `intel-021` est spécialisé :

```text
majorTrends
weakSignals
commercialOpportunities
regulatoryDevelopments
risksAndWatchpoints
priorityActions
```

### Nouveau résultat générique

```text
id = e476ba8b-a8e0-4701-b97d-3cd86e0ec372
result_type = mission_report
```

Structure `MissionReportV1` :

```text
schemaVersion
title
executiveSummary
findings[]
recommendations[]
sourceRefs[]
```

Le rapport final contient :

- **7 findings** ;
- **5 recommendations** ;
- **11 sources consolidées** effectivement mobilisées ;
- citations validées contre les 12 références `kept: true` de la trace.

### Concordance observée

Les deux analyses convergent sur les axes structurants suivants :

| Thème | `intel-021` | Mission générique |
|---|---:|---:|
| Passage pilote → industrialisation | ✅ | ✅ |
| Choix du modèle IA moins différenciant | ✅ | ✅ |
| Gouvernance de l'IA agentique | ✅ | ✅ |
| Build vs Buy en secteurs réglementés | ✅ | ✅ |
| NIS2 / conformité / souveraineté | ✅ | ✅ |
| Bordeaux Aéroport / Poppy | ✅ | ✅ |
| MUFG / Deutsche Telekom | ✅ | ✅ |
| Rovaltain comme signal faible | ✅ | ✅ |
| Cerebras / capacité IA européenne | ✅ | ✅ |
| Offre audit gouvernance IA | ✅ | ✅ |
| Audit data / cadre méthodologique | ✅ | ✅ |

### Nuance importante sur le critère de comparaison

`Finding.category` est une **énumération autorisée**, pas une checklist de six sections
obligatoires. Le rapport final n'a pas besoin de forcer artificiellement un finding dans
chaque catégorie.

La preuve L5 porte sur :

- la conservation des thèmes métier importants ;
- la qualité d'analyse au moins comparable ;
- la production de recommandations actionnables ;
- la traçabilité des citations ;
- le fonctionnement du contrat générique sans logique spécifique dans n8n.

La comparaison est donc **fonctionnellement validée**, même si la structure générique ne
reproduit pas à l'identique les rubriques spécialisées d'`intel-021`.

---

## 10. Invariants à ne plus casser

### M-1 — métier TypeScript

Toute intention, contrainte, règle de corpus ou règle de rendu appartient à :

```text
src/features/intelligence-missions/
```

Pas dans un nœud Code n8n.

### M-2 — validation uniquement dans le callback Next.js

`mission-001-run` transmet le texte du modèle. Le validateur strict vit dans :

```text
src/features/intelligence-missions/domain/validate-mission-report.ts
```

Ne jamais introduire de parser/réparateur parallèle dans n8n.

### M-3 — runs ordinaires

```text
run_type = mission:<slug>
```

Aucune nouvelle table spécifique aux missions.

### M-4 — une seule phase

```text
phase = 1
```

Les missions ne deviennent pas un moteur multi-étapes.

### M-5 — corpus résolu côté serveur

Le navigateur ne fournit jamais un corpus déjà hydraté ni un `workspaceId` faisant foi.
Les providers sont allowlistés et exécutés sous le contexte serveur prévu.

### M-6 — workflow générique refigé

Après l'exception corrective L2 décrite au §6 :

```text
n8n/workflows/mission-001-run.json
```

est de nouveau **figé**.

### M-7 — contrat unique

Toute mission produit :

```text
MissionReportV1
result_type = mission_report
```

Le `resultType` n'est jamais configurable par le preset ni par l'utilisateur.

---

## 11. État opérationnel à reprendre

### Supabase

- incident `user_notifications` : **clos** ;
- reaper : opérationnel ;
- aucun rattrapage mission supplémentaire nécessaire ;
- run de preuve L5 : `succeeded` ;
- résultat `mission_report` disponible et exploitable.

### n8n

- `mission-001-run` importé sur le VPS ;
- credentials Supabase et Anthropic fonctionnels ;
- signature HMAC fonctionnelle ;
- appel Anthropic fonctionnel ;
- success callback fonctionnel ;
- failure callback déjà éprouvé pendant l'incident ;
- workflow générique **à ne plus modifier**.

### Next.js / Vercel

Production courante pour le correctif final L5 :

```text
commit = 3a105fdf0ec3d0e963e36f51b7d855c10ef32054
deployment = dpl_CknvRHFaoERj7UUVtozzgcfYZciX
state = READY
```

### Preset pilote courant

```text
slug = veille-analyse-mensuelle
version = 3
provider = anthropic
model = claude-sonnet-5
maxOutputTokens = 8000
```

---

## 12. Ce qu'il ne faut surtout pas refaire

- Ne pas réouvrir le drift `user_notifications` comme s'il était encore actif.
- Ne pas modifier `validate-mission-report.ts` pour accepter les fences Markdown ou un JSON tronqué.
- Ne pas augmenter les tokens indéfiniment pour compenser un prompt verbeux : le preset V3 combine marge et règles de concision.
- Ne pas déplacer l'assemblage du prompt dans n8n.
- Ne pas ajouter de nœud de validation métier dans `mission-001-run`.
- Ne pas créer un workflow n8n par nouvelle intention.
- Ne pas créer une table `missions` ou `mission_results` parallèle.
- Ne pas utiliser le résultat `intel-021` comme schéma obligatoire : c'est le benchmark métier, pas le contrat cible.
- Ne pas conclure qu'un workflow n8n affiché « Succeeded » signifie qu'un run métier Kredo a réussi : la source de vérité est Supabase (`ai_intelligence_runs` + `ai_intelligence_results`).

---

## 13. Suite logique du chantier

Le moteur + la preuve L5 sont terminés. **Il n'y a plus de correctif incident à faire.**

La prochaine décision produit est désormais **L4 — Composeur UX Desktop + Mobile**.

L4 avait volontairement été suspendu jusqu'à la preuve L5. Cette condition est maintenant
remplie. Si L4 est lancé, il doit être un consommateur léger du moteur existant :

```text
UI
  → sélection d'une mission du catalogue
  → collecte des CorpusSelector autorisés
  → POST /api/n8n/trigger
  → affichage de l'état du run / résultat
```

Contraintes pour L4 :

- aucune nouvelle logique métier dupliquée dans les composants ;
- aucun nouvel appel direct à n8n depuis le navigateur ;
- aucun nouveau workflow ;
- Desktop = analyse dense ; Mobile = action synthétique, composants distincts selon les règles adaptatives Kredo ;
- le catalogue TypeScript reste la source de vérité sur ce qui peut être lancé ;
- ne pas démarrer L4 tant que son périmètre produit exact n'est pas explicitement acté.

Avant d'implémenter L4, la bonne action est donc **un cadrage produit court**, pas une
nouvelle phase de diagnostic technique du moteur.

---

## 14. Points de reprise rapide pour un nouvel agent

Lire dans cet ordre :

1. `docs/adr/ADR-0020-missions-intelligence.md` — M-1 à M-7 font autorité.
2. **Ce document** — état réel après L5 et incidents déjà clos.
3. `docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md` — historique détaillé L0→L3 et conception initiale de L4.
4. Seulement ensuite, ouvrir le code nécessaire au prochain lot.

État à retenir en une phrase :

> **Le moteur générique Missions d'intelligence est opérationnel et prouvé en production ; L5 est validé, `mission-001-run` est refigé, et la prochaine décision est de cadrer puis éventuellement reprendre L4 UX.**
