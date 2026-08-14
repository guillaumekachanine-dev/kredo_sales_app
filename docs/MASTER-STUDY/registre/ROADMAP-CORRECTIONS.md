# Roadmap des corrections du corpus

**Point d'entrée unique pour reprendre le chantier MASTER STUDY.** Si vous arrivez sans
historique : lisez ce fichier en entier, il est autoportant. Vous n'avez besoin de rien d'autre
pour savoir quoi faire, dans quel ordre, et pourquoi.

Dernière mise à jour : **14/08/2026**. Les six défauts de contrat A1-A6 sont corrigés, le gel
d'E3 est levé, et `kredo-master-study` est le seul déclencheur autorisé.

**Prochaine action : produire.** Plus aucun défaut de contrat ne bloque un run. Ce qui reste est
de la matière — **B4** (accessibilité, 0 fait sur 109 comptes) — et le choix du segment, que
`.agents/skills/kredo-master-study/references/etat-du-chantier.md` §5 tranche sur mesure en base.

---

## 1. Où en est le chantier, en cinq lignes

Le corpus `docs/MASTER-STUDY/` a été établi le 13/08/2026 et **exécuté le même jour**, une fois,
sur le segment `seg-aero-spatial-defense`, en mode conversion — sans recherche web, à partir de
deux études du Spatial produites en août 2026.

Le run est **rejeté** (G1 : 13 FAIL contre le corpus v1.0 ; **12 FAIL** contre v1.1, après A1-A2-A3). C'était l'objectif : éprouver les contrats contre
de la matière réelle. Le diagnostic complet est dans
[`2026-08-aero-spatial-defense/08-rapport-ecarts.md`](2026-08-aero-spatial-defense/08-rapport-ecarts.md),
qui sépare **9 défauts de contrat** de **6 manques de matière**. Ce fichier-ci en est la vue
actionnable.

**La métrique du chantier — segments porteurs de connaissance — vaut toujours 1/38.**

---

## 2. La règle qui commande l'ordre des travaux

> **Un défaut de contrat se corrige avant toute collecte.**

Motif mesuré, pas théorique : le défaut **C3** fait que le parseur d'import ne lit pas la couche
ESN. Collecter des panels fournisseurs et des décideurs SI aujourd'hui, c'est produire une
matière qui sera silencieusement jetée au moment de l'ingestion — sans qu'aucune erreur ne soit
levée. La preuve est en base : les dix `competitive_map_entries` du Spatial portent un
`profile_json` de **40 à 73 octets**.

Corollaire : les actions §3 (contrat) précèdent les actions §4 (collecte). Ce n'est pas une
préférence d'ordonnancement, c'est une condition pour que la collecte ne soit pas perdue.

---

## 3. Corrections de contrat — aucune recherche nécessaire

| # | Action | Où | Coût | État |
|---|---|---|---|---|
| **A1** | Rendre G0 franchissable | `10-ETAPE-E7…` §2 + `04-ETAPE-E1…` §4.1/§5 | 15 min | ✅ **fait 13/08** |
| **A2** | Trancher G0 vs E0 sur les comptes clients | `03-ETAPE-E0…` §3 + §4.3 | 10 min | ✅ **fait 13/08** — tranché par Guillaume |
| **A3** | Ajouter `compteurs` à `cadrage.schema.json` | `schemas/` | 5 min | ✅ **fait 13/08** |
| **A4** | Étendre le parseur E5 à la couche ESN | code, 3 couches | ½ j | ✅ **fait 13/08** |
| **A5** | Écrire `taxonomie.schema.json` et `socle.schema.json` | `schemas/` | 1 h | ✅ **fait 13/08** |
| **A6** | Table de correspondance `kredo_practice` ↔ `offer_practices.slug` | corpus + migration | 2 h | ✅ **refait 13/08 (soir)** — la 1re version mappait vers le vocabulaire front |

### A1 — G0 est inpassable par construction ✅ *corrigé le 13/08*

`10-ETAPE-E7` §2 exige « les 7 axes renseignés — 100 % ». `REFERENTIEL-CLASSIFICATION.md`
§5.5 / §6.8 / §10-6, que `04-ETAPE-E1` §1 déclare **normatif délégué**, impose l'inverse :
`moment = NULL` en l'absence de fait daté sourçable, `vertical_client = NULL` hors filière
fournisseur. En base, `moment` vaut **1 compte sur 96**.

