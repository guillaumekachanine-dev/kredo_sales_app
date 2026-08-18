# KREDO — Missions d'intelligence

## Vision fondatrice, note d'intention et cadre de conception

**Version** : 0.1 — document fondateur  
**Date** : 18 août 2026  
**Statut** : canonique pour la phase de cadrage  
**Périmètre** : produit, philosophie, architecture conceptuelle et principes UX — pas encore un contrat d'implémentation

---

## 1. Déclaration d'intention

Kredo ne doit pas devenir une collection de fonctionnalités « augmentées par l'IA » développées indépendamment les unes des autres.

La cible est plus simple et plus ambitieuse : **Kredo doit disposer d'un moteur d'intelligence transverse capable de transformer des ensembles de connaissances en livrables utiles, selon une intention explicite donnée par l'utilisateur.**

Le même moteur doit pouvoir servir la veille, la prospection, le CRM, le pilotage, le recrutement, le staffing, la préparation de rendez-vous, l'analyse financière ou toute autre fonction de Kredo dès lors que trois conditions sont réunies :

1. Kredo sait accéder aux éléments à analyser ;
2. l'utilisateur exprime clairement ce qu'il cherche à comprendre ou produire ;
3. le résultat attendu peut être décrit comme un livrable exploitable.

La logique fondatrice devient donc :

> **Corpus + Mission + Contraintes → Livrable**

Ce modèle remplace progressivement la logique « une fonctionnalité IA = un workflow dédié ».

---

## 2. Le problème que cette vision cherche à résoudre

Kredo possède déjà plusieurs fonctions qui réalisent, sous des formes différentes, une opération intellectuelle comparable :

- analyser une actualité ou une période de veille ;
- synthétiser des informations sur un compte ;
- produire une stratégie commerciale ;
- rédiger à partir d'un contexte ;
- analyser un secteur ;
- exploiter des documents ;
- comparer, prioriser ou mettre en perspective des informations métier.

Si chacune de ces fonctions évolue avec son propre contrat, son propre résolveur de contexte et son propre workflow n8n, trois dérives apparaissent rapidement :

- duplication de la plomberie technique ;
- incohérence dans la manière dont Kredo choisit, trace et restitue ses sources ;
- coût élevé pour étendre une capacité existante à un nouveau cas d'usage.

La présente vision inverse cette logique : **le cas d'usage devient une configuration du moteur, pas un nouveau moteur.**

---

## 3. Thèse produit

### 3.1 L'analyse n'est jamais une finalité

« Analyser » sans objectif est une instruction incomplète.

Une analyse n'a de valeur que parce qu'elle poursuit une intention : comprendre une tendance, identifier un risque, détecter une opportunité, préparer une décision, comparer des scénarios, construire un argumentaire, prioriser des actions, expliquer une variation, etc.

Kredo ne doit donc pas demander seulement :

> « Que voulez-vous analyser ? »

mais :

> **« À partir de quoi, pour répondre à quelle question, avec quelles contraintes, et pour produire quoi ? »**

### 3.2 Le véritable produit est la mission

Le moteur d'intelligence est une infrastructure. Ce que l'utilisateur manipule est une **mission d'intelligence**.

Une mission décrit :

- le **corpus** mobilisé ;
- l'**intention** poursuivie ;
- les **contraintes** à respecter ;
- le **livrable** attendu.

Une mission peut être ponctuelle, enregistrée comme modèle, ou déclenchée automatiquement lorsqu'un besoin récurrent le justifie.

### 3.3 Les corpus deviennent des objets de premier niveau

Un corpus n'est pas nécessairement un dossier de documents.

Dans Kredo, un corpus peut être constitué de :

- sources d'un référentiel sectoriel ;
- articles de veille ;
- documents Kredo ;
- listes créées par l'utilisateur ;
- comptes, opportunités, interactions, missions ou signaux ;
- résultats d'analyses antérieures ;
- plusieurs de ces ensembles combinés.

