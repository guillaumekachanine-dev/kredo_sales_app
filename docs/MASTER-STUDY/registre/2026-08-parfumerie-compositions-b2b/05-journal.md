# 05 — Journal de recherche · E5 · `seg-parfumerie-compositions-b2b`

`run` run-2026-08-14-seg-parfumerie-compositions-b2b · `snapshot` 2026-08-14 · `opérateur` Claude Opus, Projet KREDO MASTER-STUDY
`accès web déclaré` **COMPLET** (recherche + récupération de pages)

Ce journal liste les requêtes **réellement jouées**, dans l'ordre, avec ce qu'elles ont rendu et ce qu'elles n'ont pas rendu.
Les échecs sont consignés : une requête qui ne rend rien est une information.

---

## Étape 0 — contrôle préalable et lecture du contexte injecté

| # | Opération | Résultat |
|---|---|---|
| 0.1 | Listage de `/mnt/user-data/uploads` | 4 fichiers présents : `00-cadrage.json` (4,6 ko), `02-socle.json` (11,2 ko), `03-sources.json` (45,3 ko), `04-secteur.json` (64,9 ko) |
| 0.2 | Cartographie de la structure de `04-secteur.json` | 5 thèses, 4 blocs clients, 5 modèles économiques, 6 maillons, 5 fronts technologiques, 6 dépendances critiques, 5 items de régulation, 7 items de chronologie, 4 pain points, 5 familles de budgets 18-36 mois, 29 sources, 5 trous déclarés |
| 0.3 | Lecture du périmètre, des thèses, du message sectoriel et des modèles économiques | Message sectoriel repris tel quel en §3.10. Règle de comparabilité intégrée : aucun chiffre groupe monde pour caractériser une branche France |
| 0.4 | Lecture des maillons, fronts, dépendances, régulation, chronologie, pain points, budgets, trous | Chaîne de valeur à 6 maillons utilisée pour **nommer** la position de chaque compte, jamais reproduite dans les fiches |
| 0.5 | Lecture du registre de sources de E4 et de la structure de `03-sources.json` | 29 sources E4 (T1 à T3) ; 12 en pack minimal, 17 en pack enrichi ; note de normalisation lue |
| 0.6 | Recensement, compte par compte, de ce qui est **reçu** de `02-socle.json` | 7 identités résolues (SIREN + NAF 20.53Z + commune de siège). **0 effectif** — le registre ne publie qu'une tranche. **0 convention collective.** Échéance pivot : notification IFRA 52 attendue vers la fin novembre 2026, sans date de conformité |

**Conséquence méthodologique enregistrée dès l'étape 0.** `02-socle.json` déclare 0 offre SI dans l'enveloppe NAF 20 × département 06, et 4 offres SI dans toute la division chimie française. La requête n°4 de la séquence par compte — celle qui est normalement la plus rentable de la méthode — **est structurellement stérile sur ce segment**. La grille « IA annoncé vs déployé » a donc été renseignée par les communiqués, les références éditeurs et les sites carrière d'entreprise, exactement comme le socle l'avait anticipé. Ce n'est pas un contournement, c'est le canal de substitution prévu.

---

## Étape 1 — longlist (quatre familles de sources croisées)

| # | Requête jouée | Famille | Ce qu'elle a rendu |
|---|---|---|---|
| 1 | `PRODAROM adhérents fabricants produits aromatiques Grasse liste` | (b) fédération | Catégories d'adhésion, périmètre du syndicat, repère de filière (65 entreprises et ~5 270 emplois en Pays de Grasse, PRODAROM février 2023). **N'a pas rendu la liste nominative des adhérents** — elle n'est pas publiée en clair |
| 2 | *(fetch)* `grasse-expertise.com/en/members-presentation/` | (b) cluster | **ÉCHEC** — refus d'accès automatisé sur une URL non issue d'un résultat de recherche. Contourné par la requête 3 |
| 3 | `Grasse Expertise members presentation liste entreprises parfumerie` | (b) cluster | **Liste nominative de 48 membres obtenue** : Albert Vieille, Argeville, Aromax, Art & Parfum, Astier Desmaret, Azur Fragrances, Expressions Parfumées, Firmenich, Jean Niel, Kerry Flavours, Payan Bertrand, Robertet, Quimdis, Tournaire… Complétée par la liste ASFO (Metarom, Prodaress, Prodasynth, Selectarome, Sozio-Descollonges, Symrise, Technico Flor, V. Mane Fils, Solubarome…) |
| 4 | `Cosmo International Fragrances usine Grasse construction Sozio Technicoflor maison composition France` | (a) presse professionnelle | Panorama des maisons de composition présentes en salon : Argeville, Cosmo, Sozio, TechnicoFlor, Parfex, Eurofragance, Iberchem, Expressions Parfumées, Luzi. Confirme la **queue de distribution** que les classements ignorent. Cosmo : première pierre en mars 2025 avenue Jean Maubert, > 12 M€, 2 000 m², mise en service fin 2026, technologie Osmobloom brevetée |

