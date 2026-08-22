# MASTER STUDY — corpus de référence de la connaissance commerciale KREDO

**Ce dossier est la source unique.** Il définit comment KREDO produit, contrôle, range et
exploite la connaissance d'un marché et de ses comptes. Tout ce qui alimente les pages
Intelligence de l'application sort d'ici, ou n'a pas sa place dans l'application.

Version **1.0** · Établi le **13/08/2026** · Base live `jvzgmhvwirsbdkjpmvla` lue le 13/08/2026.

---

## 1. Ce que ce corpus décide, et ce qu'il ne décide pas

| Il décide | Il ne décide pas |
|---|---|
| Quelle connaissance est recherchée, à quelle maille, et pourquoi | Le contenu d'un secteur donné — c'est un livrable, pas une règle |
| Qui la produit : machine déterministe, LLM sourcé, ou humain | Le design des écrans (→ `docs/DESIGN/`) |
| Dans quel ordre, avec quels contrôles, sous quelles conditions d'arrêt | Le schéma Supabase — il est lu à la source, jamais recopié ici |
| Dans quelle table elle atterrit et sur quel écran elle s'affiche | Les décisions d'architecture applicative (→ `docs/adr/`) |
| Le format exact de chaque livrable, validé par schéma | La cadence de veille (→ `veille_signaux_actualites/`) |

**La structure de ce corpus est immuable ; son contenu est amendable.** Les treize documents
numérotés, les sept étapes `E0→E6`, les quatre gates `G0→G3` et le squelette en huit
sections de chaque étape ne bougent pas. Ce qu'ils contiennent évolue à l'usage, par
versioning (§13).

---

## 2. Index

| # | Document | Ce qu'on y trouve |
|---|---|---|
| — | [`00-DOCTRINE.md`](00-DOCTRINE.md) | Les 12 axiomes, les 3 régimes de production, le squelette en 8 sections |
| — | [`01-CARTE-DE-LA-CONNAISSANCE.md`](01-CARTE-DE-LA-CONNAISSANCE.md) | Les **37 blocs** : identifiant, portée, régime, table cible, producteur |
| — | [`02-DISTRIBUTION-DANS-KREDO.md`](02-DISTRIBUTION-DANS-KREDO.md) | Où chaque bloc s'affiche : page, onglet, composant, contrat de vue |
| E0 | [`03-ETAPE-E0-CADRAGE.md`](03-ETAPE-E0-CADRAGE.md) | Fixer le périmètre, le segment cible, le compte étalon, les paramètres |
| E1 | [`04-ETAPE-E1-TAXONOMIE.md`](04-ETAPE-E1-TAXONOMIE.md) | Le segment existe-t-il ? les comptes sont-ils classés ? |
| E2 | [`05-ETAPE-E2-SOCLE-DETERMINISTE.md`](05-ETAPE-E2-SOCLE-DETERMINISTE.md) | Identité France, réglementaire daté, intensité SI — **jamais un LLM** |
| E3 | [`06-ETAPE-E3-CORPUS-DE-SOURCES.md`](06-ETAPE-E3-CORPUS-DE-SOURCES.md) | Où l'on a le droit de chercher, avec quelle force probante |
| E4 | [`07-ETAPE-E4-ETUDE-SECTORIELLE.md`](07-ETAPE-E4-ETUDE-SECTORIELLE.md) | La couche **COMPRENDRE** : économie, chaîne, régulation, trajectoires |
| E5 | [`08-ETAPE-E5-CARTOGRAPHIE-COMPTES.md`](08-ETAPE-E5-CARTOGRAPHIE-COMPTES.md) | La couche **ATTAQUER** : segmentation, fiches, matrice, priorisation |
| E6 | [`09-ETAPE-E6-CHAINE-DE-VALEUR.md`](09-ETAPE-E6-CHAINE-DE-VALEUR.md) | Maillons, dépendances, captation, acteurs positionnés |
| E7 | [`10-ETAPE-E7-GATES-ET-INGESTION.md`](10-ETAPE-E7-GATES-ET-INGESTION.md) | G0→G3, ingestion en base, estampillage, rollback |
| — | [`11-VARIANTES.md`](11-VARIANTES.md) | Les 5 déclinaisons légères du master process |
| — | [`12-OUTILLAGE-ET-PROJETS-LLM.md`](12-OUTILLAGE-ET-PROJETS-LLM.md) | Qui fait quoi · **recommandation Claude Projects / GPTs** |
| — | [`13-GOUVERNANCE.md`](13-GOUVERNANCE.md) | Péremption, versioning, journal, qui a le droit de changer quoi |

