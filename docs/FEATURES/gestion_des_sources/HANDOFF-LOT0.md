# Handoff — Lot 0 « Débloquer le collecteur »

**Chantier :** Gestion des sources · **Lot :** 0 / 6 · **Date :** 2026-08-14
**Statut :** ✅ **livré en repo, NON déployé.** Rien n'est commité, poussé, ni importé sur le VPS n8n.
**Amont :** `PLAN-CHANTIER.md` (§2.2 C1, §4) — les 5 arbitrages ont été validés par Guillaume le 2026-08-14.
**Aval immédiat :** Lot 1 — socle base (3 tables + vue + RLS + seed). Voir §7.

---

## 1. Pourquoi ce lot existait

La feature « Gestion des sources » a pour promesse : *ajouter une source, et qu'elle soit
réellement consultée*. Cette promesse était **techniquement impossible à tenir** avant ce lot.

Le nœud `Dédup + Filtre Récence + Préfiltre Qualité` de la veille hebdomadaire plafonnait la
collecte par un `slice(0, 40)` appliqué à une liste **ordonnée par la boucle sur les sources**.
Un plafond positionnel, donc.

**Preuve en base** (`veille_digests`, 2026-08-14) :

| digest | `nb_sources_actives` | `nb_candidats_evalues` |
|---|---|---|
| 2026-08-10 | 14 | **40** |
| 2026-08-03 | 14 | **40** |
| 2026-07-13 | 14 | **40** |
| 2026-07-07 | 14 | **40** |

4 runs sur 4 exactement au plafond ⇒ **saturé**. Les dernières sources du tableau ne
contribuaient déjà rien, et toute source ajoutée produisait **exactement zéro** candidat
supplémentaire — sans erreur, sans log, sans trace. Corroboration : sur 20 articles retenus toutes
périodes confondues, **5 sources distinctes seulement** apparaissent ; LeMagIT, source n°1 du
tableau, n'apparaît jamais.

**Contre-épreuve exécutée** — l'ancien nœud (récupéré via `git show HEAD:…`) rejoué sur une
collecte réaliste de 14 sources × 20 articles :

```
candidats : 40
sources contributrices : 2 / 14
sources muettes : L'Usine Digitale · The Batch · One Useful Thing · VentureBeat AI ·
                  Anthropic News · OpenAI News · The Neuron · a16z · Journal du Net — IA ·
                  ActuIA · Finextra · Premium Beauty News
dernière source du tableau présente : false
```

Le nouveau code, **même fixture** : `40 candidats · 14 / 14 sources · répartition à ±1 article`.

---

## 2. Ce qui a été modifié

### 2.1 Inventaire exact

| Fichier | Nature |
|---|---|
| `n8n/veille_ia/veille-hebdomadaire-kredo.json` → `n8n/workflows/veille-hebdomadaire-kredo.json` | **`git mv`** + 2 lignes modifiées |
| `n8n/workflows/veille-hebdomadaire-kredo.SETUP.md` | **créé** |
| `n8n/workflows/__tests__/veille-hebdomadaire-kredo.test.js` | **créé** — 29 assertions |
| `docs/FEATURES/gestion_des_sources/PLAN-CHANTIER.md` | créé (plan validé) puis §4 mis à jour |
| `docs/FEATURES/gestion_des_sources/HANDOFF-LOT0.md` | ce fichier |

Le dossier `n8n/veille_ia/` est supprimé (il ne contenait que ce workflow).

`git diff HEAD -- n8n/` ⇒ **3 insertions, 3 suppressions** : la ligne `jsCode` du nœud de dédup,
la ligne `jsonBody` de `Créer Digest`, et le saut de ligne final. Aucun reformatage parasite,
aucun autre nœud touché, aucune connexion modifiée, `id`/`position`/`typeVersion` intacts.

**Aucun fichier de `src/` n'est touché. Aucune migration. Aucun changement de schéma.**

### 2.2 Modification 1 — le tourniquet *(nœud `Dédup + Filtre Récence + Préfiltre Qualité`)*

`slice(0, 40)` positionnel → **une file par source, triée par fraîcheur décroissante, servie à
tour de rôle jusqu'à 40**. Même correctif que `Normalize & Dedup Items` d'INTEL-033, mais **clé
par source** et non par famille.

> ⚠️ La nuance compte : INTEL-033 clé son tourniquet sur `sourceType` (4 files). Un corpus
> sectoriel de 12 domaines tomberait intégralement dans la file `news_media` et y subirait le
> **même** écrasement positionnel. **Le Lot 5 devra re-clé INTEL-033 sur `sourceKey`.**

