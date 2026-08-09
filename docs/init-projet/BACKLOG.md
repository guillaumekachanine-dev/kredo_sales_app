# Backlog — KREDO

> Tickets dérivés de la [`ROADMAP.md`](ROADMAP.md). Source unique du « quoi faire ensuite ».
> Statuts : **Not Started** · **In Progress** · **Blocked** · **Done** · **Cut**.
> Convention ID : `K-NNN`. Mise à jour : 2026-06-10.

---

## 🔴 NOW — Dette bloquante (à solder en premier)

| ID | Ticket | Phase | Priorité | Statut | Dépend de |
|----|--------|-------|----------|--------|-----------|
| K-001 | **R1 — Migration baseline canonique.** ✅ `004_baseline_canonical.sql` générée par introspection du schéma live, parité vérifiée (20 tables / 73 policies / 116 contraintes / 36 index / 1 vue / 4 fn). 001-003 marquées historiques (`migrations/README.md`). | P0 | P0 | Done | — |
| K-002 | **R2 — État Supabase.** ✅ Projet `ACTIVE_HEALTHY` (pas en pause — le timeout initial était transitoire côté MCP). Reste à décider : keep-alive/upgrade pour éviter une future pause d'inactivité (tier gratuit). | P0 | P1 | Partly done | — |
| K-003 | **R1b — Types `database.ts`.** Déjà alignés sur le schéma live (ont servi à détecter le drift). Reste à ajouter le script `npm run db:types` et à régénérer après chaque migration. | P0 | P1 | Partly done | K-001 |
| K-004 | **R3 — ADR-0006 device** : acter « adaptive ciblé + responsive défaut ». Corriger le mécanisme (Vary: User-Agent ou correction client post-hydratation), centraliser `getDashboardDevice()`. | P0 | P0 | Done (ADR) / In Progress (impl) | — |
| K-005 | **R4 — Factory tab-store** : extraire `createEntityTabStore(moduleKey)` depuis `missions-tab-store.ts` avant le 2ᵉ module à onglets. | P0 | P1 | Not Started | — |
| K-006 | **Nettoyage** : supprimer routes mortes, resync `src/STRUCTURE.md` sur la réalité, isoler/retirer routes `(dev)`. | P0 | P2 | Not Started | — |

## 🟠 NOW — Phase 1 : cœur commercial réel

| ID | Ticket | Phase | Priorité | Statut | Dépend de |
|----|--------|-------|----------|--------|-----------|
| K-010 | **Comptes & contacts — écriture.** La **lecture est déjà live** (`getAccountsContactsData` → `companies`/`contacts`/`persons`). Reste à ajouter le **CRUD** (créer/éditer/supprimer compte & contact) depuis `prospection/accounts`, avec server actions + RLS. | P1 | P1 | Not Started | K-001 |
| K-011 | **Fiche opportunité 100 % CRUD** : compléter édition skills/contacts/events, suppression, transitions de stage. | P1 | P1 | Not Started | K-001 |
| K-012 | **Interactions / historique relationnel** branché sur `interactions`. | P1 | P2 | Not Started | K-010 |
| K-013 | **Deep-links stables** `/missions/opps/[id]` (pré-requis copilot). | P1 | P2 | Not Started | K-011 |
| K-014 | **R5 — 1ʳᵉ preuve n8n bout-en-bout** : `lib/n8n/` + `app/api/` webhook trigger → workflow n8n → écriture Supabase → Realtime → affichage. Cas trivial (ex. enrichissement interaction). | P1 | P1 | Not Started | K-002 |
| K-015 | **Catalogue d'outils n8n** (registre) : amorcer dès K-014, enregistrer chaque action. | P1 | P2 | Not Started | K-014 |

## 🟣 NOW — Client Intelligence Hub (ADR-0008)

> Surface BI par compte. Socle data = moteur 0007 (migration 006 ✅). Aucune table de résultat nouvelle ; seul ajout = référentiel `offers`.

