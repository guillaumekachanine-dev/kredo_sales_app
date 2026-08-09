# Lot 5 — Migration et nettoyage

## Navigation et routes

- L’entrée existante `Business Intelligence` est active dans les navigations Desktop et Mobile, à la route `/intelligence`.
- La navigation CRM conserve l’accès aux comptes et contacts sans lien vers les anciennes vues.
- `/prospection`, `/prospection/approche-sectorielle`, leurs anciennes fiches sectorielles et `/prospection/sector-studies` utilisent une redirection permanente App Router vers `/intelligence`.
- Les liens runtime de l’ancienne Synthèse et de l’ancienne Approche sectorielle pointent désormais vers `/intelligence`. Les routes CRM `/prospection/accounts` et `/prospection/accounts/[companyId]` restent intactes.

## Nettoyage

- Suppression des vues, presenters, helpers et tests exclusivement utilisés par la Synthèse Prospection legacy.
- Suppression de la vue Activation sectorielle, de son loader et de l’ancienne fiche sectorielle.
- Conservation de `synthese-data.ts`, utilisé par le Cockpit, des types d’activation sectorielle, du snapshot BI, des builders, des loaders Supabase et du Playbook Ressources encore partagés.

## Correctif fonctionnel Mobile

`Appliquer au portefeuille` utilise le UUID reçu : le portefeuille est filtré, le premier compte compatible est sélectionné, la section `Priorités` est affichée et un état vide apparaît si aucun compte n’est lié. Le sélecteur `Tous les secteurs` réinitialise le filtre, sans store ni appel réseau supplémentaire.

## Validation

- Tests ciblés : presenter Mobile, périodes, sélection compte/fenêtre, filtre secteur par UUID, remise à tous les secteurs, états vides, navigation, redirections, liens et suppression des composants legacy.
- Validation technique : tests BI ciblés, typecheck, lint ciblé, `git diff --check` et build Next.js réussis.
- QA Desktop/Mobile : le navigateur intégré a refusé l’accès à `localhost` par sa politique de sécurité. La validation authentifiée a donc été menée avec Playwright local : Desktop 1440 × 900 et Mobile 390 × 844 avec l’User-Agent iPhone 14. Les données, périodes, fenêtres, secteurs, playbooks et actions ont été vérifiés.

## Limitations restantes

- WebKit iPhone n’est pas installé localement ; la QA Mobile utilise Chromium avec le descripteur et l’User-Agent iPhone 14.

## Hotfix snapshot

- Cause racine : la projection `account_signals` demandait `description`, colonne absente ; PostgreSQL renvoyait `42703` et le snapshot tombait dans son état d’erreur.
- Correction : sélection et mapping de `summary` et `recommended_action`, avec type local explicite pour la ligne signal.
- Erreurs : le loader émet désormais un log serveur structuré sans donnée client, puis renvoie `state: "error"`. Desktop et Mobile affichent `Données indisponibles` au lieu d’une vue vide.
- QA : les catégories de données de production ont été contrôlées en lecture seule. Playwright authentifié confirme le rendu Desktop et Mobile, avec un User-Agent iPhone pour Mobile.
