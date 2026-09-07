# Handoff Codex — Account Knowledge V4, reprise après Lot 1

**Rédigé par :** Claude (Opus 5 → Sonnet 5), session du 2026-09-06/07.
**Destinataire :** Codex, pour poursuivre le chantier.
**État au moment de l'écriture :** Lot 1 livré et poussé (2 commits), Lot 2 non commencé.
**Lire dans cet ordre :** ce document → `ACCOUNT-KNOWLEDGE-V4-CADRAGE.md` (§14 à §18 au minimum) →
`LOT-1-RESOLUTION-ENTITE.md` si tu dois toucher à la résolution d'entité.

---

## 1. Le chantier en une minute

Guillaume juge le workflow `intel-030-account-knowledge` (l'onglet « Entreprise » du hub compte)
« d'une nullité navrante » : il consomme ~24 000 tokens et 130 s pour publier 5 à 11 phrases,
souvent des paraphrases de code NAF, quand la base contient déjà la matière d'un vrai récit
(descriptions rédigées, études FOLIO historiques, connaissance sectorielle résolue).

**Décision actée avec Guillaume (confirmée explicitement) :** refondre en V4, moteur de
**compréhension d'entreprise** plutôt que système de vérification documentaire. Périmètre
tranché — la V4 couvre métier/marché/concurrents/histoire/ambitions/actualité et **pas**
l'adressabilité commerciale (canal d'achat, référencement) ni les rôles de décision, qui se
saisissent via un formulaire distinct. Elle restitue en revanche l'historique Kredo avec le compte
(missions, TJM, motifs de gain/perte) et ajoute une section « Ce que cela implique pour KREDO ».

Le plan complet est dans `ACCOUNT-KNOWLEDGE-V4-CADRAGE.md`, 6 lots :

1. **Résolution d'entité et arrêt de la contamination** — LIVRÉ (ce handoff).
2. Contexte unifié (nouvelle RPC) et contrat technique V4 — **à faire, c'est ta prochaine étape**.
3. Workflow `intel-030` V4 (recherche large, 1 appel LLM, garde-fous déterministes).
4. Restitution éditoriale Desktop/Mobile (prose, sur les primitives FOLIO déjà écrites).
5. Benchmark FOLIO/V3/V4 sur 5 comptes et bascule.
6. Vérification à la demande — hors périmètre, patron déjà connu (`intel-034`).

---

## 2. Ce qui a été trouvé pendant l'audit, et qui compte pour la suite

Ces faits ne se déduisent pas du code seul — ils viennent de l'ouverture d'artefacts réels en base
et de rejeux d'appels externes. Je les liste parce qu'un audit qui repart du seul code du dépôt
les raterait à nouveau.

- **Le run V3 du 04/09 sur « Tournaire » a publié l'identité d'une autre entreprise** (SIREN d'une
  entreprise de BTP lyonnaise au lieu du fabricant d'emballages de Grasse). Les 12 `qa_flags`
  étaient au vert. C'est la cause du Lot 1.
- **Le canal presse de la V3 est mort en production** : le flux Google News RSS répond HTTP 200
  avec un corps vide (`unreachable_200`). À vérifier si ça persiste avant de le réutiliser en V4.
- **V3 est une régression mesurée sur V2** : 5-11 affirmations publiées contre 15-27, pour un
  coût comparable (~24k tokens, 130-150s, 0,09$/run — le workflow par-compte le plus cher).
- **La matière existe déjà et n'est jamais lue par le prompt actuel** : 88/112
  `companies.description` rédigées, 93 études FOLIO Phase 1, 81 Phase 2, 38/38 segments avec
  connaissance sectorielle résolue (`v_sector_knowledge_resolved`), `sector_regulatory_items`,
  `sector_pain_points`, `competitive_map_entries`. La RPC actuelle (`get_account_knowledge_context`)
  ne sert **aucune** de ces sources sectorielles — c'est le premier chantier du Lot 2.
- **La RPC actuelle filtre trop fort côté KREDO aussi** : `verifiedFacts` ne garde que
  `verified_at` non nul (152/648 faits), et les signaux `archived` sont invisibles (723/843) —
  sur les deux comptes réellement étudiés en V3, 100 % des signaux étaient archivés.
- **Un rapport ChatGPT produit le même jour a cadré juste sur la philosophie** (Serper en
  découverte, un seul appel LLM, qualification à 4 niveaux) **mais a manqué le défaut le plus
  grave** (l'erreur d'entité) parce qu'il n'a pas ouvert les artefacts, et a émis une fausse
  alerte de sécurité sur une clé Serper qui n'était en fait jamais exposée (vérifié : les JSON
  FOLIO legacy lisent `$env.SERPER_API_KEY`, jamais une valeur en clair). Leçon : ne jamais
  auditer ce workflow sur la seule lecture du code, toujours rejouer un artefact réel.