| ID | Ticket | Phase | Priorité | Statut | Dépend de |
|----|--------|-------|----------|--------|-----------|
| K-060 | **Lot A — Hub lecture.** Route `/prospection/accounts/[companyId]` (`index/DesktopView/MobileView`) ; onglets **Accueil + Analyse** lisant `ai_intelligence_results.content_json` *ou* fallback `companies.metadata` ; fraîcheur + sources. | BI | P1 | In Progress | K-010 |
| K-061 | **Drawer → Quick View.** `CompanyIdentityDrawer` allégé (score, dernière analyse, 3 signaux/enjeux/offres) + CTA « Ouvrir le cockpit ↗ » (deep-link). | BI | P1 | Not Started | K-060 |
| K-062 | **Lot B — Référentiel `offers`.** Migration `007_offers.sql` (RLS standard) + seed lignes de service ESN + `npm run db:types`. | BI | P1 | Not Started | K-001 |
| K-063 | **`lib/intelligence/`.** `schemas.ts` (contrat `Claim` + Zod par phase) + `intelligence-data.ts` (lecture vue + results + fallback metadata). | BI | P1 | Not Started | K-060 |
| K-064 | **Lot C — Run lifecycle.** `app/api/intelligence/run` (POST crée run / GET poll) + Realtime + bouton « Rafraîchir » + idempotence `(run_id,phase)`. | BI | P1 | Not Started | K-063, K-014 |
| K-065 | **Lot D — Worker Phase 2** sectorielle mutualisée + callback HMAC durci → autonomie FOLIO. | BI | P2 | Not Started | K-064 |
| K-066 | **Lot E — Scoring déterministe** versionné → `companies.ai_score` (**trancher 1–10 vs /5**) + onglet Breakdown + tri liste. | BI | P1 | Not Started | K-065 |
| K-067 | **Lot F+G — Opportunités & Roadmap.** Matrice enjeux×offres (P3 ⨝ `offers`) ; Roadmap (P4) **matérialise `opportunities`/`tasks`**. | BI | P1 | Not Started | K-062, K-066 |
| K-068 | **Lot H+I — Pitch & Feeders.** Onglet Pitch (`result_type='pitch'`) + historique ; Veille/Scan contacts = cron n8n surfacés Accueil/Analyse. | BI | P2 | Not Started | K-067 |

## 🔵 NEXT — Phases 2 → 4

| ID | Ticket | Phase | Priorité | Statut | Dépend de |
|----|--------|-------|----------|--------|-----------|
| K-020 | **P2 — Qualification de signal** (Prospection) via n8n. | P2 | P1 | Not Started | K-014 |
| K-021 | **P2 — Étude sectorielle** générée via n8n. | P2 | P2 | Not Started | K-014 |
| K-022 | **P2 — Rédaction d'offre** (Proposals) via n8n, branché sur l'opportunité. | P2 | P1 | Not Started | K-014 |
| K-030 | **P3 — Upload CV → parsing** (candidates / person_skills). | P3 | P1 | Not Started | K-001 |
| K-031 | **P3 — Scoring & classement pgvector** → `match_scores`. | P3 | P1 | Not Started | K-030 |
| K-040 | **P4 — Moteur financier isolé** `lib/finance/` : fonctions pures testables (marge, TJM, TACI, forecast). | P4 | P1 | Not Started | K-001 |
| K-041 | **P4 — Missions / contrats / absences** branchés (`missions`, vue revenue). | P4 | P2 | Not Started | K-040 |
| K-042 | **P4 — Finance dashboards sur données réelles** (remplacer mock). | P4 | P2 | Not Started | K-040 |

## ⚪ LATER — Phase 5

| ID | Ticket | Phase | Priorité | Statut | Dépend de |
|----|--------|-------|----------|--------|-----------|
| K-050 | **Dashboards live** : remplacer tous les mocks par agrégats réels. | P5 | P1 | Not Started | K-040 |
| K-051 | **Génération de comptes-rendus** + alerting quotidien (cron n8n). | P5 | P2 | Not Started | K-015 |
| K-052 | **Copilot transverse** (header) : jointures cross-domaine + navigation par intention. | P5 | P1 | Not Started | K-013, K-015 |

## ⏸️ CUT / Vision (hors engagement septembre)

| ID | Ticket | Note |
|----|--------|------|
| K-090 | Knowledge Hub / RAG complet | Later assumé — 9 sous-pages `comingSoon`. |
| K-091 | UI monitoring Automations | Later assumé — n8n piloté directement d'ici là. |
| K-092 | Sous-pages Finance détaillées (facturation, budget, rapports…) | Au-delà du moteur de calcul = post-septembre. |
