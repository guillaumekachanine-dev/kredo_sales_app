# Mode opératoire — run `2026-08-btp-materiaux`

> Ce fichier n'a **aucune autorité propre**. En cas d'écart avec un document numéroté de
> `docs/MASTER-STUDY/`, c'est le document numéroté qui gagne et ce fichier qui se corrige.
> Il existe pour qu'on n'ait pas à naviguer entre neuf fichiers pendant l'exécution.

Segment : **`seg-btp-materiaux`** — Matériaux · production & négoce (`display_code` 7.2)
Macro parent : `btp-construction-immobilier` · Variante : **V0 Master Study** (E0→E7)
Snapshot : **26/08/2026** · Compte étalon : **Audemard**

---

## 1. Où en est le run

| Étape | État | Fichier |
|---|---|---|
| **E0 — Cadrage** | ✅ produit, valide contre son schéma | `00-cadrage.json` |
| **E1 — Taxonomie** | ✅ produit, valide contre son schéma | `01-taxonomie.json` |
| **G0 — Droit de lancer** | ✅ **`go`** — 9 contrôles, 7 pass + 2 warn, 6 réserves nommées | dans `01-taxonomie.json` |
| **E2 — Socle déterministe** | ✅ **exécuté en réel** — 29 requêtes, 3 canaux | `02-socle.json` · `02-journal.md` |
| **E3 — Corpus de sources** | ☐ **à faire — c'est la prochaine action** | `03-sources.json` · `03-journal.md` |
| **E4 — Étude sectorielle** | ☐ à faire, dans le même run que E5 | `04-secteur.json` · `04-journal.md` |
| **E5 — Cartographie & comptes** | ☐ à faire | `05-comptes.json` · `05-battlecards.md` · `05-journal.md` |
| **E6 — Chaîne de valeur** | ○ conditionnelle, après E5 | `06-chaine.json` |
| **G1 — Conformité** | ◐ **14 PASS / 4 FAIL** — les 4 FAIL sont E3/E4/E5 absents | `07-g1.txt` |
| **G2 — Red team** | ☐ jamais exécutée sur aucun run du corpus | `07-g2.md` |
| **G3 — Recette** | ☐ Guillaume | `07-verdict.json` |
| **E7 — Ingestion** | ☐ dry-run puis `--live`, sur accord explicite | — |

---

## 2. Ce que E2 a trouvé et qu'il faut savoir avant de continuer

**Quatre constats, tous vérifiés à la source.**

1. **Un fait faux dort en base.** `Audemard.legal_id = 950399014` désigne « AUDEMARD », 1 place
   Croix-Paquet 69001 Lyon, NAF `51.4C` (nomenclature périmée depuis 2008), **0 établissement
   ouvert**. Le compte KREDO est un industriel des granulats implanté dans le 06, le 83 et les
   DROM, avec ~38 sites. Ce n'est pas la même entreprise. Le fait est à invalider, pas à
   compléter.

2. **Deux comptes sur trois sont des groupes, pas des sociétés.**
   - *Ciffreo Bona* : le registre tranche. `ETS CIFFREO ET BONA` (SIREN **954801999**, Nice) est
     déclaré dirigeant personne morale de `CIFFREO BONA` (487652257, Cannes, 33 établissements)
     **et** de `CIFFREO & BONA` (323778860, Meyrargues, 23 établissements). C'est la tête.
   - *Audemard* : le registre **ne tranche pas**. Deux têtes possibles, même adresse à Carros —
     `ENTREPRISES AUDEMARD` (961801313, opérationnelle, dirigeant de LES BETONS NICOIS) et
     `SOC FINANCIERE AUDEMARD` (414368365, holding immobilière). **→ Arbitrage n°1.**
   - *Richardson* : SIREN **054800958**, 130 établissements, tranche 2 000-4 999. Sans ambiguïté.

3. **L'échéance pivot tombe dans 6 jours.** Facturation électronique, **01/09/2026**. Les trois
   comptes sont ETI ou grand compte : ils sont soumis à l'obligation d'**émission**, pas
   seulement de réception. C'est le motif d'appel le plus fort du run — **et il est périmé le
   02/09**. Après cette date l'angle change de nature : ce n'est plus la conformité, c'est le
   rattrapage. E4 et E5 doivent l'écrire ainsi.

