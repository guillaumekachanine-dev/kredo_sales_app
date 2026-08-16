# KREDO — Handoff chantier « Gestion des sources »

**Date de référence :** 2026-08-15  
**Repo :** `guillaumekachanine-dev/kredo_sales_app`  
**Branche canonique :** `main`  
**HEAD vérifié :** `9804b11d66869625e91514b80a10f331db14a831`  
**Supabase prod :** `jvzgmhvwirsbdkjpmvla`  
**Statut global :** Lot 0 livré et aligné repo/VPS ; Lot 1 appliqué en production et validé ; **prochaine étape = Lot 2, branchement dynamique de la veille hebdomadaire sur `v_effective_watch_sources`**.

---

## 1. Intention produit

La fonctionnalité « Gestion des sources » doit transformer la veille KREDO d'une liste de flux codée en dur en un système piloté par la base :

- un **socle éditorial système** non modifiable ;
- des **sources manuelles** ajoutables par un admin ;
- des **corpus sectoriels versionnés** issus du processus MASTER-STUDY / E3 ;
- une sélection/modulation source par source ;
- une seule projection de lecture consommée par n8n ;
- à terme, une UI Desktop/Mobile et un scoring d'efficacité des sources.

Principe directeur : **on branche avant de peindre**. Le collecteur réel doit consommer la configuration avant de construire l'UI de gestion.

---

## 2. Sources d'autorité et hiérarchie documentaire

### 2.1 Canonique pour ce chantier

1. `docs/FEATURES/gestion_des_sources/PLAN-CHANTIER.md`
   - Architecture retenue, décisions C1→C9, modèle source/corpus, vue effective, séquencement Lots 0→6.
   - **Attention : son en-tête et son tableau de statut sont désormais partiellement périmés** : le Lot 1 est aujourd'hui appliqué en prod.

2. `docs/FEATURES/gestion_des_sources/HANDOFF-LOT0.md`
   - Justification et détail du round-robin, dédup douce, métriques, déplacement du workflow sous `n8n/workflows/`.
   - **Historique du Lot 0**, pas état courant : son en-tête « non déployé » est désormais faux.

3. `docs/MASTER-STUDY/README.md`
   - Source unique de gouvernance de la connaissance commerciale KREDO.
   - Définit quels anciens documents sont normatifs, archivés ou périmés.

4. `docs/MASTER-STUDY/06-ETAPE-E3-CORPUS-DE-SOURCES.md`
   - Autorité métier pour le corpus de sources : rôles, tiers, `automation_fit`, `search_domain`, `content_temporality`, `usage_scopes`, packs, provenance.

5. `docs/MASTER-STUDY/schemas/source-registry.schema.json`
   - **Contrat machine canonique** de l'entrée E3.
   - Version actuelle : `1.1`.

6. `supabase/migrations/20260814214647_077_source_management.sql`
   - Schéma effectivement appliqué en production.

7. `supabase/migrations/20260814214750_078_source_management_created_by_index.sql`
   - Index FK `source_catalog.created_by`, appliqué en prod.

8. `supabase/tests/20260814180000_source_management.assertions.sql`
   - Smoke/assertions du socle source management.
   - Le timestamp du fichier de test est historique ; il n'est pas une clé de migration.

9. `n8n/workflows/veille-hebdomadaire-kredo.json`
   - **Export actuellement aligné sur la version VPS active**, commit `9804b11d`.
   - 20 nœuds, cron `0 6 * * 1`.

10. `n8n/workflows/veille-hebdomadaire-kredo.SETUP.md`
    - Documentation d'exploitation du workflow.
    - **À actualiser pendant le Lot 2** : elle parle encore des 14 sources actives alors que 4 sont actuellement commentées faute de RSS direct.

11. `n8n/workflows/__tests__/veille-hebdomadaire-kredo.test.js`
    - Harnais structurel du round-robin et des invariants de collecte.

12. `n8n/workflows/intel-033-account-watch-refresh.SETUP.md`
    - Référence pour le futur Lot 5 : provenance éditeur, tourniquet, branches vides, fonctionnement account-watch.

### 2.2 Fixture de référence pour le futur Lot 4

