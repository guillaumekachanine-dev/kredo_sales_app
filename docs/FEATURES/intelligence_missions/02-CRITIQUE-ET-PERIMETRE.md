# 02 — Critique de la vision, mises en garde et périmètre soutenable

> **Statut** : contribution d'architecture — à challenger, pas à appliquer tel quel.
> **Base factuelle** : `01-AUDIT-EXISTANT.md` (mesures du 2026-08-18). Toute affirmation
> chiffrée ci-dessous y renvoie.
> **Contexte de décision** : dernière feature majeure envisagée sur Kredo, budget temps
> contraint. Ce document arbitre en conséquence — il coupe plus qu'il n'ajoute.

---

## 1. Ce que l'idée est réellement

La vision est juste, et elle est plus étroite que son énoncé.

Elle se présente comme « un moteur d'intelligence transverse ». Techniquement, elle
propose une chose beaucoup plus précise et beaucoup plus atteignable :

> **Transformer le métier IA de Kredo — aujourd'hui écrit en JavaScript à l'intérieur de
> fichiers JSON n8n importés à la main sur un VPS — en données déclaratives versionnées,
> interprétées par un exécuteur unique.**

C'est un changement de **support du métier**, pas un changement de capacité.
Le LLM ne devient pas plus intelligent. Les analyses ne deviennent pas meilleures.
Ce qui change, c'est le **coût marginal d'une nouvelle intention**.

Reformulée ainsi, la thèse est vérifiable, et l'audit la vérifie : §3 de `01` montre que
le contenu métier d'un workflow Kredo se réduit à un quadruplet
`(rpc d'hydratation, gabarit de prompt, schéma de sortie, règles QA)`. Trois de ces quatre
éléments sont déjà de la donnée pure inscrite en dur dans du code.

**C'est le vrai cœur de la feature. Tout le reste — capacités atomiques, orchestrateur,
studio, multi-agents — est de la décoration par-dessus.**

---

## 2. Le bénéfice n'est pas là où la vision le place

### 2.1 Ce que la vision annonce

> « duplication de la plomberie technique » … « la cible est un workflow d'orchestration
> de mission » (§2, §7.1)

### 2.2 Ce que la mesure dit

- Duplication en **nombre de nœuds** : ~80 % (12/19 workflows, squelette complet).
- Duplication en **volume de code** : **~28 %**.

La plomberie (HMAC, signature, callback, statut de run) représente moins d'un tiers du
code, elle est écrite depuis longtemps, elle est stable, et elle n'a coûté aucune session
de maintenance récente. **La mutualiser rapporte peu.**

### 2.3 Le bénéfice réel, mesurable

Le coût d'une nouvelle capacité IA aujourd'hui, tel qu'établi en `01` §11 :

```
écrire le JSON n8n → import manuel VPS (Guillaume) → activation →
aucune détection de dérive (n8n:status compare des compteurs de nœuds)
```

Avec 11 workflows patchés jamais réimportés, plus `intel-010-refresh`, **le repo et le
VPS divergent silencieusement**. Chaque itération sur un prompt exige un aller-retour
humain.

Le bénéfice à viser est donc :

> **Un workflow interpréteur importé UNE FOIS sur le VPS. Ensuite, toute nouvelle mission
> — et toute retouche de prompt — est du TypeScript versionné, typé, testé en Vitest,
> déployé par `git push`. Plus jamais d'import manuel pour ajouter une intention.**

C'est ce critère, et lui seul, qui doit décider du go/no-go. Il est aussi le seul qui
répond au contexte : *« bientôt je n'aurai plus le temps »*. Une architecture qui laisse
le métier dans le JSON n8n perpétue une dépendance à une action manuelle. Une architecture
qui l'en sort la supprime.

---

## 3. Mises en garde — les six pièges réels

### 3.1 🔴 Le périmètre de validation proposé vise les trois corpus les plus vides

La vision §11 recommande de valider sur : veille existante, `source_corpus`,
`content_collection`.

Comptages live (`01` §9) : `content_collections` = **5**, `content_collection_items` = **5**,
`source_corpora` = **2**, `veille_articles` = 31.

