# ADR-0008 : Client Intelligence Hub — surface BI par compte

**Statut :** Accepté
**Date :** 2026-06-11
**Décideur :** Dosta
**Liés :** [0005](ADR-0005-navigation-deux-etages.md) (navigation deux étages), [0006](ADR-0006-strategie-device-adaptive-cible.md) (device adaptive), [0007](ADR-0007-moteur-intelligence-commerciale.md) (**moteur d'intelligence — socle data de cet ADR**)

## Contexte

L'ADR-0007 a posé le **moteur** d'intelligence commerciale (3 tables `ai_intelligence_*`, `content_json` source unique, vue `v_ai_intelligence_summary`, migration `006_ai_intelligence.sql` appliquée). La Phase 1 FOLIO (~93 comptes) est importée dans `companies.metadata.analysis_data`. Il manque la **surface** : l'endroit où le commercial lit, rafraîchit et actionne l'intelligence d'un prospect — la « tour de contrôle » par compte.

État réel vérifié (audit du 2026-06-11) :

- Le drawer [`CompanyIdentityDrawer`](../../src/components/accounts-contacts/CompanyIdentityDrawer.tsx) affiche **déjà** 6 onglets (`apercu · intelligence/Marché · contacts · crm · actu · pitchs`) lisant la P1 + sectorielle legacy depuis `metadata`. L'onglet `pitchs` est un placeholder.
- Les pages `prospection/*` (`signals`, `scoring`, `ai-workshop`, `sector-studies`…) sont des **maquettes agrégées section-level** (`SectionDashboardTemplate` nourri de `config/data` codés en dur), **non câblées** et **non par-compte**.
- **Aucune page dédiée par prospect** n'existe.

Une proposition externe (ChatGPT) a correctement cadré l'**UX** (page dédiée + onglets + right panel + distinction faits/hypothèses) mais sur un **schéma de ~14 tables normalisées** et un routing `/comptes/[id]/intelligence` — deux éléments qui **contredisent l'existant** (ADR-0007 a tranché 3 tables + `content_json` ; KREDO route en `/prospection/accounts`).

Écarts stack relevés à l'audit (corrigés dans `CLAUDE.md`) : **Next.js 16.2.7** (doc disait 15) · **pas de shadcn/Radix** (UI maison, `<dialog>` natif via `AppDrawer`/`AppDialog`) · **pas de référentiel d'offres ESN** · **incohérence d'échelle de score** (0007 fige 1–10, l'UI affiche `/5`).

## Décision

### 1. Surface — page dédiée **+** drawer Quick View (pas l'un *ou* l'autre)

- **Hub** = `/prospection/accounts/[companyId]` — page **deep-linkable** (cohérent K-013), pattern `index.tsx (RSC, getDashboardDevice) → DesktopView / MobileView`. Écran dense → **adaptive plein** assumé (ADR-0006).
- **Drawer** `CompanyIdentityDrawer` = **rétrogradé en Quick View** depuis la liste : score, dernière analyse, 3 signaux, 3 enjeux, 3 offres, CTA « Ouvrir le cockpit ↗ ». Plus aucune génération lourde dans le drawer.

### 2. Données — réutilisation stricte du moteur 0007, **zéro table de résultat nouvelle**

- Le Hub **lit** `ai_intelligence_results.content_json` (par phase) **+ fallback** `companies.metadata` (FOLIO), via la vue `v_ai_intelligence_summary`. Il **n'introduit aucune table de résultat**.
- **Rejet du schéma 14 tables** : il recrée la dette FOLIO que l'ADR-0007 fuit (sources de vérité multiples, perte de l'idempotence `UNIQUE(run_id,phase)`, coût de maintenance solo). `account_signals`/`pain_points`/`offer_matches`/`scores`/`roadmap_steps`/`pitch_generations` → **tous portés par `content_json`**.
- **Seul ajout de schéma autorisé** : référentiel **`offers`** (lignes de service ESN, ~10–20 lignes, **réutilisé par tous les comptes**) — même nature que `skills` (donnée de référence contrôlée, pas par-compte). Le matching enjeu→offre référence un `offer_id` **dans `content_json`** ; l'UI résout le libellé via `offers`. Pas de table `account_offer_matches`.