L'utilisateur doit pouvoir assembler plusieurs corpus sans connaître leur structure technique.

---

## 4. Le contrat conceptuel canonique

### A. Corpus — « sur quoi travailler ? »

Le corpus désigne l'ensemble des éléments autorisés à nourrir la mission.

Il peut être :

- **explicite** : un corpus sectoriel, une liste utilisateur, trois documents sélectionnés ;
- **contextuel** : le compte actuellement ouvert et ses données pertinentes ;
- **composé** : plusieurs corpus agrégés ;
- **dynamique** : un ensemble déterminé au moment de l'exécution selon des règles connues.

Le moteur doit conserver la provenance des éléments réellement utilisés.

### B. Mission — « qu'est-ce que je cherche à obtenir ? »

La mission porte l'intention métier.

Exemples :

- « Identifier les trois évolutions de marché susceptibles de créer une opportunité commerciale dans les six prochains mois. »
- « Comparer ces documents et expliquer les divergences de positionnement. »
- « À partir de ce compte, de son actualité et de nos offres, préparer le rendez-vous de demain. »
- « Expliquer la baisse de marge et distinguer les causes structurelles des causes ponctuelles. »

La mission doit pouvoir être exprimée librement, mais Kredo pourra proposer des **missions prédéfinies** pour les usages fréquents.

### C. Contraintes — « quelles règles doivent être respectées ? »

Les contraintes bornent la mission.

Elles peuvent concerner :

- la période ;
- le périmètre ;
- les exclusions ;
- le niveau de profondeur ;
- les règles de preuve ;
- la langue ou le ton ;
- le destinataire ;
- les données à ne jamais utiliser ;
- le budget ou le temps d'exécution.

Les contraintes sont distinctes de l'intention afin de ne pas surcharger le prompt métier.

### D. Livrable — « sous quelle forme la valeur doit-elle revenir ? »

Le moteur ne doit pas retourner par défaut un long texte générique.

Le livrable est un contrat de sortie :

- synthèse exécutive ;
- note d'analyse ;
- comparaison ;
- plan d'action ;
- briefing de rendez-vous ;
- recommandations ;
- score expliqué ;
- tableau de priorités ;
- document commercial ;
- autre structure métier définie explicitement.

Le format doit être choisi pour l'usage qui suit, pas pour faciliter le LLM.

---

## 5. Architecture conceptuelle cible

L'architecture cible repose sur des couches simples et fortement réutilisables.

```text
[ Point d'entrée Kredo ]
          │
          ▼
[ Définition de la mission ]
  corpus + intention + contraintes + livrable
          │
          ▼
[ Résolveur de corpus ]
  récupère / normalise / déduplique / trace
          │
          ▼
[ Orchestrateur de mission ]
  choisit les capacités nécessaires
          │
          ▼
[ Capacités atomiques réutilisables ]
  synthétiser · comparer · extraire · classer
  expliquer · détecter · recommander · rédiger
          │
          ▼
[ Exécution IA / règles métier ]
          │
          ▼
[ Validation + traçabilité ]
          │
          ▼
[ Livrable Kredo ]
  archivé · lié aux entités · réutilisable
```

### 5.1 Point d'entrée

Une mission peut être lancée depuis plusieurs endroits de Kredo.

Le point d'entrée doit être **transverse et contextuel** : lancer une mission depuis un compte, une liste, un secteur ou une page de pilotage doit préremplir le contexte évident sans enfermer l'utilisateur dans ce contexte.

### 5.2 Résolveur de corpus

Le résolveur est la couche qui connaît les structures de données Kredo.

Il sait transformer des références hétérogènes en un paquet de contexte exploitable, tout en conservant :

- l'identifiant d'origine ;
- le type de contenu ;
- la date/fraîcheur ;
- les informations de provenance disponibles ;
- les règles d'exclusion ;
- l'ordre ou la priorité éventuels.

