# 12 — HANDOFF LOT 1 : Import ChatGPT Work — Contrats & Adapter Canonique

## 1. Contrats Work constatés

L'analyse intégrale des fixtures de référence (`arkopharma_account_intelligence.json` et `arkopharma_source_corpus.json`) a établi les structures réelles produites par ChatGPT Work :

### A. Account Intelligence JSON (`schema_version: 4`)
- **`entity_resolution`** : objet de résolution d'identité juridique (`decision`, `method`, `legal_name`, `siren`, `naf_code`, `hq_location`, `reasons`).
- **`sections`** : 8 sections d'affaires (`synthesis`, `identity`, `business_and_offering`, `customers_and_market`, `competition_and_positioning`, `value_chain_and_dependencies`, `history_ambitions_and_news`, `implications_for_kredo`).
- **`narrative`** : prose verbatim découpée en paragraphes clairs, sans balisage Markdown lourd.
- **`statements`** : affirmations atomiques qualifiées (`established`, `declared`, `inferred`, `hypothesis`), avec indice de confiance `confidence` (0 à 1) et pointeurs `source_refs` (ex: `["src-03", "src-05"]`).
- **`sources`** : liste des documents cités (`id`, `label`, `source_type`, `url`, `consulted_at`).
- **`knowledge_gaps`** : lacunes de connaissance typées (`section_key`, `gap`).
- **`generated_at`** : horodatage ISO de production.

### B. Source Corpus JSON (`schema_version: 1`)
- **`corpus`** : métadonnées de cadrage (`name`, `account_name`, `scope`, `geography`, `generated_at`).
- **`sources`** : catalogue d'autorités/domaines (16 autorités pour Arkopharma). Chaque autorité regroupe ses attributs (`name`, `domain`, `publisher`, `source_type`, `description`, `information_types`, `primary_language`, `primary_geography`, `confidence`) et contient la liste `documents_used`.
- **`documents_used`** : ensemble exhaustif des documents réellement utilisés (27 documents pour Arkopharma), portant `source_ref` (`src-01` à `src-27`), `title`, `url`, `published_at`, `consulted_at`, `used_in_sections`.

---

## 2. Fichiers créés et modifiés

### Modifiés :
- [`src/features/account-research-studies/domain/study-contracts.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/domain/study-contracts.ts) :
  - Support de `STUDY_PRODUCER_WORK = "chatgpt_work"` au sein de l'union `StudyProducer`.
  - Conservation de `STUDY_PRODUCER = "chatgpt_deep_research"` pour non-régression absolue du pipeline PDF.
- [`src/features/account-research-studies/domain/validate-study-knowledge.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/domain/validate-study-knowledge.ts) :
  - Validation explicite que `study.producer` appartient aux producteurs autorisés (`STUDY_PRODUCERS`).