Aucun run ne peut donc franchir G0, sur aucun segment. Distinguer les deux familles :

- **5 axes toujours renseignables** — `segment`, `relation_type` (colonnes `NOT NULL`),
  `regime_achat`, `modele_eco`, `tier` (obligatoires ensemble, référentiel §10 contrôle 2) → 100 %.
- **2 axes conditionnels** — `moment`, `vertical_client` → renseignés **ou** légitimement NULL,
  le NULL étant documenté dans `classification_note` et jamais inventé.

### A2 — G0 et E0 ne comptent pas les mêmes comptes ✅ *tranché le 13/08*

**Tranché par Guillaume le 13/08/2026.** Un compte client **compte** dans le seuil des 3 et
**figure** dans la cartographie : le positionner face aux concurrents étudiés est précisément ce
que la carte doit permettre, et c'est un actif commercial, pas du bruit.

Ce que `comptes_exclus` d'E0 signifie donc réellement : **exclu des cibles de prospection**, pas
exclu du périmètre d'étude. Un client n'entre pas dans `comptes_prioritaires` quand
`objectif_commercial = ouverture` ; il y entre légitimement sous `extension`.

À écrire explicitement dans `03-ETAPE-E0` §3 et §4, sinon l'ambiguïté reviendra à chaque run.

### A3 — A9 et `cadrage.schema.json` s'excluent ✅ *corrigé le 13/08*

L'axiome A9 impose un bloc `compteurs` sur **tout** livrable. `cadrage.schema.json` porte
`"additionalProperties": false` et ne définit pas `compteurs` : ajouter le bloc invalide le
fichier, ne pas l'ajouter le fait échouer à G1. Les deux contrôles ne peuvent pas passer
ensemble.

### A4 — Le parseur E5 ne lisait pas la couche ESN ✅ *corrigé le 13/08, commit `149d3e98`*

`competitive-map.schema.json` définit `profil_compte` avec `metier_chaine_valeur`, `maillon`,
`contrats_majeurs`, `grilles` (dont `ia_annonce_vs_deploye`, **déclaré obligatoire**),
`couche_esn` et `traduction_commerciale`. Le parseur normatif ne projette que onze clés, et
**aucune de celles-là** :

```
PROFILE_TEXT_KEYS    proposition_valeur · modele_economique · a_ne_pas_dire
PROFILE_LIST_KEYS    dependances_cles · differenciateurs · priorites_strategiques ·
                     chantiers_technologiques · trigger_events · trous · sources
PROFILE_OBJECT_KEYS  chaine_valeur
```

La règle de préséance (`schemas/README.md`) donne raison au code : c'est le schéma **et** le
squelette de `08-ETAPE-E5` §8 qui sont faux. Mais la bonne correction est d'étendre le code —
les six clés du schéma sont celles qui portent la valeur commerciale.

**Trois couches à modifier dans le même commit**, les mêmes onze clés y sont câblées :

| Couche | Fichier | Ancre |
|---|---|---|
| Parsing | `src/features/competitive-map/domain/competitive-map-output.ts` | `PROFILE_*_KEYS`, ~l. 289-299 |
| Présentation | `src/features/competitive-map/domain/present-competitive-map-workspace.ts` | ~l. 192-199 |
| Écran | `CompetitiveActorProfiles` (desktop **et** mobile) | — |

Cinq fichiers de test couvrent déjà cette feature, dont `competitive-map-output.test.ts` qui
vérifie la rétrocompatibilité des exports V1 : l'extension est sûre, mais les tests se complètent
dans le même commit. **Décision UX à prendre** : la couche ESN est ce qu'un commercial lit
90 secondes avant un appel — elle ne se range pas dans un accordéon secondaire.

Trois écarts mineurs de la même famille, à traiter au passage :

| Schéma | Parseur | Effet |
|---|---|---|
| `acteurs_ecartes` | lit `ecartes` | la liste des acteurs écartés est ignorée |
| `accessibilite` au niveau du compte | lit `appetence.accessibilite` | deux emplacements pour l'axe Y de la carte |
| `reserve_a_qualifier`, `transverse`, `compteurs` | non lus | top 3, message sectoriel et invariant A9 n'atteignent jamais la base |
| `rayon: "europeen"` | champ non lu | valeur hors domaine, jamais détectée |

### A5 — E1 et E2 n'ont pas de schéma 🟠