**Le moteur LLM ne doit pas connaître la plomberie des tables Kredo.**

### 5.3 Orchestrateur

L'orchestrateur reçoit une mission résolue et choisit le chemin d'exécution nécessaire.

Il ne doit pas devenir un agent autonome généraliste qui improvise toute sa stratégie. En V1, il doit rester **déterministe dans son orchestration** : une mission donnée appelle une séquence connue de capacités.

### 5.4 Capacités atomiques

Une capacité est une opération intellectuelle réutilisable, par exemple :

- résumer ;
- comparer ;
- identifier des divergences ;
- extraire des faits ;
- détecter des signaux ;
- classer ;
- expliquer ;
- formuler des hypothèses ;
- produire des recommandations ;
- rédiger selon un contrat.

Ces capacités ne doivent pas être pré-construites en catalogue exhaustif. **On n'extrait une capacité commune que lorsqu'au moins plusieurs missions réelles en ont besoin.**

### 5.5 Persistance et capitalisation

Une mission produit deux niveaux de sortie distincts :

1. une trace technique immuable de l'exécution ;
2. un livrable exploitable par l'utilisateur, archivé dans Kredo.

Cette distinction existe déjà dans le modèle Kredo et doit être conservée.

---

## 6. Ancrage dans l'architecture Kredo existante

Cette vision ne justifie pas la création d'un nouveau sous-système parallèle. Au contraire, l'existant couvre déjà une grande partie des fondations nécessaires.

### 6.1 Exécution générique déjà disponible

`ai_intelligence_runs` et `ai_intelligence_results` constituent déjà un registre transverse des exécutions IA.

Le modèle actuel permet notamment :

- des runs non limités à un compte ;
- un `primary_entity_type` / `primary_entity_id` ;
- un `input_snapshot` générique ;
- le suivi du statut, des coûts et des tokens ;
- la persistance du contexte, des sources et des contrôles qualité dans les résultats.

**Décision fondatrice : les missions d'intelligence doivent réutiliser ce registre, pas introduire une nouvelle famille de tables de runs.**

### 6.2 Deux familles de corpus existent déjà

Kredo possède désormais deux mécanismes complémentaires.

#### Corpus de sources administrés

`source_catalog` + `source_corpora` + `source_corpus_items`

Ils portent les référentiels de sources structurés, notamment sectoriels, avec des notions de qualité, de rôle, d'éligibilité et d'activation.

#### Collections éditoriales utilisateur

`content_collections` + `content_collection_items`

Elles permettent à l'utilisateur de créer des listes homogènes ou des corpus hétérogènes sans dupliquer le contenu canonique.

**Décision fondatrice : ces deux modèles ne doivent pas être fusionnés artificiellement en base. Ils doivent converger au niveau du résolveur de corpus.**

### 6.3 Les livrables disposent déjà d'une couche documentaire

`intelligence_documents`, `intelligence_document_versions` et `intelligence_document_links` offrent déjà :

- un document utilisateur distinct du résultat technique ;
- le versioning ;
- les liens vers les entités métier ;
- la recherche ;
- l'archivage ;
- la traçabilité vers le résultat source.

**Décision fondatrice : une mission produisant un livrable durable doit capitaliser dans cette couche documentaire.**

### 6.4 Le premier cas existant à généraliser

Le workflow `intel-021-monthly-watch-analysis` analyse déjà un corpus explicite de `veille_digests` et `veille_articles`, avec :

- une période ;
- des IDs de corpus ;
- un déclenchement manuel ou planifié ;
- un contrat de sortie structuré : tendances, signaux faibles, réglementation, opportunités, risques et actions prioritaires.

Il constitue un **excellent cas pilote** : son métier reste valable, mais son mécanisme doit devenir un preset de mission plutôt qu'une exception architecturale.

---

## 7. Philosophie d'orchestration n8n

### 7.1 Un orchestrateur générique, pas un workflow par question

