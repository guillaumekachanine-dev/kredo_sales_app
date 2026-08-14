# Veille hebdomadaire IA & Marché — SETUP

**Workflow n8n :** `KREDO — Veille Hebdomadaire IA & Marché`
**Fichier :** `n8n/workflows/veille-hebdomadaire-kredo.json` (20 nœuds)
**Déclencheur :** cron `0 6 * * 1` — lundi 6 h, Europe/Paris
**Écrit dans :** `veille_digests` (1 ligne) puis `veille_articles` (5 lignes)

> ⚠️ Ce workflow vivait sous `n8n/veille_ia/`, **hors du périmètre de
> `npm run n8n:status`** : sa dérive repo ↔ VPS n'a jamais été mesurée. Il a été
> déplacé ici le 2026-08-14 (Lot 0 « Gestion des sources »). Le premier
> `n8n:status` après réimport fera foi.

---

## Chaîne

```
cron → Récupérer Secteurs Actifs → Build Contexte KREDO → Config Sources KREDO
     → Explode Sources → Loop Over Items — 1 Source
                            ├─ Lire Flux RSS → Enrichir avec Métadonnées Source ─┐
                            └─ (erreur) → Ignorer Source En Erreur ──────────────┘
                                                                        (retour boucle)
     → [fin de boucle] → Récupérer Hash Articles Vus
                       → Dédup + Filtre Récence + Préfiltre Qualité   ← plafond 40
                       → Construire Prompt Classement → Haiku → Parser Top 5
                       → Construire Prompt Analyse    → Sonnet → Parser Digest Final
                       → Créer Digest → Préparer Lignes Articles → Créer Articles
```

Modèles : classement `claude-haiku-4-5-20251001`, analyse `claude-sonnet-5`.

## Credentials n8n requis

| Nœud | Credential |
|---|---|
| `Récupérer Secteurs Actifs`, `Récupérer Hash Articles Vus`, `Créer Digest`, `Créer Articles` | `supabaseApi` |
| `Appel Claude Haiku — Classement`, `Appel Claude Sonnet — Analyse` | credential Anthropic du workspace n8n |

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

## Tests

```bash
node n8n/workflows/__tests__/veille-hebdomadaire-kredo.test.js
```

29 assertions : structure (le `slice` positionnel ne peut pas revenir, le plafond
reste à 40), tourniquet, régressions (récence 7 j, titre court, dédup par hash),
dédup douce, isolation des flux en erreur, métriques, contrat de sortie vers
`Construire Prompt Classement`, cas limites.

Le harnais exécute réellement le code des nœuds dans un `vm` avec voisins
simulés. Il **n'est pas couvert par `npm test`** (vitest n'inclut que
`src/**/*.test.ts`) — à lancer à la main après toute modification.

---

## Dettes connues, non traitées par le Lot 0

| Dette | Détail |
|---|---|
| **14 sources en dur** | Nœud `Config Sources KREDO`. Remplacé par `v_effective_watch_sources` au Lot 2 — voir `docs/FEATURES/gestion_des_sources/PLAN-CHANTIER.md` |
| **`workspace_id` en dur** | `98dcd39d-f87b-4f9d-add9-ce76d635953a`, dans `Créer Digest` **et** `Préparer Lignes Articles`. Mono-workspace aujourd'hui, à paramétrer avec le Lot 2 |
| **`Récupérer Secteurs Actifs` sans filtre** | Charge les 53 fiches `sector_intelligence` (macros **et** segments) et les concatène dans le prompt. Bruit non mesuré |
| **Provenance non déballée** | Sans objet tant que les 14 flux sont des flux d'éditeur direct (vérifié : les 20 URLs stockées sont toutes des URLs d'éditeur). **Devient bloquant au Lot 2**, quand la branche `site_search` passera par Google News RSS |
| **`veille_articles.source_catalog_id`** | Crochet du scoring V2, posé au Lot 1 |
