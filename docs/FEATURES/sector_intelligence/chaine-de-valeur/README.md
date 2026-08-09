# Chaînes de valeur sectorielles

Pilote **BTP** livré le 09/08/2026. Modélisation additive en base Supabase, générateur SVG autonome.

| Document | Contenu |
|---|---|
| `BRIEF-MODELISATION.md` | Le brief de la mission |
| `DECISION-MODELE.md` | **L'arbitrage `sector_id` et les 8 amendements au modèle.** À lire avant de toucher au schéma |
| `NOTE-EXPLOITATION.md` | **Comment s'en servir en rendez-vous, et le verdict.** À lire avant le premier usage |
| `btp/export.json` | L'export du secteur — source de vérité du rendu |
| `btp/chaine-btp.html` | Le schéma BTP, autonome et publiable |
| `assets/chaine-de-valeur.html` | Le générateur générique, vierge et réutilisable |
| `build.py` | Injecte l'export dans le générateur |

## Régénérer le schéma

Le rendu est **généré depuis les données, jamais dessiné**. Après toute modification en base :

```bash
# 1. réexporter (requête dans DECISION-MODELE.md, ou via MCP Supabase)
# 2. reconstruire
python3 chaine-de-valeur/build.py btp
```

`build.py` refuse de construire si un acteur hors Kredo n'a pas de source. Le générateur affiche la même alerte en rouge sous le schéma.

## Le modèle en une page

```
value_chain_nodes    maillons (couche='chaine', maillon 1..5, rang 1..3)
                     + couches transverses (prescripteur | financeur | technologie)
value_chain_actors   comptes Kredo (company_id) ET acteurs hors portefeuille (company_id NULL + source)
value_chain_links    dépendances : fournit | prescrit | finance | outille, intensité 1..3
```

`sector_id` pointe vers un **macro-secteur** et désigne le **sujet** de la chaîne, jamais l'appartenance de ses acteurs. Un acteur positionné sur la chaîne BTP n'est pas reclassé en BTP : ces tables n'écrivent jamais dans `companies`. Voir `DECISION-MODELE.md` §2.

## État du pilote BTP

| | |
|---|---|
| Maillons | 7 sur 5 slots génériques · 3 couches transverses |
| Acteurs | **50** — 24 comptes Kredo, 26 hors portefeuille, **26 sources sur 26** |
| Clients visibles | Audemard (①·1) et Banque Populaire Méditerranée (financeur) |
| Liens | 20 |
| Format | 1180 × 789, soit 198 mm de haut en A4 paysage |

Les 12 comptes du macro BTP y sont, plus 12 comptes classés dans d'autres macro-secteurs qui ont une place légitime sur la filière — c'est le principal résultat du pilote.

## Contraintes que la base fait respecter

| Règle du brief | Comment elle est tenue |
|---|---|
| Aucun acteur hors Kredo sans source | `check (company_id is not null or source is not null)` |
| Pas de maillon théorique (anti-poster) | Contrôle après peuplement — aucune contrainte SQL ne l'exprime |
| Zone de captation justifiée | `check (capture_valeur is null or capture_justification is not null)` |
| Confiance visible | `confiance` NOT NULL sur tout nœud |
| Régénérable sans doublon | Index uniques sur `(sector_id, maillon, rang)`, `(node_id, nom)`, `(node_amont, node_aval, nature)` |

## Rollback

Migration `value_chain_foundation`, strictement additive :

```sql
begin;
drop table if exists public.value_chain_links  cascade;
drop table if exists public.value_chain_actors cascade;
drop table if exists public.value_chain_nodes  cascade;
commit;
```

Rien d'autre n'est touché : `companies`, `sector_intelligence` et les 14 fiches sectorielles sont inchangés.
