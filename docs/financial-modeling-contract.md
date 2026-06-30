# Contrat metier du module de modelisation financiere Assistance Technique

## Perimetre

Ce contrat couvre le Lot 0 du moteur de modelisation financiere Assistance Technique.
Il definit les entrees, les conventions de calcul, les sorties et les warnings non bloquants.

Le moteur retourne toujours une `engineVersion` explicite.
La version canonique de ce lot est `financial-model-v1`.

## Definitions

### Cout employeur annuel

Montant annuel charge d'une ressource salariee.

Formule V1:

`(salaire brut annuel + variable annuel) x (1 + taux de charges)`

### CJM charge

Cout journalier structurel d'une ressource salariee, avant prise en compte du taux d'activite previsionnel.

Formule V1:

`cout employeur annuel / jours ouvres annuels`

### CJM productif

Cout journalier rapporte aux seuls jours produits.

Formule V1:

`CJM charge / taux d'activite previsionnel`

### Taux d'activite historique

Taux d'activite observe historiquement, typiquement issu des CRA ou de `collaborator_compensation.taci`.

Le moteur Lot 0 peut le transporter comme information de contexte, mais il ne l'utilise pas pour recalculer le cout salarial de la periode.

### Taux d'activite previsionnel

Hypothese de production future utilisee pour convertir les jours ouvres de la periode en jours produits.

Formule V1:

`jours ouvres periode x taux d'activite previsionnel`

### Jours ouvres

Nombre de jours du lundi au vendredi inclus dans la periode.

Pour le Lot 0:

- les dates de debut et de fin sont incluses
- les week-ends sont exclus
- les jours feries ne sont pas exclus automatiquement
- une liste de dates a exclure est prevue en extension future, sans appel externe

### Jours produits

Jours ouvres de la periode ponderes par le taux d'activite previsionnel.

Formule V1:

`jours ouvres periode x taux d'activite previsionnel`

### Frais ESN

Somme des lignes de frais rattachees a la modelisation.

Chaque ligne suit un mode de calcul:

- `fixed`: `montant unitaire x quantite`
- `per_business_day`: `montant unitaire x quantite x jours ouvres`
- `per_production_day`: `montant unitaire x quantite x jours produits`
- `monthly`: `montant mensuel x quantite x prorata mensuel exact`
- `annual`: `montant annuel x quantite x prorata annuel exact`

Conventions de prorata:

- `monthly`: somme, mois par mois, de `jours calendaires couverts dans le mois / nombre total de jours calendaires du mois`
- `annual`: somme, annee par annee, de `jours calendaires couverts dans l'annee / nombre total de jours calendaires de l'annee`
- les bornes sont inclusives
- une mission multi-mois ou multi-annuelle garde donc un prorata exact, y compris sur annee bissextile

### Couts de la periode

Somme du cout ressource de la periode et des frais ESN.

Pour une ressource salariee:

- `cout salarial periode = CJM charge x jours ouvres periode`
- `couts periode = cout salarial periode + frais ESN`

Pour une ressource externe au forfait journalier:

- `cout ressource periode = cout d'achat journalier x jours produits`

Pour un cout externe fixe:

- `cout ressource periode = cout externe total renseigne`

### Revenus de la periode

Formule V1:

`TJM de vente x jours produits`

### Marge commerciale

Formule V1:

`revenus periode - couts periode`

### MCO valeur

Equivalent de la marge commerciale exprimee en valeur monetaire.

### MCO pourcentage

Formule V1:

`marge commerciale / revenus periode`

Le moteur retourne un pourcentage sur base 100. Exemple: `34.79` signifie `34,79 %`.

### ACV

Annual Contract Value theorique annualise sur la base des jours ouvres annuels de reference.

Formule V1:

`TJM x jours ouvres annuels de reference x taux d'activite previsionnel`

### TCV

Total Contract Value sur toute la duree modelisee.

Formule V1:

`TJM x jours produits sur toute la duree modelisee`

### Projection jusqu'a la fin de l'annee

Si aucune date de fin n'est renseignee:

- `endDate` reste `null`
- `projectionEndDate` vaut le `31 decembre` de l'annee de demarrage
- `projectionBasis` vaut `year_end_default`
- un warning non bloquant signale qu'il s'agit d'une projection

Cette projection ne doit jamais etre transformee en date de fin contractuelle.

## Risque critique de double comptage du taci

Le schema existant expose `collaborator_compensation.cjm` avec cette logique:

`gross_annual x (1 + charges_rate) / (working_days_per_year x taci)`

Ce champ integre donc deja le `taci` dans son denominateur.

Il ne faut jamais:

1. utiliser ce `cjm` comme cout journalier structurel
2. puis appliquer une seconde fois un taux d'activite pour reconstituer le cout salarial

Le moteur Lot 0 contourne ce risque en recalculant toujours, pour le salariat:

- `cout employeur annuel`
- puis `CJM charge`
- puis `cout salarial periode = CJM charge x jours ouvres periode`

Le taux d'activite previsionnel ne sert qu'a reduire:

- les jours produits
- les revenus
- le CJM productif
- les frais indexes sur les jours produits

Il ne reduit pas une seconde fois le cout salarial structurel.

## Politique d'arrondi

Une seule strategie d'arrondi est appliquee, sans arrondir prematurément les intermediaires:

- montants: 2 decimales
- pourcentages: 2 decimales
- jours produits: 2 decimales
- ratios internes de prorata: precision complete jusqu'au rendu final

Les helpers d'arrondi sont centralises dans le module.

## Source des types Supabase

La source unique conservee par le repository reste la facade existante `src/types/database.ts`, qui re-exporte les types generes.

Le module Lot 0 n'introduit aucun fichier parallele de types Supabase.
