# HANDOFF — DYNAMIC PLAYBOOKS — LOT 6
## Adaptive Mobile

**Agent :** A4 — Mobile UX & QA
**Date :** 23 août 2026

---

## Problèmes trouvés

- La branche mobile montait encore `BattleCardContent`, le composant de révision Desktop, au lieu d'une vue mobile dédiée.
- Les huit dimensions de Situation étaient toutes développées à la suite, ce qui allongeait excessivement le configurateur.
- Le premier panneau d'actions sticky de Situation occupait environ un tiers du viewport et masquait trop de choix pendant le défilement.
- Le CTA mobile `Copier` du résultat ne garantissait que 32 px de hauteur.
- Les bundles Révision mobile et Desktop n'étaient pas séparés au point de branchement `isMobile`.

## Corrections effectuées

- Ajout d'une Révision mobile dédiée, compacte et éditoriale, avec les informations tactiques prioritaires visibles et le diagnostic détaillé en divulgation progressive.
- Séparation explicite des quatre décisions principales de Situation (`Interlocuteur`, `Enjeu`, `Angle`, `Offre`) et des quatre options secondaires (`Timing`, `Objection`, `ROI`, `Knowledge`) regroupées dans un panneau repliable natif.
- Compactage du panneau d'action sticky : résumé limité à deux lignes, état vide supprimé sur mobile et actions disposées côte à côte, tout en conservant 44 px de hauteur tactile.
- Passage de tous les CTA du résultat mobile, dont `Copier`, à une hauteur minimale de 44 px.
- Chargement dynamique distinct de la Révision mobile et de `BattleCardContent` Desktop ; aucun composant Desktop n'est monté puis masqué en CSS sur la branche mobile.
- Extraction de l'état vide partagé afin que `BattleWorkspace` n'importe pas le module Desktop uniquement pour cet état.

## Composants Desktop / Mobile concernés

| Surface | Composants | Effet |
|---|---|---|
| Mobile | `BattleRevisionMobile.tsx` | Nouveau rendu Révision dédié. |
| Mobile | `BattleSituationView.tsx` | Hiérarchie primaire/secondaire et panneau d'action sticky compact. |
| Mobile | `BattleSituationSecondaryOptions.tsx` | Options facultatives extraites et repliables. |
| Mobile | `BattlePitchResult.tsx` | CTA `Copier` porté à 44 px ; composition mobile existante conservée. |
| Mobile / Desktop | `BattleWorkspace.tsx` | Branchement `isMobile` explicite et imports dynamiques séparés. |
| Mobile / Desktop | `BattleCardsEmptyState.tsx` | État vide partagé sans dépendance au rendu Desktop. |
| Desktop | `BattleCardsSection.tsx` | Rendu visuel inchangé ; seul l'état vide a été extrait. |

## QA 390 × 844

- Parcours réel exécuté : `Playbook → Battle → changement de compte → Révision → Situation → configuration → génération → résultat → Nouvelle situation → retour Révision → retour Playbook`.
- Génération INTEL-020 réelle réussie avec feedback immédiat, CTA désactivé pendant le run et un seul `POST /api/n8n/trigger` observé.
- Résultat vérifié sur surface Edito Bright : lecture continue, actions empilées, copie confirmée par `Copié !`, ouverture de `/reports?doc=…` dans un nouvel onglet.
- CTA mesurés à 44 px : `Générer le pitch`, `Revenir à la révision`, `Copier`, `Ouvrir dans Rapports`, `Nouvelle situation` et `Revenir au Playbook`.
- Aucun overflow horizontal (`scrollWidth === clientWidth`), aucun clipping bloquant, aucun scroll trap ni overlay Next.js masquant une action.
- Changement de compte Robertet → V. Mane Fils vérifié ; la Révision et la Situation ont bien été recalculées pour le compte actif.
- Options secondaires ouvertes puis refermées au clavier/souris ; focus Tab visible sur les contrôles de la modale.
- Console dev : 0 erreur, 0 avertissement. Serveur de production local : seul le `404 /_vercel/speed-insights/script.js` attendu hors environnement Vercel est présent.
- Contrôle de non-régression Desktop à 1440 × 900 : rail de comptes, Révision et structure de modale inchangés, sans overflow horizontal.

## Tests

| Vérification | Résultat |
|---|---|
| `npm run typecheck` | PASS |
| `npm test` | PASS — 204 fichiers, 2 008 tests |
| `npm run check:server-boundary` | PASS |
| ESLint ciblé composants/tests L6 | PASS |
| `npm run lint` global | FAIL baseline — 417 erreurs et 1 158 avertissements hors chantier, incluant `.claude/worktrees`, Legacy, Finance et Knowledge |
| `npm run build` | PASS après arrêt du serveur dev concurrent |
| `battle-mobile-layout.test.ts` | PASS — 5 tests de contrat mobile |

## Risques résiduels

- Le lint global du dépôt reste inexploitable comme gate tant que les erreurs historiques et les worktrees imbriqués ne sont pas exclus ou corrigés ; aucun écart ESLint n'est présent dans les fichiers L6.
- Le script Vercel Speed Insights répond en 404 lors d'un `next start` local, sans impact fonctionnel ni erreur en environnement dev.
- La QA de génération a créé un run, un résultat et un document de pitch réels pour V. Mane Fils dans l'environnement connecté ; ils n'ont pas été supprimés.
