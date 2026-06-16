# Migrations Supabase — KREDO

## ⚠️ Source de vérité : la suite de migrations committées

La base live a été refondue directement (via MCP) entre les migrations 001-003
et le 10 juin 2026, **sans migration committée** → drift entre le repo et la prod
(risque R1 / ticket K-001).

`004_baseline_canonical.sql` a servi de point de rattrapage initial le 2026-06-10,
mais elle n'est **plus suffisante à elle seule** pour reconstruire fidèlement le
schéma live actuel.

Le repository fait désormais foi via :

1. `004_baseline_canonical.sql` comme baseline historique de rattrapage ;
2. les migrations additives suivantes déjà committées ;
3. les migrations correctives ultérieures, notamment
   `20260616084607_lot0_schema_realign_live.sql`, qui réaligne le repo avec
   l'état live validé au début du MVP.

| Fichier | Statut | Note |
|---|---|---|
| `001_module_opportunite.sql` | 🗄️ Historique | Schéma `sales_`/`crm_` **abandonné**. Ne pas appliquer. |
| `002_update_sales_stage.sql` | 🗄️ Historique | Idem. |
| `003_enrich_sales_opportunities_v1.sql` | 🗄️ Historique | Idem. |
| `004_baseline_canonical.sql` | ✅ Baseline historique | Point de rattrapage initial, à compléter impérativement par les migrations suivantes. |
| `20260616084607_lot0_schema_realign_live.sql` | ✅ Corrective canonique | Réaligne repo, schéma live, contraintes CRM, helpers `private`, RLS ciblée et compatibilité `interactions`. |
| `20260616085702_lot1_intelligence_foundation.sql` | ✅ Lot 1 MVP | Crée le socle intelligence MVP : sources, propositions, faits, signaux, liens de sources et état `knowledge_state`. |
| `20260616090459_lot1_intelligence_grants_hardening.sql` | ✅ Durcissement lot 1 | Révoque explicitement `anon` sur les nouvelles tables intelligence et conserve l'exposition API minimale pour `authenticated` et `service_role`. |

## Règle dorénavant

1. **Toute évolution de schéma passe par un fichier de migration committé**,
   appliqué via `supabase db push` ou le MCP `apply_migration`. Plus de changement live non tracé.
2. Si l'historique `schema_migrations` dérive du référentiel canonique,
   **réparer l'historique avant le push** plutôt que modifier rétroactivement
   les fichiers déjà appliqués.
3. Après chaque migration : **régénérer les types** → `npm run db:types`
   (écrit uniquement dans `src/types/database.generated.ts`).
4. `src/types/database.ts` est une **façade stable** de compatibilité.
   Les alias métier non générés doivent vivre hors du fichier généré,
   par exemple dans `src/types/domain/opportunities.ts`.
5. `pgvector` sera ajouté en Phase 3 (recrutement) via une migration dédiée.