- `docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/03-sources.json`
  - Corpus E3 réel, `segment_slug=seg-parfumerie-compositions-b2b`, version `1.1`.
  - Sert de recette d'import : 29 sources dans le plan de chantier ; la logique attendue doit exclure les `static` de la collecte tout en les conservant dans le corpus.

### 2.3 Documents historiques / secondaires

- Le cahier d'implémentation initial « Gestion des sources KREDO » a servi au cadrage, mais **le `PLAN-CHANTIER.md` audité contre le repo et la base live le supersède**.
- `docs/FEATURES/sector_intelligence/sources_intelligence_standards/implementation/ANALYSE-CRITIQUE-ET-ARCHITECTURE-CIBLE.md` est explicitement classé **ARCHIVE — raisonnement** par MASTER-STUDY. Ne jamais le reprendre comme vérité de schéma.
- L'ancienne documentation sectorielle V1 et les anciens référentiels pré-standard sont classés PÉRIMÉS par `docs/MASTER-STUDY/README.md`.

---

## 3. Décisions actées — ne pas les rediscuter

1. **`search_domain` est la primitive universelle de collecte.**
   - `collection_url` est une optimisation : RSS direct quand il existe.
   - Si `collection_url` est nul, la source reste collectable via recherche `site:<search_domain>`.

2. **`collection_mode` n'est pas stocké.**
   - Dérivé : `rss` si `collection_url` non vide, sinon `site_search`.

3. **`content_temporality='static'` n'entre jamais dans une veille récurrente.**
   - La source reste visible/documentaire dans le corpus.

4. **`automation_fit='manual_only'` dépriorise mais n'exclut pas.**

5. **Qualité documentaire et activation opérationnelle sont séparées.**
   - `quality_verdict` = badge documentaire.
   - `activation_state` = décision opérationnelle owner/admin.

6. **La section 2 de l'UI future reste « Sources veille sectorielle ».**
   - L'héritage vers les comptes est un effet de la relation segment/corpus, pas l'objet principal.

7. **Configuration ≠ preuve.**
   - `source_catalog` / `source_corpora` = où KREDO peut chercher.
   - `intelligence_sources` = ce qui a réellement été trouvé ; ne pas le transformer en registre éditable.

8. **Le plafond LLM reste 40 candidats.**
   - Le round-robin change la diversité, pas le coût maximal.

9. **Aucun Desktop lourd monté puis caché sur mobile.**
   - Lot 3 : shells Desktop et Mobile distincts, composants feuilles partagés.

---

## 4. État des lots

| Lot | État au 15/08/2026 | Détail |
|---|---|---|
| **0 — Débloquer le collecteur** | ✅ livré + repo/VPS alignés | Round-robin par source, dédup titre, métrique `nb_sources_actives` honnête, workflow sous `n8n/workflows/`. |
| **1 — Socle base** | ✅ **appliqué en prod** | 077 + 078, 3 tables, vue, RLS, RPC, seed 14, colonnes additives. |
| **2 — Branchement veille hebdo** | ⏭️ **PROCHAIN LOT** | Remplacer `Config Sources KREDO` par lecture de `v_effective_watch_sources`, gérer `rss` + `site_search`, provenance réelle, `source_catalog_id`. |
| **3 — UI Gérer les sources** | ⏸️ pas commencé | Launcher + Desktop dialog + Mobile drawer + CRUD/modulation. |
| **4 — Import corpus** | ⏸️ pas commencé | Parser E3 + résolution read-only + wizard + RPC. |
| **5 — INTEL-033 sectoriel** | ⏸️ pas commencé | Héritage corpus segment→macro dans veille compte + filtre administratif. |
| **6 — V2 scoring** | hors chantier actuel | Exploiter `veille_articles.source_catalog_id`. |

---

## 5. Lot 0 — état réel courant

### Ce qui est acquis

Le workflow hebdomadaire utilise déjà un tourniquet par source au lieu du `slice(0,40)` positionnel. L'invariant doit rester intact.

Le repo est désormais aligné sur l'export VPS actif : commit `9804b11d66869625e91514b80a10f331db14a831`.

### Écart entre la conception initiale et le workflow courant

Le workflow live/repo a **10 sources RSS actives dans son tableau hardcodé** et 4 sources commentées faute de RSS direct :