### 3. Onglets UI ≠ phases data

| Onglet UI | Source | Nature |
|---|---|---|
| **Accueil** | `v_ai_intelligence_summary` + agrégat des phases | synthèse exécutive |
| **Analyse** (client · sectorielle · veille) | P1, P2 (**sectorielle mutualisée par secteur**) | LLM |
| **Opportunités** (matrice enjeux × offres) | P3 (diagnostic) `content_json` ⨝ `offers` | LLM + référentiel |
| **Scoring** | `companies.ai_score` (1–10) + facettes via **fonction déterministe versionnée** | **dérivé déterministe** |
| **Roadmap** | P4 `content_json` → **matérialise `opportunities`/`tasks`** | LLM + CRM |
| **Pitch** | `result_type='pitch'` (P5) + `metadata.pitches[]` legacy | LLM |

Le **Scoring n'est pas une phase LLM** : c'est la fonction déterministe de l'ADR-0007. L'onglet affiche le **breakdown par facette** (potentiel · signaux · fit secteur · contacts · urgence − risques), jamais un nombre opaque.

### 4. Contrat `content_json` typé — **faits vs hypothèses vs inférences**

Chaque claim porte sa provenance :

```ts
type Claim<T> = {
  value: T
  kind: "fact" | "hypothesis" | "inference"
  confidence: number        // 0–1
  source?: string
  detected_at?: string
}
```