---

## 3. Ce que le Lot 1 a livré (fait, poussé, ne pas refaire)

**2 commits sur `main`** (`f7e3344a`, `e47b4579`).

### 3.1 Le module — source de vérité

`src/lib/intelligence/entity-resolution.ts` (34 tests dans `entity-resolution.test.ts`). Pur, sans
I/O. Doctrine : *le nom est une porte, jamais une décision*. Invariant structurel :
`RESOLVED_MIN_SCORE` (4) > `WEIGHTS.name` (3) — un nom, même identique, ne résout jamais une
entité seul, il faut une confirmation indépendante (commune du siège concordante, ou NAF déjà
connu du CRM). Trois issues : `resolved` (écriture canonique autorisée) /
`needs_human_confirmation` / `unresolved` (les deux dernières : écriture interdite).

Fonctions clés à connaître si tu dois y toucher :
- `resolveEntity(account, candidates)` → décision + candidat + trace d'audit complète.
- `rankIdentityCandidates(account, candidates)` → classement pour une UI de confirmation humaine,
  avec `recommendedSiren: null` si le module ne trancherait pas lui-même.
- `verifyKnownSiren(account, candidate)` → contrôle d'un SIREN déjà en base.
- `buildRegistrySearchQueries`, `normalizeRegistryResult` → interface avec
  `recherche-entreprises.api.gouv.fr`.

### 3.2 Où le module est branché

| Site | Ce qui a changé |
|---|---|
| `n8n/workflows/intel-030-account-knowledge.json` | 4 nœuds patchés (`V3 Fetch Public Registry` per_page 3→10, `V3 Consult & Normalize Sources` résolution transcrite, `V3 Build Source Catalogue` propage `entityResolution`, `V3 Build Enrichment Proposals` garde `can_propose_canonical_writes`) |
| `n8n/workflows/INTEL-010 — intel-010-refresh-account-infos.json` | 2 nœuds (`Search Legal Registry` per_page 5→10, `Resolve Entity` scoring remplacé) |
| `src/app/api/intelligence/account-identity/route.ts` | candidats scorés/ordonnés/expliqués au lieu de l'ordre brut API |
| `src/components/accounts-contacts/scan/AccountScanIdentityConfirm.tsx` | présélection **uniquement** si `recommendedSiren` non nul |
| `src/lib/n8n/types.ts` | `AccountScanResolutionCandidate` += `coherent?`, `reason?` (optionnels) |

Les transcriptions n8n sont dans `scripts/entity-resolution-node.js` (généré à la main depuis le
module TS — **si tu modifies `entity-resolution.ts`, tu dois re-générer/re-patcher les deux
workflows**, sinon ils divergent en silence). Scripts de patch reproductibles :
`scripts/patch-intel-030-entity-resolution.py`, `scripts/patch-intel-010-entity-resolution.py`.
Un contrôle croisé dans le harnais `intel-010-refresh-account-infos.test.js` vérifie que les deux
workflows portent littéralement les mêmes seuils (`RESOLVED_MIN_SCORE`, `RESOLVED_MIN_NAME_SCORE`,
`REGISTRY_PER_PAGE`) — ne le supprime pas.

