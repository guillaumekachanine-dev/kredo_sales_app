# 00 — Vision et principes

Ce document porte ce qui ne se négocie pas. Une règle absente d'ici n'est pas un axiome :
c'est une décision d'étape, révisable dans le document concerné.

---

## 1. La finalité, et le seul test qui compte

Account Intelligence ne produit pas une vérité sur une entreprise. Il produit **la première
compréhension utile d'un compte pour un business developer d'ESN**, assez fiable pour préparer
l'action, assez explicite sur ses incertitudes pour ne pas tromper, assez ouverte à la déduction
pour faire émerger des pistes qu'aucune source isolée ne formule.

La différence avec la Master Study est nette et doit le rester :

| | Master Study | Account Intelligence |
|---|---|---|
| Objet | Un **segment** | Un **compte nommé** |
| Fréquence | Une fois, puis entretenu | À la demande, par paliers |
| Lecteur | Directeur commercial, préparation de campagne | BD avant un rendez-vous |
| Vérité | Consolidée, arbitrée, durable | **Datée, qualifiée, révisable** |

**Le test d'acceptation**, à rejouer sur chaque compte produit :

> Un commercial ouvre la fiche d'un compte qu'il ne connaît pas. En moins de dix minutes de
> lecture, il sait ce que fait l'entreprise, comment elle gagne son argent, qui elle affronte,
> ce qui la contraint et où pourrait s'ouvrir une porte pour KREDO. Il tient trois minutes
> devant un DSI sans être interchangeable. Et quand ce DSI demande **« vous tenez ça d'où ? »**,
> il ouvre la source — **une vraie, avec une URL et une date.**

Le run Tournaire du 07/09/2026 permet les quatre premiers points. Il échoue au cinquième :
la seule source externe citable est le registre légal.

---

## 2. Les huit axiomes

### A1 — L'entité avant tout
**La résolution de la personne morale précède la première recherche externe. Sans exception.**

Mieux vaut une étude partielle de la bonne entreprise qu'une étude parfaite d'un homonyme.
La V3 avait associé Tournaire (industriel, Grasse) à une société de construction lyonnaise
homonyme, puis validé ses propres conclusions par une chaîne de vérification sophistiquée.
Une vérification en aval ne rattrape jamais une erreur d'entité en amont.

Corollaire : sous le seuil de résolution, **aucune proposition d'identité n'est écrite**.

### A2 — Rien n'est publié comme « su » sans avoir été lu
**Un rapport dont la collecte externe a échoué ne se publie pas comme un rapport nominal.**

C'est l'axiome né du défaut fondateur : `external_pages_fetched: 0` sur 4 runs V4 sur 4, publiés
`succeeded`, sans un mot à l'écran. Trois conséquences opposables :

1. Un module qui exige de la recherche externe et n'obtient aucun document **échoue ou se
   déclare explicitement dégradé** — jamais les deux à la fois, jamais aucun des deux.
2. Le compteur de pages réellement lues est **dans l'artefact**, pas seulement dans un
   `contextSnapshot` de callback que personne ne rend.
3. L'écran affiche l'ancrage. Un rapport sans source externe le dit sur sa première ligne.

### A3 — Une source est une preuve, pas un contexte
**`internal:facts:<companyId>` n'est pas une source. C'est un seau.**

Une source référençable désigne **une ligne** (`account_facts.id`, `intelligence_sources.id`,
`account_signals.id`) ou **une URL datée**. Citer un agrégat ne prouve rien et rend la puce
« Source » de l'interface mensongère : l'utilisateur clique et lit « Études FOLIO historiques ».

Le garde-fou actuel — *toute affirmation non `hypothesis` sans référence autorisée est
rétrogradée* — est correct dans son intention et **inopérant en pratique** : les cinq seaux
internes figurent dans `allowedSources`, donc les citer suffit. Sur le run Tournaire, les
10 statements `declared` citent une référence chacun ; aucune ne désigne un document.

> **La qualification épistémique doit contraindre la substance de la provenance, pas sa forme.**

