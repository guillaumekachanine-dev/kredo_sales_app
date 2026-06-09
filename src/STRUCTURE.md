# Arborescence cible de l'application

> Plan d'organisation du code `src/`. On crée les dossiers au fur et à mesure des phases.

```
src/
├── app/                      # Routes (App Router Next.js 15)
│   ├── (auth)/                 connexion / session
│   ├── (dashboard)/            pages protégées du hub
│   │   ├── opportunites/         module Sales (pivot) — Phase 1
│   │   ├── crm/                  comptes & contacts — Phase 1
│   │   ├── recrutement/          Phase 3
│   │   ├── finance/              Phase 4
│   │   └── page.tsx              dashboard d'accueil — Phase 5
│   └── api/                    Route Handlers (écritures légères, déclenchement n8n)
│
├── components/
│   ├── ui/                     composants shadcn/ui (base)
│   ├── desktop/                sous-composants « analyse » (tableaux denses, filtres)
│   └── mobile/                 sous-composants « action » (cartes, jauges, bottom nav)
│
├── lib/
│   ├── supabase/               clients (client.ts, server.ts) ✅ posés
│   ├── n8n/                     helpers de déclenchement des webhooks
│   └── finance/                MOTEUR DE CALCUL ISOLÉ (fonctions pures, testables)
│
├── hooks/                    détection d'appareil, Realtime, etc.
└── types/                    types TypeScript (générés depuis Supabase + métier)
```

## Règle adaptive design
Un composant « écran » détecte l'appareil (Server Component ou hook) puis **distribue** soit `components/desktop/...` soit `components/mobile/...`. On ne charge jamais le lourd pour le masquer en CSS.
