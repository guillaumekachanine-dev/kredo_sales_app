# ADR-0018 : Refonte du Shell de navigation desktop — rail de section, arborescence à 12 modules

**Statut :** Proposé
**Date :** 2026-08-06
**Décideur :** Guillaume Kasanin
**Amende :** ADR-0005 (navigation à deux étages) — le principe est conservé, le **rendu de l'étage 2** change.
**Périmètre :** **desktop uniquement.** Le mobile fait l'objet d'une refonte séparée (cf. D-14).

> 📘 **Suivi d'exécution :** [SHELL-0018 — Ledger d'implémentation](../handoffs/SHELL-0018-implementation-ledger.md).
> Cet ADR fige les décisions ; le ledger porte l'état d'avancement, l'inventaire du code, les pièges
> et le journal des lots. Tout agent intervenant sur ce chantier commence par le ledger.

---

## 1. Contexte

### 1.1 L'hétérogénéité, chiffrée

L'audit du code (2026-08-06) établit qu'il n'existe pas *un* système d'onglets mais **quatre**, plus une barre d'entités :

| # | Mécanisme | Implémentation | Pages | Sort |
|---|---|---|---|---|
| **A** | Onglets routés horizontaux | `SectionNavBar` + `main-menu.config.ts:tabs` via `SectionNavBarSlot` | `/missions`, `/consultants` | **supprimé** |
| **B** | Onglets client-state horizontaux | `FinanceTabs`, `AutomationsTabs` | `/finance`, `/automations` | **supprimé** |
| **C** | Rail vertical gauche client-state | **5 copies quasi-identiques** | fiche compte, `/intelligence`, `/veille`, `/reports`, `/automations` | **généralisé** |
| **D** | Barre d'entités ouvertes | `SectionTabBar`, `CrmSectionTabBar`, `StaffingSectionTabBar` + stores Zustand | CRM, Besoins, Missions/Projets | **conservé intact** |
| **E** | Modules en modale | `IntelligenceSplitModalShell` + navs internes | Activité commerciale, Métriques, Documents, Études, Playbooks | **registre unifié** |

Le mécanisme C est déjà cloné **5 fois avec une chaîne de classes strictement identique** :

```
src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.tsx       ← référence
src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.tsx
src/components/veille/VeilleLocalNavigation.tsx
src/components/automations/AutomationsLocalNavigation.tsx
src/components/reports/ReportsDesktopView.tsx  (l.238, clone inline non extrait)
```

`flex h-full w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5` — au byte près. Trois d'entre eux recopient en plus le même bouton « CRM Launcher ».

**Le composant partagé n'est pas à inventer : il est à extraire.**

### 1.2 Autres constats d'audit

- `SectionNavBarSlot` est monté dans **7 layouts**, utile dans **2** (5 rendent toujours `null`).
- **5 pages replient de force** le menu principal via `useSidebarCollapse.requestCollapse()` — et **désactivent son bouton toggle** (`DesktopSidebar.tsx:162,218`). La promesse « deux moyens de déplier » est donc déjà fausse aujourd'hui sur ces pages.
- **42 routes** existent, **~20** sont atteignables depuis la navigation.
- Budget de chrome à 1440 px si les trois rails coexistent : `64 + 184 + 320 = 568 px`, soit **39 % de l'écran** perdu.
- Tokens `--color-edito-*` définis **globalement** dans `@theme` (`globals.css:191-204`), donc portables hors thème. Mais `--color-edito-canvas: #F8FAFC` (gris froid) vs `--color-canvas: #F4F2ED` (ivoire chaud).

### 1.3 Objectifs

1. Harmoniser la structure des pages.
2. Supprimer l'hétérogénéité (5 mécanismes → 1).
3. Rendre la navigation évidente et accessible.
4. Améliorer la segmentation fonctionnelle.
5. **Augmenter la surface d'affichage utile.**

---

## 2. Décision

### 2.1 Le système à trois étages (desktop)

```
┌──────────┬────────────────┬──────────────────────────────────────────┐
│ Étage 1  │   Étage 2      │  Étage 3 (optionnel, CRM/Besoins/Missions)│
│ Menu     │  Rail de       │  Barre de fiches ouvertes                 │
│ principal│  section       ├──────────────────────────────────────────┤
│ (navy)   │  SectionRail   │                                           │
│ REPLIÉ   │  11.5rem       │            Contenu du chapitre            │
│ 4rem     │                │            (pleine largeur)               │
└──────────┴────────────────┴──────────────────────────────────────────┘
```

