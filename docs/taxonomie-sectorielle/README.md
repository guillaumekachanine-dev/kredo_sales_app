> ### ⚠ Ce document n'est pas la référence
> Le document faisant foi est **[`REFERENTIEL-CLASSIFICATION.md`](REFERENTIEL-CLASSIFICATION.md)** — objectif, méthode, spécification de chaque paramètre, procédure de classification, jurisprudence, gouvernance et interdits. C'est lui qu'il faut lire pour classer un compte, et lui seul qu'une IA doit recevoir.
>
> Le présent document conserve le **raisonnement** qui a conduit au référentiel : la critique de la taxonomie V0.1 et les arbitrages. Il documente le *pourquoi*, pas le *comment*.

---

# Taxonomie sectorielle Kredo — critique de la V0.1 et classification des 96 comptes

Snapshot Supabase du 09/08/2026 · projet `Kredo_Sales_App` · **aucune donnée modifiée**
96 comptes · 14 secteurs dans `sector_intelligence` · 93 comptes rattachés, 3 orphelins

---

## 0. Vérification factuelle du rapport ChatGPT

Avant de critiquer, ce qui a été vérifié en base :

| Affirmation du rapport | Vérifié | Résultat |
|---|---|---|
| 96 comptes, 14 secteurs | ✅ | Exact |
| Les 96 comptes sont couverts par la V0.1 | ✅ | **Exact — 96/96, aucun compte inventé, aucun oublié.** C'est le point le plus important : la proposition est bâtie sur le portefeuille réel |
| `companies.sector` libre coexiste avec `sector_id` structuré | ✅ | Exact — et 3 comptes ont `sector_id` NULL (Iselection, Keller Williams France, Univet), ce que le rapport corrige implicitement sans le signaler |
| Les 8 secteurs jugés hétérogènes le sont | ✅ | Confirmé compte par compte |
| « La NAF peut servir de contrôle et de point de départ » | ❌ | **`naf_code` est renseigné sur 3 comptes sur 96. `siren` aussi.** Le contrôle proposé n'est pas exécutable aujourd'hui |

**Trois chiffres que le rapport ne mentionne pas et qui changent les priorités :**

- **6 clients et 1 ancien client sur 96** (89 prospects). Une taxonomie de prospection ne se conçoit pas comme une taxonomie de portefeuille : la question n'est pas « comment ranger ce que j'ai » mais « quels groupes me permettent de dupliquer une conquête ».
- **`employee_count` renseigné sur 67 comptes, `revenue` sur 66.** Un tiers du portefeuille n'a pas de donnée de taille — or la taille discrimine autant que le secteur.
- **Les 14 secteurs ont déjà 12 études rattachées en moyenne** (`meta_has_study`). Casser un macro-secteur, c'est orpheliner du corpus. Cela plaide pour la structure à deux niveaux que le rapport propose — et contre l'ampleur du découpage qu'il propose réellement.

---

## 1. Ce que je valide sans réserve

1. **Le diagnostic des 8 secteurs hétérogènes est juste**, et les exemples choisis sont les bons. « Adecco, Nice-Matin, Malongo, EPS et Ubaldi n'ont pratiquement ni concurrents, ni acheteurs, ni réglementation communs » : c'est exact et c'est le vrai problème.
2. **La structure à deux niveaux macro → segment est la bonne réponse.** Une liste plate de 35 secteurs détruirait les 14 fiches existantes sans rien apporter.
3. **La règle des 70 %** — *deux entreprises sont dans le même segment si 70 % d'un briefing préparé pour l'une reste pertinent pour l'autre* — est une excellente heuristique, opérationnelle et mémorisable.
4. **Les 4 tests de décision** (concurrence / acheteurs / réglementation / offres Kredo) sont exactement les bons critères, dans le bon ordre.
5. **La distinction éditeur vs marché vertical** est l'apport structurel majeur du rapport. Harvest et CODIX sont des éditeurs dont le *client* est la finance : les ranger avec une banque est une faute, les ranger avec une ESN aussi. Cette idée seule justifie le chantier.
6. **Refuser un secteur « groupes diversifiés »** et appliquer la règle de l'activité dominante : correct.
7. **Refuser de créer une fiche pour chaque micro-spécialité** : correct — et c'est précisément la règle que le rapport énonce puis n'applique pas (voir §2.1).

