# 06 — Architecture technique

---

## 1. La décision structurante

> **Un point d'entrée utilisateur unique. Plusieurs moteurs internes spécialisés.**

C'est la décision la plus importante du chantier, et elle se lit dans les deux sens.

| | Décision |
|---|---|
| Un seul point d'entrée UX ? | **Oui, sans ambiguïté.** |
| Un seul workflow n8n qui absorbe scan, knowledge, veille, enjeux, secteur ? | **Non.** Ce serait recréer la fragmentation actuelle sous forme de monolithe intestable |
| Quatre niveaux ? | **Oui**, comme quatre profils cumulatifs — pas quatre contrats, tables ou workflows |
| Repartir d'un n8n vierge ? | **Non** (§6) |
| Nouvelles tables ? | **Une seule**, `account_source_documents` (`05` §6) |
| Une V5 du schéma ? | **Pas tant qu'un besoin métier n'est pas démontré irreprésentable en V4** |

`intel-030-account-knowledge` porte déjà **84 nœuds** et trois générations V2/V3/V4 cohabitantes.
Y ajouter INTEL-010, 031, 033, 034 et la Master Study le rendrait impossible à tester et
recréerait plusieurs propriétaires de la même donnée.

**Le fait que les moteurs soient distincts ne doit jamais être visible pour l'utilisateur.**

---

## 2. La carte des moteurs

| Moteur | Responsabilité | Destination canonique | Rôle dans la cible |
|---|---|---|---|
| **INTEL-035** *(nouveau)* | Constitution et récupération du corpus | `account_source_plan` + `account_source_documents` | **Préalable obligatoire à toute recherche externe** |
| **INTEL-010** | Enrichissement d'attributs objectifs + classification | `enrichment_proposals` → `companies` / `account_facts` | **Conservé.** Masqué derrière L1 |
| **INTEL-030** | Compréhension rédactionnelle et structurée | `ai_intelligence_results` | **Moteur principal L2/L3**, matière amont de L4. Devient **pur consommateur de corpus** |
| **INTEL-031** | Connaissance → enjeux structurés | `account_issues` | **Propriétaire du résultat normalisé de L4** |
| **INTEL-032** | Enjeu → offre → angle / message / persona | `commercial_strategy` | **Hors Account Intelligence** |
| **INTEL-033** | Veille périodique ciblée | `account_signals` | **Séparé**, configuration intégrée au menu |
| **INTEL-034** | Vérification indépendante | `account_signal_verification` | **Patron** de la vérification à la demande — à faire fonctionner d'abord (`04` §7) |
| **Master Study** | Connaissance sectorielle | `sector_intelligence`, `competitive_map_entries`, `value_chain_*` | **Source prioritaire de L3**, jamais recalculée par compte |
| **INTEL-020** | Connaissance → contenu commercial | `intelligence_documents` | Aval |
| **CRM** | Contacts, interactions, opportunités, missions | Tables relationnelles | **Source de premier rang**, jamais remplacée par le web |

### Le dispatcher

```
Centre de contrôle Account Intelligence
              │
              ▼
      Dispatcher applicatif
              │
   ┌──────────┴───────────┐
   │                      │
   ▼                      ▼
INTEL-035            (corpus déjà valide et frais ?)
préparation               │
du corpus                 │
   │                      │
   └──────────┬───────────┘
              ▼
     Validation utilisateur
              │
   ┌──────────┼──────────┬──────────────┐
   ▼          ▼          ▼              ▼
  L1         L2         L3             L4
INTEL-010  INTEL-030  INTEL-030      INTEL-030
+ gabarit  (company)  (ecosystem)    (deep)
déterministe          + Master Study      ↓
                        en lecture     INTEL-031
                                       → account_issues

Veille ──────────→ INTEL-033      (configuration seule dans le menu)
Vérifier ────────→ sibling INTEL-034
Stratégie ───────→ INTEL-032       (hors menu d'analyse)
```

---

## 3. « Scan rapide » et « account knowledge » : ce qui disparaît

| | Disparaît de l'UX | Disparaît de l'architecture |
|---|:-:|:-:|
| Libellé « Scan rapide » | ✅ | — |
| `intel-010-refresh-account-infos` | — | ❌ **Conservé** |
| Libellé « Account knowledge » | ✅ | — |
| Moteur INTEL-030 | — | ❌ **Conservé et étendu** |

**INTEL-010 garde une responsabilité qu'il ne faut pas recopier ailleurs :** la classification
sur les sept axes s'applique **atomiquement** via `apply_account_classification()`, parce que ses
contrôles sont inter-champs (le macro doit être le parent du segment, trois axes sont
obligatoires ensemble, la note dépend de la confiance). La dupliquer dans un gros workflow
Account Intelligence perdrait ces protections et créerait deux propriétaires du même
enrichissement CRM.