4. **A7 rend zéro sur les trois comptes — et c'est le résultat le plus vendeur du socle.**
   Zéro mesuré à **93 % de couverture nominative**, pas zéro faute de mesure. Sur les mêmes
   81 offres SI de la division NAF 46, huit concurrents directs du négoce recrutent, eux :

   | Concurrent | Poste publié | Ce que ça recoupe |
   |---|---|---|
   | SAMSE | « Gestionnaire de données produits » (20/08/2026) | la rubrique FDES / marquage CE du playbook macro |
   | QUINCAILLERIE SETIN | « Chef de Projet AS400 » (18/08/2026) | legacy mainframe assumé |
   | RESEAU PROVENCE DAUPHINE | « Chargé de projets infrastructure SI » (28/07/2026) | — |
   | MARTIN BELAYSOUD | « Développeur Web » (30/07/2026) | la bascule en ligne du négoce |
   | KLEBER MALECOT · CHAVANEL · DUCROS · POINT.P | informatique interne | — |

   **Deux lectures, opposées, et E5 doit trancher laquelle** : soit ces comptes n'ont pas de
   chantier SI, soit ils le mènent sans recruter — donc avec un prestataire déjà en place.
   Les deux sont des angles d'entrée. Aucune n'est une inférence gratuite : c'est un écart
   observé entre acteurs comparables (A11).

---

## 3. Ce qu'il faut faire — dans cet ordre

### ⓿ Arbitrer, avant de lancer quoi que ce soit (5 minutes)

| # | Question | Pourquoi elle bloque |
|---|---|---|
| 1 | **Audemard : `ENTREPRISES AUDEMARD` (961801313) ou `SOC FINANCIERE AUDEMARD` (414368365) ?** | Le compte étalon calibre toute la méthode. Une identité fausse sur lui invalide le run |
| 2 | **Ciffreo Bona : la tête de groupe niçoise (954801999) est retenue. L'interlocuteur est-il chez elle, ou chez la filiale cannoise (487652257) ?** | Détermine l'entité de décision SI |
| 3 | **Objectif `ouverture` — confirmé ?** Déclaré `ouverture` : Audemard est donc dans la carte mais **hors du top 3**. Pour l'étendre, c'est `extension` et il redevient cible | Change la liste des comptes prioritaires en E5 |
| 4 | **Accepter les 6 réserves de G0 ?** Elles sont dans `01-taxonomie.json`. La plus structurante : le seuil de 3 comptes est atteint tout juste, sans marge | G0 est `go`, mais réserves nommées = arbitrage humain |

### ❶ E3 — Corpus de sources · Gemini ou ChatGPT Deep Research · ~45 min

1. Ouvrir `docs/MASTER-STUDY/prompts/E3-corpus-sources.md`, copier **la partie B telle quelle**.
2. Joindre **`00-cadrage.json` et rien d'autre** — E3 ne doit pas hériter d'un a priori sur le
   contenu de l'étude.
3. Récupérer le JSON, l'enregistrer en `03-sources.json` **dans ce dossier**, en fichier `.json`
   à part — jamais collé dans un markdown avec des échappements (c'est comme ça que le premier
   run a produit un livrable qui ne parsait pas).
4. Écrire `03-journal.md` avec les requêtes réellement jouées. **G1 en exige ≥ 15.**
5. Rejouer G1 (commande au §4). **S'attendre à devoir régénérer une fois** : le générateur
   tronque son export à la frontière du pack minimal — c'est un comportement de modèle, pas un
   bug, et `check_packs` l'attrape désormais au lieu de le laisser passer en silence.

> Deux sources que E2 a déjà établies et que E3 doit reprendre plutôt que redécouvrir :
> `entreprendre.service-public.gouv.fr` (DGFiP, facturation électronique) et Légifrance sur les
> décrets `2026-16` et `2024-1258`. Les identifiants JORFTEXT sont authentiques, vérifiés.

