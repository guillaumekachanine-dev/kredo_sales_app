# HANDOFF — L1 : Compositeur Desktop + Mobile

**Date** : 2026-08-19
**Commit de référence au départ** : `19158fb457ca5c7cd5e5297d3d31b2de765e24bc` (L0 déployé en prod)
**Statut** : L1 livré, non commité, non déployé. L2/L3 non commencés.

## 1. Résumé fonctionnel

Ajoute le compositeur d'analyse à la demande sur Desktop et Mobile, conforme au
contrat `WatchAnalysisInputV2` figé au L0. L'utilisateur choisit 1 à 3 groupes
de sources (Digest & articles / Signaux comptes / Rapports & documents /
Listes & Corpus), saisit une intention, et lance la demande via
`POST /api/n8n/trigger`. Le CTA « Générer une analyse » remplace l'ancien
déclenchement direct du contrat V1 mensuel ; le workflow mensuel automatique
(`/api/veille/monthly-watch/cron`) n'a pas été touché.

**Important — dépendance non résolue avec L2** : le serveur (`/api/n8n/trigger`)
ne sait toujours interpréter que le contrat V1 (`MonthlyWatchAnalysisInput`)
pour `workflowId: "intel-021-monthly-watch-analysis"`. Un lancement réel via ce
compositeur crée bien un run `ai_intelligence_runs` (le POST réussit, un
`runId` est renvoyé), mais le contenu transmis à n8n est un `WatchAnalysisInputV2`
que ni le serveur ni le workflow `intel-021-monthly-watch-analysis.json`
n'interprètent encore. **Ne pas déployer ce lot seul en production sans
accepter ce risque** (cadrage §11, respecté à la lettre : la branche V2
serveur n'a pas été touchée dans ce lot).

## 2. Fichiers créés / modifiés

**Créés** — `src/features/watch-analysis/`
- `domain/source-family.ts` — `SourceFamily`, libellés, `sourceItemCount()`.
- `domain/watch-analysis-composer-state.ts` — état pur des 3 emplacements (slots), testable sans DOM.
- `data/launch-watch-analysis.ts` — appel `POST /api/n8n/trigger` (fetch injectable, testable).
- `data/watch-analysis-client-queries.ts` — lectures RLS navigateur pour le picker (signaux, documents, articles d'un digest en repli lazy).
- `hooks/use-watch-analysis-composer.ts` — état partagé Desktop/Mobile (slots, écran, intention, lancement).
- `hooks/use-picker-list.ts` — chargement + recherche simple, mutualisé entre les 3 familles à liste (signaux/documents/collections).
- `hooks/use-digest-articles.ts` — résolution des articles d'un digest (connus en props, sinon lecture lazy).
- `components/WatchAnalysisComposerDesktop.tsx` — modale unique (`IntelligenceSplitModalShell`, écrans `compose`/`source-picker`).
- `components/WatchAnalysisComposerMobile.tsx` — plein écran dédié, indépendant du Desktop.
- `__tests__/watch-analysis-composer-state.test.ts`, `__tests__/launch-watch-analysis.test.ts`.

**Modifiés**
- `src/components/veille/VeilleActualitesDesktop.tsx` — CTA unique « Générer une analyse » (l'ancien `generate()` direct-V1 est supprimé, le suivi de run `pending`/`run`/`error`/`useRunTracker` est conservé et rebranché sur `onLaunched`) ; `StrategicAnalysisSection` reçoit `currentDigest`/`currentDigestNumber`/`pastDigests`/`knownArticles` (réutilise `digest`/`digestNumber`/`pastDigests`/`allArticles` déjà chargés par la page).
- `src/components/veille/VeilleActualitesMobile.tsx` — état `isComposerOpen`, digest courant dérivé de `activeDigestId`, rend `WatchAnalysisComposerMobile`, feedback « Analyse lancée. » via le toast existant.
- `src/components/veille/mobile/VeilleAnalysesTab.tsx` — prop `onGenerateAnalysis`, CTA visible dans l'état vide ET dans l'en-tête quand des analyses existent ; texte de l'état vide généralisé (mensuel + à la demande).

Aucun fichier hors périmètre touché : `intel-021-monthly-watch-analysis.json`/`.SETUP.md`, `save-as-document.ts`, callback n8n, `intelligence_missions`, `mission-001-run`, schéma/migrations Supabase — tous intacts (vérifié par `git status` avant handoff).

## 3. Composants Desktop créés

- `WatchAnalysisComposerDesktop` — une seule instance d'`IntelligenceSplitModalShell`, deux écrans internes (`compose` / `source-picker`), jamais de seconde modale empilée. Le retour du picker au compositeur conserve la sélection (état porté par `useWatchAnalysisComposer`, pas par le montage/démontage de composants).
- Écran compose : 3 cartes de slot (Source 1/2/3), textarea Intention, CTA « Lancer l'analyse » désactivé tant que `validateWatchAnalysisInput` renvoie `ok:false`.
- Écran picker : rail de familles à gauche (`digest` / `account_signals` / `intelligence_documents` / `knowledge_collection`), panneau de sélection à droite par famille, pied de panneau « Valider la source ».

## 4. Composants Mobile créés

- `WatchAnalysisComposerMobile` — composant plein écran indépendant (`fixed inset-0`), pas de réutilisation du markup Desktop (seuls les hooks le sont). Cartes empilées, cibles tactiles ≥ 44 px (`min-h-11` partout : cases à cocher, boutons, champs de recherche).
- Picker mobile : familles en onglets horizontaux scrollables (au lieu du rail vertical desktop), un seul écran actif à la fois.
- Point d'entrée : CTA dans `VeilleAnalysesTab` (état vide ET en-tête), ouvre le composant plein écran depuis `VeilleActualitesMobile` — jamais de double sheet.

## 5. Stratégie de chargement des sources

- **Digest & articles** : réutilise `digest`/`pastDigests`/`allArticles` (Desktop) ou `activeDigestId`/`pastDigests`/`resolvedArticles` (Mobile), déjà chargés par la page — **aucune requête** dans le cas courant. Repli lazy (`useDigestArticles` → `fetchVeilleArticlesForDigestPicker`) uniquement si le digest choisi dans le picker n'a aucun article déjà en mémoire (typiquement un digest historique côté Mobile, qui n'a pas l'équivalent du `allArticles` Desktop).
- **Signaux comptes** : lazy au moment où la famille est ouverte, via `v_active_account_signals` (vue qui exclut déjà `archived`/`dismissed`/> 2 mois — pas `account_signals` brute), bornée à 200 lignes, recherche texte simple côté client.
- **Rapports & documents** : lazy à l'ouverture de la famille, `intelligence_documents` filtré `archived_at IS NULL AND status != 'archived'`, borné à 200, recherche simple.
- **Listes & Corpus** : réutilise **directement** `fetchCollectionsSummary()` de `content-collections` (aucune nouvelle requête écrite) — le navigateur ne transmet jamais que `collectionId` au moment de valider la source.
- Toutes ces lectures utilisent le client Supabase navigateur (`@/lib/supabase/client`), sous RLS, même doctrine que `content-collections-client-queries.ts` — elles ne servent que l'UX du picker (titres, dates, compteurs), jamais le payload final envoyé au serveur.

## 6. Forme exacte du payload envoyé

`POST /api/n8n/trigger` avec :

```json
{
  "workflowId": "intel-021-monthly-watch-analysis",
  "entityType": "workspace",
  "input": {
    "schemaVersion": 2,
    "triggerMode": "manual_custom",
    "intention": "<texte saisi>",
    "sources": [ /* 1 à 3 WatchAnalysisSource, validés par validateWatchAnalysisInput */ ],
    "requestedAt": "<ISO calculé au clic sur Lancer l'analyse>"
  }
}
```

Vérifié par test (`n'envoie jamais de resolvedRefs ni de workspaceId choisi par le client`) : les clés de `input` sont exactement `intention`, `requestedAt`, `schemaVersion`, `sources`, `triggerMode` — jamais de `refs`/`resolvedRefs`/`workspaceId`. Le front n'appelle jamais `resolveWatchAnalysisSources()` (server-only, jamais importé par un module client).

## 7. Tests exécutés et résultats

```
npx vitest run src/features/watch-analysis   → 4 fichiers, 49 tests, tous verts
npm test (suite complète)                    → 157 fichiers, 1595 tests, tous verts
npm run typecheck                            → OK (0 erreur)
npm run check:server-boundary                → OK
npx eslint <fichiers touchés>                 → 0 erreur, 0 warning (2 erreurs react-hooks/set-state-in-effect
                                                  corrigées en dérivant `loading` plutôt qu'en le posant
                                                  synchronement dans l'effet — cf. §10)
```

Couverture des 22 scénarios du §17 :
- **1-16 et 14** (préremplissage, ajout/retrait/remplacement de slot, plafond de 3, digest complet vs sous-sélection, sélection multiple signaux/documents, Liste/Corpus, intention vide, forme du payload, `triggerMode`) : `watch-analysis-composer-state.test.ts` (état pur, sans DOM).
- **15, 17, 18, 19, 20** (`requestedAt` au lancement, POST vers `/api/n8n/trigger`, aucun `resolvedRef` envoyé, 202→succès, erreur→message) : `launch-watch-analysis.test.ts` (fetch injecté, aucun réseau réel).
- **21-22** (un seul dialog actif Desktop pendant compose/picker ; parcours Mobile indépendant du Desktop) : **non couverts par un test automatisé** — `vitest.config.ts` n'inclut que `src/**/*.test.ts`, jamais `.test.tsx` ; ce repo n'a aucune infrastructure de test de composants React (ni jsdom, ni `@testing-library/react`), vérifié en l'état avant d'écrire les tests. Garantis structurellement : une seule instance d'`IntelligenceSplitModalShell` porte les deux écrans desktop (`composer.screen`, jamais un second `open=true` ailleurs) ; `WatchAnalysisComposerMobile` est un fichier séparé qui n'importe aucun composant du fichier Desktop. À vérifier visuellement par Guillaume (QA visuelle hors périmètre agent, cf. CLAUDE.md).

## 8. Build

**Exécuté avec succès**, contrairement au L0 qui n'avait pas pu le tenter.

Un serveur `next dev` tournait déjà sur cette machine (PID 50074/50075) avec
`.next/` verrouillé — je ne l'ai pas tué. Pour lever le point sans y toucher :
copie isolée du working tree (`rsync`, exclut `node_modules`/`.next`/`.git`)
dans le répertoire scratchpad, `node_modules` symlinké vers le vrai repo
(évite une réinstallation), `.env.local` copié. `npm run build:webpack` exécuté
dans cette copie — c'est la variante qui applique réellement la frontière
serveur/client (cf. CLAUDE.md). **Résultat : exit code 0**, compilation et
typecheck Next réussis, `/veille` listé comme route dynamique (`ƒ`) dans le
manifeste de build. Les erreurs `Dynamic server usage: ... couldn't be
rendered statically because it used cookies` affichées pendant le build sont
des logs `console.error` préexistants sur d'autres routes authentifiées
(`/legacy/folio/sector-studies`, `/missions/*`) — comportement Next.js normal
pour des pages qui lisent la session, sans lien avec ce lot, et **n'ont pas
fait échouer le build** (exit 0). N'a pas modifié `next.config.ts` : je n'ai
pas ajouté de `distDir` alternatif car un `next dev` en cours surveille ce
fichier et redémarre à sa modification — l'éditer aurait perturbé l'autre
session, exactement ce qu'il fallait éviter. La copie temporaire a été
supprimée après vérification ; `git status` confirme qu'aucun fichier hors
périmètre n'a été touché.

## 9. Écarts au cadrage

- **`WatchAnalysisResolvedRef` et `resolveWatchAnalysisSources()` ne sont PAS branchés** dans `/api/n8n/trigger` — conforme au §11 du prompt L1 (« Ne modifie pas la branche V2 serveur dans ce lot »), mais cela signifie que le compositeur peut créer un run dont le contenu n'est pas interprétable par le workflow actuel. Documenté en §1.
- **Numérotation « Digest #XX »** : disponible côté Desktop (`digestNumber` déjà calculé serveur) mais pas côté Mobile (`VeilleActualitesMobileProps` ne porte pas cette donnée). Le picker Mobile affiche la date du digest à la place — écart mineur, pas de nouvelle donnée serveur ajoutée pour rester dans le périmètre L1 (« aucune abstraction/donnée supplémentaire non nécessaire »).
- **`intelligence_documents` non filtrés sur le statut au-delà de `archived`** : le picker exclut `archived_at IS NOT NULL` et `status = 'archived'` (cadrage §5.C — documents archivés exclus), mais ne filtre pas sur `draft` vs `ready` : un document brouillon reste sélectionnable. Le cadrage ne demande pas ce filtre ; à trancher explicitement si souhaité.
- **`slotLabels` (titres/détails affichés sur les cartes de slot) est un état purement local aux composants Desktop/Mobile**, capturé au moment de la validation dans le picker plutôt que re-résolu depuis les IDs bruts à chaque rendu — plus simple, mais signifie que si le composant se démonte puis remonte avec des `slots` déjà peuplés autrement qu'via le picker (cas qui ne se produit pas dans ce lot), le libellé retomberait sur `EMPTY_SLOT_LABEL`. Sans conséquence pratique ici : le seul slot pré-rempli hors picker (Source 1 = digest courant) a son libellé calculé au montage.

## 10. Limites connues

- `react-hooks/set-state-in-effect` (règle du repo) a été respectée dans le nouveau code (`use-picker-list.ts`, `use-digest-articles.ts` dérivent `loading` plutôt que de le poser en effet) — **mais le patron copié depuis `use-add-to-list.ts`/`CollectionPickerDialog.tsx` (référence de lecture imposée par le cadrage) viole encore cette règle** dans ces deux fichiers existants, non touchés par ce lot (hors périmètre). Signalé ici, pas corrigé : ce n'est pas un fichier du lot L1.
- Aucun test de rendu (composants React) : limite structurelle du repo (§7), pas de ce lot spécifiquement.
- Le picker « Signaux comptes » ne montre pas de niveau/score au-delà de `global_score` brut (le cadrage autorisait explicitement à ne montrer un score que « si déjà disponible sans calcul supplémentaire » — `global_score` l'est, affiché tel quel).

## 11. Dépendance restante envers L2

Avant tout lancement réel utilisable en production :
1. Étendre `/api/n8n/trigger` : détecter `schemaVersion: 2` sur `workflowId: "intel-021-monthly-watch-analysis"`, appeler `validateWatchAnalysisInput()` puis `resolveWatchAnalysisSources()` (tous deux déjà livrés en L0, jamais appelés côté client), construire l'enveloppe n8n V2.
2. Étendre `n8n/workflows/intel-021-monthly-watch-analysis.json` pour accepter les deux chemins (`schemaVersion: 1` historique inchangé / `schemaVersion: 2` hydratant les refs résolues + l'intention).
3. Étendre le contrat de sortie avec `evidenceRefs` génériques (§8 de `01-ARCHITECTURE-ET-CONTRATS.md`), non traité ici.

Tant que L2 n'est pas livré, un lancement réel depuis ce compositeur créera un run mais échouera probablement côté n8n (contrat non reconnu) — **ne pas exposer ce lot aux utilisateurs finaux avant L2**.

## 12. Informations nécessaires à L3

- Le `resultType` reste `strategic_watch_analysis` (inchangé, pas touché par ce lot).
- Le discriminateur `manual_custom` vs mensuel doit être lu depuis `input_snapshot`/`triggerMode` du run (jamais deviné depuis le titre) — c'est déjà la donnée envoyée par ce lot (`triggerMode: "manual_custom"` dans le payload `input`), disponible dès que L2 la persiste dans `ai_intelligence_runs`.
- Aucun changement de persistance documentaire dans ce lot : `saveResultAsDocumentWithSupabaseClient()`/`upsert_strategic_watch_document` intacts, comme demandé.
- Le composant `VeilleAnalysesTab` n'a pas été modifié pour distinguer visuellement une analyse « à la demande » d'une analyse mensuelle dans la liste — à faire en L3 si le besoin se confirme (le cadrage §6 du 00-CADRAGE demande la distinction au niveau document, pas explicitement dans cette liste).

## 13. Actions manuelles restantes

Aucune côté Supabase/n8n (rien modifié). **Ce lot n'est ni commité ni déployé** — conforme à l'instruction explicite du prompt.