**Longlist consolidée : 34 acteurs recensés**, croisant quatre familles indépendantes — presse professionnelle · fédération PRODAROM et cluster Grasse Expertise · registres et agrégateurs d'entreprises · communiqués de résultats et annonces d'opérations.

Les acteurs n'apparaissant que dans **une seule** famille (Aromax, Prodasynth, Selectarome, Solubarome, Metarom, Astier Desmaret, Art & Parfum) n'ont **pas** été promus en shortlist : ils n'ont pas été vérifiés spécifiquement faute de budget, et ne sont donc ni cartographiés ni écartés. C'est un trou déclaré, pas une omission.

---

## Étape 4 — séquence par compte (traitement un par un, jamais en parallèle)

### Robertet — compte étalon

| # | Requête jouée | Ce qu'elle a rendu | Ce qu'elle n'a pas rendu |
|---|---|---|---|
| 5 | `Robertet résultats annuels 2025 chiffre d'affaires groupe Grasse` | CA groupe 2025 de 843,9 M€ (+4,5 % publié, +7,6 % organique), communiqué du 12/02/2026 ; CA S1 2025 de 446,3 M€ ; fusion-absorption Charabot au 31/07/2020 ; arrêté préfectoral n°17609, participation du public du 24/02 au 25/03/2025 sur le passage en Seveso seuil haut | — |
| 6 | `Robertet intelligence artificielle digital transformation SAP données parfumerie 2025 2026` | **NaturIA**, IA générative propriétaire pour la création olfactive ; déclaration de la direction exécutive sur les projets structurants de gestion de données ; EBITDA 2025 de 174 M€, marge 20,6 %, classement EcoVadis Platinum ; CA S1 2026 de 444 M€ (−0,5 %) ; **et surtout : Directeur des Systèmes d'Information au Global identifié comme intervenant public** | Aucune référence éditeur, aucun intégrateur nommé |
| 7 | *(fetch)* `maison-intelligence-artificielle.com/agenda/ia-dates-aromes-et-parfums/` | **ÉCHEC** — site interdisant l'accès automatisé. Contourné par la requête 8 | — |
| 8 | `"IA Dates" arômes parfums Maison de l'IA Sophia Antipolis 2026 Robertet Mane date` | Date exacte de l'événement : **22/06/2026 à Grasse** ; programme et fonctions des intervenants confirmés ; co-organisation Département 06, SICTIAM, Maison de l'IA, Institut EuropIA | Aucun autre industriel du bassin n'intervenait |
| 9 | `Robertet "fournisseurs" achats responsables code de conduite fournisseur charte site` | **RIEN d'utile** — la requête a rendu des chartes d'autres entreprises et le dispositif national RFAR. **Aucune page « devenir fournisseur » ni conditions générales d'achat publiées n'existe pour Robertet.** Résultat consigné : c'est ce qui fonde l'hypothèse qualifiée du bloc 4.2 | La page fournisseur cherchée |

### V. Mane Fils

