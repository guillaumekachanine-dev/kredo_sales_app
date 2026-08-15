# Veille hebdomadaire IA & Marché — SETUP

**Workflow n8n :** `KREDO — Veille Hebdomadaire IA & Marché`
**Fichier :** `n8n/workflows/veille-hebdomadaire-kredo.json` (25 nœuds)
**Déclencheur :** cron `0 6 * * 1` — lundi 6 h, Europe/Paris
**Écrit dans :** `veille_digests` (1 ligne, upsert) puis `veille_articles` (5 lignes)

> ⚠️ Ce workflow vivait sous `n8n/veille_ia/`, **hors du périmètre de
> `npm run n8n:status`** : sa dérive repo ↔ VPS n'a jamais été mesurée. Il a été
> déplacé ici le 2026-08-14 (Lot 0 « Gestion des sources »).
>
> **Lot 2 (2026-08-15) : le tableau de sources codé en dur a disparu.** Le workflow lit
> désormais `public.v_effective_watch_sources` (`usage_scope=news`). **Repo à jour, VPS non
> réimporté** — voir `docs/FEATURES/gestion_des_sources/HANDOFF-LOT2.md` pour le protocole de
> publication. Le premier `n8n:status` après réimport fera foi (il verra un écart de nœuds
> 25/20 tant que le réimport n'a pas eu lieu — c'est le signal attendu, pas une anomalie).

---

## Chaîne

```
cron → Récupérer Secteurs Actifs → Build Contexte KREDO
     → Charger Sources Effectives (Supabase) → Vérifier et Normaliser Sources   ← v_effective_watch_sources, usage_scope=news
     → Explode Sources → Loop Over Items — 1 Source
                            ├─ Construire Requête Collecte → Router Mode Collecte
                            │     ├─ rss         → Lire Flux RSS ────────────────────┐
                            │     └─ site_search → Récupérer Flux Google News        │
                            │                    → Parser Flux Google News ──────────┤
                            │                                                        ▼
                            │                                       Enrichir avec Métadonnées Source
                            └─ (erreur, l'une ou l'autre branche) → Ignorer Source En Erreur
                                                                        (retour boucle)
     → [fin de boucle] → Récupérer Hash Articles Vus
                       → Dédup + Filtre Récence + Préfiltre Qualité   ← plafond 40, clé source_id
                       → Construire Prompt Classement → Haiku → Parser Top 5
                       → Construire Prompt Analyse    → Sonnet → Parser Digest Final
                       → Créer Digest (upsert)  → Préparer Lignes Articles → Créer Articles
```

Modèles : classement `claude-haiku-4-5-20251001`, analyse `claude-sonnet-5`.

## Credentials n8n requis

| Nœud | Credential |
|---|---|
| `Récupérer Secteurs Actifs`, `Charger Sources Effectives (Supabase)`, `Récupérer Hash Articles Vus`, `Créer Digest`, `Créer Articles` | `supabaseApi` |
| `Appel Claude Haiku — Classement`, `Appel Claude Sonnet — Analyse` | credential Anthropic du workspace n8n |
| `Récupérer Flux Google News` | aucun — flux RSS public, pas d'authentification |

## Import

Import et activation sont **manuels, faits par Guillaume** (le MCP n8n est bloqué
en session agent). Importer le JSON, réassocier les credentials, activer, puis
`npm run n8n:status` pour mesurer la dérive.

---

## Le plafond de candidats — à lire avant d'ajouter une source

Le nœud `Dédup + Filtre Récence + Préfiltre Qualité` plafonne la collecte à
**40 candidats** avant le classement LLM. Ce plafond borne le coût et **ne doit
pas être relevé** sans arbitrage.

Jusqu'au 2026-08-14 il était appliqué par un `slice(0, 40)` **positionnel**, sur
une liste ordonnée par la boucle des sources. Mesure en base : les 4 digests
existants sont tous à `nb_candidats_evalues = 40` pour `nb_sources_actives = 14`.
Le plafond était donc **saturé**, et rejoué sur une collecte réaliste (14 sources
× 20 articles) l'ancien code ne retenait que **2 sources sur 14**. Conséquence :
toute source ajoutée — manuelle ou issue d'un corpus sectoriel — produisait
**exactement zéro candidat supplémentaire**, sans erreur, sans log, sans trace.

Il est désormais appliqué par un **tourniquet** : une file par source, triée par
fraîcheur décroissante, servie à tour de rôle jusqu'à 40. Sur la même collecte,
**14 sources sur 14** contribuent, à ±1 article près. Même correctif que
`Normalize & Dedup Items` d'INTEL-033, mais **clé par source** et non par famille.

**Lot 2 (2026-08-15) : la clé du tourniquet est `sourceId`** (l'uuid `source_catalog.id`
livré par `v_effective_watch_sources`), avec `sourceKey` puis `sourceName` en repli de
robustesse seulement — jamais un cap positionnel.

**Invariant à préserver : aucun `slice(0, n)` positionnel sur la liste des
candidats.** Le harnais le vérifie explicitement.

### Dédup douce sur titre

