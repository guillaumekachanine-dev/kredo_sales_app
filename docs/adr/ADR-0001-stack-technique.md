# ADR-0001 : Stack technique

**Statut :** Accepté
**Date :** 2026-06
**Décideur :** Dosta (porteur du projet)

## Contexte
Outil B2B personnel couvrant commerce, recrutement, finance et delivery, à construire en solo en montée en compétence technique, avec un fort besoin d'IA et de traitements lourds (scraping, LLM). Hébergement à coût maîtrisé.

## Décision
- **Front & API :** Next.js 15 (App Router), Server Components, déploiement Vercel.
- **Données & Auth :** Supabase (PostgreSQL managé, RLS, pgvector).
- **Async & IA :** n8n auto-hébergé sur VPS, déclenché par webhooks.
- **UI :** Tailwind CSS + shadcn/ui (design flat).

## Options considérées
| Dimension | Tout-en-un Next.js + Vercel | Next.js + n8n (retenu) |
|-----------|------------------------------|------------------------|
| Tâches longues (LLM, scraping) | ❌ timeouts serverless | ✅ déportées sur n8n |
| Complexité | Faible | Moyenne (2 systèmes) |
| Coût | Faible | Faible (VPS déjà là) |

**Sur la dataviz :** Recharts (envisagé initialement) est **écarté** au profit de shadcn/ui charts (Desktop) et de sparklines pur HTML/Tailwind (Mobile), pour cohérence avec le design flat et la performance mobile.

## Conséquences
- ✅ Aucune requête longue côté Vercel : on respecte les limites serverless.
- ✅ Le moteur de calcul financier est isolé (réutilisable à un changement de schéma).
- ⚠️ Deux systèmes à maintenir (Next.js + n8n) et un contrat de webhook à versionner.
- 🔄 À revisiter si la charge dépasse durablement le plan gratuit Supabase.
