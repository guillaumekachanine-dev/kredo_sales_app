# 08 — Audit comparatif des deux études « Spatial, défense & systèmes critiques » et architecture cible des prochaines cartographies

Snapshot : 11/08/2026 · Objet : comparer les deux livrables produits sur le même périmètre, évaluer chaque section au regard de l'objectif réel (§ `00-analyse-et-recommandations.md`), et en déduire l'architecture des études suivantes.

---

## 0. Les deux objets, et le fait qui conditionne toute la comparaison

| | **Étude A** | **Étude B** |
|---|---|---|
| Fichier | `KREDO_Cartographie_Spatial_Defense_Systemes_Critiques_structure_reference.md` | `Spatial, défense & systèmes critiques — Cartographie sectorielle et options stratégiques.pdf` |
| Volume | 892 lignes · 8 sections + 3 annexes | 25 pages · 9 sections + 90 références numérotées |
| Nature déclarée | « Reformatage du rapport de recherche existant selon la structure exacte de l'étude de référence BTP » | Run de Deep Research sourcé, adapté du kit méthodologique |
| Destinataire implicite | Commercial ESN | Direction de Thales Alenia Space |
| Confiance déclarée | MOYENNE À ÉLEVÉE | Élevée (structures de marché, programmes, finances publiées) / moyenne (chaînes fournisseurs, coûts unitaires, parts fines) |

**A dérive de B.** Tous les chiffres de A proviennent de B : CA TAS 2,36 Md€, Argonaut 862 M€, Sentinel-1 NG 700 M€, CO2M 88 M€, LISA 263 M€, SAGA 50 M€, OHB 1,248 Md€, ArianeGroup ~2,6 Md€ / 8 700, Eutelsat 1,244 Md€ dont 187 M€ LEO, Lockheed 13,029 Md$, Northrop 10,771 Md$, Boeing 27,234 Md$, L3Harris 6,946 Md$, SpaceX 4,086 / 18,674 Md$. A n'ajoute aucune donnée de terrain ; elle ajoute une **grille** (segmentation, scoring, angles d'entrée) et **deux comptes issus du CRM Kredo** (ACRI-ST, Exail Robotics) qui n'existent nulle part dans B.

Conséquence directe, et c'est le résultat central de cet audit :

> **A a hérité des lacunes de B sans hériter de ses preuves.** Le reformatage a fait perdre les 90 sources numérotées de B — remplacées par un tableau de « familles de sources » sans URL — sans rien ajouter sur les quatre questions opérationnelles auxquelles il prétendait répondre.

---

## 1. Schéma des sections

### 1.1 Étude A — arborescence

```
A · Cartographie concurrentielle — Spatial, défense & systèmes critiques
│
├─ ⚠ Avertissement de production (étape 0)          [méta · déclaration des trous]
│
├─ 1. Synthèse exécutive
│    ├─ Le marché en 5 points
│    ├─ Les 3 comptes à attaquer maintenant          → tableau Appétence /35
│    ├─ Le message sectoriel à porter                → une phrase
│    └─ Les 3 incertitudes de l'étude
│
├─ 2. Matrice visuelle                               [ASCII 5×5, X=empreinte, Y=maturité]
│
├─ 3. Segmentation : comment les catégories ont été tranchées
│    └─ critère de substitution + table 5 catégories / 10 comptes
│
├─ 4. Fiche du compte étalon — THALES ALENIA SPACE ★
│    ├─ Bloc 1 — Identité et cadre                   [CA, effectif, statut, NAF/IDCC = non audités]
│    ├─ Bloc 2 — Métier et chaîne de valeur          [fournisseurs, clients, 8 contrats]
│    ├─ Bloc 3 — Les six grilles                     [financière, empreinte, réputation, R&D, IA, avantages]
│    ├─ Bloc 4 — Couche ESN                          [organisation SI, chantiers, achat, triggers, appétence]
│    └─ Bloc 5 — Traduction commerciale              [angle, accroche, offres, à ne pas dire]
│
├─ 5. Tableau comparatif                             [10 lignes × 11 colonnes]
│
├─ 6. Fiches condensées des 9 autres comptes         [par catégorie : leaders → niche]
│
├─ 7. Acteurs du paysage écartés, et pourquoi        [6 benchmarks US + motif d'exclusion]
│
├─ 8. Analyse transverse
│    ├─ Échéances communes datées                    [déclarée VIDE]
│    ├─ Q1..Q6 (positions, pratiques, innovation, enjeux SI, enjeux par segment, IA)
│    │    └─ chaque réponse close par un « DONC, commercialement »
│    └─ Priorisation finale (3 à attaquer / 3 à écarter / message unique)
│
├─ Annexe A — Sources et ce qu'il reste à vérifier   [15 familles, aucune URL]
├─ Annexe B — Journal de recherche                   [ABSENT → remplacé par requêtes à rejouer]
├─ Annexe C — Export JSON                            [10 comptes, schéma CRM]
└─ Note de gouvernance
```