### Créés :
- [`src/features/account-research-studies/domain/work-study-contracts.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/domain/work-study-contracts.ts) : Contrats d'entrée TypeScript stricts pour les livrables Work.
- [`src/features/account-research-studies/domain/work-study-parser.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/domain/work-study-parser.ts) : Parseurs défensifs purs (`parseWorkAccountIntelligence`, `parseWorkSourceCorpus`) et validation croisée de bundle (`validateWorkStudyBundle`).
- [`src/features/account-research-studies/domain/work-study-adapter.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/domain/work-study-adapter.ts) : Projection textuelle verbatim, adaptation vers `AccountStudyKnowledge` canonique et génération du registre E3 de compte.
- [`src/features/account-research-studies/fixtures/work/`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/fixtures/work/) : Fixtures de référence (`arkopharma_account_intelligence.json`, `arkopharma_source_corpus.json`, `index.ts`).
- [`src/features/account-research-studies/domain/work-study-pipeline.test.ts`](file:///Users/dosta/Developer/kredo_sales_app/src/features/account-research-studies/domain/work-study-pipeline.test.ts) : 18 tests unitaires couvrant parsing, erreurs, validation croisée, projection d'intégrité et adaptation canonique.

---

## 3. Mapping Work → `AccountStudyKnowledge`

| Entité Work | Champ Kredo canonique | Règle de transformation / Préservation |
|---|---|---|
| `entity_resolution` | `knowledge.entity` | `legal_name`, `siren`, `naf_code`, `headquarters` (depuis `hq_location`). |
| `sections[].narrative` | `knowledge.blocks` | 1er bloc de section = `# Titre` (`heading`), puis chaque paragraphe = `paragraph` verbatim. Découpage stable `B0001`… |
| `sections[].statements` | `knowledge.statements` | Texte, `qualification`, `confidence`, `source_refs` préservés verbatim. Identifiant `S0001`… Association lexicale déterministe aux `block_ids` de la section. |
| `knowledge_gaps` | `knowledge.gaps` | `section_key` mappé sur les sections canoniques, `gap` mappé sur `reason`. |
| `sources[].documents_used` | `knowledge.sources` | Chaque document devient une `StudySource` portant `id: doc.source_ref`, `authority_id: SRC-XXX`, `url`, `normalized_url`, `domain`, `label: doc.title`, `publisher: auth.publisher`. |
| Projection textuelle | `rawContent` & `coverage.text` | `rawContent` formé des blocs narrative verbatim. Invariant vérifié par `checkBlocksIntegrity(rawContent, blocks)` : `identical: true`. |
| Bundle Work | `coverage` & `anchoring` | Métriques de couverture complètes, décompte par section et par qualification, ancrage `sources_cited`, `statements_sourced`. |

---

## 4. Mapping Source Corpus → Registre Kredo

- **Portée** : `meta.corpus_scope = "account"`, `meta.corpus_slug = "sources-compte-<nom>-<hash>"`.
- **Cardinalité** : **1 entrée par autorité / domaine** (`SRC-001` à `SRC-016`), chacune intégrant la liste de ses pages dans `documents`.
- **Statut d'importabilité (§9)** :
  Le livrable ChatGPT Work ne fournissant pas les critères E3 (`tier`, `utility_score_detail`, `primary_role`, `automation_fit`, `content_temporality`, `pack`), **aucune valeur arbitraire n'a été injectée**.
  Le registre de compte est généré avec l'ensemble des données disponibles, mais `registry.importable` est évalué à `false` via `parseSourceRegistryOutput()`, et les champs E3 manquants sont explicitement énumérés dans `coverage.registry.errors`.
  Si des qualifications E3 complètes sont fournies en paramètre d'adaptation, le registre devient immédiatement `importable: true`.

---

## 5. Invariants testés

1. **Absence de perte prose** : chaque caractère de narrative est présent dans les blocs dans son ordre exact (`checkBlocksIntegrity().identical === true`).
2. **Cardinalité stricte** : 27 documents pour 16 autorités. Deux documents d'un même domaine (ex: `pappers.fr`) partagent la même `authority_id` sans dédoublement.
3. **Résolution totale des citations** : 100% des `source_refs` des statements sont résolues vers un document valide du corpus.
4. **Validation du read model** : `validateStudyKnowledge()` valide avec succès l'objet `knowledge` produit pour le producteur `chatgpt_work`.
5. **Non-régression PDF** : l'ensemble des tests du pipeline PDF (`study-pipeline.test.ts`) et la suite globale de tests restent 100% verts.

---

## 6. Limites restantes

- L'interface utilisateur de téléversement/import n'est pas encore créée (périmètre strict du Lot 2).
- Les tables Supabase n'ont pas encore été modifiées (aucun changement DDL dans ce lot).
- Sans passe de qualification E3 additionnelle, le registre de compte généré depuis Work reste `importable: false`.

---

## 7. Champs Work non distribués / conservés en provenance

- `entity_resolution.reasons` : justification textuelle de la sélection d'entité légale par Work (tracé dans `unexploitedFields`).
- `entity_resolution.method` et `decision` : métadonnées de matching de Work.
- `source_corpus.sources[].information_types`, `primary_language`, `primary_geography`, `confidence` : conservés dans les propriétés étendues de chaque autorité du registre.

---

## 8. Modifications DB nécessaires au Lot 2 (NON APPLIQUÉES)

1. **Contrainte CHECK sur `public.account_research_studies.producer`** :
   ```sql
   ALTER TABLE public.account_research_studies
     DROP CONSTRAINT IF EXISTS account_research_studies_producer_check;
   ALTER TABLE public.account_research_studies
     ADD CONSTRAINT account_research_studies_producer_check
     CHECK (producer IN ('chatgpt_deep_research', 'chatgpt_work'));
   ```
2. **Stockage des fichiers originaux (Storage & Colonnes)** :
   Pour Work, l'import comporte 2 fichiers JSON (`original_account_intelligence.json` et `original_source_corpus.json`). Il faudra prévoir soit :
   - `original_file_path` pointant vers un préfixe/dossier de bundle ou l'Account Intelligence JSON, et une colonne / métadonnée pour le Source Corpus JSON.
   - ou deux colonnes dédiées dans `account_research_studies`.
3. **Contrainte `published_ready`** :
   Si le registre E3 reste non qualifié (`importable = false`), arbitrer si l'étude Work peut être publiée pour lecture seule dans l'UI sans alimenter la gestion de sources, ou si une passe de qualification E3 simplifiée doit intervenir avant publication.

---

## 9. Point de reprise exact pour le Lot 2

Le Lot 2 pourra directement importer et appeler :
```ts
import { parseWorkAccountIntelligence, parseWorkSourceCorpus, validateWorkStudyBundle } from "@/features/account-research-studies/domain/work-study-parser"
import { adaptWorkStudyToKnowledge } from "@/features/account-research-studies/domain/work-study-adapter"
```
Pour câbler :
1. Le sélecteur de format (PDF vs ChatGPT Work 2 JSON) dans `AccountStudyImportDialog`.
2. L'upload Storage des deux fichiers JSON.
3. L'appel à `adaptWorkStudyToKnowledge()` dans la Server Action d'import.
4. La persistance dans `account_research_studies` (`producer: 'chatgpt_work'`, `knowledge_json`, `sources_registry_json`, `coverage`).
