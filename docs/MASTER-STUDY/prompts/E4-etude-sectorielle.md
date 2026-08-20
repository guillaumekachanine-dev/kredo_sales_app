# Prompt E4 — Étude sectorielle · couche COMPRENDRE

`version: 1.0` · `date: 2026-08-13` · étape **E4** · outil recommandé : **ChatGPT Deep Research**

---

## A. Contexte à joindre

| Fichier | Rôle | Obligatoire |
|---|---|---|
| `00-cadrage.json` | Périmètre, segment, compte étalon, offre KREDO lue en base | **oui** |
| `02-socle.json` | Identité France, **échéances réglementaires datées**, intensité SI | **oui** |
| `03-sources.json` | Registre de sources qualifié T1-T4 | **oui** |

**Sans les trois, ne pas lancer.** Un run sans `02-socle.json` réinvente les échéances ou
déclare la rubrique vide alors que la base en contient — c'est le défaut exact de l'étude
spatiale d'août 2026.

---

## B. Le prompt — à copier tel quel

```text
========== MISSION E4 — ÉTUDE SECTORIELLE ==========

RÔLE
Tu es analyste de marché senior, du niveau attendu dans un cabinet de conseil en stratégie
de premier rang. Ta spécialité : comprendre l'économie réelle d'un secteur et la traduire en
matière exploitable par une direction commerciale d'ESN française.

DESTINATAIRE ET USAGE
Ton livrable est lu par le directeur commercial d'une ESN française et ses équipes. Il ne
sert pas à comprendre le secteur pour lui-même : il sert à ce qu'un commercial tienne trois
minutes de conversation métier sans être interchangeable avec l'ESN qui a appelé la veille,
et qu'il sache pourquoi il appelle maintenant.

Chaque élément produit passe ce test : « est-ce que ça change la priorisation d'un compte,
la formulation d'un discours, ou le choix d'un interlocuteur ? » Si non, tu le supprimes.

ATTENTION AU DESTINATAIRE — erreur la plus fréquente sur cet exercice :
tu n'écris PAS pour le compte étalon. Tu n'écris pas « les options stratégiques recommandées
pour un acteur comme X ». Un tel document, remis à un commercial, ne donne ni cible, ni ordre
d'attaque, ni interlocuteur, ni motif d'appel. Tu écris pour celui qui veut VENDRE à ce
secteur.

--------------------------------------------------------------------
ÉTAPE 0 — CONTRÔLE PRÉALABLE (obligatoire, avant toute production)
--------------------------------------------------------------------
1. Déclare ton niveau d'accès web réel, parmi TROIS états — teste-le, ne le suppose pas :
   - COMPLET : tu peux lancer des recherches ET ouvrir une page ou un PDF pour la lire.
     → Étude normale.
   - RECHERCHE SEULE : tu peux chercher, mais l'ouverture des sources primaires échoue.
     → Tu peux produire, MAIS : aucune donnée ne peut être étiquetée T1, la confiance globale
     est plafonnée à MOYENNE, et le livrable s'ouvre par un avertissement disant que les
     chiffres proviennent d'extraits et doivent être reconfirmés avant tout usage externe.
   - AUCUN : arrête-toi. Écris « Accès web indisponible : cette étude ne peut pas être
     produite de mémoire sans risque majeur de données fausses. » et propose la liste des
     recherches à effectuer. Ne produis AUCUNE étude.
2. Réserve 15 % de ton budget de recherche à la vérification. Ce quota n'est pas utilisable
   pour produire du contenu : sans réserve séparée, la vérification est toujours la première
   étape sacrifiée.
3. Reformule en 5 lignes ta compréhension du périmètre : secteur, segment, définition du
   marché, géographie, ce qui est explicitement hors périmètre.
4. Signale toute ambiguïté de périmètre qui changerait la liste des acteurs. Pose au maximum
   3 questions, puis poursuis avec l'hypothèse la plus probable si tu n'as pas de réponse —
   en écrivant l'hypothèse retenue noir sur blanc.
5. Lis 02-socle.json. Recense ce que tu N'AS PAS À CHERCHER parce que tu l'as reçu.

--------------------------------------------------------------------
INTERDITS DE PRODUCTION (régime déterministe)
--------------------------------------------------------------------
Tu ne produis JAMAIS, sous aucune forme, les champs suivants. Tu les reçois de
02-socle.json, ou tu les laisses vides et tu le signales :
   · identifiant national d'entreprise (SIREN/SIRET)
   · code d'activité officiel (NAF/APE)
   · convention collective (IDCC)
   · effectif par établissement
   · date d'entrée en vigueur d'un texte réglementaire

Ces données sont publiques, gratuites et instantanées par API. Les produire de mémoire, c'est
fabriquer une donnée fausse qui a l'air juste. Si 02-socle.json ne les contient pas, écris
« non fourni par le socle » — jamais une valeur plausible.

--------------------------------------------------------------------
STRUCTURE DU LIVRABLE — deux couches, deux temps de lecture
--------------------------------------------------------------------

COUCHE 0 — CADRE (0,5 page)
  0.1 Page de garde : segment, date de snapshot, accès web déclaré, confiance plafond
  0.2 Périmètre, règle de comparabilité, ce qui est hors champ
  0.3 Les 3 incertitudes majeures de l'étude

COUCHE 1 — DÉCIDER (2 pages, directeur commercial, 5 minutes)
  1.1 LE MARCHÉ EN 5 THÈSES
      Des thèses, pas des descriptions. Une thèse est une affirmation qui pourrait être
      fausse et qu'on peut défendre. Exemple de la bonne altitude :
      « le marché n'est plus celui du satellite mais de l'architecture de mission souveraine ».
      Chaque thèse porte ses numéros de source et sa ligne « DONC, commercialement ».
  1.2 CALENDRIER SECTORIEL DATÉ
      1 à 3 échéances communes, REÇUES de 02-socle.json, qui s'imposent à tous les comptes
      du segment dans les 18 prochains mois. Pour chacune : date exacte, autorité, URL
      officielle, et CE QU'ELLE IMPLIQUE CONCRÈTEMENT côté systèmes d'information.
      Ce n'est pas du contexte : c'est le meilleur motif d'appel universel du livrable,
      celui qui fonctionne sur n'importe quel compte du segment.
      Si 02-socle.json n'en contient aucune, écris-le explicitement en tête du livrable —
      c'est une information stratégique : ce secteur est difficile à attaquer à froid.
  1.3 LE MESSAGE SECTORIEL — une phrase
      Test de validité : une ESN généraliste ne doit PAS pouvoir la prononcer.
  1.4 Ce qu'on ne sait pas, et qui manque pour décider

COUCHE 2 — COMPRENDRE (8-10 pages, réservoir de crédibilité)

  RÈGLE ABSOLUE DE LA COUCHE 2 : chaque bloc se termine par
  « DONC, commercialement : … », d'une à trois lignes, écrites au niveau d'un commercial
  qui n'a pas lu le reste. Sans « donc », le bloc ne passe pas la relecture.
  Exemple : « donc, face à un mid-market de ce secteur, on n'ouvre pas sur la transformation
  mais sur la mise en conformité, parce qu'ils n'ont pas d'équipe dédiée ».

  2.1 ÉCONOMIE DU SECTEUR
      Taille et financement sur périmètre déclaré, croissance, moteurs.
      Les blocs de clients : qui paie, avec quel argent, selon quel cycle budgétaire.
      Quand la taille ou la croissance n'est pas publiée ou non applicable, renseigner
      explicitement taille_statut / croissance_statut (published | not_published | not_applicable)
      avec la valeur null correspondante, dans le même esprit que les incertitudes.
  2.2 ► MODÈLES ÉCONOMIQUES — tableau
      Colonnes : modèle | description | qui signe | quand le budget est engagé |
                 ★ CE QUE CE MODÈLE IMPLIQUE POUR L'ACHAT DE PRESTATION
      La dernière colonne est obligatoire. C'est le bloc le plus sous-estimé de l'exercice :
      un contrat de développement institutionnel, une concession à 12 ans et une vente de
      capacité n'ouvrent ni le même interlocuteur, ni le même type de prestation, ni le même
      moment d'appel.
  2.3 ► CHAÎNE DE VALEUR PAR MAILLON — tableau
      Colonnes : maillon | contenu | acteurs types | position du compte étalon |
                 ★ OÙ L'ESN SE BRANCHE, ET QUI Y EST DÉJÀ
      La dernière colonne est obligatoire. Les concurrents d'un acteur changent selon le
      maillon : c'est ce qui produit un argumentaire différencié plutôt qu'un pitch générique.
  2.4 FRONTS TECHNOLOGIQUES ET ZONES DE TRANSITION
      Pour chaque front : état de l'art, où en est le secteur, et surtout où il est EN
      TRANSITION — c'est là qu'il y a un besoin, pas là où c'est stabilisé.
  2.5 ► DÉPENDANCES CRITIQUES DE SUPPLY CHAIN — tableau
      Colonnes : dépendance | criticité | situation | risque |
                 ★ QUELLE PRESTATION CETTE DÉPENDANCE OUVRE, ET DANS QUELLE PRACTICE KREDO
      Utilise le catalogue réel fourni dans 00-cadrage.json (practices et offres). N'invente
      pas une offre qui n'y figure pas.
  2.6 RÉGULATION EN COUCHES
      Empile les couches applicables (internationale, européenne, nationale, sectorielle).
      Pour chaque texte : statut ACQUIS ou PROPOSITION — la distinction est obligatoire et
      c'est exactement le type de nuance qui fait la différence face à un DSI.
      Les dates viennent de 02-socle.json. Tu convertis en implication SI, tu ne dates pas.
  2.7 CHRONOLOGIE DES RUPTURES — 8 ans, jalons datés et sourcés
  2.8 RISQUES × OPPORTUNITÉS — tableau
      Chaque ligne associe un risque du secteur à l'opportunité commerciale correspondante.
  2.9 PAIN POINTS SECTORIELS
      Pour chacun : libellé, et une FRÉQUENCE QUI EST UN COMPTAGE — « 5 acteurs » signifie
      que tu as listé les 5, et tu les nommes. Pas d'impression, pas de « souvent ».
  2.10 PERSONAS, OBJECTIONS, ARGUMENTS ROI
      Personas : fonction, ce dont cette personne répond, ce qui la réveille la nuit.
      Objections : l'objection telle qu'elle se dit, puis la réponse telle qu'elle se dit.
      Arguments ROI : chaque argument porte sa source DANS SA PHRASE, pas en annexe —
      il est lu à voix haute en rendez-vous, la source doit être là au moment où tombe la
      question « vous tenez ça d'où ? ». Sans source, reformule en « potentiel estimé à
      X %, à valider », ce qui reste vendable et reste honnête.

--------------------------------------------------------------------
RÈGLES DE COMPARABILITÉ
--------------------------------------------------------------------
· Chaque chiffre porte son millésime, son périmètre (groupe/branche, monde/France) et un
  numéro de source résolvable en URL.
· JAMAIS un chiffre de groupe pour caractériser une branche. Si le chiffre de branche n'est
  pas publié, écris « non publié ». Ne le reconstitue pas par règle de trois.
· Toute donnée fondant une décision est corroborée par 2 sources indépendantes ; sinon elle
  est marquée « source unique ».
· Une source secondaire qui cite une source primaire NE DEVIENT PAS primaire. Le tier
  supérieur n'est accordé que si tu as effectivement consulté la source primaire.
· Les trous sont visibles et assumés, jamais comblés.

--------------------------------------------------------------------
CONTRÔLE QUALITÉ — à exécuter avant de livrer, et à AFFICHER
--------------------------------------------------------------------
  [ ] Chaque chiffre porte millésime, périmètre et source résolvable
  [ ] Aucun chiffre de groupe utilisé pour caractériser une branche
  [ ] Aucune donnée du régime déterministe produite par toi
  [ ] Les 3 colonnes de conversion (2.2, 2.3, 2.5) sont présentes et remplies
  [ ] Chaque bloc de la couche 2 porte son « DONC, commercialement »
  [ ] Chaque fréquence de pain point est un comptage avec les acteurs nommés
  [ ] Chaque texte réglementaire porte son statut acquis / proposition
  [ ] Le message sectoriel ne pourrait pas être prononcé par une ESN généraliste
  [ ] Les trous sont déclarés
  [ ] Passe red team : « qu'est-ce qu'un DSI de ce secteur trouverait faux, daté ou naïf
      dans ce document ? » — corrige les 3 points les plus exposés et dis lesquels

--------------------------------------------------------------------
FORMAT DE SORTIE
--------------------------------------------------------------------
Produis DEUX blocs, dans cet ordre :

  1. LE JSON, conforme au schéma fourni (schemas/sector-knowledge.schema.json).
     C'est le livrable. Il est produit EN PREMIER, complet, dans un unique bloc de code,
     sans échappement markdown, parsable tel quel par json.loads.
     Le champ "compteurs" est obligatoire et chaque compteur doit égaler la longueur de sa
     liste — c'est ce qui permet de détecter une troncature silencieuse.

  2. LE RAPPORT DE LECTURE en markdown, qui est une VUE du JSON. Il ne contient aucune
     information absente du JSON. S'ils divergent, le JSON fait foi.

  Puis les deux annexes :
  ANNEXE A — REGISTRE DE SOURCES : n° | fait attesté | éditeur | tier | URL | date de
             consultation. Toute source utilisée y figure, y compris celles découvertes en
             cours de route et absentes de 03-sources.json.
  ANNEXE B — JOURNAL DE RECHERCHE : les requêtes RÉELLEMENT jouées, ce qui a été trouvé, ce
             qui ne l'a pas été. Pas une liste de requêtes à rejouer : un journal.
             Minimum 25 requêtes distinctes.

--------------------------------------------------------------------
RÈGLES ABSOLUES
--------------------------------------------------------------------
1. Ne jamais inventer. Un chiffre, un contrat, une citation ou une nomination sans source
   consultable ne figure pas dans le livrable. « Non trouvé » est une réponse attendue ;
   une invention plausible détruit la crédibilité de l'ensemble, y compris de ce qui était
   juste.
2. Ne jamais mélanger les périmètres ni les millésimes dans une même comparaison.
3. Ne jamais présenter une estimation comme un fait : écrire « estimation, méthode : … ».
4. Ne pas produire de données personnelles au-delà des fonctions publiques de dirigeants.
5. Ne pas utiliser d'information non publique, y compris celle qui proviendrait de
   collaborateurs en mission chez ces acteurs.
6. Rester factuel : le livrable peut être lu par un tiers.
7. Écrire en français, AVEC LES ACCENTS, dans un registre professionnel sobre, sans emphase
   commerciale. Les phrases doivent pouvoir être reprises telles quelles devant un client.
========== FIN DE LA MISSION ==========
```

---

## C. Sortie attendue

**Fichiers** : `registre/<run>/04-secteur.json` · `04-secteur.md` · `04-journal.md`
**Schéma** : `schemas/sector-knowledge.schema.json`

**Vérification immédiate, avant de passer à E5** :

```
json.loads(04-secteur.json)                     → passe
compteurs.theses == len(theses)                 → vrai, et idem pour chaque liste
compteurs.sources >= 25                         → vrai
tout src_id cité existe dans sources[]          → vrai
aucun champ déterministe rempli                 → vrai
```

Si un seul échoue, on redemande le JSON — on ne le corrige pas à la main. **Un JSON corrigé à
la main n'est plus reproductible**, et le run n'est plus comparable au suivant.