### 1.2 Étude B — arborescence

```
B · Cartographie sectorielle et options stratégiques
│
├─ Synthèse exécutive
│    ├─ 5 constats structurants (architecture de mission, position TAS, pression économique,
│    │   demande défense, zones de différenciation)
│    ├─ Conclusion stratégique                       [pour TAS]
│    └─ Note d'adaptation méthodologique             [assume l'abandon NAF / IDCC / appétence]
│
├─ Périmètre, économie du secteur et logique de création de valeur
│    ├─ Définition de périmètre + règle de non-comparabilité des CA
│    ├─ Taille et financement (Eurospace 8,8 Md€ / 66 000 ETP, UE 14,88 Md€, CM25 22,1 Md€, FR 16 Md€)
│    ├─ Les 4 blocs de clients (militaire / civil institutionnel / commercial / dual)
│    └─ ► Tableau MODÈLES ÉCONOMIQUES × 8 (NRE, tranches, sous-traitance payload,
│         clé en main, concession/PPP, opérations & services, démonstrateur, servicing)
│
├─ Cartographie de la chaîne de valeur et positionnement de TAS
│    ├─ Schéma de chaîne de valeur
│    ├─ ► Tableau 11 MAILLONS × (contenu, position TAS, comparables)
│    └─ ► Tableau 13 OFFRES TECHNOLOGIQUES × (position TAS, lecture concurrentielle)
│
├─ Acteurs clés : France, Europe et benchmark mondial
│    ├─ ► Tableau 12 acteurs × (zone, capacités, focus, revenu, force face à TAS)
│    └─ 2 conclusions (les concurrents changent selon le maillon ; la taille ne prédit pas le pouvoir)
│
├─ Supply chain, régulation, souveraineté et contraintes d'export
│    ├─ ► Tableau 7 DÉPENDANCES CRITIQUES × (criticité, situation, risque)
│    └─ 4 couches réglementaires : ITAR/EAR · UE 2021/821 dual-use · matériels de guerre /
│         CIEEMG · opérations spatiales + NIS2 + EU Space Act (statut : proposition)
│
├─ Technologies émergentes, risques, opportunités et trajectoire
│    ├─ IA embarquée · quantique/QKD · smallsat/proliféré · optique · servicing · souveraineté composant
│    └─ ► Tableau 12 DIMENSIONS DE RISQUE × (risque secteur, impact TAS, opportunité)
│
├─ Chronologie des ruptures récentes                 [2018 → août 2026, 15 jalons datés]
│
├─ Options stratégiques recommandées pour un acteur comme TAS
│    ├─ ► Tableau 5 OPTIONS × (intérêt, avantages, limites, mise en œuvre)
│    └─ Choix recommandé + proposition de valeur
│
├─ Contrôle qualité et limites                       [non-comparabilité assumée, trous déclarés]
└─ Sources structurantes + 90 références numérotées avec URL
```

### 1.3 Carte de recouvrement

```
                    ÉTUDE A (forme)                      ÉTUDE B (fond)
                    ───────────────                      ──────────────
  DÉCIDER      ┃ Synthèse 5 points          ◄══════════► Synthèse 5 constats
  qui viser    ┃ Top 3 comptes /35               ✗ absent de B
               ┃ Segmentation objectivée         ✗ absent de B (liste sans classe)
               ┃ Matrice + tableau comparatif    ✗ absent de B
               ┃ Acteurs écartés + motif         ~ implicite chez B
               ┃
  COMPRENDRE   ┃      ✗ absent de A          ◄─── Économie & modèles de revenus (8)
  pour être    ┃      ✗ absent de A          ◄─── Chaîne de valeur, 11 maillons
  crédible     ┃ Bloc 2 fiche étalon (résumé)◄══► Positionnement TAS
               ┃      ✗ absent de A          ◄─── Offre technologique, 13 fronts
               ┃      ✗ absent de A          ◄─── Supply chain, 7 dépendances
               ┃      ✗ absent de A          ◄─── Régulation, 4 couches
               ┃      ✗ absent de A          ◄─── Risques/opportunités, 12 dimensions
               ┃      ✗ absent de A          ◄─── Chronologie datée 2018–2026
               ┃ Analyse transverse Q1..Q6        ~ dispersé chez B, sans « donc »
               ┃
  ATTAQUER     ┃ Fiches comptes 5 blocs          ✗ absent de B
  demain matin ┃ Couche ESN / accessibilité      ✗ VIDE chez A, absent de B  ◄── LACUNE COMMUNE
               ┃ Triggers datés par compte       ~ 2 chez A, macro chez B
               ┃ Accroches / à ne pas dire       ✗ absent de B
               ┃ Export JSON CRM                 ✗ absent de B
               ┃
  PROUVER      ┃ Annexe A sans URL           ◄─── 90 sources numérotées + tiers  ◄── RÉGRESSION A
               ┃ Journal de recherche ABSENT     ✗ absent des deux
```

