# 00 — Doctrine

Ce document porte ce qui ne se négocie pas. Une règle qui n'est pas ici n'est pas un axiome :
c'est une décision d'étape, révisable dans le document d'étape concerné.

---

## 1. La finalité, et le seul test qui compte

KREDO ne produit pas des études de marché. Il produit **la capacité, pour un développeur
commercial du milieu de l'IT en France, d'ouvrir une conversation crédible avec un décideur
qui reçoit dix ESN par mois** — et de la tenir.

Quatre questions, dans cet ordre. Tout bloc de connaissance qui n'en sert aucune est supprimé.

| | Question | Ce qu'elle exige |
|---|---|---|
| **Q1** | Quel compte j'attaque en premier ? | Un score calculé, pas déclaré, et son classement relatif |
| **Q2** | À qui je parle, et par quelle porte j'entre ? | Canal d'achat, panel, habilitation, ESN en place, décideur SI |
| **Q3** | Que je dis pour être crédible en trois minutes ? | Économie du secteur, chaîne de valeur, fronts technologiques |
| **Q4** | Pourquoi maintenant ? | Une échéance datée, vérifiable, prononçable — ou un trigger sourcé |

**Le test d'acceptation du corpus entier**, à rejouer sur chaque secteur produit :

> Un commercial ouvre KREDO. Il dit quel compte il appelle ce matin et pourquoi celui-là.
> Il sait à qui parler et si KREDO a le droit d'intervenir. Il ouvre sur une échéance datée
> que son interlocuteur reconnaît. Il tient trois minutes sans être interchangeable.
> Et si le DSI demande « vous tenez ça d'où ? », **il ouvre la source**.

Les deux études du spatial produites en août 2026 permettaient le point 4. Le point 5, une
seule des deux. Les points 1 à 3, aucune. C'est le problème que ce corpus existe pour régler.

---

## 2. Les douze axiomes

### A1 — Subsidiarité des sources
**Un modèle de langage ne remplit jamais un champ qu'une source déterministe peut fournir.**

Le SIREN de Thales Alenia Space est public, gratuit et instantané. Le faire produire par un
LLM, c'est obtenir `null` sur 10 comptes sur 10 — ce qui est exactement arrivé. Trois régimes,
hermétiques :

| Régime | Produit | Outil | Taux attendu |
|---|---|---|---|
| **Déterministe** | Identité juridique, effectifs, NAF, IDCC, dirigeants, offres d'emploi, marchés attribués, textes réglementaires et leurs dates | API + n8n. **Jamais un LLM** | 100 % ou erreur explicite |
| **Génératif sourcé** | Compréhension : économie, chaîne de valeur, technologies, dépendances, trajectoires, discours | Deep Research avec registre de sources numérotées | Variable, trous déclarés |
| **Humain** | Accessibilité réelle : qui décide, quel panel, quelle habilitation, quelle ESN en place | Guillaume, 30-45 min par compte prioritaire | 100 % sur les comptes prioritaires |

**Corollaire opérationnel** : le régime déterministe s'exécute **avant** l'étude et devient
son contexte d'entrée. Le générateur ne découvre plus l'identité des comptes — il la reçoit.

### A2 — Une donnée sans source datée n'existe pas
Un trou assumé vaut mieux qu'un chiffre plausible. Un prospect qui repère **une seule**
statistique fausse invalide tout le reste du document, y compris ce qui était juste. Le coût
d'un trou déclaré est nul ; celui d'une invention détectée est total.

Conséquence de forme : chaque chiffre porte un identifiant de source résolvable en URL.
« Familles de sources » sans URL = régression, pas simplification.

### A3 — Le périmètre avant le chiffre
Jamais un CA groupe monde pour caractériser une branche France. Si le chiffre de branche
n'est pas publié, on écrit « non publié ». Chaque chiffre porte son périmètre et son exercice.
C'est la règle qui a sauvé le run BTP trois fois.

### A4 — Toute connaissance porte sa portée, et le segment est la maille par défaut
`macro` · `segment` · `compte`. **Une Master Study écrit au niveau `segment`.** Elle n'écrit
au macro que ce qui est authentiquement macro — typiquement une obligation réglementaire qui
s'impose à toute la famille.

Ce n'est pas une préférence de modélisation, c'est un constat mesuré : au 13/08/2026, les
109 comptes sont rattachés à 100 % à un `segment_id`, et 100 % de la connaissance vit sur les
15 macros. **Écrire une étude au macro, c'est produire quelque chose qu'aucun compte ne
regardera précisément.** La résolution `segment ∪ macro` existe en SQL
(`v_sector_knowledge_resolved`, `v_sector_knowledge_items`, migrations 069-071) et n'est
jamais réimplémentée en TypeScript.

Deux règles de résolution à ne pas confondre : **substitution** champ par champ pour les
scalaires et le `playbook` (clé par clé, jamais le blob) ; **union** pour les items
(réglementaire, pain points, événements, actualités) — ce sont des faits distincts.