Créer un workflow n8n distinct pour chaque cas d'usage conduirait rapidement à reproduire les mêmes étapes :

- validation ;
- hydratation du contexte ;
- sélection des sources ;
- construction du prompt ;
- appel LLM ;
- contrôle qualité ;
- callback ;
- persistance.

La cible est donc un **workflow d'orchestration de mission** auquel sont passés un contrat de mission et des références de corpus.

Les workflows spécialisés ne restent légitimes que lorsque le processus possède réellement un cycle de vie ou des intégrations spécifiques : scraping, parsing de CV, vérification indépendante, ingestion documentaire, etc.

### 7.2 Réutiliser les fondations CORE

Les règles d'architecture Kredo restent inchangées :

- Next.js valide l'utilisateur et déclenche ;
- n8n exécute les traitements longs ;
- Supabase reste la source de vérité ;
- l'UI lit les résultats depuis Supabase ;
- aucun webhook n8n n'est appelé directement depuis le navigateur.

### 7.3 Le déclaratif avant l'agentique

Une mission doit d'abord être décrite par un objet stable et versionné.

L'orchestrateur exécute ce contrat. Il ne décide pas librement du périmètre métier ni des actions à écrire dans Kredo.

**Kredo peut recommander ; l'humain valide avant toute matérialisation métier.**

---

## 8. Principes UX fondateurs

### 8.1 « Analyser » doit devenir une capacité accessible partout

Le moteur n'a pas vocation à être enfermé dans la page Veille.

À terme, Kredo doit proposer un point d'entrée transversal de type **Analyser / Nouvelle mission**, disponible depuis les zones où l'utilisateur travaille réellement.

L'ouverture depuis un contexte doit préremplir le corpus :

- depuis un compte → compte courant ;
- depuis une liste → liste courante ;
- depuis un corpus sectoriel → corpus courant ;
- depuis une opportunité → opportunité et compte associés ;
- depuis le cockpit global → workspace ou sélection courante.

L'utilisateur peut ensuite ajouter ou retirer des corpus.

### 8.2 L'interface doit exprimer l'intention, pas le prompting

L'utilisateur ne doit pas avoir à comprendre l'architecture du LLM.

Une composition de mission minimale peut tenir en quatre blocs :

1. **Sources / corpus** — « Sur quoi travailler ? »
2. **Objectif** — « Qu'est-ce que je cherche à comprendre ou décider ? »
3. **Consignes** — « Quelles contraintes respecter ? »
4. **Résultat attendu** — « Que veux-je obtenir ? »

Un champ libre reste disponible pour l'intention, mais les usages fréquents peuvent être proposés comme presets.

### 8.3 Adaptive Design

#### Desktop — Analyse

Le Desktop privilégie :

- la composition de plusieurs corpus ;
- la visibilité sur le contenu sélectionné ;
- les paramètres avancés ;
- la consultation détaillée des sources et du résultat.

Le bon pattern pourra être un panneau latéral ou un espace de composition dédié lorsque la complexité le justifiera.

#### Mobile — Action

Le Mobile privilégie :

- le lancement rapide depuis le contexte courant ;
- quelques presets de mission ;
- une instruction courte ;
- un livrable consultable immédiatement.

Les options avancées restent secondaires. Aucun composant Desktop lourd ne doit être chargé puis simplement masqué.

### 8.4 Pas de « Studio » lourd par défaut

Une page dédiée pourra devenir utile pour les missions complexes, mais elle n'est pas un prérequis V1.

Le premier objectif est de rendre le moteur accessible **dans les parcours existants** avec un compositeur léger et réutilisable.

---

## 9. Cas d'usage de référence

Ces exemples illustrent la transversalité recherchée. Ils ne constituent pas un backlog à implémenter immédiatement.

### Veille & actualité

