# État du chantier — ce qui est exécutable aujourd'hui

**Ce fichier dérive. Il est daté, et il te dit comment le revérifier.** Ne le cite jamais comme
une vérité présente : c'est un point de départ pour interroger la base, pas un substitut.

L'autorité sur l'état d'exécution est
**`docs/MASTER-STUDY/registre/ROADMAP-CORRECTIONS.md`** — autoportante, tenue à jour, et à lire en
entier si tu reprends le chantier à froid.

Relevé de ce fichier : **14/08/2026**, base `jvzgmhvwirsbdkjpmvla` lue en direct.

---

## 1. Plus aucun défaut de contrat ne bloque un run

**Au 14/08/2026, la chaîne est exécutable de bout en bout.** Les six défauts de contrat A1-A6
sont corrigés, et le gel d'E3 est levé.

**Ce qui a débloqué E3** : le générateur — un modèle, pas du code — tronque toujours son export
JSON à la frontière du pack minimal. Ce qui a changé, c'est que la troncature n'est plus
silencieuse. `check_packs` (G1) contrôle que chaque `src_id` de `pack_minimal` et `pack_enrichi`
résout dans `sources[]`, que les deux packs sont disjoints et couvrants, que le champ `pack` de
chaque source concorde avec les listes, et que les trois familles obligatoires pointent un
`src_id` réel. Une coupure laisse des identifiants orphelins : c'est désormais un FAIL bloquant.

Le contrôle a été éprouvé sur une **reconstitution de la panne réelle** — 15 sources annoncées,
7 livrées, compteur ajusté pour rester cohérent, soit le cas précis que `check_compteurs` ne
voyait pas. Il rend 8 identifiants orphelins et refuse.

**La boucle de travail est donc** : produire E3, passer G1, régénérer si le gate refuse. Ne
déclare jamais un référentiel bon sans avoir joué le gate — c'est tout l'objet de l'axiome A10.

## 2. Ce qui a été réparé, et qu'il ne faut pas rouvrir

Six défauts de contrat corrigés le 13/08/2026. Si tu croises un document qui les décrit encore
comme ouverts, c'est le document qui est en retard — vérifie à la source avant de « corriger » quoi
que ce soit.

| # | Défaut | État |
|---|---|---|
| **A1** | G0 inpassable par construction (« les 7 axes à 100 % ») | ✅ corrigé — 5 axes obligatoires + 2 conditionnels |
| **A2** | G0 et E0 ne comptaient pas les mêmes comptes | ✅ tranché — un client compte dans le seuil et figure dans la carte |
| **A3** | A9 et `cadrage.schema.json` s'excluaient | ✅ corrigé |
| **A4** | Le parseur E5 ne lisait pas la couche ESN | ✅ **fait** — commit `149d3e98`, vérifiable dans `competitive-map-output.ts` |
| **A5** | E1 et E2 sans schéma | ✅ `taxonomie.schema.json`, `socle.schema.json` |
| **A6** | Deux vocabulaires de practice confondus | ✅ `src/lib/config/practices.ts`, 13 tests contre un relevé base |

> **La couche ESN peut être produite et importée.** Trois documents ont porté le bandeau rouge de
> A4 jusqu'au 14/08 alors que le code était corrigé depuis la veille — `README.md` §6.1,
> `08-ETAPE-E5…` §8 et `schemas/competitive-map.schema.json`, tous rectifiés depuis. Si tu croises
> encore un bandeau contredisant le code, c'est le code qui gagne (`schemas/README.md`).

---

## 3. Ce qui reste ouvert

| # | Sujet | Effet s'il n'est pas traité |
|---|---|---|
| **B4** | Couche accessibilité (A6) — **0 fait sur 109 comptes** | La carte de priorisation a un axe mort, et « le droit d'intervenir » reste inconnu |
| **axes** | Les 5 axes « toujours renseignables » sont à **77 / 99** | **10 des 16 segments éligibles échouent à G0** sans que rien ne le signale avant le lancement. Voir §5 |
| **E3** | Le générateur tronque toujours (comportement de modèle) | Plus bloquant : G1 le refuse. Mais **compte une régénération** dans ton budget |
| **G2** | Red team jamais exécutée | Commande prête dans `registre/2026-08-aero-spatial-defense/07-g2-a-executer.md`. Peu d'intérêt tant que le sourçage n'est pas repris |
| **n8n** | 12 workflows patchés non réimportés sur le VPS, dont `intel-010-refresh` | Le bloc de classification n'est jamais produit. `n8n:status` **ne voit pas** cette dérive : il compare des compteurs de nœuds, or seul du code interne a changé |
| **veille** | `slice(0, 40)` positionnel dans le collecteur | Ajouter des sources au corpus ne produit **aucun** candidat supplémentaire, de façon déterministe et silencieuse |
| **Apollo / Lusha** | Connecteurs non authentifiés, OAuth impossible en session agent | Le sous-bloc « décideur SI » de A6 reste humain |

---

## 4. Le run existant, et ce qu'il faut en faire

`registre/2026-08-aero-spatial-defense/` est le seul run produit. Il est **rejeté**, et il ne se
rattrape pas :

- Il a été produit **en mode conversion**, à partir de deux études faites hors de KREDO, sans
  recherche web.
- **`03-sources.json` et `06-chaine.json` n'existent pas** — E3 et E6 n'ont jamais été exécutés.
- Sur ses FAIL G1 restants, la grande majorité sont des **manques de matière** (sources vides,
  journaux de requêtes absents, top 3, couche ESN), pas des défauts de contrat. Aucune correction
  de code ne les lèvera : il faudrait avoir cherché.