### 2.2 Les trois primitives à construire une fois

Tout le chantier tient dans trois composants génériques + de la configuration. **Aucun module ne réimplémente sa navigation.**

| Primitive | Rôle | Remplace |
|---|---|---|
| **`SectionRail`** | Étage 2 : bouton d'accueil navy + section « Chapitres » + section « Modules » | 5 clones + `SectionNavBar` + `FinanceTabs` + `AutomationsTabs` |
| **`EntityLauncher`** | Palette de recherche d'entité → action paramétrable | `CRM Launcher` (×3) + `Library Launcher` + `MobileAccountQuickSearch` |
| **`ModuleRegistry` + `ModuleHost`** | Registre déclaratif des outils modaux, montage à la demande | 45 montages ad hoc de modales |

### 2.3 Anatomie normative du `SectionRail`

Reprise **stricte** de `ClientIntelligenceSidebar` (référence visuelle validée) :

```
┌─ w-[11.5rem] ────────────────────┐
│ [ Bouton navy — accueil module ] │  min-h-10, bg navy, texte blanc bold
│                                  │
│ ─ ligne de démarcation ───────── │  border-t
│ (ligne autonome facultative)     │  ← ex. « Synthèse » sur Comptes & contacts
│                                  │
│ CHAPITRES                        │  10px bold uppercase tracking .12em muted
│ ▍ ◫ Chapitre actif               │  border-l-2 brass + bg surface + navy
│   ◫ Chapitre                     │  border-l-transparent + muted
│                                  │
│ ─ ligne de démarcation ───────── │
│ MODULES                          │  même traitement typographique
│   ◫ Outil modal                  │
└──────────────────────────────────┘
```

Le rail supporte des **sections nommées** (`Account Intelligence`, `Adressage`) : même traitement typographique que « Chapitres ».

### 2.4 Contrat de données

`src/lib/navigation/section-rail.config.ts` — **100 % client-safe**, zéro import `server-only` / Supabase / `next/headers` (cf. R5).

```ts
export type RailEntry = {
  key: string
  label: string
  icon: RailIconKey
  href: string                     // toujours une route (D-2)
  badge?: "soon"
}

export type RailToolEntry = {
  key: string
  label: string
  icon: RailIconKey
  module: ModuleKey                // résolu par le ModuleRegistry
}

export type RailSection = {
  title?: string                   // undefined → section sans titre
  entries: RailEntry[]
}

export type SectionRailDescriptor = {
  moduleKey: string
  moduleLabel: string
  home: { label: string; href: string }   // bouton navy
  standalone?: RailEntry[]                // lignes sous la démarcation, hors section
  sections: RailSection[]                 // « Chapitres » ou sections nommées
  tools: RailToolEntry[]                  // section « Modules »
}

/** Résolution contextuelle : certains modules (Comptes & contacts) ont
 *  plusieurs descripteurs selon l'entité ouverte. */
export function resolveRailDescriptor(pathname: string): SectionRailDescriptor | null
```

**Deux modes de montage :**

- **`SectionRailHost`** — monté une fois dans `AppShell` (desktop), résout le descripteur depuis `usePathname()`. Remplace `SectionNavBarSlot`.
- **`SectionRail`** — présentationnel pur, monté directement par une page plein écran qui gère son propre contexte (fiche compte).

### 2.5 Règles normatives

| # | Règle |
|---|---|
| **N-1** | Le rail est rendu si et seulement si `chapitres + modules ≥ 2`. Sinon la page est pleine largeur. |
| **N-2** | **Aucune imbrication de chapitres.** Un besoin de sous-navigation se traite par un contrôle segmenté *dans* la page, jamais par un troisième niveau de rail (leçon ADR-0005). |
| **N-3** | Un chapitre est **toujours une route**. Pas de `useState` de navigation. |
| **N-4** | Quand `SectionRail` est monté, `IntelligencePanel` est en **overlay**, jamais en sibling flex. |
| **N-5** | Aucune page « Synthèse » n'est créée sans agrégat de données **réel et existant**. Interdiction absolue de KPI décoratif (précédents : `mockAutomationsDashboardData`, modale rapport factice). |
| **N-6** | **Cockpit** = priorités transverses inter-modules. **Synthèse de module** = pilotage intra-module, 3 questions max, zéro contenu cross-module. |
| **N-7** | Un outil modal est déclaré **une fois** dans le `ModuleRegistry` et peut être monté depuis N rails avec un `scope` différent. Jamais de clone. |
| **N-8** | Une surface de priorisation n'existe que si elle a un **horizon temporel propre** (cf. D-11). |

