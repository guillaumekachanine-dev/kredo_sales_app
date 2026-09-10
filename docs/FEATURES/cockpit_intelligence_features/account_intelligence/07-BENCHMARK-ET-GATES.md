# 07 — Benchmark et gates

Ce document porte les chiffres qui autorisent — ou refusent — le passage d'un lot au suivant.
Une gate n'est pas un objectif de communication : **tant qu'elle n'est pas atteinte, le lot
suivant ne démarre pas.**

---

## 1. L'état mesuré au 10/09/2026

**Le point de référence du chantier.** Tous ces chiffres sont des relevés directs, à rejouer
avant toute décision.

### Fiabilité du moteur

| Mesure | Valeur |
|---|---|
| `intel-030` toutes versions — succès / échecs | **23 / 22** |
| Runs V4 | **12** |
| Succès V4 | **4 (33 %)** |
| `external_pages_fetched` sur les 4 succès | **0, 0, 0, 0** |
| Durées des succès V4 | **425 s · 408 s · 404 s** (+ 98 s) |
| Plafond task runner n8n | **300 s** — 2 échecs exactement là |
| INTEL-034 | **1 run, `failed`** |

Motifs d'échec V4 relevés : `Task execution timed out after 300 seconds` (×2) ·
`Réponse LLM V4 vide` · `Cannot read properties of undefined (reading 'map')` ·
`SERPER_API_KEY absente` · `aucune URL exploitable sélectionnée malgré 56 résultats découverts` ·
`11/12`.

### Ancrage — run Tournaire `a7bdbeb7`, 07/09/2026

| Mesure | Valeur |
|---|---|
| Sections rédigées | 8 / 8 |
| Longueur de `content_text` | 13 497 car. |
| Sources | **6** — 5 agrégats internes, **1** externe (`annuaire-entreprises.data.gouv.fr`) |
| Statements | 21 — `established` 4 · `declared` 10 · `inferred` 4 · `hypothesis` 3 |
| `knowledge_gaps` | 0 |
| **Ratio d'ancrage externe** | **4 / 21 = 0,19** — et sur le seul registre légal |

Défaut qualitatif visible dès la synthèse : *« un chiffre d'affaires net déclaré de **un ordre de
grandeur à confirmer** en 2023 »* (`04` §6).

### Catalogue de sources

| Mesure | Valeur |
|---|---|
| Sources | 62 |
| Jamais sondées | **58 (94 %)** |
| Sondées et **mortes** | **4 / 14 (29 %)** |
| `usage_scopes` | `study` 27 · `news` 27 · `account_watch` 7 — **aucun scope Account Intelligence** |

### Observabilité — le coût EST mesurable

| Mesure | Valeur |
|---|---|
| Runs `succeeded` avec coût calculé (`v_ai_run_costs`) | **187 / 387 (48 %)** |
| `has_tokens_gap` | 10 runs |
| `has_pricing_gap` | 2 runs |
| Coût moyen, tous types de runs | **0,049 $** |
| **Coût d'un run `intel-030` V4** | **0,278 $ · 0,280 $ · 0,283 $** — aucun gap |

> ⚠️ **Correction d'une erreur du premier jet de ce corpus.** Les colonnes
> `ai_intelligence_runs.total_cost_estimate` / `total_tokens_*` sont à zéro, mais **c'est
> volontaire** : ce sont des rollups morts, et le modèle de coût est **entièrement porté par les
> vues** `v_ai_run_costs` / `v_ai_result_costs`, alimentées par `ai_model_pricing` et les tokens
> stockés sur `ai_intelligence_results`. Décision prise et documentée dans une session antérieure
> (`docs/JOURNAL-SESSIONS.md`, Session 55).
>
> **La dimension « efficience » est donc mesurable dès aujourd'hui**, et elle l'est parfaitement
> sur le workflow qui nous intéresse : les trois runs V4 réussis ont leurs tokens, leur modèle et
> leur coût, sans aucun gap. **Il n'y a rien à réparer.** Le seul devoir du Lot 0 est que le
> nouveau workflow INTEL-035 émette lui aussi `tokensInput` / `tokensOutput` / `modelUsed` dans
> son callback, faute de quoi il apparaîtrait en `has_tokens_gap`.
>
> Les 48 % s'expliquent par les workflows qui n'envoient pas ces champs — dette réelle mais
> **hors périmètre de ce chantier**.

### Stock de connaissance disponible

