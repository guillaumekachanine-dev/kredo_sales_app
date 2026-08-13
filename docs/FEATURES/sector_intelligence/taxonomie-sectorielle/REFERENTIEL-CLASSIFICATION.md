> 🟢 **NORMATIF DÉLÉGUÉ** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Le corpus MASTER-STUDY lui délègue **toute la classification d'un compte** : les 15 macros / 38 segments, les 7 axes, les 4 tests, la jurisprudence et les contrôles §10. `MASTER-STUDY/04-ETAPE-E1-TAXONOMIE.md` dit quand l'ouvrir ; il ne le duplique jamais.
> **Référence à appliquer : ce document**

---

# RÉFÉRENTIEL DE CLASSIFICATION DES COMPTES — KREDO

**Document faisant foi.** Version 1.0 · 09/08/2026 · Base `Kredo_Sales_App` (`jvzgmhvwirsbdkjpmvla`)
Toute classification de compte, tout développement applicatif et toute génération automatisée s'y conforment.
En cas de contradiction avec un autre document du projet, **c'est celui-ci qui prévaut**.

---

## 0. Comment utiliser ce document

**Vous êtes un humain** → lisez les §1 à §5, puis revenez au §6 quand vous classez un compte.

**Vous êtes un modèle d'IA chargé de classer un nouveau compte** → ce document est votre spécification complète. Vous n'avez besoin d'aucune autre source. Procédez ainsi :
1. Lisez le §2 (principe) et le §5 (spécification de chaque paramètre).
2. Appliquez **littéralement** la procédure du §6, dans l'ordre, sans sauter d'étape.
3. Consultez le §8 (jurisprudence) dès qu'un cas ressemble à un cas déjà tranché.
4. Passez les contrôles du §10 **avant** toute écriture.
5. Produisez la sortie au format du §7, puis le SQL du §11.
6. Respectez les interdits du §12 — ils sont absolus.

**Règle qui prime sur toutes les autres** : en cas de doute, **classez large et signalez**, ne créez jamais une catégorie pour résoudre un cas isolé.

---

## 1. Objectif

### Ce que cette classification sert à produire

Kredo est un outil de **prospection**, pas de gestion de portefeuille : 96 comptes, dont 6 clients. La classification n'a donc pas pour but de ranger ce qui existe, mais de **répondre à trois questions commerciales** :

1. **Quels comptes se ressemblent assez pour qu'un même travail serve aux deux ?** — un playbook, une étude, un argumentaire, une référence.
2. **Quel discours tenir à ce compte, et par quelle porte entrer ?**
3. **Pourquoi maintenant ?**

Toute catégorie qui ne change ni la priorisation d'un compte, ni la formulation d'un discours, ni le choix d'un interlocuteur, ni le moment de l'appel **n'a pas sa place dans ce référentiel**.

### Ce que cette classification n'est pas

- **Ce n'est pas une nomenclature statistique.** La NAF classe l'activité économique ; elle ignore la clientèle, le modèle de revenus et la pression réglementaire. Elle sert de contrôle de cohérence, jamais de source.
- **Ce n'est pas un organigramme du marché.** Deux entreprises du même « secteur » peuvent n'avoir aucun enjeu commun.
- **Ce n'est pas figé.** Voir §9 (gouvernance).

---

## 2. Principe fondateur : un enjeu a une cause, pas une catégorie

C'est le fondement de tout le modèle, et le point à comprendre avant d'utiliser le reste.

L'analyse des 87 pain points documentés dans les 14 fiches sectorielles de Kredo montre qu'**un peu plus de la moitié des enjeux ne sont pas générés par le secteur** :

| Enjeu récurrent | Présent dans | Cause réelle |
|---|---|---|
| Conformité réglementaire datée (NIS2, DORA, AI Act, CSRD, RE2020, facturation électronique, HDS…) | **14 secteurs sur 14** | Régime de contrainte |
| SI qui ne se parlent pas après acquisition | 6 secteurs sur 14 | Moment |
| Donnée éclatée, pas de source de vérité | 7 secteurs sur 14 | Modèle économique |
| Pénurie de compétences, dépendance à des spécialistes | 5 secteurs sur 14 | Taille de l'équipe |
| Désintermédiation par les plateformes | 3 secteurs sur 14 | Modèle économique |

« Acquisitions en série, des SI qui ne se parlent pas » (fiche BTP) et « Fusionner des SI hétérogènes après un rachat » (fiche Tourisme) sont **le même enjeu, écrit deux fois dans deux fiches qui s'ignorent**. Le secteur ne l'a pas prédit ; la trajectoire de l'entreprise, oui.

### Les quatre causes, et le paramètre qui les porte

| Ordre | Cause | Question à laquelle elle répond | Paramètre |
|---|---|---|---|
| **1** | **Régime de contrainte** | **Quand** ? | `regime_achat` |
| **2** | **Modèle économique et rôle dans la chaîne de valeur** | **Quoi** casse ? | `modele_eco` |
| **3** | **Moment / trajectoire** | **Pourquoi maintenant** ? | `moment` |
| **4** | **Capacité à traiter** | **Comment** et à quel format ? | `tier` |

Et les trois axes de rangement, subordonnés aux quatre causes :

