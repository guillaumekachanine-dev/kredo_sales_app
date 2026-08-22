# État du chantier — ce qui est exécutable aujourd'hui

**Ce fichier dérive. Il est daté, et il te dit comment le revérifier.** Ne le cite jamais comme
une vérité présente : c'est un point de départ pour interroger la base, pas un substitut.

L'autorité sur l'état d'exécution est
**`docs/MASTER-STUDY/registre/ROADMAP-CORRECTIONS.md`** — autoportante, tenue à jour, et à lire en
entier si tu reprends le chantier à froid.

Relevé de ce fichier : **22/08/2026**, base `jvzgmhvwirsbdkjpmvla` lue en direct. Le relevé
précédent (14/08) s'est révélé faux sur un point non trivial en huit jours — voir §5 — donc
**ne saute pas la revérification au prétexte que ce fichier a l'air récent.**

---

## 1. Plus aucun défaut de contrat ne bloque un run — et un run a déjà été ingéré

**Depuis le 14/08/2026, la chaîne est exécutable de bout en bout.** Les six défauts de contrat
A1-A6 sont corrigés, et le gel d'E3 est levé. **Ce n'est plus seulement théorique** : le run
`seg-parfumerie-compositions-b2b` a franchi G0, produit E0→E5, et a été **ingéré en base le
20/08/2026** (`--live`, ADR-0021 L3, verdict `usable_with_caveats` rendu par Guillaume). BI et le
cockpit le lisent désormais via les modèles de lecture `SectorKnowledgeReadModel` /
`AccountSectorPerspective` (ADR-0021 L4/L5). Détail complet en §4.

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
| **B4** | Couche accessibilité (A6) — **0 fait sur les comptes de la base** | La carte de priorisation a un axe mort, et « le droit d'intervenir » reste inconnu |
| **axes** | Les 5 axes « toujours renseignables » sont à **77 / 105** (22/08, était 77/99) | **12 des 16 segments éligibles échouent à G0**, et ce nombre a empiré depuis le 14/08 (6→4 segments qui passent) : la base a gagné des comptes plus vite que la classification. Voir §5 |
| **E3** | Le générateur tronque toujours (comportement de modèle) | Plus bloquant : G1 le refuse. Mais **compte une régénération** dans ton budget |
| **G2** | Red team jamais exécutée | Commande prête dans `registre/2026-08-aero-spatial-defense/07-g2-a-executer.md`. Peu d'intérêt tant que le sourçage n'est pas repris |
| **n8n** | 12 workflows patchés non réimportés sur le VPS, dont `intel-010-refresh` | Le bloc de classification n'est jamais produit. `n8n:status` **ne voit pas** cette dérive : il compare des compteurs de nœuds, or seul du code interne a changé |
| **veille** | `slice(0, 40)` positionnel dans le collecteur | Ajouter des sources au corpus ne produit **aucun** candidat supplémentaire, de façon déterministe et silencieuse |
| **Apollo / Lusha** | Connecteurs non authentifiés, OAuth impossible en session agent | Le sous-bloc « décideur SI » de A6 reste humain |

---

## 4. Les runs existants, et ce qu'il faut en faire de chacun

**Deux runs existent désormais**, et ils ne se lisent pas de la même façon.

### `registre/2026-08-aero-spatial-defense/` — rejeté, banc d'essai des contrats

- Produit **en mode conversion**, à partir de deux études faites hors de KREDO, sans recherche
  web.
- **`03-sources.json` et `06-chaine.json` n'existent pas** — E3 et E6 n'ont jamais été exécutés.
- Sur ses FAIL G1 restants, la grande majorité sont des **manques de matière**, pas des défauts de
  contrat. Aucune correction de code ne les lèvera : il faudrait avoir cherché.
- **Il garde une valeur** : rejoue G1 dessus après toute modification d'un schéma ou du script —
  un gate qui se met à passer sur ce run est un gate qui s'est relâché.

### `registre/2026-08-parfumerie-compositions-b2b/` — ingéré, première preuve que la chaîne rend

