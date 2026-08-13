# 08 — Rapport d'écarts · premier run du corpus MASTER STUDY

**Run** `2026-08-aero-spatial-defense` · **13/08/2026** · **G1 : FAIL** (16 PASS · 13 FAIL · 3 non exécutés)

> **Ce diagnostic est daté et n'est pas réécrit.** Il énonce ce que le run a trouvé contre le
> corpus **v1.0**. Trois défauts ont été corrigés le jour même — **C1** (G0 inpassable), **C2**
> (G0 vs E0, tranché par Guillaume : un client compte et figure dans la carte) et **C4** (A9 vs
> `cadrage.schema.json`). Contre le corpus **v1.1**, G1 rend désormais **17 PASS · 12 FAIL**.
> L'état vivant des corrections est dans
> [`../ROADMAP-CORRECTIONS.md`](../ROADMAP-CORRECTIONS.md) ; `07-g1.txt` porte la dernière
> exécution.

Ce rapport répond à la seule question que le chantier posait : **quels champs des schémas sont
impossibles à remplir depuis la matière réelle, et lesquels manquaient au contrat.**

La distinction structure tout ce qui suit. Un champ vide parce que la matière manque appelle une
collecte. Un champ vide parce que le contrat est faux appelle une correction du corpus — et
aucune quantité de production ne le remplira jamais.

---

## 1. Ce qui casse dans le CONTRAT — à corriger dans le corpus

Neuf défauts. Aucun ne se répare en produisant mieux.

### C1 · G0 est inpassable par construction 🔴

`10-ETAPE-E7` §2 conditionne le droit de lancer à « les 7 axes sont renseignés — 100 % ».
`REFERENTIEL-CLASSIFICATION.md`, que `04-ETAPE-E1` §1 déclare **normatif délégué**, impose
l'inverse : §5.5 et §6.8 interdisent de renseigner `moment` sans fait daté et sourçable, §5.7
réserve `vertical_client` aux fournisseurs d'une filière, et §10 contrôle 6 en fait une règle
de rejet. En base, `moment` vaut 1 compte sur 96.

**Aucun run ne peut donc passer G0**, sur aucun segment. La condition doit devenir : *les trois
axes obligatoires (`regime_achat`, `modele_eco`, `tier`) renseignés, les quatre axes
conditionnels renseignés ou explicitement justifiés NULL.*

### C2 · G0 et E0 ne comptent pas les mêmes comptes 🔴

G0 exige « ≥ 3 comptes rattachés au segment ». `03-ETAPE-E0` §3 exclut du périmètre les comptes
dont `relation_type = client`. Le segment porte 3 comptes non-`mapped`, dont un client :
la première règle compte **3**, la seconde en laisse **2**. Le corpus ne dit pas laquelle arbitre,
et l'écart tombe exactement sur le seuil.

Aggravant : le client exclu (Exail Robotics) est **déjà ingéré** en `competitive_map_entries`
comme cible `mid_market`, et l'étude d'origine l'a placé en n°2 de son top 3.

### C3 · Le contrat de sortie E5 décrit des clés que le parseur normatif ne lit pas 🔴

C'est le défaut le plus coûteux, parce qu'il est **silencieux**.

`competitive-map.schema.json` définit `profil_compte` avec `metier_chaine_valeur`, `maillon`,
`contrats_majeurs`, `grilles` (dont `ia_annonce_vs_deploye`, déclaré obligatoire), `couche_esn`
et `traduction_commerciale`. Le parseur normatif
`src/features/competitive-map/domain/competitive-map-output.ts` ne projette dans `profile_json`
que onze clés, et **aucune de celles-là** :

```
PROFILE_TEXT_KEYS   proposition_valeur · modele_economique · a_ne_pas_dire
PROFILE_LIST_KEYS   dependances_cles · differenciateurs · priorites_strategiques ·
                    chantiers_technologiques · trigger_events · trous · sources
PROFILE_OBJECT_KEYS chaine_valeur
```

La preuve est en base : les dix `competitive_map_entries` du segment portent un `profile_json`
de **40 à 73 octets**, une seule clé `trous` — sauf le compte étalon, 408 octets. Tout le
narratif de l'étude A a été perdu à l'import **sans qu'aucune erreur ne soit levée**.

