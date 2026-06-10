# ADR-0006 : Stratégie device — adaptive ciblé + responsive par défaut

**Statut :** Accepté
**Date :** 2026-06-10
**Décideur :** Dosta

---

## Contexte

La décision fondatrice (CLAUDE.md, ARCHITECTURE.md §5) imposait un **adaptive design strict** :
détection device **côté serveur** (User-Agent) puis distribution d'un sous-composant
`DesktopView` / `MobileView` distinct pour **chaque** écran, avec la règle « ne jamais
charger le composant lourd pour le masquer en CSS ».

Deux décisions distinctes avaient été fusionnées sous le mot « adaptive » :

1. **L'intention UX** — servir une expérience *différente* selon l'appareil
   (Desktop = Analyse dense / Mobile = Action synthétique). C'est la thèse produit.
2. **Le mécanisme de branchement** — *comment* on choisit l'arbre à rendre :
   User-Agent serveur vs. breakpoints / `useMediaQuery` client.

Problèmes constatés (cf. `AUDIT.md` §2) imputables au **mécanisme**, pas à l'intention :
- **Cache CDN** : Next.js/Vercel cache par URL, pas par `User-Agent`. Sans `Vary: User-Agent`,
  le mauvais layout peut être servi depuis le cache.
- **Tablette / resize** : l'iPad matche le regex mobile → bloqué sur layout mobile sans reload.
- **Coût 2×** : construire deux arbres pour *chaque* écran est intenable pour un dev solo
  d'ici septembre.

## Décision

**On conserve l'adaptive, mais ciblé. Responsive CSS par défaut.**

| Type d'écran | Approche | Justification |
|---|---|---|
| **Dashboards, cockpit, pipeline, planning** (~3-5 écrans denses) | **Adaptive plein** — `DesktopView` / `MobileView` séparés | L'interaction diverge réellement (table dense vs cartes/jauges). **Déjà construit** via le template dashboard config-driven : le coût 2× est amorti par le moteur (on écrit une config, pas deux écrans). |
| **CRUD, fiches, formulaires, listes simples** (~80 % du reste) | **Responsive CSS** (Tailwind `lg:`), un seul arbre | Deux arbres ici = coût pur, payoff UX quasi nul. |
| **Mécanisme, partout** | Détection serveur comme *hint de premier paint*, **corrigée client** après hydratation. `Vary: User-Agent` si l'UA serveur est conservé. Centraliser `getDashboardDevice()` (un seul point). | Élimine le bug de cache CDN et le blocage tablette. |

La thèse « Desktop = Analyse / Mobile = Action » est **préservée là où elle crée de la valeur**
(écrans denses) et **abandonnée là où elle ne fait que coûter** (longue traîne CRUD).

## Conséquences

- **+** Soutenable en solo : un seul arbre pour la majorité des écrans.
- **+** Plus de bug de layout servi depuis le cache CDN ; tablette/resize gérés.
- **+** L'adaptive reste « gratuit » sur les dashboards grâce au template existant.
- **−** Règle « jamais de masquage CSS » assouplie : elle ne s'applique plus qu'aux écrans denses.
  Pour le CRUD responsive, on accepte le rendu d'un arbre unique adapté par breakpoints.
- **Action de suivi** : centraliser la détection device, ajouter `Vary: User-Agent` ou la
  correction client, retirer toute duplication `getDashboardDevice()` (K-004).

## Annule / remplace

Assouplit la règle stricte de CLAUDE.md / ARCHITECTURE.md §5 (« on distribue toujours le bon
sous-composant, jamais de masquage CSS »), désormais limitée aux écrans denses.