| Paramètre | Ce qu'il apporte réellement |
|---|---|
| **Macro-secteur** (`sector_id`) | **La langue, pas la cause.** Vocabulaire, références, crédibilité en rendez-vous. Un commercial qui dit « time-to-submission » devant un parfumeur est crédible : c'est le secteur qui le lui a donné |
| **Segment** (`segment_id`) | **L'unité de playbook.** Un bon segment est un régime de contrainte croisé à un modèle économique, qui a trouvé un nom |
| **Verticale** (`vertical_client`) | **Un canal d'héritage de corpus**, jamais un prédicteur. Elle décrit le marché d'un fournisseur, pas ses enjeux à lui |

> **Corollaire à retenir.** Les enjeux de Harvest sont ceux d'un éditeur — dette technique, migration SaaS, cadence de release. DORA ne l'atteint que par ricochet, en exigence descendante de ses clients. On classe Harvest en **éditeur**, avec la **verticale finance**. Jamais l'inverse.

---

## 3. Le modèle de données

### Structure

```
sector_intelligence
├── level = 'macro'    → 15 macro-secteurs (dont le bac « Non rattaché »)
└── level = 'segment'  → 38 segments, chacun avec parent_id vers son macro

companies
├── sector_id    → pointe vers un MACRO      (lu par le front aujourd'hui)
├── segment_id   → pointe vers un SEGMENT    (couche fine, additive)
└── 6 attributs orthogonaux + 4 champs de traçabilité
```

### Colonnes normatives sur `companies`

| Colonne | Type | Obligatoire | Rôle |
|---|---|---|---|
| `sector_id` | uuid | **oui** | Macro-secteur. Ce que le front affiche |
| `segment_id` | uuid | **oui** | Segment. Unité de playbook |
| `regime_achat` | text | **oui** | Cause n°1 |
| `modele_eco` | text | **oui** | Cause n°2 |
| `moment` | text | non | Cause n°3 — NULL si non documenté |
| `tier` | text | non | Cause n°4 — NULL si taille inconnue |
| `vertical_client` | text[] | non | Uniquement pour les fournisseurs d'une filière |
| `relation_type` | text | **oui** | Détermine la motion commerciale |
| `classification_confiance` | text | **oui** | `haute` / `moyenne` / `faible` |
| `classification_note` | text | si ≠ haute | Motif de la décision et point à lever |
| `classified_at`, `classified_by` | — | **oui** | Traçabilité |

`companies.sector` (texte libre historique) **n'est jamais modifié ni supprimé**. Il sert de témoin.

### Règle d'affichage imposée au front

Un segment sans corpus propre affiche celui de son macro parent, avec un bandeau « corpus hérité » :
```sql
COALESCE(segment.playbook, parent.playbook)
```
C'est cette règle qui autorise 38 segments sans imposer 38 études.

---

## 4. Le référentiel — 15 macro-secteurs, 38 segments

**Liste faisant foi.** Les `slug` sont les identifiants stables : utilisez-les, jamais les noms.

> ⚠️ **Les codes « 1.1 », « 5.1 », « 12.1 » de la colonne Segment ne font plus partie du nom en
> base** (migration `072`, 2026-08-12). Ils vivent désormais dans la colonne dédiée
> `sector_intelligence.display_code`, purement documentaire, et `name` ne porte que le libellé
> (« Spatial, défense & systèmes critiques »). Ce tableau les conserve comme **repères de lecture**
> du référentiel — ne jamais les réinjecter devant un nom à l'écran. La clé fonctionnelle reste le
> `slug`, la hiérarchie reste portée par `parent_id`.
>
> Ne pas confondre ces codes avec les numéros de **section** de ce document : le « §5.1 » du
> chapitre 5 désigne le paramètre `sector_id`, pas le segment Spatial.