Ajoutée en même temps, pour la même raison : avec 14 sources qui contribuent
réellement, une même dépêche reprise par trois éditeurs consommerait trois places
sur quarante. Comparaison sur **titre exact normalisé** (minuscules, accents et
ponctuation retirés) — deux angles différents sur le même fait restent deux
candidats distincts.

### `nb_sources_actives`

Lisait `Config Sources KREDO … .sources.length`, soit **la constante 14**, même
quand deux sources fournissaient les quarante candidats. Lit désormais
`sourcesContributrices` : le nombre de sources ayant **réellement** placé au
moins un candidat. C'est ce chiffre que la modale « Actualiser la veille »
affiche sous « Sources actives ». **Attendre une baisse apparente sur le premier
run** — elle mesure la réalité, pas une régression.

Métriques additionnelles disponibles sur chaque item de sortie du nœud :
`sourcesChargees`, `sourcesEnErreur`, `candidatsAvantPlafond`.

---

## Les deux modes de collecte (Lot 2)

`v_effective_watch_sources` dérive `collection_mode` : `rss` si `collection_url` est
renseigné, `site_search` sinon. Le nœud `Construire Requête Collecte` calcule l'URL réelle
et `Router Mode Collecte` (nœud IF) aiguille :

- **`rss`** → `Lire Flux RSS` lit directement `collection_url`.
- **`site_search`** → `Récupérer Flux Google News` interroge
  `https://news.google.com/rss/search?q=site:<search_domain>&hl=fr&gl=FR&ceid=FR:fr`
  (réponse texte brute), puis `Parser Flux Google News` extrait les `<item>` par
  expression régulière — volontairement simple, pas de scraping massif — et **déballe
  l'éditeur réel** depuis `<source url="…">Nom</source>`.

Les deux branches convergent sur `Enrichir avec Métadonnées Source`, qui écrit
l'éditeur réel (`realPublisher`) en `site_search`, jamais `news.google.com`. Un flux en
erreur (l'une ou l'autre branche) part vers `Ignorer Source En Erreur` et ne bloque pas
les autres sources.

Les 4 sources historiquement sans flux RSS direct (The Batch, Anthropic News, The
Neuron, a16z) redeviennent collectées via `site_search`.

> ⚠️ **Un flux Google News à 0 résultat n'est pas une erreur.** Un domaine mal indexé par
> Google News (observé en run réel VPS le 2026-08-15 sur `site:theneuron.ai`) renvoie un
> flux RSS valide mais **sans aucun `<item>`**. `Parser Flux Google News` doit alors
> renvoyer **au moins un item placeholder** (sans `title`/`link`, filtré naturellement par
> le préfiltre de qualité) plutôt qu'un tableau vide — un nœud Code qui ne produit aucun
> item en sortie arrête l'exécution du workflow entier, y compris la boucle sur les
> sources suivantes. Même piège, même correctif que `Ignorer Source En Erreur` (§ci-dessus).
> Testé explicitement par le harnais.

---

## Tests

```bash
node n8n/workflows/__tests__/veille-hebdomadaire-kredo.test.js
```

60 assertions : structure (le `slice` positionnel ne peut pas revenir, le plafond
reste à 40, plus de tableau de sources en dur), lecture de `v_effective_watch_sources`
(filtre `usage_scope=news`, tri, échec explicite si 0 ligne), les deux modes de
collecte, déballage de la provenance Google News, un flux Google News à 0 résultat qui
ne renvoie jamais un tableau vide (régression réelle VPS du 2026-08-15), tourniquet
re-clé sur `sourceId`,
régressions (récence 7 j, titre court, dédup par hash), dédup douce, isolation des flux
en erreur, propagation de `source_catalog_id` jusqu'aux lignes `veille_articles`,
mapping stable par `id` entre le prompt et la réponse Sonnet (pas par position),
idempotence du digest (`on_conflict=workspace_id,digest_date`), absence de secret en
clair, cas limites.

Le harnais exécute réellement le code des nœuds dans un `vm` avec voisins
simulés. Il **n'est pas couvert par `npm test`** (vitest n'inclut que
`src/**/*.test.ts`) — à lancer à la main après toute modification.

---

## Dettes connues, non traitées par ce lot

| Dette | Détail |
|---|---|
| **`Récupérer Secteurs Actifs` sans filtre** | Charge les 53 fiches `sector_intelligence` (macros **et** segments) et les concatène dans le prompt. Bruit non mesuré — hors périmètre du Lot 2 |
| **`v_effective_watch_sources` sans `workspace_id` dans sa projection** | Sûre aujourd'hui : RLS pour `authenticated`, et n8n utilise `service_role` sur un projet mono-workspace. À traiter avant tout support multi-workspace (scoper la vue ou passer par un endpoint/RPC dédié) — voir `docs/FEATURES/gestion_des_sources/HANDOFF-LOT2.md` §7 |
| **Sources `manual_only` non testées en collecte réelle** | Le round-robin et le mode `site_search` sont couverts par le harnais ; un run VPS réel reste à observer (voir protocole de publication) |