La clé est `a.sourceId || a.sourceName || 'source_inconnue'` : `sourceId` n'existe pas encore, il
arrivera avec la vue au Lot 2 et le code le prendra alors sans modification.

**Le plafond reste 40. Le coût LLM ne bouge pas** — le tourniquet change *quels* 40, pas *combien*.

### 2.3 Modification 2 — dédup douce sur titre *(même nœud)*

Ajoutée délibérément, comme conséquence directe de la première : avec 14 sources qui contribuent
réellement, une même dépêche reprise par trois éditeurs consommerait trois places sur quarante.
Le problème était invisible tant que 2-3 sources se partageaient tout.

Comparaison sur **titre exact normalisé** (minuscules, `NFD` + retrait des diacritiques,
ponctuation → espace). Deux angles différents sur le même fait restent deux candidats distincts.
Motif et justification repris littéralement d'INTEL-033.

### 2.4 Modification 3 — `nb_sources_actives` honnête *(nœud `Créer Digest`)*

```diff
- nb_sources_actives: $('Config Sources KREDO').first().json.sources.length
+ nb_sources_actives: $('Dédup + Filtre Récence + Préfiltre Qualité').first().json.sourcesContributrices
```

L'ancienne expression valait **la constante 14**, en toutes circonstances — y compris quand deux
sources fournissaient les quarante candidats. C'est précisément la métrique qui aurait fait passer
la recette du Lot 2 au vert (« 15 sources chargées ») pendant que la collecte réelle ne bougeait
pas. Elle mesure désormais les sources ayant **réellement** placé au moins un candidat.

> 🔎 **À anticiper : le premier run affichera un chiffre plus bas qu'aujourd'hui.** La modale
> « Actualiser la veille » lit `latestDigest.nb_sources_actives` sous le libellé « Sources
> actives ». Ce n'est **pas** une régression : c'est la première mesure honnête. Historiquement
> ce champ vaut 14 sur les 4 digests existants ; la valeur réelle était de l'ordre de 2 à 5.

Métriques additionnelles exposées sur chaque item du nœud, non encore consommées :
`sourcesChargees`, `sourcesEnErreur`, `candidatsAvantPlafond`.

### 2.5 Modification 4 — le workflow entre sous surveillance

Il vivait sous `n8n/veille_ia/`, que `scripts/n8n-status.mjs` ne lit pas (`WORKFLOWS_DIR =
n8n/workflows`). Sa dérive repo ↔ VPS n'avait **jamais** été mesurée. Après `git mv`, il est
apparié :

```
veille-hebdomadaire-kredo.json  (match par name (pas de webhook — cron, best-effort))
  -> 2 copies sur le VPS (1 active(s)) — clutter à nettoyer
  -> référence: id=nVgAbHYvMplbLxAW active=true nœuds repo/VPS=20/20
```

---

## 3. Ce qui a été délibérément laissé de côté

| Élément | Motif |
|---|---|
| **Déballage de la provenance** (`<source url>` de Google News) | Annoncé au Lot 0 dans le plan initial, **déplacé au Lot 2** après vérification : les 14 flux actuels sont des flux d'éditeur direct, et les 20 URLs stockées en base sont toutes des URLs d'éditeur. Aucun Google News dans ce workflow aujourd'hui. Le déballage devient nécessaire au moment exact où la branche `site_search` apparaît — l'écrire maintenant serait du code mort non testable. Le plan a été corrigé en conséquence (§3.4) |
| Remplacement des 14 sources en dur | C'est le Lot 2, par construction : le Lot 0 ne devait toucher ni base ni UI |
| `workspace_id` en dur (`98dcd39d-…`) dans `Créer Digest` et `Préparer Lignes Articles` | Dette réelle, mono-workspace aujourd'hui, sans effet. À traiter avec le Lot 2 |
| `Récupérer Secteurs Actifs` charge les 53 fiches (macros **et** segments) sans filtre, concaténées dans le prompt | Bruit non mesuré, hors périmètre |
| Relever le plafond de 40 | Arbitrage coût, à ne pas prendre à la légère. Le tourniquet le rend d'ailleurs beaucoup moins nécessaire |

---

## 4. Validation — résultats réels

