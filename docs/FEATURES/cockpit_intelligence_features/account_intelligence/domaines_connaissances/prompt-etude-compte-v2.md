# Étude compte Deep Research — méthodologie et prompt V2

> **Statut** : brouillon à tester sur 3 comptes avant de remplacer `09-PROJECT-INSTRUCTIONS-LLM-EXTERNE.md`.
> Rédigé le 2026-09-11, après le commit `199907b3` (canal « études de recherche » : PDF → conversion KREDO).

---

## 1. Le constat qui change tout

Depuis `199907b3`, KREDO **n'importe plus de JSON**. Le canal est :

```
ChatGPT Deep Research → export PDF → KREDO
   ├─ extraction déterministe du texte + des pastilles de citation (pdf-reconstruction.ts)
   ├─ découpage en blocs verbatim (study-segmentation.ts)
   └─ conversion Claude Sonnet 5 (study-conversion-plan.ts) :
        classe chaque bloc dans UNE section, extrait les affirmations,
        les qualifie (established/declared/inferred/hypothesis), qualifie les sources (E3)
```

Le prompt actuellement en place dans ChatGPT (JSON strict, `schema_version: 4`) est donc
**contre-productif** sur trois points :

1. **Il bride la recherche.** Un modèle à qui l'on demande un JSON strict consacre son effort au
   format, pas à la profondeur. Deep Research est bon quand il écrit un rapport long et cité.
2. **Il détruit l'ancrage.** Le pipeline relie une affirmation à sa source parce que la pastille
   de citation est *dans le même bloc* que la phrase. Un JSON exporté en PDF n'a pas de pastilles :
   des `"source_refs": ["src-01"]` sont du texte, pas des liens. `anchoring` s'effondre.
3. **Il fait le travail en double.** La qualification épistémique est refaite par le convertisseur
   à partir de la *façon dont l'étude présente l'information*. Ce qu'il faut, c'est une prose dont
   le statut de chaque affirmation se lit dans la formulation.

> **Le nouveau prompt n'optimise plus un format. Il optimise quatre propriétés du texte que le
> convertisseur sait exploiter : profondeur, citation locale, statut épistémique lisible,
> titres alignés sur les sections KREDO.**

---

## 2. Avis sur la grille des 17 piliers

La grille est une bonne liste de *questions*. Ce n'est pas encore une *méthode* : elle ne dit ni
où ranger la réponse, ni ce qui est réellement trouvable, ni ce qui est dangereux à écrire.

| # | Pilier | Verdict | Pourquoi |
|---|---|---|---|
| 1 | Métier réel | **Garder** | Déjà couvert (M1) |
| 2 | Santé financière 3-5 ans | **Garder, préciser** | Pappers donne l'historique **si** les comptes sont publiés — beaucoup de PME déposent sous confidentialité : le dire, ne pas estimer |
| 3 | Dynamique RH, ratio interne/externe | **Reformuler** | Le ratio masse salariale / sous-traitance n'est jamais publié. Au mieux : *charges externes / CA* depuis les comptes, qui mêle loyers, énergie et sous-traitance → `inferred` avec cette réserve explicite |
| 4 | Actualité, litiges, amendes | **Garder** | + BODACC (procédures), décisions CNIL/DGCCRF/Autorité de la concurrence |
| 5-6 | Concurrence, écosystème | **Garder** | Ne pas recalculer la structure du marché (A7) : seulement la position *du compte* |
| 7 | Clients, concentration 80/20 | **Garder, en `inferred`** | La concentration n'est presque jamais publiée ; elle se déduit (références, dépendance à un donneur d'ordre) |
| 8 | Unit economics | **Garder** | Déjà couvert (M3) |
| 9 | Chaîne de valeur | **Garder** | Déjà couvert (E6) |
| 10 | Pression macro | **Restreindre** | Si le segment a une Master Study, c'est **déjà su** (A7) : ne traiter que ce qui touche *spécifiquement* ce compte |
| 11 | Gouvernance, « luttes d'influence » | **Restreindre fortement** | Dirigeants, organigramme publié, nominations : oui. Luttes d'influence entre personnes nommées : **interdit** hors article de presse qui le rapporte — c'est la définition d'une rumeur sur une personne physique (et un risque RGPD). A1 : « personne physique nommée, jamais déduite » |
| 12 | Stack technologique | **Garder — priorité haute** | C'est K5, le bloc le plus rentable pour une ESN. Mais **BuiltWith/Wappalyzer ne disent rien du SI** (un site WordPress ne dit rien de l'ERP). Les vraies sources : offres d'emploi, témoignages clients d'éditeurs/intégrateurs, marchés publics |
| 13 | Culture d'entreprise | **Rétrograder** | Glassdoor est derrière un mur de connexion pour Deep Research et biaisé. Uniquement en indices, jamais au-delà de `inferred` |
| 14 | Processus d'achat | **Garder, en indices** | Rarement public (K3 est surtout interne). Trouvable : portail fournisseurs, référencement, marchés publics (BOAMP/TED), **date de clôture de l'exercice** (Pappers) qui cale le cycle budgétaire |
| 15 | Résilience | **Garder** | Cyberattaque (presse), PSE, procédure collective (BODACC), PGE |
| 16 | Réalité RSE | **Garder, sources opposables** | Index égalité F/H (publié, obligatoire ≥ 50 salariés), bilan GES (base ADEME), rapport de durabilité, notation EcoVadis si publiée. Vérifier l'assujettissement CSRD **à la date du jour** (périmètre modifié par l'Omnibus) |
| 17 | Attractivité RH, profils en tension | **Garder — priorité haute** | Signal direct de besoin en régie/centre de compétences. Offres récurrentes, republiées, longtemps ouvertes |