**Annexes exécutables** — ce sont des artefacts, pas de la prose :

| Dossier | Contenu |
|---|---|
| [`prompts/`](prompts/) | Un fichier par déclenchement. Copier-coller, aucune improvisation |
| [`schemas/`](schemas/) | JSON Schema de chaque livrable. **C'est le contrat, pas le markdown** |
| [`registre/`](registre/) | L'état des lieux daté et le journal des études produites |

---

## 3. La chaîne en une page

```
        ┌─────────────────────────────────────────────────────────────┐
        │  E0 CADRAGE ── périmètre, segment, compte étalon, objectif  │
        └───────────────────────────┬─────────────────────────────────┘
                                    │
        ┌───────────────────────────▼─────────────────────────────────┐
        │  E1 TAXONOMIE ── le segment existe ? les comptes sont classés ? │
        └───────────────────────────┬─────────────────────────────────┘
                                    │  ◄── G0 : droit de lancer
        ┌───────────────────────────▼─────────────────────────────────┐
        │  E2 SOCLE DÉTERMINISTE  ── n8n + APIs publiques, ZÉRO LLM    │
        │     identité France · réglementaire daté · intensité SI      │
        └───────────────────────────┬─────────────────────────────────┘
                                    │
        ┌───────────────────────────▼─────────────────────────────────┐
        │  E3 CORPUS DE SOURCES ── Deep Research, registre T1-T4       │
        └───────────────────────────┬─────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────────┐      ┌────────────────────────────┐
        │ E4 ÉTUDE SECTORIELLE  │      │ E5 CARTOGRAPHIE + COMPTES  │
        │    « COMPRENDRE »     │─────►│      « ATTAQUER »          │
        │  24 mois de validité  │      │    12 mois de validité     │
        └───────────┬───────────┘      └──────────────┬─────────────┘
                    └───────────────┬────────────────-┘
                                    ▼
                    ┌───────────────────────────────┐
                    │ E6 CHAÎNE DE VALEUR (conditionnelle) │
                    └───────────────┬───────────────┘
                                    │  ◄── G1 conformité · G2 red team · G3 recette
        ┌───────────────────────────▼─────────────────────────────────┐
        │  E7 INGESTION ── Supabase · estampillage · péremption         │
        └───────────────────────────┬─────────────────────────────────┘
                                    ▼
              Business Intelligence · Prospection · Cockpit compte · Knowledge Hub
```

**E4 et E5 sont un seul run, deux livrables, un registre de sources commun.** C'est la
règle R1 de l'audit `08` (« fond et forme dans le même run »), précisée : le reformatage
a posteriori détruit les preuves, mais les deux couches n'ont ni le même lecteur ni la
même péremption, donc ni le même fichier. Voir `00-DOCTRINE.md` §A7.

---

## 4. Démarrage — produire la connaissance d'un secteur

> Parcours détaillé, pas à pas, avec les 4 arrêts où Guillaume décide : voir
> [`GUIDE-UTILISATEUR.md`](GUIDE-UTILISATEUR.md).

1. Lire `00-DOCTRINE.md` une fois, intégralement. Les 12 axiomes conditionnent tout le reste.
2. Ouvrir `03-ETAPE-E0-CADRAGE.md`, remplir le bloc de paramétrage, le sauver dans
   `registre/<AAAA-MM>-<slug-segment>/00-cadrage.json`.
3. Passer **G0** (`10-ETAPE-E7…` §2). Si G0 échoue, l'étude ne se lance pas — on traite
   d'abord ce qui manque. C'est le gate qui économise le plus de temps.