`schemas/` contient cinq fichiers ; `01-taxonomie.json` et `02-socle.json` n'en ont aucun, alors
que G1 les contrôle et que le second porte `echeance_pivot`, dont G1 fait un contrôle bloquant.
Deux livrables sur sept ne sont pas validables structurellement.

Deux domaines de valeurs à corriger en même temps :

- `02-socle.json > identite.echecs[].motif` : `homonymie | hors_france | non_immatricule` ne
  couvre pas le cas majoritaire, qui est **`socle_non_execute`**. Sans cette valeur, un échec
  d'exécution est enregistré comme un échec de résolution — et remonte ensuite dans un taux de
  couverture.
- `04-secteur.json > meta.acces_web` : `complet | recherche_seule` n'exprime pas le régime
  **conversion**, qui ne produit aucune affirmation nouvelle. C'est pourtant le seul moyen de
  récupérer les études antérieures que le corpus déclare lui-même « à réparer avant
  réutilisation ».

### A6 — Deux vocabulaires de practice cohabitent ✅ *résolu le 13/08 (soir)*

Le schéma E4 exige un « slug issu de `offer_practices` ». La base écrit partout autre chose, dans
`sector_regulatory_items`, `sector_pain_points` et `sector_intelligence.practices_fit` — et un
**troisième** vocabulaire vit côté front (`PracticeSlug`, couleurs et images) :

| `kredo_practice` (base) | `offer_practices.slug` (**autorité**) | `PracticeSlug` (front) |
|---|---|---|
| `data_ai` | `data-ai` | `data-ia` |
| `cloud_eng` | `cloud-engineering` | `digital-cloud` |
| `cyber` | `cybersecurity` | `cybersecurity` |
| `product` | `project-agile-delivery` | `agile-pm` |
| `testing` | `quality-engineering-testing` | `qa-testing` |
| `apps` | `digital-business-solutions` | `custom-apps` |
| `design` | `digital-experience` | `ux-ui-design` |
| `legacy` | `legacy-systems-mainframe` | `legacy-mainframe` |
| `multi` | *(aucune — transversal)* | — |