### 2.6 Comportement du menu principal

| Déclencheur | Mode | Persisté | Délai |
|---|---|---|---|
| Bouton toggle | **push** (le contenu se décale) | ✅ cookie `kredo_sidebar_collapsed` | — |
| Survol du rail replié | **overlay** (le contenu ne bouge pas) | ❌ | ouverture **500 ms** / fermeture **300 ms** |
| `focus-within` (clavier) | **overlay** | ❌ | immédiat |

**Défaut : replié.** `AppShell.tsx:35` passe de `cookie === "true"` à `cookie !== "false"` — les utilisateurs ayant explicitement déplié conservent leur préférence.

**Garde-fous obligatoires :**
1. `@media (hover: hover) and (pointer: fine)` — jamais sur tactile.
2. `prefers-reduced-motion: reduce` → bascule instantanée.
3. Fermeture sur changement de route et sur `Escape`.
4. Timers en **variables locales à l'effet**, jamais en state/ref (pièges `AccountScanDialog` S23, `use-run-journal-realtime` S30).
5. `--motion-rail-hover-delay` / `--motion-rail-leave-delay` en tokens.

> Le garde-fou « suppression pendant un drag » devient sans objet : le Kanban est supprimé (D-13).

**Suppression de `use-sidebar-collapse`** : le store, ses 5 appelants (`BusinessIntelligenceDesktop`, `VeilleActualitesDesktop`, `CrmTabbedShell`, `ReportsDesktopView`, `IntelligencePanel`) et son test. Le replié devenant le défaut global, il n'a plus d'objet — il ne fait plus que casser le toggle.

### 2.7 Tokens

Indirection posée dans `globals.css`, valeurs identiques à la référence dès le jour 1 :

```css
--color-rail-canvas:  var(--color-edito-canvas);
--color-rail-surface: var(--color-edito-surface);
--color-rail-border:  var(--color-edito-border);
--color-rail-navy:    var(--color-edito-navy);
--color-rail-brass:   var(--color-edito-brass);
--color-rail-muted:   var(--color-edito-muted);
```

Rendu conforme à la demande « scrupuleusement identique ». Si la jonction ivoire/gris-froid jure une fois posée, la correction coûte une ligne au lieu d'un refactor.

---

## 3. Arborescence cible — normative

### 3.1 Menu principal (étage 1)

**12 modules + Paramètres.** Suppression du groupe « Ressources ».

| Groupe | Modules |
|---|---|
| **Général** | Cockpit · Agenda |
| **CRM** *(D-4)* | Comptes & contacts *(accueil du groupe)* · Besoins & staffing · Engagements · Profils & expertises |
| **Intelligence** | Business Intelligence · Prospection *(nouveau)* · Rapports & rédaction · Veille & actualité |
| **Finance** | Finance |
| **Outils** | Knowledge Hub · Automatisations |
| — | Paramètres |

Suppressions : groupe « Ressources » ; groupe « Commerce » (absorbé par « CRM ») ; module « Recrutement » (absorbé par Besoins & staffing).

### 3.2 Détail par module

Légende : ✅ existe · 🔀 déplacement · 🆕 à créer · ⚙️ nécessite un workflow n8n ou une RPC

#### Cockpit — **hors périmètre**, page unique, pas de rail.

#### Agenda
| Accueil | Chapitres | Modules |
|---|---|---|
| **Mon agenda** ✅ — calendrier à **calques** (D-5) : événements · jalons opportunités (`get-opportunities-planning`) · jalons prestations (`get-active-missions-planning`) | Production & congés 🆕 (données ✅ `collaborator_absences`, `mission_activity_reports`) | Brief hebdomadaire ✅ · Priorisation des actions 🆕 · Métriques de l'activité ✅ (`CommercialActivityModal`) |