| Macro-secteur | `slug` macro | Segment | `slug` segment | Comptes |
|---|---|---|---|---|
| **Parfumerie, Arômes & Cosmétique** | `parfumerie-aromes` | 1.1 Compositions & ingrédients B2B | `seg-parfumerie-compositions-b2b` | 7 |
| | | 1.2 Marques & produits finis | `seg-parfumerie-marques-produits-finis` | 3 |
| **Santé, MedTech & Médico-social** | `sante-medtech-medico-social` | 2.1 Offre de soins & diagnostic | `seg-sante-soins-diagnostic` | 4 |
| | | 2.2 Industrie de santé — pharma & MedTech | `seg-sante-industrie-pharma-medtech` | 2 |
| | | 2.3 Services de santé & réseaux de soins | `seg-sante-services-reseaux` | 2 |
| | | Nutraceutique & santé naturelle *(fiche propre)* | `nutraceutique-sante-naturelle` | 2 |
| **EHPAD & Résidences Seniors** | `ehpad-residences-seniors` | 3.1 Établissements médico-sociaux & résidences | `seg-grand-age-etablissements` | 3 |
| **Secteur public, ESR** | `secteur-public-enseignement-recherche` | 4.1 Collectivités & administrations d'État | `seg-public-collectivites-administrations` | 3 |
| | | 4.2 Enseignement supérieur & recherche | `seg-public-esr` | 7 |
| **Aéronautique, Spatial & Défense** | `aeronautique-spatial-defense` | 5.1 Spatial, défense & systèmes critiques | `seg-aero-spatial-defense` | 3 |
| **Banque, Finance & Assurance** | `banque-finance-assurance` | 6.1 Banque & financement | `seg-finance-banque` | 1 |
| | | 6.2 Assurance, mutuelles & courtage | `seg-finance-assurance-mutuelles-courtage` | 4 |
| **BTP, Construction & Négoce** | `btp-construction-immobilier` | 7.1 Constructeurs, promoteurs & ingénierie | `seg-btp-constructeurs-promoteurs` | 3 |
| | | 7.2 Matériaux — production & négoce | `seg-btp-materiaux` | 3 |
| | | 7.3 Composants & équipements du bâtiment | `seg-btp-composants-equipements` | 3 |
| | | 7.4 Immobilier — investissement & transaction | `seg-btp-immobilier` | 3 |
| **Industrie Manufacturière** | `industrie-manufacturiere-electronique-equipements` | 8.1 Électronique & équipements électriques | `seg-industrie-electronique` | 2 |
| | | 8.2 Équipements & emballages industriels | `seg-industrie-equipements-emballages` | 2 |
| **Énergie, Pétrochimie & Environnement** | `energie-petrochimie-environnement` | 9.1 Raffinage & pétrochimie | `seg-energie-raffinage-petrochimie` | 2 |
| | | 9.2 Infrastructures & services énergétiques | `seg-energie-infrastructures-services` | 2 |
| | | 9.3 Déchets & économie circulaire | `seg-energie-dechets-economie-circulaire` | 1 |
| **Commerce & Distribution** | `commerce-distribution-services-specialises` | 10.1 Distribution spécialisée omnicanale | `seg-commerce-distribution-specialisee` | 2 |
| | | 10.2 Distribution & services automobiles | `seg-commerce-automobile` | 2 |
| | | 10.3 Agroalimentaire & boissons | `seg-commerce-agroalimentaire-boissons` | 2 |
| **Services aux entreprises & aux personnes** | `services-entreprises-personnes` | 11.1 Travail temporaire & recrutement | `seg-services-travail-temporaire` | 2 |
| | | 11.2 Réseaux de services de proximité | `seg-services-reseaux-proximite` | 2 |
| | | 11.3 Sécurité & télésurveillance | `seg-services-securite-telesurveillance` | 1 |
| | | 11.4 Médias & édition | `seg-services-medias-edition` | 1 |
| | | 11.5 Organisations professionnelles & sociétés savantes | `seg-services-organisations-professionnelles` | 2 |
| **Logiciels, SaaS & Services numériques** | `logiciels-saas-services-numeriques` | 12.1 ESN & services numériques | `seg-numerique-esn` | 1 |
| | | 12.2 Éditeurs de logiciels métier verticaux | `seg-numerique-editeurs-verticaux` | 5 |
| | | 12.3 Éditeurs technologiques, deeptech & entités captives | `seg-numerique-deeptech-captives` | 3 |
| **Tourisme, Hôtellerie & Loisirs** | `tourisme-hotellerie-loisirs` | 13.1 Hébergement & résidences de tourisme | `seg-tourisme-hebergement` | 2 |
| | | 13.2 Distribution du voyage & croisière | `seg-tourisme-voyage-croisiere` | 2 |
| **Transport & Mobilité régionale** | `transport-mobilite-regionale` | 14.1 Transport public de voyageurs | `seg-transport-voyageurs` | 2 |
| | | 14.2 Logistique & livraison | `seg-transport-logistique` | 2 |
| | | 14.3 Infrastructures & concessions de flux | `seg-transport-concessions-flux` | 3 |
| **Non rattaché — à qualifier** | `non-rattache-a-qualifier` | 0.0 À qualifier | `seg-a-qualifier` | 0 |

### Définition de chaque segment — critère d'appartenance

| Segment | Y appartient une entreprise qui… |
|---|---|
| 1.1 Compositions & ingrédients B2B | formule et produit des parfums, arômes ou ingrédients **vendus à d'autres entreprises** |
| 1.2 Marques & produits finis | commercialise sous **sa propre marque** auprès du consommateur final |
| 2.1 Offre de soins & diagnostic | **produit un acte de soin ou de diagnostic** (établissement, laboratoire, imagerie, anatomopathologie) |
| 2.2 Industrie de santé | **fabrique ou édite** un médicament, un dispositif médical ou un logiciel de santé |
| 2.3 Services de santé & réseaux de soins | exploite un **réseau multi-sites de services de santé** sans être un établissement hospitalier |
| Nutraceutique | produit des **compléments alimentaires, phytothérapie, santé naturelle** |
| 3.1 Établissements médico-sociaux | exploite des **structures d'hébergement financées par la puissance publique** (grand âge, handicap) |
| 4.1 Collectivités & administrations | est une **personne publique territoriale ou d'État** |
| 4.2 Enseignement supérieur & recherche | **enseigne ou produit de la recherche**, publique ou privée |
| 5.1 Spatial, défense & systèmes critiques | conçoit ou opère des **systèmes critiques sous commande publique ou de défense** |
| 6.1 Banque & financement | **collecte des dépôts ou octroie du crédit** |
| 6.2 Assurance, mutuelles & courtage | **porte ou distribue un risque assurantiel** |
| 7.1 Constructeurs, promoteurs & ingénierie | **réalise ou fait réaliser un ouvrage** |
| 7.2 Matériaux — production & négoce | **produit ou distribue de la matière** de construction |
| 7.3 Composants & équipements du bâtiment | **fabrique un composant** intégré à l'ouvrage |
| 7.4 Immobilier — investissement & transaction | **commercialise, gère ou investit** dans le bâti sans le construire |
| 8.1 Électronique & équipements électriques | fabrique des **composants ou équipements électriques et électroniques** |
| 8.2 Équipements & emballages industriels | fabrique un **bien d'équipement ou de conditionnement pour d'autres industriels** |
| 9.1 Raffinage & pétrochimie | **transforme des hydrocarbures** sur site classé |
| 9.2 Infrastructures & services énergétiques | **construit ou exploite une infrastructure** énergétique, ou la sert |
| 9.3 Déchets & économie circulaire | **collecte, traite ou valorise** des déchets |
| 10.1 Distribution spécialisée omnicanale | vend au détail sur une **catégorie de produits**, en magasin et en ligne |
| 10.2 Distribution & services automobiles | distribue ou entretient des **véhicules** |
| 10.3 Agroalimentaire & boissons | produit ou négocie des **denrées alimentaires** |
| 11.1 Travail temporaire & recrutement | **place ou met à disposition des personnes** |
| 11.2 Réseaux de services de proximité | exploite un **réseau de points de service au consommateur** |
| 11.3 Sécurité & télésurveillance | vend de la **sécurité des biens et des personnes par abonnement** |
| 11.4 Médias & édition | **produit et diffuse du contenu éditorial** |
| 11.5 Organisations professionnelles & sociétés savantes | **fédère des adhérents ou des membres** et leur rend service |
| 12.1 ESN & services numériques | vend de la **prestation intellectuelle informatique** — c'est un **pair**, pas un prospect |
| 12.2 Éditeurs de logiciels métier verticaux | édite un logiciel **pour une industrie donnée** |
| 12.3 Éditeurs technologiques, deeptech & captives | produit une **technologie** transverse, ou est une **entité logicielle captive** d'un industriel |
| 13.1 Hébergement & résidences de tourisme | **exploite des lits ou des résidences** |
| 13.2 Distribution du voyage & croisière | **vend ou opère un voyage** auprès du consommateur |
| 14.1 Transport public de voyageurs | exploite un **réseau de transport sous délégation ou en régie** |
| 14.2 Logistique & livraison | **achemine des marchandises** pour compte de tiers |
| 14.3 Infrastructures & concessions de flux | **exploite une infrastructure de flux sous concession** et monétise le passage |