---

## 2. Ce que je critique

### 2.1 La contradiction centrale : il annonce 25 segments, il en propose 49

Le §7 recommande « environ 25 segments business réellement utiles ». La table du §3 en contient **49**, pour 96 comptes — soit **2 comptes par segment en moyenne**, et une quinzaine de segments à un seul compte.

C'est exactement l'écueil que le rapport identifie lui-même : *« Je déconseille de remplacer les 14 catégories actuelles par une liste plate de 30 ou 40 secteurs. On recréerait immédiatement le problème inverse. »* La table livrée fait 49.

Créer « Services périnataux & bien-être » pour **Maman Bulle, 4 salariés**, ou « Institution scientifique / société savante » pour un seul compte, ce n'est pas de la précision : c'est du bruit qui coûtera un item de menu, une ligne de nomenclature et une fiche vide à maintenir.

### 2.2 « Services spécialisés » est le fourre-tout d'origine, renommé

Le macro « Services spécialisés » regroupe télésurveillance + médias + épilation en réseau + accompagnement périnatal. Aucun de ces quatre comptes ne partage quoi que ce soit avec les trois autres. C'est le défaut diagnostiqué au §1 du rapport, reproduit à plus petite échelle.

**Un résidu doit être nommé résidu.** Une catégorie « Non rattaché — à qualifier » reste visible, gêne, et se vide. Un macro-secteur au nom présentable ne se vide jamais.

### 2.3 Éclater la sphère publique en trois macro-secteurs est une erreur pour une ESN

Le rapport crée trois macro-secteurs : Secteur public, Enseignement supérieur, Recherche publique. Or ce qui structure la vente à ces 10 comptes, c'est **le canal d'achat** : code de la commande publique, seuils de publicité, accords-cadres, CCAG-TIC, centrales d'achat. C'est une seule motion commerciale, avec des personas différents.

Une université, un laboratoire CNRS et un rectorat achètent selon les mêmes règles ; ils ne diffèrent pas plus entre eux qu'un CHU ne diffère d'une préfecture. À l'inverse, le rapport **manque la distinction qui compte vraiment dans ce bloc** : SKEMA (association, droit privé) et EURECOM (GIE) **ne sont pas soumis au même régime d'achat** que l'Université Côte d'Azur ou le CNRS. C'est cette frontière-là qui change le cycle de vente, pas celle entre « enseigner » et « chercher ».

### 2.4 La dimension Monaco est absente

**Ascoma, Giraudi et Nice-Matin sont domiciliés à Monaco.** Monaco n'est pas dans l'Union européenne : le RGPD ne s'y applique pas directement, DORA et NIS2 non plus, le droit applicable est monégasque et l'autorité de contrôle des données n'est pas la CNIL.

Pour une ESN qui vend beaucoup de projets tirés par la conformité, c'est une différence de discours totale — et Ascoma est un **client**. Le rapport propose pourtant lui-même les « traits réglementaires » comme dimension transverse au §5 : il suffisait de l'appliquer.

### 2.5 Trois rattachements que je conteste

| Compte | V0.1 | Ma position |
|---|---|---|
| **Bioceanor** | « Logiciels d'ingénierie & DeepTech », avec **Ansys** | Ansys pèse 2,3 Md$ et vend de la simulation à l'industrie mondiale ; Bioceanor est une startup IoT/IA de qualité de l'eau. Ni les concurrents, ni les acheteurs, ni la taille, ni le cycle de vente ne coïncident. Les 4 tests échouent 4 fois sur 4 |
| **Tournaire** | « Fabrication d'équipements techniques spécialisés », avec **Aqualung** | Tournaire fabrique des emballages haute performance à Grasse, **pour la parfumerie, les arômes et la pharma**. Son segment concurrentiel est l'emballage industriel ; mais son *vertical client* est la filière grassoise, c'est-à-dire le corpus le plus riche de Kredo. Le ranger avec du matériel de plongée, c'est le réflexe NAF que le rapport critique par ailleurs |
| **Ampère Software Factory** | « Software mobilité / automobile », avec **Vulog** | Ampère est l'entité logicielle d'un constructeur — client interne, budget interne, gouvernance de groupe. Vulog est un éditeur SaaS qui vend à des opérateurs de mobilité. Même domaine, économies opposées |