### A5 — Cohérence dans le master, fraîcheur dans les lots
Un bloc qui doit être vrai **en même temps** que les autres ne peut pas être un lot
indépendant : il se contredirait. Un bloc qui périme plus vite que l'étude ne peut pas être
dans le master : il la ferait pourrir entière.

| Régime | Critère | Cadence |
|---|---|---|
| **Socle permanent** | Déterministe, stable, sans interprétation | Cron / à la demande |
| **Master Study** | Partage un même jugement avec les autres blocs | 1 run / segment, péremption 12-24 mois |
| **Lots rejouables** | Périme en semaines, indépendant | 7 à 90 jours |
| **Dérivé** | Ne se produit pas, se calcule | À la lecture |

La segmentation, la matrice et le message sectoriel partagent un même jugement : les séparer,
c'est fabriquer la contradiction. Les signaux, les offres d'emploi et les contacts périment en
semaines : les enfermer dans une étude annuelle, c'est garantir qu'à trois mois le livrable
est faux — et faux de façon invisible, ce qui est pire.

### A6 — Le score est calculé une fois et fait autorité partout
Le top 3 de la synthèse **est** le top 3 du tableau comparatif. Tout écart se justifie en une
ligne dans la synthèse, ou il est interdit.

Formule canonique de l'appétence, appliquée littéralement :
`total = capacite_a_payer + intensite_it + 2 × moment + 2 × accessibilite + fit_offre`
Notes en **1 / 3 / 5 uniquement** (pas de 2 ni de 4 : une échelle continue tasse les totaux au
milieu, exactement là où se prend la décision). Total sur **35**, jamais sur 25.

**Deux échelles ne se mélangent jamais dans un même tri** : `account_score_current` (ADR-0011)
fait autorité pour les comptes du portefeuille ; l'appétence /35 ne vaut que pour les comptes
`mapped` non encore qualifiés, et reste marquée `appetence_provisoire` tant que le bloc
accessibilité (A6) n'est pas renseigné.

### A7 — Plancher de preuve pour entrer dans la shortlist
Aucun compte n'est scoré, classé ni priorisé sans, **au minimum** : une entité juridique
France identifiée, un ordre de grandeur de taille (CA **ou** effectif) sur périmètre déclaré,
un trigger daté, et deux sources indépendantes dont une T1 ou T2.

En dessous : **réserve à qualifier**, jamais le top 3. Cette règle seule aurait empêché le
défaut où les deux comptes prioritaires d'une étude étaient les deux seuls dont elle ne savait
rien — l'un recevant `accessibilité 5/5` sur la seule intuition qu'une petite structure est
plus abordable, dans un document déclarant par ailleurs qu'aucun modèle d'achat n'avait été
audité.

### A8 — Fond et forme dans le même run, deux livrables
Le reformatage a posteriori détruit les preuves : une étude reformatée a perdu 90 sources
numérotées, remplacées par 15 « familles » sans URL, sans rien ajouter.

Donc : **E4 et E5 s'exécutent dans le même contexte, sur le même registre de sources**. Mais
elles produisent **deux fichiers** — parce qu'elles n'ont ni le même lecteur (direction vs
commercial), ni la même péremption (24 mois vs 12 mois), ni la même cadence de rejeu.

### A9 — Le livrable est un JSON validé ; le rapport est généré depuis lui
Le markdown est une vue, jamais la source. Motif mesuré : les deux référentiels de sources
produits en août annoncent 15 et 13 sources, leur JSON en contient **7 et 5** — la troncature
tombe exactement à la frontière du pack minimal, sur les deux, ce qui en fait un mode de
défaillance systématique du générateur et non un accident. Et le JSON n'était même pas
parsable, collé dans le markdown avec des échappements.

Invariant universel, vérifié par G1 sur **tout** livrable :
`compteur_déclaré == len(liste_effective)`, pour chaque liste du bundle.

### A10 — Le producteur n'est jamais son propre jury
Une scorecard remplie à la main par celui qui produit est une décoration. Un taux calculé est
une contrainte. Un référentiel s'est déclaré `production_ready` sur 12 critères tous
« validés », dont « passe red team exécutée », avec un journal de recherche de 5 requêtes là
où la méthode en exige 15 à 25 — et une source de son pack minimal était un cabinet privé
déclaré « Commission Européenne », tier 1, rôle `proof`.

**Aucune étude ne peut se déclarer `production_ready` elle-même.** G1 est un script, G2
s'exécute hors du contexte de production, G3 est humaine.

### A11 — Une inférence non marquée est une donnée fausse en devenir
« Besoins SI probables » est banni du vocabulaire. On écrit **« chantiers observés »**,
adossés à une offre d'emploi, un communiqué, un marché attribué ou une référence éditeur.
Ce qui reste une hypothèse porte le mot « hypothèse » et sa méthode.