**Corpus** : digests du mois + corpus sectoriel.  
**Mission** : identifier les évolutions qui modifient réellement le terrain commercial.  
**Livrable** : analyse stratégique avec tendances, risques, opportunités et actions.

### Corpus sectoriel

**Corpus** : référentiel de sources d'un secteur.  
**Mission** : produire une analyse structurée sur une question précise, par exemple « quelles évolutions réglementaires créent le plus de pression sur les DSI ? ».  
**Livrable** : note d'analyse sourcée.

### Liste ou corpus utilisateur

**Corpus** : documents, articles et sources assemblés manuellement autour d'un thème.  
**Mission** : dégager les thèses principales, contradictions et implications pour Kredo.  
**Livrable** : synthèse thématique structurée.

### Compte / CRM

**Corpus** : compte + signaux + interactions + opportunités + documents + secteur.  
**Mission** : préparer un rendez-vous ou définir le plan d'attaque des 30 prochains jours.  
**Livrable** : briefing ou plan d'action.

### Recrutement / Staffing

**Corpus** : besoin + ensemble de profils + entretiens ou notes.  
**Mission** : identifier les meilleurs profils mais aussi les zones de risque et les lacunes du vivier.  
**Livrable** : shortlist expliquée ou diagnostic de couverture.

### Pilotage financier

**Corpus** : P&L, CRA, missions, opportunités, hypothèses financières.  
**Mission** : expliquer une variation de marge et identifier les leviers actionnables.  
**Livrable** : note causale et plan de correction.

### Stratégie commerciale transverse

**Corpus** : étude sectorielle + actualités + comptes cibles + catalogue d'offres + historique commercial.  
**Mission** : construire un plan d'attaque commercial sur 30 jours.  
**Livrable** : priorités, comptes, angles d'entrée et actions recommandées.

---

## 10. Principes non négociables

### P1 — Une seule source de vérité

Supabase conserve les données métier, les références de corpus, les traces d'exécution et les livrables.

### P2 — Pas de duplication des contenus

Un corpus référence les contenus canoniques ; il ne les copie pas.

### P3 — Pas de workflow par cas d'usage

Une nouvelle intention ne justifie pas à elle seule un nouveau workflow.

### P4 — Les sources réellement utilisées doivent être traçables

Un livrable important doit permettre de remonter à ses éléments de contexte et à ses sources.

### P5 — Le LLM n'écrit pas librement dans le métier

Il produit des analyses, propositions et recommandations. Toute matérialisation sensible dans CRM, planning, staffing ou finance reste explicitement contrôlée.

### P6 — Les calculs déterministes restent hors LLM

Marge, TJM, scoring déterministe, agrégats et règles métier restent dans les moteurs TypeScript/Postgres adéquats. Le moteur d'intelligence les interprète ; il ne les remplace pas.

### P7 — L'orchestration doit rester légère

On ne crée pas une couche abstraite pour un besoin hypothétique. Les abstractions apparaissent lorsque l'usage les prouve.

### P8 — Une mission doit être reproductible

Le contrat de mission, le corpus résolu, le modèle utilisé et le livrable doivent être suffisamment tracés pour comprendre comment le résultat a été produit.

---

## 11. Premier périmètre de validation recommandé

La vision doit d'abord être validée sur trois entrées réelles déjà disponibles dans Kredo :

1. **Veille existante** — rendre le déclenchement manuel de l'analyse existante central et la traiter comme une mission prédéfinie ;
2. **Corpus sectoriel** — lancer une analyse à la demande sur un `source_corpus` ;
3. **Corpus utilisateur** — lancer la même mécanique sur un `content_collection` de type `corpus` ou sur une liste réutilisée comme source.

Le test fondateur n'est pas la sophistication du résultat. Il est de prouver que **le même contrat de mission et la même orchestration** savent traiter ces trois origines de corpus.

Le multi-corpus vient immédiatement après cette preuve si le résolveur a été conçu correctement.

---

## 12. Ce que ce chantier ne doit pas devenir maintenant