### 2.6 Il manque l'axe qui discrimine le plus après le secteur : la taille

Le portefeuille va de **3 salariés (Renaudi, Pilatus Groupe) à 38 000 (DomusVi)**. Un commercial d'ESN ne vend pas de la même façon à un compte de 3 personnes et à un groupe de 38 000, **quel que soit leur secteur**. Le rapport ne mentionne jamais cette dimension. Elle doit être un axe de la nomenclature, pas une donnée de fiche.

### 2.7 Il manque le statut relationnel — et il cache un cas particulier important

**Experis France est une ESN.** C'est un pair, potentiellement un concurrent, et son statut en base est `ancien_client` : la relation est de sous-traitance ou de co-traitance, pas de prospection DSI. Le classer dans « ESN & services IT » comme s'il s'agissait d'un prospect ordinaire, c'est produire un playbook qui ne sera jamais utilisé.

Ce compte appelle une motion distincte : partenariat, co-traitance, réponse conjointe à appel d'offres. Aucune fiche sectorielle ne le couvrira.

### 2.8 Le rapport identifie le vrai problème de modèle, puis ne le résout pas

Le §5 est excellent : *« Je ne chercherais plus à faire porter quatre notions différentes par une seule colonne `sector_id` »*, avec les quatre dimensions (activité, segment, vertical client, traits réglementaires). Puis la table du §3 est… une hiérarchie à une seule dimension, et le modèle de données est renvoyé à « la prochaine étape ».

**C'est pourtant là qu'est toute la valeur.** Sans les colonnes orthogonales, la taxonomie dérivera de nouveau vers un fourre-tout en dix-huit mois — parce que chaque compte inclassable ira dans la catégorie la plus large disponible. Le modèle est proposé en §5 de ce document.

---

## 3. Les trois axes que j'ajoute

Le secteur seul ne suffit pas à décider d'une approche. Trois axes orthogonaux, chacun modifiant le discours indépendamment du secteur :

| Axe | Valeurs | Ce qu'il change |
|---|---|---|
| **Vertical client** | parfumerie, finance, santé, hospitality, mobilité, immobilier, industrie, environnement… | Permet à un éditeur d'hériter du corpus de son marché sans être classé dedans. Résout Harvest, CODIX, Sequoiasoft, Median, Tournaire, Bioceanor |
| **Régime d'achat et réglementaire** | commande publique · secteur régulé (DORA, santé, cosmétique) · **Monaco / hors-UE** · privé standard | Détermine le cycle de vente, les pièces à produire, les échéances mobilisables |
| **Tier** | Grand compte (≥ 2 000 sal. ou ≥ 1 Md€) · ETI (250-2 000) · PME (< 250) | Détermine l'interlocuteur, la longueur du cycle, le format d'offre |

À quoi s'ajoute, hors taxonomie, le **statut relationnel** (client / ancien client / prospect / pair-partenaire) qui décide de la motion elle-même.

---

## 4. Ma taxonomie — 14 macro-secteurs, 37 segments, 96 comptes

**Principe de dimensionnement retenu, et appliqué** : un segment n'existe que s'il satisfait au moins un de ces trois critères — (a) au moins 2 comptes partageant les 4 tests, (b) une fiche Kredo existante à préserver, (c) un corpus réglementaire assez spécifique pour qu'un briefing générique soit inutilisable. **Sinon le compte rejoint le segment le plus proche avec un attribut.**

Résultat : **37 segments, dont 5 seulement à un compte** — contre 49 segments et une quinzaine de singletons dans la V0.1.
Les 14 macro-secteurs sont volontairement en nombre inchangé : **les 14 fiches sectorielles existantes et leurs études rattachées survivent intactes.**

### 1 — Parfumerie, Arômes & Cosmétique · 10 comptes
*Fiche existante : score 4,8, la plus riche de Kredo. Conservée comme parent, scindée en deux corpus enfants.*

| Segment | Comptes |
|---|---|
| **1.1 Compositions & ingrédients B2B** (7) | Robertet **[client]**, Argeville, Aromatech Group, Expressions Parfumees, Jean Niel, PARFEX, Payan Bertrand |
| **1.2 Marques & produits finis** (3) | L Occitane, Fragonard, Groupe Arthes |

