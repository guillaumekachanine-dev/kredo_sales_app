# HANDOFF-LOT1-IDENTITE-FRANCE — Socle identité France des comptes

> **Document de transfert et rapport d'audit / statut du Lot 1 & Lot 1.5**

---

## 1. Baseline avant Lot 1.5 (Capturée sur Supabase Live)

### Entreprises (Companies)
- **Total comptes** : 98
- **Comptes avec SIREN** : 7
- **Comptes avec Code NAF** : 7
- **SIRENs en doublon** : 0
- **SIRENs invalides** : 0

### Faits de compte (account_facts)
| Fact Type | Nombre de faits | Comptes couverts | Sans source | Sans effective_at | Sans confidence_score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `legal_id` | 1 | 1 | 0 | 0 | 0 |
| `naf_code` | 0 (champ CRM) | 0 | 0 | 0 | 0 |
| `collective_agreement` | 1 | 1 | 0 | 0 | 0 |
| `headcount_france` | 1 | 1 | 0 | 0 | 0 |
| `incorporation_date` | 1 | 1 | 0 | 0 | 0 |
| `establishment` | 1 | 1 | 0 | 0 | 0 |
| `executive` | 2 | 1 | 0 | 0 | 0 |

### Sources d'intelligence (intelligence_sources)
- **Total sources enregistrées** : 176

---

## 2. Architecture et Réutilisation

Conformément à `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` :
- **Single Source of Truth** : Supabase.
- **Workflow d'acquisition** : Extension déterministe de `INTEL-010 — intel-010-refresh-account-infos.json`.
- **API officielle interrogeable** : `recherche-entreprises.api.gouv.fr/search`.
- **Promotion CRM** : Les champs `siren` et `naf_code` sont promus sur `companies` uniquement après résolution non ambiguë (`status === 'resolved'`).
- **Faits déterministes A1** : `legal_id`, `collective_agreement`, `headcount_france`, `incorporation_date`, `establishment`, `executive` sont inscrits dans `account_facts` avec `origin = 'external'` et `confidence_score = 1.0`.

---

## 3. Implémentation & Code Réalisé

- **Migration SQL** : [`supabase/migrations/20260812110000_073_account_facts_identite_france.sql`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/supabase/migrations/20260812110000_073_account_facts_identite_france.sql)
- **Workflow N8N** : [`n8n/workflows/INTEL-010 — intel-010-refresh-account-infos.json`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/INTEL-010%20%E2%80%94%20intel-010-refresh-account-infos.json)
- **Script Batch & Canary** : [`scripts/lot1-batch-apply.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/scripts/lot1-batch-apply.ts)
- **Commit GitHub** : `fb5559eb` (`feat(sector-intelligence): socle identite France des comptes (Lot 1)`) poussé sur `main`.

---

## 4. Pré-requis de Déploiement Manuel (Action Requise Guillaume)

En application stricte des consignes d'accès (pas de simulation, pas de modification DDL libre ni d'écriture non autorisée sur l'API VPS n8n) :

1. **Migration DB Supabase 073** :
   - Fichier : `supabase/migrations/20260812110000_073_account_facts_identite_france.sql`
   - Action : Exécuter la migration via le Dashboard Supabase SQL Editor ou CLI `supabase db push`.
2. **Activation n8n VPS** :
   - Fichier : `n8n/workflows/INTEL-010 — intel-010-refresh-account-infos.json`
   - Action : Importer et activer le workflow sur l'instance VPS n8n.

---

## 5. Reprise Immédiate pour le Canary & Full Batch

Dès confirmation des deux étapes ci-dessus par Guillaume, lancer :

```bash
# 1. Canary sur 3 comptes
npx tsx --env-file=.env.local scripts/lot1-batch-apply.ts

# 2. Test d'idempotence (relancer immédiatement le canary)
npx tsx --env-file=.env.local scripts/lot1-batch-apply.ts

# 3. Full Batch sur les 98 comptes
npx tsx --env-file=.env.local scripts/lot1-batch-apply.ts --full
```

---

## 6. Validation Technique
- `npm run typecheck` : OK
- `npm test` : 110/110 fichiers de test validés (1089 tests)
- `npm run check:server-boundary` : OK
- `npm run build` : Compilation Next.js Turbopack réussie.
