# ADR-0017 — Cache Components (PPR) : ne pas activer, le streaming est déjà en place

**Statut :** Accepté
**Date :** 2026-07-30
**Décideurs :** Guillaume (Owner)
**Liés :** [ADR-0006](ADR-0006-strategie-device-adaptive-cible.md) (D-13, PPR déjà écarté en 2026-06-10), [ADR-0016](ADR-0016-realtime-notifications-cout-mesure.md) (même schéma : fermer un sujet sur mesure), audit de performance : [AUDIT-PERFORMANCE-KREDO.md](../AUDIT-PERFORMANCE-KREDO.md) (Lot 3)

> Cet ADR **ferme un sujet**. Le protocole d'audit (Lot 3, étape 2) demandait
> d'activer `cacheComponents`. L'expérimentation et la mesure montrent que
> l'opération coûterait une refonte de ~50 routes pour un bénéfice que
> l'application obtient déjà autrement. Décision : **non**, avec conditions de
> réouverture explicites.

---

## 1. Contexte

`cacheComponents: true` (Next.js 16) **remplace l'ancien flag `experimental.ppr`** :
c'est le Partial Prerendering, sous un nouveau nom. Il permet de prérendre une
coquille statique et de streamer le reste.

Deux éléments du dossier étaient déjà écrits avant cet audit :

- **D-13 (ADR-0006, 2026-06-10) a déjà écarté le PPR** pour KREDO. Le protocole
  d'audit, rédigé le 2026-07-29, demandait pourtant de l'activer — il ne
  connaissait pas cette décision. **Conflit documentaire, tranché ici.**
- La partie « référentiels quasi statiques » de la même étape (`offers`, `skills`,
  `job_profiles`, `offer_practices`) **était déjà livrée** au commit `0c39f3a2`,
  via `unstable_cache` clé par `workspace_id` (`src/lib/reference-data/reference-cache.ts`).
  Il ne restait donc que la question du flag lui-même.

---

## 2. Ce que l'expérimentation établit

`cacheComponents: true` a été réellement activé et le projet réellement construit
(puis intégralement reverté). Résultats bruts :

| Constat | Mesure |
|---|---|
| Exports `dynamic = "force-dynamic"` incompatibles → erreur de compilation | **27 routes** |
| Après retrait des 27, la compilation passe (`✓ Compiled successfully in 3.4s`) mais le prérendu échoue | `Uncached data was accessed outside of <Suspense>` |
| Classe d'erreurs supplémentaire, non anticipée par le protocole | `new Date()` interdit avant lecture de données de requête (`next-prerender-current-time`) |
| Routes à reprendre pour satisfaire le flag | **~50** (toutes celles qui chargent des données) |
| `unstable_cache` des référentiels | à reconvertir en `use cache` |

**Et surtout : le bénéfice ne se matérialise pas.** La coquille prérendue s'arrête
au premier segment qui lit des données de requête. Or `(app)/layout.tsx` appelle
`getDashboardDevice()` → `headers()` pour distribuer les branches Desktop/Mobile.
Ce n'est pas un détail d'implémentation : c'est **la règle de conception device de
KREDO** (ADR-0006). La chrome de l'application (sidebar, header, navigation) est
donc dynamique **par construction**, et il ne reste rien de significatif à
prérendre statiquement au-dessus.

Rendre cette coquille statique supposerait d'abandonner la détection device côté
serveur — c'est-à-dire de rouvrir ADR-0006 pour financer une optimisation dont le
bénéfice restant est nul (§3).

---

## 3. Ce que l'application fait déjà, mesuré

Le protocole affirmait : *« 7 `<Suspense>` pour 50 routes — donc quasiment aucun
streaming : chaque navigation attend la totalité des requêtes serveur avant le
premier octet utile. »*

**C'est faux, et la mesure le montre.** Une route sonde a été ajoutée sous `(app)`
avec un chargement artificiel de 2,5 s, l'application construite en production et
servie localement :

| Grandeur | Valeur |
|---|---|
| TTFB (`time_starttransfer`) | **11–12 ms** |
| Durée totale de la réponse | 2 508 ms (le délai artificiel) |
| Contenu des premiers octets flushés (51 Ko) | chrome `DesktopSidebar` **+** squelette `animate-pulse` / `aria-busy` |

Le fichier `src/app/(app)/loading.tsx` crée une frontière Suspense **au-dessus de
toutes les routes** de l'application. Le streaming avec squelette est donc déjà
opérationnel sur le rendu serveur initial, pas seulement sur les navigations
client. Le gain visé par `cacheComponents` — envoyer la coquille avant les
données — **est déjà acquis**.

---

## 4. Décision

**Ne pas activer `cacheComponents`.** Confirmation de D-13 (ADR-0006), sur la base
de mesures nouvelles et non plus d'un pronostic.

Corollaires actés :

1. Les **27 `export const dynamic = "force-dynamic"` sont retirés** — non pas pour
   activer le flag, mais parce qu'ils sont **prouvés inertes** : le tableau de
   routes du build est **strictement identique** avec et sans eux (68 routes, diff
   vide). Toutes ces routes lisent des données de requête, elles sont dynamiques de
   toute façon. Les conserver entretenait un faux signal (« cette route est
   spéciale ») et constituait le premier blocage mécanique d'une éventuelle
   adoption future.
2. Le cache des référentiels **reste sur `unstable_cache`**, clé par `workspace_id`.
   `use cache` n'apporte rien ici et impose le flag.
3. **Aucune donnée `workspace_id`-scopée n'est mise en cache** au-delà de ces
   référentiels. La frontière de cache reste une frontière de sécurité.

---

## 5. Conditions de réouverture

Ce refus est daté, pas définitif. À rouvrir si **l'une** de ces conditions change :

- La détection device sort du layout `(app)` (abandon ou déplacement de la règle
  ADR-0006) → une coquille statique redevient possible.
- Une portion significative de l'application devient publique / non authentifiée
  (pages marketing, partage externe de rapports) → il y aurait enfin du contenu
  réellement prérendable.
- Le TTFB mesuré remonte au-dessus de la centaine de millisecondes sur les routes
  lourdes, signe que la frontière `loading.tsx` ne suffit plus.