> Le clivage n'est pas cosmétique : une maison de composition vend à des marques (B2B, formulation, sourcing naturel, IFRA, traçabilité matière) ; une marque vend à des consommateurs (retail, e-commerce, règlement cosmétique, DPP). Les deux corpus divergent sur les 4 tests.
> **Fragonard** est à cheval (production grassoise + boutiques + musée) : classé aval, attribut `amont_integre`.

### 2 — Santé & Sciences du vivant · 10 comptes

| Segment | Comptes |
|---|---|
| **2.1 Offre de soins & diagnostic** (4) | CHU de Nice, Centre LACASSAGNE, Lbm Bioesterel, Medipath |
| **2.2 Industrie de santé — pharma & MedTech** (2) | Horus Pharma, Median Technologies *(vertical : éditeur logiciel santé)* |
| **2.3 Services de santé & réseaux de soins** (2) | SOS Oxygene, Univet |
| **2.4 Nutraceutique & santé naturelle** (2) | Arkopharma, Laboratoires INELDEA |

> **Contre la V0.1, je fusionne établissements de soins et biologie médicale.** Le Ségur du numérique en santé traite les deux dans le même programme, avec un couloir dédié à la biologie : l'échéance réglementaire, qui est le meilleur levier commercial du secteur, est commune. Les 4 tests passent à 3 sur 4.
> **Univet rejoint SOS Oxygène** plutôt qu'un segment vétérinaire isolé : réseau multi-sites, croissance externe, personnel mobile, SI de coordination terrain — même playbook.
> La fiche **Nutraceutique** existante (score 4,3) est conservée telle quelle comme segment.

### 3 — Grand âge, handicap & médico-social · 3 comptes
| Segment | Comptes |
|---|---|
| **3.1 Établissements médico-sociaux & résidences** (3) | Domusvi, Emera, UNAPEI PACA |

> **UNAPEI rejoint DomusVi et Emera** au lieu de rester seul en « médico-social ». Financement public et ARS, taux d'occupation, tension sur le personnel soignant, dossier usager informatisé, contrôle qualité : le corpus est commun. La fiche EHPAD existante (4,4) s'élargit au lieu de se dupliquer.

### 4 — Sphère publique, enseignement & recherche · 10 comptes

| Segment | Comptes |
|---|---|
| **4.1 Collectivités & administrations d'État** (3) | CASA (Communauté d agglomérations), Préfecture 06, Rectorat de Nice |
| **4.2 Enseignement supérieur & recherche** (7) | Université Nice Cote d Azur, Polytech Nice Sophia, CNRS Geoazur, CNRS Institut de la mer de Villefranche, CNRS Observatoire Cote d Azur, Skema Business School *(droit privé)*, Eurecom *(GIE)* |

> **Un seul macro contre trois dans la V0.1** : ces dix comptes achètent selon le même code de la commande publique. La frontière utile n'est pas enseigner/chercher, c'est **SKEMA et EURECOM qui échappent au régime public** — marqué en attribut, pas en segment.

### 5 — Aéronautique, Spatial & Défense · 3 comptes
| Segment | Comptes |
|---|---|
| **5.1 Spatial, défense & systèmes critiques** (3) | Thalès Alénia Space, ACRI-ST, Exail Robotics **[client]** |

> Un seul segment : ces trois comptes partagent la commande publique de défense/spatiale, les exigences de sécurité et d'habilitation, et des cycles longs. L'écart de taille entre TAS et ACRI-ST (116 salariés) se traite par le **tier**, pas par le segment.

### 6 — Services financiers & Assurance · 5 comptes
| Segment | Comptes |
|---|---|
| **6.1 Banque & financement** (1) | Banque Populaire Mediterranée **[client]** |
| **6.2 Assurance, mutuelles & courtage** (4) | Les Mutuelles du Soleil, Solimut, CEGEMA, Ascoma **[client · Monaco]** |

> **Deux segments, pas trois.** Mutuelles et courtage partagent la gestion de contrats santé et prévoyance, les réseaux de distribution, la résiliation infra-annuelle, le 100 % santé. La banque de détail est un autre métier. Ascoma est marqué **Monaco** : hors périmètre DORA/RGPD au sens strict, discours à adapter.