4. Dérouler `E1 → E7` dans l'ordre, chaque étape produisant son livrable dans le même dossier.
5. Chaque livrable est un **JSON validé** ; le rapport markdown est *généré depuis le JSON*,
   jamais l'inverse (axiome A9).

---

## 5. Registre de légitimité — statut de tout ce qui existait avant

C'est la partie qui empêche la concurrence de légitimité. **Quatre statuts, exclusifs.**

- **SOURCE UNIQUE** — dans ce dossier. Fait autorité.
- **NORMATIF DÉLÉGUÉ** — ce corpus lui délègue explicitement une autorité, sur un périmètre nommé.
- **ARCHIVE — raisonnement** — conserve le *pourquoi*. Se lit, ne s'applique pas.
- **PÉRIMÉ** — ne plus appliquer, ne plus citer comme règle.

### 5.1 Normatif délégué

| Document | Périmètre délégué |
|---|---|
| `docs/FEATURES/sector_intelligence/taxonomie-sectorielle/REFERENTIEL-CLASSIFICATION.md` | **Toute la classification d'un compte** : les 15 macros / 38 segments, les 7 axes, les 4 tests, la jurisprudence, les contrôles §10. E1 s'y conforme, ne le duplique pas |
| `src/features/competitive-map/domain/competitive-map-output.ts` | **Le parsing réel** du livrable E5. En cas d'écart entre `schemas/competitive-map.schema.json` et ce module, **le code gagne** — et le schéma est corrigé |
| `src/features/account-lifecycle/domain/account-classification.ts` + `public.apply_account_classification()` | L'application atomique des 7 axes. Aucun autre chemin d'écriture n'est autorisé |
| `supabase/migrations/` + `information_schema` | Le schéma de la base. **Jamais recopié dans ce corpus** — la leçon `company_audit` a coûté une session |
| `docs/adr/ADR-0019-*.md` | Profondeur de compte (`depth_level`), ingestion cartographie, règle D-3 des comptes `mapped` |
| `docs/adr/ADR-0012-*.md` | Chaîne de décision du cockpit, gate de matérialisation de la roadmap (D-2) |

### 5.2 Archive — raisonnement conservé, application interdite

| Document | Ce qu'il garde | Ce qui l'a remplacé |
|---|---|---|
| `sector_intelligence/ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` | La nomenclature des blocs et les décisions D-A→D-H, qui sont **reprises intégralement** ici | `01-CARTE-DE-LA-CONNAISSANCE.md` + `02-DISTRIBUTION-DANS-KREDO.md`. Ses compteurs de 12/08 sont périmés : voir `registre/ETAT-DES-LIEUX-2026-08-13.md` |
| `cartographie-concurrentielle/00-analyse-et-recommandations.md` | Les 12 améliorations et surtout **l'intention profonde** (les 4 questions du directeur commercial) | Repris en `00-DOCTRINE.md` §1 |
| `cartographie-concurrentielle/08-audit-comparatif…md` | L'audit des études A et B, les 7 lacunes L1-L7, les 3 règles R1-R3, l'architecture en 3 couches | `07-` et `08-ETAPE-…` |
| `cartographie-concurrentielle/09-methode-ultime…md` | Le diagnostic « le schéma n'est pas le problème, la chaîne l'est », la subsidiarité, les 3 gates | `00-DOCTRINE.md` §2 + `10-ETAPE-E7…` |
| `sources_intelligence_standards/implementation/ANALYSE-CRITIQUE-ET-ARCHITECTURE-CIBLE.md` | L'audit du 13/08 du chantier sources/corpus, le bug `slice(0,40)`, les 3 tables cibles | `06-ETAPE-E3…` §6. **Une de ses affirmations est fausse : `ai_intelligence_results.company_id` est nullable, pas NOT NULL** (vérifié live le 13/08) |
| `taxonomie-sectorielle/README.md` | La critique de la V0.1 et les arbitrages de taxonomie | Le `REFERENTIEL-CLASSIFICATION.md`, déjà normatif |
| `chaine-de-valeur/DECISION-MODELE.md` · `NOTE-EXPLOITATION.md` · `BRIEF-MODELISATION.md` | L'arbitrage `sector_id`, les 8 amendements, **et les formulations de rendez-vous** — qui sont un actif commercial réel | `09-ETAPE-E6…` reprend le modèle et les gates ; les formulations restent lisibles là-bas |
| `_legacy_kredo_(studies_v1)/PROCESS-ETUDE-SECTORIELLE.md` | Le process v1 (fiche sectorielle + injection) et sa grille /100 | E4 + E7. **Attention : deux skills le déclarent encore comme leur autorité sur un chemin qui n'existe plus** — voir §6 |