### ❷ E4 + E5 — un seul run, deux livrables · ~3 h

**Ne pas les séparer.** C'est l'axiome A8 : le reformatage a posteriori détruit les preuves —
une étude reformatée a perdu 90 sources numérotées, remplacées par 15 « familles » sans URL.

**E4** — `prompts/E4-etude-sectorielle.md`, outil **ChatGPT Deep Research**.
Joindre `00-cadrage.json` + `02-socle.json` + `03-sources.json`. **Les trois, sinon ne pas lancer.**
Sortie : `04-secteur.json` (le livrable) et `04-secteur.md` (vue générée depuis le JSON, jamais
l'inverse) + `04-journal.md`, **≥ 25 requêtes**.

**E5** — `prompts/E5-cartographie-comptes.md`, outil **Claude Opus, Projet « KREDO ·
Cartographie & comptes »**. Même contexte + `04-secteur.json`.
Sortie : `05-comptes.json`, `05-comptes.md`, `05-battlecards.md`, `05-journal.md` (**≥ 25**).

Trois points à surveiller à la relecture d'E5, propres à ce segment :

- **Deux sous-familles, pas un message unique.** Le segment mêle un industriel (Audemard,
  NAF div. 23) et deux négociants multi-agences (div. 46). Le contrôle 8 de `01-taxonomie.json`
  estime le recouvrement à ~70 %, soit exactement le seuil de la règle des 70 %. Un discours
  unique sonnera faux d'un côté ou de l'autre.
- **La longlist doit sortir du portefeuille.** Trois comptes ne font pas une carte. Les huit
  concurrents relevés par A7 (§2.4) sont des **candidats mesurés**, pas une longlist qualifiée :
  leur périmètre et leur taille restent à instruire.
- **`appetence_provisoire` doit valoir `true`.** L'axe accessibilité pèse double dans la formule
  `total = capacite + intensite + 2×moment + 2×accessibilite + fit` (sur 35, jamais sur 25), et
  il est à zéro fait sur les 105 comptes de la base. Un total calculé sur un axe mort ne peut
  pas être présenté comme définitif.

### ❸ E6 — Chaîne de valeur · conditionnelle · ~4 h

**Ne la lancer qu'après E5** (règle anti-poster, E6 §1 : pas de chaîne sans étude concurrentielle
préalable). Deux choses à savoir avant de décider :

- Le macro `btp-construction-immobilier` porte **déjà une chaîne peuplée** : 10 nœuds, 46 acteurs.
  C'est le pilote historique. E6 ici serait un approfondissement à la maille segment, pas une
  création.
- **L'ingestion de E4 amorce déjà la chaîne** : un nœud par maillon, `rang=1`, `capture_valeur`
  à NULL (ADR-0021 §9.1). E6 ne part jamais de zéro.

### ❹ G2 — Red team · **hors du contexte de production** · ~30 min

`prompts/G2-red-team.md`. Déposer **le livrable et ses sources, rien d'autre**, dans NotebookLM
ou une session Claude neuve. Six questions, les quatre premières bloquantes.

> **Le point n'est pas les questions, c'est le changement de contexte.** Un modèle qui ne
> répond que depuis le corpus déposé ne peut pas combler un trou par mémoire — c'est exactement
> le contrôle qui manque à une relecture par le producteur.
>
> ⚠️ **G2 n'a jamais tourné sur aucun run**, y compris celui qui a été ingéré le 20/08. Si elle
> est sautée ici aussi, le verdict ne couvre que G0/G1/G3 et **doit le dire explicitement**.

### ❺ G3 — La recette métier · 15 minutes

Une seule question : **« Est-ce que je décrocherais mon téléphone avec ça ? »**
Elle se décline en trois vérifications de cinq minutes : ouvrir la fiche du compte étalon et la
confronter à ce qu'on sait déjà ; vérifier que le top 3 du tableau trié est bien le top 3 de la
synthèse ; ouvrir une source au hasard et voir si elle dit ce qu'on lui fait dire.

Verdict dans `07-verdict.json` : `production_ready` · `usable_with_caveats` · `rejected`.

