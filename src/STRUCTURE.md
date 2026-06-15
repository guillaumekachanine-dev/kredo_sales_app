# Arborescence réelle de l'application

> Réalité du code au **15 juin 2026**. Mise à jour à chaque ajout de dossier structurant.
> Pour les décisions d'architecture, voir `docs/ARCHITECTURE.md` et `docs/adr/`.

```
src/
│
├── app/                          # Routes — Next.js App Router
│   ├── (app)/                    # 🔐 Pages protégées du hub (layout = AppShell)
│   │   ├── layout.tsx              Détection device → AppShell
│   │   ├── page.tsx                Redirection → /cockpit
│   │   ├── cockpit/                Dashboard de pilotage global
│   │   ├── missions/               Module Missions & Opps (Phase 0 livré)
│   │   │   ├── page.tsx              Vue d'ensemble (liste)
│   │   │   └── (tabbed)/             Sous-pages avec MissionsTabbedShell
│   │   │       ├── layout.tsx          Shell onglets (+ record tabs)
│   │   │       ├── actives/            Missions actives
│   │   │       ├── opps/               Opportunités
│   │   │       └── planning/           Planning
│   │   ├── consultants/            Module Consultants & Compétences
│   │   │   ├── layout.tsx            Layout module (SectionNavBarSlot)
│   │   │   ├── page.tsx              Onglet Synthèse (accueil par défaut)
│   │   │   └── (tabbed)/             Onglets secondaires
│   │   │       ├── layout.tsx          Shell onglets (neutre, extensible)
│   │   │       ├── pool-competences/   Cartographie compétences & passerelles
│   │   │       ├── activite-conges/    CRA & absences planifiées
│   │   │       └── suivi-manager/      Formulaires & échanges managériaux
│   │   ├── prospection/            Module Prospection Intelligence
│   │   ├── proposals/              Module Proposal Intelligence
│   │   ├── finance/                Module Finance
│   │   ├── knowledge/              Module Knowledge Hub
│   │   └── automations/            Module Automations
│   │
│   ├── (dev)/                    # 🧪 Pages de test dev (non exposées en nav)
│   │   ├── editor-test/            Testeur KredoRichTextEditor / Viewer
│   │   └── dashboard-test/         Testeur SectionDashboardTemplate (toutes sections)
│   │
│   ├── globals.css
│   ├── layout.tsx                # Root layout (html, body, fonts)
│   └── page.tsx                  # Root → redirection vers (app)
│
├── components/
│   ├── ui/                       Primitives UI (AppDialog, AppDrawer, SurfaceCard…)
│   ├── common/                   Composants génériques réutilisables cross-module
│   │                             (EntityListPanel, EntityFilterBar, EntitySearchBar…)
│   ├── layout/                   Shell global (AppShell, DesktopSidebar, MobileBottomNav,
│   │                             AppHeader, SectionTabBar, navigation-icons)
│   ├── dashboard/                Système dashboard adaptatif
│   │   ├── SectionDashboardTemplate.tsx   Routeur mobile / desktop
│   │   ├── SectionDesktopDashboard.tsx
│   │   ├── SectionMobileDashboard.tsx
│   │   ├── layout/               Blocs de layout (Header, KpiGrid, AiPanel…)
│   │   └── widgets/              Widgets atomiques (MetricCard, AlertCard, AiSummaryCard…)
│   ├── missions/                 Composants du module Missions
│   │   (MissionsTabbedShell, MissionsListView, MissionsEntityPanel)
│   ├── documents/                Viewer de documents (shell + toolbar + preview)
│   └── editor/                   KredoRichTextEditor — éditeur JSON natif léger
│
├── lib/
│   ├── navigation/               main-menu.config.ts — SOURCE UNIQUE de navigation
│   │                             (types MainMenuItem / SectionTab, getSectionTabsForPath)
│   ├── dashboard/                Système dashboard
│   │   ├── dashboard-types.ts      Types (DashboardDevice, metrics, alerts…)
│   │   ├── dashboard-device.ts     Détection device (User-Agent serveur)
│   │   ├── mock-dashboard-data.ts  Données mock pour le dev / dashboard-test
│   │   └── configs/                Configs par module (missions, finance, proposals…)
│   ├── tabs/                     Système d'onglets "record" (fiches ouvertes)
│   │   ├── tab-types.ts
│   │   └── missions-tab-store.ts   Store Zustand — à généraliser en factory (TODO)
│   ├── supabase/                 Clients Supabase
│   │   ├── client.ts               Côté client (browser)
│   │   └── server.ts               Côté serveur (SSR / Server Components)
│   └── utils.ts                  Utilitaires partagés (cn, …)
│
└── types/
    └── database.ts               Types TypeScript — doit être GÉNÉRÉ (supabase gen types)
                                  Ne pas écrire à la main.
```

---

## Dossiers à créer dans les phases suivantes

| Dossier | Phase | Contenu |
|---|---|---|
| `lib/n8n/` | Phase 1 | Helpers déclenchement webhooks n8n |
| `lib/finance/` | Phase 4 | **Moteur de calcul isolé** (fonctions pures testables) |
| `app/(auth)/` | Phase 1 | Login / session Supabase Auth |
| `app/api/` | Phase 1 | Route Handlers (écritures légères, triggers n8n) |
| `hooks/` | Phase 2+ | Realtime Supabase, media query client-side, etc. |

---

## Règle adaptive design

La détection device se fait côté serveur dans `lib/dashboard/dashboard-device.ts` (User-Agent).  
Le composant serveur passe `device` en prop → distribue le bon sous-composant.  
**Règle absolue : on ne charge jamais le composant lourd pour le masquer en CSS.**

> ⚠️ Voir `docs/AUDIT.md` §2 pour les limites du sniffing UA serveur (cache CDN, resize).  
> À corriger avant mise en production : `Vary: User-Agent` + correction client post-hydratation.

---

## Conventions de nommage

- **Fichiers composants :** `PascalCase.tsx`
- **Fichiers config / lib :** `kebab-case.ts`
- **Tables BDD :** préfixe domaine (`crm_`, `sales_`, `fin_`, `del_`, `rec_`)
- **Stores Zustand :** `use[Module][Entity]Store`
- **Configs dashboard :** `[module]-dashboard.config.ts`