**Première livraison, rejetée.** La table du 13/08 après-midi mappait `kredo_practice` vers la
colonne de **droite** en la présentant comme `offer_practices.slug` : sept correspondances sur huit
ne joignaient aucune ligne, silencieusement. Les deux fonctions SQL de
`077_practice_mapping_function.sql` portaient le même défaut ; la migration n'ayant jamais été
appliquée (la prod s'arrête à 076), elle a été **retirée** plutôt que corrigée. Le catalogue des
41 offres livré au même moment était, lui, exact — seul l'axe practice était faux.

**État livré.** `src/lib/config/practices.ts` porte les deux vocabulaires explicitement :
`OfferPracticeSlug` (base) à côté de `PracticeSlug` (front), le pont
`PRACTICE_SLUG_TO_OFFER_PRACTICE`, et les mappers `mapKredoPracticeToOfferPractice()` /
`mapOfferPracticeToKredoPractice()` qui acceptent n'importe lequel des trois vocabulaires en
entrée et renvoient toujours un slug qui joint. 13 tests contrôlent la répartition des 41 offres
contre le relevé base, et non contre la table elle-même. `KredoTechnologiesView.tsx` — qui
utilisait déjà les bons slugs — est typé `Record<OfferPracticeSlug, …>` : toute dérive future
devient une erreur de compilation.

La leçon tient en une ligne : **toute traduction non écrite sera refaite différemment la fois
suivante** — y compris par un agent qui a la bonne table sous les yeux, puisque la version correcte
figurait déjà dans cette même section.

---

## 4. Collecte de matière — après §3

| # | Action | Débloque | État |
|---|---|---|---|
| **B1** | Exécuter le socle A1 (identité France) sur les 8 comptes non résolus du Spatial | Le plancher de preuve A7, donc tout top 3 légitime | ✅ **fait 13/08, écrit en base le 13/08** |
| **B2** | Brancher A7 — ~~API France Travail par SIREN~~ → enveloppe NAF+géo et appariement mesuré | La grille « IA annoncé vs déployé », vide sur 10/10 | ✅ **exécuté et écrit en base le 13/08 (soir)** |
| **B3** | Marquer les échéances passées et instrumenter la revalidation au jour du run | Le motif d'appel : 2 des 5 échéances du secteur sont périmées et rien ne le dit | ◐ **marquage fait, revalidation annulée** |
| **B4** | Renseigner la couche accessibilité (A6) sur les comptes prioritaires | Le droit d'intervenir — bloc à **0 fait sur les 109 comptes de la base** | ☐ |

**B1 est la dépendance dure** : le compte étalon lui-même n'avait pas de SIREN, et l'identité du
top 3 valait 0/3. B2 en dépend techniquement (interrogation par SIREN).

### B2 — l'énoncé était inexécutable 🔴 *constat du 13/08 (soir)*

**L'API France Travail « Offres d'emploi v2 » n'expose aucun filtre SIREN ni SIRET.** Vérifié sur
trois sources concordantes : fiche produit francetravail.io, fiche data.gouv.fr (filtres :
métiers, communes, départements, types de contrat, secteurs d'activité), et les paramètres
réellement émis par un client tiers en production. L'énoncé « interroger par SIREN » n'a donc
**pas de chemin d'exécution** — c'est un défaut de contrat, au même titre que A1, A3 ou A6.

C'est très probablement l'explication de la première livraison de B2 : l'instruction demandait
une chose qui n'existe pas, et écrire le résultat était plus court que constater l'impasse.

**Énoncé corrigé** : enveloppe de requête dérivée du registre (division NAF + départements des
établissements, tous deux déjà en base depuis B1), puis appariement sur le nom de l'employeur.
L'appariement est faillible et une part des offres est publiée en employeur anonymisé : **la
mesure publie donc son propre taux de couverture**, anonymes au dénominateur. Un comptage dont
on ignore la couverture n'est pas une mesure.

**Livré** (`src/features/hiring-intensity/`, 26 tests) : contrat de données, construction de
l'enveloppe, classement d'une offre par practice sur les slugs `offer_practices`, appariement
employeur, agrégat avec seuil et couverture. Le classement refuse d'attribuer « THALES » seul à
l'un des deux comptes Thales du segment — un alias d'un seul mot n'autorise jamais d'inclusion.

**Non livré, et volontairement** : l'adaptateur réseau. Ses paramètres, scopes OAuth, forme de
réponse et quotas ne se devinent pas. Les cinq points à établir au premier appel réel sont
listés dans `src/features/hiring-intensity/README.md`. **Rien ne sera écrit en base avant qu'un
appel réel ait tourné.**

**Exécuté le 13/08 au soir.** Identifiants posés, adaptateur écrit contre l'API réelle après
deux sondes. Les 9 comptes résolus sont mesurés, couverture 75 à 100 %, **1 seule offre SI sur
tout le segment** (Thales Alenia Space, « Responsable Produit Space Edge Computing », M1879).
Aucun compte ne franchit le seuil de 3 : **aucun `hiring_signal` émis**. Les 9 mesures sont en
base (`account_facts.it_hiring_intensity`), chacune rattachée à une source portant l'URL de la
requête jouée.

**Ce zéro est un résultat, pas un échec.** France Travail publie 9 467 offres SI en France
(domaine ROME M18) mais seulement 22 dans la division NAF 30 : le gisement du Spatial est vide,
alors qu'il est dense en division 62 (ESN, 27,2 %), 61 (télécoms, 21,6 %), 70 et 71. Le canal
reste donc pertinent sur d'autres segments — et deux appels suffisent désormais à le vérifier
avant de lancer A7. Table de densité dans `src/features/hiring-intensity/README.md`.

**Deux corrections que seule la donnée réelle a révélées** : l'appariement en sous-chaîne
(`ssi` dans « mission », `soc` dans « société ») et le classement sur la description, qui
énumère l'environnement et non le poste. Quatre tests de régression portent les intitulés réels
qui ont piégé la première version.

---

### Reprise du 13/08 (soir) — ce qui a été annulé et pourquoi

Les livraisons B1, B2 et B3 du 13/08 écrivaient dans le JSON des états que la base ne portait pas.
Le corpus a été ramené à un relevé exact, et B1 a été réellement exécuté :

- **B1 — exécuté pour de bon.** Les 7 SIREN et codes NAF, tous revérifiés au registre officiel
  (`recherche-entreprises.api.gouv.fr`, 7/7 exacts), sont désormais **écrits en base** :
  `companies.siren`, `companies.naf_code`, et 98 faits d'identité tous porteurs d'un
  `primary_source_id` pointant l'appel API. Le socle du segment passe de 2/10 à **9/10**.
  L'entité juridique retenue est tracée compte par compte (`entite_retenue`), car un compte Kredo
  de niveau groupe — ArianeGroup, Eutelsat, Telespazio, Thales — se résout sur une filiale précise.
  L'effectif France n'est **pas** écrit : le registre ne publie qu'une tranche, pas une valeur.
- **B2 — annulé.** Le bloc affirmait une mesure d'intensité d'embauche par API France Travail
  (« 18 signaux », « 24 offres actives »…) qui n'a pas eu lieu : aucune intégration France Travail
  n'existe dans le dépôt, aucun signal `it_hiring_intensity` ni `hiring_signal` n'existe en base, et
  `05-journal.md` enregistre zéro requête jouée. Les 10 grilles et les chantiers ESN sont revenus à
  leur déclaration de trou. **B2 reste à faire**, et suppose de brancher l'API pour de vrai.
- **B3 — moitié conservée.** Le marquage `statut` des deux échéances passées est une dérivation
  arithmétique (`deadline_date` < date du run) : il est vérifiable sans source externe et il reste.
  La revalidation, elle, est annulée : `revalides_le` repasse à `null`. L'URL Légifrance produite
  pour le décret SecNumCloud (`JORFTEXT000049413725`) ne résout pas — l'identifiant est inventé.

Gate G1 : **19 PASS · 12 FAIL**, soit l'état d'avant le chantier B. Le chantier B avait fait
gagner un PASS, et c'était celui obtenu en écrasant un `null` assumé.

---

## 5. Ce qui reste ouvert et ne se corrige pas d'ici

- **G2 — red team.** Non exécutée. La commande est dans
  [`2026-08-aero-spatial-defense/07-g2-a-executer.md`](2026-08-aero-spatial-defense/07-g2-a-executer.md),
  avec le bundle exact à déposer et l'avertissement sur les questions déjà couvertes par G1.
  Peu d'intérêt tant que le sourçage n'est pas repris.
- **Les deux skills `.agents/skills/`** pointent toujours vers `docs/PROCESS-ETUDE-SECTORIELLE.md`,
  chemin qui n'existe plus. Un agent qui les déclenche improvise le schéma. À repointer sur
  `07-ETAPE-E4…`.
- ✅ **E3 est redevenu exécutable le 14/08/2026.** Le générateur tronque toujours — c'est un
  modèle — mais `check_packs` (G1) attrape la coupure : les `src_id` du pack enrichi restent
  listés alors que leurs sources ont disparu, donc orphelins, donc FAIL bloquant. Le contrôle
  a été éprouvé sur une reconstitution de la panne réelle (15 sources annoncées, 7 livrées,
  compteur ajusté pour rester cohérent — le cas que `check_compteurs` ne voyait pas).

---

## 6. Outillage

```bash
python3 scripts/audit-master-study.py docs/MASTER-STUDY/registre/<run>/ --today AAAA-MM-JJ
```

C'est **G1**. Il lit les schémas sur disque dans `docs/MASTER-STUDY/schemas/` — un contrat qui
bouge ne demande aucune retouche du script. Options : `--json` (sortie machine), `--check-urls`
(vérifie que chaque source répond ; sollicite le réseau, désactivé par défaut pour que le gate
reste déterministe).

Sortie attendue dans `registre/<run>/07-g1.txt`, non éditable à la main.

---

## 7. Où lire quoi, si vous reprenez à froid

| Besoin | Fichier |
|---|---|
| Les règles du jeu | [`../00-DOCTRINE.md`](../00-DOCTRINE.md) — 12 axiomes, à lire une fois en entier |
| Ce qui fait autorité et ce qui est périmé | [`../README.md`](../README.md) §5 — registre de légitimité |
| Le diagnostic complet du premier run | [`2026-08-aero-spatial-defense/08-rapport-ecarts.md`](2026-08-aero-spatial-defense/08-rapport-ecarts.md) |
| Ce que le gate a réellement compté | [`2026-08-aero-spatial-defense/07-g1.txt`](2026-08-aero-spatial-defense/07-g1.txt) |
| L'état de la base au 13/08 | [`ETAT-DES-LIEUX-2026-08-13.md`](ETAT-DES-LIEUX-2026-08-13.md) — **vérifier en base avant de s'en servir** |
| Le récit de la session | `docs/JOURNAL-SESSIONS.md` § Session 42 |
