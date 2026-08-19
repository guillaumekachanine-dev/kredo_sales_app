# HANDOFF — L0 : Contrats V2 + résolution serveur des sources

**Date** : 2026-08-19
**Commit de référence** : `6efeaaa2c724f4235304b0340483015924b39697`
**Statut** : L0 livré. L1 et L2 non commencés.

## 1. Résumé

Pose le contrat TypeScript V2 de l'analyse à la demande (`WatchAnalysisInputV2`) et un
résolveur serveur (`resolveWatchAnalysisSources`) qui revalide chaque référence choisie
par l'utilisateur contre Supabase (RLS + `workspace_id` explicite) avant qu'elle ne
puisse être transmise à n8n. Aucune UI, aucun changement n8n, aucune écriture Supabase.

## 2. Fichiers créés / modifiés

**Modifié**
- [src/lib/n8n/types.ts](../../../../src/lib/n8n/types.ts) — ajout de `WatchAnalysisSource` et `WatchAnalysisInputV2`, insérés juste après le contrat V1 (`MonthlyWatchAnalysisInput`/`Output`), inchangé.

**Créés**
- [src/features/watch-analysis/domain/watch-analysis-contracts.ts](../../../../src/features/watch-analysis/domain/watch-analysis-contracts.ts) — `validateWatchAnalysisInput()`, pure, sans dépendance externe.
- [src/features/watch-analysis/data/resolve-watch-analysis-sources.ts](../../../../src/features/watch-analysis/data/resolve-watch-analysis-sources.ts) — `resolveWatchAnalysisSources()`, server-only. Définit aussi `WatchAnalysisResolvedRef` et `ResolvedWatchAnalysisSources`.
- [src/features/watch-analysis/__tests__/fake-supabase.ts](../../../../src/features/watch-analysis/__tests__/fake-supabase.ts) — faux client Supabase local au lot (miroir réduit de celui d'`intelligence-missions`).
- [src/features/watch-analysis/__tests__/validate-watch-analysis-input.test.ts](../../../../src/features/watch-analysis/__tests__/validate-watch-analysis-input.test.ts) — 14 tests.
- [src/features/watch-analysis/__tests__/resolve-watch-analysis-sources.test.ts](../../../../src/features/watch-analysis/__tests__/resolve-watch-analysis-sources.test.ts) — 13 tests.

Aucun fichier hors périmètre touché (UI Veille, `intel-021-*`, `save-as-document.ts`,
Missions d'intelligence, Supabase : tous intacts).

## 3. Contrat réellement implémenté

Conforme à `01-ARCHITECTURE-ET-CONTRATS.md` §4 sans changement de forme, avec deux
précisions apportées à l'implémentation :

- `WatchAnalysisSource` / `WatchAnalysisInputV2` vivent dans `src/lib/n8n/types.ts`
  (emplacement explicitement demandé par `02-ROADMAP-ET-HANDOFF.md` §2), aux côtés du
  contrat V1.
- `WatchAnalysisResolvedRef` / `ResolvedWatchAnalysisSources` vivent **dans le module du
  résolveur** (`data/resolve-watch-analysis-sources.ts`), pas dans `lib/n8n/types.ts`.
  Le cadrage ne fixait pas leur emplacement ; ce choix reproduit le patron existant
  `resolveKnowledgeScope()` / `ResolvedKnowledgeScope` (types du résolveur définis à côté
  de la fonction, pas dans un fichier de contrat central). Si L2 a besoin de ce type côté
  contrat n8n, il est déjà exporté et importable tel quel — aucun renommage nécessaire.

## 4. Comportement réel du résolveur

`resolveWatchAnalysisSources(supabase, workspaceId, input: WatchAnalysisInputV2)` :

- **digest** : vérifie `veille_digests.id + workspace_id` (`maybeSingle`). Si `articleIds`
  fourni, vérifie que CHAQUE id demandé existe dans `veille_articles` du même workspace ET
  porte `digest_id === digestId` — sinon erreur (`hors du digest`). Rend **une seule**
  référence `{kind:"veille_digest", id, articleIds?}` (pas d'éclatement en refs
  `veille_article` individuelles — la sélection reste "digest scopé à un sous-ensemble").
- **account_signals** : vérifie chaque id dans `account_signals` (workspace explicite).
- **intelligence_documents** : vérifie chaque id dans `intelligence_documents` (workspace
  explicite). Ne filtre pas sur `archived_at`/`status` — ce contrôle de contenu
  (cf. `intelligenceDocumentProvider` des Missions) n'est pas demandé au cadrage L0, qui ne
  parle que d'accessibilité RLS. À trancher explicitement si L1/L2 veut exclure les
  documents archivés de la sélection utilisateur.
- **knowledge_collection** : appelle **exclusivement** `resolveKnowledgeScope(supabase,
  collectionId)` — jamais de refs fournies par le client. Chaque `contentType` résolu
  (`veille_article` | `intelligence_document`) devient une référence canonique du même nom.
- **Échec strict, jamais silencieux** : toute référence demandée mais introuvable/
  inaccessible (autre workspace, id inexistant, article hors digest) fait retourner
  `{ error: string }` immédiatement — contrairement aux providers de corpus des Missions
  d'intelligence (qui excluent et tracent), conformément au cadrage §5/§10 de ce chantier.
- **Déduplication finale** : clé composite `${kind}:${id}` pour les refs simples ; pour
  `veille_digest`, fusion des `articleIds` par union quand le même digest revient dans
  deux groupes, et un digest complet (sans `articleIds`) l'emporte toujours sur une
  sélection partielle du même digest.
- **Aucun contenu métier retourné** : seules les colonnes `id`/`digest_id` sont
  sélectionnées ; aucun champ de contenu (résumé, texte, titre) ne transite par le
  résolveur. Vérifié par test (`ne recopie jamais le contenu métier complet`).

## 5. Tests exécutés et résultats

```
npx vitest run src/features/watch-analysis   → 2 fichiers, 27 tests, tous verts
npm test (suite complète)                    → 155 fichiers, 1573 tests, tous verts
npm run typecheck                            → OK (0 erreur)
npm run check:server-boundary                → OK
npx eslint src/features/watch-analysis src/lib/n8n/types.ts → 0 erreur, 0 warning
```

Couverture des 13 scénarios demandés en §D du prompt : les 13 sont couverts (voir les
deux fichiers de test ci-dessus), y compris la déduplication d'une référence choisie à la
fois directement (`intelligence_documents`) et via une Liste (`knowledge_collection`).

**Non exécuté : `npm run build`.** Un serveur `next dev` tournait déjà sur cette machine
(PID détecté au moment du lot) avec `.next/` verrouillé ; je n'ai pas tué ce process pour
ne pas perturber une session en cours. Le lot ne touche aucune route, composant ou point
d'entrée Next (uniquement des modules TS purs sous `src/lib` et `src/features`), donc le
risque de régression de build est faible, mais ce n'est **pas vérifié** — à faire avant de
considérer L0 totalement clos, ou au démarrage de L1 (qui touchera de toute façon l'UI et
devra builder).

## 6. Écarts au cadrage

Aucun écart de fond. Deux clarifications déjà décrites en §3 et §4 (emplacement des
types de sortie du résolveur ; non-filtrage des documents archivés). Aucun n'affecte la
forme des contrats ni la sécurité de la résolution.

## 7. Ce que L1 et L2 peuvent considérer comme stable

- `WatchAnalysisInputV2` / `WatchAnalysisSource` (`@/lib/n8n/types`) : forme figée, prête
  à être construite par l'UI (L1) et interprétée côté n8n (L2).
- `validateWatchAnalysisInput()` (`@/features/watch-analysis/domain/watch-analysis-contracts`) :
  à appeler côté serveur (probablement dans `/api/n8n/trigger`, L1/L2) avant tout appel au
  résolveur — n'est jamais appelée par le résolveur lui-même.
- `resolveWatchAnalysisSources()` (`@/features/watch-analysis/data/resolve-watch-analysis-sources`) :
  signature stable `(supabase, workspaceId, input: WatchAnalysisInputV2) => Promise<ResolvedWatchAnalysisSources | { error: string }>`.
  Le workspaceId doit être résolu par l'appelant depuis `profiles.workspace_id` (jamais
  depuis le body de la requête) — même doctrine que le reste du repo.
- `WatchAnalysisResolvedRef` : c'est la forme que L2 doit envoyer à n8n dans l'enveloppe
  V2 (à définir en L2) et que le contrat de sortie `evidenceRefs` (§8 de
  `01-ARCHITECTURE-ET-CONTRATS.md`) devra pouvoir référencer.
- Non couvert par L0, à faire en L1/L2 : brancher `validateWatchAnalysisInput` +
  `resolveWatchAnalysisSources` dans `/api/n8n/trigger` (branche `schemaVersion: 2`),
  assembler l'enveloppe n8n, étendre `intel-021-monthly-watch-analysis.json`.

## 8. Actions manuelles restantes

Aucune. Pas de Supabase, pas de n8n, pas de commit/déploiement effectué par ce lot.
