# G2 — red team · À EXÉCUTER EN SESSION SÉPARÉE

**Statut : non exécuté.** Ce fichier n'est pas le rapport G2 ; il est la commande de G2.

`10-ETAPE-E7` §4 impose que G2 s'exécute **hors du contexte de production** — NotebookLM sur le
corpus fermé, ou une session Claude neuve. La raison est précise : un relecteur qui a produit le
document comble ses trous sans s'en apercevoir. Exécuter G2 dans cette session-ci le viderait de
son sens.

## Ce qu'il faut déposer dans le contexte séparé

| # | Fichier | Rôle |
|---|---|---|
| 1 | `docs/MASTER-STUDY/prompts/G2-red-team.md` | Le prompt, tel quel, sans improvisation |
| 2 | `registre/2026-08-aero-spatial-defense/04-secteur.json` | Le livrable COMPRENDRE |
| 3 | `registre/2026-08-aero-spatial-defense/05-comptes.json` | Le livrable ATTAQUER |
| 4 | `registre/2026-08-aero-spatial-defense/07-g1.txt` | Ce que le gate mécanique a déjà attrapé |
| 5 | `docs/FEATURES/sector_intelligence/livrables_etudes/Secteur Spatial, défense & systèmes critiques.md` | La matière d'origine (étude B) |
| 6 | `docs/FEATURES/sector_intelligence/livrables_etudes/KREDO_Cartographie_Spatial_Defense_Systemes_Critiques_structure_reference.md` | La matière d'origine (étude A) |

**Ne pas déposer** `08-rapport-ecarts.md` : il contient le diagnostic du producteur, et le déposer
reviendrait à souffler les réponses.

## Avertissement à porter en tête du prompt

G1 a déjà établi que **63 blocs de `04-secteur.json` portent un `src_ids` vide** et que les deux
études d'origine ne contiennent aucune URL. Les questions 2 et 3 de G2 — source unique, source
citant une source — risquent donc de rendre un verdict trivialement négatif sur tout le document.

La question réellement utile ici est la **6** : *qu'est-ce qui manque et que le document ne
déclare pas comme manquant ?* C'est la seule qui n'est pas déjà couverte par le gate mécanique.
Les questions 1 et 4 gardent tout leur intérêt sur le fond sectoriel converti.