#### Comptes & contacts — **rail contextuel** (D-8)
**État « liste »** — accueil : *Liste des comptes* ✅. Aucune section « Chapitres » ni « Synthèse » (D-9).

**État « compte ouvert »** :
| Accueil | Section *Account Intelligence* | Section *Adressage* | Modules |
|---|---|---|---|
| **Liste des comptes** ✅ | Entreprise ✅ · Contacts 🆕 · Secteur ✅ · Actualité 🆕 (données ✅ `account_signals`, `account_watch_settings`) · Enjeux ✅ | Historique 🆕 · Stratégie ✅ (à augmenter) · Roadmap ✅ | Consulter les documents ✅ · Études ✅ · Playbook 🆕 (v2 interactive) |

> **Conséquence de D-9 à arbitrer au moment du lot :** l'onglet « Accueil » actuel du cockpit compte (`ClientIntelligenceHomeTab`) n'a plus d'entrée dans le rail. L'ouverture d'un compte atterrit sur **Entreprise**. Son contenu est soit redistribué dans les chapitres existants, soit supprimé — décision différée, aucune suppression avant arbitrage.

#### Besoins & staffing — `landing: first-chapter`
| Accueil | Chapitres | Modules |
|---|---|---|
| **Liste opportunités** ✅ | Planning des opportunités ✅ (`get-opportunities-planning.ts`) · Sourcing & recrutement 🔀 (fusion `/recruitment`, cf. D-12) | Priorisation du pipeline 🆕 · Matching CV ✅ (S27 Lot 1) · Modélisation financière ✅ · Rapport d'activité ✅ |

#### Engagements
| Accueil | Chapitres | Modules |
|---|---|---|
| **Vue d'ensemble** ✅ (ex-« Synthèse ») | Missions ✅ · Projets ✅ · Planning des prestations ✅ (`/missions/planning`, orphelin réintégré) · Activité & congés 🔀 (depuis Équipe) | à définir |

#### Profils & expertises (ex-Équipe)
| Accueil | Chapitres | Modules |
|---|---|---|
| **Synthèse** 🆕 | Collaborateurs ✅ (ex-« Synthèse ») · Pool de compétences ✅ | à définir |

> « Activité & congés » **retiré ici** — il part vers Engagements (D-6).

#### Business Intelligence
| Accueil | Chapitres | Modules |
|---|---|---|
| **Analyse** 🆕⚙️ | Secteurs ✅ · Fenêtres d'opportunités 🔀⚙️ (extension de `SectorWindowsTimeline`, cf. D-10) · Potentiel 🆕 | *(études & playbooks migrent vers Prospection › Ressources)* |

#### Prospection — **module entièrement nouveau**
| Accueil | Chapitres | Modules |
|---|---|---|
| **Brief** 🆕⚙️ | Plan d'actions 🆕 · Suivi & résultats 🆕 | Analytics 🆕 · Ressources 🆕 (études + playbooks + cockpits comptes) |

#### Rapports & rédaction
| Accueil | Chapitres | Modules |
|---|---|---|
| **Bibliothèque** ✅ | Génération 🆕 · Cas d'usage 🆕 | Analytics 🆕 · Library Launcher 🆕 |

> Suppression de l'onglet « Historique » ✅→❌ (code + nav).

#### Veille & actualité
| Accueil | Chapitres | Modules |
|---|---|---|
| **Actualités** ✅ (dernier digest) | Veille ✅ (ex-« Comptes surveillés ») · Analyse 🔀🆕⚙️ (actualités ✅ + sectorielle 🆕) | Analytics 🆕 · Sources 🆕 · CRM Launcher ✅ |

#### Finance
| Accueil | Chapitres | Modules |
|---|---|---|
| **Dashboard** 🆕 | Pilotage 🆕 · Rentabilité 🔀 · Prévisions ✅ | Modélisation financière ✅ · Business Review 🆕 |

#### Knowledge Hub — **hors périmètre** (traité ultérieurement).