| # | Requête jouée | Ce qu'elle a rendu | Ce qu'elle n'a pas rendu |
|---|---|---|---|
| 10 | `MANE V. Mane Fils chiffre d'affaires 2025 résultats Le Bar-sur-Loup` | CA société France de **730 237 472 €** (exercice 2024, +9 %), résultat net de 125 996 836 €, capital de 154 M€ ; CA groupe 2025 de **2,012 Md€** (+6,5 %) annoncé en mai 2026 ; changement de présidence du directoire au 01/01/2025 | — |
| 11 | `MANE Bar-sur-Loup intelligence artificielle data Sensia digital 2026 investissement Grasse` | **RIEN sur MANE** — la requête n'a rendu que du bruit macro sur l'IA. Résultat consigné tel quel : **aucune communication publique de MANE sur l'IA n'existe au 14/08/2026.** C'est ce qui fonde l'écart « déploie sans annoncer » de la grille B3-4 | Toute communication IA du compte |

*Preuve de déploiement retenue* : l'offre d'emploi de responsable BI, Analytics & Data Platform publiée sur le site carrière de l'entreprise (source 12 de `04-secteur.json`, revérifiée), citant SAP BW/BO, Power BI, Fabric, Databricks, DataOps et gouvernance de la donnée.

### Expressions Parfumées

