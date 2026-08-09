# Roadmap — KREDO

> **Cible :** 1ᵉʳ septembre 2026 · **Équipe :** solo · **Capacité réaliste :** ~8 semaines productives (vacances = buffer).
> Mise à jour : 2026-06-10. Document vivant — révisé en début de chaque phase.
> Tickets détaillés : [`BACKLOG.md`](BACKLOG.md). Pourquoi des choix : [`adr/`](adr/).

---

## Où en est le projet (verdict)

Pas un squelette vide : **fondations solides + des tranches verticales réelles branchées sur la BDD live (Missions/Opps, et Prospection › Comptes & Contacts) + des overviews de modules encore en façade (dashboard config-driven sur données mock)**.
État : **fin de Phase 0, ~40 % de la Phase 1**. Le risque n'est pas le retard mais la **dette de cohérence** (drift schéma — résolu K-001, n8n jamais éprouvé, détection device).

### Ce qui tourne pour de vrai
- Auth + protection des routes (`proxy.ts`), login/logout.
- BDD live ~20 tables canoniques (companies, opportunities, missions, persons…) + vue revenue.
- **Module Missions/Opps** (le pivot) : liste, missions actives, planning, fiche détail (skills/contacts/events), édition + création inline. Branché live.
- **Prospection — Comptes & Contacts & Études** (`prospection/accounts`) : lecture **live** des tables `companies` + `contacts`/`persons` (`getAccountsContactsData`, rendu `force-dynamic`). Données réelles, pas mock.
- Système Dashboard adaptatif config-driven (11 configs → 1 template → 2 rendus).
- Éditeur rich-text maison, navigation 2 étages (source unique).

### Ce qui est en façade (mock)
Dashboards d'**overview** (le widget config-driven en tête de module) alimentés par `mock-dashboard-data` : Cockpit, Finance, Proposals, Knowledge, Automations, Staffing, Consultants, Recrutement, Settings, et la **vue d'ensemble** Prospection.
⚠️ Distinguer l'overview (souvent mock) des onglets de données (parfois déjà live, ex. Prospection › Comptes & Contacts). À auditer onglet par onglet, pas module par module.

### Ce qui n'est pas commencé
n8n / IA par page / API routes / moteur financier isolé / matching pgvector / Realtime.

---

## Principes directeurs (non négociables)

1. **Tranche verticale.** Chaque phase est complète et démontrable seule. Pas de couche horizontale qui ne sert rien.
2. **Le pivot d'abord, le dur au milieu, le cerveau à la fin.** Opportunité → IA amont → Recrutement → Finance → Copilot transverse.
3. **Adaptive ciblé + responsive par défaut** (ADR-0006). Desktop/Mobile séparés uniquement sur les écrans denses (dashboards, cockpit, pipeline, planning) ; responsive CSS pour tout le CRUD/fiches/formulaires.
4. **Zéro-somme contre la capacité.** Tout `comingSoon` ajouté → quelque chose saute. Les 36 sous-pages désactivées sont une *vision*, pas un engagement septembre.
5. **Poser les fondations du copilot au fil de l'eau** : chaque action n8n enregistrée au catalogue d'outils, chaque entité deep-linkable. Coût marginal maintenant, prohibitif en rétrofit.

---

## Now / Next / Later

### 🟢 NOW — Solder les fondations + finir le cœur commercial · ~2-3 sem.
**Phases 0 (clôture) → 1.**
- Solder la dette bloquante : baseline schéma (R1), réveil Supabase (R2), politique device (R3/ADR-0006), factory tab-store (R4), nettoyage routes mortes + resync `STRUCTURE.md`.
- Cœur commercial complet : CRM minimal **réel** (comptes + contacts branchés live), fiche opportunité 100 % CRUD, interactions/events.
- **1 preuve n8n bout-en-bout** (R5) : Front → webhook n8n → écriture Supabase → Realtime → affichage.
- **Sortie :** la chaîne Front→Supabase→n8n est prouvée ; tu pilotes ton pipe réel.

### 🔵 NEXT — Valeur IA amont + données delivery · ~5-6 sem.
**Phases 2 → 3 → 4.**
- **P2 — IA amont (Lethia)** : qualif de signal, étude sectorielle, rédaction d'offre. Chaque action = page → n8n → résultat affiché. Branche Prospection + Proposals sur du réel. Catalogue d'outils n8n alimenté à chaque action.
- **P3 — Recrutement** : upload CV → scoring → classement via **pgvector**. Branche candidates / person_skills / match_scores.
- **P4 — Finance & Delivery** : `lib/finance/` **moteur de calcul isolé** (fonctions pures testables : marge, TJM, TACI, forecast) + missions/contrats/absences. Le morceau dur, placé une fois la confiance installée.
- **Sortie :** les 3 promesses différenciantes tournent sur données réelles.

### ⚪ LATER — Agrégation & cerveau transverse · ~2 sem.
**Phase 5.**
- Remplacer les mocks par des agrégats réels · génération de comptes-rendus · alerting quotidien (cron n8n).
- **Copilot transverse** (header global) : jointures cross-domaine, navigation par intention. Trivial si catalogue d'outils + deep-links posés au fil de l'eau.

---

## Tableau des phases

| Phase | Contenu | Statut |
|-------|---------|--------|
| **0 — Fondations** | Repo, Next.js, clients Supabase, design system, schéma BDD, dashboard, navigation | 🟢 Clôture en cours |
| **1 — Cœur commercial** | CRM réel + fiche opportunité + pipe + 1ʳᵉ preuve n8n | 🟡 ~40 % |
| **2 — IA amont (Lethia)** | Prospection, étude sectorielle, rédaction d'offre via n8n | ⚪ |
| **3 — Recrutement** | Upload CV → scoring → classement (pgvector) | ⚪ |
| **4 — Finance & Delivery** | Moteur P&L/marge/TACI/forecast isolé, missions, contrats, absences | ⚪ |
| **5 — Dashboard live, CR & Copilot** | Agrégation réelle, CR, alerting cron, copilot transverse | ⚪ |

---

## Risques & dépendances

| # | Risque | Mitigation | Bloque |
|---|--------|-----------|--------|
| R1 | Drift schéma (BDD live ≠ migrations repo) | Migration baseline canonique + régénérer types | Tout |
| R2 | Supabase en pause (tier gratuit) | Réveil + décision keep-alive/upgrade | Tout |
| R3 | Détection device fragile (UA serveur) | ADR-0006 : adaptive ciblé + responsive ; corriger mécanisme | Tous écrans |
| R4 | `missions-tab-store` non générique | Factory `createEntityTabStore` | 2ᵉ module à onglets |
| R5 | n8n jamais éprouvé | 1 aller-retour bout-en-bout fin P1 | Phases 2+ |

---

## Capacité & arbitrages

- Allocation : **70 % features de phase · 20 % dette/fondations · 10 % imprévus.**
- **Ce qui saute pour tenir septembre, si besoin (Later assumés) :** Knowledge Hub (RAG), UI de monitoring Automations, détail des sous-pages Finance au-delà du moteur de calcul.
- Le périmètre affiché (36 sous-pages) dépasse la capacité solo d'ici septembre : **assumé comme vision, pas comme engagement.**