### 5.3 Périmé — ne plus appliquer

| Document | Motif |
|---|---|
| `cartographie-concurrentielle/01-prompt-generique.md` | Prompt v1.1 monolithique. Il fait produire par un LLM ce que E2 obtient déterministiquement (SIREN, NAF, IDCC), et il n'a jamais reçu le « Lot 6 » de réécriture prévu par le document 09. → `prompts/E4-etude-sectorielle.md` + `prompts/E5-cartographie-comptes.md` |
| `cartographie-concurrentielle/02-methode-operatoire.md` | Méthode en 8 phases d'un run unique. → E0→E7 |
| `cartographie-concurrentielle/03-sources.md` | Antérieur au standard sources v1.0, qu'il contredit sur les tiers. → E3 |
| `cartographie-concurrentielle/04-controle-qualite.md` | Scorecard auto-administrée par le producteur — le défaut E1 diagnostiqué par le document 09. → G1/G2/G3 |
| `cartographie-concurrentielle/05-templates-livrables.md` | Gabarits markdown. Le livrable est désormais un JSON validé (axiome A9). → `schemas/` |
| `cartographie-concurrentielle/06-exploitation-commerciale.md` · `07-exemples-parametrage.md` | Absorbés par `02-DISTRIBUTION-DANS-KREDO.md` et `03-ETAPE-E0-CADRAGE.md` |
| `sources_intelligence_standards/03_PROMPT_CANONIQUE_RECHERCHE_SOURCES.md` | Remplacé par `prompts/E3-corpus-sources.md`, qui intègre les correctifs E1/E2/E3 du document 09 et le durcissement NDJSON |

Les fichiers `01_`, `02_`, `04_`→`08_` de `sources_intelligence_standards/` restent
**normatifs délégués sur la qualification d'une source** (tiers, rôles, barème /100,
scorecard 24 critères) — E3 s'appuie dessus et ne les recopie pas.

### 5.4 Livrables — ni règles, ni archives

`livrables_etudes/`, `chaine-de-valeur/btp/`, `sources_intelligence_standards/sector_sources_lists/`
et `example_btp/` sont des **productions**. Ils illustrent, ils n'autorisent rien. Trois
d'entre eux portent des défauts identifiés et non corrigés (§ `registre/`).

---

## 6. État d'exécution — lire ceci avant de lancer quoi que ce soit

> 🔴 **Le corpus a tourné une fois, le 13/08/2026, et le run est rejeté.** Trois défauts de
> contrat bloquaient tout run futur ; **deux sont corrigés (v1.1), un reste ouvert et il est
> bloquant** : le parseur E5 ne lit pas la couche ESN, donc toute collecte d'accessibilité faite
> avant sa correction est perdue à l'ingestion.
> La roadmap actionnable, autoportante, est dans
> **[`registre/ROADMAP-CORRECTIONS.md`](registre/ROADMAP-CORRECTIONS.md)** — c'est le point
> d'entrée si vous reprenez le chantier. Le diagnostic complet est dans
> [`registre/2026-08-aero-spatial-defense/08-rapport-ecarts.md`](registre/2026-08-aero-spatial-defense/08-rapport-ecarts.md).

Le run `2026-08-aero-spatial-defense` a converti les deux études du Spatial vers les contrats de
ce corpus, sans recherche web. G1 : **16 PASS · 13 FAIL**. Aucune ingestion. Il a produit ce
qu'on lui demandait — la liste de ce qui casse — et sépare **9 défauts de contrat** de **6
manques de matière**. La distinction commande tout : un champ vide parce que la matière manque
appelle une collecte ; un champ vide parce que le contrat est faux appelle une correction, et
aucune production ne le remplira jamais.