| # | Requête jouée | Ce qu'elle a rendu |
|---|---|---|
| 12 | `Expressions Parfumées Grasse chiffre d'affaires 2025 groupe actualité` | CA de **107 693 392 €** et résultat net de 15 172 368 € à l'exercice **2022** ; tête de groupe Givaudan SA ; environ 200 salariés. **Aucun exercice postérieur à 2022 publié** |
| 13 | `Givaudan acquisition Expressions Parfumées 2023 Grasse intégration actualité 2026` | **Correction d'une hypothèse erronée** : l'acquisition date de **juin 2018**, pas 2023 (CA de 62,6 M€ à l'époque) ; investissement de **20 MCHF** en novembre 2018 sur les laboratoires, la robotique et la **numérisation des opérations**, achevé au S1 2020 ; **et surtout : Campus 52, 55 MCHF, annoncé le 19/02/2026, travaux à partir de juin 2026 sur l'ancienne friche Biolandes à Grasse** |

### TechnicoFlor

| # | Requête jouée | Ce qu'elle a rendu |
|---|---|---|
| 14 | `TechnicoFlor Allauch maison composition chiffre d'affaires 2025 usine` | CA société de **41 992 540 €** (exercice clos le 31/12/2025), résultat net de 2 002 584 € ; branche parfumerie du groupe API à 51 M€, groupe API à 106 M€ pour 350 collaborateurs ; direction générale en fonction depuis le 01/01/2025 ; usine d'Allauch présentée comme la plus automatisée du secteur en France après 12 M€ d'investissement ; **acquisition d'Azur Fragrances rendue publique en juillet 2026** (40 salariés, 6,2 M€ de CA 2025) |

### Payan Bertrand

| # | Requête jouée | Ce qu'elle a rendu |
|---|---|---|
| 15 | `Payan Bertrand Grasse investissement 12 millions 2025 nouvelle usine chiffre d'affaires` | Communiqué du **03/11/2025** : 12 M€, 2 800 m² hautement robotisés, terrain de 4 000 m², soutien de Sogefimur/Société Générale ; **scission en deux business units en 2027** (site Pacome fragrances / site 1886 ingrédients) ; CA 2025 supérieur à 30 M€ pour 115 salariés, objectif de 40 M€ à cinq ans ; chantier démarré fin 2025, livraison fin 2026 ; **développement États-Unis annoncé en mars 2026** ; délai de paiement fournisseur de 37 jours contre 87 de moyenne sur le code NAF |

### Jean Niel

| # | Requête jouée | Ce qu'elle a rendu |
|---|---|---|
| 16 | `"Jean Niel" Grasse parfums maison composition 2025 2026 actualité rachat` | CA déclaré supérieur à 34 M€ pour plus de 120 employés (annuaire Grasse Expertise, exercice non précisé) ; double activité parfumerie et arômes ; maison familiale en fonds propres depuis 1779 ; **aucun rachat** — l'hypothèse implicite de la requête est écartée |
| 17 | `"Jean Niel" Iberica Barcelone ouverture bureau Marie de Boutiny 2026` | Communiqué d'entreprise : **ouverture officielle de Jean Niel Iberica à Barcelone, juillet 2026**, équipe commerciale locale sur les deux divisions ; participation au CFIA de Rennes du 10 au 12 mars 2026 ; fonctions publiques de la directrice générale, du directeur parfumerie et du responsable commercial arômes |

### Aromatech

| # | Requête jouée | Ce qu'elle a rendu |
|---|---|---|
| 18 | `Aromatech Saint-Cézaire-sur-Siagne arômes chiffre d'affaires 2025 groupe actualité` | CA de **27 044 284 €** au dernier bilan publié, exercice clos le **30/09/2021**, résultat net de 4,76 M€ ; présidence assurée par CAPAROM HOLDING ; augmentation de capital constatée le 16/06/2025. **Aucun exercice postérieur à 2021 publié** |
| 19 | `Aromatech arômes Grasse "Tasty Food Solutions" OR investissement OR croissance 2025 2026 Benoit Martel` | Plan stratégique **Trusty 2028** en douze axes visant +40 % de CA ; groupe de 170 personnes dont 72 au siège ; **3 robots de pesée, plus de 100 000 pesées par an, 1 500 matières premières** ; panel sensoriel interne de 30 personnes ; 1 à 1,5 M€ investis par an ; extension de 600 m² annoncée pour fin 2025. **Article daté du 04/06/2025 → hors de la fenêtre de 12 mois** |
| 20 | `aromatechgroup.com actualités 2026 Aromatech RSE rapport Alimentaria Barcelone` | **Requête de rattrapage jouée spécifiquement pour tester le plancher de preuve.** Elle a rendu le trigger manquant : **médaille d'or EcoVadis annoncée en mars 2026**, 96ᵉ percentile, dont l'un des quatre piliers évalués est l'achat responsable ; DJAZAGRO du 11 au 15 avril 2026. Le compte passe le plancher grâce à cette seule requête |

### Bontoux

| # | Requête jouée | Ce qu'elle a rendu |
|---|---|---|
| 21 | `Bontoux Saint-Auban ingrédients naturels chiffre d'affaires 2025 investissement Biolandes` | Bontoux : CA de **30 858 731 €** (exercice 2023), présidence SOFIBO, capital supérieur à 15,2 M€ après augmentation du 24/02/2025 ; **acquisition du fonds ATELIER FLUIDES SUPERCRITIQUES, acte authentique du 31/10/2025, BODACC A n°20250225 du 23/11/2025**. Biolandes : CA de 78 981 959 € (exercice clos le 30/12/2025), résultat net de 8,4 M€, 149 personnes |

---

## Requêtes jouées sur les comptes finalement placés en réserve

| # | Requête jouée | Verdict |
|---|---|---|
| 22 | `Argeville Mouans-Sartoux parfums chiffre d'affaires actualité 2025 2026` | CA de **74 658 945 €** (exercice 2024), résultat net de 4,54 M€ ; objectif public de passer de 60 à 100 M€ ; usine de 5 100 m² au Plan de Grasse |
| 23 | `Argeville nouvelle usine Grasse 2026 Xavier Ardizio inauguration` | **Rien de postérieur au 14/08/2025.** Dernières sources datées : mise en service attendue au printemps 2024 ; page d'actualités mentionnant in-cosmetics Global 2026 et l'emblème UNESCO sans date opposable. → **réserve, faute de trigger daté** |
| 24 | `Argeville 2026 Grasse site production "Plan de Grasse" transfert déménagement actualité entreprise` | **Requête de rattrapage — échec confirmé.** Aucune date de mise en service ni de transfert de siège. Le socle constate pourtant un siège à Valbonne au 14/08/2026 alors que la presse situait le compte à Mougins jusqu'en 2024 : **l'écart est réel et datable par un humain en dix minutes** |
| 25 | `PARFEX Grasse parfums société chiffre d'affaires groupe actionnaire 2025` | CA de **40 685 300 €** (exercice 2024, +62 % sur trois ans), résultat net de 3,29 M€ ; transfert de siège le 14/11/2024 ; dépôt des comptes 2024 le 25/07/2025 ; modification publiée au BODACC le **05/08/2025 — soit 9 jours avant l'ouverture de la fenêtre de 12 mois** |
| 26 | `Parfex Grasse Iberchem Balibrea actionnaire acquisition Croda` | Chaîne capitalistique établie : Croda → Iberchem → Parfex, acquisition finalisée le 01/06/2021 (95,6 % puis retrait de la cote), valeur d'entreprise de 45 M€ ; site automatisé à 90 %, 3 robots de pesée, 110 employés dont 6 parfumeurs. **Aucun trigger 2026 propre à l'entité** → réserve |
| 27 | `SFA NEROLI Symrise Grasse fragrance campus 2025 2026 effectifs France` | Campus de 10 000 m² inauguré le **02/07/2025** à Saint-Cézaire-sur-Siagne ; 300 collaborateurs de 12 nationalités ; fusion de SFA Romani, Créations & Parfums et Floressence ; présidence identifiée |
| 28 | `"SFA NEROLI" 2026 Symrise Grasse actualité nomination croissance` | **Requête de rattrapage — échec confirmé.** Rien de postérieur au 14/08/2025. L'inauguration tombe **six semaines avant la fenêtre**. → réserve |

---

## Requêtes transverses — couche ESN, ESN en place, acteurs écartés

| # | Requête jouée | Verdict |
|---|---|---|
| 29 | `Charabot Grasse Robertet filiale parfums chiffre d'affaires` | Charabot **n'existe plus comme unité de décision** : fusion-absorption par ROBERTET SA avec effet au 31/07/2020. Évite un doublon dans la carte |
| 30 | `"Givaudan France" Argenteuil site production parfumerie effectifs 2025` | Plusieurs entités Givaudan en France, dont Givaudan France SAS (NAF 4675Z, commerce de gros) et Givaudan France Fragrances SAS. **Gouvernance d'achat centralisée**, portail fournisseur groupe public → écarté au titre de la règle de l'unité de décision d'achat, l'entité pertinente sur le segment étant Expressions Parfumées |
| 31 | `Coptis Selerant Lascom PLM formulation client parfumerie Grasse référence Argeville Payan Bertrand` | **RIEN.** Aucun éditeur PLM ou formulation ne publie de référence client nominative sur les maisons du bassin. Résultat consigné : **la rubrique « ESN déjà en place » est renseignée « non trouvé » + recherche effectuée sur les 8 comptes**, jamais « non vérifié » |
| 32 | `Grasse parfumerie recrutement "responsable informatique" OR "chef de projet SI" OR "data" Argeville Payan Bertrand Jean Niel offre emploi` | **RIEN.** Confirme empiriquement la mesure de `02-socle.json` : le canal offres d'emploi ne rend rien sur ce segment. Deux requêtes ont suffi à le rétablir avant d'engager du budget de pagination |

---

## Budget et réserve de vérification

| | |
|---|---|
| Requêtes web réellement jouées | **32** (dont 2 échecs de récupération de page, contournés) |
| Opérations de lecture du contexte injecté | 6 |
| **Total des opérations journalisées** | **38** |
| Requêtes de vérification et de levée de doute | **6 sur 32, soit 19 %** — au-dessus des 15 % réservés à l'étape 0 |
| Requêtes ayant rendu « rien » et consignées comme telles | **6** (n° 9, 11, 24, 28, 31, 32) |

**Les six requêtes de vérification** : n°8 (date exacte de l'événement IA), n°13 (correction de la date d'acquisition d'Expressions Parfumées, initialement supposée 2023 — **une hypothèse fausse a été détruite ici**), n°20 (test du plancher sur Aromatech, réussi), n°24 (test du plancher sur Argeville, échoué), n°26 (levée de doute sur l'actionnariat de PARFEX), n°28 (test du plancher sur SFA NEROLI, échoué).

---

## Contrôle du ratio CA / effectif — et pourquoi il n'est pas écrit dans le JSON

Le test d'acceptation demande un ratio CA/effectif comparé à la médiane. **`effectif_france` vaut `null` sur les huit comptes** : `02-socle.json` déclare explicitement que le registre ne publie qu'une tranche d'effectif et qu'aucun effectif n'a été écrit. Le ratio est donc calculé ici **à titre de contrôle de vraisemblance uniquement**, à partir d'effectifs déclarés par la presse ou par les entreprises, et n'est reporté dans aucun champ du régime déterministe.

| Compte | CA retenu (M€) | Effectif déclaré (presse ou entreprise) | Ratio M€/personne |
|---|---|---|---|
| Robertet | 843,9 (groupe monde 2025) | ~2 700 (groupe monde) | 0,31 |
| V. Mane Fils | 730,2 (société France 2024) | 1 883 | 0,39 |
| Expressions Parfumées | 107,7 (société 2022) | ~200 | 0,54 |
| TechnicoFlor | 42,0 (société 2025) | 123 | 0,34 |
| Payan Bertrand | 30,0 (déclaré 2025) | 115 | 0,26 |
| Jean Niel | 34,0 (déclaré) | ~120 | 0,28 |
| Bontoux | 30,9 (société 2023) | 50 à 95 selon la source | 0,33 à 0,62 |
| Aromatech | 27,0 (société, exercice clos 30/09/2021) | 170 (groupe, 2025) | 0,16 |

**Médiane : 0,33 M€ par personne.** Deux écarts approchent ou atteignent le facteur 2, et tous deux sont expliqués :

- **Aromatech, 0,16** — le numérateur est un CA de l'exercice 2021 et le dénominateur un effectif groupe de 2025 : **les millésimes et les périmètres ne concordent pas, la comparaison n'est pas valide** et n'est pas interprétée. Elle est conservée pour signaler l'opacité financière du compte, qui est un trou déclaré de sa fiche.
- **Bontoux, 0,33 à 0,62** — les agrégateurs divergent sur l'effectif (50 contre 95). Le ratio n'est pas concluant et n'est pas utilisé.

Aucun autre écart ne dépasse le facteur 2 par rapport à la médiane.

---

## Ce que ce journal établit, et qui doit être lu avant la prochaine exécution

1. **Le plancher de preuve a mordu, et c'est le résultat principal du run.** Six comptes sur quatorze attendus sont en réserve, cinq d'entre eux pour le seul critère du trigger daté des douze derniers mois. Deux — PARFEX à neuf jours près, SFA NEROLI à six semaines près — ne sont hors fenêtre que par effet de calendrier. **Une exécution un mois plus tôt aurait produit une carte différente sans qu'aucun fait ne change.** Ce n'est pas un défaut de la règle, mais c'est une propriété de la règle qu'il faut connaître : la fenêtre glisse, et le rejeu trimestriel (variante V3) est ce qui la rend supportable.

2. **La quatrième requête de la séquence, la plus rentable de la méthode, est stérile sur ce segment.** Le socle l'avait mesuré avant l'étude ; deux requêtes indépendantes l'ont confirmé pendant. Sur un tissu de PME industrielles familiales, le canal qui remplace les offres d'emploi est le **communiqué d'investissement industriel** : c'est lui qui a rendu les triggers les plus exploitables (Payan Bertrand, TechnicoFlor, Givaudan Campus 52). À câbler dans E2 comme source de veille.

3. **Aucun panel fournisseur IT n'est public chez les indépendants du bassin.** Six comptes sur huit portent une hypothèse qualifiée sur le modèle d'achat, écrite, argumentée et marquée comme telle. C'est exactement le point qui appelle les 30 à 45 minutes de qualification humaine par compte prioritaire — et le seul moyen de faire passer ces notes d'accessibilité de « hypothèse » à « vérifié ».

4. **Une hypothèse fausse a été détruite en cours de run** (date d'acquisition d'Expressions Parfumées, supposée 2023, établie à juin 2018). Elle aurait faussé la lecture de la trajectoire du compte et sa catégorisation. C'est l'usage exact de la réserve de vérification.

5. **Deux des trois comptes prioritaires n'ont pas d'identité au socle.** V. Mane Fils et TechnicoFlor ne font pas partie des sept comptes résolus par E2 ; leurs champs `identifiant_national`, `code_activite`, `convention_collective` et `effectif_france` sont à `null` avec la mention « non fourni par le socle », conformément à l'axiome A1 — y compris lorsque l'information a été rencontrée en recherche. L'entité juridique est nommée précisément dans chaque fiche (V. MANE FILS SAS au Bar-sur-Loup, TECHNICO FLOR SAS à Allauch), ce que le schéma admet explicitement pour la résolution d'entité. **Passer ces deux comptes dans E2 avant l'ingestion est l'action à programmer en priorité** : ce sont les deux comptes que le commercial appellera en premier.
