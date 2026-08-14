# La chaîne E0→E7 — fiches d'exécution

Une fiche par étape : qui l'exécute, ce qu'elle reçoit, ce qu'elle rend, ce qui la refuse.
**Ouvre le document d'étape au moment d'exécuter** — chacun porte le même squelette en huit
sections (axiomes · moyens · origine · méthode · articulation · contrôle · destination ·
livrables), donc tu sais toujours où chercher.

Tous les chemins sont relatifs à `docs/MASTER-STUDY/`.

---

## E0 — Cadrage · `03-ETAPE-E0-CADRAGE.md`

| | |
|---|---|
| **Opérateur** | Guillaume, seul. **Aucun LLM** |
| **Durée** | 20-30 min |
| **Entrée** | La base (segment, comptes, corpus existant) + `offer_practices` / `offers` |
| **Sortie** | `00-cadrage.json` → `cadrage.schema.json` |

Trois décisions, et elles ne se délèguent pas : **la définition du marché** (deux phrases qui
excluent explicitement quelque chose — sinon ce n'est pas un test d'inclusion), **le compte étalon**
(un acteur déjà connu, qui sert à calibrer : si sa fiche est fausse sur ce qu'on sait déjà, on
arrête l'étude et on corrige la méthode), **l'objectif commercial** parmi `ouverture` ·
`appels_offres` · `extension` · `angle_sectoriel`.

**Le piège** : `OFFRE_KREDO` se lit en base, jamais à la main. Un référentiel a décrit l'offre KREDO
comme « Boutique d'ingénierie, Next.js, serverless, RAG » — c'est la stack de l'application, pas le
catalogue de l'ESN. Toute une colonne d'analyse avait donc été notée contre le mauvais catalogue.

**`comptes_exclus` signifie « hors cibles de prospection », pas « hors périmètre d'étude ».** Un
compte client compte dans le seuil de G0 et figure dans la cartographie — le positionner face aux
concurrents étudiés est un actif commercial. Tranché le 13/08/2026.

C'est la seule étape dont l'erreur ne se rattrape pas : un périmètre ambigu déplace la longlist,
donc la segmentation, donc le top 3, donc le message sectoriel.

---

## E1 — Taxonomie · `04-ETAPE-E1-TAXONOMIE.md`

| | |
|---|---|
| **Opérateur** | Toi (lecture + contrôles), Guillaume (arbitrage) |
| **Durée** | 15 min si le segment existe ; 1-3 h s'il faut le créer |
| **Sortie** | `01-taxonomie.json` → `taxonomie.schema.json`, **verdict G0 inclus** |

**Autorité déléguée, intégralement :**
`docs/FEATURES/sector_intelligence/taxonomie-sectorielle/REFERENTIEL-CLASSIFICATION.md`. Ne le
duplique pas ; ouvre-le.

Le chemin nominal est court : résoudre le slug (`level='segment'`, `parent_id` non nul), compter les
comptes, vérifier les axes, **relever le corpus déjà présent sur le segment et sur son macro
parent**. Ce dernier point est le champ le plus important du fichier : c'est ce qui empêche l'étude
de repartir d'une page blanche.

Créer un segment est l'exception, et c'est une migration SQL — jamais un `INSERT` à la volée. Trois
conditions cumulatives (référentiel §9), tranchées par la **règle des 70 %** : *deux entreprises
sont dans le même segment si 70 % d'un briefing préparé pour l'une reste pertinent pour l'autre.*

**Le `slug` est la seule clé fonctionnelle.** `apply_account_classification()` et le workflow
INTEL-010 matchent dessus, jamais sur `name`.

---

## G0 — Le droit de lancer · `10-ETAPE-E7…` §2

Après E1, avant E2. Le gate qui économise le plus.

| Condition | Seuil |
|---|---|
| Segment `level='segment'` avec un `parent_id` | obligatoire |
| Comptes rattachés (`mapped` exclus, **clients compris**) | ≥ 3 |
| 5 axes toujours renseignables : `segment`, `relation_type`, `regime_achat`, `modele_eco`, `tier` | 100 % |
| 2 axes conditionnels : `moment`, `vertical_client` — renseignés **ou** légitimement NULL | NULL documenté, jamais inventé |
| Un corpus de sources existe ou est budgété | E3 planifié |
| Un objectif commercial déclaré | 1 des 4 valeurs |

**Ne redemande jamais « les 7 axes à 100 % ».** Cette formulation a rendu G0 inpassable sur tous
les segments pendant un run entier : le référentiel §5.5 **interdit** de renseigner `moment` sans
fait daté sourçable, et `moment` valait 1 compte sur 96 en base. Exiger 100 % revenait à exiger la
violation du document que le gate déclare normatif.

Verdict : `go` · `go_avec_reserve` (réserve nommée) · `no_go` (avec ce qui manque).

---

## E2 — Socle déterministe · `05-ETAPE-E2-SOCLE-DETERMINISTE.md`

| | |
|---|---|
| **Opérateur** | n8n + APIs publiques. **Aucun modèle de langage, à aucun moment** |
| **Sortie** | Des lignes en base + `02-socle.json` → `socle.schema.json` |

Quatre sous-blocs : **A1 identité France** (Sirene INSEE → RNE/INPI → BODACC), **S7 réglementaire
daté** (Légifrance PISTE + EUR-Lex), **A7 intensité SI** (France Travail), **A6 partiel** (TED,
BOAMP, PLACE). Ordre interne imposé : `A1 → A7` (l'intensité a besoin de l'identité), `S7` en
parallèle.

- **100 % ou erreur explicite.** Un compte sans SIREN porte un motif nommé, pas un champ vide.
- **Un fait sans source ne s'écrit pas** : `origin`, `primary_source_id`, `effective_at`,
  `confidence_score` sur chaque ligne de `account_facts`.
- **`echeance_pivot` est le champ que E4 et E5 consomment directement** — c'est le motif d'appel
  universel du secteur. S'il est nul, G1 échoue.
- **Une échéance se revalide au jour du run.** Seul bloc à péremption immédiate.
- ⚠️ `entreprise.api.gouv.fr` est réservée aux administrations. KREDO est une entreprise privée :
  le socle est **Sirene + open data**, jamais API Entreprise.

**Avant de lancer A7 sur un segment, mesure la densité de son gisement** — deux appels suffisent
(`secteurActivite=XX`, puis `&domaine=M18`). Le canal est sectoriel : dense en division NAF 62
(ESN, 27 %) et 61 (télécoms, 22 %), quasi nul en 30 (aéro-spatial, 22 offres en France). Table
complète dans `src/features/hiring-intensity/README.md`. En dessous de quelques dizaines d'offres
au national, A7 ne rendra rien — et il vaut mieux le savoir avant que le corpus n'annonce un zéro.

---

## E3 — Corpus de sources · `06-ETAPE-E3-CORPUS-DE-SOURCES.md`

| | |
|---|---|
| **Opérateur de recherche** | Guillaume, dans Gemini ou ChatGPT Deep Research |
| **Opérateur de contrôle** | Toi — **jamais dans le contexte qui a produit** |
| **Prompt** | `prompts/E3-corpus-sources.md` |
| **Budget** | 15-25 requêtes distinctes. En dessous, le référentiel est de mémoire |
| **Sortie** | `03-sources.json` → `source-registry.schema.json` · `03-journal.md` · `03-scorecard.txt` |

**Normatif délégué sur la qualification d'une source :**
`docs/FEATURES/sector_intelligence/sources_intelligence_standards/` fichiers `01_`, `02_`,
`04_`→`08_` (grille des tiers, barème /100, 24 critères). Le prompt canonique `03_` est **périmé**,
remplacé par celui du corpus.

Quatre passes, dans l'ordre : **A** officielle (registres, régulateurs, textes) · **B** écosystème
professionnel (presse pro, fédérations, annuaires) · **C** intelligence commerciale (offres
d'emploi, portails fournisseurs, nominations) · **D** validation de couverture — la recherche
délibérée des trous.

Trois familles sont **obligatoires** : presse professionnelle de référence, fédération ou syndicat
principal, régulateur ou organisme normatif.

**Le tier mesure la force probante, le score d'utilité mesure la valeur opérationnelle : ne les
confonds jamais.** Une T4 peut être excellente pour découvrir un signal et incapable de fonder
seule une affirmation. Et une source secondaire qui cite une source primaire **ne devient pas
primaire** — le tier supérieur suppose que la primaire a été effectivement consultée.

> 🔴 **Le générateur tronque au pack minimal.** Deux référentiels annoncent 15 et 13 sources et en
> contiennent 7 et 5, la coupure tombant exactement à la frontière du `minimum_pack` sur les deux.
> Le corpus l'écrit noir sur blanc : *« Aucun nouveau référentiel n'est généré tant que le
> générateur n'est pas corrigé. »* Voir `references/etat-du-chantier.md`.

---

## E4 — Étude sectorielle · `07-ETAPE-E4-ETUDE-SECTORIELLE.md`

| | |
|---|---|
| **Opérateur** | ChatGPT Deep Research (meilleur rapport preuve/effort observé) |
| **Prompt** | `prompts/E4-etude-sectorielle.md` |
| **Contexte injecté** | `00-cadrage.json` · `02-socle.json` · `03-sources.json` — les trois, systématiquement |
| **Budget** | 25-40 requêtes, dont **15 % réservés à la vérification** |
| **Sortie** | `04-secteur.json` → `sector-knowledge.schema.json` · `04-secteur.md` · `04-journal.md` |

Le produit de cette étape est **de la légitimité métier**. Deux couches : **DÉCIDER** (2 pages,
thèses, calendrier daté, message sectoriel) et **COMPRENDRE** (8-10 pages, économie, modèles,
chaîne, fronts, dépendances, régulation, chronologie, risques, pain points, playbook).

**Les quatre conversions sont obligatoires** — ce sont des colonnes de tableau, pas des sections
supplémentaires. Un tableau livré sans sa colonne de conversion est incomplet, pas « allégé » :

| Matière | Conversion imposée |
|---|---|
| Modèles économiques | « quel budget, engagé quand, signé par qui » |
| Chaîne de valeur par maillon | « à quel maillon l'ESN se branche, et **qui y est déjà** » |
| Dépendances de supply chain | « quelle dépendance ouvre quelle prestation » |
| Options stratégiques | « si le secteur prend cette trajectoire, quels budgets s'ouvrent » |

**Chaque bloc de la couche 2 se termine par un « DONC, commercialement »**, d'une à trois lignes,
écrit pour un commercial qui n'a pas lu le reste. Sans « donc », le bloc n'entre pas dans le
livrable.

**Déclare l'accès aux sources en préambule.** `COMPLET` → étude normale. `RECHERCHE SEULE` (pages
et PDF non ouvrables) → production autorisée, mais aucune donnée étiquetable T1 et confiance
plafonnée. `AUCUN` → **arrêt**, on rend la liste des recherches à effectuer. Un LLM sans accès web
produit une étude de mémoire : des noms vrais, des chiffres approximatifs, des contrats plausibles
mais inventés. **C'est le mode d'échec le plus dangereux, parce que le résultat a l'air excellent.**

Trois vocabulaires de practice coexistent et **un seul slug leur est commun** (`cybersecurity`) :
`kredo_practice` (tables `sector_*`) · **`offer_practices.slug` (base, la seule qui joint)** ·
`PracticeSlug` (front, affichage). Le pont est dans `src/lib/config/practices.ts`
(`PRACTICE_SLUG_TO_OFFER_PRACTICE`, `mapKredoPracticeToOfferPractice()`), testé contre un relevé
base. Il n'existe **pas** de fonction SQL équivalente.

---

## E5 — Cartographie et comptes · `08-ETAPE-E5-CARTOGRAPHIE-COMPTES.md`

| | |
|---|---|
| **Opérateur** | Claude Opus — la tâche est de respecter un schéma et de refuser d'inventer |
| **Prompt** | `prompts/E5-cartographie-comptes.md` |
| **Contexte** | `00-cadrage` · `02-socle` · `03-sources` · **`04-secteur.json`** |
| **Humain** | Guillaume, **30-45 min par compte prioritaire** sur la couche accessibilité |
| **Sortie** | `05-comptes.json` → `competitive-map.schema.json` · `05-comptes.md` · `05-battlecards.md` · `05-journal.md` |

C'est la couche qui répond à Q1 (quel compte) et Q2 (par quelle porte). **C'est aussi celle qui a
échoué deux fois de suite** — zéro modèle d'achat renseigné sur 14 comptes en BTP, puis zéro sur 10
en spatial.

**Le traitement compte par compte est une contrainte, pas un conseil.** Traités en parallèle, les
comptes produisent des fiches interchangeables où seuls les noms changent : c'est observable et
c'est irrécupérable.

Cinq requêtes par compte. **La quatrième — offres d'emploi et technologies — est la plus rentable
de toute la méthode** : les offres publiées révèlent la feuille de route *réelle*, là où les
communiqués révèlent la feuille de route *souhaitée*.

Cinq blocs par fiche : **B1** identité (reçue de E2, jamais recherchée) · **B2** métier et chaîne de
valeur · **B3** les six grilles · **B4** couche ESN · **B5** traduction commerciale.

Deux cases n'ont le droit d'être vides sur aucun compte prioritaire :

- **B3-4 « IA : annoncé vs déployé ».** C'est la grille qui distingue une ESN d'un fournisseur —
  elle mesure l'écart entre le discours et la production, donc le besoin. Dans les deux études
  auditées, c'était la seule case vide, et la plus différenciante.
- **B4, la couche ESN.** Une hypothèse qualifiée et marquée comme telle est acceptée ; **« non
  vérifié » ne l'est pas.** Le défaut historique n'était pas que l'information manquait : le prompt
  ne disait pas où chercher. Elle est publique — pages « devenir fournisseur », CGA, chartes achats,
  rapports de durabilité, avis de marché, offres d'emploi citant la co-traitance.

**L'appétence** : `total = capacite_a_payer + intensite_it + 2×moment + 2×accessibilite + fit_offre`.
Notes **1/3/5 uniquement** (pas de 2 ni de 4 : une échelle continue tasse les totaux au milieu,
exactement là où se prend la décision). Total sur **35**, jamais sur 25 — `5+5+3+2+4 = 19` est un
/25 déguisé ; le calcul juste est `5+5+(2×3)+(2×2)+4 = 24`.

`accessibilite` est aussi extraite **comme axe propre** : c'est l'ordonnée de la carte de
priorisation. **Jamais de valeur de remplacement quand elle manque** — l'acteur reste « non
positionné ». Attribuer 5/5 à un compte dont on ne sait rien, au motif qu'une petite structure est
plus abordable, est exactement le défaut qui a fait entrer le compte le moins bien noté d'une carte
en n°2 de son top 3.

**Plancher de preuve (A7)** : pas d'entité juridique France, pas d'ordre de grandeur de taille sur
périmètre déclaré, pas de trigger daté, ou moins de 2 sources indépendantes dont une T1/T2 → le
compte va en **réserve à qualifier**, jamais dans le top 3.

> **Le contrat normatif de ce livrable est le code**, pas le schéma :
> `src/features/competitive-map/domain/competitive-map-output.ts`. En cas de divergence, le module
> gagne et le schéma est corrigé. Il tolère délibérément des écarts réels observés (catégories à
> tirets, dates `JJ/MM/AAAA`, demi-points sur les notes, `identifiant_national` absent).

---

## E6 — Chaîne de valeur · `09-ETAPE-E6-CHAINE-DE-VALEUR.md`

**Étape conditionnelle.** Trois conditions cumulatives : une étude concurrentielle (E5) existe,
KREDO a des comptes sur **au moins trois maillons**, au moins une couche transverse porte une
échéance datée. Ailleurs, elle produit un poster.

| | |
|---|---|
| **Opérateur** | Claude Opus + Guillaume (arbitrage des maillons et de la captation) |
| **Rendu** | `chaine-de-valeur/build.py` — **généré depuis les données, jamais dessiné** |
| **Sortie** | `06-chaine.json` → `value-chain.schema.json` · `06-prospection.md` |

**Le résultat le plus précieux du pilote BTP n'était pas le schéma** : c'est que douze comptes de
la filière n'étaient pas dans le macro BTP — onze déjà qualifiés, invisibles dans toute lecture
sectorielle. D'où la règle : positionne **d'abord les comptes KREDO, tous macros confondus**. C'est
là que se produit la découverte.

`sector_id` désigne le **sujet** de la chaîne, jamais l'appartenance de ses acteurs. Ces tables
n'écrivent jamais dans `companies`.

L'usage en rendez-vous et ses formulations exactes sont dans
`chaine-de-valeur/NOTE-EXPLOITATION.md` §2-§3 — **c'est un actif commercial, pas de la
documentation.**

---

## E7 — Gates et ingestion · `10-ETAPE-E7-GATES-ET-INGESTION.md`

Ordre d'application, non négociable :

```
1. Migrations éventuelles (valeurs d'enum, nouveaux fact_type)
2. E3 → intelligence_sources + liens          (idempotent, sur src_id)
3. E2 → account_facts + sector_regulatory_items
4. E4 → sector_intelligence + playbook + items (migration idempotente)
5. E5 → CompetitiveMapImportWizard             (bac d'arbitrage HUMAIN, jamais automatique)
6. E6 → value_chain_* + build.py
7. Document → intelligence_documents, type master_study, primary_entity_type='sector'
8. Recette SQL, puis recette écran
```

Règles d'écriture qui ont chacune coûté quelque chose :

- **Migrations idempotentes, dollar-quoting pour le texte.**
- **Écris avec les accents.** La fiche la plus rigoureuse jamais produite est partie en production
  désaccentuée — « Directrice Qualite / Affaires Reglementaires » — parce qu'un agent a « sécurisé »
  l'échappement SQL en mutilant le texte. Le dollar-quoting règle l'échappement ; rien ne justifie
  de casser la langue.
- **Playbook fusionné clé par clé, jamais le blob** : 37 segments sur 38 portent un squelette de
  seed aux tableaux vides qui écraserait les playbooks macro remplis.
- **`source_company_ids` obligatoire sur les pain points.** Une fréquence est un comptage ; sans les
  UUID, elle est invérifiable à jamais.
- **`sector_id` ne s'écrit jamais directement** — c'est une projection de `segment.parent_id`,
  écrite par `apply_account_classification()` seule.
- **Les chiffres vont dans `account_facts`, le narratif dans `profile_json`.** Un chiffre dans un
  blob JSON n'est ni requêtable ni sourçable.

Verdict dans `07-verdict.json`, avec les dates de péremption **calculées** : triggers 3 mois ·
financier et cartographie 12 mois · économie 24 mois.

**`usable_with_caveats` est un verdict normal et fréquent.** C'est `production_ready` qui doit être
rare — et il est interdit tant qu'une source reste non probée ou qu'un compte prioritaire porte un
« non vérifié ».