> Les anciens boutons ne sont masqués **qu'après** que leurs capacités soient accessibles depuis
> le centre de contrôle.

---

## 4. État réel du code — ce qui existe, ce qui n'existe pas

Vérifié le 10/09/2026. **Ce tableau est la garde contre l'erreur du cadrage V4, qui décrivait
`AccountKnowledgeV4Desktop` comme s'il existait alors qu'il n'a jamais été écrit.**

| Élément | État |
|---|---|
| Contrat `AccountKnowledgeContentV4` | ✅ [account-intelligence-contracts.ts:319](../../../../src/lib/intelligence/account-intelligence-contracts.ts) |
| Validateur V4 | ✅ `intelligence-validators.ts` |
| Ingest V4 | ✅ `account-knowledge-ingest.ts` |
| Chargement `accountKnowledgeV4` | ✅ `intelligence-data.ts` |
| Branche V4 dans le workflow | ✅ 18 nœuds |
| **Renderer V4** | ❌ **N'EXISTE PAS.** `ClientIntelligenceCompanyTab` rend V1 (`AccountKnowledgeBlocks`), V2 (`AccountKnowledgeV2Blocks`), V3 (`folio-v3/AccountKnowledgeV3Desktop`) |
| `includedSubjects` côté V4 | ❌ **Ignoré.** Seuls `Validate Entity`, `V3 Assemble Draft Prompt` et `V3 Merge Segments` le lisent |
| `externalResearchStatus` dans `content_json` | ❌ Présent seulement dans `contextSnapshot` du callback |
| `AccountAnalysisHub` | ✅ 326 lignes — base exploitable du futur centre de contrôle |
| Télémétrie de coût | ✅ **Fonctionnelle via `v_ai_run_costs`** — un run V4 coûte ~0,28 $, sans gap. Les colonnes rollup `ai_intelligence_runs.total_*` sont mortes **par décision** (Session 55) : le modèle de coût vit dans les vues |
| INTEL-034 | ⚠️ 1 run, `failed` |

---

## 5. Séquencement des lots

### Lot 0 — Collecte fiable et observabilité `[FONDATEUR]`

**Ne touche ni les niveaux, ni l'UI, ni le schéma de résultat.** C'est le lot sans lequel tout le
reste est décoratif.

1. **INTEL-035** (`05`) — découverte, fetch réel, extraction, cache. Le poste où un service tiers
   de récupération (Bright Data, Firecrawl, Jina Reader) change la donne : `timeout: 6000` sur
   six sites corporate français est structurellement condamné.
2. **Migration `account_source_documents`** — la seule du chantier.
3. **Sortir le fetch d'INTEL-030**, qui devient consommateur de corpus. Effet attendu : passage
   sous le plafond de 300 s.
4. **Remonter `anchoring` dans `content_json`** (`04` §2.3) et appliquer A2 : plus de publication
   `succeeded` silencieuse sur zéro page.
5. **Séparer les seaux internes des sources** — appliquer INV-1 et INV-2 (`04` §2.2).
6. **Émettre `tokensInput` / `tokensOutput` / `modelUsed` dans le callback d'INTEL-035**, pour
   qu'il soit mesurable par `v_ai_run_costs` comme l'est déjà INTEL-030. ⚠️ *Il n'y a pas de
   télémétrie à réparer — le premier jet de ce corpus se trompait, voir `07` §1.*
7. **Corriger `guardFigures`** (`04` §6).

**Gate G0 obligatoire avant le lot suivant** — voir `07` §2.

### Lot 1 — Restitution V4

Le renderer manquant, **après** que l'artefact soit fiable. Le construire avant reviendrait à
donner une autorité visuelle à un contenu non ancré.

Livrables : rendu éditorial des `narrative`, badges épistémiques, **bandeau d'ancrage**,
disclosure sources avec document et date, `knowledge_gaps`, lecteur « Rapport complet »,
bouton **Vérifier** (désactivé). Réutilisation des primitives FOLIO existantes — pas de nouvelle
bibliothèque de composants. Aucune migration.

### Lot 2 — Niveaux et recherche progressive

Modifier le **contrat de lancement**, pas le modèle de stockage. `targetLevel`,
`includedModules`, `refreshMode`, `sourcePlanResultId`, `sourcePolicy`.

⚠️ **La modularité est à construire côté V4**, pas à assainir : les 18 nœuds V4 ignorent
`includedSubjects`. Remplacer le mapping par libellés français par les identifiants canoniques
du `03` §3. Tests bout en bout démontrant que L1/L2/L3/L4 produisent **réellement quatre
périmètres distincts**.

