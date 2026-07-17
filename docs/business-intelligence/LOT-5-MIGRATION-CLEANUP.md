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
- Validation technique prévue : suite Vitest complète, typecheck, lint ciblé, `git diff --check` et build Next.js.
- QA Desktop/Mobile : le navigateur intégré a refusé l’accès à `localhost` par sa politique de sécurité. La validation visuelle authentifiée et les captures restent donc à compléter sur une surface autorisée ; aucun contournement n’a été utilisé.

## Limitations restantes

- La QA visuelle authentifiée 1440 × 900 et 390 × 844 n’est pas validée tant que l’environnement local reste bloqué par le navigateur intégré.