#### Automatisations
| Accueil | Chapitres | Modules |
|---|---|---|
| **Exécutions** ✅ (ex-« Journal d'exécution ») | Santé des workflows ✅ · Coûts ✅ · Nomenclature & accès 🆕 | Analytics ✅ · Simulation de cadence ✅ |

### 3.3 Le chiffrage qui doit cadrer les attentes

| | Aujourd'hui | Cible | Dont à créer |
|---|---|---|---|
| Modules (étage 1) | 13 | **12** | 1 (Prospection) |
| Destinations navigables (accueils + chapitres) | ~20 | **43** | **~16** |
| Outils modaux déclarés | ~8 (ad hoc) | **21** (registre) | **~10** |

Plus **2 workflows n8n** (BI › Analyse, Veille › Analyse sectorielle) et **au moins 1 RPC d'agrégation** (Fenêtres d'opportunités).

> **Ce chantier n'est pas un refactor de shell : c'est un doublement de la surface produit.** La refonte du Shell (Phase 1-2) et la construction du contenu (Phase 3-5) sont deux projets avec un rapport d'effort de l'ordre de 1 à 4. Le Shell doit livrer d'abord, homogène et honnête, avec des états « à venir » explicites — jamais de donnée factice (N-5).

---

## 4. Décisions