- The Batch (DeepLearning.AI)
- Anthropic News
- The Neuron
- a16z

Le socle Supabase, lui, contient bien les **14 sources actives** ; ces 4 sources ont `collection_url = NULL` et doivent revenir automatiquement au Lot 2 via `site_search`.

### Mesure live actuelle

Dernier digest vérifié :

- `digest_date = 2026-08-14`
- `nb_candidats_evalues = 40`
- `nb_sources_actives = 7`

Ce `7` mesure les sources réellement contributrices ; ce n'est plus la constante artificielle 14.

---

## 6. Lot 1 — état réel Supabase production

### Migrations appliquées

- `20260814214647` — `077_source_management`
- `20260814214750` — `078_source_management_created_by_index`

Les noms des fichiers GitHub ont été réalignés sur les timestamps réellement enregistrés dans `schema_migrations` au commit `86a2f5d0`.

### Objets créés

#### `source_catalog`
Registre workspace-scoped des sources collectables.

Principaux champs : `source_key`, `name`, `publisher`, `domain`, `search_domain`, `collection_url`, `homepage_url`, `family`, `kredo_category`, `origin`, `content_temporality`, `usage_scopes`, `validation_status`, `is_active`, `is_locked`, `created_by`.

#### `source_corpora`
Corpus versionné par segment avec `quality_verdict`, `activation_state`, `enabled_for_news`, `enabled_for_account_watch`, `is_current`, métadonnées et provenance documentaire.

#### `source_corpus_items`
Relation corpus/source + qualification : `pack`, `tier`, `primary_role`, `utility_score`, `automation_fit`, `familles_couvertes`, `news_eligible`, `account_watch_eligible`, `is_enabled`, `exclusion_reason`.

#### Colonnes additives

- `account_watch_settings.include_sector_corpus boolean not null default true`
- `veille_articles.source_catalog_id uuid null references source_catalog(id)`

#### Vue

`public.v_effective_watch_sources WITH (security_invoker=true)` :

- branche `news` directe ;
- branche `news` corpus ;
- branche `account_watch` corpus avec préférence segment, fallback macro, jamais les deux ;
- exclusion dure des sources `static` ;
- prise en compte `is_active`, `validation_status`, `is_current`, `is_enabled` ;
- `manual_only` dépriorisé ;
- `collection_mode` dérivé.

#### RPC

`public.ingest_source_corpus(jsonb,text,text)` :

- `SECURITY DEFINER` ;
- `search_path=''` ;
- auth + workspace admin ;
- segment `level='segment'` obligatoire ;
- idempotence corpus/source/item ;
- préservation d'une source `origin='system'` / `is_locked=true` existante.

### État live mesuré

- workspaces : **1**
- `source_catalog` : **14** lignes, toutes `origin='system'`
- `source_corpora` : **1** corpus système
- `source_corpus_items` : **14**
- `v_effective_watch_sources` / `news` : **14** sources
- `v_effective_watch_sources` / `account_watch` : **0** (normal : aucun corpus sectoriel importé/activé)
- `account_watch_settings` : **12**, toutes `include_sector_corpus=true`
- `veille_articles` : **25**
- `veille_articles.source_catalog_id IS NOT NULL` : **0** → **preuve directe que le Lot 2 n'est pas encore branché**.

### Socle source actuel

RSS direct : LeMagIT, ChannelNews, L'Usine Digitale, One Useful Thing, VentureBeat AI, OpenAI News, Journal du Net IA, ActuIA, Finextra, Premium Beauty News.

`site_search` : The Batch, Anthropic News, The Neuron, a16z.

### Advisors

Pas de nouveau défaut RLS spécifique au chantier identifié. Le Security Advisor signale `ingest_source_corpus` comme `SECURITY DEFINER` exécutable par `authenticated` : **c'est intentionnel**, la fonction réalise elle-même les contrôles auth/workspace/admin. Les autres warnings sont de baseline projet (extensions en public, autres fonctions historiques, protection mot de passe).

Le Performance Advisor marque plusieurs nouveaux indexes comme `unused_index`, ce qui est normal juste après création et avant consommation du Lot 2. Ne pas les supprimer sur cette seule base.

---

## 7. Dette / écarts documentaires à corriger

