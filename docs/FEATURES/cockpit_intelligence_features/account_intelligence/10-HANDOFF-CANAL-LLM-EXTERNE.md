# 10 — Handoff : canal LLM externe (Lot 0.8), reprise sur le Lot 1 (renderer V4)

> **Statut** : ✅ **Canal externe construit et prouvé en conditions réelles** (deux
> comptes, deux moteurs, un import réel en base). ⏸️ **INTEL-035/génération V4 d'INTEL-030
> ni retirées ni confirmées** — décision volontairement reportée, à trancher après le Lot 1.
> **Créé le** : 2026-09-11.
> **Autorité normative** : le corpus `00`→`07` (inchangé sur le fond) + `09` (nouveau,
> le gabarit du canal externe). Ce handoff est un point de reprise, pas une nouvelle
> doctrine.
>
> Autoportant : un agent entrant l'exécute sans avoir vécu la session qui l'a produit.
> Lire **`02-DISTRIBUTION-DANS-KREDO.md`** et **`04-CONTRAT-EPISTEMIQUE-ET-SOURCES.md`**
> avant de toucher au code si ce n'est pas déjà fait — ce handoff les suppose acquis.

---

## 1. Le chantier en une page

**Point de départ de la session** : le Lot 0 (`08-HANDOFF-LOT-0-CLOTURE.md`) était clos
dans le code mais jamais mesuré en production. Objectif annoncé : mesurer, sur des runs
réels, si INTEL-035 (preflight de sources SerpAPI + fetch) répare vraiment le défaut
fondateur du chantier (V4 qui publie une analyse sans avoir lu une seule page externe).

**Ce qui s'est passé, dans l'ordre** :

1. **Premier run réel post-import** (`ID#83600`) : échec sur `numeric_hypothesis` — un
   garde-fou tout-ou-rien qui jette tout un artefact pour un seul chiffre dans une
   `hypothesis`.
2. **Deuxième run** (`ID#83601`) : « réussi », mais `research_status: internal_only`,
   `anchoring_ratio: 0.15` — la régurgitation FOLIO que le Lot 0 existe pour empêcher.
   INTEL-035 n'avait jamais tourné pour ce compte.
3. **Étape B — preuve qu'INTEL-035 fetch réellement** : 3 bugs trouvés et corrigés en
   conditions réelles (`c857bf64`, `42f547ee`) — voir §3. Après fix, INTEL-035 résout
   l'entité et récupère de vraies pages (Tournaire : 6/8, Domusvi : 6/8), le tout persisté
   dans `account_source_documents`.
4. **Mais la qualité du corpus reste mauvaise** : sur Tournaire, les 6 documents récupérés
   sont **100 % `tournaire.fr`** (accueil, RH, pages institutionnelles) — zéro presse, zéro
   source indépendante. Cause : `Fetch Documents` bonifie le site officiel de +100, les
   requêtes SerpAPI sont génériques (`"Tournaire" + "concurrents"`), le budget L2 est de
   8 documents. **Ce n'est pas un bug isolé, c'est un plafond structurel** de l'approche
   « une recherche, huit documents ».
5. **Le déclic** : Guillaume a lancé Gemini en mode **Deep Research** sur Tournaire avec
   une requête libre. Résultat : 61 sources réelles, table financière complète (via
   Pappers), chaîne M&A retracée (Motion Equity Partners, acquisition InovaWeld), grade
   due diligence. Ce qu'INTEL-035/030 ne peuvent structurellement pas produire, un moteur
   de recherche approfondie externe le fait en une requête.
6. **Décision** : ne pas reproduire ça en interne (aurait fallu rebâtir un moteur de
   recherche agentique — Perplexity `sonar-deep-research`, `o3-deep-research`… ce que ces
   fournisseurs vendent déjà), mais **déléguer la recherche à un LLM externe et ne garder
   côté KREDO que le contrat, la validation et la distribution** — renforcement de
   `02-DISTRIBUTION-DANS-KREDO.md` (« une analyse cite, elle ne possède pas »), pas une
   exception.