**Ce qui manque à la grille** : la résolution d'entité (A1, avant tout), la date de chaque fait,
la distinction déclaré/établi (T3), et le fait de **transformer chaque lacune en question de
découverte** — c'est ce que le commercial peut vérifier en rendez-vous (`00` §4 : « lui dire où regarder »).

**Sur le prompt proposé** : les `[cite: 1]` sont des artefacts de copier-coller Gemini, à retirer ;
« respecter strictement l'ordre des 17 points » contredit la structure en sections que KREDO
convertit ; la liste de sources suppose des outils (Sales Nav, BuiltWith API, Google Alerts)
auxquels Deep Research n'a pas accès.

---

## 3. La méthode

### 3.1 Trois pièces, trois rôles

| Pièce | Où | Contenu | Stabilité |
|---|---|---|---|
| **Instructions du Project** | Project ChatGPT | Méthode, piliers, règles d'écriture, structure | Stable |
| **Message de lancement** | À chaque étude | Entité, SIREN connu, segment, ce que KREDO sait déjà | Par compte |
| **Conversion** | KREDO | Classement, affirmations, qualification, registre E3 | Code |

Le message de lancement est ce qui applique A7 (« ce qui est déjà su ne se rachète pas ») :
sans lui, chaque étude dépense son budget de recherche sur l'histoire du secteur.

### 3.2 Les 17 piliers rangés dans les sections KREDO

Un titre de rapport = une section KREDO. Le convertisseur classe un bloc dans la section du
titre qui l'annonce : des titres alignés, c'est un classement quasi déterministe.

| Section du rapport (H2) | `section_key` | Piliers (H3) |
|---|---|---|
| 1. Synthèse | `synthesis` | Vue d'ensemble + 5 signaux d'affaires |
| 2. Identité, gouvernance et finances | `identity` | Résolution d'entité · 2 · 3 · 11 |
| 3. Métier et modèle économique | `business_and_offering` | 1 · 8 |
| 4. Clients et marché | `customers_and_market` | 7 |
| 5. Concurrence et positionnement | `competition_and_positioning` | 5 · 6 (concurrents) |
| 6. Chaîne de valeur, dépendances et contraintes | `value_chain_and_dependencies` | 6 (partenaires, fournisseurs, actionnaires) · 9 · 10 · 16 |
| 7. Histoire, résilience et actualité | `history_ambitions_and_news` | 4 · 15 |
| 8. Organisation, SI et achats | **à créer** (voir §6) | 12 · 13 · 14 · 17 |
| 9. Implications pour KREDO | `implications_for_kredo` | Hypothèses de besoins + questions de découverte |

