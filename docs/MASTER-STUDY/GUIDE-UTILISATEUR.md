# Guide utilisateur — produire une Master Study

**Ceci est un trajet balisé, pas une règle.** L'autorité reste `docs/MASTER-STUDY/` (12 axiomes
dans `00-DOCTRINE.md`, le détail de chaque étape dans `03-` à `10-ETAPE-…`, le squelette en 8
sections, les schémas JSON). En cas d'écart entre ce guide et un document numéroté, **le
document numéroté gagne** — ce guide se corrige, pas l'inverse.

Objectif de ce document : qu'on ne puisse pas lancer une étude sans savoir, à chaque instant,
où on en est, ce qu'on doit produire ensuite, et qui a le droit de trancher quoi.

---

## 0. Avant de lancer quoi que ce soit — 4 lectures, dans cet ordre

Aucune ne se saute. Sans elles, on relance un run qui ne peut pas aboutir.

1. **`00-DOCTRINE.md`**, en entier, une fois. Les 12 axiomes conditionnent tout le reste.
2. **`README.md` §5** — le registre de légitimité (ce qui, ailleurs dans le dépôt, fait
   encore autorité, ce qui est archivé, ce qui est périmé).
3. **`registre/ROADMAP-CORRECTIONS.md`** — l'état d'exécution réel, daté. C'est lui qui dit
   ce qui bloque *aujourd'hui*, pas ce guide ni la mémoire d'une session précédente.
4. **La base.** Le segment visé existe-t-il, combien de comptes y sont rattachés, que
   porte déjà le corpus dessus ? Requêtes dans
   `.agents/skills/kredo-master-study/references/etat-du-chantier.md`. Ne jamais deviner un
   corpus : le défaut le plus cher observé est une étude qui a déclaré une rubrique vide
   alors que la base en contenait déjà la matière.

Puis on annonce ce qu'on va faire et pourquoi, avant d'exécuter.

---

## 1. Comment on démarre, concrètement

