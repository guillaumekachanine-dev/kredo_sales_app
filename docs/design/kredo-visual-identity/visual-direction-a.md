# Direction A - Cobalt Stratifie

## Intention

Approfondir la doctrine Cobalt Franc avec plus de relief cible, plus de marqueurs metier et une IA plus precieuse sans rompre avec l'application actuelle.

## Principes visuels

- Cobalt conserve comme actif de marque principal.
- Navy garde la navigation et les headers analytiques inverses.
- Brass devient un accent premium, pas un warning.
- Les domaines sont identifies par rails, dots, underlines et petites jauges.
- La surface reste claire et chaude.
- L'elevation est rare: hover, drawer, selection et moment IA.

## Palette

Palette principale: cobalt directeur, navy conseil, brass franc, canvas lin, surface ivoire, bord graphite, success foret, warning ocre, danger brique, besoin ambre, candidat pourpre, collaborateur sauge, compte cyan petrol, recrutement magenta froid, mission AT bleu acier, forfait indigo, finance olive, intelligence cobalt nuit, AI prisme.

Voir `color-token-architecture.md` pour les valeurs HEX, foregrounds et contrastes.

## Repartition par domaine

- Besoins: ambre dedie, plus sourd que le warning.
- Candidats: pourpre stable.
- Collaborateurs: sauge.
- Comptes & contacts: cyan petrol.
- Recrutement: magenta froid.
- Missions AT: bleu acier.
- Projets forfaitaires: indigo.
- Finance: olive.
- Cockpit Intelligence: cobalt nuit.
- IA: prisme violet.

## Surfaces

- Canvas chaud identique a l'esprit actuel.
- Cartes ivoire a bordure fine.
- Panneaux de contexte avec leger tint du domaine.
- Headers avec rail ou bordure basse coloree.
- Tables denses conservees, ligne selectionnee teintee au domaine.

## Formes

- Rayon courant 6 a 8px.
- Badges pills conserves, mais moins nombreux.
- Rails verticaux 3 a 4px pour domaine.
- Icon containers carres arrondis plutot que ronds partout.

## Ombres et elevation

- Surface permanente: pas d'ombre.
- Hover interactif: `translateY(-2px)` et ombre courte.
- Drawer/dialog: ombre overlay existante.
- Selection: ring domain + ombre tres diffuse.
- IA exceptionnelle: anneau prisme, jamais un fond arc-en-ciel massif.

## Iconographie

- Icons lineaires 16-20px.
- Navigation: icon + label.
- Actions: icone seule si le symbole est connu, avec aria-label.
- IA: icone/anneau dedie, pas d'ornement permanent.

## Data visualisation

- Cobalt en serie principale, brass en benchmark, domaines en series secondaires.
- Statuts uniquement pour seuils: succes, warning, danger.
- Mini-bars et gauges en CSS natif.
- Pas de chart library additionnelle.

## Micro-interactions

- Hover cartes: lift 2px, border domain.
- Onglet actif: underline domain.
- Drawer: entree 240-280ms, sortie 180-220ms.
- KPI: apparition par opacity/translateY courte.
- IA: ring anime seulement pendant generation ou action IA.
- Reduced motion: suppression des translations et rotations.

## Avantages

- Le plus coherent avec KREDO aujourd'hui.
- Cout d'integration faible a moyen.
- Risque faible sur la lisibilite.
- Fort potentiel de migration progressive.
- Clarifie la confusion statuts/domaines sans tout refaire.

## Risques

- Peut rester trop proche de l'existant si l'execution est timide.
- L'ambre besoin doit etre bien distingue du warning.
- L'IA peut manquer d'audace si le prisme est trop rare.

## Cout estime

Faible a moyen. La plupart des primitives peuvent evoluer par tokens et variantes semantiques.

## Elements preserves

- Cobalt Franc.
- Navy de navigation.
- Surfaces chaudes.
- Flat design.
- Mobile bottom nav cobalt.
- Cockpit immersif.

## Elements abandonnes

- Rainbow IA global et permanent.
- Categories nommees comme statuts.
- Ombres locales non gouvernees.
- Couleurs metier hardcodees.