```
npm run typecheck            ✅ (aucune sortie — rien dans src/ n'est touché)
npm test                     ✅ 121 fichiers · 1222 tests · 0 échec
npm run check:server-boundary ✅ tous les modules portent la garde server-only
npx eslint <fichier de test>  ✅ aucune sortie
npm run build                ✅ compilé, 0 erreur
npm run n8n:status           ✅ 18 workflows · 0 absent · 0 écart de nœuds
node n8n/workflows/__tests__/veille-hebdomadaire-kredo.test.js   ✅ 29 ok · 0 échec
node --check sur les 11 nœuds Code du workflow                   ✅ 11/11
```

Le harnais couvre : structure (le `slice` positionnel ne peut pas revenir, le plafond reste 40),
tourniquet (40 candidats, 14/14 sources, dernière source présente, répartition ±1), régressions
(récence 7 j, article sans date conservé, titre ≤ 10 car. écarté, dédup par `url_hash`), dédup
douce (3 éditeurs ⇒ 1 place ; 2 angles ⇒ 2 candidats), flux en erreur (collecte poursuivie, item
`{skipped:true}` jamais candidat, comptage), métriques, contrat de sortie **réellement consommé
par `Construire Prompt Classement`**, cas limites (collecte vide, source unique, moins de 40
candidats — pas de boucle infinie).

### ⚠️ Deux échecs préexistants, sans rapport avec ce lot

`intel-020-communication.test.js` et `intel-040-workspace-diagnostic.test.js` plantent sur
`ReferenceError: $execution is not defined` — un bug de **harnais** (sandbox incomplet), pas de
workflow. `git status` confirme que ces 4 fichiers sont intacts. Correctif d'une ligne chacun,
posé en tâche séparée. **Ne pas les attribuer à ce lot.**

