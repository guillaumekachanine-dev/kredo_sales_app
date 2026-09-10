# Audit performance data — KREDO

**Statut :** diagnostic terminé · **Lots 0, 1, 2, 3, 5 livrés · Lot 4 fermé sans action** · chantier arrivé à son terme utile
**Ouvert le :** 2026-09-10 · **Dernière mesure :** 2026-09-10

**Acquis à ce jour**

| Lot | Résultat mesuré |
|---|---|
| **Lot 1** ✅ | **Le projet Vercel était hébergé aux États-Unis, la base en `eu-west-1`.** Région basculée en France. Chaque aller-retour payait un transatlantique. ⚠️ *Effectif au prochain déploiement seulement.* |
| **Lot 2** ✅ | `/veille` **42 → 29 requêtes, 0,89 s → 0,71 s** · `/reports` **7 → 4 requêtes, 0,45 s → 0,23 s** · préambule d'identité de **306 ms supprimé** · 3 routes témoins inchangées |
| **Lot 3** ✅ | Fiche compte **1,14 s → 0,57 s**, **5 → 3 vagues**, **450 → 92 Ko lus** · `/cockpit` **480 → 151 Ko** · HTML **identique à l'octet près** sur les deux · **aucune migration** |
| **F-9** ⛔ | Déclassé après mesure : impact réel ~40 ms, correctif propre trop coûteux. Voir [ledger](06-AUDIT-LEDGER.md). |
| **F-2** ↩️ | La recommandation de l'audit (colonnes générées) **était mauvaise** : aucune ligne ne porte les clés, et `EXPLAIN` montre 1,4 ms — le coût était le transport, pas le TOAST. Corrigé par une projection JSON, sans DDL. |
| **Lot 5** ✅ | `/veille` **29 → 23 requêtes, 7 → 5 vagues, −107 Ko lus, −86 Ko de HTML** : le socle de sources n'est plus chargé au rendu de page mais à l'ouverture des trois dialogues qui l'utilisent. **5.1 bloqué par conception** (l'onglet ne navigue pas), **5.2 non justifié** (la fiche compte est déjà à 0,57 s). |
| **Lot 4** ⛔ | **Fermé sans action.** F-7 (hôtes de tiroirs) est **invalidé** : borne haute mesurée à **~4 Ko gzip**, pas 130 Ko — `next/dynamic` faisait déjà son travail, mon `grep` confondait stub et corps. F-13 (`supabase-js`, 237 Ko / 18 % du socle) est **confirmé mais bloqué** par un canal Realtime monté dans le shell : c'est devenu une question de produit. |

**Prochaine action — deux décisions, aucune ligne de code :**
1. **[F-10](04-FINDINGS-AND-PRIORITIES.md#f-10)** — ouvrir le ticket Supabase (pool à 10 connexions,
   43 redémarrages PostgREST par jour, 356 « thread killed », 2× 504). C'est le seul levier restant
   dont l'ordre de grandeur pourrait dépasser tout ce qui a été fait.