---

## 5. Spécification des paramètres

Pour chaque paramètre : à quoi il sert, valeurs autorisées, règle de détermination, implication commerciale, erreurs à éviter.

### 5.1 `sector_id` — macro-secteur

**Finalité** : porter la **langue du métier** — vocabulaire, références, crédibilité en rendez-vous — et servir de conteneur au corpus (études, pain points, calendrier réglementaire).
**Valeurs** : les 15 `slug` de macro du §4.
**Règle** : le macro se déduit du segment (`segment.parent_id`). On ne choisit **jamais** un macro directement : on choisit un segment, le macro suit.
**Implication commerciale** : détermine quelle fiche sectorielle le commercial ouvre avant son rendez-vous.
**Erreur classique** : classer sur l'image de marque plutôt que sur l'activité dominante. Un groupe diversifié se classe sur son activité **majoritaire en chiffre d'affaires**, jamais sur celle qui est la plus visible.

### 5.2 `segment_id` — segment commercial

**Finalité** : c'est **l'unité de playbook**. Deux comptes du même segment doivent pouvoir partager un argumentaire, une étude, une référence.
**Valeurs** : les 38 `slug` de segment du §4.
**Règle** : les 4 tests du §6.3, plus la règle des 70 %.
**Implication commerciale** : détermine l'argumentaire, l'interlocuteur type et les objections attendues.
**Erreur classique** : créer un segment pour un compte qui n'entre nulle part. **Interdit** — voir §9.

### 5.3 `regime_achat` — régime de contrainte *(cause n°1)*

**Finalité** : c'est le **seul paramètre daté**. Il porte les échéances réglementaires, donc les motifs d'appel et les budgets contraints.

| Valeur | Définition | Implication commerciale |
|---|---|---|
| `commande_publique` | Soumis au code de la commande publique : personne publique, DSP, concession, EPIC, opérateur de l'État | Cycle long, marché ou accord-cadre obligatoire, CCAG-TIC, seuils de publicité. **On n'entre pas sans procédure.** Le sourcing amont est le vrai levier |
| `regule` | Activité soumise à un régulateur ou à un régime sectoriel structurant : santé, finance, cosmétique, alimentaire, Seveso, HDS, DORA | Les échéances réglementaires sont des budgets. **Le meilleur angle d'ouverture du référentiel** |
| `monaco` | Établissement principal en Principauté de Monaco | **Hors Union européenne** : RGPD, DORA et NIS2 ne s'appliquent pas directement, droit et autorité de contrôle monégasques. Un discours de conformité européenne est disqualifiant |
| `prive` | Aucun des trois | Cycle court, décision d'achat libre, entrée possible par le métier |

**Règle de détermination**, dans l'ordre — le premier qui matche gagne :
1. Siège principal à Monaco → `monaco`
2. Personne publique, délégataire de service public ou concessionnaire → `commande_publique`
3. Activité sous régulateur ou régime sectoriel contraignant → `regule`
4. Sinon → `prive`

**Obligatoire.** Jamais NULL.

### 5.4 `modele_eco` — modèle économique et rôle dans la chaîne *(cause n°2)*

**Finalité** : prédit **ce qui casse** chez le compte, indépendamment de son secteur. C'est ce qui permet des playbooks transverses.