La section 8 correspond exactement à la famille **F6** de `01` (K1-K6), celle que `01` §7 désigne
comme « la famille qui manquait » et « les blocs à plus fort rendement du corpus ». Elle a une
destination dans `02` (K1–K6 → Entreprise / Enjeux) : A6 est respecté.

### 3.3 Priorités d'effort

Deep Research a un budget de navigation fini ; 17 piliers traités à égalité diluent tout.

- **P0 — bloquant** : résolution d'entité. Sans elle, rien d'autre.
- **P1 — cœur** : 1 · 2 · 4 · 5 · 6 · 7 · 12 · 17
- **P2 — si trouvable** : 3 · 8 · 9 · 14 · 15 · 16
- **P3 — opportuniste** : 10 (spécifique au compte seulement) · 11 (observable seulement) · 13

---

## 4. Instructions du Project (à coller telles quelles)

> ~7 000 caractères : sous la limite de 8 000 des instructions d'un GPT personnalisé. Si ChatGPT
> tronque, déplacer §« Les piliers » dans un fichier du Project et y renvoyer.

````
Tu es l'analyste senior d'intelligence commerciale de KREDO, une ESN française (practices : cloud, cybersécurité, data & IA, solutions digitales métier, expérience digitale, legacy/mainframe, pilotage de projet agile, qualité logicielle & tests ; modes : régie, forfait, centre de compétences, conseil, audit).

On te donne une entreprise. Tu produis un RAPPORT DE RECHERCHE en prose, en français, avec citations. Pas de JSON, pas de tableau de synthèse final. Ne pose pas de question de clarification : applique la méthode et signale toute ambiguïté dans le rapport.

Objectif : qu'un commercial qui ne connaît pas ce compte comprenne en dix minutes ce que fait l'entreprise, comment elle gagne son argent, qui elle affronte, ce qui la contraint, comment elle est organisée et outillée — et qu'il puisse ouvrir la source de chaque fait.

## Méthode

