# Cartographie concurrentielle — BTP, segment grands travaux et infrastructures

Secteur : Construction (BTP) · Segment : travaux publics et construction d'envergure — grandes infrastructures publiques, grands projets immobiliers, ouvrages stratégiques
Géographie : France entière · Compte étalon : **Groupe Eiffage**
Snapshot : **08/08/2026** · Version 1.0 · Exercice de référence : dernier exercice clos publié (2025)
**Confiance globale : MOYENNE** — voir l'avertissement de production ci-dessous

---

## ⚠ Avertissement de production (étape 0 du prompt)

L'accès web de l'environnement d'exécution est **partiel** : la recherche fonctionne, mais la consultation directe des sources primaires (`WebFetch`) est bloquée par la politique réseau. Concrètement :

- Aucun communiqué de résultats, document d'enregistrement universel, page de registre d'entreprise ou avis d'attribution n'a pu être **ouvert et lu**.
- Tous les chiffres ci-dessous proviennent d'**extraits de ces documents restitués par le moteur de recherche**, ou de la presse professionnelle qui les cite.
- Conséquence méthodologique : aucune donnée de cette étude ne peut être qualifiée **T1**. Le meilleur statut atteignable ici est « T2 rapporté ». Les identifiants nationaux (SIREN), les codes d'activité déclarés et les conventions collectives par entité n'ont pas pu être vérifiés compte par compte.

Cette étude est donc **exploitable pour orienter une action commerciale, pas pour être citée telle quelle devant un client**. Chaque chiffre doit être reconfirmé sur sa source primaire avant usage externe. Le tableau de l'annexe A indique, pour chaque donnée, ce qu'il reste à vérifier.

---

## 1. Synthèse exécutive

### Le marché en 5 points

1. **Structure verrouillée, et le marché vient de le prouver lui-même.** Pour le génie civil des EPR2 — le plus gros programme de travaux français de la décennie — EDF ne met pas les majors en concurrence : Vinci, Bouygues et Eiffage se regroupent, NGE et Fayat complètent le dispositif. Ces cinq noms *sont* la carte du segment ; les autres jouent une autre partie.
2. **Le marché historique se retourne pendant que les marchés stratégiques accélèrent.** Les carnets de commandes des travaux publics sont, en janvier 2026, à un niveau inobservé depuis octobre 2016 hors crise sanitaire ; les marchés conclus reculent de 12,8 % en février 2026 ; le bloc collectivités est attendu à −6 % sur 2026. En face : nucléaire, ferroviaire, eau, datacenters et défense tirent la croissance.
3. **La croissance a changé d'adresse.** Eiffage affiche +8 % de CA 2025 et un carnet record, tiré par l'Europe hors France et par l'énergie. NGE passe 5 Md€ (+8,3 %) sur l'eau, le ferroviaire et les énergies décarbonées. Les acteurs restés sur la route et la commande publique locale encaissent le choc.
4. **Le prescripteur numérique du secteur est Eiffage**, avec un partenariat IA structurant et un discours de DSI centré sur le passage à l'échelle — pas sur l'expérimentation. Vinci Construction industrialise (équipe Data & IA dédiée), Bouygues Construction mise sur la robotique de chantier.
5. **Deux échéances datées créent une fenêtre en 2026** : la réception obligatoire de la facture électronique au **1er septembre 2026** (émission simultanément obligatoire pour les grandes entreprises et les ETI), et la montée en charge de NIS2. Ces deux sujets touchent tous les comptes de la carte, quel que soit leur segment.

### Les 3 comptes à attaquer maintenant

| Compte | Appétence /25 | Pourquoi maintenant | Porte d'entrée |
|---|---|---|---|
| **Colas** (Bouygues) | 21 | Directrice de la transformation digitale nommée au **01/05/2026**, entrée au comité de direction générale, rattachée au DG — fenêtre de réorganisation de 6 à 12 mois | La nouvelle gouvernance digitale ; sujet d'entrée = mise à l'échelle des données de production industrielle |
| **NGE** | 20 | +8,3 % de CA, 4 000+ recrutements en 2025, effectifs doublés depuis 2019 — la structure SI suit rarement une croissance pareille | Croissance et intégration : le SI d'un groupe de 5 Md€ n'est pas celui d'un groupe de 2,5 Md€ |
| **Bouygues Construction** | 19 | Le Chief Digital Officer est parti chez Forvia — poste ou périmètre en recomposition ; par ailleurs partenariat robotique signé fin 2025 et site Scale One en ouverture définitive à l'été 2026 | L'industrialisation du programme robotique : données, intégration, cybersécurité industrielle |

### Le message sectoriel à porter

> « Vos volumes se déplacent du local vers le nucléaire, le ferroviaire, l'eau et les datacenters. Ces marchés-là n'ont ni les mêmes exigences documentaires, ni les mêmes contraintes de traçabilité, ni le même niveau de sécurité informatique. Nous outillons ce déplacement. »

C'est la seule phrase de cette étude qu'une ESN généraliste ne peut pas improviser : elle suppose de connaître à la fois le retournement de la commande publique locale et la composition du groupement EPR2.

### Les 3 incertitudes de l'étude

1. **Les périmètres France par branche ne sont pas publics** pour les trois leaders. Les parts relatives ont donc été établies sur un critère qualitatif documenté (voir §3), pas sur un calcul.
2. **Le groupement EPR2 est rapporté par la presse professionnelle, pas confirmé par un avis d'attribution consulté.** C'est le fait le plus structurant de cette carte, et c'est aussi celui qu'il faut vérifier en premier.
3. **Les rattachements capitalistiques des petits acteurs sont un piège actif** : un candidat de la shortlist (ETPO) s'est révélé être une filiale d'un compte déjà cartographié, un autre (Bessac) reste à vérifier. Voir §7.