**Une seule zone de recouvrement réelle** : la synthèse exécutive et la liste d'acteurs. Sur 8 sections de A et 9 de B, **13 ne se recoupent pas**. Les deux documents sont complémentaires à ~80 %, ce qui est exactement le symptôme d'un fond et d'une forme produits séparément.

---

## 2. Évaluation section par section au regard de l'objectif

Barème : la valeur d'une section se mesure à sa contribution aux quatre questions du directeur commercial — **Q1** quels comptes j'attaque en premier · **Q2** à qui je parle et par quelle porte j'entre · **Q3** que je dis pour être crédible en 3 minutes · **Q4** pourquoi maintenant.
`●` traite · `◐` traite partiellement · `○` ne traite pas.

### 2.1 Étude A

| Section | Q1 | Q2 | Q3 | Q4 | Verdict |
|---|:--:|:--:|:--:|:--:|---|
| Avertissement de production | ○ | ○ | ○ | ○ | **À conserver et normer.** Ne sert aucune des 4 questions, mais protège les 4 : sans lui, l'étude sort avec un statut de fiabilité faussement élevé. C'est le correctif F1 du run BTP, correctement appliqué. |
| 1. Synthèse — 5 points | ○ | ○ | ● | ◐ | Excellent. Les 5 points sont des thèses, pas des descriptions (« le marché n'est plus celui du satellite mais de l'architecture de mission souveraine »). C'est exactement le matériau des 3 minutes. |
| 1. Top 3 comptes | ◐ | ○ | ◐ | ◐ | **Défaillant — voir §3.1.** Le top 3 contredit le classement /35 de la §5 du même document. « Porte d'entrée » désigne un thème technique, pas un circuit d'achat : la colonne ne répond pas à Q2 malgré son intitulé. |
| 1. Message sectoriel | ○ | ○ | ● | ◐ | Le meilleur actif des deux études. Une phrase qu'aucune ESN généraliste ne peut prononcer. |
| 1. Trois incertitudes | ○ | ○ | ○ | ○ | Utile en gouvernance. L'incertitude n°2 (« l'accessibilité commerciale n'a pas été auditée ») est un aveu que Q2 n'est pas traitée. |
| 2. Matrice visuelle | ◐ | ○ | ○ | ○ | **À refonder ou supprimer.** Les positions ASCII contredisent le tableau §5 (D-Orbit tracé à empreinte ≈5 pour une note de 3 ; OHB tracé entre 4 et 5 pour une note de 5). La taille de bulle annoncée n'est pas rendue. Le sigle `LDO` pour D-Orbit se lit comme Leonardo. La carte utile — appétence × accessibilité, prévue par `05-templates §6` — n'est pas produite. |
| 3. Segmentation | ● | ○ | ◐ | ○ | **Meilleur bloc méthodologique de A.** Constate que la table de décision par part de marché est inapplicable (périmètres incompatibles, militaire classifié) et bascule sur le critère de substitution — présence sur les programmes structurants. C'est le correctif F2 du run BTP, appliqué et justifié. Le refus de compléter artificiellement les quotas (10 comptes au lieu de 14-16) est la bonne décision. |
| 4. Fiche étalon — Bloc 1 Identité | ◐ | ○ | ◐ | ○ | Trois lignes sur sept sont « non audités » : implantations France, code d'activité, convention collective. Aucun SIREN. Aucun effectif France. |
| 4. Bloc 2 Métier & chaîne de valeur | ○ | ◐ | ● | ● | Solide — 8 contrats datés et chiffrés. C'est la meilleure matière « pourquoi maintenant » de A, mais elle est enfouie dans une fiche au lieu d'alimenter la §1. |
| 4. Bloc 3 Six grilles | ◐ | ○ | ● | ○ | La grille « Politique IA — annoncé vs déployé » est marquée **« à auditer »**. Or c'est la grille qui distingue une ESN d'un fournisseur : elle mesure l'écart entre le discours et la production, donc le besoin. Grille la plus différenciante, seule case vide. |
| 4. Bloc 4 Couche ESN | ○ | ○ | ◐ | ◐ | **Le bloc censé répondre à Q2 est vide.** Organisation SI : « ne fournit pas d'organigramme public vérifié ». Modèle d'achat : « non vérifié ». Externalisation : « non quantifié ». Triggers : 4 lignes, dont 2 non datées au mois. C'est la reproduction exacte de l'échec F3 du run BTP (0 compte sur 14 renseigné), non corrigée. |
| 4. Bloc 5 Traduction commerciale | ○ | ○ | ● | ○ | Très bon, y compris les « à ne pas dire » — qui sont ici de vraies lignes rouges sectorielles (ne pas proposer de migrer des systèmes critiques dans le cloud, ne pas ériger SpaceX en modèle). |
| 5. Tableau comparatif | ● | ○ | ◐ | ○ | Lecture transverse efficace. Mais les colonnes identité sont mortes : « Non audité France » sur 8 lignes sur 10, aucune colonne accessibilité, aucune colonne trigger. La colonne Confiance dit « Élevée » pour TAS alors que la fiche conclut « MOYENNE À ÉLEVÉE ». |
| 6. Fiches condensées (9) | ◐ | ○ | ● | ○ | Format juste (positionnement / forces / besoins SI probables / angle). Mais « besoins SI **probables** » est une inférence, jamais une observation : aucune n'est adossée à une offre d'emploi, un communiqué ou un appel d'offres. |
| 7. Acteurs écartés | ● | ○ | ○ | ○ | **À conserver tel quel.** Une section qui dit où ne pas dépenser d'effort vaut une section qui dit où en dépenser. Le motif d'exclusion (autonomie d'achat France non démontrée) est le bon critère, celui de la règle A6. |
| 8. Analyse transverse Q1..Q6 | ◐ | ○ | ● | ○ | **Le sommet de A.** Chaque réponse se termine par un « DONC, commercialement ». Le tableau « 5 segments → 5 discours d'ouverture » est le seul endroit des deux études où l'analyse se convertit en phrase prononçable. |
| 8. Échéances communes | ○ | ○ | ○ | ○ | **Déclarée vide** — « aucune échéance réglementaire unique, datée et vérifiée ». Honnête, mais c'est le correctif F8 du run BTP qui échoue : sur BTP, la facturation électronique au 01/09/2026 était le seul motif d'appel universel. Ici, la matière existe pourtant chez B (NIS2, dual-use, EU Space Act, arrêté opérations spatiales) et n'a pas été transférée. |
| Annexe A — Sources | — | — | — | — | **Régression majeure.** 15 familles de sources sans une seule URL, là où B en fournit 90 avec tier et lien. Un fait non re-vérifiable n'est pas prononçable devant un DSI. |
| Annexe B — Journal | — | — | — | — | **Absent.** Remplacé par une liste de requêtes *à rejouer*. C'est un plan de recherche, pas un journal : l'étude n'est pas reproductible. |
| Annexe C — Export JSON | ● | ○ | ◐ | ◐ | **Seul bloc directement industrialisable** (import `companies` / `account_facts`). Mais `identifiant_national`, `effectif_france`, `code_activite`, `convention_collective` sont `null` sur **10 comptes sur 10**, et `ca_meur` est `null` sur 4. Un import produirait 10 fiches sans identité. |

### 2.2 Étude B

| Section | Q1 | Q2 | Q3 | Q4 | Verdict |
|---|:--:|:--:|:--:|:--:|---|
| Synthèse exécutive (5 constats) | ○ | ○ | ● | ◐ | Aussi forte que celle de A, plus argumentée, sourcée. Mais elle conclut sur une recommandation **à TAS**, pas sur une cible pour l'ESN. |
| Périmètre & règle de comparabilité | ○ | ○ | ◐ | ○ | Discipline exemplaire : interdiction d'utiliser un CA groupe pour une branche, obligation d'écrire « non publié ». C'est la règle qui a sauvé le run BTP trois fois. |
| Économie du secteur & 4 blocs clients | ◐ | ◐ | ● | ○ | Très utile : savoir que le client est financé par ESA/CE/CNES/DGA détermine son circuit d'achat et son calendrier budgétaire. |
| **Modèles économiques (8)** | ○ | ● | ● | ○ | **Bloc le plus sous-estimé des deux études.** Il dit *comment le compte gagne de l'argent* — donc quel budget existe, quand il est engagé, et qui le signe. Un contrat NRE institutionnel, une concession PPP à 12 ans et une vente de capacité n'ouvrent ni le même interlocuteur ni le même type de prestation. C'est de la matière Q2 pure, que personne n'a exploitée. |
| **Chaîne de valeur, 11 maillons** | ◐ | ◐ | ● | ○ | **Meilleur bloc des deux études pour la crédibilité.** Il permet de dire à quel maillon précis on se branche et qui d'autre y est. Combiné à la conclusion « les concurrents de TAS changent selon le maillon », il fournit l'argumentaire différencié que A appelle de ses vœux sans le construire. |
| Offre technologique (13 fronts) | ◐ | ○ | ● | ◐ | Dense et daté (« position TAS en août 2026 »). Sert à ne pas dire de bêtise, et à repérer les fronts où le compte est *en transition* — donc en besoin. |
| Acteurs clés (12) | ◐ | ○ | ● | ○ | Riche mais **non ordonné** : pas de catégorie, pas de score, pas de tri. Un commercial y trouve du contexte, pas une file d'attente. |
| **Supply chain, 7 dépendances** | ○ | ◐ | ● | ○ | Excellente matière : chaque dépendance critique (EEE, RF, optique, propulsion, lancement, logiciel/crypto, moyens d'essais) désigne un service achetable — qualification, second sourcing, cyber-SBOM, traçabilité. À convertir en offres. |
| **Régulation, 4 couches** | ○ | ◐ | ● | ◐ | La couche la plus structurante du secteur, absente de A. ITAR/EAR + 2021/821 + CIEEMG + opérations spatiales/NIS2/EU Space Act. B a la discipline de préciser que l'EU Space Act est **encore une proposition** en août 2026 — exactement le type de nuance qui fait la différence face à un DSI. Mais B ne date pas les échéances et ne les relie jamais à l'achat de prestation. |
| Technologies émergentes | ○ | ○ | ● | ◐ | IA embarquée, QKD, smallsat, optique, servicing, souveraineté composant. Bonne granularité ; la formulation `collect→downlink→process` vs `sense→process→prioritize→transmit` est directement citable. |
| Risques & opportunités (12) | ○ | ○ | ● | ○ | Chaque ligne associe un risque à une opportunité : c'est la structure d'un argumentaire. Non converti en argumentaire. |
| **Chronologie 2018 → août 2026** | ○ | ○ | ● | ● | **La meilleure matière « pourquoi maintenant » des deux documents**, et elle est datée à la source. Mais elle est **sectorielle** : elle ne donne pas de motif d'appel *pour un compte donné*. |
| Options stratégiques TAS (5) | ○ | ○ | ◐ | ○ | **Mauvais destinataire.** C'est du conseil en stratégie livré au compte étalon. Valeur pour l'ESN : nulle en l'état, **élevée si on la retourne** — cf. §4.3. |
| Contrôle qualité et limites | — | — | — | — | À importer tel quel dans le standard : périmètres laissés sur leur base publiée, refus d'estimer, statut politique vs acquis distingué. |
| 90 sources numérotées | — | — | — | — | **L'actif que A a détruit.** Officiel (Élysée, Défense, Légifrance, EUR-Lex, DGE) puis primaire entreprise puis sectoriel. Hiérarchie respectée. |

---

## 3. Points forts et lacunes

### 3.1 Les trois défauts durs de A

**D1 — La priorisation contredit son propre tableau.** Scores /35 de la §5 : Eutelsat 31 · OHB 29 · D-Orbit 29 · ACRI-ST 29 · TAS 27 · Airbus 27 · ArianeGroup 27 · **Exail 25** · Thales 23 · Leonardo 23.
Top 3 annoncé en §1 et repris en §8 : **ACRI-ST (29), Exail (25), TAS (27)**.
Donc : le mieux noté du tableau (Eutelsat, 31) n'est pas dans le top 3, et **le moins bien noté de toute la carte (Exail, 25) y est en n°2**. Aucune justification n'est donnée. Un directeur commercial qui recoupe les deux sections perd confiance dans les deux.

**D2 — Les deux comptes prioritaires sont les deux seuls dont l'étude ne sait rien.** ACRI-ST et Exail sont absents de B. Dans A : `ca_meur: null`, `effectif_france: null`, `exercice: null`, périmètre « non repris dans rapport source ». Et pourtant ACRI-ST reçoit **accessibilité 5/5** — la note maximale — sur la seule intuition qu'une petite structure est plus abordable, alors que le document déclare par ailleurs qu'aucun modèle d'achat n'a été audité. La priorisation commerciale repose donc sur la partie la moins documentée du livrable.

**D3 — La traçabilité est perdue.** 90 sources → 15 familles sans URL, plus un journal de recherche remplacé par une intention de journal. L'étude n'est ni vérifiable ni reproductible ; les mêmes faits, dans B, le sont.

### 3.2 Le défaut dur de B

**D4 — Le livrable est écrit pour le mauvais lecteur.** B culmine sur « Options stratégiques recommandées pour un acteur comme Thales Alenia Space » et une proposition de valeur *pour TAS*. Tout le document est construit du point de vue du compte étalon. Remis tel quel à un commercial, il ne donne ni cible, ni ordre d'attaque, ni interlocuteur, ni accroche, ni motif d'appel daté par compte. Il donne, en revanche, la totalité de la légitimité métier — qui est le vrai produit recherché.

### 3.3 Les sept lacunes communes aux deux études

| # | Lacune | Pourquoi elle est bloquante ici | Statut |
|---|---|---|---|
| **L1** | **Aucune couche accessibilité achat** — panels fournisseurs, référencement, accords-cadres, achats indirects, canal public | Q2 n'est traitée par aucune des deux. Sur ce secteur, s'y ajoute un verrou spécifique qu'aucune n'évoque : **habilitation Défense, protection du potentiel scientifique et technique / zones à régime restrictif, clauses de nationalité**. C'est ce qui décide si une ESN peut prester, avant même de savoir si le compte a un besoin. | Échec F3 du run BTP, **non corrigé** |
| **L2** | **Aucune identité juridique France** — SIREN, entité, NAF, IDCC, effectif par établissement | Sans entité, pas d'import CRM propre, pas de dédoublonnage, pas de lecture des grilles de rémunération de référence — donc pas de positionnement TJM. `null` sur 10/10 comptes. | Non traité |
| **L3** | **Aucune preuve d'intensité SI observable** — offres d'emploi technologiques, plans de recrutement | Le retour de test BTP la désigne comme **la requête la plus rentable de la méthode** (équipe Data & IA de ~20 personnes en recrutement chez VINCI Construction — aucun communiqué ne dit ça). Ici, tous les « besoins SI » sont des inférences marquées « probables ». | Non joué |
| **L4** | **Aucun décideur SI, aucune organisation DSI** | A l'écrit noir sur blanc pour TAS. Sans cela, « à qui je parle » reste sans réponse. | Non traité |
| **L5** | **Aucune cartographie des ESN déjà en place** | Question Q2 mal posée : savoir par quelle porte entrer suppose de savoir **qui tient déjà la porte**. Sur ce secteur, l'ingénierie externalisée est structurelle et les positions installées sont connues. Ni A ni B ne les nomment. | Non traité |
| **L6** | **Aucun calendrier réglementaire daté et commun** | A le déclare vide ; B a toute la matière (NIS2, règlement 2021/821, régime des opérations spatiales, EU Space Act, LPM actualisée) mais ne la convertit pas en échéances datées vérifiées. C'est le motif d'appel universel qui manque. | Matière présente, **conversion non faite** |
| **L7** | **Aucun trigger event par compte, daté au mois, sourcé** | B a une chronologie sectorielle excellente mais macro ; A a 4 lignes pour TAS et rien pour les 9 autres. Or c'est ce qui transforme « je vous présente notre société » en « je vous appelle parce que vous venez d'annoncer X ». | Partiel |

### 3.4 Ce que chacune fait mieux que l'autre — synthèse

**A gagne sur :** la segmentation objectivée et son critère de substitution · la déclaration explicite des trous · la conversion en « DONC commercialement » · le tableau 5 segments → 5 discours · les « à ne pas dire » · l'export JSON · la section des acteurs écartés.

**B gagne sur :** la traçabilité (90 sources vs 0 URL) · les modèles économiques · la chaîne de valeur par maillon · l'offre technologique front par front · les dépendances de supply chain · les quatre couches réglementaires · la chronologie datée · la discipline de non-comparabilité · le contrôle qualité.

---

## 4. Architecture cible des prochaines études

### 4.1 Les trois règles de production qui découlent de l'audit

**R1 — Fond et forme dans le même run.** Le reformatage a posteriori détruit les preuves. L'étude sectorielle et la cartographie de comptes ne sont pas deux livrables successifs mais deux couches d'un seul run, produites dans cet ordre : *sources → secteur → comptes → conversion commerciale*, avec un registre de sources unique alimenté en continu.

**R2 — Plancher de preuve pour entrer dans la shortlist.** Aucun compte n'est scoré, classé ni priorisé sans, au minimum : une entité juridique France identifiée, un ordre de grandeur de taille (CA **ou** effectif) sur périmètre déclaré, un trigger daté, et deux sources indépendantes dont une T1/T2. En dessous, le compte va en **réserve à qualifier**, jamais dans le top 3. Cette règle seule aurait empêché D2.

**R3 — Le score est calculé une fois et fait autorité partout.** Le top 3 de la synthèse est, par construction, le top 3 du tableau comparatif. Tout écart doit être justifié en une ligne dans la synthèse, ou il est interdit. Cette règle seule aurait empêché D1.

À quoi s'ajoutent, repris du retour de test BTP et confirmés par cet audit : les trois états d'accès aux sources avec plafond de confiance (F1), le critère de substitution pour la segmentation (F2), l'unité de décision d'achat comme maille de fiche (F4), **15 % du budget de recherche réservé à la vérification et non consommable en production** (F5), la notation 1/3/5 avec pondération ×2 sur moment et accessibilité (F6).

### 4.2 La structure cible — trois couches, trois temps de lecture

Le principe : chaque couche a **un lecteur, un usage et un budget de temps**. Une fusion à plat de A et B produirait 45 pages illisibles.

```
┌─ COUCHE 0 — CADRE ────────────────────────── (0,5 p · lu une fois · gouvernance)
│  0.1 Page de garde et estampillage                        [A · 05-templates §8]
│  0.2 Déclaration d'accès aux sources et plafond de confiance   [A · étape 0, à normer]
│  0.3 Périmètre, règle de comparabilité, ce qui est hors champ  [B]
│
├─ COUCHE 1 — DÉCIDER ──────────────────────── (2 p · directeur commercial · 5 min)
│  1.1 Le marché en 5 thèses                                [A + B fusionnés]
│  1.2 ► CALENDRIER SECTORIEL DATÉ — 1 à 3 échéances communes vérifiées   ★ NOUVEAU (L6)
│  1.3 Les 3 comptes à attaquer maintenant  = top 3 du §3.3, sans exception   [A, corrigé R3]
│  1.4 Les 3 comptes à écarter, et pourquoi                 [A §7]
│  1.5 Le message sectoriel à porter — une phrase           [A]
│  1.6 Les 3 incertitudes                                   [A]
│
├─ COUCHE 2 — COMPRENDRE ───────────────────── (8-10 p · lu une fois · réservoir de crédibilité)
│  2.1 Économie du secteur : qui finance, qui décide, 4 blocs clients        [B]
│  2.2 ► MODÈLES ÉCONOMIQUES × N — comment le compte gagne de l'argent       [B]
│        + colonne ajoutée : « ce que ce modèle implique pour l'achat de prestation »  ★
│  2.3 ► CHAÎNE DE VALEUR PAR MAILLON — position du compte étalon, comparables [B]
│        + colonne ajoutée : « maillon où l'ESN se branche, et qui y est déjà »        ★ (L5)
│  2.4 Fronts technologiques et zones de transition                          [B]
│  2.5 Dépendances critiques de supply chain → services achetables           [B + conversion ★]
│  2.6 Régulation en couches → converti en échéances datées                  [B + conversion ★]
│  2.7 Chronologie des ruptures, 8 ans                                       [B]
│  2.8 Risques × opportunités                                                [B]
│  ⚠ RÈGLE : chaque bloc de la couche 2 se termine par un « DONC, commercialement : … »
│    d'une à trois lignes. Sans « donc », le bloc ne passe pas la relecture.  [A §8, généralisé]
│
├─ COUCHE 3 — ATTAQUER ─────────────────────── (1 p / compte · commercial · 90 s avant l'appel)
│  3.1 Segmentation : comment les catégories ont été tranchées               [A §3]
│  3.2 Carte de priorisation : X = appétence /35, Y = accessibilité, taille = CA  ★ REMPLACE A §2
│  3.3 Tableau comparatif — colonnes identité France RENSEIGNÉES             [A §5 + L2]
│  3.4 Fiche compte × N :
│        B1 Identité France : SIREN, entité, NAF, IDCC, effectif, sites      ★ (L2)
│        B2 Métier, chaîne de valeur, contrats majeurs datés                 [A + B]
│        B3 Six grilles — dont « IA : annoncé vs déployé », jamais vide      [A]
│        B4 ► COUCHE ESN — obligatoire, jamais « non vérifié » :             ★ (L1,L3,L4,L5)
│             organisation SI et décideur (fonction publique + date de prise de poste)
│             modèle d'achat, panel, référencement, canal
│             ★ conditions d'accès sectorielles : habilitation, nationalité, zone protégée
│             ESN déjà en place
│             chantiers technologiques PROUVÉS par offres d'emploi
│             triggers 12 mois, datés au mois, sourcés
│             appétence 1/3/5, moment ×2, accessibilité ×2 → /35
│        B5 Traduction commerciale : angle, 2 accroches, à ne pas dire, trous [A]
│  3.5 ► BATTLE CARD 1 page pour les comptes prioritaires                    [05-templates §4, non produit]
│  3.6 Réserve à qualifier — comptes sous le plancher de preuve              ★ (R2)
│
└─ ANNEXES ──────────────────────────────────
   A. Registre de sources numérotées : n° · fait attesté · éditeur · tier · URL · date   [B]
   B. Journal de recherche horodaté — requêtes réellement jouées                        [B-like, obligatoire]
   C. Trous déclarés, par compte et par rubrique                                        [A, systématisé]
   D. Export JSON / CSV — champs identité non nullables pour tout compte shortlisté      [A + R2]
```

### 4.3 Les quatre conversions qui créent la valeur

Ce ne sont pas des ajouts de contenu, mais des retournements de matière déjà produite. C'est là que se joue l'écart entre une bonne étude sectorielle et un plan d'attaque.

| Matière disponible (B) | Conversion | Produit pour l'ESN |
|---|---|---|
| Modèles économiques du secteur | « quel budget, engagé quand, signé par qui » | Le calendrier d'achat du compte, donc le bon moment d'appel |
| Chaîne de valeur par maillon | « à quel maillon on se branche, qui y est déjà » | L'angle différencié + la cartographie concurrentielle **ESN** (L5) |
| Dépendances de supply chain | « quelle dépendance ouvre quelle prestation » | Le catalogue d'offres adossé à un risque nommé du client |
| **Options stratégiques du compte étalon** | **« si le secteur prend cette trajectoire, quels budgets s'ouvrent »** | **La carte des budgets à 18-36 mois** — le seul usage ESN légitime de ce bloc |

Sur le cas spatial, la dernière ligne se lit ainsi : les cinq options de B (architecture résiliente multi-orbite → industrialisation smallsat → mission-as-a-service → serviceability-by-design → *exportable by design*) décrivent la trajectoire d'investissement du secteur. Retournées, elles désignent cinq familles de budget — continuité numérique et interfaces, industrialisation AIT et digital thread, plateforme sol/cloud et data fusion, logiciel de navigation relative et interfaces, cartographie de BOM et cyber-SBOM — chacune adossée à une offre du catalogue. **C'est ce mapping qui manque aux deux études, et c'est celui qui transforme la cartographie en pipeline.**

### 4.4 Ce qui disparaît

| Élément | Motif |
|---|---|
| La matrice ASCII empreinte × maturité | Positions contredisant le tableau comparatif, taille de bulle non rendue, aucune décision n'en découle. Remplacée par la carte appétence × accessibilité (§3.2), qui est celle qui sert en revue de pipeline. |
| Les fiches détaillées d'acteurs hors périmètre d'achat France | Six benchmarks US traités en fiches dans B. Une ligne de tableau suffit : ils informent le discours, ils ne se prospectent pas. |
| Les « options stratégiques » livrées en l'état | Conseil au compte étalon. Conservées uniquement sous leur forme retournée (§4.3). |
| « Besoins SI probables » sans preuve | Remplacé par « chantiers observés » adossés à une offre d'emploi, un communiqué ou un marché. Une inférence non marquée comme telle est une donnée fausse en devenir. |

### 4.5 Test d'acceptation du prochain livrable

Une étude est livrable si et seulement si :

1. Le top 3 de la couche 1 est le top 3 du tableau de la couche 3, ou l'écart est justifié en une ligne.
2. Aucun compte du top 3 n'a de champ identité `null`.
3. La couche ESN est renseignée pour **100 % des comptes prioritaires** — hypothèse qualifiée et marquée comme telle acceptée, « non vérifié » refusé.
4. Au moins une échéance réglementaire commune datée est vérifiée sur source officielle et prononçable telle quelle.
5. Chaque compte prioritaire porte au moins un trigger daté au mois, sourcé, des 12 derniers mois.
6. Chaque bloc de la couche 2 porte son « DONC, commercialement ».
7. Chaque chiffre du document porte un numéro de source résolvable en URL.
8. Le journal de recherche existe et liste les requêtes réellement jouées.
9. Les comptes sous plancher de preuve sont en réserve, pas dans la carte.
10. La page de garde porte la date de péremption (triggers 3 mois · financier 12 mois).

Sur ces dix critères : **l'étude A en passe 2, l'étude B en passe 3.** Leur fusion selon l'architecture ci-dessus en passerait 7 sans recherche complémentaire — les trois restants (couche ESN, identité France, échéances datées) exigent une passe de recherche dédiée, chiffrée à une demi-journée pour les trois comptes prioritaires. C'est, très exactement, la même conclusion que le retour de test BTP.
