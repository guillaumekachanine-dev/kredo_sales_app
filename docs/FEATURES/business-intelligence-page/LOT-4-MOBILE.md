# Lot 4 — Business Intelligence Mobile

## Architecture

`/intelligence` conserve le rendu `BusinessIntelligenceDesktop` sur Desktop. Sur Mobile, la route charge une fois le snapshot BI côté serveur, construit `buildBusinessIntelligenceMobileModel(snapshot)` puis ne rend que `BusinessIntelligenceMobile`.

Le presenter réutilise les builders de priorisation, d'attaque et de playbooks. Il prépare les trois périodes (30/90/180 jours), 3 à 5 comptes, les fenêtres urgentes, les secteurs actifs/en veille, les métadonnées de provenance, de confiance et de qualité de données.

## Sections et actions

La navigation locale accessible contient exactement `Priorités`, `Fenêtres` et `Secteurs`. Les cartes de compte mettent à jour le brief et le bloc d'action. Une fenêtre sélectionne son premier compte exposé prioritaire puis ramène vers `Priorités`.

Les seules actions visibles sont raccordées aux parcours existants : fiche compte (`/prospection/accounts/[companyId]`), compositeur de communication et agenda (`/agenda`).

## Playbooks

`SectorPlaybooksModal` reçoit un mode `isMobile`. Il utilise `IntelligenceSplitModalShell` en plein écran avec sa propriété `content`, un sélecteur de secteur et des sections repliables. Les secteurs `watch` ne proposent aucun playbook fictif.

## Tests et QA

Le test du presenter Mobile couvre le déterminisme, les périodes, la recommandation, la sélection compte/fenêtre, les UUID secteurs, les secteurs watch, l'absence de score natif, les états vides, les données de démonstration et la séparation structurelle du Desktop.

La QA visuelle cible 390 × 844, sans graphique dense ni appel Supabase client. Les limites restantes sont celles du snapshot existant : un compte sans action déterminée est affiché comme tel et aucune donnée n'est inventée.