`companies` 112 · `account_facts` 963 · `account_signals` 843 · `intelligence_sources` 550 ·
`intelligence_source_links` 1 397 · `enrichment_proposals` 1 334 · `account_issues` 52 ·
`account_watch_settings` 14 · `ai_intelligence_runs` 540 · `ai_intelligence_results` 350 ·
`intelligence_documents` 99 · `sector_intelligence` 53 · `competitive_map_entries` 23 ·
`account_roadmap_actions` 0.

> **Le chantier ne part pas d'une page blanche.** L'essentiel des briques existe ; le problème
> est leur assemblage et l'absence d'ancrage réel de ce qui est produit.

---

## 2. Gate G0 — sortie du Lot 0 `[BLOQUANTE]`

**Aucun niveau, aucun renderer, aucun centre de contrôle ne démarre tant que G0 n'est pas
franchie.**

| # | Critère | Cible | Mesuré le 10/09 |
|---|---|---|---|
| **G0.1** | Taux de succès `intel-030` sur 20 runs consécutifs | **≥ 80 %** | 33 % (V4) |
| **G0.2** | `external_documents_used ≥ 3` sur les runs nominaux | **≥ 90 %** | **0 %** |
| **G0.3** | Durée p95 d'un run L2 | **< 240 s** | 425 s |
| **G0.4** | `anchoring` présent dans `content_json` | **100 %** | 0 % |
| **G0.5** | Aucun run `succeeded` avec `research_status = "degraded"` non signalé | **0** | 4 / 4 |
| **G0.6** | Statements citant un agrégat interne (INV-2) | **0** | ~14 / 21 |
| **G0.7** | Runs INTEL-035 et INTEL-030 sans `has_tokens_gap` dans `v_ai_run_costs` | **100 %** | INTEL-030 ✅ · INTEL-035 n'existe pas |
| **G0.8** | Occurrences de « un ordre de grandeur à confirmer » en prose | **0** | ≥ 2 |

> **État au 11/09/2026.** G0.4, G0.6 et G0.8 sont **acquis dans le code** — `anchoring` est
> écrit dans `content_json`, un seau interne n'ancre plus rien, la prose ne porte plus de
> placeholder — et prouvés par 85 assertions du harnais V4 et 8 tests de validateur. Ils ne
> deviendront mesurables **en production** qu'après réimport du workflow sur le VPS.
>
> **G0.1, G0.2, G0.3 et G0.5 restent bloqués sur les sous-lots 0.6 et 0.7.** Tant que le
> fetch vit dans INTEL-030, ni le taux de succès, ni l'ancrage réel, ni la durée ne bougent :
> ce sont les deux sous-lots qui portent la réparation de la collecte elle-même.

---

## 3. Le jeu de comptes de référence

Six comptes, figés, rejoués à chaque gate. **Le même jeu à chaque fois** — un benchmark dont
l'échantillon bouge ne mesure rien.

| Compte | Ce qu'il teste |
|---|---|
| **Tournaire** | **Régression d'identité** — l'homonyme lyonnais de la V3 (A1). Et le cas de référence de l'ancrage |
| **Ciffreo Bona** | Le cas historiquement trop pauvre : 11 affirmations tirées d'un seul code NAF en V3 |
| Un compte **riche en FOLIO et CRM** | La cohabitation legacy / nouveau, et le risque de blanchiment FOLIO (`04` §2.2) |
| Un compte **peu documenté** | Le comportement en pénurie : produit-il des `knowledge_gaps` honnêtes ou du remplissage ? |
| Un compte **à Master Study riche** | La réutilisation sectorielle (A7) : L3 doit être quasi gratuit |
| Un compte **à activité commerciale réelle** | F6/K7 : missions, opportunités, contacts IT. Le compte ne doit rien « redécouvrir » |

---

## 4. Les sept dimensions de notation

| Dimension | Ce qu'on mesure | Comment |
|---|---|---|
| **Exactitude d'entité** | Étudie-t-on la bonne personne morale ? | SIREN attendu vs obtenu. **Binaire, éliminatoire** |
| **Ancrage** | Les affirmations reposent-elles sur du lu ? | `anchoring_ratio`, `external_documents_used` |
| **Couverture utile** | A-t-on appris ce qu'un commercial doit savoir à ce niveau ? | Modules du `03` §3 couverts / attendus |
| **Qualité épistémique** | Faits, déclarations, inférences et hypothèses sont-ils bien distingués ? | Revue humaine, échantillon de 10 statements |
| **Qualité rédactionnelle** | Lisible, compact, comparable à FOLIO ? | Revue humaine |
| **Ré-employabilité** | Combien d'informations sont exploitables ailleurs ? | Faits proposés, enjeux matérialisés |
| **Efficience** | Pages lues, tokens, coût, durée, répétitions | Télémétrie (Lot 0) |