| # | Décision | Statut |
|---|---|---|
| **D-1** | Le rail de section (`SectionRail`) remplace intégralement les mécanismes A, B et C. | ✅ validé |
| **D-2** | Les chapitres sont des **routes**, pas du state client. | ✅ validé |
| **D-3** | La barre de fiches ouvertes (mécanisme D) est conservée intacte sur Comptes & contacts, Besoins & staffing, Missions, Projets. | ✅ validé |
| **D-4** | Les groupes « Ressources » **et** « Commerce » sont supprimés. Un groupe unique **`CRM`** regroupe Comptes & contacts *(accueil)*, Besoins & staffing, Engagements, Profils & expertises. `Delivery` écarté. | ✅ **tranché 2026-08-06** |
| **D-5** | Agenda = **2 destinations** : « Mon agenda » (calendrier à calques : événements + jalons opportunités + jalons prestations) et « Production & congés ». Les plannings ne sont pas dupliqués en chapitres. | ✅ **tranché 2026-08-06** |
| **D-6** | « Activité & congés » vit **une seule fois**, dans Engagements. Retiré de Profils & expertises. La vue individuelle reste dans `ConsultantDrawer`. La lecture financière reste dans Finance › Rentabilité. | ✅ **tranché 2026-08-06** |
| **D-7** | Le breadcrumb (`Breadcrumb.tsx`, `breadcrumb-store`) et la bande d'en-tête sont supprimés pour gagner de la hauteur. | ✅ validé |
| **D-8** | Le descripteur de rail est **contextuel à l'entité** pour Comptes & contacts (état liste / état compte ouvert). | ✅ acté |
| **D-9** | **Aucune page « Synthèse »** sur Comptes & contacts, ni au niveau module ni au niveau compte. L'ouverture d'un compte atterrit sur « Entreprise ». Sort de `ClientIntelligenceHomeTab` différé (cf. §3.2). | ✅ **tranché 2026-08-06** |
| **D-10** | « Fenêtres d'opportunités » est un **chantier data autonome** (RPC d'unification de 5 sources), pas une tâche de shell. Le Shell livre avec `SectorWindowsTimeline` existant ; l'unification suit. | ⚠️ à confirmer |
| **D-11** | Une seule autorité de priorisation : le moteur de score ADR-0011 (`account_score_current`). Les surfaces s'en distinguent par leur **horizon** : Cockpit = aujourd'hui · Prospection › Brief = la semaine · BI › Potentiel = structurel · BI › Analyse = tendance. Sans horizon propre, une surface n'est pas créée. | ⚠️ à confirmer |
| **D-12** | « Sourcing & recrutement » présente **deux funnels distincts et jamais fusionnés** : recrutement interne (`candidate_hiring_processes`) et positionnement sur besoin (`opportunity_candidates`) — séparation déjà actée par `get_activity_recruitment_facts` (S19). | ✅ acté |
| **D-13** | Le mode Kanban est supprimé de toutes les pages. `HIRING_KANBAN_STAGES` est **conservé** (consommé par `ActivityRecruitmentReportView` et `recruitment-margin-rules`), mais l'avancement d'étape passe d'un drag à un **contrôle inline** dans la liste. | ✅ validé |
| **D-14** | La navigation mobile fait l'objet d'une refonte séparée. Le mécanisme `MobileSectionRail` est appelé à disparaître : **`main-menu.config.ts:tabs` et ses affiliés mobiles peuvent être supprimés** sans précaution de compatibilité. | ✅ validé |
| **D-15** | Les 22 routes orphelines ne sont **pas supprimées** dans ce chantier. Elles restent accessibles par URL directe, hors navigation, jusqu'à arbitrage. | ✅ validé |
| **D-16** | **L'ouverture d'un compte atterrit sur son « Accueil » de cockpit** (`ClientIntelligenceHomeTab`), rendu comme ligne autonome du rail (`standalone`), sous le bouton navy « Liste des comptes » qui reste la sortie. **Amende D-9**, qui prévoyait un atterrissage sur « Entreprise ». **Clôt la question ouverte** sur le sort de `ClientIntelligenceHomeTab` : il est conservé et promu, ni redistribué ni supprimé. | ✅ **tranché 2026-08-07** |
| **D-17** | Rail du compte ouvert : **4 + 4 + 2**. *Account Intelligence* = Entreprise · Secteur · Enjeux · Actualités (« Contacts » est **fusionné dans Entreprise**, il n'est plus un chapitre). *Adressage* est renommé **« Stratégie »** = Relation commerciale · Fenêtres d'opportunités · Approches commerciales *(ex-chapitre « Stratégie », renommé pour lever la collision avec le nom de la section)* · Roadmap. *Modules* = Bibliothèque de documents · Playbook du compte. Le module « Études » sort du rail compte (il reste accessible via l'onglet Secteur et Prospection › Ressources). | ✅ **tranché 2026-08-07** |
| **D-18** | **« Fenêtres d'opportunités » est une vue dérivée d'`account_issues`** (`urgence_calculée ≥ 4` **et** `kredo_fit ≥ 3`), pas une RPC d'unification de 5 sources. Les 5 sources convergent en amont dans `account_issues` via `intel-031 v2`. Le chapitre BI est le **même filtre à la portée portefeuille** — un calcul, deux scopes (N-7). **Allège D-10** : le chantier data se réduit à la convergence amont, déjà nécessaire pour l'onglet Enjeux. | ✅ **tranché 2026-08-07** |

> **Cadrage fonctionnel associé :** [CADRAGE-ENJEUX-PLAYBOOK-COMPTE.md](../intelligence/CADRAGE-ENJEUX-PLAYBOOK-COMPTE.md) — inventaire mesuré des 6 gisements d'« enjeux », classification proposée (2 niveaux · 4 origines · 3 axes · 3 scores dont 1 calculé), architecture d'`intel-031 v2`, rendu de l'onglet Enjeux, et étude de faisabilité du Playbook du compte. Ce document ne porte aucune décision de Shell ; il fournit la clarification exigée par l'action item #2 ci-dessous.

---

## 5. Options écartées

### Option A — Conserver la barre horizontale et se contenter d'unifier son style
| Dimension | Évaluation |
|---|---|
| Complexité | Faible |
| Surface gagnée | ~0 |
| Scalabilité | Mauvaise — au-delà de 5-6 chapitres la barre déborde ou se compacte |

Rejetée : la cible compte des modules à 5+ chapitres **plus** une section Modules, impossible à loger horizontalement.

### Option B — Rail secondaire dépliable en *push* au survol
Rejetée : le survol accidentel du bord gauche relayoute `DataTable`, SVG (`PnlBarChart`, `CostTimelineChart`) et vues denses, avec déplacement du contenu sous le curseur. L'overlay supprime le problème sans rien coûter.

### Option C — Migrer les onglets vers les 5 rails existants sans extraire de primitive
Rejetée : reviendrait à faire le travail 5 fois et à figer la duplication. L'extraction est le **premier** lot.

### Option D — Créer les 8 pages Synthèse d'un bloc
Rejetée : le repo compte deux précédents de surfaces factices supprimées après coup (`mockAutomationsDashboardData`, modale « Créer un rapport d'activité »). Gate N-5.

---

## 6. Risques

| # | Risque | Sévérité | Mitigation |
|---|---|---|---|
| **R1** | **Cassure des conteneurs de scroll.** Les 7 layouts sont `flex flex-col h-full overflow-hidden` avec barre en haut. Le passage à un flex horizontal à rail pleine hauteur change le conteneur de défilement de chaque page. Invisible pour `tsc` et les tests. | 🔴 | Migration **module par module**, un commit par module, checklist scroll systématique |
| **R2** | **Frontière client/serveur.** `section-rail.config.ts` sera importé par des composants client ; tout import de *valeur* depuis un module `server-only` casse `next build` sans que `tsc` bronche. **Déjà survenu 2×** (`VEILLE_RUNS_PER_MONTH` S24, `JOURNAL_LIMIT` S30). | 🟠 | Config 100 % client-safe ; `npm run build` à **chaque** lot, jamais `tsc` seul |
| **R3** | **Effet de survol mal keyé** → destruction/recréation du timer à chaque render. | 🟠 | Timers en variables locales à l'effet ; effet dépendant du seul `isCollapsed` ; test unitaire de la machine de délai |
| **R4** | **Régression du panneau Intelligence** à la suppression de `use-sidebar-collapse` (il en est appelant). | 🟠 | Store + test + 5 appelants supprimés dans **le même commit** |
| **R5** | **Explosion du périmètre.** ~14 chapitres et ~12 modules à créer : la tentation de tout livrer en même temps que le Shell. | 🔴 | Phasage strict §7 ; le Shell livre sur des chapitres **existants**, les nouveaux arrivent après |
| **R6** | **Recouvrement Cockpit / Prospection › Brief / BI › Analyse / BI › Potentiel** — quatre surfaces répondant à « qui adresser ? ». | 🔴 | Règle N-8 + D-11 (horizons distincts, autorité unique) |
| **R7** | **Prospection › Plan d'actions réimplémente le cockpit compte** (contacts, pitchs, enjeux, matrice offres, playbook, actualités = contenu de l'onglet Stratégie ×3 comptes). | 🟠 | Plan d'actions = **sélecteur + digest + deep-links** vers les chapitres du compte. Jamais de réimplémentation |
| **R8** | **Données sectorielles insuffisantes** pour « Fenêtres d'opportunités » : 27/95 comptes ont un `sector_id` ; 13 items réglementaires, 22 pain points, 15 events, 7 news. La timeline sera vide pour ~70 % du portefeuille. | 🟠 | Inclure `account_signals` (745 lignes) comme source *account-scoped* ; afficher explicitement la couverture |
| **R9** | **Suppression du Kanban** : `updateHiringStep` et l'avancement d'étape n'ont plus d'UI. | 🟡 | Contrôle inline de changement d'étape livré **dans le même lot** que la suppression |
| **R10** | **Tests à adapter** : `main-menu.config.test.ts`, `ClientIntelligenceSidebar.test.ts`, `business-intelligence-layout-contracts.test.ts`, `use-sidebar-collapse.test.ts`. Base : **837 tests verts**. | 🟡 | Adapter, ne pas supprimer les assertions de contrat |
| **R11** | **Pas de Chrome DevTools MCP** en session → aucune QA visuelle automatisable côté agent. | 🟡 | QA navigateur par Guillaume à chaque lot, ou prise de contrôle Chrome explicite |

---

## 7. Roadmap

Gates constants à chaque lot : `tsc --noEmit` · **`npm run build`** · `vitest run` (≥837) · `eslint` sur les fichiers touchés · `check:server-boundary` · QA visuelle desktop.

### Phase 1 — SHELL (le chantier de cet ADR)

| Lot | Contenu | Effort | Risque |
|---|---|---|---|
| **1.0** | **Contrats.** `section-rail.config.ts` (12 descripteurs), `ModuleRegistry`, `rail-icons.tsx`, tokens `--color-rail-*`. Zéro UI. | 0,5 j | 🟢 |
| **1.1** | **Extraction.** `SectionRail` + `SectionRailHost`. Les **5 clones** deviennent consommateurs. **Aucun changement visuel.** −450 lignes. | 1 j | 🟢 |
| **1.2** | **Menu principal.** Replié par défaut · overlay hover 500/300 ms · `focus-within` · garde-fous · **suppression de `use-sidebar-collapse`** + 5 appelants. | 1 j | 🟠 R3/R4 |
| **1.3** | **Migration des modules routés.** Engagements + Équipe : `SectionNavBar` → rail. Suppression de `SectionNavBarSlot` des 7 layouts. Suppression de `main-menu.config.ts:tabs` (D-14). | 1,5 j | 🔴 R1 |
| **1.4** | **Migration des modules client-state → routes.** Finance, Automations, Veille, BI, Rapports. Bénéfice perf : chargement serveur du seul chapitre actif. | 3 j | 🔴 R1/R2 |
| **1.5** | **Section Modules + `EntityLauncher`.** Registre branché sur les modales existantes ; `CRM Launcher`/`Library Launcher` unifiés ; retrait des boutons dispersés. | 1,5 j | 🟢 |
| **1.6** | **Nettoyage.** Suppression du breadcrumb et de la bande d'en-tête (D-7) · suppression du Kanban + contrôle d'étape inline (D-13) · suppression `/reports` › Historique · code mort. | 1,5 j | 🟠 R9 |

**Sous-total Phase 1 : ~10 j.** À l'issue : app homogène, surface maximisée, **zéro page nouvelle**.

### Phase 2 — RÉORGANISATION (déplacements, sans création)

| Lot | Contenu | Effort |
|---|---|---|
| **2.1** | Menu principal cible : suppression du groupe Ressources, `Delivery`, renommages (Équipe → Profils & expertises, Synthèse → Vue d'ensemble, Journal → Exécutions, Comptes surveillés → Veille). | 0,5 j |
| **2.2** | `/recruitment` → Besoins & staffing › Sourcing & recrutement (D-12). | 2 j |
| **2.3** | Activité & congés : Équipe → Engagements (D-6). Réintégration de `/missions/planning`. | 1 j |
| **2.4** | Comptes & contacts : rail contextuel (D-8), sections nommées, renommage Accueil → Synthèse. | 1,5 j |

**Sous-total Phase 2 : ~5 j.** À l'issue : arborescence cible en place, contenus existants à leur place définitive.

### Phase 3 — SYNTHÈSES (gate N-5, audit d'agrégats préalable)
Profils & expertises, Finance › Dashboard, Automatisations, BI, Veille, Rapports — **uniquement là où la donnée existe.** ~3-5 j.

### Phase 4 — NOUVEAUX MODULES & CHAPITRES
Prospection (module complet) · Analytics unifié (×4 scopes) · Rapports › Génération & Cas d'usage · Automatisations › Nomenclature · Finance › Pilotage & Business Review · Comptes › Contacts, Actualité, Historique · Playbook v2. ~20-30 j.

### Phase 5 — CHANTIERS DATA (⚙️)
Fenêtres d'opportunités (RPC d'unification, R8) · BI › Analyse (workflow n8n) · Veille › Analyse sectorielle (workflow n8n) · Prospection › Brief (méthode de sélection des 3 comptes). ~10-15 j.

**Total indicatif : 50 à 65 j-h**, dont **~15 j pour la refonte du Shell proprement dite**.

---

## 8. Action items

1. [x] Trancher **D-4**, **D-5**, **D-6**, **D-9** — *fait le 2026-08-06*.
2. [ ] **Clarification fonctionnelle et métier page par page** — préalable exigé par le décideur avant toute écriture de code. Une passe par module, dans l'ordre du menu. → *passe « Comptes & contacts » faite le 2026-08-07 (D-16, D-17, D-18).*
3. [ ] Confirmer **D-11** (autorité unique de priorisation, horizons distincts). ~~D-10~~ → allégé par **D-18** le 2026-08-07.
4. [x] Arbitrer le sort de `ClientIntelligenceHomeTab` — *tranché le 2026-08-07 par **D-16** : conservé et promu en destination d'ouverture.*
5. [ ] Lot 1.0 — écrire `section-rail.config.ts` et `ModuleRegistry`. **Non démarré : attend l'instruction expresse.**
6. [ ] Audit d'agrégats disponibles par module, préalable à la Phase 3.
7. [ ] Amender ADR-0005 (statut : *Amendé par ADR-0018*).

> **Consigne du décideur (2026-08-06) :** aucun développement n'est engagé sans demande expresse. Le chantier procède **page par page**, en clarifiant d'abord les éléments fonctionnels et métier. Il est admis que certains modules manqueront et que certaines sections ne seront pas encore à leur emplacement final — l'objectif de la Phase 1 est de **bâtir les fondations**, pas de livrer la cible complète.