Une Master Study se déclenche par le skill **`kredo-master-study`** — c'est le **seul**
déclencheur autorisé (les skills `kredo-sector-intelligence` et `kredo-sources-sectorielles`
conduisent un process v1 archivé, interdit). On peut le nommer explicitement ou simplement
formuler la demande en langage naturel ("on attaque quoi après le spatial ?", "il nous faut un
angle pour l'assurance") — le skill se déclenche sur l'intention, pas sur un mot-clé précis.

---

## 2. Choisir le parcours — une variante n'est pas une méthode allégée

Mêmes axiomes, mêmes gates, mêmes schémas partout. Ce qui change, c'est le **périmètre
d'étapes**. Si une variante devait assouplir un axiome pour tenir dans son budget, c'est le
budget qui est faux — pas l'axiome.

| Variante | Quand l'utiliser | Étapes | Durée |
|---|---|---|---|
| **V0 — Master Study** | Nouveau segment, ou refonte à 24 mois | E0→E7 (complet) | 2 j + 0,5 j humain |
| **V1 — Tier d'un compte** | « Qui d'autre j'ouvre avec le même discours ? » | E0 E1 E5' E7 | 4 h |
| **V2 — Compte unique** | Un rendez-vous dans 8 jours | E0 E2 E5'' E7 | 2 h |
| **V3 — Mise à jour** | Trimestrielle, secteur déjà étudié | E2 E5''' G1 E7 | 30 min/compte |
| **V4 — Rafraîchissement** | À 12 mois : chiffres et catégories | E2 E4' E5 E7 | 1 j |
| **V5 — Chaîne de valeur** | Secteur déjà cartographié, chaîne manquante | E6 seule | 4 h |

**V1 est la plus fréquente** — c'est la question posée en revue de pipeline. Ne pas lancer un
V0 (deux jours d'engagement) quand la demande réelle est un V1 ou un V2. Détail des conditions
dans `11-VARIANTES.md`.

Le reste de ce guide décrit le parcours complet **V0**, qui contient toutes les autres en
sous-ensemble.

---

## 3. La chaîne, étape par étape

Un run remplit **un seul dossier** : `registre/<AAAA-MM>-<slug-segment>/`. Un dossier = un run
= un snapshot ; un rejeu crée un nouveau dossier, jamais un écrasement.

### E0 — Cadrage
**Ce qu'on fixe** (dans les grandes lignes) : la définition du marché en deux phrases non
ambiguës (quelle offre, pour quels clients, sur quelle géographie), le compte étalon (un acteur
déjà connu, qui sert à calibrer la fiabilité de tout le reste), l'objectif commercial (ouverture
/ appels d'offres / extension / angle sectoriel — il oriente la profondeur du bloc
accessibilité, donc le coût de l'étude).
**Qui décide** : **Guillaume** — arrêt obligatoire n°1 (§4).
**Comment** : remplir `prompts/E0-cadrage.md`.
**Livrable** : `00-cadrage.json` (schéma `cadrage.schema.json`) — devient l'en-tête de tous les
prompts suivants ; aucune étape ne redéclare un paramètre.

### E1 — Taxonomie
**Ce qu'on vérifie** : le segment cible existe-t-il déjà dans `sector_intelligence` ? Les
comptes qui doivent y être rattachés le sont-ils ? E1 ne crée jamais un segment — créer un
segment est une décision de taxonomie à part, gouvernée par
`REFERENTIEL-CLASSIFICATION.md` (seul document faisant autorité sur ce sujet).
**Qui** : agent, contre le référentiel de classification — pas de recherche web.
**Livrable** : `01-taxonomie.json` (schéma `taxonomie.schema.json`).

### ⟨ G0 — droit de lancer ⟩
**Qui l'exécute** : **Guillaume**, juste après E1, avant E2.
**Ce qu'il refuse** : un segment inexistant, moins de 3 comptes rattachés, les 5 axes de
classification obligatoires incomplets (`segment`, `relation_type`, `regime_achat`,
`modele_eco`, `tier` — les 2 axes conditionnels `moment`/`vertical_client` peuvent rester
`NULL` s'ils sont documentés), aucun objectif commercial déclaré.
**Verdict** : `go` / `go_avec_reserve` / `no_go` — arrêt obligatoire n°2 (§4). C'est le gate qui
économise le plus de temps : il refuse de lancer une étude qui ne peut pas aboutir.

### E2 — Socle déterministe
**Ce qu'on récolte** : identité France (SIREN/SIRET, dénomination, NAF, tranche d'effectif,
**siège social** — via l'API Sirene INSEE), dirigeants et forme juridique (RNE/INPI),
calendrier réglementaire daté (Légifrance/EUR-Lex), intensité SI observable (offres d'emploi
classées par practice). **Jamais un LLM ici** (axiome A1) — c'est de l'API + n8n, 100 % ou
erreur explicite nommée.
**Livrable** : `02-socle.json` (schéma `socle.schema.json`) + `02-journal.md`. Devient le
contexte d'entrée de E3/E4/E5 : elles reçoivent l'identité des comptes, elles ne la cherchent
jamais.

### E3 — Corpus de sources
**Ce qu'on constitue** : le plus petit corpus de sources capable de couvrir les besoins de
l'étude, chaque source scorée par tier de force probante (T1-T4) et par score d'utilité — deux
mesures distinctes, jamais confondues.
**Comment** : `prompts/E3-corpus-sources.md`, Deep Research.
**Livrable** : `03-sources.json` (schéma `source-registry.schema.json`) + `03-journal.md` +
`03-scorecard.txt`. C'est le registre qui donne le droit de citer dans E4/E5.

### E4 — Étude sectorielle (« COMPRENDRE ») **et** E5 — Cartographie & comptes (« ATTAQUER »)
**Un seul run, deux livrables** (axiome A8) — même contexte, même registre de sources E3 ; le
reformatage a posteriori détruit les preuves. Mais deux lecteurs (direction vs commercial), deux
péremptions (24 mois vs 12 mois) : deux fichiers.

**E4 récolte** (grandes lignes) : économie du secteur (taille et croissance du marché, avec
statut `published`/`estimated`/`not_published` explicite si le chiffre n'est pas publié tel
quel), modèles économiques (qui signe, quand le budget s'engage), chaîne de valeur par maillon,
fronts technologiques en transition, dépendances de supply chain, régulation en couches,
chronologie des ruptures, risques × opportunités, pain points sectoriels comptés (pas
d'« impression »), personas/objections/arguments ROI sourcés. Chaque bloc se termine par un
« DONC, commercialement : … » (axiome A12) — sans lui, le bloc n'entre pas dans le livrable.
**Comment** : `prompts/E4-etude-sectorielle.md`. Source indicative pour la taille/croissance de
marché : Banque de France (Observatoire des Entreprises, fascicules sectoriels par NAF).
**Livrable** : `04-secteur.json` (schéma `sector-knowledge.schema.json`) + `04-secteur.md`
(généré, jamais l'inverse) + `04-journal.md`.

**E5 récolte** (grandes lignes), par compte, un à un — jamais en parallèle (des fiches traitées
ensemble deviennent interchangeables) : segmentation leader/challenger/mid-market/outsider
(part relative, ou critère de substitution si non calculable — jamais inventée), 5 blocs par
fiche compte : (1) identité — **reçue du socle E2, jamais recherchée**, (2) métier & chaîne de
valeur + 1-2 contrats majeurs datés sourcés, (3) les six grilles — financière (CA + évolution 3
ans, « comptes non publiés » si c'est le cas), empreinte métier, réputation, innovation/R&D avec
la sous-rubrique obligatoire IA annoncé vs déployé, avantages + vulnérabilité principale,
trajectoire, (4) couche ESN (accessibilité commerciale — organisation SI, décideur, modèle
d'achat, ESN déjà en place, voie d'entrée probable), (5) traduction commerciale (angle,
accroches, ce qu'il ne faut pas dire). Plancher de preuve avant tout scoring (axiome A7) : sans
entité juridique + ordre de grandeur CA ou effectif + trigger daté des 12 derniers mois + 2
sources indépendantes dont une T1/T2, le compte va en réserve à qualifier, jamais dans le top 3.
**Comment** : `prompts/E5-cartographie-comptes.md`. Sources indicatives pour le CA/croissance
compte : Pappers (CA historique + croissance déjà calculés, PDF source lié) ; pour un compte
coté, ajouter AMF/Info-Financière.
**Livrable** : `05-comptes.json` (schéma `competitive-map.schema.json`) + `05-comptes.md` +
`05-battlecards.md` + `05-journal.md`.

### E6 — Chaîne de valeur *(conditionnelle)*
**Ne se lance que si** E5 est déjà livré sur ce secteur, **et** au moins deux comptes occupent
des maillons différents. Sans ça, le résultat est un poster, pas un outil de découverte en
rendez-vous (règle anti-poster). Deux à trois secteurs à la fois, jamais quinze.
**Ce qu'on récolte** : maillons, acteurs positionnés par maillon, dépendances, captation de
valeur.
**Livrable** : `06-chaine.json` (schéma `value-chain.schema.json`) + `06-prospection.md`.

### ⟨ G1 — script ⟩
**Qui** : `python3 scripts/audit-master-study.py docs/MASTER-STUDY/registre/<run>/ --today
AAAA-MM-JJ`. Comptage pur, aucun jugement humain : parsabilité, invariant
`compteurs.<liste> == len(<liste>)`, sources résolvables, arithmétique de l'appétence, plancher
de preuve, couche ESN présente, journaux de requêtes suffisants.
**Sortie** : `07-g1.txt` — **ne s'édite jamais à la main**.

### ⟨ G2 — red team ⟩
**Qui** : NotebookLM, ou une session neuve — **jamais** la session qui a produit l'étude (le
changement de contexte est le point clé : un modèle qui ne répond que depuis le corpus déposé
ne peut pas combler un trou par mémoire).
**Ce qu'il teste** : 6 questions, dont 4 bloquantes.

### ⟨ G3 — recette humaine ⟩
**Qui** : **Guillaume**, seul juge. Une question : *« Est-ce que je décrocherais mon téléphone
avec ça ? »*

### E7 — Ingestion
**Ce qui se passe** : écriture en base (Supabase), estampillage (`study_snapshot_date`,
`source_run_id`), gestion de la péremption. **Jamais automatique** — arrêt obligatoire n°3
(§4) : l'agent écrit et montre la migration/l'import, ne l'exécute jamais sans accord explicite.
**Livrable** : `07-verdict.json` — le verdict final et l'estampille du run.

---

## 4. Les 4 arrêts où Guillaume décide — la vraie garde-fou

Les franchir seul est la seule faute non rattrapable du processus. Un agent qui les contourne
n'accélère rien, il invalide le run.

| # | Arrêt | Pourquoi ce n'est jamais automatique |
|---|---|---|
| **1** | **Le choix du segment** (E0), sauf si Guillaume l'a nommé | Il se calcule (nombre de comptes, corpus existant, densité du gisement déterministe), il ne s'intuite pas |
| **2** | **G0 en `no_go` ou `go_avec_reserve`** | On rend le verdict et ce qui manque, on ne contourne pas |
| **3** | **Toute écriture en base** — migration d'ingestion, `CompetitiveMapImportWizard` | L'import E5 n'est volontairement pas automatisable : la résolution d'entité produit des cas ambigus, leur arbitrage est un jugement (ADR-0019) |
| **4** | **Un doute stratégique** (« je ne vois pas comment ce secteur se vend ») | Ce n'est pas un problème de méthode, c'est une vraie question — elle se pose, elle ne se devine pas |

À chaque fin d'étape : annoncer ce qu'on a trouvé, ce qui manque, le verdict provisoire. C'est
ce qui permet d'être arrêté tôt plutôt que corrigé tard.

---

## 5. Les six refus — ce qu'aucune étape n'a le droit de faire

1. **Ne jamais produire un champ du régime déterministe** (SIREN, NAF, effectif, dates
   réglementaires) — reçu de E2, ou laissé vide.
2. **Un trou déclaré bat un chiffre plausible.** « Non publié », « non trouvé » sont des
   réponses correctes, jamais un échec.
3. **Une inférence porte son nom.** « Besoins SI probables » est banni — on écrit « chantiers
   observés », adossés à une preuve nommée, ou « hypothèse » avec sa méthode.
4. **Un compteur qui ment est pire qu'un compteur absent.** `compteurs.<liste> ==
   len(<liste>)`, toujours.
5. **Le producteur n'est jamais son propre jury.** Aucune étude ne se déclare
   `production_ready` elle-même.
6. **On n'écrit jamais dans un JSON du registre un état que la base ne porte pas.** Une mesure
   qui n'a pas eu lieu ne s'invente pas pour faire passer un gate.

---

## 6. Avant de promettre un run complet — vérifier, pas supposer

Les chiffres de couverture (segments prêts, comptes résolus, part du corpus exécutable) bougent
d'une session à l'autre. Ne jamais les citer de mémoire :

- État d'exécution réel → `registre/ROADMAP-CORRECTIONS.md`.
- Requêtes de vérification base → `.agents/skills/kredo-master-study/references/etat-du-chantier.md`.
- Registre des études déjà produites, avec verdict de gate et péremption → `registre/README.md`.

Un guide qui promet un run complet sans avoir vérifié l'état réel produit exactement le défaut
que ce corpus a été écrit pour éliminer.