Discipline de l'écart annonce / déploiement : ce qui est *annoncé* (communiqués, interviews)
et ce qui est *déployé* (offres d'emploi, références éditeurs, retours d'expérience). **L'écart
entre les deux est l'information la plus vendeuse de l'étude** — un acteur qui communique
massivement sur l'IA sans recruter un seul profil correspondant a un besoin, pas une solution.

### A12 — Chaque bloc de compréhension se termine par un « DONC, commercialement »
Une à trois lignes, écrites au niveau d'un commercial qui n'a pas lu le reste. Sans « donc »,
le bloc ne passe pas la relecture et n'entre pas dans le livrable.

Exemple de la bonne altitude : *« donc, face à un mid-market de ce secteur, on n'ouvre pas sur
la transformation mais sur la mise en conformité, parce qu'ils n'ont pas d'équipe dédiée. »*

---

## 3. Les quatre conversions qui créent la valeur

Ce ne sont pas des ajouts de contenu : ce sont des retournements de matière déjà produite.
C'est là que se joue l'écart entre une bonne étude sectorielle et un plan d'attaque. Chacune
est **obligatoire** dans E4 — un tableau livré sans sa colonne de conversion est incomplet.

| Matière produite | Conversion imposée | Produit pour l'ESN |
|---|---|---|
| Modèles économiques du secteur | « quel budget, engagé quand, signé par qui » | Le calendrier d'achat du compte, donc le bon moment d'appel |
| Chaîne de valeur par maillon | « à quel maillon l'ESN se branche, et qui y est déjà » | L'angle différencié + la cartographie concurrentielle **des ESN** |
| Dépendances de supply chain | « quelle dépendance ouvre quelle prestation » | Le catalogue d'offres adossé à un risque nommé du client |
| Options stratégiques du compte étalon | « si le secteur prend cette trajectoire, quels budgets s'ouvrent » | La carte des budgets à 18-36 mois |

La dernière ligne est le seul usage légitime, pour une ESN, d'un bloc de conseil écrit pour le
compte étalon. Non retournée, cette section est du conseil en stratégie livré au prospect —
valeur nulle pour KREDO.

---

## 4. Le squelette en huit sections — invariant de toute étape

Chaque document `03-` à `10-` porte exactement ces huit sections, dans cet ordre. C'est ce qui
rend la méthode reproductible, contrôlable et modulable : on sait toujours où chercher.

| § | Section | Question à laquelle elle répond |
|---|---|---|
| 1 | **Axiomes** | Qu'est-ce qui n'est pas négociable ici ? |
| 2 | **Moyens employés** | Quel outil, quel opérateur, quel budget, quelle durée ? |
| 3 | **Origine de l'information** | D'où vient la matière, et avec quelle force probante ? |
| 4 | **Méthode** | Quel déroulé, quelles passes, quels seuils d'arrêt ? |
| 5 | **Articulation logique** | Qu'est-ce qui doit précéder ? qu'est-ce que ça débloque ? |
| 6 | **Contrôle qualité** | Quels tests, quels gates, quel critère de rejet ? |
| 7 | **Destination et finalité** | Quelle table, quel écran, quel lecteur, quelle décision ? |
| 8 | **Livrables et formalisme** | Quels fichiers, quel schéma, quel nommage ? |

Une étape dont une section est vide n'est pas une étape légère : c'est une étape mal spécifiée.

---

## 5. Ce qu'on ne fait pas

| Idée | Motif |
|---|---|
| Créer une table pour l'identité, l'accessibilité, les échéances ou le registre de sources | `account_facts`, `account_signals`, `sector_regulatory_items`, `intelligence_sources` les hébergent. Le besoin est une **taxonomie de `fact_type` étendue**, pas du DDL |
| Fusionner à plat une étude « comprendre » et une étude « attaquer » | 45 pages illisibles. Deux lecteurs, deux temps de lecture, deux fichiers (A8) |
| Un quatrième moteur de recherche générative | Le goulot n'est pas la découverte, c'est l'acquisition déterministe et la vérification |
| Enrichir les 109 comptes via Apollo/Lusha | Coût sans usage. On enrichit ce qu'on va appeler |
| Reprendre les scores FOLIO (`legacy_folio_score`) | Déprécié, non recalculé. `account_score_current` fait autorité |
| Bâtir l'onglet Actualités sur `sector_news` | 7 lignes, aucune fraîcheur garantie. Passer par `account_signals` + veille |
| « Ingénierie sociale » pour obtenir les panels fournisseurs | Impasse méthodologique et risque inutile. L'OSINT sur les pages « devenir fournisseur » et les marchés publics fait le travail |
| Industrialiser la chaîne de valeur sur les 15 macros | Règle anti-poster : pas de chaîne sans étude concurrentielle préalable (E6 §1) |
| Écrire un playbook sectoriel à la main | C'est une **projection** de cinq sources ; le stocker, c'est garantir qu'il divergera |
| Faire produire par un LLM un champ que E2 obtient | Axiome A1. Le prompt doit l'**interdire**, pas seulement s'en abstenir |