Ces écarts ne doivent pas être pris pour la réalité :

1. `PLAN-CHANTIER.md`
   - en-tête « proposition / rien écrit » devenu faux ;
   - tableau §4 doit marquer Lot 1 livré/prod et Lot 2 next.

2. `HANDOFF-LOT0.md`
   - historique correct, mais statut « NON déployé » devenu faux ;
   - ne pas réécrire l'historique : ajouter au besoin un renvoi vers ce handoff.

3. `veille-hebdomadaire-kredo.SETUP.md`
   - parle encore de 14 sources contributrices du fixture Lot 0 ;
   - la version VPS actuelle a 10 RSS chargées + 4 sans RSS commentées ;
   - le Lot 2 supprimera de toute façon ce hardcoding.

4. Test SQL
   - `supabase/tests/20260814180000_source_management.assertions.sql` porte l'ancien timestamp de travail. **Ce n'est pas un conflit de migration**, mais il faut le connaître pour éviter de tenter de le « réparer » comme une migration.

---

## 8. 🔴 Dette opérationnelle critique à traiter pendant le Lot 2

### 8.1 `Créer Digest` n'est pas idempotent

Le workflow courant fait encore :

- `POST /rest/v1/veille_digests`
- `Prefer: return=representation`

sans `on_conflict`.

Or la base impose :

`UNIQUE (workspace_id, digest_date)`.

Une seconde exécution le même jour peut donc échouer sur le digest existant. **Ne jamais DELETE la ligne pour pouvoir rejouer.**

Correctif attendu pendant le Lot 2 :

- URL `/rest/v1/veille_digests?on_conflict=workspace_id,digest_date`
- header `Prefer: resolution=merge-duplicates,return=representation`
- conserver `POST`.

Gate : deux runs manuels successifs le même jour doivent réussir et laisser **exactement une** ligne digest pour le couple `(workspace_id,digest_date)`.

### 8.2 `workspace_id` encore hardcodé dans le workflow

Le UUID est encore inscrit dans :

- `Build Contexte KREDO`
- `Créer Digest`
- `Préparer Lignes Articles`

Le Lot 2 doit arrêter cette duplication et dériver le workspace de la lecture des sources / d'une configuration unique du workflow.

### 8.3 Vue sans `workspace_id` dans sa projection

La vue est aujourd'hui sûre via RLS pour un utilisateur `authenticated`, mais n'expose pas `workspace_id`. Le workflow n8n utilise un credential `service_role`, qui bypass RLS. Le projet est actuellement mono-workspace (**1 workspace**), donc il n'y a pas de fuite réelle aujourd'hui.

**Ne pas ouvrir un chantier de refonte sans nécessité**, mais avant tout support multi-workspace il faudra exposer/scoper explicitement le workspace dans la projection ou utiliser un endpoint/RPC workspace-scoped. Pour le Lot 2 actuel, documenter ce point et ne pas introduire de second UUID hardcodé.

---

## 9. Lot 2 — objectif exact

**But :** la veille hebdomadaire ne doit plus connaître aucune source éditoriale dans son code. Elle doit lire la base et collecter les 14 sources du socle via deux modes.

### 9.1 Changements demandés

1. Remplacer `Config Sources KREDO` par une lecture Supabase de `v_effective_watch_sources` filtrée `usage_scope='news'`.
2. Trier selon `priority ASC`, puis `utility_score DESC`.
3. Mapper le contrat : `source_id`, `source_key`, `source_name`, `search_domain`, `collection_url`, `collection_mode`, `family`, `kredo_category`, `origin`, `corpus_id`.
4. Router :
   - `rss` → lecture du flux direct ;
   - `site_search` → Google News RSS `site:<search_domain>`.
5. Déballer l'éditeur réel pour Google News avant écriture : ne jamais stocker `news.google.com` comme provenance si l'éditeur réel est disponible.
6. Re-clé le round-robin sur `source_id` ; conserver le fallback actuel uniquement pour robustesse.
7. Propager `sourceCatalogId` jusqu'aux articles retenus puis écrire `veille_articles.source_catalog_id`.
8. Si la vue retourne 0 source : **échec explicite**, pas digest vide silencieux.
9. Une source en erreur doit être isolée et ne pas faire échouer les autres.
10. Supprimer le tableau des sources hardcodées et les 4 commentaires `SANS_RSS`.
11. Corriger l'idempotence de `Créer Digest` (§8.1).
12. Éliminer la duplication du workspace id (§8.2) sans modifier le modèle fonctionnel.