2. **[F-13](04-FINDINGS-AND-PRIORITIES.md#f-13)** — trancher : l'indicateur d'exécution de workflow
   doit-il rester monté sur **toutes** les pages ? C'est lui, et lui seul, qui maintient
   `@supabase/supabase-js` (237 Ko, 18 % du socle) dans le bundle de chaque page.

Ensuite seulement, le **Lot 5** (chargement contextuel : contacts par onglet, étapes de la fiche
compte) — dont la justification doit être **réévaluée**, la fiche compte étant déjà passée de
1,14 s à 0,57 s au Lot 3.

---

## Le problème, et la réponse en une phrase

L'ouverture de plusieurs pages de KREDO est trop lente. Après mesure :

> **La base de données n'est pas lente. L'application lui parle trop de fois** (jusqu'à
> **42 allers-retours en 7 vagues** pour une page), **lui demande des colonnes qu'elle ne lit
> pas** (378 Ko de blob JSON pour en extraire **0 octet**), **et sérialise vers le navigateur des
> jeux de données dont il n'affiche qu'une fraction** (1,15 Mo de flux RSC, 843 signaux transférés
> pour en afficher 4) — le tout par-dessus un socle JS de **1,42 Mo identique sur chaque page**.

Le chiffre qui commande tout : **un aller-retour PostgREST coûte 116 ms en médiane et 602 ms au
p95, mesuré côté Supabase** (`edge_logs`, 7 900 requêtes sur 24 h) — pour un temps SQL de 1 à 5 ms.
**C'est le nombre d'appels qui fait la latence, pas leur contenu.**

---

## Les cinq réponses attendues

**1. Qu'est-ce qui ralentit KREDO ?**
Le nombre d'allers-retours vers Supabase, le volume transféré et sérialisé, et le socle JS —
dans cet ordre. Pas le SQL, pas les index, pas les RLS.

**2. Quelles pages ?**

| Route | Mesure | Cause dominante |
|---|---|---|
| `/prospection/accounts/[companyId]` | **1,14 s · 33 requêtes · 5 vagues** | Les 5 étapes du hub chargées quand une seule s'affiche + 378 Ko de blob inutile |
| `/veille` | **0,89 s · 42 requêtes · 7 vagues** | 306 ms de résolution d'identité en série avant la première donnée + 8 `select("*")` |
| `/prospection/accounts` | **1 148 Ko de flux RSC** | 642 contacts chargés que l'onglet soit ouvert ou non |
| `/cockpit` | **~480 Ko lus pour 111 Ko affichés** | 10 tables lues sans filtre ni limite, triées et tronquées en JavaScript |

**3. Quels mécanismes sont inutilement coûteux ?**
La résolution d'identité (**11,4 % du temps Supabase total pour zéro donnée métier**), le blob
`companies.metadata` tiré hors des colonnes générées prévues pour l'éviter, les jeux complets
filtrés côté client alors que la base offre déjà les vues qui le font, et les 8 hôtes de tiroirs
téléchargés sur chaque page.

**4. Quel meilleur gain pour le moindre risque ?**
Les Lots 1 à 3 ont capté l'essentiel du gain côté données, **sans une seule migration**. Côté
client, **il n'y a plus de gain simple à prendre** : F-7 s'est révélé valoir 4 Ko gzip, pas 130 Ko.
**Quatre candidats ont été écartés après mesure** — `/agenda` (F-9, ~40 ms), le comptage contacts
seul (F-6a, nul sans F-6b), les hôtes de tiroirs (F-7, 0,4 %) et la migration `meta_aliases` (F-2,
remplacée par une projection sans DDL). Ce qui reste tient en deux décisions, pas en code : le
ticket Supabase (F-10) et le sort de l'indicateur Realtime du shell (F-13).

**5. Dans quel ordre ?**
[05-IMPLEMENTATION-ROADMAP](05-IMPLEMENTATION-ROADMAP.md) — Lot 1 (vérifications sans code) →
Lot 2 (quick wins) → **mesurer** → Lot 3 (sur-récupération) → **mesurer** → Lot 4 (bundle) →
puis décider si les lots structurants restent justifiés.

---

## Ce qu'il ne faut PAS faire

Vérifié et écarté par la mesure, pas par opinion :

- **Ajouter des index.** `EXPLAIN` sur les requêtes les plus lourdes : tout en cache, aucun filtre coûteux. Le *planning* consomme déjà plus de buffers que l'exécution.
- **Supprimer les 272 index « inutilisés »** de l'advisor : les compteurs ont été remis à zéro récemment, la donnée est ininterprétable.
- **Créer des vues matérialisées** : les tables font 100 à 850 lignes.
- **Paralléliser davantage** : le pool PostgREST fait **10 connexions**, `/cockpit` en demande 14 et `/veille` 17.
- **Ajouter un cache serveur agressif** : il masquerait F-1, F-5 et F-6 au lieu de les corriger.
- **Rouvrir Realtime** ([ADR-0016](../adr/ADR-0016-realtime-notifications-cout-mesure.md)) ou **`cacheComponents`/PPR** ([ADR-0017](../adr/ADR-0017-cache-components-ppr-refuse.md)) : tranchés sur mesure.

---

## Quoi lire, dans quel ordre

| Fichier | À lire quand |
|---|---|
| **[00-BASELINE-AND-SCOPE](00-BASELINE-AND-SCOPE.md)** | Toujours en premier — chiffres de départ et **protocole de reproduction des mesures** (§5) |
| [01-DATA-FLOW-MAP](01-DATA-FLOW-MAP.md) | Pour comprendre ce qui se passe à l'ouverture d'une page donnée |
| [02-CODE-AUDIT](02-CODE-AUDIT.md) | Avant de toucher au code applicatif — constats avec `fichier:ligne` |
| [03-DATABASE-AUDIT](03-DATABASE-AUDIT.md) | Avant de toucher à la base — et pour comprendre pourquoi il n'y a presque rien à y faire |
| [04-FINDINGS-AND-PRIORITIES](04-FINDINGS-AND-PRIORITIES.md) | **Le document de travail** : 14 constats `F-n` au format constat→preuve→cause→gain→risque→effort, + matrice de priorisation |
| [05-IMPLEMENTATION-ROADMAP](05-IMPLEMENTATION-ROADMAP.md) | Pour exécuter — 8 lots, chacun encadré par une mesure |
| [06-AUDIT-LEDGER](06-AUDIT-LEDGER.md) | Pour savoir ce qui a déjà été investigué, décidé, **et invalidé** |

---

## Comment mesurer (résumé — détail en [00](00-BASELINE-AND-SCOPE.md) §5)

L'instrumentation est livrée et **inerte hors variable d'environnement** :

```bash
KREDO_PERF_TRACE=1 npx next start --port 3100
```

Chaque ligne `[perf]` du journal serveur est un aller-retour réseau : `t0` identiques = requêtes
parallèles, `t0` par paliers = cascade. `dur ≈ 0,2 ms` signifie **requête dédupliquée par React**,
pas requête rapide.

Sources de mesure complémentaires, déjà en place : `edge_logs` Supabase (champ
`response.origin_time` — la latence réelle côté origine), `postgrest_logs`, `pg_stat_statements`
(fenêtre ouverte le 2026-09-09 02:24 UTC), et `@vercel/speed-insights` en production.

---

## Relation avec l'audit précédent

[`docs/audits/AUDIT-PERFORMANCE-KREDO.md`](../audits/AUDIT-PERFORMANCE-KREDO.md) (juillet-août 2026)
reste valable et **n'est pas remplacé**. Il portait sur l'infrastructure (RLS, Realtime, cache
Next, vues) ; celui-ci porte sur le **chemin de données page par page**.

Ce qu'il a acquis et qui tient toujours : RLS wrappées (0 policy non conforme), statistiques du
planificateur maintenues (71/71 tables), colonnes générées `meta_*` sur `companies`, frontière
Suspense de premier niveau (TTFB 10–25 ms partout).

Ce qu'il a laissé ouvert et que celui-ci reprend : **son Lot 4 (bundle client) n'a jamais été
exécuté** — le JS est passé de 4,8 Mo à **7,27 Mo** depuis.