### 7 — Construction & Cadre bâti · 12 comptes
| Segment | Comptes |
|---|---|
| **7.1 Constructeurs, promoteurs & ingénierie** (3) | Groupe IDEC, Groupe Trecobat, Renaudi |
| **7.2 Matériaux — production & négoce** (3) | Audemard **[client]**, Ciffreo Bona, Richardson |
| **7.3 Composants & équipements du bâtiment** (3) | Griesser, Sepalumic, Torbel Industrie |
| **7.4 Immobilier — investissement & transaction** (3) | Iselection, Keller Williams France, Pilatus Groupe |

> **Torbel Industrie sort de « Industrie » pour rejoindre le cadre bâti** — c'est le bon appel de la V0.1, je le confirme.
> Les 3 comptes orphelins de `sector_id` (Iselection, Keller Williams, Univet) sont rattachés ici et en 2.3.

### 8 — Industrie & Équipements · 4 comptes
| Segment | Comptes |
|---|---|
| **8.1 Électronique & équipements électriques** (2) | STMicroelectronics, Schneider |
| **8.2 Équipements & emballages industriels** (2) | Tournaire *(vertical : parfumerie / arômes / pharma)*, Aqualung |

> **Tournaire reste dans l'industrie** — ses concurrents sont des fabricants d'emballages — **mais porte le vertical parfumerie**, ce qui lui fait hériter du corpus grassois. C'est précisément ce que l'attribut « vertical client » sert à faire.

### 9 — Énergie & Environnement · 5 comptes
| Segment | Comptes |
|---|---|
| **9.1 Raffinage & pétrochimie** (2) | Petroineos, Naphtachimie |
| **9.2 Infrastructures & services énergétiques** (2) | Geostock, Bourbon Offshore |
| **9.3 Déchets & économie circulaire** (1) | Pizzorno Environnement |

> Segment à un compte assumé : REP, valorisation, optimisation de tournées, traçabilité, reporting environnemental — aucun corpus pétrochimique n'est réutilisable. Pizzorno hérite du macro en attendant un second compte.

### 10 — Commerce & Distribution · 6 comptes
| Segment | Comptes |
|---|---|
| **10.1 Distribution spécialisée omnicanale** (2) | Ubaldi, Retif |
| **10.2 Distribution & services automobiles** (2) | Groupe Ippolito, MP SA (AVATACAR) |
| **10.3 Agroalimentaire & boissons** (2) | Malongo, Giraudi *(Monaco)* |

### 11 — Services aux entreprises & aux personnes · 8 comptes
| Segment | Comptes |
|---|---|
| **11.1 Travail temporaire & recrutement** (2) | Adecco, Interima |
| **11.2 Réseaux de services de proximité** (2) | Depil Tech, Maman Bulle |
| **11.3 Sécurité & télésurveillance** (1) | Euro Protection Surveillance |
| **11.4 Médias & édition** (1) | Nice Matin *(Monaco)* |
| **11.5 Organisations professionnelles & sociétés savantes** (2) | CCI Cote d Azur, European Society Of Cardiology |

> **11.2 remplace deux segments d'un compte de la V0.1** (« beauté en réseau » et « périnatal ») : Depil Tech et Maman Bulle partagent le modèle du réseau de proximité B2C — points de vente, prise de rendez-vous en ligne, CRM consommateur, franchise.
> **11.5 est mon arbitrage le plus discutable et je le signale comme tel.** La CCI est un établissement public, l'ESC une société savante internationale : régimes juridiques opposés. Mais leur réalité commerciale est identique — base d'adhérents, congrès et événements, plateforme de contenu, monétisation de la donnée membre. Le régime d'achat est porté par l'attribut, pas par le segment. Si l'usage terrain donne tort à ce rapprochement, c'est le premier à défaire.

