# Recommandation d'implementation

## Recommandation

Adopter `Cobalt Stratifie` comme base d'evolution, enrichie par la lisibilite d'`Atelier Clair` sur les tableaux/formulaires et par des moments `Signal Room` reserves au Cockpit Intelligence et aux fonctions IA.

Ne pas generaliser une direction a l'application sans validation humaine. Le Design Lab sert a comparer, pas a deployer une charte.

## Pourquoi A comme base

- Elle respecte la memoire visuelle actuelle: cobalt, navy, brass, surfaces chaudes.
- Elle corrige la dette la plus structurante: categories et statuts melanges.
- Elle peut etre implementee progressivement par tokens semantiques.
- Elle ne demande pas de basculer toute l'application en dark mode.
- Elle garde une credibilite B2B forte.

## Ce qu'il faut prendre de B

- Moins de cartes quand un tableau ou une section suffit.
- Separations longues et lisibilite editorialisee.
- Motion plus calme pour les ecrans repetitifs.
- Surfaces de formulaires plus ouvertes.
- Mobile oriente action, avec cartes synthetiques.

## Ce qu'il faut prendre de C

- Traitement IA plus memorable.
- Signal de generation et confiance plus distinct.
- Cockpit Intelligence plus immersif.
- Domaines plus differencies dans les vues demo/analytiques.

## Plan d'integration futur propose

1. Creer une couche de tokens semantiques de domaine hors Design Lab.
2. Remplacer les noms `cat-*` ambigus par `domain-*` et `status-*`.
3. Ajouter variantes de `SurfaceCard`, `StatusPill`, `KpiCard` pour domaine vs statut.
4. Tokeniser les effets IA existants.
5. Migrer une page pilote: Cockpit Intelligence ou Finance.
6. QA contraste, mobile et reduced motion avant generalisation.

## Garde-fous

- Aucun changement de schema Supabase.
- Aucun changement de regle metier.
- Aucun remplacement de token global sans validation.
- Aucun hardcode de couleur metier dans les composants.
- Aucun ajout de charting library.
- Aucun merge dans `main` sans revue.

## Decision conseillee

Valider A comme direction systeme, puis choisir entre deux hybridations:

- A + B pour usage quotidien premium et tres lisible.
- A + C pour mettre fortement en avant le Cockpit IA et les demos commerciales.

Le meilleur compromis semble `A + B`, avec `C` uniquement pour les moments IA exceptionnels.
