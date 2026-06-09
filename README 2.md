<div align="center">

# kredo ↗

**Le super-assistant du commercial en ESN.**

*Un hub unifié qui centralise le pilotage d'un centre de profit : prospection, CRM, opportunités, recrutement, suivi financier et delivery — augmenté par l'IA.*

`Next.js 15` · `Supabase` · `n8n` · `Tailwind` · `shadcn/ui`

</div>

---

## 🎯 Ce qu'est Kredo

Kredo est un outil B2B **à usage personnel**, conçu pour couvrir l'intégralité du spectre d'un poste de commercial en ESN. Sa philosophie tient en une phrase :

> **Single Source of Truth.** Kredo n'est pas un monolithe lourd : c'est un *hub* (front-end unifié) qui s'appuie sur une base de données relationnelle robuste et délègue toutes les tâches lourdes à des workflows asynchrones.

Tout est interconnecté autour d'un pivot — **l'opportunité commerciale** — auquel se rattachent les comptes, les contacts, les candidats, les missions et les projections financières.

## 🧱 Principes d'architecture

| Principe | Traduction concrète |
|----------|---------------------|
| **Hub mince** | Next.js ne fait que l'affichage et le CRUD léger. Jamais de tâche longue. |
| **Asynchrone externalisé** | Scraping, LLM, vectorisation, crons → **n8n** sur VPS, via webhooks. |
| **Source unique** | Une seule base Supabase, un seul schéma `public`, tables préfixées par domaine. |
| **Moteur de calcul isolé** | La logique financière est séparée de la couche données (réutilisable). |
| **Adaptive design** | Desktop = analyse dense · Mobile = action rapide. Composants distribués, jamais cachés en CSS. |

### Flux de données

```
┌─────────────┐   CRUD léger / lecture   ┌──────────────────┐
│  Next.js 15 │ ───────────────────────► │  Supabase         │
│  (Vercel)   │ ◄─────────────────────── │  Postgres + RLS   │
│  Hub UI/API │                          │  Auth + pgvector  │
└──────┬──────┘                          └────────┬─────────┘
       │ webhook (tâche lourde)                   │ Database Webhook
       ▼                                          ▼
┌──────────────────────────────────────────────────────────┐
│  n8n (VPS) — scraping · LLM · vectorisation · cron jobs    │
│  écrit le résultat directement dans Supabase               │
└──────────────────────────────────────────────────────────┘
```

## 🗂️ Structure du dépôt

```
kredo/
├── README.md                 ← vous êtes ici
├── .env.example              ← variables d'environnement (à copier en .env.local)
├── docs/                     ← toute la documentation vivante du projet
│   ├── ARCHITECTURE.md         vue d'ensemble technique
│   ├── CONVENTIONS.md          règles de nommage et de code
│   ├── ROADMAP.md              le plan jusqu'au 1er septembre
│   ├── DECISIONS_LOG.md        journal synthétique des décisions
│   ├── CHANGELOG.md            journal synthétique des actions
│   └── adr/                    décisions d'architecture détaillées (ADR)
├── supabase/
│   └── migrations/           ← les migrations SQL versionnées
│       └── 001_module_opportunite.sql
└── src/
    ├── lib/supabase/         ← clients Supabase (navigateur + serveur)
    └── STRUCTURE.md            ← arborescence cible de l'application
```

## 🚀 Démarrage

### Pré-requis
- Node.js 20+ et un gestionnaire de paquets (npm / pnpm)
- Un projet Supabase dédié (✅ déjà créé : `Kredo_Sales_App`)
- Une instance n8n (✅ VPS existant)

### Installation
```bash
# 1. Initialiser l'app Next.js (à faire une seule fois, à la racine)
npx create-next-app@latest . --typescript --tailwind --app --src-dir

# 2. Installer les dépendances Supabase
npm install @supabase/supabase-js @supabase/ssr

# 3. Configurer l'environnement
cp .env.example .env.local   # puis renseigner les clés

# 4. Lancer en développement
npm run dev
```

### Base de données
La migration `001` est **déjà appliquée** sur le projet Supabase. Pour rejouer le schéma sur un environnement vierge, exécuter le contenu de `supabase/migrations/001_module_opportunite.sql` dans le SQL Editor.

> ⚠️ **Import manuel de données :** la colonne `owner_id` se remplit automatiquement quand l'app connectée écrit, mais **pas** lors d'un import via le SQL Editor (vous y êtes administrateur, pas utilisateur authentifié). Récupérer son UUID dans *Authentication > Users* et le renseigner explicitement.

## 📦 État des modules

| Module | Domaine (préfixe) | Statut |
|--------|-------------------|--------|
| Opportunité (pivot) | `sales_` | 🟢 Schéma posé |
| CRM | `crm_` | 🟡 Tables d'ancrage posées |
| Recrutement | `rec_` | ⚪ À venir (Phase 3) |
| Finance & Delivery | `fin_` / `del_` | ⚪ À venir (Phase 4) |
| Dashboard & Alerting | `ai_` | ⚪ À venir (Phase 5) |

## 🗺️ Roadmap (synthèse)

Cible de livraison : **1er septembre**. Détail dans [`docs/ROADMAP.md`](docs/ROADMAP.md).

`Phase 0` Fondations → `Phase 1` Cœur commercial → `Phase 2` Moteur IA amont (Lethia) → `Phase 3` Recrutement → `Phase 4` Finance & Delivery → `Phase 5` Dashboard, CR & Alerting

## 📚 Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — la vue d'ensemble technique
- **[CONVENTIONS.md](docs/CONVENTIONS.md)** — comment on nomme et on code
- **[ADR](docs/adr/)** — pourquoi chaque grande décision a été prise
- **[DECISIONS_LOG.md](docs/DECISIONS_LOG.md)** / **[CHANGELOG.md](docs/CHANGELOG.md)** — les journaux de bord

---

<div align="center">
<sub>Projet personnel · construit en solo avec l'assistance de Claude (lead technique) · 2026</sub>
</div>