| Valeur | Définition | Ce qui casse, donc ce qui se vend |
|---|---|---|
| `industriel` | Transforme de la matière sur site de production | Traçabilité, qualité, MES/ERP, OT et cybersécurité industrielle, décarbonation |
| `multi_sites` | Exploite un réseau d'établissements ou d'agences | Pilotage consolidé, homogénéité de service, remontée de données terrain, référentiel unique |
| `b2c_reseau` | Vend au consommateur final, en réseau ou par abonnement | Donnée client, churn, acquisition digitale, omnicanal, RGPD et consentement |
| `b2b_projet` | Vend des projets ou des affaires à d'autres entreprises | Chiffrage, gestion d'affaire, capacité, marge par projet, planification |
| `editeur` | Vend un produit logiciel | Dette technique, cadence de release, migration SaaS, conformité produit (AI Act, CRA) |
| `captif` | Entité de service d'un groupe, client interne | Gouvernance de groupe, refacturation interne, alignement sur la maison mère |
| `concession` | Exploite un actif sous contrat public, monétise un flux | Preuve de service, reporting au concédant, renouvellement, disponibilité |
| `institution` | Personne morale de droit public ou association d'intérêt général | Tutelle, budget contraint, SI historique, mutualisation |

**Règle** : une seule valeur, celle qui décrit **d'où vient la majorité du chiffre d'affaires**.
**Obligatoire.** Si vraiment indéterminable, laisser NULL et poser `classification_confiance='faible'` avec une note.

### 5.5 `moment` — trajectoire *(cause n°3)*

**Finalité** : répond à **« pourquoi maintenant »**. C'est le paramètre qui transforme une fiche en motif d'appel.

| Valeur | Déclencheur documenté |
|---|---|
| `integration_post_ma` | Acquisition ou fusion dans les 24 mois |
| `croissance_forte` | Croissance ≥ 15 %/an sur 3 ans, ou plan de croissance annoncé publiquement |
| `retournement` | Résultats en repli, plan de réduction de coûts, procédure |
| `renouvellement_concession` | Échéance de DSP ou de concession dans les 24 mois |
| `reorganisation_si` | Nomination d'un DSI/CDO, refonte annoncée, changement d'éditeur structurant |
| `stable` | Aucun des cinq, et l'absence a été vérifiée |

**Règle stricte** : ne renseigner que si un **fait daté et sourçable** l'établit. Une intuition n'est pas un moment.
**Non obligatoire — et actuellement rempli sur 1 compte sur 96.** Ce n'est pas un défaut de la méthode, c'est un défaut de recherche : l'information existe au niveau du secteur, pas du compte. **C'est le chantier le plus rentable qui reste ouvert.**

### 5.6 `tier` — capacité *(cause n°4)*

**Finalité** : détermine l'interlocuteur, la longueur du cycle et le format d'offre. Le portefeuille va de 3 à 38 000 salariés : ce paramètre discrimine autant que le secteur.

| Valeur | Seuil | Implication |
|---|---|---|
| `grand_compte` | ≥ 2 000 salariés **ou** ≥ 1 Md€ de CA | Panel de référencement, achats centralisés, cycle long. Entrée par le référencement ou un partenaire en place |
| `eti` | 250 à 2 000 salariés | Décision accessible, DSI constituée mais courte. Cœur de cible naturel d'une ESN régionale |
| `pme` | < 250 salariés | Interlocuteur = dirigeant. Sujet borné, daté, à retour rapide. Jamais de discours de transformation |

**Règle** : effectif d'abord ; si absent ou manifestement incohérent avec le CA, utiliser le CA ; si les deux sont absents ou contradictoires, **laisser NULL** — ne jamais deviner.

### 5.7 `vertical_client` — marché servi

**Finalité** : permet à un **fournisseur** d'hériter du corpus de la filière qu'il sert, **sans être classé dedans**. C'est un canal d'héritage, jamais un prédicteur d'enjeux.
**Type** : tableau — un fournisseur peut servir plusieurs filières.
**Valeurs usuelles** : `finance`, `sante`, `hospitality`, `mobilite`, `immobilier`, `industrie`, `environnement`, `automobile`, `parfumerie`, `pharma`, `secteur_public`, `sport`, `defense`.
**Règle** : ne renseigner que si le compte **vend majoritairement à une filière identifiable**. Un distributeur généraliste n'a pas de verticale.
**Exemple canonique** : Tournaire fabrique des emballages — segment `8.2 Équipements & emballages industriels`, verticale `{parfumerie, pharma}`. Il hérite ainsi du corpus grassois, le plus riche de Kredo, sans fausser sa segmentation concurrentielle.

### 5.8 `relation_type` — statut relationnel

**Finalité** : détermine la **motion commerciale**, en amont de tout discours sectoriel.

| Valeur | Motion |
|---|---|
| `prospect` | Conquête |
| `client` | Extension, référence activable auprès des voisins de filière |
| `ancien_client` | Reconquête, avec analyse de la perte |
| `pair_partenaire` | **Ni prospect ni client** : co-traitance, sous-traitance, réponse conjointe. **À exclure des tableaux de prospection** |

**Cas type** : Experis France est une ESN. La classer en prospect produit un playbook qui ne servira jamais.

### 5.9 Traçabilité — `classification_confiance`, `classification_note`, `classified_at`, `classified_by`

**Finalité** : rendre toute classification auditable et révisable. Un commercial doit savoir qu'il travaille sur une fiche fragile.

| `classification_confiance` | Quand |
|---|---|
| `haute` | Les 4 tests passent sans ambiguïté, l'activité dominante est claire |
| `moyenne` | Un test est discutable, ou le compte est à cheval sur deux segments, ou c'est un groupe diversifié |
| `faible` | Activité mal établie, données de taille absentes, ou rattachement par défaut |

`classification_note` est **obligatoire** dès que la confiance n'est pas `haute` : une phrase qui dit ce qui est incertain et ce qu'il faut vérifier.

---

## 6. Procédure de classification d'un nouveau compte