### 9.2 Invariants à préserver

- 20 nœuds n'est **pas** un invariant : Claude peut ajouter/router des nœuds si nécessaire.
- Le plafond **40 candidats** est un invariant.
- Pas de `slice(0,40)` positionnel.
- Round-robin par source.
- Dédup URL + dédup douce titre.
- Récence 7 jours pour la veille hebdo.
- LLM de classement/analyse inchangés sauf nécessité démontrée.
- Aucun changement UI dans ce lot.
- Aucun changement INTEL-033 dans ce lot.
- Aucun import de corpus dans ce lot.

### 9.3 Gate de sortie Lot 2

Tests structurels/repo :

- plus aucun tableau éditorial hardcodé ;
- lecture de `v_effective_watch_sources` ;
- cas `rss` et `site_search` couverts ;
- `source_catalog_id` propagé ;
- harnais n8n mis à jour ;
- `node --check` de tous les Code nodes ;
- `npm run typecheck` ;
- tests n8n ciblés ;
- pas de secret dans le diff.

Smoke test réel VPS/Supabase :

- la vue retourne **14 sources news** ;
- le workflow charge les 14 ;
- les 4 sources sans RSS direct passent par `site_search` ;
- un flux en erreur ne bloque pas le run ;
- 40 candidats max ;
- `nb_sources_actives` = contributeurs réels ;
- les nouveaux `veille_articles` ont `source_catalog_id` non nul quand la source est résolue ;
- provenance Google News = éditeur réel ;
- deux runs le même jour réussissent, un seul digest subsiste.

---

## 10. Lots suivants — ne pas anticiper

### Lot 3 — UI

À construire uniquement quand Lot 2 est validé :

- `src/features/source-management/`
- Launcher commun
- `SourceManagementDialogDesktop`
- `SourceManagementDrawerMobile`
- sources actualités IT + sources veille sectorielle
- ajout source manuelle
- activation/modulation corpus
- suppression des anciens champs morts `sourceFamilies` / `categories` dans la config globale de veille.

### Lot 4 — import corpus

- parser `source-registry.schema.json` ;
- résolution read-only ;
- wizard `Préparer → Arbitrer → Finaliser` inspiré du competitive-map ;
- appel exclusif à `ingest_source_corpus` pour l'écriture ;
- fixture parfumerie comme recette.

### Lot 5 — INTEL-033 sectoriel

- `include_sector_corpus` ;
- corpus segment, fallback macro ;
- tourniquet `sourceKey/sourceId`, pas `sourceType` ;
- filtre administratif déterministe avant LLM ;
- provenance et métadonnées `sourceCatalogId/corpusId/collectedVia`.

---

## 11. Règles d'exécution / gouvernance

- Travailler depuis `main`, mais **vérifier le HEAD et le working tree avant modification**.
- Ne jamais réutiliser un brouillon local de migration sous un timestamp déjà appliqué.
- Les migrations 077/078 sont immuables : toute correction future = nouvelle migration additive.
- Ne jamais modifier un mot de passe ou secret Supabase via un agent.
- Ne jamais exposer de service-role JWT, clé n8n ou secret HMAC dans les logs, commits ou handoffs.
- Ne pas toucher à l'UI avant Lot 3.
- Ne pas toucher à INTEL-033 avant Lot 5, hors incident de prod indépendant.
- Ne pas commit/push/importer sur VPS/déployer sans l'ordre explicite de Guillaume dans la session concernée.

---

## 12. Résumé pour reprise immédiate

Le socle est prêt. La base connaît 14 sources, dont 10 RSS et 4 `site_search`. Le workflow de production continue pourtant à utiliser son propre tableau de 10 flux RSS et aucun article historique n'est encore relié à `source_catalog`.

**La prochaine tâche n'est donc ni une nouvelle table, ni une UI : c'est supprimer le tableau `Config Sources KREDO` et faire du workflow hebdomadaire le premier consommateur réel de `v_effective_watch_sources`.**

