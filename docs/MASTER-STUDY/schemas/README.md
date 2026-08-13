# Schemas — les contrats de sortie

**Le livrable est le JSON. Le markdown est une vue.** (axiome A9)

Ce dossier porte les JSON Schema de chaque étape. Un livrable qui ne valide pas n'est pas
« presque bon » : il n'est pas ingérable, et il ne passe pas G1.

---

## Les fichiers

| Schéma | Étape | Consommé par |
|---|---|---|
| `cadrage.schema.json` | E0 | Tous les prompts suivants |
| `taxonomie.schema.json` | E1 | Gate G0 et contrôle G1 |
| `socle.schema.json` | E2 | Régime déterministe et contrôle G1 |
| `source-registry.schema.json` | E3 | E4, E5, la veille |
| `sector-knowledge.schema.json` | E4 | `sector_intelligence`, `sector_*`, E5 |
| `competitive-map.schema.json` | E5 · V1 · V2 · V3 | `CompetitiveMapImportWizard` |
| `value-chain.schema.json` | E6 | `value_chain_*`, `build.py` |

---

## Règle de préséance

> **Le code est le contrat normatif. Le schéma le documente.**

Pour `competitive-map.schema.json`, le parseur qui fait foi est
`src/features/competitive-map/domain/competitive-map-output.ts`. Il tolère délibérément des
écarts réels, observés sur les livrables produits :

| Écart toléré par le code | Motif |
|---|---|
| `categorie` avec tirets (`mid-market`) | Normalisé en `mid_market` |
| `date_snapshot` en `JJ/MM/AAAA` | Converti en ISO |
| Demi-points sur `empreinte_metier` / `maturite_numerique` (4.5) | Arrondis — les colonnes sont des `smallint` |
| `confiance: "elevee"` / `"Élevée"` | Normalisé en `haute` (accents et casse neutralisés) |
| `identifiant_national` absent | Le SIREN n'est **jamais** un prérequis de résolution |
| Composantes d'appétence à `0` | Traitées comme `null` — un `0` de remplissage ne doit pas passer pour une note |

**En cas de divergence entre un schéma de ce dossier et le parseur, le parseur gagne, et le
schéma est corrigé dans le même commit.**

---

## L'invariant commun : `compteurs`

Tout livrable porte un objet `compteurs`, et pour chaque clé :

```
compteurs.<nom> == len(<nom>)
```

C'est ce qui rend détectable la troncature silencieuse — le mode de défaillance qui a produit
deux référentiels annonçant 15 et 13 sources et en contenant 7 et 5, avec la coupure tombant
exactement à la frontière du pack minimal.

Un livrable sans `compteurs` est rejeté par G1 avant même d'être lu.