La règle de préséance du corpus (`schemas/README.md`) tranche : le code gagne. Donc c'est le
schéma **et** le squelette de `08-ETAPE-E5` §8 qui sont faux, et la correction porte des deux
côtés — soit on aligne le schéma sur les onze clés lues, soit on étend le parseur. Le second
choix est le bon : les six clés du schéma sont celles qui portent la valeur commerciale.

Trois écarts de moindre portée, même famille :

| Schéma | Parseur | Effet |
|---|---|---|
| `acteurs_ecartes` | lit `ecartes` | La liste des acteurs écartés est ignorée à l'import |
| `accessibilite` au niveau du compte | lit `appetence.accessibilite` | Deux emplacements pour l'axe Y de la carte |
| `reserve_a_qualifier`, `transverse`, `compteurs` | non lus | Le top 3, le message sectoriel et l'invariant A9 n'atteignent jamais la base |

### C4 · A9 est contredit par `cadrage.schema.json` 🟠

L'axiome A9 impose un bloc `compteurs` sur **tout** livrable. `cadrage.schema.json` porte
`additionalProperties: false` et ne définit pas `compteurs`. Ajouter le bloc rend le fichier
invalide ; ne pas l'ajouter le fait échouer à G1. **Les deux contrôles ne peuvent pas passer
simultanément** — c'est le premier FAIL du rapport, et il est structurel.

### C5 · E1 et E2 n'ont pas de schéma 🟠

`schemas/` contient cinq fichiers : cadrage, source-registry, sector-knowledge, competitive-map,
value-chain. `01-taxonomie.json` et `02-socle.json` n'en ont aucun, alors que G1 les contrôle et
que le second porte `echeance_pivot`, dont G1 fait un contrôle bloquant. Deux livrables sur sept
ne sont donc pas validables structurellement.

### C6 · Le régime « conversion » n'existe pas 🟠

`meta.acces_web` admet `complet | recherche_seule`. `07-ETAPE-E4` §4.4 traite le troisième état
— AUCUN — par l'**arrêt**. Mais un run de conversion ne produit aucune affirmation nouvelle : il
réexprime une étude existante. Le corpus n'a pas de régime pour ça, alors que la conversion est
la seule façon de récupérer les études antérieures qu'il déclare lui-même « à réparer avant
réutilisation ». La valeur honnête, `aucun`, est hors domaine et fait échouer la validation.

### C7 · Le domaine de `motif` d'échec d'identité ne couvre pas le cas majoritaire 🟠

`05-ETAPE-E2` §8 prévoit `homonymie | hors_france | non_immatricule`. Le cas réel sur 8 comptes
sur 10 est que **le socle n'a jamais tourné**. Sans une valeur `socle_non_execute`, huit échecs
d'exécution seraient enregistrés comme des échecs de résolution — un mensonge de mesure, et
exactement le genre de chiffre qui remonte ensuite dans un taux de couverture.

### C8 · Deux vocabulaires de practice cohabitent 🟠

Le schéma E4 exige que `practice_kredo` soit « un slug issu de `offer_practices` ». La base écrit
partout autre chose :

