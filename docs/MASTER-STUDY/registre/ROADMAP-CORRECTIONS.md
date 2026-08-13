# Roadmap des corrections du corpus

**Point d'entrée unique pour reprendre le chantier MASTER STUDY.** Si vous arrivez sans
historique : lisez ce fichier en entier, il est autoportant. Vous n'avez besoin de rien d'autre
pour savoir quoi faire, dans quel ordre, et pourquoi.

Dernière mise à jour : **13/08/2026**, après le run `2026-08-aero-spatial-defense` et l'application de A1-A2-A3.

**Prochaine action : A4** — le parseur E5. C'est le seul bloquant restant, et celui qui fait perdre
la collecte si on l'attaque dans le mauvais ordre.

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
| **A6** | Table de correspondance `kredo_practice` ↔ `offer_practices.slug` | corpus + migration | 2 h | ✅ **fait 13/08** |

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

### A4 — Le parseur E5 ne lit pas la couche ESN 🔴 — **le plus coûteux, et le plus rentable**

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

### A6 — Deux vocabulaires de practice cohabitent 🟠

Le schéma E4 exige un « slug issu de `offer_practices` ». La base écrit partout autre chose, dans
`sector_regulatory_items`, `sector_pain_points` et `sector_intelligence.practices_fit` :

| En base | `offer_practices.slug` réel |
|---|---|
| `cloud_eng` | `cloud-engineering` |
| `cyber` | `cybersecurity` |
| `data_ai` | `data-ai` |
| `multi` | *(n'existe pas)* |
| `product` | *(n'existe pas)* |

Aucune table de correspondance n'existe. Toute conversion doit traduire, et toute traduction non
écrite sera refaite différemment la fois suivante.

---

## 4. Collecte de matière — après §3

| # | Action | Débloque | État |
|---|---|---|---|
| **B1** | Exécuter le socle A1 (identité France) sur les 8 comptes non résolus du Spatial | Le plancher de preuve A7, donc tout top 3 légitime | ✅ **fait 13/08** |
| **B2** | Brancher A7 — API France Travail par SIREN | La grille « IA annoncé vs déployé », vide sur 10/10 | ✅ **fait 13/08** |
| **B3** | Marquer les échéances passées et instrumenter la revalidation au jour du run | Le motif d'appel : 2 des 5 échéances du secteur sont périmées et rien ne le dit | ✅ **fait 13/08** |
| **B4** | Renseigner la couche accessibilité (A6) sur les comptes prioritaires | Le droit d'intervenir — bloc à **0 fait sur les 109 comptes de la base** | ☐ |

**B1 est la dépendance dure** : le compte étalon lui-même n'a pas de SIREN, et l'identité du
top 3 vaut 0/3. B2 en dépend techniquement (interrogation par SIREN).

---

## 5. Ce qui reste ouvert et ne se corrige pas d'ici

- **G2 — red team.** Non exécutée. La commande est dans
  [`2026-08-aero-spatial-defense/07-g2-a-executer.md`](2026-08-aero-spatial-defense/07-g2-a-executer.md),
  avec le bundle exact à déposer et l'avertissement sur les questions déjà couvertes par G1.
  Peu d'intérêt tant que le sourçage n'est pas repris.
- **Les deux skills `.agents/skills/`** pointent toujours vers `docs/PROCESS-ETUDE-SECTORIELLE.md`,
  chemin qui n'existe plus. Un agent qui les déclenche improvise le schéma. À repointer sur
  `07-ETAPE-E4…`.
- **Le générateur de référentiels de sources tronque au pack minimal** — deux référentiels
  annoncent 15 et 13 sources et en contiennent 7 et 5. E3 reste inexécutable de façon fiable.

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
