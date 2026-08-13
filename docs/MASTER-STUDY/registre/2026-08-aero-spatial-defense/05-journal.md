# 05 — Journal de recherche E5

**Run** `2026-08-aero-spatial-defense` · **Date** 2026-08-13 · **Mode** conversion

---

## Requêtes réellement jouées

**Zéro.** Même motif qu'en E4 : conversion, pas découverte.

E5 §3 prescrit **cinq requêtes par compte**, la quatrième — offres d'emploi et technologies —
étant désignée comme « la plus rentable de toute la méthode ». Sur dix comptes, cela ferait
50 requêtes. Aucune n'a été jouée, et c'est précisément ce qui explique que la couche ESN reste
à 0/3 et que la grille « IA annoncé vs déployé » reste vide sur 10 comptes sur 10 : ces deux
rubriques sont alimentées par la requête 4 et par la requête 5, et par rien d'autre.

## Lectures en base effectuées, à la place

| # | Requête SQL | Ce qu'elle a rendu |
|---|---|---|
| 1 | `companies` du segment, 7 axes, profondeur, origine | 10 comptes, 7 `mapped`, 3 réels |
| 2 | `competitive_map_entries` jointes aux comptes | 10 entrées, `profile_json` de 40 à 73 octets |
| 3 | `account_facts` par `fact_type` sur le segment | 74 faits, concentrés sur 2 comptes |
| 4 | `account_facts` jointes à `intelligence_sources` | 2 comptes réellement sourcés ; 8 sourcés par une ligne sans URL |
| 5 | `account_signals` du segment | 15 signaux, tous des reprises FOLIO, 0 signal actionnable |
| 6 | `intelligence_sources` : proportion sans URL | 10 sur 450, et les 10 sont celles de ce segment |

## Ce que l'étude d'origine avait cherché

L'étude A liste en Annexe B des familles de requêtes non substituées, dont trois blocs
— IDENTITÉ, ACHATS/ACCESSIBILITÉ, TRIGGERS — correspondent exactement aux rubriques restées
vides. Elle déclare elle-même : « le run initial n'avait pas été conçu pour produire la longlist
France 25-40, les exclusions documentées, les panels d'achat et la couche juridique exhaustive ».

## Longlist

**Non constituée.** E5 §4.1 exige 25 à 40 acteurs croisant quatre familles de sources
indépendantes. La matière convertie en porte **10**, plus 6 benchmarks écartés — soit 16, dont
aucun n'est issu d'un croisement documenté. La segmentation en cinq catégories est donc opérée
sur un univers qui n'a jamais été établi.
