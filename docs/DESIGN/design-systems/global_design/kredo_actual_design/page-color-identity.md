# Page Color Identity

## Statut

**CANONICAL / PRODUCTION**

Cette nomenclature est la source de vérité chromatique permanente des grands
espaces fonctionnels KREDO. Ses tokens sont déclarés dans
`src/app/globals.css`, dans la famille `Page identity` de `@theme`.

## Objectif

Permettre d'identifier immédiatement l'espace actuellement consulté, d'abord
par la couleur de son header sur Desktop comme sur Mobile. Une couleur de page
est un repère d'orientation, pas un état fonctionnel ni un thème appliqué à
toute la page.

## Nomenclature canonique

| Page / espace | Token | Nom couleur | HEX |
|---|---|---|---:|
| Accueil | `--color-page-home` | Bleu pétrole / Navy | `#244078` |
| Agenda | `--color-page-agenda` | Orange Mandarine | `#FF9800` |
| Comptes & Contacts | `--color-page-accounts-contacts` | Bleu Pétrole | `#1E5E99` |
| Opportunités | `--color-page-opportunities` | Vert Émeraude Vif | `#00C853` |
| Engagements | `--color-page-engagements` | Ocre / Terre | `#B37D53` |
| Consultants | `--color-page-consultants` | Violet Pourpre | `#9C27B0` |
| Finance | `--color-page-finance` | Bleu Glacial | `#8FBED8` |
| Business Intelligence | `--color-page-business-intelligence` | Jaune Ambre | `#FFC107` |
| Prospection | `--color-page-prospection` | Rouge Corail | `#FF5252` |
| Veille & Actualité | `--color-page-watch-news` | Cyan Pétrole | `#1A4D59` |
| Rapports & Rédaction | `--color-page-reports-writing` | Blue-Grey | `#607D8B` |

Avec `@theme`, ces tokens sont exposés par Tailwind, par exemple
`bg-page-finance`, `text-page-finance` et `border-page-finance`.

## Règle critique : Page Identity ≠ Functional Status

Les tokens `page-*` désignent uniquement l'identité permanente d'un espace.
Les tokens `status-*`, `cat-*`, `domain-*`, `dataviz-*` et `cockpit-*`
conservent leurs responsabilités propres. Une valeur physique peut être
identique, sans que les deux tokens soient des alias ou aient le même sens.

Exemple : `cat-success` signifie un succès, tandis que
`page-opportunities` signifie l'espace Opportunités, bien que les deux
emploient actuellement `#00C853`. Chaque token `page-*` porte sa valeur
canonique directement afin que les systèmes puissent évoluer indépendamment.

## Usages prévus

- Header des pages et header de l'onglet d'accueil.
- Identification forte d'un espace explicitement prévue par une future
  spécification.

## Usages interdits

- Recolorer automatiquement toute une page, ses tableaux ou tous ses boutons.
- Remplacer les couleurs de statut, de catégorie, de domaine, de dataviz ou de
  marque.
- Créer de grands aplats arbitraires.

La couleur de page sert d'abord de repère d'orientation. Toute première
consommation UI doit être explicitement spécifiée et ne fait pas partie de
l'institutionnalisation de cette nomenclature.