Vue SQL de couverture (`03` §4). Toujours aucune nouvelle table.

### Lot 3 — Centre de contrôle unique

Refonte d'`AccountAnalysisHub` en `AccountIntelligenceControlCenter`, ouvert depuis un CTA
permanent du header, accessible depuis n'importe quel onglet :

> **Analyser / approfondir**
> Connaissance : L2 · mise à jour il y a 18 j
> Veille : active · hebdomadaire

Contenu : niveaux · couverture existante · périmètre · **sources (bloc INTEL-035)** · méthode ·
livrables · réglages de veille.

**La veille est intégrée au menu mais reste conceptuellement séparée** — ni un « niveau 5 », ni
un item d'analyse ponctuelle. `account_watch_settings` porte déjà niveau, cadence, collecteurs et
option de corpus sectoriel.

C'est ici seulement que « scan rapide » et « account knowledge » disparaissent du langage
produit.

### Lot 4 — Distribution et enjeux

L1 propose les faits objectifs par les mécanismes existants · L2 écrit l'artefact · L3 lit la
Master Study sans dupliquer les structures sectorielles · L4 enchaîne INTEL-031 vers
`account_issues` · le rapport complet dérive du même artefact.

**Contrôle de non-régression :** les onglets Secteur et Enjeux consomment-ils toujours leur
propriétaire canonique, ou lisent-ils une copie du JSON d'analyse ?

### Lot 5 — Vérification à la demande

D'abord **faire fonctionner INTEL-034 une fois** sur son cas d'origine (1 run, `failed`). Puis
créer le sibling pour les statements. Périmètre volontairement étroit :

```
statement → [ Vérifier ] → recherche indépendante → verdict + rationale + preuves
```

Pas de curation générale, pas de vérification automatique du document.

### Lot 6 — Bascule et nettoyage

Rejouer le benchmark sur les mêmes comptes, décider factuellement (`07` §4), puis retirer
l'ancien parcours. Les artefacts V1/V2/V3 et leurs lecteurs de compatibilité sont **conservés** :
les schémas ont été conçus pour coexister, pas pour subir des migrations rétroactives qui
falsifieraient les sources d'époque.

Si le workflow actif devient encombré par V2/V3, extraire la branche productive dans un JSON
propre — **opération de nettoyage, pas réécriture**.

---

## 6. Pourquoi pas un n8n vierge

Le greenfield obligerait à reconstruire et retester : résolution d'entité (incident Tournaire) ·
signatures HMAC · callbacks succès/échec · garde-fous SSRF · catalogue de sources · upserts
idempotents · résolution des UUID de sources · enrichissements contrôlés · règles
`alwaysOutputData` · contrats et validateurs · harnais Node · ingestion applicative · calcul de
coûts · mécanique de run.

Cette dette a déjà été payée dans INTEL-030 V2/V3/V4. Le code du nœud `V4 Fetch Selected Pages`
est d'ailleurs de bonne facture — parsing d'URL sans dépendance au constructeur global, garde
SSRF complet (IPv4 privées, `.local`, `.internal`, moteurs de recherche exclus), diagnostics de
rejet typés. **Ce n'est pas sa logique qui est en cause, c'est son emplacement et son budget
temps.**

**On repart de la branche V4.** On ne crée pas non plus tout de suite un
`intel-0xx-account-intelligence` : tant que le moteur évolue vite, ce serait un fork.

Sur le versionnement n8n : le repository reste la source de vérité, avec une circulation
contrôlée des modifications entre environnements — pas de push/pull bidirectionnel sur la même
instance.

> ⚠️ **Rappel opérationnel.** L'import et l'activation sur le VPS sont **manuels, faits par
> Guillaume**. Le MCP n8n est bloqué en session agent. Générer et patcher le JSON par script
> Python, valider `node --check` **et** l'exécution réelle via harnais Node avec mocks, puis
> `npm run n8n:status`. Toujours lire le **compteur final d'assertions** d'un harnais, jamais son
> seul code de sortie.

---

## 7. Boucle de validation

`typecheck` → `test` → `check:server-boundary` → `lint` → `build`, plus **`test:n8n` dès qu'un
fichier de `n8n/workflows/` est touché** — `vitest` n'inclut que `src/**/*.test.ts`, donc
`npm test` reste vert quand un workflow est cassé.

Rappel : ajouter une valeur à `intelligence_document_type` casse le typecheck sur 4 sites et en
exige **8** — dont le `Set REPORT_DOCUMENT_TYPES` que `tsc` ne désigne jamais et dont l'oubli est
un bug silencieux.