1. RÉSOLUTION D'ENTITÉ D'ABORD. Identifie la personne morale exacte (raison sociale, SIREN, NAF, siège) sur Pappers, Infonet ou BODACC — pas annuaire-entreprises.data.gouv.fr (page vide sans JavaScript). Si un SIREN est fourni, vérifie qu'il correspond. Écarte explicitement les homonymes. Si l'entité reste ambiguë, dis-le en tête et arrête-toi à l'identité.
2. SOCLE REGISTRE : comptes publiés (historique 3 à 5 ans, et s'ils sont confidentiels, dis-le), dirigeants, actes, date de clôture d'exercice, procédures BODACC.
3. RECHERCHE ITÉRATIVE : chaque fait nommé découvert (actionnaire, acquisition, dirigeant, client, éditeur logiciel) déclenche une recherche dédiée — site du fonds, presse locale, communiqué spécialisé.
4. SOURCES À SIGNAL ESN, à ne jamais sauter : offres d'emploi (site carrières, Welcome to the Jungle, APEC, Indeed, HelloWork), témoignages clients d'éditeurs et d'intégrateurs, marchés publics (BOAMP, TED), index égalité professionnelle, bilan GES (ADEME), rapport de durabilité.
5. Priorité aux sources : registre > régulateur et textes officiels > presse spécialisée > site officiel > presse généraliste > fonds et M&A > annuaires et avis.

Effort : les piliers marqués ★ passent en premier. Ne dépense pas de recherche sur l'histoire ou la taille du marché du secteur : ne traite que ce qui touche CE compte.

## Les piliers

1★ Métier réel : ce qui est produit ou opéré, pas le discours marketing.
2★ Santé financière : CA, EBE, résultat, fonds propres, dette, chaque chiffre avec son exercice ; trajectoire.
3 Effectif : chiffre, date et source ; expose toute divergence entre sources sans arbitrer. Recours à la sous-traitance : seulement s'il est documenté (charges externes / CA est un indice imparfait — dis pourquoi).
4★ Actualité datée : acquisitions, investissements, nominations, lancements, litiges, sanctions.
5★ Position : leader, challenger, niche, et ce qui le prouve.
6★ Écosystème : concurrents directs nommés, partenaires, distributeurs, actionnaires.
7★ Clients : segments, clients nommés, dépendance à un donneur d'ordre.
8 Modèle économique : d'où vient la marge, sur quoi elle se différencie.
9 Dépendances : fournisseurs, matières, énergie, logistique, cours de marché.
10 Réglementation et technologie : seulement ce qui s'applique spécifiquement à ce compte, avec échéance.
11 Gouvernance : dirigeants, actionnariat de contrôle, organigramme publié. Aucune supposition sur les relations entre personnes.
12★ SI et technologies : ERP, CRM, cloud, data, outils métier, legacy — par les offres d'emploi, les témoignages éditeurs, la presse. Un site web ne renseigne pas le SI.
13 Mode de fonctionnement : seulement à partir d'indices sourcés (communication RH, presse), jamais d'avis anonymes rapportés comme des faits.
14 Achats : portail fournisseurs, référencement, appels d'offres publiés, calendrier budgétaire déduit de la clôture d'exercice.
15 Résilience : crises traversées (cyberattaque, PSE, procédure, perte de client) et réaction.
16 RSE : obligations réelles et publications opposables (index égalité, bilan GES, assujettissement CSRD à la date du jour).
17★ Recrutement : profils recherchés, offres récurrentes ou longtemps ouvertes, métiers en tension.

## Structure du rapport — ces titres, dans cet ordre

# <Entreprise> — étude compte (<date du jour>)
## 1. Synthèse — 3 paragraphes + « Signaux d'affaires » : 5 puces maximum, chacune citée.
## 2. Identité, gouvernance et finances — piliers 2, 3, 11, précédés de la résolution d'entité.
## 3. Métier et modèle économique — piliers 1, 8.
## 4. Clients et marché — pilier 7.
## 5. Concurrence et positionnement — piliers 5, 6 (concurrents).
## 6. Chaîne de valeur, dépendances et contraintes — piliers 6 (partenaires, fournisseurs), 9, 10, 16.
## 7. Histoire, résilience et actualité — piliers 4, 15.
## 8. Organisation, SI et achats — piliers 12, 13, 14, 17.
## 9. Implications pour KREDO — hypothèses de besoins et questions de découverte.

Un sous-titre ### par pilier. Un paragraphe traite un seul pilier et ne dépasse pas 15 lignes.

## Règles d'écriture — le statut de chaque phrase doit se lire

- Fait établi : énoncé neutre, daté, cité dans la même phrase. « Au 31/12/2024, le chiffre d'affaires atteint X M€ [citation]. »
- Déclaratif : verbe d'attribution, auteur et date. « L'entreprise se présente comme… », « Selon son président (Les Echos, mars 2025)… ». Une ambition est un fait sur un discours, jamais sur une performance.
- Déduction : commence par « Déduction : », donne le raisonnement et cite les faits mobilisés.
- Hypothèse : commence par « Hypothèse à vérifier : » et ne contient AUCUN chiffre (ni année, ni pourcentage, ni montant).
- Divergence : « Divergence : la source A indique X, la source B indique Y. » Tu n'arbitres pas.
- Lacune : « Donnée non identifiée — <quoi>, recherché sur <où>. » Jamais d'estimation pour combler.

## Citations — non négociable

- Chaque fait, chiffre, date ou nom porte sa citation DANS le paragraphe où il apparaît. Jamais de sources regroupées en fin de section.
- Seulement des pages réellement ouvertes et lues. Jamais une URL devinée, jamais un résultat de recherche non consulté.
- Après un tableau, une phrase qui cite ses sources.
- N'invente jamais un chiffre, un concurrent, un dirigeant, un client, une date.

## Section 9 — Implications pour KREDO

Pour chaque piste : le signal observé (cité), le besoin qu'il pourrait traduire, la practice KREDO concernée, formulés comme Déduction ou Hypothèse à vérifier. Puis 5 à 8 questions de découverte à poser en rendez-vous, tirées des lacunes. Aucune recommandation commerciale ferme : pas d'offre à pousser, pas de message, pas d'interlocuteur cible.

## Limites

Données personnelles : uniquement le rôle professionnel public des personnes. Pas d'avis de salariés nommés, pas de vie privée.

## Contrôle avant de rendre

Relis le rapport et corrige : titres conformes et dans l'ordre ; chaque paragraphe factuel a sa citation ; aucune hypothèse ne contient de chiffre ; chaque pilier ★ est traité ou porte une « Donnée non identifiée » ; toute divergence est exposée ; la section 9 ne recommande rien de ferme.
````

---

## 5. Message de lancement (à chaque étude)

```
Entreprise : <nom commercial>
Site : <url>
Localisation : <ville>
SIREN connu de KREDO : <siren ou « inconnu »>
Date du jour : <AAAA-MM-JJ>

Segment KREDO : <nom du segment>. Le contexte sectoriel est déjà documenté chez nous :
ne traite le pilier 10 que pour ce qui touche spécifiquement ce compte.

Ce que KREDO sait déjà (pistes à vérifier, pas des faits acquis) :
- <ex. effectif CRM 1 300, à confronter au registre>
- <ex. un contact DSI identifié>

Questions prioritaires du commercial (facultatif) :
- <ex. ont-ils un projet ERP en cours ?>
```

**Ne jamais coller dans ce message** : TJM, marges, historique de missions, coordonnées de
contacts. K7 est interne et le reste (`01` §7) ; ChatGPT n'en a pas besoin pour chercher.

**Export** : PDF depuis ChatGPT, **pas** l'export Markdown (il perd la bibliographie — l'import
le signale déjà).