Ces harnais **ne sont pas couverts par `npm test`** (vitest n'inclut que `src/**/*.test.ts`).
Un script `npm run test:n8n` est recommandé une fois les deux réparés — il ne pouvait pas être
ajouté ici sans arriver rouge.

---

## 5. Ce qu'il reste à faire pour que ce lot produise son effet

**Le repo est à jour ; le VPS ne l'est pas.** Tant que le workflow n'est pas réimporté, la veille
tourne avec l'ancien code et rien ne change.

> 🔴 **`npm run n8n:status` ne verra JAMAIS cette dérive.** Il compare les *compteurs de nœuds* —
> 20/20 avant comme après, puisque seul du code interne a changé. C'est le piège documenté dans
> CLAUDE.md (« Workflows n8n patchés non réimportés »). Le statut vert ci-dessus signifie
> « apparié », pas « à jour ».

Protocole d'application, quand tu le décides :

1. Importer `n8n/workflows/veille-hebdomadaire-kredo.json` sur le VPS, **sur la copie active
   `id=nVgAbHYvMplbLxAW`** (le VPS porte 2 copies, 1 seule active — l'autre est du clutter).
2. Réassocier les credentials (`supabaseApi` sur 4 nœuds, Anthropic sur 2).
3. Déclencher un run manuel depuis `/veille` → « Actualiser ».
4. Contrôler en base :

```sql
select digest_date, nb_sources_actives, nb_candidats_evalues
from veille_digests order by digest_date desc limit 1;
-- attendu : nb_candidats_evalues = 40, nb_sources_actives NETTEMENT > 5 (cible ≥ 10)

select source_name, count(*) from veille_articles
where digest_id = (select id from veille_digests order by digest_date desc limit 1)
group by 1 order by 2 desc;
-- attendu : plus de diversité éditoriale qu'aujourd'hui (5 sources sur 4 digests)
```

**Critère de succès du Lot 0 : ≥ 10 des 14 sources contribuent au moins un candidat.**
Aujourd'hui : 2 (mesuré en contre-épreuve).

Si le chiffre reste bas, ce n'est pas le tourniquet : ce sont des flux RSS réellement en erreur
ou vides. `sourcesEnErreur` et `sourcesChargees` sont là pour le distinguer — ils sont dans la
sortie du nœud, lisibles dans l'exécution n8n.

---

## 6. Décisions actées à ne pas rejouer

Validées par Guillaume le 2026-08-14, elles engagent toute la suite du chantier :

1. **`search_domain` est la primitive de collecte, pas `collection_url`.** Ce dernier est nullable
   et hétérogène ; `search_domain` est obligatoire sur chaque source du schéma E3. Une source sans
   flux devient une requête Google News `site:<search_domain>`. Mesuré : fait passer le corpus
   parfumerie de **2 à 21 sources utilisables sur 29**.
2. **`automation_fit = 'manual_only'` déprioris, n'exclut pas.** Ce champ qualifie la légalité
   d'une aspiration industrielle, pas la possibilité d'une recherche.
3. **Verdict G1 et activation opérationnelle sont découplés.** `quality_verdict` (calculé par
   `scripts/audit-master-study.py`, hors contexte producteur) est **documentaire** — badge, il
   n'active ni ne bloque rien. `activation_state` est piloté par owner/admin. Sans ce découplage,
   aucun corpus existant ne pourrait jamais être activé (le corpus parfumerie porte
   `"requetes": 0` et n'a pas de `03-journal.md` : il ne passera jamais `production_ready`).
4. **Le collecteur d'abord, l'UI en Lot 3.** E3 §6 précaution 3 : « On branche avant de peindre. »
5. **La section 2 de la modale reste sectorielle**, pas « comptes ». Guillaume envisage une
   section « compte » distincte **plus tard** — à ne pas anticiper dans le modèle, mais
   `v_effective_watch_sources` porte déjà `usage_scope='account_watch'` avec `company_id`, ce qui
   la rend possible sans refonte.

Trois affirmations du rapport ChatGPT ont été **vérifiées fausses** et ne doivent pas ressurgir :
`ai_intelligence_results.company_id` est **nullable** (pas NOT NULL) ; `intelligence_sources`
compte **478** lignes (pas 167) ; le « référentiel Électronique B2B » à réparer **n'existe pas
dans le repo** et tout le corpus pré-standard est classé PÉRIMÉ par `MASTER-STUDY/README.md` §5.3.

---

## 7. Entrée du Lot 1

**Objectif unique :** créer la migration Supabase et ses assertions. Ni UI, ni n8n, **et aucune
application live**.

À lire, dans cet ordre : `PLAN-CHANTIER.md` §3 (modèle retenu) → ce handoff §6 (décisions actées)
→ `docs/MASTER-STUDY/06-ETAPE-E3-CORPUS-DE-SOURCES.md` §6 et §8 → le schéma live via
`information_schema` (**jamais** le tableau de CLAUDE.md, qui dérive).

À produire :
- `source_catalog`, `source_corpora`, `source_corpus_items` — workspace-scoped, `DEFAULT
  private.current_workspace_id()`, RLS 4 policies avec `is_workspace_admin()` en écriture et
  `origin <> 'system'` / `scope_kind <> 'system'`, triggers `set_updated_at`.
- `account_watch_settings.include_sector_corpus boolean not null default true`.
- `veille_articles.source_catalog_id uuid null references source_catalog(id) on delete set null`
  — **le crochet du scoring V2**, gratuit maintenant, coûteux plus tard.
- Vue `v_effective_watch_sources` `with (security_invoker = true)` — **sans filtre sur
  `collection_mode`** (décision 1), `content_temporality <> 'static'` en dur.
- RPC `ingest_source_corpus(p_payload jsonb, p_segment_slug text, p_reason text)`, `SECURITY
  DEFINER`, `search_path = ''`. Modèle à copier : `public.ingest_competitive_map_batch` (migration
  074) et son appelant `src/features/competitive-map/actions/ingest-competitive-map.ts`.
- Seed idempotent des 14 sources depuis le nœud `Config Sources KREDO` (noms, RSS, familles,
  catégories exacts — table en annexe du `PLAN-CHANTIER.md`), corpus système « Socle des sources
  éditoriales », `is_locked = true`, **`workspace_id` résolu par `SELECT` sur `workspaces`, jamais
  d'UUID en dur**.
- `supabase/tests/<version>_source_management.assertions.sql`.
- `npm run db:types`.

Pièges du repo à ne pas redécouvrir :
- Les fonctions `current_workspace_id()` / `is_workspace_admin()` sont dans le schéma **`private`**,
  donc **non appelables en `.rpc()` depuis le front**.
- Aligner le nom du fichier de migration sur le timestamp **réellement enregistré** dans
  `schema_migrations` (piège rencontré 3 fois).
- La base porte **159 versions en prod pour 158 fichiers en repo** — réconcilier avant tout
  `db reset` / `migration list`.
- `content_temporality` suit le vocabulaire E3 `static | periodic | continuous`. Le rapport
  ChatGPT proposait `static | event | mixed` : **vocabulaire inventé, à ne pas reprendre.**

Gate de sortie du Lot 1 : assertions SQL vertes, advisors Supabase sécurité + performance,
isolation inter-workspace prouvée, `db:types` + `typecheck` verts. **Aucune application live,
aucun commit, aucun import n8n sans ordre explicite de Guillaume.**