### ❻ E7 — Ingestion · **accord explicite, jamais implicite**

Deux outils, un par couche, **tous deux en dry-run par défaut** :

```bash
npx tsx --env-file=.env.local scripts/ingest-master-study.mts docs/MASTER-STUDY/registre/2026-08-btp-materiaux/
```

Il tourne en transaction `ROLLBACK`. On ne passe `--live` qu'après lecture du dry-run.
Pour E5, c'est `CompetitiveMapImportWizard` dans l'application — bac d'arbitrage humain, avec
des résolutions `ambiguous` volontairement non automatisables (ADR-0019).

**Après tout `--live`, deux gestes obligatoires :**

1. Rejouer les 18 assertions, une à une :
   `supabase/tests/069_sector_knowledge_resolution.assertions.sql`
2. Vérifier que `sector_intelligence.status` est bien passé à `active`. La seule ingestion
   réelle à ce jour a révélé que la RPC **ne le promeut jamais** — invisible tant qu'on ne
   rejoue pas les assertions. Corrigé alors par un `UPDATE` ponctuel.

---

## 4. La commande du gate, à rejouer après chaque étape

```bash
python3 scripts/audit-master-study.py docs/MASTER-STUDY/registre/2026-08-btp-materiaux/ --today 2026-08-26
```

Remplacer `--today` par la date du jour. Sa sortie va dans `07-g1.txt` et **ne s'édite jamais à
la main**. `--json` pour une sortie machine, `--check-urls` pour vérifier que chaque source
répond (sollicite le réseau, donc hors du gate déterministe).

### Un FAIL connu, à ne pas « corriger »

`--check-urls` fait échouer les **deux URL Légifrance** en HTTP 403. C'est une protection
anti-robot du site, pas un identifiant invalide : les deux textes ont été lus par un second
canal le 26/08 et concordent avec les libellés stockés en base (décret n° 2026-16 du 15/01/2026 ;
décret n° 2024-1258 du 30/12/2024).

**Ne pas supprimer ces URL pour faire passer le gate.** Ce serait exactement le défaut du
13/08 : convertir un FAIL honnête en PASS en écrivant un état que la réalité ne porte pas.
C'est un point d'arbitrage G3, comme l'a été l'échéance IFRA du run parfumerie.

---

## 5. Budget réaliste

| Étape | Durée | Qui |
|---|---|---|
| Arbitrages ⓿ | 5 min | Guillaume |
| E3 (+ 1 régénération probable) | 45 min | Guillaume + Deep Research |
| E4 + E5, même run | 3 h | Guillaume + Deep Research + Claude Opus |
| Relecture et corrections | 1 h | Guillaume |
| E6, si décidé | 4 h | Claude Opus |
| G2 | 30 min | contexte neuf |
| G3 | 15 min | Guillaume |
| E7, dry-run puis `--live` + assertions | 45 min | Guillaume + Claude Code |

**Sans E6 : une bonne demi-journée.** Le corpus annonce « 2 j + 0,5 j humain » pour un V0 ;
c'est moins ici parce que E0, E1, G0 et E2 sont déjà faits, et que le macro parent porte déjà
15 items de connaissance et une chaîne de valeur peuplée.

---

## 6. Ce que ce run ne pourra pas rendre, et qu'il faut dire maintenant

- **La couche accessibilité (B4) restera trouée.** Zéro fait sur les 105 comptes de la base.
  C'est un travail humain de 30 à 45 min par compte prioritaire, qu'aucun outil du dispositif
  ne fait à la place de l'humain. Tant qu'il n'est pas fait, l'appétence est provisoire.
- **A7 ne dira rien sur Audemard.** Sa division NAF entière porte 0 offre SI en France. Le
  compte étalon se calibre sur l'identité, l'économie et la chaîne de valeur — pas sur
  l'intensité SI.
- **Le segment n'a que 3 comptes, sans marge sur le seuil de G0.** Si l'un d'eux est reclassé
  ou fusionné, le segment repasse sous le seuil. La valeur du run tient donc autant à la
  longlist hors portefeuille qu'aux trois comptes connus.