- Segment choisi sur mesure en base le 14/08 : 7 comptes rattachés (le mieux doté des 38 à
  l'époque), 5 axes obligatoires à 100 %, macro déjà porteur de 18 items de connaissance.
- E0→E5 produits avec recherche réelle (ChatGPT Deep Research pour E4). G1 rejoué le 20/08 :
  **38 PASS / 5 FAIL**. Les 5 FAIL restants (journal E3 absent, `compteurs.requetes=0`, échéance
  IFRA jugée « source non officielle » par l'allowlist `.gouv.*`, revalidation non datée du jour,
  3 items réglementaires écrits au macro) ont été **arbitrés par Guillaume**, pas corrigés — G3
  a tranché `usable_with_caveats` en connaissance de ces trous, pas en leur absence.
- **Ingéré `--live` le 20/08/2026** : `run_id 522cfe06-…`, `document_id c8e7aa8b-…`. 6 maillons
  de chaîne de valeur amorcés par l'import E4, 8 `competitive_map_entries` laissées orphelines
  (arbitrage différé), verrous posés sur `market_size_eur_bn`/`market_growth_pct` (`not_published`).
- **G2 (red team) n'a jamais tourné sur ce run.** Le verdict `usable_with_caveats` ne couvre donc
  que G0/G1/G3 — pas les six questions de changement de contexte.
- Une vérification indépendante post-ingestion a trouvé un vrai bug (RPC ne promotant jamais
  `sector_intelligence.status` vers `active`), corrigé par un `UPDATE` ponctuel — voir
  `chaine-e0-e7.md` §E7 pour le geste à reproduire après tout futur `--live`.

**Conséquence pour toi** : la première étude *neuve* (recherche réelle, pas conversion) sur un
segment encore vide sera un troisième run. Les deux existants ne se répètent pas — l'un prouve ce
qui casse, l'autre prouve ce qui marche.

---

## 5. Choisir le prochain segment — qui franchit G0 aujourd'hui

**Ne présume pas que G0 passera, et ne présume pas non plus qu'un segment qui passait continue de
passer.** Relevé du 14/08 : 6 segments sur 16 franchissaient la condition d'axes. **Revérifié le
22/08 : ils ne sont plus que 4.** Ce n'est pas une correction du relevé précédent, c'est un vrai
mouvement en huit jours : de nouveaux comptes ont été rattachés à des segments existants sans être
classifiés sur les 3 axes libres (`regime_achat`, `modele_eco`, `tier`), ce qui a fait **reculer**
deux segments qui passaient :

- **`seg-parfumerie-compositions-b2b` lui-même** — le segment déjà étudié et ingéré — est passé de
  7 à **10 comptes rattachés**, dont seulement **7** ont leurs axes complets. Le run du 14/08
  reste valide sur les comptes qu'il a traités ; ce sont les 3 comptes ajoutés depuis qui manquent
  de classification, pas l'étude qui s'est dégradée.
- **`seg-aero-spatial-defense`** est passé de 3 à **6 comptes**, dont seulement 3 classifiés.

Relevé du 22/08/2026 — les quatre segments qui franchissent la condition d'axes de G0 aujourd'hui,
**aucun n'a encore de fiche** :

| Segment | Comptes | Axes complets | Échéances futures |
|---|:-:|:-:|:-:|
| `seg-btp-materiaux` | 3 | 3/3 | 3 |
| `seg-btp-constructeurs-promoteurs` | 3 | 3/3 | 3 |
| `seg-btp-immobilier` | 3 | 3/3 | 3 |
| `seg-parfumerie-marques-produits-finis` | 3 | 3/3 | 1 |

Les trois segments BTP forment un triplet cohérent avec échéance datée sur chacun — et un
livrable BTP hors-corpus existe déjà (`sector_intelligence/livrables_etudes/2026-08-btp-
travaux-publics/`, couche ESN vide sur 14/14 comptes) qui pourrait servir de matière de départ
pour un V0 sous le corpus complet, comme le run parfumerie l'a fait pour le Spatial. Ce sont des
**candidats observés en base, pas une recommandation** — le choix du segment reste l'arrêt n°1
(SKILL.md), sauf si Guillaume l'a déjà nommé.

Douze autres segments échouent sur les axes et sont récupérables : faire tourner INTEL-010 puis
`apply_account_classification()` sur les comptes incomplets. Rejoue la requête ci-dessous pour
voir lesquels sont les plus proches du seuil — la liste bouge trop vite pour la figer ici.

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

**`seg-parfumerie-compositions-b2b` a déjà été traité** (§4) — ne le reproduis pas comme s'il
était encore ouvert. Sur les critères actuels (§ci-dessus), les trois segments BTP sont les seuls
qui passent la condition d'axes ET portent une échéance future ; vérifie le gisement A7 (critère
3) avant de t'engager — il n'a pas été mesuré sur eux depuis le 14/08.

**N'enchaîne pas sur le Spatial-Défense.** Sa matière est une conversion, et repartir de là revient
à hériter de ses trous en croyant les corriger.

---

## 6. Les métriques du chantier — au 22/08/2026, lues en base (sauf note contraire)

| Métrique | Valeur | 14/08 | Cible |
|---|---|---|---|
| Comptes réels (hors `mapped`) | **105** (+ 7 `mapped`) | 99 (+10) | — |
| Couverture identité (SIREN, comptes réels) | **30 / 105** | 28 / 99 | 105/105 ou motif d'échec explicite |
| **Segments porteurs de connaissance propre** | **2 / 38** | 1 / 38 | croissant |
| Fiches avec ≥ 1 échéance future | 12 *(non revérifié le 22/08)* | 12 | 100 % des étudiées |
| Faits d'accessibilité (A6) | **0** | 0 | 100 % des comptes prioritaires |
| Faits d'intensité SI (A7) | 9 *(non revérifié le 22/08)* | 9 | comptes prioritaires |
| Segments à ≥ 3 comptes franchissant la condition d'axes de G0 | **4 / 16** | 6 / 16 | 16/16 |
| Runs produits sous le corpus complet, ingérés | **1** (`seg-parfumerie-…`, 20/08) | 0 | croissant |
| Entrées de cartographie concurrentielle | **23** | 15 | — |

**La troisième colonne n'est pas de l'historique décoratif : elle montre qu'un chiffre à la baisse
est possible** (`axes` : 6→4) autant qu'un chiffre à la hausse (`segments porteurs` : 1→2,
`comptes réels` : 99→105). Rejoue toujours la requête plutôt que de citer l'une ou l'autre colonne.

**« Segments porteurs de connaissance propre » reste la métrique du chantier.** Elle mesure la
résorption de la fracture macro/segment : 15 macros portent la connaissance de base, 38 segments
portent les comptes. Tant qu'elle ne monte pas, chaque étude produite est **invisible à la maille
où les comptes la lisent** — c'est l'axiome A4, et c'est le seul chiffre qui dise si le dispositif
sert à quelque chose. Elle vient de bouger pour la première fois (1→2) grâce à l'ingestion du
20/08 — c'est la preuve que la chaîne, quand elle va au bout, fait effectivement monter ce chiffre.

```sql
-- La métrique du chantier, à rejouer après chaque ingestion
select count(*) filter (where description is not null) || ' / ' || count(*) as segments_porteurs
from sector_intelligence where level = 'segment';
```