### 3.3 Assainissement de la base

15 propositions d'enrichissement (`enrichment_proposals`) passées en `status = 'rejected'` le
2026-09-07, sur 3 comptes dont l'identité proposée appartenait à une autre personne morale
(Tournaire, MMV → identité de « Depil Tech » un autre compte du CRM, D-Orbit → « ORBIT »
restauration parisienne). `decision_reason` porte la trace. Vérifié en base à l'instant : **les
15 lignes sont bien `rejected`**, réversible via `update ... set status='proposed', decision_at=null,
decision_reason=null`.

**10 comptes restent à arbitrer humainement** (SIREN suspects en base ou propositions ambiguës) —
liste complète au §5 de `LOT-1-RESOLUTION-ENTITE.md`. Ce n'est pas bloquant pour le Lot 2, mais
mentionne-le à Guillaume si tu le croises.

### 3.4 État de vérification — IMPORTANT, à faire avant de considérer le Lot 1 clos

- Les deux workflows sont **réimportés sur le VPS** (confirmé par Guillaume le 2026-09-07).
- `npm run n8n:status` rend maintenant **0 doublon** sur les deux (5 et 8 copies clutter la veille
  — quelqu'un a fait le ménage entre-temps) et un nombre de nœuds identique repo/VPS. **Mais ce
  contrôle ne compare que des compteurs de nœuds, jamais le contenu du code** — il ne peut pas
  prouver que le code déployé est le code patché. C'est exactement l'angle mort qui avait laissé
  passer la dérive du 04/09 (le workflow VPS n'était pas celui du dépôt, invisible à `n8n:status`).
- **Vérifié en base à l'instant (2026-09-07) : aucun run `intel-030-account-knowledge` ni
  `intel-010-refresh` n'a eu lieu depuis le patch.** La correction n'a donc **jamais été
  exercée en conditions réelles**. Avant de commencer le Lot 2, ou dès que l'occasion se
  présente, déclenche (ou demande à Guillaume de déclencher) un scan/run réel sur un compte —
  idéalement Tournaire — et vérifie que `content_json` / `context_snapshot` portent bien un bloc
  `entityResolution` avec `siren: "415550110"` (jamais `505063438`), et que `qa_flags` contient
  `entity_resolution: passed=true`. Si ce n'est pas le cas, le Lot 1 n'est pas réellement en
  production malgré le réimport annoncé.

---

## 4. Ta tâche : Lot 2 — Contexte unifié et contrat technique V4

Détail complet au §18 de `ACCOUNT-KNOWLEDGE-V4-CADRAGE.md`. Résumé actionnable :

### 4.1 Nouvelle RPC `get_account_understanding_context`

Ne touche **pas** à `get_account_knowledge_context` (la V3 continue de tourner en parallèle
jusqu'à la bascule du Lot 5). Crée une RPC séparée, même doctrine de sécurité que l'existante
(`security invoker`, `search_path = ''`, `EXECUTE` au seul `service_role` — vérifier le motif
exact sur la fonction actuelle avant d'écrire la migration).

Elle doit servir, en plus de ce que sert déjà `get_account_knowledge_context` :
- `companies.siren`, `companies.naf_code` (existent déjà en colonne, jamais servis par la RPC V3)
- **tous** les faits courants avec leur niveau de preuve (pas seulement `verified_at` non nul)
- **tous** les signaux avec leur statut et leur date (pas de filtre `archived`)
- `account_issues`
- `intelligence_documents` (au moins les métadonnées, à discuter si le corps aussi)
- `v_sector_knowledge_resolved` et `v_sector_knowledge_items` pour le segment du compte
  (`companies.segment_id`, **jamais** `sector_id` — lire la note CLAUDE.md à ce sujet, c'est un
  piège documenté)
- `competitive_map_entries`, `value_chain_nodes/actors/links` pertinents
- le legacy FOLIO complet (déjà servi, garder)

### 4.2 Contrat TypeScript V4

Dans `src/lib/intelligence/account-intelligence-contracts.ts`, à côté de V1/V2/V3 (jamais les
remplacer). `schema_version: 4`. Forme candidate au §17 du cadrage — **à challenger, pas à copier
aveuglément** : le cadrage dit explicitement de partir des besoins plutôt que de figer un schéma.
Points fixes non négociables :
- champs narratifs (`narrative: string[]`) en plus de la structure machine — c'est ce qui manque
  structurellement à V3 et qui interdit toute prose
- qualification à 4 niveaux (`established` / `declared` / `inferred` / `hypothesis`) au lieu du
  binaire confirmed/rejected de V3
- `entity_resolution` en tête d'artefact (bloc du Lot 1, déjà spécifié —
  `EntityResolutionSnapshot` dans `entity-resolution.ts`)

Ajoute la branche `schema_version === 4` dans `parseAccountKnowledgeArtifact`
(`intelligence-validators.ts`) et le validateur associé. Étends `AccountKnowledgeTriggerInput`
(`src/lib/n8n/types.ts`) de `2 | 3` à `2 | 3 | 4`.

### 4.3 Ce que tu ne fais PAS dans ce lot

- Pas de workflow n8n V4 (Lot 3).
- Pas de composant de restitution (Lot 4 — mais les primitives existent déjà dans
  `src/components/accounts-contacts/intelligence/folio-v3/*`, regarde-les avant de penser devoir
  tout réécrire en Lot 4).
- Pas de bascule de la V3 : elle continue de tourner, boutons et déclenchement UI inchangés.

---

## 5. Pièges déjà documentés, ne pas les redécouvrir

- `npm run build` peut échouer avec `ENOTEMPTY` sur `.next/server` après un build précédent
  interrompu — `rm -rf .next` avant de relancer.
- `docs/` a été réorganisé en août 2026, pas commité entièrement — utilise `find docs -name`
  plutôt que de faire confiance à un chemin cité ailleurs.
- Boucle de validation avant de déclarer un lot fini : `typecheck` → `test` → (`test:n8n` dès
  qu'un fichier `n8n/workflows/` est touché — **lire le compteur d'assertions final, jamais le
  seul code de sortie**, un nœud Code cassé peut avaler silencieusement tout le reste) →
  `check:server-boundary` → `lint` → `build`.
- Import/activation n8n sur le VPS restent manuels, faits par Guillaume — jamais toi.
- `companies.sector_id` est une **projection**, jamais une source de lecture pour la connaissance
  sectorielle — toujours passer par `companies.segment_id` → `v_sector_knowledge_resolved`.

---

## 6. Fichiers à lire avant d'écrire du code

1. `docs/FEATURES/cockpit_intelligence_features/account_knowledge/ACCOUNT-KNOWLEDGE-V4-CADRAGE.md`
   — le document de référence, en entier si possible, au moins §14-§18.
2. `docs/FEATURES/cockpit_intelligence_features/account_knowledge/LOT-1-RESOLUTION-ENTITE.md` —
   détail du Lot 1, utile seulement si tu touches à la résolution d'entité.
3. `src/lib/intelligence/entity-resolution.ts` — le bloc `EntityResolutionSnapshot` en bas de
   fichier est ce que ton contrat V4 doit inclure tel quel en tête d'artefact.
4. Le corps de `public.get_account_knowledge_context` en base (lecture directe via
   `execute_sql`, pas le fichier de migration — la doc CLAUDE.md est formelle là-dessus : lire le
   schéma réel à la source).
5. `n8n/workflows/intel-030-account-knowledge.json`, nœuds `V3 Prepare Context & Research Plan`
   et `V3 Assemble Draft Prompt` — pour voir précisément ce que le research plan actuel couvre et
   ne couvre pas.

Bon courage. Le sujet est cadré, le socle est propre, la partie qui reste (Lot 2) est la moins
risquée du chantier — c'est de la plomberie SQL et TypeScript, pas encore du prompt engineering.