### 12 — Numérique & Éditeurs de logiciels · 9 comptes
| Segment | Comptes |
|---|---|
| **12.1 ESN & services numériques** (1) | Experis France **[ancien client · pair-partenaire]** |
| **12.2 Éditeurs de logiciels métier verticaux** (5) | CODIX *(finance)*, Harvest *(finance / gestion de patrimoine)*, Seqoia soft *(hospitality)*, Appolonia *(immobilier — à confirmer)*, Vulog *(mobilité partagée)* |
| **12.3 Éditeurs technologiques, deeptech & entités captives** (3) | Ansys *(simulation, vertical industrie)*, Bioceanor *(IoT/IA, vertical environnement)*, Ampère Software Factory *(captive automobile)* |

> **12.1 n'est pas un segment de prospection.** Experis est une ESN : motion de co-traitance et de partenariat, pas de vente DSI. À sortir des tableaux de bord de prospection.
> **12.3 rassemble des acteurs de tailles opposées** (Ansys 2,3 Md$ face à deux structures de moins de 30 personnes). C'est assumé : le tier les sépare, le corpus les rapproche — produit technologique, R&D intensive, cycle de vente long, propriété intellectuelle. C'est la tension résiduelle de cette taxonomie.

### 13 — Tourisme & Voyage · 4 comptes
| Segment | Comptes |
|---|---|
| **13.1 Hébergement & résidences de tourisme** (2) | Odalys Group, MMV |
| **13.2 Distribution du voyage & croisière** (2) | Voyage Privé **[client]**, Ponant |

> Sequoiasoft (12.2) porte le vertical *hospitality* : il hérite du corpus 13.1 sans y être classé. Deuxième démonstration de l'attribut.

### 14 — Transport, Logistique & Concessions de flux · 7 comptes
| Segment | Comptes |
|---|---|
| **14.1 Transport public de voyageurs** (2) | KEOLIS Alpes-Maritimes, Régie ligne d azur *(DSP / régie)* |
| **14.2 Logistique & livraison** (2) | Cogepart, Groupe Transcan |
| **14.3 Infrastructures & concessions de flux** (3) | Aéroport Nice Cote d Azur, ESCOTA (VINCI), **Autogrill** |

> **Autogrill quitte le tourisme pour les concessions de flux.** Sa réalité économique est celle d'un concessionnaire sur infrastructure de transport : contrat de concession, redevance au chiffre d'affaires, flux captif, saisonnalité, monétisation du passage. C'est le même métier qu'un aéroport ou qu'une société d'autoroute — pas celui d'un club de vacances. Ce déplacement supprime le dernier segment à un compte du tourisme.

---

### Récapitulatif

| | V0.1 ChatGPT | Ma proposition |
|---|---|---|
| Macro-secteurs | 18 | **14** *(fiches existantes préservées)* |
| Segments | 49 | **37** |
| Segments à 1 compte | ~15 | **5** |
| Comptes couverts | 96 | **96** |
| Axes orthogonaux | mentionnés, non modélisés | **3 modélisés** + statut relationnel |

---

## 5. Le modèle de données — la pièce manquante

Le rapport le pose puis le renvoie à plus tard. Sans lui, la taxonomie dérive en dix-huit mois.

```sql
-- 1. Deux niveaux dans la même table, par auto-référence : aucune table nouvelle,
--    aucune fiche existante cassée. Les 14 fiches deviennent des parents.
ALTER TABLE sector_intelligence ADD COLUMN parent_id uuid REFERENCES sector_intelligence(id);
ALTER TABLE sector_intelligence ADD COLUMN level TEXT
  CHECK (level IN ('macro','segment')) DEFAULT 'macro';
-- Un segment sans corpus propre hérite du parent : le front lit COALESCE(segment, parent).

-- 2. Les axes orthogonaux, sur companies — ils ne sont PAS des secteurs
ALTER TABLE companies ADD COLUMN vertical_client TEXT[];        -- {'finance'}, {'parfumerie','pharma'}
ALTER TABLE companies ADD COLUMN regime_achat TEXT;             -- 'commande_publique' | 'regule' | 'monaco' | 'prive'
ALTER TABLE companies ADD COLUMN tier TEXT;                     -- 'grand_compte' | 'eti' | 'pme'
ALTER TABLE companies ADD COLUMN relation_type TEXT;            -- 'prospect' | 'client' | 'pair_partenaire'

-- 3. Ne rien supprimer : companies.sector (texte libre) reste l'historique.
--    sector_id pointe désormais vers le SEGMENT, jamais vers le macro.
```