### A4 — Subsidiarité des sources
**Un LLM ne remplit jamais un champ qu'une source déterministe peut fournir.**

SIREN, NAF, forme juridique, adresse du siège, effectif déclaré, date de création : registre.
Pas de génération, pas de déduction, pas de « à confirmer ». Le LLM intervient là où il est
irremplaçable : **relier ce que plusieurs sources prises isolément ne disent pas**.

### A5 — La déduction est permise, l'ambiguïté ne l'est pas
Interdire la déduction produit la V3 : onze affirmations tirées d'un seul code NAF et des pans
entiers de compréhension laissés vides. L'autoriser sans la marquer produit la V4 : une prose
excellente que rien ne distingue d'un rapport ancré.

**La règle n'est pas « moins de déduction ». C'est « toute déduction s'assume, avec son
raisonnement et ses appuis ».** Voir `04-CONTRAT-EPISTEMIQUE-ET-SOURCES.md`.

### A6 — Un propriétaire canonique par connaissance
Une analyse **cite** les faits, les signaux, les enjeux et le secteur. Elle ne devient jamais
leur seconde source de vérité. `02-DISTRIBUTION-DANS-KREDO.md` en fait la loi.

Corollaire opérationnel : **une connaissance sans destination dans le document 02 n'a pas à
être produite.**

### A7 — Ce qui est déjà su ne se rachète pas
Dix comptes d'un même segment n'achètent pas dix analyses de marché, et n'obtiennent pas dix
versions divergentes de l'histoire du secteur. La connaissance sectorielle se **lit**
(`v_sector_knowledge_resolved`), elle ne se recalcule pas par compte.

Même règle dans le temps : passer un compte de L2 à L3 ne refait pas L1 et L2. Le système
raisonne en **modules couverts / manquants / périmés**.

### A8 — La contrainte d'exécution est une contrainte de conception
Le task runner n8n coupe à **300 s**. Les runs V4 réussis mesurent **404 s, 408 s et 425 s** ;
deux runs sont morts exactement sur ce plafond.

**Un niveau d'analyse n'est donc jamais un run monolithique plus long.** La modularité n'est pas
un confort produit, c'est la seule façon de tenir le budget d'exécution. Tout lot qui allonge le
chemin critique d'un run unique est refusé par construction.

---

## 3. Ce que Account Intelligence ne fait pas

| Hors périmètre | Propriétaire | Pourquoi |
|---|---|---|
| Recommander une offre, un message, un interlocuteur | INTEL-032 → `commercial_strategy` | Comprendre ≠ vendre. Mélanger les deux a produit des « analyses » qui concluaient avant d'avoir observé |
| Créer des tâches, événements, opportunités | Roadmap (ADR-0012 D-2, gated) | Jamais automatique |
| Produire du contenu commercial | INTEL-020 | Aval |
| Écrire un attribut CRM sans validation | `enrichment_proposals` → RPC dédiées | La frontière d'écriture humaine ne bouge pas |
| Recalculer la connaissance sectorielle | Master Study | A7 |

**La frontière utile** entre comprendre et vendre :

> *« Plusieurs éléments suggèrent qu'une modernisation du SI pourrait devenir prioritaire »*
> → Account Intelligence, qualifié `inferred` ou `hypothesis`.
>
> *« Positionner la practice Data auprès du DSI avec tel message »*
> → INTEL-032.

---

## 4. Le principe directeur

La V3 a échoué en étant si rigoureuse qu'elle s'est interdit de comprendre.
La V4 échoue en comprenant si bien qu'elle dissimule qu'elle n'a rien lu.

> **KREDO doit être rigoureux sur ce qu'il prétend savoir, sans devenir si rigoureux qu'il
> s'interdit de comprendre — et sans jamais laisser croire qu'il sait quand il suppose.**

La connaissance produite n'est pas une vérité définitive. C'est un **dossier de compréhension
traçable, daté et révisable**. Ce que le commercial vérifiera sur le terrain reste la seule
information de première main — le rôle de KREDO est de lui dire précisément **où regarder**,
et **avec quel degré de confiance**.
