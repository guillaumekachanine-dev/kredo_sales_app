# Architecture de Kredo

> Vue d'ensemble technique. Pour le *pourquoi* détaillé de chaque choix, voir les [ADR](adr/).

## 1. Vision en une phrase

Kredo est un **hub mince** (Next.js) posé sur une **source de vérité unique** (Supabase), qui **délègue tout le travail lourd** à un moteur asynchrone (n8n).

## 2. Les trois couches

### Couche présentation & CRUD léger — Next.js 15 (App Router)
- Rendu via Server Components (lecture directe de Supabase côté serveur).
- API Routes pour les écritures légères et le déclenchement des workflows n8n.
- Hébergement Vercel. **Contrainte clé :** fonctions serverless = timeouts courts → aucune tâche longue ici.

### Couche données — Supabase (PostgreSQL managé)
- **Source de vérité unique.** Un seul schéma `public`, tables préfixées par domaine.
- Sécurité par **RLS** (Row Level Security) : la base elle-même filtre les lignes (`auth.uid() = owner_id`).
- `pgvector` réservé au RAG (matching sémantique de CV) — activé en Phase 3+.
- Auth, Storage et Realtime fournis nativement par le projet.

### Couche asynchrone & IA — n8n (auto-hébergé sur VPS)
- Tout ce qui est long ou coûteux : scraping, requêtes LLM, vectorisation, crons.
- Déclenché de deux manières :
  - **Action utilisateur** : Next.js POST sur un webhook n8n.
  - **Événement de donnée** : Database Webhook Supabase (sur INSERT/UPDATE) appelle n8n.
- n8n **réécrit son résultat dans Supabase** ; le front écoute la table (Realtime) et affiche quand c'est prêt.

## 3. Le pivot : l'opportunité

L'entité centrale est `sales_opportunities`. Tout s'y rattache :

```
crm_accounts ──< sales_opportunities >── sales_opportunity_skills
                      │  │  │
       crm_contacts ──┘  │  └── sales_opportunity_events
   (via liaison N:N)     │
                  (futur) rec_candidates · del_missions · fin_forecasts
```

Modéliser ce pivot proprement fixe ~60 % des relations de toute l'application.

## 4. Règle d'or financière

La logique de calcul (marge, TACI, gains réels, forecast) doit rester **architecturalement isolée** de la structure des tables. Objectif : pouvoir remapper les champs d'entrée sans réécrire les formules, le jour où le schéma de données change. Les calculs simples et sûrs (ex. pipe pondéré) sont délégués à des **colonnes générées** par la base.

## 5. Adaptive design

| | Desktop = Analyse | Mobile = Action |
|---|---|---|
| **Intention** | Comprendre, comparer, filtrer | Décider, agir vite |
| **Composants** | Tableaux denses, filtres avancés, sidebar | Cartes, jauges, gros boutons (>44px), bottom nav |
| **Dataviz** | shadcn/ui charts complets (axes, grille, tooltips) | Sparklines / jauges pur HTML+Tailwind |

Règle absolue : **on distribue le bon sous-composant selon l'appareil, on ne charge jamais le lourd pour le cacher en CSS.**