Un moteur de missions branché là-dessus produira des livrables élégants sur du vide.
Pire : le test fondateur sera **non concluant** — on ne saura pas distinguer « le moteur
marche mal » de « il n'y avait rien à analyser ».

> **Arbitrage recommandé** : garder l'objectif de la vision (prouver que *le même contrat
> traite trois origines de corpus différentes*) mais changer les trois origines pour des
> ensembles réellement peuplés :
>
> | Origine | Volume réel | Pourquoi |
> |---|---:|---|
> | **Veille** (`veille_digests` + `veille_articles`) | 7 + 31 | Cas pilote de la vision, matière réelle, `intel-021` existe déjà |
> | **Documents** (`intelligence_documents`) | **137** | Corpus le plus fourni de Kredo, déjà typé, versionné, lié aux entités |
> | **Compte** (`companies` + `account_signals`) | 96 + 745 | Matière la plus riche, RPC d'hydratation déjà écrite et éprouvée |
>
> `content_collection` et `source_corpus` restent des **origines de corpus de premier
> rang dans le contrat** — ils sont juste testés en second, quand ils auront de la matière.
> Le contrat ne change pas ; seul l'ordre de preuve change.

### 3.2 🔴 Les 16 RPC ne sont pas des résolveurs de corpus, et vouloir les redécouper est un piège

`01` §6 : les 16 RPC sont découpées **par cas d'usage**, pas par type de corpus.
`get_pitch_context(workspace, company, offer, opportunity, mission)` n'est pas
« le corpus compte » — c'est l'assembleur de la mission « pitch ». Elles se recouvrent
partiellement, sans clé commune ni déduplication.

La tentation naturelle est de les redécouper proprement par type de corpus. **Ne pas le
faire.** Ce serait :

