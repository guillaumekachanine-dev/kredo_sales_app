# 08 — Handoff : clôture du Lot 0, reprise sur le Lot 1

> **Statut** : ✅ **Lot 0 complet dans le code (7 sous-lots sur 7).** Reste la mise en
> production (import n8n manuel par Guillaume) et la mesure de la gate G0 sur des runs réels.
> **Créé le** : 2026-09-11.
> **Autorité normative** : le corpus `00` → `07` de ce dossier. En cas de divergence,
> **le corpus fait foi** ; ce handoff n'est qu'un point de reprise.
>
> Ce document est **autoportant** : un agent entrant l'exécute sans relire tout le corpus,
> mais doit lire **`02-DISTRIBUTION-DANS-KREDO.md`** (propriété canonique) et
> **`04-CONTRAT-EPISTEMIQUE-ET-SOURCES.md`** (règle d'ancrage) avant de toucher au code.

---

## 1. Le chantier en une page

**Objet.** Refonte de l'acquisition de connaissance compte depuis
`/prospection/accounts/[companyId]` (« Account Intelligence »). Point d'entrée unique,
4 niveaux d'analyse cumulatifs (L1 essentiel → L4 enjeux), double format base/rapport,
restitution rédactionnelle façon FOLIO.

**Le défaut qui a déclenché le chantier.** Relevé live du 10/09/2026 : `intel-030` V4 réussit
4 runs sur 12 (33 %), et sur les 4 réussis `external_pages_fetched = 0` — **aucune page
externe jamais lue**. La seule source externe est le registre légal ; les 5 autres sont des
agrégats internes (`internal:folio:`, `internal:facts:`…). Le pipeline détecte
`external_research_degraded` et **publie quand même en `succeeded`**, sans rien à l'écran.
Résultat : une prose de 13 500 caractères qualité FOLIO, citant Motion Equity Partners,
Vincent Monziols, le PPWR — **rien de tout cela n'a été lu sur une page**.

**Le diagnostic.** La V3 a échoué en étant si rigoureuse qu'elle ne disait plus rien (11
affirmations tirées d'un seul code NAF). La V4 échoue en comprenant si bien qu'elle dissimule
qu'elle n'a rien lu. Le problème de fond n'a pas changé de nature, il a changé de côté.

**Ce que fait le Lot 0.** Il ne construit ni niveau, ni renderer, ni UI. Il **répare la
collecte** et la rend **impossible à masquer** :
- un nouveau workflow **INTEL-035** constitue le corpus AVANT l'analyse, en récupérant
  et extrayant réellement chaque document ;
- **INTEL-030 V4 devient un pur consommateur** de ce corpus — il n'a plus la capacité de
  récupérer une page ;
- l'artefact porte un bloc `anchoring` qui dit honnêtement `nominal` / `degraded` /
  `internal_only` ;
- un seau interne (`internal:*`) n'ancre plus jamais un `established` ou un `declared`.

---

## 2. Où en est le chantier — état exact

| Lot | Contenu | État | Commit(s) |
|---|---|---|---|
| **Corpus** | 9 documents normatifs, `account_knowledge/` → ARCHIVE | ✅ Livré | `b5ccdf47` `02afc051` `8ce331a3` `24c48c28` |
| **0.1** | Migration `account_source_documents` | ✅ Livré, **appliquée en prod** (`20260910215911`) | `19cadaf0` |
| **0.2** | Contrats TS : ancrage, 20 modules canoniques, `SourcePlan` | ✅ Livré | `8c1f4453` |
| **0.3** | `intel-030` : `anchoring` dans `content_json`, INV-1/INV-2, `guardFigures` | ✅ Livré | `fe0597e5` |
| **0.4** | Portail d'ingestion `ingestAccountSourcePlan()` | ✅ Livré | `74b146ec` |
| **0.5** | Câblage callback `account_source_plan` | ✅ Livré | `afdc976f` |
| **0.6** | Workflow **INTEL-035** (20 nœuds, 10 Code, 0 LLM) | ✅ Livré | `a436d04b` |
| **0.7** | INTEL-030 V4 → consommateur de corpus (4 nœuds retirés, 2 ajoutés) | ✅ Livré | `1307c6e9` ⚠️ **non poussé** |

**Branche** : `main`. Guillaume travaille **directement sur main**, sans branche de travail
(mémoire `git-travail-direct-sur-main`).

**À faire immédiatement au démarrage de la reprise :**
1. `git push origin main` — le commit `1307c6e9` (Lot 0.7) n'est pas poussé. Cela déclenche
   un déploiement Vercel.
2. **Attendre la fin du déploiement.**
3. Prévenir Guillaume qu'il peut importer les workflows (§4).

---

## 3. Ce qui a été construit — détail par fichier

### TypeScript (tout testé, `npm test` = 3145 tests verts, 299 fichiers)

| Fichier | Rôle |
|---|---|
| `src/lib/intelligence/account-intelligence-contracts.ts` | **+120 lignes** au Lot 0.3 : `AccountKnowledgeAnchoringV4`, `AccountKnowledgeResearchStatusV4` (3 états), `isInternalAggregateSourceId()`, `resolveAccountKnowledgeAnchoring()` — reconstruit l'ancrage d'un artefact legacy sans migration, à partir de `coverage.external_pages_fetched` |
| `src/lib/intelligence/account-intelligence-modules.ts` | **117 lignes, nouveau.** Les 20 modules canoniques (miroir du `03` §3), `modulesForLevel()` cumulatif, `NON_DISABLEABLE_MODULES` (A1), `INTERNAL_FIRST_MODULES` (A7), `requiresExternalResearch()` |
| `src/lib/intelligence/account-source-plan-contracts.ts` | **138 lignes, nouveau.** Contrat `AccountSourcePlanContent`, aligné sur les CHECK de `account_source_documents`. Distinction clé : statut du **document** en base (`retrieved`/`unreachable`, immuable) vs statut de l'**entrée** dans le plan (`recommended`/`approved`/`excluded`, décision humaine). `selectUsableEntries()`, `modulesLeftWithoutMaterial()` |
| `src/lib/intelligence/account-source-plan-ingest.ts` | **347 lignes, nouveau.** `ingestAccountSourcePlan()` — c'est **l'app** qui écrit `account_source_documents`, pas n8n (doctrine ADR-0020). Frontière tenant (reparentage sur le workspace/compte du RUN), dédup par `content_hash` avant insert, modules canoniques seulement, couverture recalculée depuis ce qui a été écrit |
| `src/lib/intelligence/intelligence-validators.ts` | **+50 lignes** : `V4_ANCHORING_KEYS`, `V4_RESEARCH_STATUSES`, validation du bloc `anchoring` (optionnel mais vérifié : bornes du ratio, cohérence ancrés/total, refus d'un `nominal` citant 0 document externe). Sans l'ajout aux clés autorisées, tout artefact post-Lot-0 aurait été rejeté au callback |
| `src/lib/n8n/types.ts` | `N8nCallbackPayload.sourceDocuments?: Record<string, unknown>[]` |
| `src/app/api/n8n/callback/route.ts` | Branche `account_source_plan` (§ 4 bis-2). Run en `failed` si aucun document exploitable (A2). Rejets non bloquants → `qaFlags` `source_document_rejected` |

**Tests dédiés** : `account-intelligence-anchoring.test.ts` (20, fixture reproduisant le run
Tournaire `a7bdbeb7` réel), `account-source-plan-ingest.test.ts` (17), `intelligence-validators.test.ts`
(+8 pour l'ancrage), `route.test.ts` (+7 pour le plan de sources).

### n8n

| Fichier | Rôle |
|---|---|
| `n8n/workflows/intel-035-account-source-preflight.json` | **Généré**, 20 nœuds, 10 Code, **0 appel LLM**. Ne jamais éditer à la main |
| `n8n/workflows/intel-035-account-source-preflight.SETUP.md` | Autoportant pour l'import VPS |
| `scripts/build-intel-035.py` | Générateur. `python3 scripts/build-intel-035.py` → régénère + `node --check` chaque nœud |
| `scripts/patch-intel-030-consume-source-plan.py` | Patch **déjà appliqué** (Lot 0.7). Idempotent — le rejouer ne casse rien |
| `scripts/url-guard-node.js` | **Nouveau.** Garde SSRF `parseUrl` promu en module partagé (son nœud d'origine `V4 Fetch Selected Pages` a été supprimé). Injecté par `build-intel-035.py`. Toute évolution ICI, puis rejouer le générateur |
| `scripts/entity-resolution-node.js` | Inchangé. Module partagé de résolution d'entité (source : `src/lib/intelligence/entity-resolution.ts`) |
| `n8n/workflows/intel-030-account-knowledge.json` | **82 nœuds** (était 84). V4 = 16 nœuds. Retirés : `V4 Build SerpAPI Requests`, `V4 SerpAPI Search`, `V4 Normalize SerpAPI Discovery`, `V4 Fetch Selected Pages`. Ajoutés : `V4 Load Source Documents` (httpRequest), `V4 Normalize Source Documents` (Code) |

**Harnais** (`npm run test:n8n`, lire le **compteur final** jamais le code de sortie) :
- `intel-035-account-source-preflight.test.js` : **60 assertions** — nouveau
- `intel-030-account-knowledge-v4.test.js` : **69 assertions** (était 85 ; les 16 « manquantes »
  ont **migré** vers le harnais 035, elles testaient un fetch qui n'existe plus dans V4)
- `intel-030-account-knowledge-v3.test.js` : 91 · `intel-030-account-knowledge.test.js` : 77

### Base de données

**`account_source_documents`** — appliquée en prod, version `20260910215911`. 24 colonnes,
RLS 1 policy SELECT workspace-scopée + écriture service_role, 6 index.
**Invariant porté par le DDL** : la contrainte `asd_lu_ou_injoignable` rend **impossible**
d'enregistrer un `retrieved` sans `extracted_text` + `content_hash` + `extracted_chars > 0`
+ `fetched_at`, et impose un `failure_reason` sur tout `unreachable`. C'est A2 en SQL.

---

## 4. Mise en production — procédure pour Guillaume

**Ordre contraignant** (le non-respecter casse tous les runs V4) :

```
1. [agent]     git push origin main            → déploiement Vercel
2. [Guillaume] attendre la fin du déploiement
3. [Guillaume] n8n UI → Import from File → intel-035-account-source-preflight.json   (NOUVEAU)
4. [Guillaume] n8n UI → Import from File → intel-030-account-knowledge.json          (RÉIMPORT — drift)
5. [Guillaume] sur les 3 workflows (dont les 2 ci-dessus) : remplacer
               REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET dans les nœuds Verify Signature /
               Sign Callback / Sign Failure Callback
6. [Guillaume] activer INTEL-035
```

**Pourquoi l'ordre.** Le workflow patché envoie `contentJson.anchoring` et un `resultType`
`account_source_plan` que seule l'app déployée sait accepter. Import avant déploiement →
callback rejeté en 400 → runs en `failed`.

**Aucun nouveau credential.** `Supabase_Service_Role_KREDO` (`GBrm2aWU0dDf85QS`) et
`SerpAPI_KREDO` (`4FHmaQGaAytZHN4w`) suffisent.

**`npm run n8n:status`** montre aujourd'hui : `1 absent` (INTEL-035) + `1 drift`
(intel-030, 84→82). Après import, les deux doivent disparaître.

> ⚠️ Piège documenté : `n8n:status` compare les **compteurs de nœuds**. Le patch 0.3
> (`V4 Parse & Guard`) n'avait PAS changé le compte de nœuds — la commande ne l'a jamais vu.
> Le Lot 0.7 change le compte, donc il apparaît. Ne jamais se fier à `n8n:status` seul pour
> savoir si un réimport est nécessaire.

---

## 5. Gate G0 — à mesurer sur des runs réels

**Le code est complet ; les gates ne sont mesurables que sur des runs post-import.**

| # | Critère | Cible | Avant (10/09) |
|---|---|---|---|
| G0.1 | Taux de succès `intel-030` sur 20 runs | ≥ 80 % | 33 % |
| G0.2 | `external_documents_used ≥ 3` sur runs nominaux | ≥ 90 % | 0 % |
| G0.3 | Durée p95 d'un run L2 | < 240 s | 425 s |
| G0.4 | `anchoring` dans `content_json` | 100 % | 0 % → ✅ code |
| G0.5 | Aucun `succeeded` avec `degraded` non signalé | 0 | 4/4 → ✅ code (impossible par construction) |
| G0.6 | Statements citant un agrégat interne | 0 | ~14/21 → ✅ code |
| G0.7 | INTEL-035 / INTEL-030 sans `has_tokens_gap` | 100 % | ✅ INTEL-030, INTEL-035 émet 0/0/`deterministic` |
| G0.8 | Placeholder « ordre de grandeur » en prose | 0 | ≥ 2 → ✅ code |

**Requêtes de mesure** : `07-BENCHMARK-ET-GATES.md` §7.

**Pari de l'agent sortant** : G0.2 est celle qui résistera. Le timeout passe de 6 s à 15 s
et le nettoyage HTML est meilleur, mais une page rendue en JavaScript sortira toujours en
`unreachable` (« contenu trop court »). Si G0.2 échoue, l'arbitrage est dans le SETUP
d'INTEL-035 §« Limites connues » : brancher un service de récupération tiers (Bright Data /
Firecrawl / Jina Reader) sur le **seul** nœud `Fetch Documents`, désormais point unique.

**Jeu de comptes de référence** (`07` §3, à figer, rejouer à chaque gate) : Tournaire
(régression d'identité + ancrage), Ciffreo Bona (cas trop pauvre), un compte riche FOLIO+CRM,
un compte peu documenté, un compte à Master Study riche, un compte à activité commerciale
réelle.

---

## 6. Décisions structurantes — ne pas revenir dessus sans raison

| Décision | Où | Pourquoi |
|---|---|---|
| **Point d'entrée UX unique, moteurs internes distincts** | `06` §1 | Fusionner INTEL-010/031/033/034 dans les 82 nœuds d'intel-030 = monolithe intestable, plusieurs propriétaires de la même donnée |
| **Une seule migration sur tout le chantier** : `account_source_documents` | `05` §6 | `intelligence_sources.evidence_excerpt` est un extrait, pas un corps de page de 14 000 car. Tordre ce champ = mensonge sémantique durable |
| **INV-1** : `established`/`declared` exigent ≥ 1 source externe ancrée | `04` §2.2 | Le garde-fou V4 valide la *forme* de la provenance, jamais sa *substance* : citer `internal:folio:` suffisait |
| **INV-2** : un agrégat interne n'est jamais une `source_ref` | `04` §2.2 | idem |
| **`anchoring` optionnel** dans le contrat | `contracts.ts` | Les 4 artefacts V4 en base n'en portent pas. `resolveAccountKnowledgeAnchoring()` reconstruit pour le legacy — jamais lire le champ brut |
| **`epistemicMode` = filtre de restitution, pas paramètre de run** | `03` §5, `04` §4 | Sinon un run par mode, et plus de comparaison possible |
| **Le niveau atteint se lit, ne se stocke pas** | `03` §4 | Pas de `companies.analysis_level`. Surtout pas `companies.depth_level` (= lifecycle ADR-0019, sémantique différente). Vue SQL au-dessus de `account_facts` |
| **Modules canoniques, jamais des libellés d'interface** | `03` §3 | Régression V3 : `SUBJECT_TO_SEGMENTS` indexé sur des chaînes françaises, renommer un libellé cassait le périmètre en silence |
| **La télémétrie de coût n'était PAS morte** | `07` §1 | Erreur du 1er jet du corpus, corrigée. `total_cost_estimate` à zéro est **volontaire** (rollups morts, Session 55) ; le coût vit dans `v_ai_run_costs` et fonctionne (~0,28 $/run V4) |

**Piège du corpus** : le rapport ChatGPT initial affirmait que `includedSubjects` était
« déjà plombé, à assainir ». **Faux** — seule la branche V3 le consomme, les 16 nœuds V4
l'ignorent. La modularité V4 passe par `sourceDocumentIds` (Lot 0.7, déjà en place) puis
`includedModules` (Lot 2).

---

## 7. Prochain lot — Lot 1 : restitution V4

**Objectif** : construire le renderer V4, qui **n'existe pas**. Vérifié :
`ClientIntelligenceCompanyTab.tsx` rend V1 (`AccountKnowledgeBlocks`), V2
(`AccountKnowledgeV2Blocks`), V3 (`folio-v3/AccountKnowledgeV3Desktop`) — rien pour V4.
Le moteur est en avance sur sa restitution.

**Pourquoi maintenant et pas avant** : le construire avant le Lot 0 aurait donné une
autorité visuelle (badges « Établi », puces « Source ») à un contenu non ancré.

**Livrables** :
- rendu éditorial des `narrative[]` (réutiliser les primitives FOLIO existantes de
  `folio-v3/`, **pas** de nouvelle bibliothèque de composants) ;
- badges épistémiques `Établi · Déclaré · Déduit · Hypothèse` au niveau des statements
  significatifs, pas paragraphe par paragraphe ;
- **bandeau d'ancrage** : `research_status` visible en tête. Un rapport `internal_only`
  ouvre sur *« Analyse produite sans consultation de source externe — fondée sur les
  données KREDO et le registre légal. »* C'est la traduction à l'écran de A2 ;
- disclosure `Sources` au niveau du statement, avec document, date, extrait ;
- affichage des `knowledge_gaps` de section ;
- lecteur « Rapport complet » = composant de visualisation de `content_text` ;
- bouton **Vérifier** (désactivé — la capacité arrive au Lot 5).

**Data** : `ClientIntelligenceData` charge déjà `accountKnowledgeV4` via
`intelligence-data.ts`. Vérifier le chemin `accountKnowledge?.version === 4`.
**Aucune migration. Aucun changement de workflow.**

**Adaptive** (ADR-0006) : le cockpit compte est un écran dense → adaptive plein probable
(`DesktopView.tsx` / `MobileView.tsx`). Vérifier ce que fait déjà `ClientIntelligenceView` /
`ClientIntelligenceDesktopView` / `ClientIntelligenceMobileView`.

**Design** : thème `cockpit_intelligence_design` — lire
`docs/DESIGN/design-systems/cockpit_intelligence/cockpit_intelligence_design.md` puis
`edito_bright_design.md` **avant** de toucher à l'UI. QA visuelle = Guillaume.

---

## 8. Lots suivants (rappel, `06` §5)

| Lot | Contenu |
|---|---|
| **2** | Contrat de lancement (`targetLevel`, `includedModules`, `refreshMode`, `sourcePlanResultId`, `sourcePolicy`), vue SQL de couverture, tests bout-en-bout L1/L2/L3/L4 = 4 périmètres distincts |
| **3** | `AccountAnalysisHub` → `AccountIntelligenceControlCenter`, ouvert depuis le header permanent. Bloc Sources (INTEL-035), méthode, veille. C'est ici que « scan rapide » / « account knowledge » disparaissent du langage produit |
| **4** | Distribution : L1 propose les faits, L2 écrit l'artefact, L3 lit la Master Study, L4 → INTEL-031 → `account_issues`. Contrôle de non-régression : onglets Secteur/Enjeux consomment-ils leur propriétaire canonique ? |
| **5** | Vérification à la demande. **D'abord faire tourner INTEL-034 une fois** (1 run, `failed`, jamais prouvé). Puis sibling pour les statements |
| **6** | Benchmark final, décision de bascule factuelle (`07` §5), retrait de l'ancien parcours. Garder V1/V2/V3 en compatibilité |

---

## 9. Rappels opérationnels

- **Boucle de validation** : `typecheck` → `test` → `check:server-boundary` → `lint` (fichiers
  touchés) → `build`. **+ `test:n8n` dès qu'un fichier `n8n/workflows/` est touché.**
- **`tsc` faux positif** : un `build` en parallèle régénère `.next/types` et fait apparaître
  des erreurs transitoires sur des composants non touchés. Rejouer `typecheck` seul.
- **`.next/` périmé** → faux `TS6200`/`TS2300`. Purger avant de conclure à une régression.
- **Nom de migration** : aligner le fichier local sur le timestamp **réellement enregistré**
  dans `schema_migrations` (le fichier `20260910120000` a dû être renommé `20260910215911`).
- **Harnais n8n** : toujours lire le **compteur final d'assertions**. Une exception dans un
  nœud Code fait sauter toutes les assertions restantes sans changer le code de sortie.
- **Import/activation n8n** = **manuel, par Guillaume**. Le MCP n8n est bloqué en session agent.
- **Journal** : entrée Session 63 déjà en tête de `docs/JOURNAL-SESSIONS.md`. Ajouter une
  Session 64 à la clôture du Lot 1.
- **CLAUDE.md** : règle d'ancrage (§ Intelligence commerciale) et 5ᵉ piège n8n (§ Commandes)
  déjà remontés. Ligne « Account Intelligence » dans les chantiers en cours.

---

## 10. Fichiers à lire en priorité pour reprendre

```
docs/FEATURES/cockpit_intelligence_features/account_intelligence/
  README.md                          ← 2 min, la carte
  02-DISTRIBUTION-DANS-KREDO.md       ← OBLIGATOIRE avant de coder
  04-CONTRAT-EPISTEMIQUE-ET-SOURCES.md ← OBLIGATOIRE (INV-1/INV-2, 3 modes)
  06-ARCHITECTURE-TECHNIQUE.md §4-5   ← état réel du code + séquencement
  07-BENCHMARK-ET-GATES.md §1, §7     ← chiffres de référence + requêtes

src/lib/intelligence/account-intelligence-contracts.ts   ← le contrat V4 + anchoring
src/lib/intelligence/account-source-plan-contracts.ts    ← le SourcePlan
n8n/workflows/intel-035-account-source-preflight.SETUP.md ← ce que fait INTEL-035
```
