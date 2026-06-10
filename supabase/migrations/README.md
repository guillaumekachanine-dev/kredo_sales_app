# Migrations Supabase — KREDO

## ⚠️ Source de vérité : `004_baseline_canonical.sql`

La base live a été refondue directement (via MCP) entre les migrations 001-003
et le 10 juin 2026, **sans migration committée** → drift entre le repo et la prod
(risque R1 / ticket K-001).

`004_baseline_canonical.sql` a été générée le 2026-06-10 par introspection complète
du schéma live (projet `jvzgmhvwirsbdkjpmvla`) et **fait foi**. Elle recrée à
l'identique les 20 tables canoniques, contraintes, index, triggers, RLS et la vue
`v_mission_quarterly_revenue`. Parité vérifiée objet par objet avec la base live.

| Fichier | Statut | Note |
|---|---|---|
| `001_module_opportunite.sql` | 🗄️ Historique | Schéma `sales_`/`crm_` **abandonné**. Ne pas appliquer. |
| `002_update_sales_stage.sql` | 🗄️ Historique | Idem. |
| `003_enrich_sales_opportunities_v1.sql` | 🗄️ Historique | Idem. |
| `004_baseline_canonical.sql` | ✅ **Fait foi** | Reflète la base live. Point de départ de toute nouvelle migration. |

## Règle dorénavant

1. **Toute évolution de schéma passe par un fichier de migration committé** (`005_…`, `006_…`),
   appliqué via `supabase db push` ou le MCP `apply_migration`. Plus de changement live non tracé.
2. Après chaque migration : **régénérer les types** → `src/types/database.ts`
   (`supabase gen types typescript --project-id jvzgmhvwirsbdkjpmvla`).
3. `pgvector` sera ajouté en Phase 3 (recrutement) via une migration dédiée.