- une réécriture SQL massive touchant 12 workflows en production (420 runs d'historique) ;
- un big-bang sans étape intermédiaire testable ;
- pour un gain nul en V1, puisque chaque RPC fonctionne aujourd'hui.

> **Arbitrage recommandé** : traiter les 16 RPC comme **une famille de fournisseurs de
> contexte parmi d'autres**, derrière un adaptateur mince. Une RPC existante devient un
> « corpus de type `rpc_context` » identifié par son nom et ses arguments. Zéro SQL réécrit,
> zéro régression, et le résolveur générique les compose avec les corpus documentaires.
> Le redécoupage propre, s'il devient utile, se fera plus tard, RPC par RPC, sous
> pression d'un usage prouvé (P7/D10).

### 3.3 🟠 Le budget de contexte est le problème qui mordra en premier

C'est la question 4 de la vision (§14), et c'est la seule dont la réponse conditionne le
fonctionnement même du moteur.

Le patron actuel est `JSON.stringify(context, null, 2)` injecté entier dans le prompt
(`01` §3.1). Il tient parce que chaque RPC renvoie un contexte calibré pour un cas.
Dès que l'utilisateur **compose** — 137 documents + 745 signaux + un corpus sectoriel —
la fenêtre explose, silencieusement, et le LLM tronque ou dérape.

> **Exigence non négociable pour V1** : le résolveur porte un **budget de caractères
> explicite**, une **politique de troncature déterministe** (jamais aléatoire, jamais
> déléguée au LLM) et il **trace ce qu'il a gardé et ce qu'il a écarté**. Sans cela,
> P8 (« une mission doit être reproductible ») est une déclaration sans effet.
>
> Corollaire : le budget est testable en Vitest, ce qui plaide pour le placer en
> **TypeScript côté Next.js**, pas en SQL ni dans un nœud n8n.

### 3.4 🟠 `phase` porte une sémantique existante qu'une mission générique va casser

`01` §4.1 : `UNIQUE(run_id, phase)` + `CHECK phase BETWEEN 1 AND 10`. Support natif du
multi-étapes — excellente nouvelle. Mais `phase` signifie déjà, dans ADR-0007 et dans
plusieurs vues et composants : `1=analyse client`, `2=sectorielle`, `3=diagnostic`,
`4=roadmap`, `5=pitch`.

Un run de mission écrivant `phase=2` apparaîtra comme une analyse sectorielle.

> **Décision à acter explicitement** : pour un run de mission, `phase` = **index d'étape,
> à partir de 1**, et la lecture des runs de mission se fait **toujours** par
> `run_type LIKE 'mission:%'`, jamais par `phase`. À écrire dans l'ADR, sous peine de
> pollution durable de `v_ai_intelligence_summary` et des affichages par phase.
>
> Rappel utile : `result_type` est déjà la vraie clé de classification, `phase` étant
> pollué (cf. mémoire `folio-data-reality`). Ce chantier ne doit pas aggraver ce point.

### 3.5 🔴 Faille de conception à éviter : un `resultType` libre est une écriture métier libre

C'est le point le plus important de ce document.

`01` §8 : le callback aiguille sur `resultType`, en **service-role, hors RLS**, vers des
écritures métier réelles — `materializeAccountIssues` crée N lignes dans `account_issues`,
`ingestAccountKnowledgeArtifact` publie de la connaissance compte,
`saveResultAsDocument` crée un document.

Si une mission « générique » peut porter son propre `resultType`, et si l'utilisateur peut
composer une mission librement, alors une intention rédigée en texte libre peut faire
écrire un LLM dans `account_issues`. P5 (« le LLM n'écrit pas librement dans le métier »)
serait violé **par construction**, pas par accident.

> **Règle d'architecture non négociable** :
> 1. `resultType` est **lié côté serveur** par le preset de mission, jamais transmis
>    depuis le navigateur ni choisi par le LLM.
> 2. Les missions composables par l'utilisateur ne peuvent produire **qu'un seul**
>    `resultType`, celui du livrable documentaire générique. Elles n'ont **aucun** chemin
>    de matérialisation métier.
> 3. Les `resultType` à effet de bord (`account_issues_map`, `account_knowledge`) restent
>    la propriété exclusive des workflows dédiés existants.
>
> C'est exactement le durcissement déjà appliqué à `resolveKnowledgeScope` (`01` §5 : le
> serveur repart du seul `collectionId` et écrase tout `refs` du navigateur). Le chantier
> doit étendre ce réflexe, pas l'oublier.

### 3.6 🟠 « Analyser partout » est un risque produit, pas seulement technique

Un bouton *Analyser* avec un champ libre, disponible sur tous les écrans, produit
statistiquement de la synthèse générique. Après trois résultats tièdes, l'utilisateur
cesse d'y croire — et le moteur est mort alors même qu'il fonctionne.

Ce qui porte la valeur, ce sont les **presets** : une intention précise, un corpus
pertinent pré-câblé, un livrable au format attendu. Le champ libre est la **soupape**,
pas le produit.

> **Arbitrage** : ne jamais exposer un point d'entrée « mission libre » sur un écran où
> aucun preset pertinent n'existe. Mieux vaut trois entrées qui marchent que douze qui
> déçoivent. Le registre `intelligence-registry.ts` (`01` §10) sait déjà faire cela avec
> son statut `coming_soon`.

---

## 4. La limite de fond : une généralisation ne rentabilise que les cas à venir

Une abstraction se rentabilise sur le cas **N+1**, jamais sur les N cas déjà écrits.

Kredo a **12 workflows métier déjà construits, réglés et éprouvés**. Les migrer vers le
moteur générique coûterait cher et ferait *régresser la qualité* : un prompt taillé pour
`intel-031` bat un prompt générique sur la même tâche, toujours.

Les volumes d'usage mesurés (`01` §4) tranchent la question tout seuls :

| Workflow | Runs | Verdict |
|---|---:|---|
| `intel-010-refresh` | 176 | 🚫 **Ne jamais migrer** — cœur d'usage, valeur réglée |
| `intel-020-communication` | 92 | 🚫 **Ne jamais migrer** |
| `intel-030-account-knowledge` | 26 | 🚫 Ne pas migrer (63 nœuds, ingestion durcie) |
| `report-account-summary` | 19 | ⏸️ Migration possible plus tard, sans urgence |
| `intel-032-strategy` | 7 | ⏸️ Idem |
| **`intel-021-monthly-watch-analysis`** | **3** | ✅ **Pilote idéal** |

> **`intel-021` est le bon cas pilote pour la raison inverse de celle qu'avance la
> vision** : non pas parce qu'il est exemplaire, mais parce qu'il a été lancé **3 fois en
> tout**. Le migrer ne met aucune valeur en risque. Si le moteur générique l'égale, la
> preuve est faite à coût nul.

**Le moteur de missions ne remplace pas l'existant. Il ouvre une classe d'usages que
Kredo ne sait pas servir aujourd'hui : les questions ponctuelles, non anticipées, sur des
corpus que l'utilisateur compose lui-même.** C'est une addition, pas une refonte.
Cadré ainsi, il ne peut pas faire régresser Kredo — propriété précieuse pour une dernière
grosse feature.

---

## 5. Réponses proposées aux 9 questions ouvertes (§14 de la vision)

| # | Question | Réponse proposée | Justification |
|---|---|---|---|
| 1 | Nom produit affiché | **« Analyse »** en surface, `mission` dans le code | L'utilisateur ne doit pas apprendre un mot nouveau ; le code a besoin d'un terme distinct de l'`analyse` FOLIO existante |
| 2 | Mission libre = même contrat qu'un preset ? | **Oui, contrat identique** — un preset est une mission dont les champs sont pré-remplis et le `resultType` verrouillé | Un second contrat rouvrirait la duplication qu'on supprime |
| 3 | Granularité minimale de traçabilité | `{ kind, id, title, date, source }` par élément **retenu**, plus le compte des éléments **écartés par budget** | Suffit à P4 et P8 sans copier de contenu (P2) |
| 4 | Budget de contexte multi-corpus | Budget en caractères, troncature déterministe **dans le résolveur TypeScript**, tracée | §3.3 — seul endroit testable en Vitest |
| 5 | Quand passer au retrieval sémantique | **Pas en V1.** Déclencheur : quand un corpus dépasse durablement le budget malgré la troncature | `vector` v0.8 est installé, la porte reste ouverte ; l'ouvrir maintenant serait de la sur-ingénierie (P7) |
| 6 | Type documentaire des analyses transverses | **Un seul** type générique, ajouté une fois | `01` §7 — chaque valeur d'enum casse 4 `Record` exhaustifs |
| 7 | Capacités atomiques à extraire | **Aucune en V1.** Une mission = un appel LLM | D10 : on extrait quand plusieurs missions réelles le réclament, pas avant. `phase` 1→10 laisse la place |
| 8 | Meilleur point d'entrée global | **Aucun point global.** Des entrées contextuelles via `intelligence-registry.ts` | §3.6 — un lanceur global sans corpus préréglé produit du générique |
| 9 | Templates de mission dès la V1 ? | **Non.** Presets versionnés en TypeScript uniquement | Un template utilisateur = un `resultType` choisi par l'utilisateur = §3.5. À rouvrir seulement après la V1, avec `resultType` verrouillé |

---

## 6. Périmètre soutenable

### 6.1 Dans le périmètre V1

- Un **contrat de mission** unique, typé TypeScript, versionné en git.
- Un **catalogue de presets en TypeScript** (pas en base — voir `03` §3).
- Un **résolveur de corpus** couvrant 3 origines réellement peuplées (§3.1), avec budget,
  troncature déterministe et trace.
- **Un workflow n8n interpréteur**, importé une seule fois.
- Un **type documentaire générique** unique pour les livrables de mission.
- Une **matérialisation strictement documentaire** — aucune écriture métier (§3.5).
- Deux à trois **points d'entrée contextuels** greffés sur le registre existant.
- La **migration d'`intel-021`** comme preuve à coût nul.

### 6.2 Explicitement hors périmètre V1

Au-delà de la liste du §12 de la vision, qui est reprise intégralement :

- ❌ Le redécoupage des 16 RPC d'hydratation (§3.2).
- ❌ Toute migration de `intel-010`, `intel-020`, `intel-030` (§4).
- ❌ Le catalogue de capacités atomiques (Q7).
- ❌ Les missions multi-étapes — supportées par le schéma, non exposées.
- ❌ Les missions enregistrables ou partageables par l'utilisateur (Q9, §3.5).
- ❌ Toute page « Studio » (§8.4 de la vision, confirmé).
- ❌ Le retrieval sémantique (Q5).

### 6.3 Le test de sortie de V1

Un seul critère, binaire :

> **Ajouter une nouvelle intention d'analyse à Kredo ne demande aucun import n8n :
> une entrée de catalogue TypeScript, un test, un `git push`.**

Si ce critère n'est pas tenu, la V1 a produit une abstraction sans contrepartie et il faut
l'arrêter plutôt que la poursuivre.

---

## 7. Charge de travail — hypothèse optimiste et hypothèse réaliste

Unité : **session de travail**, au sens des sessions du journal Kredo (une demi-journée à
une journée dense, incluant la boucle `typecheck → test → check:server-boundary → lint →
build`).

| Lot | Contenu | Optimiste | Réaliste | Ce qui fait déraper |
|---|---|---:|---:|---|
| **L0** | Contrats + catalogue TS + tests unitaires | 0,5 | **1** | Trancher la sémantique de `phase` (§3.4) touche des vues existantes |
| **L1** | Résolveur de corpus (3 origines) + budget + trace | 1,5 | **2,5** | L'hydratation de contenu n'existe nulle part (`01` §5.1) : le registre ne rend que des métadonnées. Tout est à écrire |
| **L2** | Workflow n8n interpréteur + harnais + import VPS | 1 | **2** | Validation générique de schéma dans un nœud Code ; **et surtout** : chaque itération = un aller-retour manuel avec Guillaume. Le harnais `test:n8n` est indispensable — un harnais qui « passe » peut n'avoir rien exécuté |
| **L3** | Callback générique + type documentaire + migration | 1 | **1,5** | L'ajout d'enum casse 4 `Record` exhaustifs (`01` §7) ; l'aiguillage doit être extrait sans casser 4 chemins en production |
| **L4** | UX composeur desktop + mobile + entrées | 1,5 | **2,5** | Adaptive : deux arbres. Le suivi temps réel exige `ensureRealtimeAuth()` avant `subscribe` (piège connu). Sélection de corpus = un vrai composant, pas un `<select>` |
| **L5** | Migration `intel-021` en preset + preuve | 0,5 | **1** | Comparer les sorties ancien/nouveau demande des runs réels |
| | **Total** | **6** | **10,5** | |

### 7.1 Lecture honnête

- **L'hypothèse optimiste (6 sessions) suppose zéro aller-retour VPS raté et un résolveur
  qui tombe juste du premier coup.** Aucun des deux n'est arrivé sur les chantiers
  précédents de Kredo.
- **L'hypothèse réaliste est ~10 sessions**, soit l'ordre de grandeur d'ADR-0012
  (cockpit, 5 lots livrés).
- **L2 est le lot à risque**, pour une raison non technique : il dépend d'une action
  manuelle hors du contrôle de l'agent. Il faut le traiter en un seul aller-retour bien
  préparé (JSON généré par script, syntaxe validée par `node --check`, exécution réelle
  vérifiée par harnais avec compteur d'assertions lu), pas en itérations.

### 7.2 Si le temps manque — la coupe recommandée

Si l'arbitrage doit se faire, **couper L4, pas L1**.

- **L0 + L1 + L2 + L3 + L5 ≈ 8 sessions réalistes** livrent le moteur complet et la preuve,
  avec pour seule interface les points d'entrée déjà présents dans
  `intelligence-registry.ts` (un preset = une action contextuelle, sans composeur).
- **L4 (le composeur multi-corpus) est la partie la plus visible et la moins structurante.**
  Il peut être ajouté à tout moment ensuite, sans rien casser.

> **Un moteur sans composeur reste un moteur. Un composeur sans moteur n'est qu'un
> formulaire.** Dans un budget contraint, l'ordre est celui-là.