**À suivre littéralement, dans l'ordre.**

### 6.1 Étape 0 — Collecte minimale

Réunir : raison sociale exacte, SIREN si disponible, site web, description de l'activité, effectif, chiffre d'affaires, siège, appartenance à un groupe.
**Si l'activité réelle ne peut pas être établie**, ne pas deviner : classer en `seg-a-qualifier` avec `classification_confiance='faible'` et une note listant ce qui manque. C'est une issue **légitime**.

### 6.2 Étape 1 — Déterminer l'activité dominante

Une seule question : **d'où vient la majorité du chiffre d'affaires ?**
- Groupe diversifié → retenir l'activité majoritaire. Mentionner les autres dans `classification_note`. **Ne jamais créer de catégorie « groupe diversifié ».**
- Entité d'un groupe → classer l'**entité**, pas le groupe. La maille est l'unité de décision d'achat : si deux entités d'un même groupe ont des DSI et des circuits d'achat distincts, ce sont deux comptes.

### 6.3 Étape 2 — Choisir le segment par les 4 tests

Pour chaque segment candidat du §4, répondre par oui/non :

1. **Concurrence** — un commercial citerait-il spontanément ce compte et les comptes du segment dans la même short-list concurrentielle ?
2. **Acheteurs** — vise-t-on les mêmes directions, avec le même processus d'achat ?
3. **Contraintes** — subissent-ils les mêmes échéances et obligations structurantes ?
4. **Offres Kredo** — les 3 à 5 premières offres à proposer sont-elles globalement les mêmes ?

**Décision** :
- **4 oui, ou 3 oui** → rattacher, confiance `haute`
- **2 oui** → rattacher au segment le plus proche, confiance `moyenne`, note obligatoire
- **0 ou 1 oui sur tous les segments** → **appliquer la règle des 70 %** : existe-t-il un segment tel que 70 % d'un briefing préparé pour l'un de ses comptes reste pertinent pour celui-ci ? Si oui → rattacher en confiance `moyenne`. Si non → `seg-a-qualifier`.

**Interdiction absolue à cette étape : ne créez pas de segment.** Voir §9.

### 6.4 Étape 3 — `regime_achat`

Appliquer la cascade du §5.3. Obligatoire.

### 6.5 Étape 4 — `modele_eco`

Choisir la valeur du §5.4 qui décrit l'origine majoritaire du chiffre d'affaires.

### 6.6 Étape 5 — `tier`

Effectif → seuils du §5.6. À défaut, CA. Sinon NULL.
**Contrôle** : calculer CA ÷ effectif. Si le ratio s'écarte de plus d'un facteur 2 de la médiane des comptes du même segment, ne pas trancher : mettre `tier` à NULL et signaler l'incohérence dans `classification_note`.

### 6.7 Étape 6 — `vertical_client`

Uniquement si le compte vend majoritairement à une filière identifiable. Sinon NULL.

### 6.8 Étape 7 — `relation_type` et `moment`

`relation_type` : reprendre `lifecycle_status`, sauf si le compte est une ESN ou un partenaire → `pair_partenaire`.
`moment` : uniquement sur fait daté et sourçable. Sinon NULL.

### 6.9 Étape 8 — Traçabilité, contrôles, écriture

Renseigner la confiance et la note, passer les contrôles du §10, puis écrire avec le SQL du §11.

### Arbre de décision condensé

```
Activité dominante identifiable ?
├── non ─────────────────────────────────► seg-a-qualifier, confiance faible
└── oui
    └── Segment : 4 tests
        ├── 3-4 oui ──────────────────────► rattacher, confiance haute
        ├── 2 oui ────────────────────────► rattacher, confiance moyenne + note
        └── 0-1 oui
            └── règle des 70 % ?
                ├── oui ──────────────────► rattacher, confiance moyenne + note
                └── non ──────────────────► seg-a-qualifier + note
    puis, dans tous les cas :
      regime_achat (cascade, obligatoire)
      modele_eco   (origine du CA, obligatoire)
      tier         (effectif → CA → NULL)
      vertical_client (fournisseur d'une filière ? sinon NULL)
      relation_type (ESN/partenaire → pair_partenaire)
      moment       (fait daté sourçable, sinon NULL)
```

---

## 7. Format de sortie attendu d'une IA de classification

```json
{
  "compte": "<raison sociale exacte>",
  "siren": "<ou null>",
  "activite_dominante": "<une phrase : ce que l'entreprise vend, à qui>",
  "segment_slug": "<slug du §4>",
  "macro_slug": "<slug parent, déduit du segment>",
  "tests": {"concurrence": true, "acheteurs": true, "contraintes": false, "offres": true},
  "regime_achat": "commande_publique|regule|monaco|prive",
  "modele_eco": "industriel|multi_sites|b2c_reseau|b2b_projet|editeur|captif|concession|institution",
  "tier": "grand_compte|eti|pme|null",
  "vertical_client": ["<filière>"],
  "relation_type": "prospect|client|ancien_client|pair_partenaire",
  "moment": "<valeur §5.5 ou null>",
  "moment_preuve": "<fait daté + source, ou null>",
  "classification_confiance": "haute|moyenne|faible",
  "classification_note": "<obligatoire si confiance ≠ haute>",
  "alternatives_ecartees": [{"segment_slug": "", "motif": ""}]
}
```

---

## 8. Jurisprudence — cas déjà tranchés

Ces décisions font autorité. Un cas analogue se tranche de la même façon.