Schémas **Zod versionnés in-repo** (`lib/intelligence/schemas.ts`, conforme 0007 « prompts et schémas Zod dans le repo »), validés au callback : JSON non conforme → `failed` + log, **jamais stocké cassé**. La distinction fait/hypothèse/inférence est rendue visuellement (crédibilité commerciale = condition d'usage réel).

### 5. Orchestration — inchangée (hybride durcie ADR-0007)

`POST route = création run (queued)` → **worker n8n** (tâche > 300 s) → **callback HMAC** (client service-role, `workspace_id`/`owner_id` écrits explicitement, **upsert idempotent** sur `(run_id, phase)`, validation Zod) → **UI polling / Realtime** lit les `results`. Jamais de LLM long en route synchrone.

### 6. Composants propres au Hub

Le template dashboard générique (`SectionDashboardConfig/Data`) ne sait pas rendre matrice / breakdown / roadmap-board. Le Hub a donc ses composants dédiés : `ClientIntelligenceHeader · ClientKpiStrip · SignalDigestPanel · PainPointMatrix · OfferMatchMatrix · ProspectScoreBreakdown · CommercialRoadmapBoard · PitchCreatorPanel · IntelligenceRightRail`. **Mobile** = cartes synthétiques + actions (Appeler / Mail / Générer pitch / Rafraîchir) ; **pas de matrice masquée en CSS**.

## Options considérées

| Dimension | Schéma 14 tables (ChatGPT) | **Réutilisation moteur 0007 + 1 référentiel (retenu)** |
|---|---|---|
| Source de vérité | Multiple (colonnes éclatées) | Une (`content_json` indexé GIN) |
| Cohérence ADR | ❌ contredit 0007 | ✅ prolonge 0007 |
| Idempotence runs | ❌ perdue | ✅ `UNIQUE(run_id,phase)` |
| Coût maintenance (solo) | Élevé (14 tables + migrations) | Minimal (1 table référentiel) |
| Matrice enjeux×offres | table `account_offer_matches` | `content_json` ⨝ `offers` |

| Surface | Drawer seul (0007 Lot 2) | Page `/comptes/[id]` (ChatGPT) | **Page `/prospection/accounts/[id]` + drawer Quick View (retenu)** |
|---|---|---|---|
| Densité cockpit | ❌ trop petit | ✅ | ✅ |
| Cohérence routing KREDO | ✅ | ❌ `/comptes` inexistant | ✅ sous le module existant |
| Aperçu rapide depuis liste | ✅ | ⚠️ perdu | ✅ (drawer conservé) |
| Deep-link (K-013) | ❌ | ✅ | ✅ |

## Conséquences

- ✅ KREDO reste **propriétaire** du modèle (0007) ; le Hub n'est qu'une couche de présentation/action remplaçable.
- ✅ Page deep-linkable, faits/hypothèses tracés, **boucle CRM** (roadmap → opportunités/tâches réelles) = le vrai différenciateur.
- ✅ Dette schéma quasi nulle : **un seul ajout** (`offers`), aligné sur le pattern `skills`.
- ⚠️ La V1 lecture dépend de la **fraîcheur des phases** ; le **fallback `metadata` FOLIO** couvre P1/P2/pitchs existants en attendant les workers autonomes.
- ⚠️ **Échelle de score à trancher** (1–10 ADR-0007 vs `/5` UI actuelle) au lot Scoring — sinon la jauge ment.
- 🔄 À revisiter : extraire une table `signals` (ou `ai_intelligence_sources`) **si** la veille devient un flux à cycle de vie par-signal (statut, dédup, archivage) — YAGNI tant que ça n'existe pas.

## Séquence d'implémentation (lots A → I)

> Pré-requis acquis : 0007 Lot 1 (schéma) **fait** · P1 FOLIO importée · drawer affiche P1.

| Lot | Contenu | Definition of Done |
|-----|---------|--------------------|
| **A** | Route `/prospection/accounts/[companyId]` (index/Desktop/Mobile) · onglets **Accueil + Analyse** lisant `content_json` *ou* fallback `metadata` · fraîcheur + sources · drawer → CTA cockpit | Page deep-linkable, P1+P2 existantes affichées, 0 mock, RLS OK |
| **B** | Migration `007_offers.sql` (référentiel + RLS standard) + seed lignes de service ESN + matrice en lecture | `offers` peuplé, jointure libellé OK |
| **C** | `lib/intelligence/` (Zod + data layer) · `app/api/intelligence/run` (POST/GET) · Realtime · bouton « Rafraîchir l'analyse » · idempotence | Un run `queued→running→succeeded`, UI suit |
| **D** | Worker n8n **Phase 2 sectorielle mutualisée** + callback durci → **autonomie FOLIO** | P2 générée hors FOLIO, validée Zod |
| **E** | **Scoring déterministe versionné** → `companies.ai_score` (trancher 1–10 vs /5) + onglet Breakdown + tri liste | Score reproductible + explication par facette |
| **F** | Onglet **Opportunités** : `PainPointMatrix` + `OfferMatchMatrix` (P3 ⨝ `offers`) + cartes opportunités priorisées | Matrice live, sourcée |
| **G** | Onglet **Roadmap** (P4) éditable **+ matérialisation `opportunities`/`tasks`** | Une étape crée une opportunité/tâche réelle |
| **H** | Onglet **Pitch** (P5) : atelier (persona/objectif/angle/offre/ton) + historique + copier/éditer/sauver | Génération contextualisée + historisée |
| **I** | **Feeders de fond** : Veille & Scan contacts = cron n8n → `results`/signaux, surfacés Accueil/Analyse | Signaux frais alimentent scoring/pitch |

## Action items

1. [ ] Lot A : route `[companyId]` + `index/DesktopView/MobileView` + `lib/intelligence/intelligence-data.ts` (lecture vue + results + fallback metadata).
2. [ ] Drawer `CompanyIdentityDrawer` → Quick View + CTA « Ouvrir le cockpit ».
3. [ ] Lot B : migration `007_offers.sql` + seed + `npm run db:types`.
4. [ ] `lib/intelligence/schemas.ts` (contrat `Claim` + schémas Zod par phase).
5. [ ] Trancher l'échelle de score (1–10 vs /5) avant le lot Scoring.
6. [ ] Tickets backlog `K-060 → K-068`.