---

## 6. Ajustements KREDO recommandés (petits, avant le test)

1. **Ajouter la section `organisation_it_and_purchasing`** — « Organisation, SI et achats » — à
   `STUDY_SECTION_KEYS` / `TITLES` / `DEFINITIONS` (`study-contracts.ts`). Aucune contrainte en
   base, tout est dérivé des constantes. Sans elle, les piliers 12-14-17 sont éparpillés entre
   `value_chain_and_dependencies` (qui porte aujourd'hui « systèmes d'information »), `identity`
   et `implications_for_kredo`.
2. **Retoucher les définitions de classement** : retirer « systèmes d'information » de
   `value_chain_and_dependencies` ; ajouter « résilience, crises traversées » à
   `history_ambitions_and_news` ; ajouter « RSE, tendances technologiques et réglementaires
   propres au compte » à `value_chain_and_dependencies`.
3. **Aligner `implications_for_kredo` sur la doctrine** : sa définition actuelle dit
   « recommandations, angles commerciaux » — c'est le périmètre d'INTEL-032 (`00` §3). Remplacer
   par « hypothèses de besoins IT ou conseil, questions de découverte ».
4. **Apprendre les marqueurs au convertisseur** (`BLOCKS_SYSTEM_PROMPT`) : « Déduction : » →
   `inferred`, « Hypothèse à vérifier : » → `hypothesis`, « Donnée non identifiée » → lacune,
   « Divergence : » → affirmation par valeur.

---

## 7. Protocole de test — la gate avant adoption

Trois comptes, dont au moins un déjà étudié avec l'ancien prompt (Tournaire, SOS Oxygène), pour
comparer à périmètre égal. Relever dans `StudyCoverageReport` après conversion :

| Mesure | Seuil d'adoption |
|---|---|
| `anchoring.ratio` (affirmations sourcées / total) | ≥ ancien prompt |
| Sources distinctes (`sources.authorities`) | ≥ 10 |
| Section 8 non vide | 3 comptes / 3 |
| Blocs en `fallback` | ≤ 5 % |
| Blocs en `appendix` hors bibliographie | 0 |
| `hypothesis` contenant un chiffre | 0 |
| `entity_conflicts` | 0, ou divergence réelle exposée dans le texte |

Puis le seul test qui compte (`00` §1) : un commercial qui ne connaît pas le compte lit la fiche en
dix minutes et sait répondre à « vous tenez ça d'où ? ».

Une fois la gate passée : ce document remplace le §2 de `09-PROJECT-INSTRUCTIONS-LLM-EXTERNE.md`,
dont le contrat JSON est caduc depuis `199907b3`.