| Cas | Décision | Motif |
|---|---|---|
| **Éditeur dont le client est une industrie** (Harvest, CODIX → finance) | Segment `12.2 Éditeurs verticaux`, verticale `{finance}` | Ses enjeux sont ceux d'un éditeur. La verticale n'est qu'un canal d'héritage |
| **Fournisseur industriel d'une filière** (Tournaire → parfumerie) | Segment `8.2`, verticale `{parfumerie, pharma}` | Ses concurrents sont des fabricants d'emballages, pas des parfumeurs |
| **Entité logicielle captive** (Ampère Software Factory) | Segment `12.3`, `modele_eco='captif'` | Client interne, budget de groupe : économie opposée à celle d'un éditeur |
| **ESN dans le portefeuille** (Experis France) | Segment `12.1`, `relation_type='pair_partenaire'` | Motion de co-traitance. À exclure des listes de prospection |
| **Deeptech vs éditeur mondial** (Bioceanor vs Ansys) | Même segment `12.3`, `tier` différent | L'écart de taille se traite par le tier, jamais par le segment |
| **Compte à Monaco** (Ascoma, Giraudi, Nice Matin) | Segment métier normal, `regime_achat='monaco'` | Le régime juridique est un attribut, pas un secteur |
| **Enseignement privé dans le bloc public** (SKEMA, EURECOM) | Segment `4.2`, `regime_achat='prive'` | La frontière utile est le régime d'achat, pas la nature de l'activité |
| **Établissement médico-social isolé** (UNAPEI PACA) | Rejoint `3.1` avec les EHPAD | Financement ARS, taux d'occupation, dossier usager : corpus commun |
| **Réseau de cliniques vétérinaires** (Univet) | Rejoint `2.3` avec un PSAD | Multi-sites, croissance externe, personnel mobile : même playbook |
| **Restauration sous concession** (Autogrill) | Segment `14.3` avec l'aéroport et l'autoroutier | Concession, redevance au CA, flux captif : métier de concessionnaire, pas d'hôtelier |
| **Micro-compte de 3 personnes** (Renaudi, Pilatus) | Segment métier normal, `tier='pme'`, confiance `moyenne` ou `faible` | La taille ne crée pas de catégorie |
| **Groupe diversifié** (Ippolito, Giraudi) | Activité dominante, autres activités en note | Aucun secteur « groupes diversifiés » ne sera créé |
| **Négoce et production de matériaux** (Audemard, Ciffreo Bona) | Même segment `7.2` | Produire ou distribuer la matière : mêmes clients, mêmes contraintes produit |

---

## 9. Gouvernance — quand faire évoluer le référentiel

### Créer un nouveau segment : les trois conditions cumulatives

Un segment ne se crée que si **les trois** sont réunies :
1. **Au moins 3 comptes réels** y entreraient, aujourd'hui, en passant les 4 tests ;
2. Aucun segment existant ne satisfait la règle des 70 % pour ces comptes ;
3. Le segment produirait un **playbook réellement différent** — argumentaire, interlocuteur, objections.

**Deux comptes ne suffisent pas.** Un compte encore moins. La V0.1 de cette taxonomie proposait 49 segments pour 96 comptes, dont une quinzaine à un seul compte : c'est le mode de dégradation le plus courant, et il est interdit ici.

### Créer un nouveau macro-secteur

Uniquement si **au moins 3 segments** existants ou à créer s'y rattachent, et si aucun macro existant ne convient. Décision du commanditaire, jamais automatique.

### Supprimer ou fusionner

Un segment vide pendant 12 mois est supprimé. Deux segments dont les playbooks ont convergé sont fusionnés, le plus ancien absorbant le plus récent.

### Le bac « Non rattaché — à qualifier »

Séjour maximal **30 jours**. Passé ce délai, le compte est rattaché ou sorti du portefeuille. Un compte qui y reste par confort est un échec de la procédure, pas une classification.

### Versioning

Toute modification du référentiel incrémente la version de ce document, avec une entrée au §13. Les `slug` sont **immuables** : on renomme un libellé, jamais un slug.

---

## 10. Contrôles obligatoires avant écriture

| # | Contrôle | Bloquant |
|---|---|---|
| 1 | `segment_slug` existe dans le §4 | **oui** |
| 2 | `sector_id` = parent du segment retenu | **oui** |
| 3 | `regime_achat`, `modele_eco`, `relation_type` renseignés | **oui** |
| 4 | `classification_note` présente si confiance ≠ `haute` | **oui** |
| 5 | Aucun segment nouveau créé sans les 3 conditions du §9 | **oui** |
| 6 | `moment` renseigné uniquement avec un fait daté | **oui** |
| 7 | Ratio CA/effectif cohérent avec le segment, sinon `tier` NULL | non |
| 8 | Doublon vérifié : le compte n'existe pas déjà sous une autre raison sociale ou comme filiale d'un compte présent | **oui** |
| 9 | `companies.sector` (texte libre) non modifié | **oui** |

> **Exception unique et datée au contrôle 2.** Treize comptes ont aujourd'hui un `sector_id` qui n'est pas le parent de leur `segment_id` : ce sont les 11 déplacements de macro en attente d'arbitrage, plus Arkopharma et Laboratoires INELDEA (artefact du passage de Nutraceutique au rang de segment — aucun déplacement à faire). La liste exhaustive est dans `journal-migration.md`. **Cette exception ne couvre aucun compte nouveau** : toute classification postérieure au 09/08/2026 doit satisfaire le contrôle 2 sans dérogation. Elle disparaît à l'arbitrage des 11 déplacements.