**Il garde une valeur : c'est le banc d'essai des contrats.** Rejoue G1 dessus après toute
modification d'un schéma ou du script — un gate qui se met à passer sur ce run est un gate qui
s'est relâché.

La première étude complète sera **un run neuf, sur un autre segment.**

---

## 5. Choisir le prochain segment — qui franchit G0 aujourd'hui

**Ne présume pas que G0 passera.** Les 5 axes dits « toujours renseignables » ne le sont qu'à
**77 comptes sur 99** : 22 comptes n'ont ni `regime_achat`, ni `modele_eco`, ni `tier` complets.
Sur les **16 segments** qui atteignent le seuil de 3 comptes, **6 seulement** franchissent la
condition d'axes de G0.

Relevé du 14/08/2026 — les six qui passent :

| Segment | Comptes | Échéances futures | Fiche |
|---|:-:|:-:|:-:|
| `seg-parfumerie-compositions-b2b` | **7** | 1 | ✗ |
| `seg-btp-constructeurs-promoteurs` | 3 | 3 | ✗ |
| `seg-btp-immobilier` | 3 | 3 | ✗ |
| `seg-btp-materiaux` | 3 | 3 | ✗ |
| `seg-parfumerie-marques-produits-finis` | 3 | 1 | ✗ |
| `seg-aero-spatial-defense` | 3 | 2 | ✗ |

Les dix autres échouent sur les axes et sont récupérables : il suffit de faire tourner INTEL-010
puis `apply_account_classification()` sur les comptes incomplets. Les plus proches du seuil sont
`seg-public-esr` (6/7), `seg-finance-assurance-mutuelles-courtage` (4/5),
`seg-numerique-editeurs-verticaux` (4/5) et `seg-sante-soins-diagnostic` (3/4) — **un seul compte
à classifier** dans chaque cas.

**Aucun des six n'a de fiche.** Le seul segment qui en porte une est
`nutraceutique-sante-naturelle`, et il n'a que **2 comptes** : il est sous le seuil de G0. Autrement
dit, le 1/38 de la métrique du chantier ne correspond à aucun segment étudiable — la connaissance
existante et les comptes ne se recouvrent nulle part.

```sql
-- À rejouer : quels segments franchissent la condition d'axes de G0 ?
with reels as (
  select c.regime_achat, c.modele_eco, c.tier, s.id seg_id, s.slug, s.description, s.parent_id
  from companies c join sector_intelligence s on s.id = c.segment_id
  where c.depth_level is distinct from 'mapped'
)
select slug, count(*) as comptes,
       count(*) filter (where regime_achat is not null and modele_eco is not null
                          and tier is not null) as axes_ok,
       (description is not null) as fiche,
       (select count(*) from sector_regulatory_items r
          where r.sector_id in (seg_id, parent_id) and r.deadline_date > current_date) as ech_futures
from reels group by slug, seg_id, parent_id, description
having count(*) >= 3
order by (count(*) = count(*) filter (where regime_achat is not null and modele_eco is not null
                                        and tier is not null)) desc, comptes desc;
```

Trois critères, dans cet ordre :

1. **≥ 3 comptes rattachés et les 5 axes complets** — c'est G0. En dessous, une carte ne se
   priorise pas.
2. **Au moins une échéance datée future** sur le segment ou son macro — sans elle, pas de
   « pourquoi maintenant », et le run perd son motif d'appel universel.
3. **Un gisement A7 non vide.** Deux appels France Travail suffisent
   (`secteurActivite=<division NAF>`, puis `&domaine=M18`). Dense en division 62 (ESN, 27 %) et 61
   (télécoms, 22 %), quasi nul en 30 (aéro-spatial : 22 offres SI dans toute la France). Table dans
   `src/features/hiring-intensity/README.md`.

**Le candidat que ces trois critères désignent est `seg-parfumerie-compositions-b2b`** : le seul à
dépasser largement le seuil, G0-propre, et déjà retenu par `09-ETAPE-E6…` §5 comme cible après le
pilote BTP (« meilleur corpus, un client, chaîne courte compositions → emballage → marques »). Il
ouvre en plus la voie à E6, qui exige des comptes sur trois maillons.

**N'enchaîne pas sur le Spatial-Défense.** Sa matière est une conversion, et repartir de là revient
à hériter de ses trous en croyant les corriger.

---

## 6. Les métriques du chantier — au 14/08/2026, lues en base

| Métrique | Valeur | Cible |
|---|---|---|
| Comptes réels (hors `mapped`) | 99 (+ 10 `mapped`) | — |
| Couverture identité (SIREN, comptes réels) | **28 / 99** | 99/99 ou motif d'échec explicite |
| **Segments porteurs de connaissance propre** | **1 / 38** | croissant |
| Fiches avec ≥ 1 échéance future | 12 | 100 % des étudiées |
| Faits d'accessibilité (A6) | **0** | 100 % des comptes prioritaires |
| Faits d'intensité SI (A7) | 9 | comptes prioritaires |
| Segments à ≥ 3 comptes franchissant la condition d'axes de G0 | **6 / 16** | 16/16 |
| Entrées de cartographie concurrentielle | 15 | — |

**La troisième est la métrique du chantier.** Elle mesure la résorption de la fracture
macro/segment : 15 macros portent la connaissance, 38 segments portent les comptes. Tant qu'elle ne
monte pas, chaque étude produite est **invisible à la maille où les comptes la lisent** — c'est
l'axiome A4, et c'est le seul chiffre qui dise si le dispositif sert à quelque chose.

```sql
-- La métrique du chantier, à rejouer après chaque ingestion
select count(*) filter (where description is not null) || ' / ' || count(*) as segments_porteurs
from sector_intelligence where level = 'segment';
```