> **On ne définit surtout pas un KPI du type « 100 % des claims doivent être vérifiés ».** Ce
> serait réintroduire exactement le travers qui a tué la V3.
>
> Symétriquement, **l'ancrage n'est pas non plus un objectif de maximisation**. Un rapport dont
> tous les statements seraient `established` sur des sources externes serait un rapport qui
> n'aurait rien compris : la valeur du LLM est dans l'inférence assumée (`04` §3.3).
> **On mesure l'ancrage des `established` et `declared`, pas celui de l'ensemble.**

---

## 5. Gates de bascule — sortie du Lot 6

Questions factuelles, réponses mesurées :

| Question | Critère |
|---|---|
| L1 est-il fiable et économique ? | ≥ 95 % de succès, **0 appel LLM** sur compte bien renseigné, < 30 s |
| L2 dépasse-t-il FOLIO en utilité sans perdre en concision ? | Revue humaine sur les 6 comptes, préférence ≥ 4/6 |
| L3 réutilise-t-il réellement la connaissance sectorielle ? | **0 recherche externe** sur un compte à Master Study documentée |
| L4 alimente-t-il INTEL-032 ? | ≥ 3 `account_issues` exploitables par compte |
| Les inférences sont-elles utiles sans être trompeuses ? | Revue humaine : aucune inférence prise pour un fait par un lecteur naïf |
| **Le rapport est-il bon au point qu'un BD le lise avant un rendez-vous ?** | **Le seul test qui compte vraiment** (`00` §1) |

---

## 6. Journal des lots

| Lot | État | Gate | Commit |
|---|---|---|---|
| Corpus documentaire | ✅ Livré le 10/09/2026 | — | `b5ccdf47` |
| **Lot 0 — Collecte fiable** | 🟡 **5 sous-lots sur 7** | G0 | voir ci-dessous |
| ↳ 0.1 migration `account_source_documents` | ✅ | — | `19cadaf0` |
| ↳ 0.2 contrats ancrage / modules / SourcePlan | ✅ | — | `8c1f4453` |
| ↳ 0.3 `anchoring` + INV-1/INV-2 + `guardFigures` | ✅ | — | `fe0597e5` |
| ↳ 0.4 portail d'ingestion du plan | ✅ | — | `74b146ec` |
| ↳ 0.5 câblage callback `account_source_plan` | ✅ | — | `afdc976f` |
| ↳ 0.6 **workflow INTEL-035** | ⬜ **reste à faire** | — | |
| ↳ 0.7 **sortie du fetch hors d'INTEL-030** | ⬜ **reste à faire** (dépend de 0.6) | — | |
| Lot 1 — Restitution V4 | ⬜ Bloqué par G0 | | |
| Lot 2 — Niveaux | ⬜ | | |
| Lot 3 — Centre de contrôle | ⬜ | | |
| Lot 4 — Distribution et enjeux | ⬜ | | |
| Lot 5 — Vérification | ⬜ | | |
| Lot 6 — Bascule | ⬜ | §5 | |

---

## 7. Les requêtes de contrôle

À rejouer telles quelles pour actualiser le §1.

```sql
-- Fiabilité et durée par version
select input_snapshot->>'accountKnowledgeSchemaVersion' as sv, status, count(*),
       round(avg(extract(epoch from (coalesce(completed_at,failed_at)-started_at)))) as avg_sec
from ai_intelligence_runs
where run_type = 'intel-030-account-knowledge'
group by 1,2 order by 1,2;

-- Ancrage réel des artefacts V4
select r.id, r.created_at::date,
       r.content_json->'coverage'->>'external_pages_fetched' as pages,
       jsonb_array_length(r.content_json->'sources') as n_sources,
       r.content_json->'coverage'->'statements_by_qualification' as qualif
from ai_intelligence_results r
where r.content_json->>'schema_version' = '4'
order by r.created_at desc;

-- Sources citées : combien portent une URL réelle ?
select r.id, jsonb_path_query_array(r.content_json, '$.sources[*].url') as urls
from ai_intelligence_results r
where r.content_json->>'schema_version' = '4';

-- Santé du catalogue de sources
select origin::text, validation_status, count(*),
       count(*) filter (where last_verified_at is not null) as verified
from source_catalog group by 1,2 order by 3 desc;

-- Coût réel : TOUJOURS via la vue, jamais via les colonnes rollup (mortes par décision)
select run_type, count(*),
       count(*) filter (where cost_estimate is not null) as with_cost,
       count(*) filter (where has_tokens_gap) as tokens_gap,
       round(sum(cost_estimate)::numeric, 4) as cost_usd
from v_ai_run_costs where status = 'succeeded' group by 1 order by 2 desc;
```