Cette vision ne justifie pas, à ce stade :

- un système multi-agent autonome ;
- un nouveau framework d'agents dans Next.js ;
- un workflow n8n pour chaque métier ;
- une nouvelle base vectorielle générale ;
- la vectorisation systématique de toutes les données Kredo ;
- un marketplace de prompts ;
- un moteur de planification autonome capable d'écrire partout ;
- une taxonomie exhaustive de centaines de « skills » IA ;
- une refonte des tables de corpus déjà créées ;
- une page « Studio » complexe avant d'avoir validé les usages.

**La force de l'idée vient de la mutualisation, pas de la sophistication.**

---

## 13. Décisions fondatrices actées par ce document

| # | Décision | Conséquence |
|---|---|---|
| D1 | Kredo adopte le concept de **Mission d'intelligence** | Les nouveaux cas IA sont d'abord décrits comme des missions |
| D2 | Contrat canonique : **Corpus + Mission + Contraintes → Livrable** | Le prompting devient une traduction interne de ce contrat |
| D3 | Les corpus administrés et les collections utilisateur convergent au **résolveur**, pas dans une table unique | Pas de refonte DB préalable |
| D4 | `ai_intelligence_runs/results` restent le registre d'exécution | Pas de système de runs parallèle |
| D5 | `intelligence_documents` reste la couche des livrables durables | Les analyses utiles deviennent capitalisables |
| D6 | n8n reste le moteur des traitements longs | Next.js demeure la passerelle courte et sécurisée |
| D7 | Une nouvelle mission ne crée pas automatiquement un nouveau workflow | Priorité à l'orchestrateur générique |
| D8 | L'UX est contextuelle et transverse | « Analyser » doit pouvoir être invoqué depuis plusieurs modules |
| D9 | V1 reste déclarative et déterministe dans son orchestration | Pas d'agent autonome généraliste |
| D10 | Les abstractions sont créées à partir d'usages prouvés | Protection explicite contre la sur-ingénierie |

---

## 14. Questions à challenger dans les prochains travaux

Ces sujets sont volontairement ouverts :

1. Quel nom produit doit être affiché à l'utilisateur : **Analyse**, **Mission**, **Mission d'intelligence**, autre ?
2. Une mission libre et un preset doivent-ils partager exactement le même contrat de données ?
3. Quelle granularité minimale de traçabilité faut-il imposer aux éléments d'un corpus non documentaire ?
4. Comment gérer le budget de contexte lorsqu'un utilisateur combine plusieurs corpus volumineux ?
5. À quel moment faut-il introduire un retrieval sémantique plutôt qu'une résolution relationnelle/déterministe ?
6. Quel type documentaire générique doit représenter les analyses transverses dans `intelligence_documents` ?
7. Quelles capacités atomiques existent déjà dans les workflows et doivent être extraites réellement, plutôt que recréées ?
8. Quel est le meilleur point d'entrée global sans alourdir l'interface mobile ?
9. Faut-il permettre l'enregistrement et le partage d'une mission comme template dès la première version, ou attendre la répétition réelle de l'usage ?

Ces questions doivent être résolues par l'audit de l'existant et par des cas pilotes, pas uniquement par conception théorique.

---

## 15. North Star

La cible peut se résumer ainsi :

> **Kredo n'est pas un logiciel auquel on ajoute de l'IA. Kredo est une plateforme qui orchestre des missions d'intelligence à partir des connaissances du centre de profit.**

Chaque nouveau module enrichit les données et les corpus accessibles au moteur.  
Chaque nouvelle capacité intellectuelle augmente le nombre de missions possibles.  
Chaque mission produite doit, à son tour, enrichir la mémoire exploitable de Kredo.

L'objectif n'est donc pas de multiplier les fonctionnalités IA.

**L'objectif est de construire progressivement un même moteur qui devient plus utile à mesure que Kredo sait davantage de choses.**