| Écrit en base | `offer_practices.slug` réel |
|---|---|
| `cloud_eng` | `cloud-engineering` |
| `cyber` | `cybersecurity` |
| `data_ai` | `data-ai` |
| `multi` | *(n'existe pas)* |
| `product` (dans `practices_fit`) | *(n'existe pas)* |

`sector_regulatory_items`, `sector_pain_points` et `sector_intelligence.practices_fit` sont tous
concernés. Aucune table de correspondance n'existe. Toute conversion doit donc traduire, et
toute traduction non écrite quelque part sera refaite différemment la fois suivante.

### C9 · `rayon` accepte une valeur que le domaine exclut, sans conséquence 🟢

L'étude A livre `rayon: "europeen"`, hors du domaine `regional | national | international`. Le
parseur **ne lit pas ce champ** : l'écart serait passé inaperçu à l'import. Symptôme mineur du
même défaut que C3 — un schéma qui décrit plus que ce que le code consomme.

---

## 2. Ce qui casse dans la MATIÈRE — à collecter

Six manques. Ils appellent une exécution, pas une correction de règle.

### M1 · Aucune source résolvable dans les deux études 🔴

| | Étude A (cartographie) | Étude B (sectorielle) |
|---|---:|---:|
| URL `http(s)` dans le document | **0** | **0** |
| Jetons de citation non résolvables | — | **100** |
| Journal de recherche | absent, remplacé par 21 gabarits `[ACTEUR]` | absent |

`sector-knowledge.schema.json` exige `sources` avec `minItems: 25` et `url` en `format: uri`, et
chaque `src_ids` avec `minItems: 1`. Le maximum atteignable sans recherche est **6 URL**, toutes
relevées en base, **aucune issue des deux études**. Résultat : **63 blocs portent un `src_ids`
vide** sur 04-secteur.json.

C'est la mesure exacte de ce que coûte le défaut A2 : une étude riche de 59 Ko, dont on ne peut
défendre publiquement aucune affirmation.

### M2 · Le compte étalon n'a pas d'identité 🔴

Thalès Alénia Space : `siren` NULL, `naf_code` NULL, 0 fait `legal_id`. `08-ETAPE-E5` §6
contrôle 2 interdit un champ identité NULL sur le top 3. **Identité du top 3 : 0/3.**
Sur les 10 comptes du segment, 2 sont résolus — et ce sont les deux seuls que le socle a traités.

Conséquence en cascade : le plancher de preuve A7 rejette **9 comptes sur 10**.

### M3 · La couche ESN est vide, comme lors des deux échecs précédents 🔴

`taux_couche_esn = 0,00 (0/3)`. Sur les six rubriques du bloc B4, le compte étalon en porte deux,
dont le modèle d'achat en simple hypothèse ; les neuf autres comptes n'en portent aucune. En base :
**0 fait `access_channel`, `supplier_panel`, `clearance_required`, `incumbent_esn`,
`it_decision_owner`, `outsourcing_policy`** — sur les 10 comptes du segment comme sur les 109 de
la base.

Sur un segment de défense où l'habilitation conditionne le droit d'intervenir, c'est le manque
qui invalide tout le reste. `08-ETAPE-E5` ouvre en disant que ce bloc « a échoué deux fois de
suite » et que le document existe « pour que ça n'arrive pas une troisième fois ». **C'est arrivé
une troisième fois** — et cette fois c'est mesuré, pas constaté.

### M4 · La grille « IA annoncé vs déployé » est vide sur 10 comptes sur 10 🔴

Le schéma la rend obligatoire ; `08-ETAPE-E5` §4.2 la désigne comme « la plus différenciante ».
L'étude A la traite en section transverse et conclut qu'elle ne peut pas mesurer l'écart. Elle
n'est renseignable que par la requête 4 de E5 §3 — offres d'emploi — qui n'a jamais été jouée, et
par A7 du socle, qui n'est pas branché.

### M5 · Le top 3 déclaré n'est pas le top 3 trié, et rien ne le justifie 🟠

| Déclaré | /35 | | Trié | /35 |
|---|---:|---|---|---:|
| ACRI-ST | 29 | | Eutelsat / OneWeb | **31** |
| Exail Robotics | 25 | | OHB | 29 |
| Thales Alenia Space | 27 | | D-Orbit | 29 |

L'arithmétique de l'étude A est **juste sur 10 comptes sur 10** — le score canonique
`c + i + 2m + 2a + f` tombe exactement partout. Ce n'est donc pas un défaut de calcul mais un
défaut d'autorité : la synthèse ne suit pas son propre tableau, et `justification_ecart_top3`
est absente. La conversion ne peut pas fabriquer une justification que l'étude n'a jamais donnée.

Le cas ACRI-ST est le défaut nommé par A7 : `accessibilite = 5/5`, la note la plus haute de la
carte, sur le compte dont l'étude déclare par ailleurs n'avoir pas audité le modèle d'achat.
La valeur est en base (`accessibilite_score = 5`).

### M6 · L'échéance pivot est faible, et deux échéances passées ne sont pas marquées 🟠

Le segment porte **0** item réglementaire ; son macro en porte 5, dont 2 futurs. L'échéance pivot
retenue — AI Act, 02/12/2027 — est à 16 mois : elle fonde un chantier, pas un appel de la semaine.
Les deux qui auraient fait un motif d'appel sont **passées** et rien en base ne les marque :

- EDIP, 30/12/2025 ;
- décret SecNumCloud n° 2026-272, **14/04/2026** — seule échéance `critical` du secteur.

Et E2 §1 impose de revalider chaque échéance le jour du run : le chantier interdisant l'accès web,
`revalides_le` reste `null`. **Aucune de ces dates ne devrait être prononcée devant un DSI en
l'état.**

---

## 3. Deux découvertes hors périmètre, à ne pas perdre

### D1 · Le taux « 95 % des faits sont sourcés » est en partie auto-référentiel

`registre/ETAT-DES-LIEUX-2026-08-13.md` §3 lit : « 817 avec `primary_source_id` (95 %) — le
contrat *un fait sans source ne s'écrit pas* est presque tenu ».

Sur ce segment, 8 comptes sur 10 sont « sourcés » par une ligne `intelligence_sources` nommée
« Cartographie concurrentielle — import du 2026-08-12 », dont **`source_url` est NULL**. C'est
l'étude qui se cite elle-même. Ces lignes sont les **10 seules** de la table (sur 450) à n'avoir
pas d'URL — le défaut est contenu, mais il tombe précisément sur les comptes de ce run, et il
gonfle un taux qui sert d'indicateur de santé.

### D2 · Le chiffre du chantier n'a pas bougé

`ETAT-DES-LIEUX` §6 pose la métrique qui compte : **segments porteurs de connaissance = 1/38**.
Ce run s'arrête à G1 et n'ingère rien. Elle vaut toujours **1/38**.

C'est le résultat honnête, et il dit quelque chose de précis : la chaîne n'est pas bloquée par
la production de connaissance — 04-secteur.json contient une matière sectorielle dense, avec ses
quatre conversions et ses « DONC » — elle est bloquée par **la preuve**. Six URL contre une
exigence de vingt-cinq.

---

## 4. Ce que je corrigerais, dans cet ordre

| # | Action | Nature | Débloque |
|---|---|---|---|
| 1 | Reformuler la condition G0 sur les 7 axes | corpus, 3 lignes | Tout run, sur tout segment |
| 2 | Étendre `PROFILE_*_KEYS` du parseur aux 6 clés du schéma, ou aligner le schéma | code + schéma, même commit | La couche ESN atteint enfin la base |
| 3 | Ajouter `compteurs` à `cadrage.schema.json` | corpus, 4 lignes | La contradiction A9 / E0 |
| 4 | Trancher G0 vs E0 sur les comptes clients | corpus, 1 décision | Le compte du seuil |
| 5 | Écrire `taxonomie.schema.json` et `socle.schema.json` | corpus | E1 et E2 deviennent validables |
| 6 | Table de correspondance `kredo_practice` ↔ `offer_practices.slug` | corpus + migration | C8, sur toutes les tables sectorielles |
| 7 | Exécuter le socle A1 sur les 8 comptes non résolus du segment | collecte | M2, donc A7, donc le top 3 |
| 8 | Brancher A7 (France Travail par SIREN) | collecte | M4, la grille la plus différenciante |
| 9 | Marquer les échéances passées et instrumenter la revalidation | collecte | M6 |

Les six premières lignes ne demandent aucune recherche et lèvent la moitié des `FAIL` de G1.

---

## 5. Ce qui a fonctionné

À ne pas perdre dans la liste des défauts.

- **L'arithmétique de l'appétence est juste sur 10 comptes sur 10.** La formule canonique /35 est
  correctement appliquée par l'étude d'origine et correctement recalculée par le parseur.
- **Les quatre conversions de la doctrine sont produisibles depuis la matière existante.** Modèles
  économiques → calendrier d'achat, chaîne de valeur → maillon d'accroche, dépendances → catalogue
  d'offres, trajectoires → familles de budget : les quatre colonnes de `04-secteur.json` sont
  remplies sans une seule recherche, par retournement de ce que l'étude B contenait déjà. C'est la
  démonstration que ces conversions sont un travail d'analyse, pas de collecte.
- **Le « DONC, commercialement » tient sur 100 % des blocs.** C'est le seul taux à 1,0 du run.
- **La résolution segment ↔ macro fonctionne** : le corpus hérité est lisible et a servi d'entrée,
  ce qui a permis de constater que l'étude A déclarait vide une rubrique — les échéances communes —
  que la base remplissait depuis des semaines.