7. **Preuve sur un second cas, avec le vrai code** : rapport ChatGPT Deep Research sur
   **SOS Oxygène** (prospect réel du CRM, pas une démo) — 65 sources. Converti à la main
   en JSON V4, passé dans **le vrai gate n8n** (`V4 Validate Artifact` : 0 erreur) puis
   dans **le vrai validateur TS** (`validateAccountKnowledgeV4` : 11 erreurs, toutes sur
   `entity_resolution`). Le contenu épistémique passait du premier coup ; seul le schéma
   de résolution d'entité était surajusté à notre algorithme de nom-matching interne.
8. **Fix + preuve finale** : `entity_resolution.method: "external_research"` ajouté
   (`d866cf66`), artefact SOS Oxygène ré-testé → 0 erreur. Point d'import construit
   (`37c58e37`) et **utilisé pour de vrai** : run `ee94337d-211b-4fa2-aef2-19b458286a94`,
   `succeeded`, en base.

**Ce que la session laisse** : un canal de bout en bout, mesuré deux fois sur des comptes
réels avec deux moteurs différents (Gemini, ChatGPT), qui fonctionne. Ce qu'elle NE laisse
PAS : un moyen de le refaire sans un humain qui structure le rapport en JSON à la main
(§8.1 — le vrai chantier restant), ni un renderer pour montrer quoi que ce soit à l'écran
(Lot 1, demandé ensuite par Guillaume — §7).

---

## 2. État exact au 11/09/2026

| Sous-lot | Contenu | État | Commit |
|---|---|---|---|
| **INTEL-035 fix #1** | `Prepare Dossier` lisait `company.sector_name`/`ctx.facts`/`ctx.sector` — absents de la RPC (`company.sector`, `accountFacts`, `sectorKnowledge`). Sans `sector`, `Resolve Entity` ne départage plus une société de son holding homonyme | ✅ Livré, réimporté, **prouvé** (Tournaire résout après fix) | `c857bf64` |
| **INTEL-035 fix #2** | `Prepare Failure Callback` inaccessible à `$('Validate Preflight Input')` depuis une branche d'erreur aval → callback jamais envoyé, run bloqué `running` | ✅ Livré, réimporté, **prouvé** | `c857bf64` |
| **INTEL-035 fix #3** | Dates SerpAPI non-ISO (« 8 juil. 2026 ») → insert `timestamptz` cassé, plan entier rejeté | ✅ Livré, réimporté, **prouvé** | `c857bf64` |
| **INTEL-035 fix #5** | Octets NUL dans le texte extrait → « unsupported Unicode escape sequence », insert cassé | ✅ Livré, réimporté, **prouvé** | `42f547ee` |
| **INTEL-035 fix #6** | Timeout du nœud `Callback` (30 s) trop court pour l'insert de N documents lourds → run marqué `failed` alors que le corpus était déjà écrit | ✅ Livré, réimporté, **prouvé** | `42f547ee` |
| **Doc 09 — gabarit LLM externe** | Instructions de Project (Gemini/ChatGPT), contrat épistémique porté en prose, schéma JSON V4 | ✅ Livré, testé 2x, corrigé après coup (`coverage` manquant, `method`) | doc only, puis patché in-place |
| **`entity_resolution: "external_research"`** | Schéma + validateur assouplis pour un producteur qui n'a ni score, ni marge, ni candidats concurrents | ✅ Livré, testé (2 tests de régression) | `d866cf66` |
| **Point d'import** | `importExternalAccountKnowledge()` + banc `(dev)/account-knowledge-import` | ✅ Livré, **utilisé en réel** (SOS Oxygène) | `37c58e37` |
| **Renderer V4** | Rendu des artefacts `schema_version: 4` sur `/prospection/accounts/[companyId]` | ❌ **N'existe pas.** Prochain lot (§7), demandé explicitement par Guillaume | — |
| **Structuration répétable (« stage 2 »)** | Convertir un rapport Deep Research libre → JSON V4 conforme, sans intervention manuelle | ❌ **N'existe pas.** Fait à la main deux fois cette session. Le vrai chantier avant de scaler (§8.1) | — |
| **Sort d'INTEL-035 / génération V4 d'INTEL-030** | Garder en parallèle, ou retirer au profit du canal externe | ⏸️ **Décision reportée**, pas prise cette session | — |