### 6.1 Les bloquants — état au 13/08/2026 au soir

1. ✅ **G0 était inpassable par construction** — sa condition « les 7 axes à 100 % » contredisait
   le `REFERENTIEL-CLASSIFICATION.md` §5.5/§6.8/§10-6 qu'il déclare normatif, lequel impose
   `moment = NULL` sans fait daté sourçable (en base : 1 compte sur 96). **Corrigé** : G0
   distingue 5 axes toujours renseignables et 2 axes conditionnels dont le NULL se documente.
   Corollaire tranché au passage : **un compte client compte dans le seuil et figure dans la
   cartographie** — `comptes_exclus` d'E0 signifie « hors cibles de prospection ». → roadmap
   **A1**, **A2**.
2. ✅ **Le parseur E5 ne lisait pas la couche ESN** que le schéma déclare obligatoire : il ne
   projetait que onze clés dans `profile_json`, aucune des six qui portent la valeur commerciale,
   et la perte était **silencieuse**. La preuve en base : les dix `competitive_map_entries` du
   Spatial pèsent **40 à 73 octets**. **Corrigé** le 13/08/2026 (commit `149d3e98`) — les six clés
   sont lues, la couche ESN est produisible et importable. → roadmap **A4**.
3. ✅ **A9 et `cadrage.schema.json` s'excluaient** : le bloc `compteurs` était exigé par l'axiome
   et interdit par `additionalProperties: false`. **Corrigé.** → roadmap **A3**.

### 6.2 Dette d'origine — état au 13/08/2026 au soir

1. 🔴 **Les deux skills `.agents/skills/` pointent vers un fichier qui n'existe plus.**
   `kredo-sector-intelligence` déclare `docs/PROCESS-ETUDE-SECTORIELLE.md` comme son autorité
   (frontmatter, corps, `references/`, `scripts/audit_fiche.py`). Le fichier a été déplacé en août
   dans `docs/FEATURES/sector_intelligence/_legacy_kredo_(studies_v1)/`. **Un agent qui déclenche
   ce skill aujourd'hui ne trouve pas sa référence et improvise le schéma.**
   → **Non traité.** Repointer sur `07-ETAPE-E4…`, pas sur l'archive.
2. 🟠 **100 % de la connaissance est sur les 15 macros, 100 % des 109 comptes sur les 38
   segments** ; 1 seul segment sur 38 porte une fiche remplie.
   → **Non traité, et le premier run ne l'a pas fait bouger** : il s'arrête à G1 et n'ingère rien.
   La métrique vaut toujours **1/38**. C'est le chiffre qui mesure le chantier.
3. ✅ **La Master Study a désormais un endroit où vivre en base.**
   `intelligence_document_type += master_study` — migration
   `20260813120000_076_master_study_document_type.sql`, appliquée le 13/08/2026. Une valeur
   d'enum, aucune table nouvelle. **Piège à connaître** : ajouter une valeur à cet enum casse le
   `typecheck` et non le build — quatre `Record` exhaustifs la réclament aussitôt, dont quatre
   emplacements dans le seul `document-display.tsx`.

---

## 7. Comment on modifie ce corpus

| Nature du changement | Qui | Comment |
|---|---|---|
| Contenu d'un document (règle, seuil, formulation) | Guillaume, ou un agent sur sa demande | Édition + entrée dans `13-GOUVERNANCE.md` §journal |
| Ajout d'un bloc de connaissance | Guillaume | Amende `01-CARTE-DE-LA-CONNAISSANCE.md` **et** `02-DISTRIBUTION…` — un bloc sans écran n'existe pas |
| Ajout d'une étape, d'un gate, ou d'une section du squelette | **ADR obligatoire** | La structure est immuable ; la changer est une décision d'architecture |
| Changement de schéma de livrable | Guillaume + code | `schemas/` **et** le parseur TypeScript, dans le même commit |
