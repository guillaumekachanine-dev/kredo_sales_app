# 02 — Roadmap et handoff multi-agents

## 1. Principe

Le chantier est volontairement découpé en lots courts avec des frontières de fichiers claires afin que plusieurs agents puissent intervenir sans se marcher dessus.

Ne pas paralléliser artificiellement des lots qui dépendent du contrat précédent. La priorité est la stabilité du contrat, pas le nombre d'agents actifs.

## 2. L0 — Contrats V2 + résolution serveur des sources

**Objectif** : poser le contrat TypeScript et le résolveur sécurisé, sans UI, sans n8n, sans persistance documentaire.

**Fichiers attendus** :

- `src/lib/n8n/types.ts` — types V2 nécessaires au trigger/workflow ;
- `src/features/watch-analysis/data/resolve-watch-analysis-sources.ts` — validation/résolution ;
- tests dédiés sous `src/features/watch-analysis/__tests__/` ou au plus près du module selon les conventions existantes.

**Réutilisation obligatoire** : `resolveKnowledgeScope()` pour les Listes/Corpus.

**DoD** : contrat validé, 1 à 3 groupes, références RLS vérifiées, collections développées, déduplication, aucun contenu métier copié, tests verts.

**Interdits** : modifier UI Veille, `intel-021-monthly-watch-analysis.json`, Supabase, callback/documentation de persistance, Missions d'intelligence.

## 3. L1 — Compositeur UI Desktop + Mobile

**Dépendance** : L0 terminé.

**Objectif** : implémenter le parcours de sélection et le lancement côté interface, sans modifier le workflow n8n.

**Zone Desktop** : `VeilleActualitesDesktop.tsx` + composants dédiés à créer sous `src/components/veille/` ou `src/features/watch-analysis/components/`.

**Zone Mobile** : `VeilleActualitesMobile.tsx`, `mobile/VeilleAnalysesTab.tsx` + sous-composants mobiles dédiés.

**Principes** :

- source 1 préremplie avec le digest courant ;
- sources 2 et 3 optionnelles ;
- un seul champ intention ;
- même shell pour composer et sélectionner sur Desktop ;
- pas de double modale ;
- composants Desktop/Mobile distincts ;
- aucune graceful degradation.

**DoD** : l'UI construit un `WatchAnalysisInputV2` valide et déclenche la passerelle prévue, sans traitement long côté Next.js.

## 4. L2 — Extension INTEL-021 V2

**Dépendance** : L0 terminé. Peut être réalisé en parallèle de L1 une fois les types L0 stabilisés.

**Objectif** : étendre le workflow existant sans régression du chemin V1.

**Fichiers principaux** :

- `n8n/workflows/intel-021-monthly-watch-analysis.json`
- `n8n/workflows/intel-021-monthly-watch-analysis.SETUP.md`
- tests n8n/TypeScript associés si présents.

**DoD** :

- V1 mensuelle inchangée ;
- V2 hydrate `veille_article`, `account_signal`, `intelligence_document` ;
- l'intention est incluse dans le prompt ;
- aucune collecte externe ;
- sortie V2 traçable par `evidenceRefs` ;
- références hors corpus rejetées ;
- callback signé inchangé dans son principe.

**Interdit** : créer un nouveau workflow ou réutiliser `mission-001-run`.

## 5. L3 — Persistance documentaire + lecture V1/V2

**Dépendance** : L2 terminé.

**Objectif** : rendre les analyses V2 persistantes et consultables sans détourner le versioning mensuel.

**Fichiers principaux** :

- `src/components/accounts-contacts/intelligence/save-as-document.ts`
- contrats/parsers de la Veille nécessaires à la lecture V2 ;
- composants de rendu seulement si le contrat V2 l'exige réellement.

**DoD** :

- V1 continue d'utiliser `upsert_strategic_watch_document` ;
- V2 `manual_custom` crée un document autonome ;
- document visible dans Rapports & rédaction ;
- analyse visible dans l'onglet Analyses ;
- pas de migration DB sauf découverte contradictoire documentée.

## 6. L4 — QA E2E et non-régression

**Dépendance** : L1 + L2 + L3 terminés.

Scénarios minimaux :

1. digest complet ;
2. sélection d'articles ;
3. digest + signaux ;
4. digest + documents ;
5. digest + Liste ;
6. Corpus avec contenus hétérogènes ;
7. déduplication d'une même référence présente dans deux groupes ;
8. source inaccessible ;
9. groupe vide ;
10. plus de trois groupes ;
11. evidenceRef inconnu ;
12. Desktop ;
13. iPhone 14 ;
14. run mensuel historique ;
15. création/versioning du document mensuel historique ;
16. vérification qu'aucun fichier Missions n'a été modifié.

## 7. Règles de collaboration

### Ownership

Un agent ne modifie que les fichiers de son lot sauf nécessité démontrée. Toute modification transversale doit être annoncée dans le handoff.

### Pas de changements silencieux

Si l'agent découvre que le contrat documenté est incompatible avec l'existant, il s'arrête sur le point bloquant, documente la divergence et propose le plus petit ajustement possible. Il ne redessine pas le chantier de sa propre initiative.

### Handoff obligatoire

À la fin d'un lot, créer un document `HANDOFF-LX.md` dans ce dossier avec :

- date et commit de référence ;
- résumé de ce qui est livré ;
- fichiers ajoutés/modifiés ;
- décisions ou écarts ;
- tests réellement exécutés et résultats ;
- état Supabase/n8n si pertinent ;
- actions manuelles restantes ;
- périmètre exact du lot suivant.

## 8. Discipline de livraison

- ne pas commit/deployer/importer/activer n8n sans ordre explicite si le prompt du lot ne le demande pas ;
- ne pas écrire en Supabase pour un lot purement applicatif ;
- ne jamais présenter comme testé ce qui ne l'a pas été ;
- conserver la compatibilité du chemin mensuel avant toute optimisation ;
- préférer une petite fonction explicite à une abstraction générique prématurée.
