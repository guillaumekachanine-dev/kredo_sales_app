# Audit d'architecture — KREDO
**Date :** 2026-06-09 | **Révisé par :** Claude Sonnet (session d'architecture)

> Document vivant. À réviser à chaque changement majeur de structure ou en début de phase.

---

## TL;DR

Les **fondations** sont excellentes (pivot opportunité, source unique, monolithe modulaire, dashboard config-driven). Le poids ressenti vient de la navigation qui exposait la vision entière. Corrigé par ADR-0005. La prochaine décision critique est le bon niveau de split mobile/desktop.

---

## Ce qui est solide — ne pas toucher

| Élément | Pourquoi |
|---|---|
| **ADR + DECISIONS_LOG** | Le *pourquoi* est documenté. Rare et précieux. |
| **Pivot opportunité (ADR-0004)** | `stage`/`outcome` séparés, `numeric` pour l'argent, pipe pondéré en colonne générée. Modèle mature. |
| **Monolithe modulaire (ADR-0002)** | Source unique → jointures cross-domaine triviales → pré-requis du copilot IA transverse. |
| **Dashboard config-driven** | 7 configs → 1 template → 2 rendus. Ajouter un module = écrire une config. |
| **Règle d'or financière** | Moteur de calcul isolé des tables. Bénéfice IA : les fonctions pures deviennent des outils d'agent. |

---

## Problèmes identifiés et état de résolution

### 1. Navigation à 3 niveaux avec 74 liens désactivés — ✅ CORRIGÉ (ADR-0005)

**Avant :** 91 destinations dans la sidebar, 74 "Bientôt". Sidebar = plan de site de la vision.  
**Après :** 13 entrées, 2 niveaux (groupe → module). Sous-pages dans `tabs[]`, rendues en onglets de section.  
**Fichiers modifiés :** `main-menu.config.ts`, `DesktopSidebar.tsx`, `MobileBottomNav.tsx`, `MissionsTabbedShell.tsx`

---

### 2. Détection device : sniffing UA côté serveur — ⚠️ À CORRIGER (Phase 0 / avant mise en prod)

**Risques :**
- **Cache CDN.** Next.js/Vercel cache par URL, pas par `User-Agent`. Sans `Vary: User-Agent`, le mauvais layout peut être servi depuis le cache.
- **Resize / tablette.** L'iPad matche le regex mobile → bloqué sur layout mobile sans reload.
- **Coût 2×.** Implémenter deux versions de chaque écran pour un dev solo est intenable d'ici septembre.

**Recommandation :**

| Type d'écran | Approche |
|---|---|
| CRUD / fiches / formulaires (~80 % des pages) | Responsive CSS pur (breakpoints Tailwind `lg:`) |
| Dataviz lourde (cockpit, pipeline, P&L) — 3-4 écrans | `useMediaQuery` client + composants séparés |
| Si l'UA serveur est maintenu | Ajouter `Vary: User-Agent` + correction client post-hydratation |

**Centraliser la détection** : `getDashboardDevice()` est appelé dans 2 layouts séparément. Doit vivre dans un seul contexte React (ou un seul `headers()` passé en prop).

---

### 3. Source navigation dupliquée — ✅ CORRIGÉ (ADR-0005)

`MobileBottomNav` avait ses 5 items codés en dur, déconnectés de `main-menu.config.ts`. Désormais dérivés de `primary: true`.

---

### 4. `MissionsTabbedShell` — labels locaux dupliqués — ✅ CORRIGÉ

`SEGMENT_LABELS` dict local remplacé par `getSectionTabsForPath()`.

---

### 5. Tab-store spécifique aux missions — 🔴 À GÉNÉRALISER avant duplication

`src/lib/tabs/missions-tab-store.ts` sera copié-collé pour opportunités, comptes, candidats, etc.  
**Action :** Extraire en factory `createEntityTabStore(moduleKey: string)` avant le 2e module qui en a besoin.

---

### 6. Routes mortes et routes de test — 🔴 À NETTOYER

- `src/app/(app)/sales/page.tsx` — route orpheline post-refactoring "Missions".
- `src/app/editor-test/` et `src/app/dashboard-test/` — routes de dev à la racine.  
  → Déplacer dans un groupe `(dev)/` ou supprimer avant prod.

---

### 7. `src/STRUCTURE.md` périmé — 🟠 À SYNCHRONISER

Décrit `(auth)`, `(dashboard)`, `components/desktop|mobile`, `lib/n8n`, `hooks/` — rien de tout ça n'existe.  
La réalité : `(app)`, `components/{dashboard,missions,layout,…}`.  
**Risque concret :** trompe tout agent IA ou nouveau contributeur qui lit le doc.

---

### 8. `src/types/database.ts` — 🟠 VÉRIFIER LA GÉNÉRATION

Doit être généré (`supabase gen types typescript`) et non écrit à la main. Sinon drift garanti dès la prochaine migration.

---

## Intégration IA — Architecture cible (deux plans)

### Plan 1 — IA par page (les mains)

IA scopée à l'entité à l'écran. Déclenchée par l'utilisateur, résultat visible.

```
Page → POST webhook n8n → LLM / scraping (async) → réécrit Supabase → Realtime → affichage
```

- Livrable au fil des modules.
- Exemples : "Rédiger l'offre" (Proposals), "Scorer ce CV" (Recrutement), "Qualifier le signal" (Prospection).

### Plan 2 — Copilot transverse (le cerveau)

IA cross-domaine dans le header global. Rendu possible par la source unique (ADR-0002).

```
Copilot (header global)
  ├─ répond  — jointures cross-domaine : "Quelles opps sans staffing ?"
  ├─ navigue — deep-link par intention (allège la sidebar)
  └─ délègue → même catalogue d'actions n8n qu'utilisent les pages
```

**Pré-requis à poser AU FUR ET À MESURE (pas en rétrofit) :**
- IDs d'entités stables et routes deep-linkables (`/missions/opps/[id]`)
- Chaque action n8n déclarée dans un catalogue d'outils dès que le module ship
- Moteur de calcul isolé (règle d'or) → outil d'agent direct

**Couche technique :** Vercel Function (Fluid Compute, 300 s) + AI SDK + AI Gateway (observabilité, fallbacks). Conversationnel sync = Vercel. Travail lourd async = n8n.

### Phasage IA

| | Quand | Coût |
|---|---|---|
| IA par page (Plan 1) | Au fil des modules — déjà amorcé | Incrémental |
| Fondations transverses (catalogue, deep-links) | À chaque module livré | Marginal si fait en continu |
| Copilot transverse (Plan 2) | Phase 5 | Élevé — trivial si fondations posées |

---

## Roadmap d'actions priorisée

### 🔴 Cette semaine

- [x] Refonte nav 2 étages (ADR-0005) — **fait**
- [x] Source unique bottom nav + `getSectionTabsForPath` — **fait**
- [ ] Supprimer `src/app/(app)/sales/page.tsx`
- [ ] Isoler routes `*-test` dans un groupe `(dev)/`
- [ ] Réaligner `src/STRUCTURE.md` sur la réalité

### 🟠 Avant prochaine phase de modules

- [ ] Trancher mobile/desktop : responsive-first + `useMediaQuery` client pour dataviz lourde
- [ ] Centraliser `getDashboardDevice()` (un seul contexte)
- [ ] Ajouter `Vary: User-Agent` si UA serveur maintenu
- [ ] Généraliser `missions-tab-store` en factory avant 2e usage
- [ ] Vérifier / régénérer `src/types/database.ts`

### 🟡 Au fil des phases (Phase 1–4)

- [ ] Chaque module livré avec ses `tabs` déclarés dans `main-menu.config.ts`
- [ ] Routes deep-linkables avec IDs stables (`/[module]/[entity]/[id]`)
- [ ] IA par page (Plan 1) pour chaque module
- [ ] Actions n8n enregistrées au catalogue d'outils dès livraison

### 🟢 Phase 5

- [ ] Copilot transverse (Plan 2) dans `AppHeader`
- [ ] Navigation par intention → ferme la boucle avec la sidebar aplatie