---

## 2. Matrice visuelle

Axe X = empreinte métier (part de la chaîne de valeur couverte, 1-5). Axe Y = maturité numérique et d'innovation (1-5). Taille = CA du périmètre pertinent. ★ = compte étalon.
Le JSON de génération est en annexe C ; le rendu se produit avec `prompts/cartographie-concurrentielle/assets/matrice-concurrentielle.html`.

```text
Maturité
numérique
   5 |                                    [EIF]★
     |                              [VCI]        [BYG/BYC]
   4 |                    [SPB]                  [COL]
     |
   3 |          [HGC]           [NGE]      [GCC]
     |                    [DBA]
   2 |    [NEO]      [BSC]      [LGR]      [RZB]
     |          [BCH]
   1 |    [CHA]
     +--------------------------------------------------
        1         2         3         4         5    Empreinte métier

EIF Eiffage ★ · VCI Vinci Construction · BYC Bouygues Construction · COL Colas
NGE NGE · RZB Razel-Bec (Fayat) · SPB Spie Batignolles
DBA Demathieu Bard · GCC GCC · LGR Léon Grosse
HGC Hoffmann Green · NEO Néolithe · CHA Charier · BCH Baudin Châteauneuf · BSC Bessac
```

**Lecture commerciale de la carte.** Le quadrant bas-droite — empreinte métier large, maturité numérique en retrait — est la zone la plus rentable pour une ESN : un besoin étendu que le compte n'a pas les moyens de traiter en interne. **Razel-Bec, GCC et Léon Grosse y sont**, et Colas y était encore il y a un an. Le quadrant haut-droite (Eiffage, Vinci, Bouygues) est riche mais fermé : ces comptes achètent par panel et attendent des références comparables.

---

## 3. Segmentation : comment les catégories ont été tranchées

**La table de décision du prompt n'a pas pu être appliquée telle quelle.** Elle repose sur une part relative calculée sur un périmètre homogène (branche × France × exercice). Or aucun des trois leaders ne publie le chiffre d'affaires France de sa branche construction. Appliquer la formule aurait exigé de descendre un chiffre monde au niveau France par une règle de trois — ce que le prompt interdit explicitement.

**Critère de substitution retenu, documenté** : la capacité à porter les projets les plus complexes du segment, mesurée par un fait observable — **la composition du groupement retenu pour le génie civil des EPR2** (Vinci, Bouygues, Eiffage, complétés par NGE et Fayat), croisée avec le CA de branche monde comme critère ordinal.

C'est méthodologiquement inférieur à un calcul, et c'est dit. C'est aussi commercialement plus juste : sur ce segment, la capacité à être retenu sur un programme de 10 Md€ de génie civil discrimine mieux les acteurs que trois points de chiffre d'affaires.

| Catégorie | Comptes retenus | Justification |
|---|---|---|
| **Leaders** (3/3) | Vinci Construction, Bouygues (Bouygues Construction + Colas), Eiffage ★ | Les trois groupes du cœur du groupement EPR2 ; seuls acteurs couvrant la chaîne de valeur de bout en bout, du financement-concession à la maintenance |
| **Challengers** (3/3) | NGE, Fayat (Razel-Bec), Spie Batignolles | NGE et Fayat sont explicitement les 4e et 5e du secteur et complètent le groupement EPR2 ; Spie Batignolles, à 2,58 Md€, joue la même partie sur un périmètre plus étroit |
| **Mid-market** (3/3) | Demathieu Bard, GCC, Léon Grosse | Entre 0,9 et 2,1 Md€, positionnement solide, ambition affichée mais périmètre partiel |
| **Outsiders émergents** (2/2, **quota réalloué**) | Hoffmann Green Cement Technologies, Néolithe | Voir l'encadré ci-dessous |
| **Outsiders niche** (2/3, **1 slot non pourvu**) | Charier, Baudin Châteauneuf (+ Bessac, sous réserve de vérification capitalistique) | Positionnement mono-segment ou régional assumé |

