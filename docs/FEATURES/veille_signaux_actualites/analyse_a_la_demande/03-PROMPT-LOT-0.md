# 03 — Prompt d'implémentation Lot 0

```md
@GitHub @Supabase

Tu interviens sur KREDO pour réaliser **uniquement le LOT L0** du chantier « Analyse à la demande — Veille ».

Avant toute modification, lis dans cet ordre :

1. `docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/README.md`
2. `docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/00-CADRAGE-FONCTIONNEL.md`
3. `docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/01-ARCHITECTURE-ET-CONTRATS.md`
4. `docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/02-ROADMAP-ET-HANDOFF.md`

Puis inspecte impérativement l'existant suivant :

- `src/lib/n8n/types.ts`
- `src/app/api/n8n/trigger/route.ts`
- `src/features/content-collections/data/resolve-knowledge-scope.ts`
- `src/features/content-collections/domain/content-collections-contracts.ts`
- les types Supabase via `src/types/database.ts`

## Objectif exact du L0

Poser le **contrat TypeScript V2** de l'analyse à la demande et un **résolveur serveur sécurisé** des sources sélectionnées.

Le lot doit préparer les lots UI et n8n suivants, mais **ne doit pas les implémenter**.

### A. Contrats TypeScript

Dans l'emplacement le plus cohérent avec l'existant, ajouter les contrats suivants, sans dupliquer inutilement les types déjà présents :

```ts
type WatchAnalysisSource =
  | {
      kind: "digest"
      digestId: string
      articleIds?: string[]
    }
  | {
      kind: "account_signals"
      signalIds: string[]
    }
  | {
      kind: "intelligence_documents"
      documentIds: string[]
    }
  | {
      kind: "knowledge_collection"
      collectionId: string
    }

type WatchAnalysisInputV2 = {
  schemaVersion: 2
  triggerMode: "manual_custom"
  intention: string
  sources: WatchAnalysisSource[]
  requestedAt: string
}
```

Ajouter également les types minimaux nécessaires au résultat du résolveur, sur le principe :

```ts
type WatchAnalysisResolvedRef =
  | { kind: "veille_digest"; id: string; articleIds?: string[] }
  | { kind: "veille_article"; id: string }
  | { kind: "account_signal"; id: string }
  | { kind: "intelligence_document"; id: string }

type ResolvedWatchAnalysisSources = {
  refs: WatchAnalysisResolvedRef[]
  stats: {
    sourceGroups: number
    resolvedRefs: number
  }
}
```

Tu peux ajuster légèrement cette forme si l'existant l'impose, mais reste minimal et documente toute divergence.

### B. Validation du contrat

Créer une validation explicite, simple et testable.

Règles minimales :

- `schemaVersion === 2`
- `triggerMode === "manual_custom"`
- `intention.trim()` non vide
- entre 1 et 3 groupes de sources
- aucun groupe vide
- IDs sous forme de chaînes non vides
- déduplication des IDs sans modifier l'intention utilisateur

Ne crée pas de framework de validation générique et n'ajoute pas de dépendance externe pour cela.

### C. Résolution serveur des sources

Créer un module serveur dédié, recommandé :

`src/features/watch-analysis/data/resolve-watch-analysis-sources.ts`

Il reçoit :

- un client Supabase **authentifié utilisateur** ;
- le `workspaceId` déjà résolu depuis la session ;
- un `WatchAnalysisInputV2` validé.

Il doit :

1. pour `digest` : vérifier que le digest est lisible ; si `articleIds` est fourni, vérifier que tous les articles sont lisibles et appartiennent bien à ce digest ;
2. pour `account_signals` : vérifier que chaque signal est lisible via la RLS ;
3. pour `intelligence_documents` : vérifier que chaque document est lisible via la RLS ;
4. pour `knowledge_collection` : **réutiliser obligatoirement** `resolveKnowledgeScope()` à partir du seul `collectionId` ;
5. convertir le contenu résolu d'une Liste/Corpus en références canoniques `veille_article` / `intelligence_document` ;
6. dédupliquer les références finales ;
7. retourner uniquement les références normalisées et les stats — **jamais le contenu complet des articles/signaux/documents**.

Une référence demandée mais inaccessible/inexistante doit faire échouer proprement la résolution. Ne la supprime pas silencieusement.

### D. Tests

Ajouter des tests ciblés couvrant au minimum :

- contrat valide avec 1 source ;
- 3 sources acceptées ;
- 0 ou 4 sources refusées ;
- intention vide refusée ;
- groupe vide refusé ;
- digest accessible ;
- article appartenant au digest accepté ;
- article hors digest refusé ;
- signal inaccessible/refusé ;
- document inaccessible/refusé ;
- résolution d'une Liste/Corpus via `resolveKnowledgeScope()` ;
- déduplication d'une référence présente plusieurs fois ;
- aucune donnée de contenu complet présente dans le résultat du résolveur.

Utilise les patterns de mocks/tests déjà présents dans le repo. N'introduis pas une nouvelle stack de test.

## Hors périmètre absolu

Ne modifie PAS :

- `VeilleActualitesDesktop.tsx`
- `VeilleActualitesMobile.tsx`
- `VeilleAnalysesTab.tsx`
- `n8n/workflows/intel-021-monthly-watch-analysis.json`
- `n8n/workflows/intel-021-monthly-watch-analysis.SETUP.md`
- `save-as-document.ts`
- le framework `intelligence_missions`
- `mission-001-run`
- le schéma Supabase

Ne crée :

- aucune table ;
- aucune migration ;
- aucun workflow n8n ;
- aucune abstraction générique de corpus commune aux Missions.

## Vérification Supabase

Supabase live a déjà été vérifié au cadrage : les tables nécessaires existent et RLS est active. Utilise Supabase uniquement en lecture si tu dois confirmer un point de schéma. Aucun write/DDL.

## Qualité attendue

À la fin :

- lancer les tests ciblés ;
- lancer `npm run typecheck` ;
- lancer `npm run lint` si le temps/coût de la suite est raisonnable, sinon préciser explicitement ce qui n'a pas été exécuté ;
- corriger toutes les erreurs introduites par le lot.

## Livrable / handoff

Ne commence pas L1.

À la fin, rédige :

`docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/HANDOFF-L0.md`

Le handoff doit contenir :

- fichiers modifiés/créés ;
- contrat final réellement implémenté ;
- comportement du résolveur ;
- tests exécutés + résultat ;
- éventuels écarts au cadrage ;
- ce que L1 et L2 peuvent désormais considérer comme stable.

Ne commit, ne déploie et ne modifie aucune configuration n8n/Supabase sans instruction explicite supplémentaire.
```