**Branche** : `main`, travail direct dessus (mémoire `git-travail-direct-sur-main`). Tout
poussé — `git log` : `37c58e37 → d866cf66 → 42f547ee → c857bf64` sur `7e8ae5c9` (clôture
Lot 0).

**⚠️ L'arbre de travail portait, pendant cette session, du WIP concurrent non lié**
(`src/components/finance/**`, `src/components/cockpit/**`, `src/components/layout/
navigation-icons.tsx`) — une autre session travaillait en parallèle sur le dashboard finance
mobile et la nav desktop. Rien de ce handoff n'y touche ; vérifier au démarrage que
`git status` est propre avant de committer quoi que ce soit.

---

## 3. Ce qui a été construit — détail par fichier

### n8n — INTEL-035 (`scripts/build-intel-035.py`, régénère `intel-035-account-source-preflight.json`)

| Nœud touché | Fix |
|---|---|
| `Prepare Dossier` | `company.sector_name`→`company.sector`, `segment_name`→`segment`, `ctx.facts`→`ctx.accountFacts`, `ctx.sector`→`ctx.sectorKnowledge` — noms réalignés sur `get_account_understanding_context` |
| `Prepare Failure Callback` | Fallback sur `$('Webhook — Source Preflight').body` quand `$('Validate Preflight Input')` est inaccessible (branche d'erreur aval) |
| `Callback` | Timeout `30000` → `120000` |

Harnais `n8n/workflows/__tests__/intel-035-account-source-preflight.test.js` : 59 → **63
assertions** (+4 régressions : sector/segment dans le canonical, `sectorKnowledge` transmise,
callback d'échec depuis une branche aval).

### TypeScript

| Fichier | Rôle |
|---|---|
| `src/lib/intelligence/account-source-plan-ingest.ts` | `asIsoDate()` (date non parseable → `null`, jamais un insert cassé) ; `sanitizeExtractedText()` (retire C0/DEL, neutralise les surrogates orphelins avant insert) |
| `src/lib/intelligence/entity-resolution.ts` | `EntityResolutionMethod` += `"external_research"` ; `EntityResolutionSnapshot` — les champs internes au résolveur (`naf_section`, `hq_commune`, `hq_postal_code`, `score`, `margin`, `blockers`, `signals`, `candidates`, `needs_human_confirmation`, `can_propose_canonical_writes`) deviennent **optionnels** ; `hq_location?` ajouté comme alternative pour le cas externe |
| `src/lib/intelligence/intelligence-validators.ts` | `validateEntityResolutionSnapshotV4` : branche dédiée pour `method === "external_research"` — exige seulement `decision/method/siren/legal_name/naf_code/reasons` + `hq_location`, ne valide RIEN des champs qu'un producteur externe ne peut pas fournir honnêtement |
| `src/lib/intelligence/import-external-account-knowledge.ts` | **Nouveau.** `importExternalAccountKnowledge()` — même porte que `/api/n8n/callback` pour `result_type=account_knowledge` (`ingestAccountKnowledgeArtifact`, INV-1/INV-2, frontière tenant), puis `createRun`/`saveResult`/`updateRunStatus`. `trigger_source: "manual_import"`, aucun id n8n, aucun compteur de tokens inventé |
| `src/app/(dev)/account-knowledge-import/` | **Nouveau.** Banc `page.tsx` + `ImportAccountKnowledgeForm.tsx` (client) + `actions.ts` (Server Action, auth via `supabase.auth.getUser()` + lecture `profiles.workspace_id`, pattern `requireUserAndWorkspace()` déjà utilisé ailleurs dans le repo) |

**Tests** : +2 dans `entity-resolution.test.ts` (ajustés pour `candidates` optionnel), +2
dans `intelligence-validators.test.ts` (accepte/rejette `external_research`), +2 dans
`account-source-plan-ingest.test.ts` (dates, sanitization).

`npm test` : **3152 tests, tous verts** au dernier commit de la session.

### Documentation

| Fichier | Rôle |
|---|---|
| `docs/.../account_intelligence/09-PROJECT-INSTRUCTIONS-LLM-EXTERNE.md` | **Nouveau.** Instructions à coller dans un Project Gemini/GPT personnalisé : les 10 axes, la méthode de recherche itérative, le contrat épistémique (4 qualifications, INV-1/INV-2 en prose), le schéma JSON V4 exact (root : `schema_version, entity_resolution, sections, sources, knowledge_gaps, coverage, generated_at` — **`coverage` était absent du premier jet, corrigé**), une checklist d'auto-vérification avant de rendre la réponse |
| Ce fichier (`10`) | Handoff de reprise |

---

## 4. Preuves mesurées — les deux runs de référence

### Tournaire — Gemini Deep Research (manuel, jamais importé en base)

61 sources dont Pappers (finances 2020-2023), motionequitypartners.com (actionnaire),
packagingeurope.com, perfumerflavorist.com, un journal local québécois sur l'acquisition
InovaWeld. **Jamais converti en JSON ni importé** — c'est le déclencheur de la décision,
pas un artefact en base. À reprendre si on veut un second exemple Gemini en base.

### SOS Oxygène — ChatGPT Deep Research → JSON V4 → importé pour de vrai

- Rapport exporté en **PDF** (pas `.md` — le `.md` d'origine avait perdu la bibliographie,
  les marqueurs `citeturnNNsearchN` ne survivent pas à l'export ; **le PDF garde les 65
  sources avec URL résolues, pages 15-16** — piège opérationnel, voir §6).
- Converti à la main en JSON V4 : 8 sections, 24 statements (10 established, 6 declared,
  4 inferred, 4 hypothesis), 15 sources citées (sous-ensemble des 65, celles réellement
  mobilisées), **zéro seau interne** (`internal:*`) — inédit, tous les runs INTEL-030
  précédents en portaient au moins un.
- `anchoring_ratio` = **0,83** (20/24 statements ancrés) contre 0,15 sur les runs
  `internal_only` d'INTEL-030 V4.
- Validé par **`V4 Validate Artifact`** (copie exacte du nœud n8n) : 0 erreur du premier
  coup.
- Validé par **`validateAccountKnowledgeV4`** (le vrai validateur TS, plus strict) :
  d'abord 11 erreurs (toutes `entity_resolution`, absence de `score`/`margin`/`candidates`/
  etc.) → 0 erreur après le fix `entity_resolution: "external_research"`.
- **Importé en base pour de vrai** via `importExternalAccountKnowledge()` (appelé
  directement, hors HTTP, avec un script `tsx` jetable — voir §6 pour pourquoi) :
  `run_id = ee94337d-211b-4fa2-aef2-19b458286a94`, `status = succeeded`,
  `trigger_source = manual_import`, `content_json.anchoring.research_status = nominal`.

**Vérification que c'est bien la seule vraie ligne du canal externe** :
```sql
select r.id, c.name, res.content_json->'anchoring' as anchoring
from ai_intelligence_runs r
join companies c on c.id = r.company_id
join ai_intelligence_results res on res.run_id = r.id
where r.input_snapshot->>'source' = 'external_llm_import';
```
Ne filtre **jamais** sur `trigger_source = 'manual_import'` seul — voir §6, piège de
collision de valeur.

---

## 5. Décisions structurantes — ne pas revenir dessus sans raison

| Décision | Pourquoi |
|---|---|
| **Le canal externe s'appuie sur le mode Deep Research, pas la recherche web légère** | Web search léger (ChatGPT « Recherche sur le web », API `web_search`) ≈ ce qu'INTEL-035 fait déjà, en moins bien tracé. Seul le mode Deep Research (plusieurs minutes, boucle agentique, dizaines de sources) reproduit la qualité observée. Un futur appel API devra viser les modèles Deep Research dédiés (`o3-deep-research`/`o4-mini-deep-research`, `sonar-deep-research`…), pas `web_search` |
| **KREDO ne rebâtit pas de moteur de recherche agentique en interne** | C'est un produit que plusieurs fournisseurs vendent déjà, mieux qu'une itération maison ne le ferait à coût raisonnable. Le métier KREDO reste le contrat, la validation, la distribution — cohérent avec `02-DISTRIBUTION-DANS-KREDO.md`, pas une exception à sa doctrine |
| **`entity_resolution: "external_research"` ne fabrique jamais de score/marge/candidats fictifs** | Un producteur externe n'a pas exécuté notre algorithme de nom-matching. Lui faire produire des valeurs plausibles-mais-fausses serait un mensonge silencieux — exactement le genre de défaut que ce chantier corrige par ailleurs (cf. INV-1/INV-2) |
| **Le schéma V4 reste inchangé sur le fond** | Le contrat épistémique (4 qualifications, 8 sections, `anchoring`) n'a pas bougé — seule la résolution d'entité a une variante. Un artefact V4 produit par INTEL-030 et un artefact V4 importé sont indiscernables pour tout consommateur aval (renderer, `v_ai_intelligence_summary`, etc.) |
| **`ai_intelligence_results`/`ai_intelligence_runs` restent la seule vérité stockée**, peu importe le producteur | Pas de table parallèle « artefacts externes ». Un run importé est un run comme un autre, sauf `trigger_source` et l'absence d'ids n8n |
| **INTEL-035 garde ses 5 fixes même si le canal externe finit par le remplacer** | Ce sont des bugs génériques (dates, encodage, timeout, callback d'échec, mapping RPC) — corrects indépendamment de l'avenir du workflow. Aucune raison de les défaire |

---

## 6. Pièges opérationnels découverts cette session

- **Export ChatGPT : PDF garde la bibliographie, `.md` la perd.** Le rapport `.md` ne
  contient que des marqueurs `citeturnNNsearchN` non résolus, aucune URL. Toujours
  demander/récupérer le **PDF** pour un rapport à structurer.
- **`server-only` bloque tout script Node/tsx exécuté hors webpack.** `import-external-
  account-knowledge.ts` (et tout fichier portant cette garde) ne peut pas être importé
  depuis un script `tsx` autonome — il faut appeler les fonctions sous-jacentes non
  gardées (`ingestAccountKnowledgeArtifact`, `createRun`/`saveResult`/`updateRunStatus`)
  directement, comme fait pour l'import réel de SOS Oxygène.
- **`trigger_source = 'manual_import'` n'est pas unique au canal externe.** 10 lignes
  antérieures (2026-06-27, seed historique sans rapport avec ce chantier) portent la même
  valeur. Filtrer sur `input_snapshot->>'source' = 'external_llm_import'` pour isoler les
  imports du Lot 0.8 — sinon on croit à tort que l'outil a déjà servi 11 fois.
- **`knowledge_gaps` utilise la clé `reason`, pas `gap`.** Piège rencontré en construisant
  l'artefact SOS Oxygène — corrigé dans le doc 09, mais un futur rapport structuré à la
  main peut retomber dedans.
- **`coverage.external_pages_fetched` est une clé racine obligatoire**, absente du premier
  jet du gabarit doc 09 — corrigée en place. Vérifier qu'un rapport structuré la porte
  avant de tenter l'import.
- **Le validateur n8n (`V4 Validate Artifact`) et le validateur TS
  (`validateAccountKnowledgeV4`) ne sont PAS le même contrôle.** Le premier est un miroir
  allégé embarqué dans le nœud Code, le second (appelé au callback / à l'import) est
  strictement plus exigeant. Un artefact qui passe le premier peut échouer au second —
  c'est exactement ce qui s'est produit sur `entity_resolution`. Toujours tester contre
  le second avant de conclure qu'un format est bon.

---

## 7. Prochain lot — Lot 1 : renderer V4 (demandé explicitement par Guillaume, à faire EN PREMIER)

Inchangé par rapport à `08-HANDOFF-LOT-0-CLOTURE.md` §7 — ce lot n'a pas bougé cette
session, seule son urgence a changé : il y a maintenant un **vrai artefact en base**
(SOS Oxygène, `run_id = ee94337d…`) pour le tester en vrai, pas seulement des fixtures.

**Vérifié à nouveau** : `ClientIntelligenceCompanyTab.tsx` rend V1
(`AccountKnowledgeBlocks`), V2 (`AccountKnowledgeV2Blocks`), V3 (`folio-v3/
AccountKnowledgeV3Desktop`) — **toujours rien pour V4**.

**Livrables (rappel de `08` §7, toujours valides)** :
- rendu éditorial des `narrative[]` (réutiliser les primitives FOLIO existantes de
  `folio-v3/`, **pas** de nouvelle bibliothèque de composants) ;
- badges épistémiques `Établi · Déclaré · Déduit · Hypothèse` au niveau des statements
  significatifs ;
- **bandeau d'ancrage** : `research_status` visible en tête (`nominal`/`degraded`/
  `internal_only`) ;
- disclosure `Sources` au niveau du statement — **pour un artefact du canal externe,
  `sources[]` est self-contained** (label/url/consulted_at déjà dans le JSON, pas besoin
  de joindre `intelligence_sources` comme pour V1/V2) ;
- affichage des `knowledge_gaps` de section ;
- lecteur « Rapport complet » (V4 n'a pas de `content_text` peuplé aujourd'hui — ni côté
  n8n ni côté import manuel : vérifier si c'est un manque à combler ou si la lecture
  section-par-section suffit) ;
- bouton **Vérifier** (désactivé — Lot 5).

**Test d'acceptation concret** : ouvrir `/prospection/accounts/[SOS Oxygène]` (id
`b8ad688f-1597-40b5-9c1d-d7ae7fb6808e`) et voir le rapport importé s'afficher.

**Adaptive (ADR-0006)** : écran dense → adaptive plein probable. Vérifier
`ClientIntelligenceDesktopView`/`ClientIntelligenceMobileView`.

**Design** : `cockpit_intelligence_design` puis `edito_bright_design` avant toute UI. QA
visuelle = Guillaume.

---

## 8. Après le renderer — reprendre les runs, peaufiner la méthode

C'est ce que Guillaume a demandé de faire **après** le Lot 1. Ordre de priorité suggéré :

### 8.1 — Le vrai chantier restant : la structuration répétable

**Cette session, la conversion rapport → JSON V4 a été faite à la main, deux fois, par
l'agent.** Ce n'est pas un processus que Guillaume peut reproduire seul à chaque compte.
Avant de « refaire des runs », il faut un outil : soit un prompt de structuration (une
deuxième passe LLM, rapide et bon marché, qui prend le rapport brut + sa bibliographie et
rend le JSON V4 — c'était l'idée du pipeline en 2 étapes évoqué en cours de session, jamais
construite comme artefact réutilisable), soit une iteration du doc 09 qui pousse le moteur
de recherche lui-même à rendre un JSON conforme du premier coup (tenté, partiellement
fiable — ChatGPT a plutôt rendu un rapport narratif malgré des instructions JSON strictes
la première fois sur SOS Oxygène ; à re-tester après les corrections du doc 09).

### 8.2 — Trancher le sort d'INTEL-035 / génération V4 d'INTEL-030

Les deux existent encore, importées et actives sur le VPS. Si le canal externe se confirme
sur 2-3 comptes de plus (avec l'outil de structuration du §8.1), les retirer plutôt que
maintenir deux pipelines. Si le canal externe échoue à scaler (coût, discipline JSON,
disponibilité), les 5 fixes de cette session restent un gain net à garder.

### 8.3 — Reprendre des runs sur le jeu de comptes de référence

`07-BENCHMARK-ET-GATES.md` §3 : Tournaire (fait, Gemini, jamais importé), Ciffreo Bona (cas
pauvre), un compte riche FOLIO+CRM, un compte peu documenté, un compte à Master Study
riche, un compte à activité commerciale réelle. SOS Oxygène (fait, ChatGPT, importé) peut
remplacer un des cas de ce jeu si pertinent — c'est un compte réel, pas un cas synthétique.

### 8.4 — Petites dettes à ne pas oublier

- `trigger_source` du canal externe mériterait une valeur dédiée (`external_llm_import`
  plutôt que la réutilisation ambiguë de `manual_import`, cf. §6) — cosmétique mais évite
  un piège de requête récurrent.
- Vérifier si `content_text` doit être peuplé pour V4 (lecteur « rapport complet ») ou si
  la restitution section-par-section du Lot 1 le rend inutile.
- Le script `tsx` jetable utilisé pour l'import réel de SOS Oxygène a été supprimé après
  usage (pas committé) — le banc `(dev)/account-knowledge-import` est le chemin normal
  désormais, aucun script à reconstruire.

---

## 9. Rappels opérationnels

- **Boucle de validation** : `typecheck` → `test` → `check:server-boundary` → `lint`
  (fichiers touchés) → `build`. **+ `test:n8n` dès qu'un fichier `n8n/workflows/` est
  touché** — c'était le cas cette session (`intel-035-account-source-preflight.json`),
  harnais rejoué systématiquement (63 assertions, 0 échec).
- **`.next/` périmé** → faux `TS6200`/`TS2300`. Purger avant de conclure à une régression.
- **Import/activation n8n** = manuel, par Guillaume. Le MCP n8n est bloqué en session
  agent — mais l'**API REST n8n** (`N8N_API_URL`/`N8N_API_KEY`, lecture ET écriture de
  webhooks signés HMAC) reste accessible en `curl`/script depuis une session agent : c'est
  comme ça qu'INTEL-035 a été testé en conditions réelles cette session, sans navigateur
  ni MCP.
- **Journal** : entrée Session courante à ajouter en tête de `docs/JOURNAL-SESSIONS.md` à
  la clôture de ce fil, si ce n'est pas déjà fait.
- **README du dossier** (`account_intelligence/README.md`) : la ligne « point de reprise
  courant » doit pointer vers CE fichier (`10`), pas `08`, tant que ce lot n'est pas clos.

---

## 10. Fichiers à lire en priorité pour reprendre

```
docs/FEATURES/cockpit_intelligence_features/account_intelligence/
  README.md                                ← 2 min, la carte (à mettre à jour, §9)
  02-DISTRIBUTION-DANS-KREDO.md             ← OBLIGATOIRE si pas déjà lu
  04-CONTRAT-EPISTEMIQUE-ET-SOURCES.md      ← OBLIGATOIRE (INV-1/INV-2, 4 qualifications)
  09-PROJECT-INSTRUCTIONS-LLM-EXTERNE.md    ← le gabarit du canal externe, tel quel
  08-HANDOFF-LOT-0-CLOTURE.md §7            ← spec détaillée du renderer V4 (Lot 1)

src/lib/intelligence/account-intelligence-contracts.ts   ← le contrat V4 + anchoring (inchangé)
src/lib/intelligence/entity-resolution.ts                 ← method "external_research"
src/lib/intelligence/import-external-account-knowledge.ts ← le point d'import
src/app/(dev)/account-knowledge-import/                   ← le banc pour importer un rapport

Run de référence en base : ai_intelligence_runs.id = ee94337d-211b-4fa2-aef2-19b458286a94
(SOS Oxygène, company_id = b8ad688f-1597-40b5-9c1d-d7ae7fb6808e) — à utiliser pour tester
le renderer V4 sans relancer aucun run.
```