**Règle de lecture pour le front** : une fiche de segment vide affiche le corpus du macro parent avec un bandeau « corpus hérité ». C'est ce qui autorise 37 segments sans imposer 37 études.

**Ordre d'implémentation** : (1) créer les segments enfants des 14 macro existants, (2) réaffecter les 96 `sector_id` vers les segments, (3) renseigner les 3 attributs, (4) seulement ensuite produire les nouvelles fiches. Les étapes 1 à 3 ne cassent rien tant que le front applique le `COALESCE`.

---

## 6. Anomalies de données détectées au passage

Aucune n'a été corrigée. Cinq d'entre elles fausseraient une classification automatique.

| Compte | Anomalie | Impact |
|---|---|---|
| **Tournaire** | 70 salariés pour 270 M€ de CA, soit **3,86 M€ par salarié** — invraisemblable dans l'emballage industriel. Les deux valeurs sont probablement inversées ou d'un autre périmètre | Fausse le tier et toute analyse de taille |
| **Naphtachimie** | `segment` = « Pharmaceutique » alors que c'est un vapocraqueur pétrochimique | La V0.1 le reclasse correctement, mais sans signaler que la base dit l'inverse — l'erreur reste en base |
| **Groupe IDEC** | `naf_code` = 8299Z, « services administratifs divers », pour un constructeur-promoteur de 500 M€ | Rendrait tout contrôle NAF trompeur |
| **`naf_code` / `siren`** | Renseignés sur **3 comptes sur 96** | Le contrôle par la NAF proposé dans la V0.1 n'est pas exécutable en l'état |
| **Exail Robotics** | `revenue` = « 373 » sans unité | Non comparable |
| **3 comptes sans `sector_id`** | Iselection, Keller Williams France, Univet | Invisibles dans toute agrégation par secteur |
| **Formats de `revenue`** | « 5,8Mds € », « 2,2 Mds € », « 1,6Mds€ (Biogroup) », « 5M€/centre », « TBD » | Champ texte non exploitable pour un tri ou un scoring |

**Recommandation** : avant d'injecter la taxonomie, normaliser `revenue` en numérique (une colonne `revenue_eur` en euros) et renseigner `siren` — c'est ce qui rendra les contrôles automatiques possibles, y compris la vérification NAF.

---

## 7. Séquencement — par valeur commerciale, pas par gravité du désordre

La V0.1 propose un ordre fondé sur l'ampleur du problème. Je propose un ordre fondé sur le retour commercial, c'est-à-dire : **nombre de comptes × existence d'un client dans le bloc × corpus déjà disponible**.

| Rang | Chantier | Pourquoi d'abord |
|---|---|---|
| 1 | **Construction & cadre bâti** (12 comptes, 1 client) | Le plus gros bloc, un client acquis (Audemard) pour calibrer, et 4 segments évidents à créer |
| 2 | **Commerce / Services** (14 comptes répartis) | L'éclatement le plus urgent, et il débloque 6 comptes aujourd'hui inexploitables |
| 3 | **Santé & sciences du vivant** (10 comptes) | Le Ségur donne des échéances datées, donc des motifs d'appel immédiats |
| 4 | **Sphère publique** (10 comptes) | Fiche en statut `watch` sans score : le seul bloc sans corpus, à construire de zéro |
| 5 | **Numérique** (9 comptes, 1 ancien client) | Sortir Experis des tableaux de prospection est un gain immédiat |
| 6 | **Parfumerie** (10 comptes, 1 client) | Fiche à 4,8 : scinder en dernier, le risque de dégrader l'existant est plus élevé que le gain |

**Ce que je ferais avant tout le reste, en une demi-journée** : les 3 attributs orthogonaux sur les 96 comptes. Ils apportent immédiatement le tri par taille, le repérage des comptes Monaco et la sortie d'Experis des listes de prospection — sans toucher à un seul secteur.

---

**Export machine** : [`classification-96-comptes.csv`](classification-96-comptes.csv) — 96 lignes, prêt pour l'injection après validation.

---

**Page publiée (privée)** : https://claude.ai/code/artifact/597a4a06-2c14-4b70-86f9-65c3f75c80a5 — même contenu, avec le tableau des 96 comptes filtrable par macro-secteur, taille, régime d'achat et relation.