> **Quota réalloué — et pourquoi c'est un résultat, pas un contournement.**
> Sur le périmètre strict des *entreprises de travaux*, ce segment ne comporte pas d'outsider émergent : les barrières à l'entrée (capacité financière, cautions, références exigées aux appels d'offres, capacité à mobiliser des milliers de compagnons) rendent l'émergence d'un nouvel entrant crédible pratiquement impossible en dix ans. **L'innovation à trajectoire ascendante se situe en amont de la chaîne de valeur, chez les matériaux.** Le quota a donc été réalloué là, en le disant. Commercialement, ces acteurs sont d'ailleurs adressables par une ESN — jeunes, cotés ou financés, sans SI historique.
>
> **Slot niche non pourvu.** Le troisième acteur de niche n'a pas été identifié dans le budget de recherche imparti. Conformément à la règle, le slot reste vide plutôt que d'être comblé par un acteur mal qualifié.

---

## 4. Fiche du compte étalon — GROUPE EIFFAGE ★

### Bloc 1 — Identité et cadre

| | |
|---|---|
| Raison sociale | Eiffage SA (société cotée, Euronext Paris) |
| Périmètre retenu | Branches **Infrastructures** et **Construction**. Énergie Systèmes, Concessions et Immobilier sont cités, non analysés |
| CA groupe 2025 | **25,3 Md€**, +8 % en réel, +4,8 % en organique |
| CA branche Infrastructures 2025 | **9,2 Md€**, +10,0 % (+8,2 % à périmètre comparable) |
| CA branche Construction 2025 | **4,1 Md€**, +2,7 %, après deux années de repli |
| CA « Travaux » (agrégat groupe) | **21,3 Md€**, +9,2 % — contribution au résultat opérationnel courant ~1 Md€, +15,8 %, marge portée à **4,6 %** contre 4,3 % en 2024 |
| Effectif | ~**87 000** collaborateurs (monde). *Effectif France non confirmé dans cette étude* |
| Actionnariat | Plus de **65 000 salariés actionnaires détenant près de 20 % du capital** — trait distinctif majeur, y compris pour un fournisseur |
| Carnet de commandes | **29,9 Md€** au 31/12/2025 (+3 %), puis **31,1 Md€ à fin T1 2026** (+5 %), niveau record |
| Code d'activité / convention collective | Non vérifié par entité (accès registre bloqué). Cadre applicable au segment : conventions nationales des **Travaux publics** — IDCC **1702** (ouvriers), **2614** (ETAM), **3212** (cadres), brochure 3005. Particularité utile : contrairement au bâtiment, **le seuil de 10 salariés n'existe pas dans les TP** — même IDCC quelle que soit la taille |

**Régime réglementaire porteur de besoins SI** : facturation électronique — réception obligatoire au 01/09/2026 et émission obligatoire à la même date pour les grandes entreprises et les ETI, transit par plateforme agréée, formats structurés (Factur-X, UBL, CII), sanctions de 500 € à défaut de plateforme puis 1 000 € par trimestre, 15 € par facture non conforme. NIS2 pour la sécurité. RE2020 avec paliers 2025 / 2028 / 2031 côté bâtiment.

### Bloc 2 — Métier et chaîne de valeur

**Fournisseurs** : cimentiers et matériaux (dont acteurs bas carbone émergents), carrières intégrées, loueurs de matériel, sous-traitants spécialisés, éditeurs et intégrateurs.
**Création de valeur propre** : conception-construction et réalisation d'ouvrages d'art, de génie civil, de routes, de réseaux ; puis exploitation via les concessions — c'est ce continuum travaux → concession qui distingue Eiffage et Vinci de tous les autres.
**Clients principaux** : État et collectivités, sociétés concessionnaires, opérateurs de réseaux (eau, énergie, ferroviaire), grands comptes privés industriels, désormais opérateurs de datacenters.

**Contrats et faits marquants récents**
- Génie civil de **trois usines de traitement d'eau du SEDIF**, en groupement avec VINCI Construction, pour le compte de Veolia — **plus de 400 M€**.
- Génie civil du Grand Paris Express (lignes 15 Sud, 16, 14 Sud) et prolongement d'Eole / RER E.
- Participation portée à **29,40 %** dans Getlink ; contrat de concession du réseau de chaleur parisien signé en groupement ; acquisition de **74,9 % de Hand & Werk**, spécialiste allemand des datacenters.
- Membre du groupement pressenti pour le génie civil des **EPR2** *(rapporté par la presse professionnelle — à confirmer)*.

### Bloc 3 — Les six grilles

| Grille | Lecture | Note |
|---|---|---|
| **Financière** | 25,3 Md€ (+8 %), résultat net au-dessus du milliard en 2025, marge travaux en progression, carnet record. Croissance étrangère forte : près de 5 Md€ d'activité travaux en Allemagne, Pays-Bas et Espagne, +16,6 % | — |
| **Empreinte métier** | Maximale sur le segment : conception, réalisation, financement, exploitation. Seul Vinci offre la même amplitude | **5/5** |
| **Réputation** | Forte. L'actionnariat salarié massif est un actif d'image et de stabilité sociale rare dans le secteur | Forte |
| **Innovation et R&D** | Investissement réel et visible côté numérique. Développement d'une **IA générative privée fondée sur Gemini**, alimentée par les appels d'offres, rapports techniques et données RH ; **15 projets prioritaires** identifiés collectivement ; socle Vertex AI, BigQuery, Apigee ; cursus « data et IA » créé au sein d'Eiffage University | **5/5** |
| **Politique IA — annoncé vs déployé** | **Annoncé** : partenariat stratégique Google Cloud (27/06/2024) pour développer et mettre en œuvre la stratégie IA du groupe. **Déployé** : plateforme et cas d'usage en production, formation interne structurée. **Écart faible** — c'est le compte le plus avancé de la carte. Le DSI Jean-Philippe Faure formule lui-même l'enjeu : *« notre enjeu numéro un, c'est le passage à l'échelle »* | Écart faible |
| **Avantages concurrentiels** | Continuum travaux-concessions ; actionnariat salarié ; avance numérique reconnue ; repositionnement réussi sur l'énergie et les datacenters | — |
| **Vulnérabilité principale** | Exposition à la commande publique locale française, en repli marqué en 2026 ; croissance de plus en plus tirée par l'étranger, ce qui déporte une partie des décisions hors de France | — |
| **Trajectoire** | Croissance continue, montée en puissance de l'énergie (Énergie Systèmes à 5,7 Md€, +11,8 %), acquisitions européennes ciblées. **Ambitions affichées pour 2026** : activité stable en Infrastructures et Construction, croissance plus modérée en Énergie Systèmes, et ciblage explicite des marchés **datacenters hyperscale, défense et nucléaire** | — |

### Bloc 4 — Couche ESN

- **Organisation SI** : DSI groupe **Jean-Philippe Faure**, qui s'exprime publiquement sur la stratégie IA — signal d'une DSI en position de prescription, pas de support.
- **Chantiers technologiques visibles** : plateforme IA générative privée, gouvernance de la donnée à l'échelle du groupe, acculturation massive des métiers, intégration des acquisitions européennes (dont Hand & Werk).
- **Modèle d'achat** : non documenté dans cette étude. Un groupe de cette taille achète par panel et référencement, avec des exigences RSE fortes — **à vérifier avant toute approche**. → *Voie d'entrée la plus probable : le référencement, ou l'entrée par une filiale opérationnelle sur un besoin borné.*
- **Externalisation** : partenaire cloud structurant identifié (Google Cloud). Les intégrateurs en place ne sont pas documentés ici.
- **Triggers 12 mois** : carnet record à fin T1 2026 (+5 %) ; ciblage annoncé datacenters/défense/nucléaire pour 2026 ; acquisition Hand & Werk ; concession du réseau de chaleur parisien.
- **Indice d'appétence** : capacité à payer **5** · intensité technologique **5** · moment **3** · accessibilité **2** · fit offre **4** → **19/25**

### Bloc 5 — Traduction commerciale

- **Angle d'entrée** : le passage à l'échelle de l'IA, formulé par leur propre DSI comme l'enjeu numéro un — donc un besoin d'ingénierie de données, de MLOps et de conduite du changement, pas de cas d'usage supplémentaires.
- **Accroches** :
  1. « Vous êtes passés du pilote au déploiement sur l'IA générative. C'est là que la plupart des groupes butent sur la qualité des données d'entrée, pas sur le modèle. Comment vous vous organisez ? »
  2. « Vous ciblez les datacenters hyperscale et le nucléaire pour 2026. Ces deux marchés-là ont des exigences documentaires et de traçabilité qui n'ont rien à voir avec vos marchés récurrents. Vous outillez ça comment ? »
- **À ne pas dire** : ne pas arriver avec un discours d'évangélisation sur l'IA — ils sont en avance et l'entendront comme une méconnaissance du dossier. Ne pas proposer de « faire un POC ».
- **Confiance de la fiche** : **MOYENNE**. Trous assumés : effectif France, modèle d'achat et panel fournisseurs, intégrateurs en place, code d'activité et convention collective par entité.

---

## 5. Tableau comparatif

> Les indices d'appétence ci-dessous sont notés sur 25, échelle du prompt **v1.0** utilisée pour ce run. Le retour de test a conduit à passer en v1.1 à une notation 1/3/5 pondérée, sur 35 — voir `retour-de-test.md`, correctif F6. Le classement relatif des comptes reste valable ; seule l'échelle change.

| Compte | Catégorie | CA (exercice, périmètre) | Effectif | Rayon | Empreinte /5 | Maturité num. /5 | Appétence /25 | Angle d'entrée | Confiance |
|---|---|---|---|---|---|---|---|---|---|
| **Eiffage** ★ | Leader | 25,3 Md€ groupe (2025) · Infra 9,2 + Constr. 4,1 | ~87 000 monde | International | 5 | 5 | 19 | Passage à l'échelle de l'IA | Moyenne |
| **Vinci Construction** | Leader | 32,1 Md€ branche monde (2025, +1 %) · **France non publié** | 284 256 groupe monde | International | 5 | 4,5 | 18 | Industrialisation data à l'échelle | Moyenne |
| **Bouygues Construction** | Leader | 10,6 Md€ (2025, +3 %) · TP +3 % | n.d. | International | 4 | 4,5 | 19 | Programme robotique → données et cyber | Moyenne |
| **Colas** (Bouygues) | Leader | 16,0 Md€ (2025, +1 %) · Route France métro. **5,6 Md€** (+3 %) | >10 000 France | International | 4,5 | 4 | 21 | Nouvelle gouvernance digitale | Moyenne |
| **NGE** | Challenger | **5,024 Md€** (2025, +8,3 %) | 25 254 (21 pays) | International | 4 | 3 | 20 | Mise à niveau du SI post-croissance | Moyenne |
| **Fayat — Razel-Bec** | Challenger | Razel-Bec **746 M€** · *groupe Fayat 5,9 Md€, tous métiers* | 6 000 (Razel-Bec) | International | 3,5 | 2 | 17 | Autonomie des filiales, socle commun | Faible |
| **Spie Batignolles** | Challenger | **2,582 Md€** (2025) | 9 046 | National | 3,5 | 4 | 18 | Valoriser 10 ans de BIM en données exploitables | Moyenne |
| **Demathieu Bard** | Mid-market | **2,08 Md€** (2024) · carnet 4,7 Md€ (27 mois) | 4 211 | International | 3 | 2,5 | 16 | Intégration post-acquisition (Steiner) | Faible |
| **GCC** | Mid-market | **1,203 Md€** (2024, +4,3 %) · EBITDA 47,2 M€ | n.d. | National | 3,5 | 3 | 17 | Traçabilité carbone des ouvrages | Faible |
| **Léon Grosse** | Mid-market | **907 M€** (2024, +45 % depuis 2021) · cible 1,3 Md€ en 2030 | n.d. | National | 3 | 2 | 16 | Outiller un plan de croissance à 2030 | Faible |
| **Hoffmann Green** | Émergent | **16,8 M€** (2025, +27 %) · >50 000 t vendues | n.d. | National | 1,5 | 3 | 12 | Industrialiser un SI de scale-up cotée | Moyenne |
| **Néolithe** | Émergent | n.d. · cible 3 Mt valorisées d'ici 2030 | n.d. | National | 1 | 2,5 | 11 | Traçabilité et preuve carbone | Faible |
| **Charier** | Niche | **349 M€** (2025) · ~moitié routes et travaux urbains | ~1 800 | Régional (Grand Ouest) | 2 | 1,5 | 14 | Facturation électronique + productivité | Moyenne |
| **Baudin Châteauneuf** | Niche | **171 M€** (2024) | ~750 | National (spécialiste) | 1,5 | 2 | 13 | Numérisation de l'atelier et des ouvrages métalliques | Faible |
| **Bessac** ⚠ | Niche (sous réserve) | ~150 M€ (2023) · 2/3 à l'export | n.d. | International (niche tunnels) | 2 | 2 | — | **Bloqué : vérifier l'actionnariat** | Faible |

---

## 6. Fiches condensées des autres comptes

### VINCI Construction — Leader
CA de branche **32,1 Md€ en 2025** (stable, +1 %), au sein d'un groupe à 74,6 Md€ dont **41,3 % réalisés en France** (part groupe, toutes branches — non transposable à la branche construction). 284 256 collaborateurs dans le monde. Autres métiers du groupe, cités et non analysés : VINCI Energies (21,6 Md€), Cobra IS (8 Md€), VINCI Autoroutes et VINCI Airports.
**Couche ESN** — DSI de VINCI Construction SI : **Olivier Pellet**. Une **équipe Data & IA d'une vingtaine de personnes** existe au sein de la DSI et **recrute** (chef de projet IA, analystes de données) ; l'écodesign numérique est un sujet affiché. C'est la signature d'un compte qui internalise sa compétence data — donc qui achète de la capacité et de l'expertise pointue, pas du conseil de cadrage.
**Angle** : renfort d'expertise sur une équipe data déjà constituée, et industrialisation (pipelines, MLOps, qualité de donnée terrain). **À ne pas dire** : ne pas proposer de « structurer leur démarche data », elle l'est. **Appétence 18/25.** Confiance moyenne.

### Bouygues Construction + Colas — Leader
**Bouygues Construction** : 10,6 Md€ en 2025 (+3 %), croissance dans les trois divisions dont Travaux Publics +3 %. **Colas** : 16,0 Md€ (+1 %), dont Route France métropolitaine **5,6 Md€** (+3 %) et 6,3 Md€ avec DOM et océan Indien ; ferroviaire **+11 %** — la meilleure dynamique du périmètre. Plus de 10 000 salariés pour Colas France. Ensemble, pôle Construction du groupe Bouygues : 27,8 Md€.
**Couche ESN — deux triggers de premier ordre** :
1. **Colas nomme Vanessa Ranaivoharison directrice de la transformation digitale du groupe au 01/05/2026**, entrée au comité de direction générale, rattachement direct au directeur général — après avoir dirigé les solutions IT globales et la DSI Colas France et océan Indien depuis l'automne 2023. Une prise de fonction à ce niveau ouvre une fenêtre de 6 à 12 mois pendant laquelle les priorités se réécrivent.
2. **Bouygues Construction a perdu son Chief Digital Officer**, Raphaël Viard, parti prendre la direction IT de Forvia. Périmètre en recomposition.
**Chantiers visibles** : partenariat pluriannuel avec **Innodura** signé le 28/11/2025 (guidage de robots, vision 3D, navigation embarquée, détection et prédiction par IA, maintenance prédictive), avec un « lab construction » près de Lyon ; industrialisation ensuite sur le site **Scale One** de Chilly-Mazarin, ouverture définitive prévue à l'**été 2026**. Trois objectifs affichés : réduire la pénibilité, répondre à la pénurie de main-d'œuvre, améliorer la productivité.
**Angle** : la robotique produit des données, exige une intégration au SI de chantier et ouvre une surface cyber industrielle nouvelle — trois sujets que le partenaire robotique ne couvre pas. **Appétence : Colas 21/25, Bouygues Construction 19/25.** Confiance moyenne.

### NGE — Challenger
**5,024 Md€ en 2025 (+8,3 %)**, 25 254 collaborateurs dans 21 pays, **plus de 4 000 recrutements en 2025**, CA et effectifs **doublés depuis 2019**. Quatrième groupe français de BTP, indépendant. Positionnement renforcé sur l'eau, le ferroviaire et les énergies décarbonées. Complète le groupement EPR2.
**Couche ESN** : le groupe dispose de sociétés spécialisées en topographie, auscultation, scanner 3D, BIM et logiciels ferroviaires — donc une compétence technique interne réelle. Il recrute en alternance sur l'équipe Innovation et Digital (offres 2026 publiées sur son site carrières).
**Angle** : le décalage entre une croissance de +100 % en six ans et un SI conçu pour un groupe deux fois plus petit. C'est l'angle le plus solide de la carte, parce qu'il ne suppose aucune information confidentielle — l'écart est arithmétique et public. **À ne pas dire** : ne pas les traiter en outsider, ils sont le 4e français et le revendiquent. **Appétence 20/25.** Confiance moyenne.

### Fayat — Razel-Bec — Challenger
**Razel-Bec : 746 M€ et 6 000 collaborateurs** — c'est le pôle travaux publics. Le groupe Fayat affiche 5,9 Md€ en 2025, **mais tous métiers confondus, dont le matériel routier où il est leader mondial** : ce chiffre ne caractérise pas l'activité travaux et n'est pas utilisé pour la segmentation. Premier groupe français indépendant de construction ; l'appartenance au groupe est présentée comme conférant « autonomie et liberté d'action » aux filiales.
**Angle** : une organisation fédérale et autonome signifie des SI hétérogènes et des décisions décentralisées — donc une entrée possible par une filiale, sans passer par un référencement groupe. C'est la porte la plus ouverte du haut de marché. **Appétence 17/25.** Confiance faible (peu de données récentes sur le pôle TP).

### Spie Batignolles — Challenger
**2,582 Md€ en 2025**, 9 046 collaborateurs, **80 % du capital détenus par les managers actionnaires et les salariés**. Engagé dans une transformation numérique depuis 2016, avec une communauté de **plus de 200 experts BIM**, une marque de solutions « smart » (itm+) et le label Vitrine Industrie du Futur. A acquis en 2024 le groupe **CIFE / ETPO** (222 M€, 650 salariés à l'acquisition — travaux maritimes et fluviaux), constitué en branche autonome.
**Angle** : dix ans de BIM produisent un patrimoine de maquettes et de données de chantier rarement exploité au-delà du projet. Le sujet est le passage du BIM-projet à la donnée d'entreprise. Second angle : l'intégration SI de la branche ETPO. **Appétence 18/25.** Confiance moyenne.

### Demathieu Bard — Mid-market
**2,08 Md€ en 2024**, 4 211 salariés, carnet de commandes de **4,7 Md€ soit 27 mois d'activité**. A acquis **Steiner Construction (Suisse) en 2024**. CA 2025 non trouvé dans le budget de recherche.
**Angle** : intégration post-acquisition et pilotage d'un carnet à 27 mois — un carnet long est une contrainte de planification et de ressources avant d'être un confort. **Appétence 16/25.** Confiance faible.

### GCC — Mid-market
**1,203 Md€ en 2024 (+4,3 %)**, EBITDA 47,2 M€. Combine ses expertises avec **Hoffmann Green et Néolithe** pour un béton à très faible empreinte carbone — un mid-market qui se positionne sur le carbone avant les majors, donc un compte qui a une raison de se différencier par la preuve chiffrée.
**Angle** : mesurer et prouver l'empreinte carbone d'un ouvrage suppose une chaîne de données du fournisseur au chantier. **Appétence 17/25.** Confiance faible.

### Léon Grosse — Mid-market
**907 M€ en 2024**, en croissance de **45 % depuis 2021**, avec un cap annoncé en octobre 2025 : **1,3 Md€ en 2030**.
**Angle** : un objectif de croissance annoncé publiquement à +43 % est un engagement, donc un besoin d'outillage. C'est un déclencheur daté et parfaitement citable. **Appétence 16/25.** Confiance faible.

### Hoffmann Green Cement Technologies et Néolithe — Outsiders émergents
**Hoffmann Green** : 16,8 M€ en 2025 (**+27 %**), plus de 50 000 tonnes de ciment 0 % clinker commercialisées, +150 % de volumes au premier semestre 2025, levée de 13 M€, société cotée, ambitions 2030 maintenues, approche de l'équilibre. **Néolithe** : minéralisation des déchets ultimes en granulats, objectif de 3 Mt valorisées d'ici 2030.
**Angle commun** : ce sont des industriels en passage à l'échelle, sans SI historique, dont le produit se vend sur la **preuve carbone** — donc mesure, traçabilité, certification. Cycles de décision courts, interlocuteur = fondateur ou direction technique. **Ne pas leur vendre du dispositif grands comptes.** Appétence 12 et 11/25.

### Charier et Baudin Châteauneuf — Outsiders niche
**Charier** : **349 M€ en 2025**, environ **1 800 salariés**, ETI familiale du Grand Ouest installée à Couëron, près de la moitié du CA en routes et travaux urbains, capacité à sortir de sa région quand un chantier le justifie. **Baudin Châteauneuf** : **171 M€ en 2024**, environ **750 salariés**, spécialiste des ouvrages d'art et de la construction métallique, indépendant.
**Angle commun** : ces comptes sont directement exposés au retournement de la commande publique locale (−6 % attendu sur le bloc collectivités) **et** à l'échéance de facturation électronique du 01/09/2026. Entrée par un sujet borné, daté et à retour rapide — jamais par un discours de transformation. Interlocuteur : le dirigeant. Appétence 14 et 13/25.

---

## 7. Acteurs du paysage écartés, et pourquoi

| Acteur | CA | Effectif | Motif d'exclusion |
|---|---|---|---|
| **ETPO / groupe CIFE** | 222 M€ (à l'acquisition) | 650-750 | **Doublon** : acquis par Spie Batignolles (négociations exclusives 07/11/2023, offre publique simplifiée 26/02/2024), constitué en branche autonome. Aurait été compté deux fois — c'est précisément le piège que le test d'identité de l'entité doit attraper |
| **Eurovia** | — | — | Marque intégrée à VINCI Construction depuis 2021 : doublon avec le compte leader |
| **Bessac** ⚠ | ~150 M€ (2023) | n.d. | **Retenu sous réserve** : dernier fabricant français de tunneliers, positionnement niche idéal, mais un article de presse professionnelle le classe sous la rubrique VINCI. Rattachement capitalistique à vérifier **avant toute action commerciale** — s'il est filiale d'un major, la voie d'entrée change complètement |
| Webuild, Acciona, Strabag, Implenia | — | — | Présence en France non documentée dans le budget de recherche ; **le marqueur décisif — autonomie de décision d'achat en France — n'a pas pu être établi**. Écartés faute de preuve, pas faute de pertinence : à réexaminer en priorité à la prochaine mise à jour |
| Ramery | 181 M€ (Ramery Construction, 2023) | n.d. | Périmètre de l'entité mal établi (le chiffre trouvé ne concerne qu'une filiale) ; donnée trop ancienne |

---

## 8. Analyse transverse

**1. Qui capte les principales positions de marché ?**
Vinci, Bouygues et Eiffage sur tout ce qui est complexe et de grande taille ; NGE et Fayat sur le reste du haut de marché ; les mid-market sur le régional et le spécialisé.
*Preuve* : la composition du groupement EPR2 — les cinq mêmes noms, choisis pour un programme de ~10 Md€ de génie civil.
**DONC, commercialement** : sur les trois leaders, une ESN sans référence comparable ni référencement n'a pas de porte d'entrée directe. L'effort de conquête doit porter sur les challengers et les mid-market, où la décision est plus courte et où le SI est objectivement en retard sur l'ambition.

**2. Qui définit les pratiques numériques du secteur ?**
**Eiffage.** Partenariat IA structurant, plateforme d'IA générative privée, cursus interne, et un DSI qui parle publiquement de passage à l'échelle plutôt que d'expérimentation.
**DONC** : Eiffage est la référence à citer devant les autres comptes — sans jamais laisser croire qu'on détient de l'information interne. « Le sujet se déplace du pilote vers l'échelle » est une formulation légitime ; « chez Eiffage ils font X » ne l'est que si on cite la source publique.

**3. Qui porte l'innovation ?**
Innovation **métier** : Bouygues Construction, sur la robotisation et l'automatisation des tâches de chantier. Innovation **technologique** : Eiffage sur l'IA, Vinci Construction sur l'internalisation de la data. Innovation **matériaux** : les émergents (ciment sans clinker, minéralisation des déchets).
**DONC** : trois discours distincts. Robotique et données industrielles chez Bouygues ; données et échelle chez Eiffage et Vinci ; traçabilité et preuve chez les émergents et chez GCC.

**4. Quels enjeux SI communs à tous ?**
- **Facturation électronique au 01/09/2026** : réception obligatoire pour tous, émission obligatoire pour les grandes entreprises et les ETI, plateforme agréée, formats structurés, sanctions. Dans un secteur à sous-traitance en cascade et à situations de travaux mensuelles, ce n'est pas un sujet comptable, c'est un sujet de chaîne de valeur.
- **Cybersécurité et NIS2**, dans un contexte d'extension du périmètre réglementaire.
- **Donnée de chantier** : le BIM est mature côté projet, très peu exploité au niveau entreprise.
- **Pénurie de main-d'œuvre**, moteur explicite des programmes d'automatisation.
- **Preuve carbone**, imposée par la réglementation et de plus en plus par les critères d'attribution.
**DONC** : la facturation électronique est le seul sujet qui permet d'ouvrir *n'importe quel* compte de cette carte en août 2026 avec une échéance datée. C'est une porte, pas une fin.

**5. Quels enjeux propres à chaque segment ?**

| Segment | Enjeu dominant | Discours d'ouverture |
|---|---|---|
| Leaders | Passage à l'échelle, gouvernance de la donnée, intégration d'acquisitions européennes | Expertise pointue et capacité, sur un périmètre défini |
| Challengers | Croissance rapide non absorbée par le SI ; hétérogénéité des filiales | Mise à niveau et socle commun, sans casser l'autonomie des filiales |
| Mid-market | Faire plus avec une petite équipe SI ; conformité subie | Un sujet borné, daté, à retour rapide |
| Émergents | Passage à l'échelle industriel, preuve carbone | Compétence rare, cycle court, interlocuteur dirigeant |
| Niche | Repli de la commande publique locale, conformité 2026 | Productivité et conformité, jamais transformation |

**6. Politique et communication sur l'IA — où est l'écart ?**
Eiffage : écart faible, l'annonce est suivie de déploiement et de formation. Vinci Construction : écart faible, l'internalisation d'une équipe Data & IA qui recrute est une preuve plus forte qu'un communiqué. Bouygues Construction : l'IA est réelle mais **encapsulée dans la robotique**, ce qui est un choix, pas un retard. Challengers et mid-market : **aucune communication IA structurée trouvée** — l'écart n'est pas entre le dire et le faire, il est entre eux et le haut de marché.
**DONC** : face aux leaders, parler d'échelle et d'ingénierie. Face aux challengers et aux mid-market, ne pas parler d'IA du tout en ouverture — parler de la donnée qui la rendra possible, et d'un problème qu'ils ont déjà.

> **Donnée écartée en cours d'étude, exemple à conserver.** Plusieurs chiffres très vendeurs circulent sur l'IA dans le BTP français — « 30 à 50 % de presqu'accidents en moins dans les six mois », « port des EPI passé de 82 % à 97 % sur les chantiers pilotes ». Ils proviennent de blogs d'éditeurs et de sites de contenu (T4), sans étude ni source primaire identifiable. **Ils ne figurent pas dans cette étude.** Un DSI du secteur les reconnaîtrait immédiatement pour ce qu'ils sont, et la crédibilité de tout le reste tomberait avec eux.

### Priorisation finale

**Les 3 à attaquer** : Colas (fenêtre de nomination), NGE (croissance non absorbée), Bouygues Construction (recomposition digitale + industrialisation robotique).
**Les 3 à écarter pour l'instant** : Eiffage et Vinci Construction — trop avancés et trop fermés pour une entrée sans référence sectorielle préalable ; Néolithe — trop petit pour le temps commercial qu'il consommerait.
**Le message sectoriel** : voir §1.

---

## Annexe A — Sources et ce qu'il reste à vérifier

| Ce qu'elle atteste | Source | Tier atteint ici | À reconfirmer avant usage externe |
|---|---|---|---|
| Résultats Eiffage 2025, carnet, branches | Communiqué de résultats annuels 2025 Eiffage, via extraits de recherche ; presse professionnelle (Le Moniteur, Batiweb, JDL) | T2 rapporté | Ouvrir le communiqué et le document d'enregistrement universel 2025 |
| Résultats Vinci 2025 | Communiqué Vinci FY2025 via extraits ; presse (Batiweb, AbcBourse) | T2 rapporté | Idem + répartition France de la branche construction |
| Résultats Bouygues Construction et Colas 2025 | Communiqué Bouygues 2025 via extraits ; Éditions RGRA ; rapport de gestion Colas 2025 | T2 rapporté | Ouvrir le rapport de gestion Colas 2025 |
| NGE 5,024 Md€, 25 254 collaborateurs | Le Moniteur, Le Journal des Entreprises, rapport annuel NGE | T3 | Rapport annuel NGE 2025 |
| Razel-Bec 746 M€ / Fayat 5,9 Md€ | Rapport annuel Razel-Bec 2025, sites groupe | T2/T3 | Comptes déposés Razel-Bec |
| Spie Batignolles 2 582 M€, 9 046 collaborateurs | Rapport extra-financier 2025, Pappers | T2/T3 | Rapport extra-financier 2025 |
| Acquisition CIFE/ETPO par Spie Batignolles | Communiqués Spie Batignolles et groupe ETPO, Le Moniteur, JDE | T2 | — (fait solide) |
| Nomination Vanessa Ranaivoharison (01/05/2026), Colas | Le Moniteur | T3 | Communiqué Colas |
| Départ de Raphaël Viard (CDO Bouygues Construction) vers Forvia | CIO Online | T3 | — |
| DSI Eiffage Jean-Philippe Faure + citation | L'Usine Digitale | T3 | — |
| Partenariat Eiffage / Google Cloud, 15 projets, Gemini | Communiqué Eiffage 27/06/2024, Silicon, La Revue du Digital, blog Google Cloud | T2/T3 | Communiqué Eiffage |
| DSI et équipe Data & IA de VINCI Construction SI | LinkedIn VINCI Construction SI, JobTeaser | **T4** | **À reconfirmer impérativement** |
| Partenariat Bouygues Construction / Innodura, 28/11/2025 | Communiqué Bouygues 28/11/2025, L'Usine Digitale, Le Moniteur, CTB | T2/T3 | — |
| Conjoncture TP 2026, carnets, −12,8 % | FNTP (prévisions 2026, conjoncture mensuelle), INSEE Informations rapides | T1 rapporté | Ouvrir la note INSEE et la note FNTP |
| Groupement EPR2 et ~10 Md€ de génie civil | Presse professionnelle (Batirama, PGE) | **T3 non corroboré par un acte** | **Fait le plus structurant de l'étude — à confirmer en priorité** |
| Coût EPR2 : 72,8 Md€ (valeur 2020) ≈ 84 Md€ | Presse, dossier préfecture Normandie | T2/T3 | — |
| Contrat SEDIF > 400 M€ (Eiffage + Vinci / Veolia) | Communiqué Eiffage | T2 rapporté | — |
| Facturation électronique : dates, obligations, sanctions | economie.gouv.fr cité, cabinets (Cegid, Pennylane, Village Justice) | T1 rapporté | **Ouvrir la page economie.gouv.fr — aucune date réglementaire ne doit sortir sans ça** |
| Conventions collectives TP : IDCC 1702 / 2614 / 3212, brochure 3005, codes NAF 42xx | Code du travail numérique, convention.fr, Pappers | T1 rapporté | Vérifier l'IDCC réellement appliqué **par entité** |
| Hoffmann Green 16,8 M€ (+27 %) | Le Moniteur, JDE, communiqués | T2/T3 | — |
| Charier 349 M€, ~1 800 salariés | Site Charier (chiffres clés), Infonet | T2/T3 | — |
| Baudin Châteauneuf 171 M€, ~750 salariés | Xerfi, Societe.com | T3 | — |
| Bessac ~150 M€ (2023) | L'Usine Nouvelle, Le Moniteur | T3 | **Actionnariat à vérifier** |

## Annexe B — Journal de recherche

24 requêtes exécutées, 5 tentatives d'ouverture de source primaire **toutes bloquées** (eiffage.com, vinci.com, bouygues.com, fr.wikipedia.org, pappers.fr).

**Ce qui a été trouvé** : résultats 2025 des cinq premiers groupes ; conjoncture FNTP/INSEE 2026 ; composition du groupement EPR2 ; nominations digitales chez Colas et Bouygues Construction ; partenariats IA et robotique ; conventions collectives et codes NAF du secteur ; calendrier de la facturation électronique ; acquisition CIFE/ETPO ; chiffres des mid-market et des acteurs de niche.

**Ce qui n'a pas été trouvé** (et reste donc non renseigné) :
- CA France par branche des trois leaders — *n'existe pas publiquement, ce n'est pas un échec de recherche*
- Effectif France d'Eiffage
- Modèles d'achat, panels de référencement et portails fournisseurs — **aucun compte** ; c'est le trou le plus coûteux de cette étude
- CA 2025 de Demathieu Bard, GCC, Léon Grosse (données 2024 utilisées)
- Présence et autonomie décisionnelle en France des majors étrangers
- Troisième acteur de niche
- Codes d'activité et IDCC vérifiés par entité

## Annexe C — Export JSON

Voir `export.json` dans ce dossier. À charger dans `prompts/cartographie-concurrentielle/assets/matrice-concurrentielle.html`.