```sql
-- Contrôle 8 : doublons et filiales
select name, siren, sector_id from companies
where name ilike '%<fragment du nom>%' or siren = '<siren>';

-- Contrôle de cohérence global, à passer après toute écriture
select count(*) filter (where segment_id is null)                                as sans_segment,
       count(*) filter (where regime_achat is null)                              as sans_regime,
       count(*) filter (where modele_eco is null)                                as sans_modele,
       count(*) filter (where classification_confiance <> 'haute'
                          and classification_note is null)                       as note_manquante,
       count(*) filter (where c.sector_id is distinct from s.parent_id
                          and s.parent_id is not null)                           as macro_incoherent
from companies c left join sector_intelligence s on s.id = c.segment_id;
```

---

## 11. SQL d'insertion et de mise à jour

```sql
-- Nouveau compte
insert into companies (
  workspace_id, name, legal_name, siren, website, hq_location, description,
  lifecycle_status, employee_count, revenue,
  sector_id, segment_id,
  regime_achat, modele_eco, tier, vertical_client, relation_type, moment,
  classification_confiance, classification_note, classified_at, classified_by
)
select
  '98dcd39d-f87b-4f9d-add9-ce76d635953a',
  '<nom>', '<raison sociale>', '<siren>', '<site>', '<siège>', '<description>',
  'prospect', <effectif>, '<ca>',
  s.parent_id, s.id,
  '<regime_achat>', '<modele_eco>', <'tier' ou null>, <'{vertical}'::text[] ou null>,
  '<relation_type>', <'moment' ou null>,
  '<confiance>', <'note' ou null>, now(), '<agent>'
from sector_intelligence s
where s.slug = '<segment_slug>';

-- Reclassement d'un compte existant
update companies c
set segment_id = s.id,
    sector_id  = s.parent_id,
    regime_achat = '<...>', modele_eco = '<...>',
    classification_confiance = '<...>', classification_note = '<...>',
    classified_at = now(), classified_by = '<agent>'
from sector_intelligence s
where s.slug = '<segment_slug>' and c.name = '<nom>';
```

**Note d'implémentation** : `sector_id` est renseigné avec le **parent du segment**. Tant que le front ne lit pas `segment_id`, c'est `sector_id` qui détermine la fiche affichée.

---

## 12. Interdits absolus

1. **Ne jamais créer un segment ou un macro-secteur pour un seul compte.** Rattacher au plus proche et documenter.
2. **Ne jamais créer une catégorie « divers », « autres » ou « groupes diversifiés »** portant un nom présentable. Le seul résidu autorisé est `non-rattache-a-qualifier`, et il est nommé pour gêner.
3. **Ne jamais modifier ni supprimer `companies.sector`** (texte libre historique).
4. **Ne jamais renommer un `slug`.**
5. **Ne jamais renseigner `moment` sans fait daté et sourçable.**
6. **Ne jamais déduire un `tier` d'une donnée manifestement incohérente** — NULL est une réponse valide.
7. **Ne jamais classer un groupe diversifié sur son activité la plus visible** plutôt que sur son activité majoritaire.
8. **Ne jamais laisser `classification_confiance` à `haute` quand un des 4 tests échoue.**
9. **Ne jamais classer une ESN ou un partenaire en `prospect`.**
10. **Ne jamais utiliser le code NAF comme source de classification.** Il est renseigné sur 3 comptes sur 96, et le seul lisible est faux (Groupe IDEC, 8299Z « services administratifs », pour un constructeur-promoteur de 500 M€). Il sert de contrôle, jamais de source.

---

## 13. État actuel et journal des versions

### Photographie au 09/08/2026

| Indicateur | Valeur |
|---|---|
| Comptes classés | **96 / 96** |
| Macro-secteurs | 15 (dont le bac à qualifier) · Segments | 38 |
| `regime_achat` / `relation_type` | 96 / 96 |
| `modele_eco` | 95 / 96 |
| `tier` | 78 / 96 |
| `vertical_client` | 13 / 96 |
| **`moment`** | **1 / 96** |
| Confiance : haute / moyenne / faible | **73 / 20 / 3** — les 23 non-hautes portent toutes leur note |
| Clients · ancien client · pair | 6 · 1 · 1 |

### Chantiers ouverts, par valeur décroissante

1. **Renseigner `moment`** sur les comptes prioritaires — acquisitions, plans annoncés, nominations, échéances de concession sur 12 mois glissants. C'est ce qui transforme une fiche en motif d'appel.
2. **Les 11 déplacements de macro en attente** (voir `journal-migration.md`) : ils déplacent des comptes entre fiches visibles dans l'application.
3. **Implémenter `COALESCE(segment, parent)` côté front**, puis basculer la lecture sur `segment_id`.
4. **Normaliser `revenue`** en colonne numérique et renseigner `siren` — condition d'un contrôle automatique, NAF comprise.
5. **Reprendre les 3 comptes en confiance faible** : Pilatus Groupe, Maman Bulle, Appolonia.

### Journal

| Version | Date | Contenu |
|---|---|---|
| **1.0** | 09/08/2026 | Référentiel initial. 15 macro / 38 segments / 6 attributs orthogonaux + traçabilité. 96 comptes classés. Fondé sur l'analyse des 87 pain points du corpus Kredo et sur la critique de la taxonomie V0.1 |

---

**Documents liés** — subordonnés à celui-ci :
`README.md` (critique de la V0.1 et raisonnement) · `journal-migration.md` (ce qui a été appliqué en base et le rollback) · `classification-96-comptes.csv` (export à plat)
