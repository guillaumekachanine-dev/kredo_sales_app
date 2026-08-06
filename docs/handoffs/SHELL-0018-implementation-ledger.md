# SHELL-0018 — Ledger d'implémentation du chantier Shell

> **Ce fichier est la colonne vertébrale du chantier.** Il est le guide, le contrat et l'archive.
> Plusieurs agents (Claude Code, Codex, Gemini, développeurs humains) y interviendront successivement.
> Chacun doit pouvoir reprendre le travail du précédent **sans avoir participé aux phases antérieures**.
>
> **Dernière mise à jour :** 2026-08-07 · **Lot en cours :** aucun · **Statut global :** cadrage terminé, développement non engagé
> **Passes fonctionnelles faites** (action item #2 d'ADR-0018) : **Comptes & contacts** — 2026-08-07 (D-16, D-17, D-18 · [cadrage enjeux/playbook](../intelligence/CADRAGE-ENJEUX-PLAYBOOK-COMPTE.md))

---

## 0. À LIRE AVANT TOUTE ACTION — protocole agent

### 0.1 Séquence d'entrée obligatoire

Aucune ligne de code ne s'écrit avant d'avoir fait, dans cet ordre :

1. **Lire ce ledger en entier.** Il fait autorité sur l'état du chantier.
2. **Lire [ADR-0018](../adr/ADR-0018-refonte-shell-navigation-desktop.md)** — le contrat d'architecture (décisions, règles normatives, risques).
3. **Lire [l'arborescence cible](../ARBORESCENCE-NAVIGATION-CIBLE.txt)** — la cible fonctionnelle module par module.
4. **Vérifier le §10 (suivi des lots)** pour savoir quel lot est fait, en cours, ou suivant.
5. **Auditer le code réellement concerné par votre lot.** Ne jamais supposer : ce ledger est daté, le code bouge.
6. **Signaler tout écart entre ce ledger et le code réel AVANT de modifier quoi que ce soit**, et le consigner au §11.

### 0.2 Règles de continuité

| Règle | Détail |
|---|---|
| **Un lot à la fois** | On ne commence jamais le lot N+1 avant que le lot N soit `done` au §10. Aucun chantier parallèle. |
| **Une branche par lot** | `feat/shell-0018-XX-slug` (ex. `feat/shell-0018-01-section-rail`). Départ depuis un `main` contenant le lot précédent. |
| **Aucune réécriture d'historique** | Chaque agent **ajoute** son entrée au §10 et son rapport dans `docs/handoffs/SHELL-0018-lot-XX-report.md`. On ne réécrit jamais l'entrée d'un lot antérieur : une correction devient une note datée au §11. |
| **Ordre de la vérité** | Le code réel > ce ledger > l'ADR > l'arborescence texte. Si le code contredit un document, on corrige le document et on le signale. |
| **Consigne du décideur** | Guillaume Kasanin a explicitement demandé (2026-08-06) qu'**aucun développement ne démarre sans instruction expresse**, et que le chantier procède **page par page** avec clarification fonctionnelle et métier préalable. Ne pas anticiper sur les lots. |

### 0.3 Séquence de sortie obligatoire

À la fin de chaque lot :

1. Exécuter **toutes** les portes de validation du §3.3 et **coller les résultats réels** (jamais « OK » sans le chiffre).
2. Écrire `docs/handoffs/SHELL-0018-lot-XX-report.md` à partir du [modèle](SHELL-0018-lot-report-template.md).
3. Mettre à jour la ligne du lot au **§10**.
4. Consigner tout écart, dette ou limitation au **§11**.
5. Si une décision a été prise ou amendée : mettre à jour le **§9** *et* ADR-0018.
6. Ne **jamais** annoncer « terminé » si une porte de validation est rouge — annoncer `partial` ou `blocked` avec la raison.

---

## 1. Le chantier en une page

### 1.1 Le problème

L'application expose aujourd'hui **cinq mécanismes de navigation intra-module différents** — dont un rail latéral copié-collé **cinq fois avec une chaîne de classes identique au byte près**. La navigation est incohérente d'une page à l'autre, la barre d'onglets horizontale consomme de la hauteur, et le menu principal déplié consomme de la largeur.

### 1.2 La cible

Un système à **trois étages**, une seule implémentation par étage :

```
┌──────────┬────────────────┬──────────────────────────────────────────┐
│ Étage 1  │   Étage 2      │  Étage 3 (optionnel)                      │
│ Menu     │  Rail de       │  Barre de fiches ouvertes — INCHANGÉE     │
│ principal│  section       ├──────────────────────────────────────────┤
│ (navy)   │  SectionRail   │                                           │
│ REPLIÉ   │  11.5rem       │            Contenu du chapitre            │
│ 4rem     │                │            (pleine largeur)               │
└──────────┴────────────────┴──────────────────────────────────────────┘
```

**Tout le chantier tient dans trois primitives génériques plus de la configuration.** Aucun module ne réimplémente sa navigation.

| Primitive | Rôle | Remplace |
|---|---|---|
| `SectionRail` | Étage 2 : accueil + Chapitres + Modules | 5 clones + `SectionNavBar` + `FinanceTabs` + `AutomationsTabs` |
| `EntityLauncher` | Palette de recherche d'entité → action paramétrable | `CRM Launcher` (×3), `Library Launcher`, `MobileAccountQuickSearch` |
| `ModuleRegistry` + `ModuleHost` | Registre déclaratif des outils modaux | ~45 montages ad hoc de modales |

### 1.3 Le périmètre

| | |
|---|---|
| **Inclus** | Desktop uniquement. Les 12 modules du menu principal, hors exceptions. |
| **Exclu** | Le **Cockpit** (`/cockpit`) et le **Knowledge Hub** (`/knowledge`) conservent leur navigation. |
| **Exclu** | Le **mobile** : refonte séparée (D-14). Ses données de navigation peuvent être supprimées sans précaution de compatibilité. |
| **Exclu** | Les **22 routes orphelines** ne sont pas supprimées (D-15). Elles restent hors navigation, accessibles par URL. |

### 1.4 L'ordre de grandeur — à connaître avant de s'engager

| | Aujourd'hui | Cible | Dont à créer |
|---|---|---|---|
| Modules (étage 1) | 13 | **12** | 1 (Prospection) |
| Destinations navigables | ~20 | **43** | **~16** |
| Outils modaux déclarés | ~8 ad hoc | **21** au registre | **~10** |

Plus **2 workflows n8n** et **au moins 1 RPC d'agrégation**.

> ⚠️ **Ce chantier n'est pas un refactor de shell : c'est un doublement de la surface produit.**
> La refonte du Shell (Phase 1-2, ~15 j) et la construction du contenu (Phase 3-5, ~40-50 j) sont **deux projets distincts**.
> Le Shell livre d'abord, homogène et honnête, avec des états « à venir » explicites — **jamais de donnée factice**.

---

## 2. Documents de référence — qui fait autorité sur quoi

| Document | Fait autorité sur | Ne fait PAS autorité sur |
|---|---|---|
| **Ce ledger** | L'état du chantier, le protocole, l'inventaire du code, les pièges | Les décisions d'architecture (→ ADR-0018) |
| [**ADR-0018**](../adr/ADR-0018-refonte-shell-navigation-desktop.md) | Décisions D-1→D-15, règles normatives N-1→N-8, risques R1→R11, roadmap | L'état d'avancement (→ §10 ici) |
| [**ARBORESCENCE-NAVIGATION-CIBLE.txt**](../ARBORESCENCE-NAVIGATION-CIBLE.txt) | La cible fonctionnelle module par module | Les contrats techniques (→ §5 ici) |
| [**ADR-0005**](../adr/ADR-0005-navigation-deux-etages.md) | Le principe « la sidebar liste les modules » | Le **rendu** de l'étage 2 — amendé par ADR-0018 |
| [**ADR-0006**](../adr/ADR-0006-strategie-device-adaptive-cible.md) | La stratégie device (détection serveur) | — |
| [**CLAUDE.md**](../../CLAUDE.md) | Stack, interdictions, conventions du projet | — |
| **Artifact visuel** | Aperçu du rendu attendu de chaque rail (lecture seule) | Rien de normatif |

> **Aucune autre source.** Si un agent trouve une information ailleurs (transcript, mémoire, commentaire de code), il la vérifie contre le code réel avant de s'en servir, et la consigne ici si elle est utile.

---

## 3. Baseline technique — mesurée le 2026-08-06

### 3.1 Git

| | |
|---|---|
| Dépôt | `guillaumekachanine-dev/kredo_sales_app` |
| Branche | `main` |
| SHA de baseline | `3be42660b30a29fe6987298b9fa912e9925049d1` |
| Working tree | Propre hors les 2 documents de cadrage non committés (`docs/adr/ADR-0018-*.md`, `docs/ARBORESCENCE-NAVIGATION-CIBLE.txt`) |

### 3.2 État des portes de validation à la baseline

Mesuré réellement, pas supposé. **Un agent qui trouve un de ces résultats doit savoir s'il est pré-existant ou causé par lui.**

| Porte | Commande | Résultat baseline | Verdict |
|---|---|---|---|
| Types | `npx tsc --noEmit` | **EXIT 0** | ✅ vert — toute erreur est de votre fait |
| Build | `npm run build` | **EXIT 0**, toutes routes générées | ✅ vert — toute erreur est de votre fait |
| Tests | `npx vitest run` | **972 tests / 101 fichiers, 972 passés** | ✅ vert — toute régression est de votre fait |
| Frontière serveur | `npm run check:server-boundary` | **ÉCHEC** sur `src/features/knowledge-hub/expertise/get-kredo-expertise-snapshot.ts` (`import "server-only"` manquant) | ⚠️ **échec pré-existant**, hors périmètre, ne pas corriger dans ce chantier |
| Lint global | `npx eslint src` | **288 problèmes (149 erreurs, 139 warnings)** | 🔴 **rouge à la baseline** |
| Lint ciblé | `npx eslint <fichiers touchés>` | variable | ✅ **la seule porte lint qui compte** |

> 🔴 **Conséquence pratique :** `npx eslint src` est **inexploitable** comme porte de validation. On ne lint **que les fichiers touchés par le lot**, et le lot est vert si ces fichiers-là sont à 0 erreur nouvelle. Toute erreur pré-existante sur un fichier touché doit être **constatée avant modification** (`git stash` + lint, ou lint sur `HEAD`) et consignée, jamais corrigée silencieusement.
>
> Erreur pré-existante connue et documentée : `src/components/automations/VeilleSimulatorCard.tsx:43` — `react/no-unescaped-entities`.

### 3.3 Portes de validation exigées à chaque lot

```bash
npx tsc --noEmit
```
```bash
npm run build
```
```bash
npx vitest run
```
```bash
npm run check:server-boundary
```

Plus `npx eslint` sur la liste exacte des fichiers touchés, et une **QA visuelle desktop** (voir §8.6 — aucun outil de capture automatisé n'est disponible côté agent).

---

## 4. Invariants — règles non négociables

Ces règles proviennent d'ADR-0018 (§2.5) et des conventions du projet. **Les violer invalide le lot.**

| Réf. | Invariant | Pourquoi |
|---|---|---|
| **N-1** | Le rail n'est rendu que si `chapitres + modules ≥ 2`. Sinon la page est pleine largeur. | Un rail à un item coûte 184 px de vide et contredit l'objectif de surface. |
| **N-2** | **Aucune imbrication de chapitres.** Un besoin de sous-navigation se traite par un contrôle segmenté *dans* la page. | ADR-0005 a supprimé une navigation à 3 niveaux ; ne pas la recréer. |
| **N-3** | Un chapitre est **toujours une route**. Jamais de `useState` de navigation. | Deep-link, bouton retour, refresh-safe, chargement serveur du seul chapitre actif. |
| **N-4** | Quand `SectionRail` est monté, `IntelligencePanel` est en **overlay**, jamais en sibling flex. | Sinon 568 px de chrome à 1440 px, soit 39 % de l'écran. |
| **N-5** | Aucune page « Synthèse » sans agrégat de données **réel et existant**. Interdiction absolue de KPI décoratif. | Précédents : `mockAutomationsDashboardData` et la modale « Créer un rapport d'activité » (faux succès en `setTimeout`), tous deux supprimés après coup. |
| **N-6** | **Cockpit** = priorités transverses. **Synthèse de module** = pilotage intra-module, 3 questions max, zéro cross-module. | Éviter 8 mini-cockpits redondants. |
| **N-7** | Un outil modal est déclaré **une fois** au `ModuleRegistry`, monté depuis N rails avec un `scope` différent. Jamais de clone. | « Analytics » est demandé 4 fois dans la cible ; les études sectorielles, 5 fois. |
| **N-8** | Une surface de priorisation n'existe que si elle a un **horizon temporel propre**. | Cockpit / Brief / Potentiel / Analyse répondent tous à « qui adresser ? ». |

### 4.1 Invariants hérités du projet (CLAUDE.md)

- **Pas de librairie de graphiques** (recharts, chart.js, Tremor…). SVG maison ou HTML+Tailwind.
- **Pas de `tailwind.config.*`** — Tailwind v4, directive `@theme` dans `globals.css` uniquement.
- **Pas de shadcn/Radix.** Primitives maison sur `<dialog>` natif.
- **Zéro HEX en dur** dans les composants : uniquement des variables du design system.
- **Pas de graceful degradation CSS** : jamais « charger lourd et cacher en CSS ». Desktop et mobile sont des composants distincts.

---

## 5. Architecture cible — contrats techniques

### 5.1 `SectionRail` — l'étage 2

#### Anatomie normative

Reprise **stricte** de `ClientIntelligenceSidebar.tsx`, qui est la référence visuelle validée.

```
┌─ w-[11.5rem] ────────────────────┐
│ [ Bouton navy — accueil module ] │  min-h-10, rounded-md, bg navy, texte blanc bold, text-xs
│                                  │
│ ─ border-t ───────────────────── │
│ (lignes autonomes facultatives)  │
│                                  │
│ CHAPITRES                        │  text-[10px] font-bold uppercase tracking-[0.12em] muted
│ ▍ ◫ Chapitre actif               │  border-l-2 brass + bg surface + texte navy
│   ◫ Chapitre                     │  border-l-transparent + texte muted
│                                  │
│ ─ border-t ───────────────────── │
│ MODULES                          │  même traitement typographique
│   ◫ Outil modal                  │
└──────────────────────────────────┘
```

Classes de référence, à extraire telles quelles depuis `ClientIntelligenceSidebar.tsx` :

```
conteneur : flex h-full w-[11.5rem] shrink-0 flex-col border-r border-rail-border bg-rail-canvas px-3 py-5
titre     : px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-rail-muted
item      : flex min-h-10 w-full items-center gap-2.5 rounded-r-md border-l-2 px-3 text-left text-xs font-semibold transition-colors
item actif: border-l-rail-brass bg-rail-surface text-rail-navy
item idle : border-l-transparent text-rail-muted hover:bg-rail-surface/70 hover:text-rail-body
```

#### Contrat de données — `src/lib/navigation/section-rail.config.ts`

> 🔴 **Ce fichier doit être 100 % client-safe** : zéro import de `server-only`, `next/headers`, `@/lib/supabase/server` ou de tout module qui en dépend. Voir §8.1.

```ts
export type RailEntry = {
  key: string
  label: string
  icon: RailIconKey
  href: string                     // N-3 : toujours une route
  badge?: "soon"
}

export type RailToolEntry = {
  key: string
  label: string
  icon: RailIconKey
  module: ModuleKey                // résolu par le ModuleRegistry, jamais un import direct
}

export type RailSection = {
  title?: string                   // undefined → section sans titre (lignes autonomes)
  entries: RailEntry[]
}

export type SectionRailDescriptor = {
  moduleKey: string
  moduleLabel: string
  home: { label: string; href: string }   // bouton navy
  sections: RailSection[]                 // « Chapitres » ou sections nommées
  tools: RailToolEntry[]                  // section « Modules »
}

/**
 * Résolution contextuelle. Certains modules (Comptes & contacts) ont plusieurs
 * descripteurs selon l'entité ouverte : état « liste » vs état « compte ouvert ».
 * Retourne null quand N-1 n'est pas satisfait (< 2 destinations).
 */
export function resolveRailDescriptor(pathname: string): SectionRailDescriptor | null
```

#### Deux modes de montage — les deux sont nécessaires

| Composant | Où | Rôle |
|---|---|---|
| `SectionRailHost` | Monté **une fois** dans `AppShell` (branche desktop) | Résout le descripteur depuis `usePathname()`. Remplace `SectionNavBarSlot`. |
| `SectionRail` | Monté **directement par une page plein écran** | Présentationnel pur. La fiche compte (`ClientIntelligenceDesktopView`) gère son propre contexte et passe ses items en props. |

Le second mode n'est pas une commodité : la fiche compte est une sous-application plein écran dont le rail dépend de l'entité chargée, pas seulement du pathname.

### 5.2 `EntityLauncher`

Une palette de recherche d'entité, **une action paramétrable**.

```ts
export type EntityLauncherConfig = {
  key: string
  title: string
  placeholder: string
  entityType: "company" | "contact" | "opportunity" | "mission"
  onSelect: (entityId: string) => void   // navigation OU ouverture d'un module
}
```

Consommateurs cibles : `CRM Launcher` (Veille, BI, Comptes → navigue vers la fiche), `Library Launcher` (Rapports → ouvre le module « Consulter les documents » du compte **sans quitter la page**).

Point d'attention : le launcher existant est piloté par `useCrmAccountLauncherStore` (`src/hooks/use-crm-account-launcher.ts`), déjà consommé par `SectionNavBar`, `VeilleLocalNavigation` et `BusinessIntelligenceLocalNavigation`. Le refactor doit **généraliser ce store**, pas en créer un second.

### 5.3 `ModuleRegistry` + `ModuleHost`

```ts
export type ModuleKey = string   // ex. "commercial-activity", "documents", "analytics"

export type ModuleDefinition = {
  key: ModuleKey
  label: string
  /** import dynamique — le bundle du module n'est chargé qu'à l'ouverture */
  load: () => Promise<{ default: ComponentType<ModuleProps> }>
  /** contexte accepté : un module « Analytics » se décline par scope */
  scopes?: string[]
}
```

**Pourquoi c'est structurant :** la cible demande « Analytics » dans 4 modules, les études sectorielles dans 4 endroits, les playbooks dans 3. Sans registre, on livre 11 composants. Avec registre, on livre 3 composants et 11 lignes de configuration.

**Bénéfice secondaire :** le chapitre *Automatisations › Nomenclature & accès* (« associer à chaque automatisation son nom technique et l'endroit où elle est accessible ») se lit **directement dans ce registre**. Il n'y a pas de second inventaire à maintenir.

### 5.4 Tokens

À ajouter dans `globals.css`, bloc `@theme`. Valeurs identiques à la référence dès le jour 1 — l'indirection existe pour permettre un ajustement ultérieur à coût nul.

```css
--color-rail-canvas:  var(--color-edito-canvas);   /* #F8FAFC */
--color-rail-surface: var(--color-edito-surface);  /* #FFFFFF */
--color-rail-border:  var(--color-edito-border);   /* #CBD5E1 */
--color-rail-navy:    var(--color-edito-navy);     /* #1E3150 */
--color-rail-brass:   var(--color-edito-brass);    /* #D89B16 */
--color-rail-muted:   var(--color-edito-muted);    /* #64748B */
--color-rail-body:    var(--color-edito-body);     /* #334155 */

--motion-rail-hover-delay: 500ms;
--motion-rail-leave-delay: 300ms;
```

> Les tokens `--color-edito-*` sont définis **globalement** dans `@theme` (`globals.css:191-204`), pas scopés à un `data-theme`. Ils sont donc utilisables sur toutes les pages sans thème particulier.
>
> Point de vigilance esthétique : `--color-edito-canvas` est `#F8FAFC` (gris froid), `--color-canvas` de l'app est `#F4F2ED` (ivoire chaud). La jonction est à contrôler visuellement. L'indirection permet de retoucher en une ligne.

### 5.5 Comportement du menu principal

| Déclencheur | Mode | Persisté | Délai |
|---|---|---|---|
| Bouton toggle | **push** — le contenu se décale | ✅ cookie `kredo_sidebar_collapsed` | — |
| Survol du rail replié | **overlay** — le contenu ne bouge pas | ❌ | ouverture 500 ms / fermeture 300 ms |
| `focus-within` (clavier) | **overlay** | ❌ | immédiat |

**Défaut : replié.** Dans `AppShell.tsx:35`, `cookie === "true"` devient `cookie !== "false"`. Sémantique : sans cookie → replié ; cookie `false` (l'utilisateur a explicitement déplié) → déplié.

**Le troisième déclencheur n'est pas un confort** : sans lui, une fonction de navigation devient inaccessible au clavier et au lecteur d'écran.

Garde-fous obligatoires :

1. `@media (hover: hover) and (pointer: fine)` — jamais de dépliage au survol sur tactile.
2. `prefers-reduced-motion: reduce` → bascule instantanée (le projet a déjà 8 blocs de ce type).
3. Fermeture au changement de route et sur `Escape`.
4. Timers en **variables locales à l'effet**, jamais en state ni en ref (voir §8.2).

---

## 6. Inventaire du code — vérifié le 2026-08-06

### 6.1 Fichiers à CRÉER

| Chemin | Lot | Rôle |
|---|---|---|
| `src/lib/navigation/section-rail.config.ts` | 1.0 | Descripteurs des 12 modules + `resolveRailDescriptor` |
| `src/lib/navigation/module-registry.ts` | 1.0 | `ModuleKey`, `ModuleDefinition`, registre |
| `src/components/layout/SectionRail.tsx` | 1.1 | Composant présentationnel |
| `src/components/layout/SectionRailHost.tsx` | 1.1 | Montage global, résolution par pathname |
| `src/components/layout/rail-icons.tsx` | 1.1 | Jeu d'icônes unifié (les 5 clones en redéfinissent chacun un) |
| `src/components/layout/ModuleHost.tsx` | 1.5 | Montage à la demande des modules du registre |
| `src/components/common/EntityLauncher.tsx` | 1.5 | Palette générique |

### 6.2 Fichiers à MODIFIER

#### Les 5 clones du rail — chaîne de classes identique au byte près

Vérifié par `grep` sur `w-[11.5rem] shrink-0 flex-col border-r border-edito-border bg-edito-canvas px-3 py-5` :

| Fichier | Particularité |
|---|---|
| `src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.tsx` | **La référence.** A un test : `ClientIntelligenceSidebar.test.ts` |
| `src/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation.tsx` | Recopie le bouton « CRM Launcher » |
| `src/components/veille/VeilleLocalNavigation.tsx` | Recopie le bouton « CRM Launcher » |
| `src/components/automations/AutomationsLocalNavigation.tsx` | Ajoute `role="tab"` / `aria-selected` (les autres non) |
| `src/components/reports/ReportsDesktopView.tsx` | **Clone inline non extrait**, ligne ~238 (`ReportsLocalNavigation`) |

#### Les 7 layouts montant `SectionNavBarSlot`

> ⚠️ **Seuls 2 ont réellement des onglets en config.** Les 5 autres montent un composant qui retourne toujours `null`.

| Fichier | Onglets en config ? |
|---|---|
| `src/app/(app)/missions/layout.tsx` | ✅ 3 onglets |
| `src/app/(app)/consultants/layout.tsx` | ✅ 3 onglets |
| `src/app/(app)/finance/layout.tsx` | ❌ rend `null` |
| `src/app/(app)/prospection/layout.tsx` | ❌ rend `null` |
| `src/app/(app)/automations/layout.tsx` | ❌ rend `null` |
| `src/app/(app)/knowledge/layout.tsx` | ❌ rend `null` |
| `src/app/(app)/proposals/layout.tsx` | ❌ rend `null` |

Mentionné aussi dans `src/STRUCTURE.md` — à mettre à jour.

#### Shell

| Fichier | Modification |
|---|---|
| `src/components/layout/AppShell.tsx` | `l.35` : défaut replié · monter `SectionRailHost` (desktop) · `IntelligencePanel` en overlay (N-4) |
| `src/components/layout/DesktopSidebar.tsx` | Overlay hover · `focus-within` · retrait du couplage `useSidebarCollapse` |
| `src/app/globals.css` | Tokens `--color-rail-*` et `--motion-rail-*` |

#### Onglets client-state à convertir en routes (N-3)

| Fichier | Onglets |
|---|---|
| `src/components/finance/FinanceDesktopDashboard.tsx` + `FinanceTabs.tsx` | synthesis / profitability / forecast |
| `src/components/automations/AutomationsDesktopDashboard.tsx` + `AutomationsTabs.tsx` | journal / sante / couts |
| `src/components/veille/VeilleActualitesDesktop.tsx` | 4 sections |
| `src/features/business-intelligence/desktop/BusinessIntelligenceDesktop.tsx` | priorities / windows / sectors |
| `src/components/reports/ReportsDesktopView.tsx` | documents / history / generation |

> ⚠️ `AutomationsDesktopDashboard` porte du **Realtime** (`use-run-journal-realtime`). Le passage en routes ne doit pas casser l'abonnement ni le rechargement de ligne.

### 6.3 Fichiers à SUPPRIMER

| Fichier | Lot | Précaution |
|---|---|---|
| `src/components/layout/SectionNavBar.tsx` | 1.3 | — |
| `src/components/layout/SectionNavBarSlot.tsx` | 1.3 | Retirer des 7 layouts d'abord |
| `src/components/layout/section-tab-styles.ts` | 1.3 | ⚠️ **`sectionTabItemClasses` / `sectionTabListClasses` / `sectionTabHomeClasses` sont AUSSI utilisés par `SectionTabBar`** (étage 3, à conserver). Ne pas supprimer le fichier : n'en retirer que ce qui devient orphelin. |
| `src/hooks/use-sidebar-collapse.ts` + `.test.ts` | 1.2 | Supprimer **dans le même commit** que ses 5 appelants |
| `src/components/finance/FinanceTabs.tsx` | 1.4 | — |
| `src/components/automations/AutomationsTabs.tsx` | 1.4 | ⚠️ consommé aussi par `AutomationsMobileDashboard` |
| `src/components/layout/Breadcrumb.tsx` + `RegisterBreadcrumbLabel.tsx` | 1.6 | Vérifier `src/lib/navigation/breadcrumb.ts` et `breadcrumb-store.ts` |
| `src/components/common/EntityKanbanView.tsx` + `EntityKanbanCard.tsx` | 1.6 | — |
| `src/components/missions/kanban/OpportunitiesKanbanView.tsx` | 1.6 | — |
| `src/components/recruitment/RecruitmentKanbanView.tsx` | 1.6 | ⚠️ voir §6.5 |
| `src/components/staffing/StaffingKanbanView.tsx` | 1.6 | — |
| `main-menu.config.ts` : champ `tabs` + `getSectionTabsForPath` + `getModuleTabs` | 1.3 | Autorisé par D-14 (le mobile est refondu séparément) |

### 6.4 Fichiers à NE SURTOUT PAS TOUCHER

L'étage 3 (barre de fiches ouvertes) est **conservé intact** (D-3) :

```
src/components/layout/SectionTabBar.tsx
src/components/accounts-contacts/CrmSectionTabBar.tsx
src/components/accounts-contacts/CrmTabbedShell.tsx        (sauf retrait de requestCollapse)
src/components/staffing/StaffingSectionTabBar.tsx
src/components/staffing/StaffingTabbedShell.tsx
src/components/missions/MissionsTabbedShell.tsx
src/lib/tabs/*                                             (stores Zustand)
```

Hors périmètre :

```
src/app/(app)/cockpit/**
src/app/(app)/knowledge/**   +  src/features/knowledge-hub/**
src/components/layout/MobileNav.tsx, MobileBottomNav.tsx,
  MobileSectionRail.tsx, MobileNavigationMenu.tsx           (refonte mobile séparée)
```

### 6.5 Points d'attention par suppression

**Les 5 appelants de `useSidebarCollapse.requestCollapse()`** — vérifié :

```
src/features/business-intelligence/desktop/BusinessIntelligenceDesktop.tsx
src/components/veille/VeilleActualitesDesktop.tsx
src/components/intelligence/IntelligencePanel.tsx
src/components/accounts-contacts/CrmTabbedShell.tsx
src/components/reports/ReportsDesktopView.tsx
```

Ce store replie de force le menu **et désactive son bouton toggle** (`DesktopSidebar.tsx:162` et `:218`). La promesse « deux moyens de déplier » est donc **déjà fausse aujourd'hui** sur ces 5 pages. Le replié devenant le défaut global, le store n'a plus d'objet.

**Suppression du Kanban** — `HIRING_KANBAN_STAGES` (`src/lib/recruitment/recruitment-stages.ts`) est **conservé** : il est aussi consommé par `src/components/reports/ActivityRecruitmentReportView.tsx` et `src/lib/intelligence/actions/recruitment-margin-rules.ts`, et il aligne `candidate_hiring_processes.current_step` en base.

> 🔴 **`src/app/(app)/recruitment/_actions/update-hiring-step.ts` n'a aujourd'hui aucune autre UI que le drag du Kanban.** Un contrôle inline de changement d'étape doit être livré **dans le même lot** que la suppression, sinon on casse une fonction métier sans s'en apercevoir.

### 6.6 Tests impactés

| Fichier | Impact |
|---|---|
| `src/lib/navigation/main-menu.config.test.ts` | Teste `getModuleTabs` / `getSectionTabsForPath` — à réécrire au lot 1.3 |
| `src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.test.ts` | Teste `CLIENT_INTELLIGENCE_NAV_ITEMS` — à repointer sur le descripteur |
| `src/hooks/use-sidebar-collapse.test.ts` | À supprimer avec le store (lot 1.2) |
| `src/features/business-intelligence/__tests__/business-intelligence-layout-contracts.test.ts` | Contrats de layout BI — à vérifier au lot 1.4 |

**Tests à écrire** (minimum) : résolution de `resolveRailDescriptor` par pathname · respect de N-1 (retourne `null` sous 2 destinations) · machine de délai du survol (ouverture/annulation/fermeture) · unicité des `ModuleKey` du registre.

---

## 7. Les lots

Chaque lot est **livrable et déployable seul**. Ordre non négociable pour la Phase 1 : `1.0 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6`.

> **Pourquoi 1.1 avant tout le reste :** migrer des onglets vers cinq composants clonés reviendrait à faire le travail cinq fois. L'extraction rend tous les lots suivants configurables plutôt que codables.

### Phase 1 — SHELL

| Lot | Périmètre | Critères d'acceptation | Effort | Risque |
|---|---|---|---|---|
| **1.0** | Contrats. `section-rail.config.ts` (12 descripteurs), `module-registry.ts`, `rail-icons.tsx`, tokens CSS. **Zéro UI.** | `tsc` vert · `check:server-boundary` inchangé · les 12 descripteurs relus et validés par le décideur · aucun composant modifié | 0,5 j | 🟢 |
| **1.1** | Extraction. `SectionRail` + `SectionRailHost`. Les **5 clones** deviennent consommateurs. | **Aucun changement visuel** (capture avant/après par page) · −~450 lignes dupliquées · les 5 fichiers clones ne contiennent plus de `<nav>` local · tests 972+ verts | 1 j | 🟢 |
| **1.2** | Menu principal. Replié par défaut · overlay hover 500/300 ms · `focus-within` · 4 garde-fous · **suppression de `use-sidebar-collapse`** et de ses 5 appelants. | Le survol n'entraîne **aucun reflow** du contenu (vérifié à l'œil sur une page à `DataTable`) · le toggle fonctionne sur les 5 anciennes pages verrouillées · navigation au clavier possible sans souris · `prefers-reduced-motion` respecté | 1 j | 🟠 |
| **1.3** | Modules routés. Engagements + Équipe : `SectionNavBar` → rail. Retrait de `SectionNavBarSlot` des 7 layouts. Suppression de `tabs` en config. | Le scroll fonctionne sur **chaque page** des 2 modules · `SectionTabBar` (étage 3) intact sur Missions/Projets · `section-tab-styles.ts` conservé pour l'étage 3 | 1,5 j | 🔴 R1 |
| **1.4** | Client-state → routes. Finance, Automations, Veille, BI, Rapports. | Chaque chapitre est deep-linkable et survit à un refresh · le Realtime d'Automatisations fonctionne toujours · `npm run build` vert (seul détecteur du piège §8.1) | 3 j | 🔴 R1/R2 |
| **1.5** | Section Modules + `EntityLauncher`. Registre branché sur les modales existantes ; launchers unifiés ; retrait des boutons dispersés. | Chaque module du registre s'ouvre depuis son rail · aucun bundle de module chargé avant ouverture (import dynamique) · un seul store de launcher | 1,5 j | 🟢 |
| **1.6** | Nettoyage. Breadcrumb + bande d'en-tête (D-7) · Kanban + **contrôle d'étape inline** (D-13) · `/reports` › Historique · code mort. | L'avancement d'une étape de recrutement reste possible sans Kanban · aucun import cassé · `tsc` et build verts | 1,5 j | 🟠 R9 |

**Sous-total Phase 1 : ~10 j.** À l'issue : application homogène, surface maximisée, **zéro page nouvelle**.

### Phase 2 — RÉORGANISATION (déplacements, sans création)

| Lot | Périmètre | Effort |
|---|---|---|
| **2.1** | Menu principal cible : groupe unique `CRM`, suppression de `Ressources` et `Commerce`, renommages (Équipe → Profils & expertises, Synthèse → Vue d'ensemble, Journal → Exécutions, Comptes surveillés → Veille) | 0,5 j |
| **2.2** | `/recruitment` → Besoins & staffing › Sourcing & recrutement (D-12 : deux funnels séparés) | 2 j |
| **2.3** | Activité & congés : Équipe → Engagements (D-6). Réintégration de `/missions/planning` | 1 j |
| **2.4** | Comptes & contacts : rail contextuel (D-8), sections nommées, arbitrage `ClientIntelligenceHomeTab` | 1,5 j |

### Phase 3 — SYNTHÈSES
Sous **gate N-5**, précédées d'un audit d'agrégats disponibles. ~3-5 j.

### Phase 4 — NOUVEAUX MODULES & CHAPITRES
Prospection · Analytics unifié · Rapports › Génération & Cas d'usage · Automatisations › Nomenclature · Finance › Pilotage & Business Review · Comptes › Contacts, Actualité, Historique · Playbook v2. ~20-30 j.

### Phase 5 — CHANTIERS DATA
Fenêtres d'opportunités (RPC d'unification) · BI › Analyse (n8n) · Veille › Analyse sectorielle (n8n) · Prospection › Brief. ~10-15 j.

---

## 8. Pièges du codebase — vérifiés, avec précédents datés

Ces pièges ont **déjà causé des incidents** dans ce projet. Ils sont listés pour ne pas les rejouer.

### 8.1 🔴 Frontière client/serveur — `tsc` ne la voit pas, seul `npm run build` la voit

Un composant client qui importe une **valeur** (pas seulement un type) depuis un module `server-only` fait échouer `next build` — alors que `npx tsc --noEmit` passe au vert.

**Précédents :** `VEILLE_RUNS_PER_MONTH` (Session 24), `JOURNAL_LIMIT` (Session 30). Deux fois le même piège.

**Conséquence pour ce chantier :** `section-rail.config.ts` et `module-registry.ts` seront importés par des composants client. Ils doivent être **strictement client-safe**. `import type` est effacé à la compilation et reste autorisé.

**Règle :** `npm run build` à **chaque** lot, jamais `tsc` seul.

### 8.2 🟠 Effets React mal keyés

**Précédents :** `AccountScanDialog` (Session 23) — un canal Realtime dépendant d'un state qu'il produisait lui-même se détruisait et se recréait à chaque événement. `use-run-journal-realtime` (Session 30) — même famille.

**Pour le survol du menu :** les timers d'ouverture/fermeture doivent être des **variables locales à l'effet**, jamais du state ni des refs déclenchant une redépendance. L'effet dépend du seul `isCollapsed`.

### 8.3 🟠 `.next/` obsolète → faux positifs `tsc`

Sessions 18, 20, 21 : `TS6200` / `TS2300` fantômes causés par un `.next/types` périmé. En cas d'erreur `tsc` inexplicable, purger `.next/` avant d'investiguer.

### 8.4 🟠 `sed -E` et `\b` sur macOS

Session 21 : un renommage massif avec word-boundary a été **silencieusement no-op** — les fichiers étaient marqués « OK » sans qu'aucune substitution n'ait eu lieu. BSD `sed` ne gère pas `\b`.

**Ce chantier comporte des renommages massifs** (labels de modules, clés de nav). Toujours vérifier par `grep` après un remplacement automatisé.

### 8.5 🟡 Le lint global est rouge à la baseline

288 problèmes pré-existants (§3.2). Ne jamais utiliser `npx eslint src` comme porte. Linter les fichiers touchés, et constater l'état pré-existant d'un fichier **avant** de le modifier.

### 8.6 🟡 Pas d'outil de capture automatisé côté agent

Aucun Chrome DevTools MCP n'est disponible dans les sessions agent de ce projet. La QA visuelle est faite **par Guillaume**, ou par un agent à qui le contrôle de Chrome est explicitement donné.

**Conséquence :** un lot dont le seul critère d'acceptation serait visuel se termine en `partial` avec mention « QA visuelle à faire ». Ne jamais déclarer une validation visuelle qui n'a pas eu lieu.

### 8.7 🔴 R1 — le piège majeur de ce chantier : les conteneurs de scroll

Les 7 layouts sont bâtis sur `flex flex-col h-full overflow-hidden` avec la barre d'onglets en haut. Passer à un flex **horizontal** avec un rail pleine hauteur **change le conteneur de défilement de chaque page**.

Ni `tsc`, ni le build, ni les tests ne le détectent. Seul l'œil.

**Protocole imposé :** migration **module par module**, un commit par module, et pour chaque page du module : ouvrir, scroller jusqu'en bas, vérifier que le rail reste fixe et que le contenu seul défile.

---

## 9. Décisions

Extrait synchronisé d'ADR-0018 §4. **En cas de divergence, l'ADR fait foi.**

| Réf. | Décision | État |
|---|---|---|
| **D-1** | Le rail de section remplace les 5 mécanismes de navigation | ✅ tranché |
| **D-2** | Un chapitre est toujours une route, jamais du `useState` | ✅ tranché |
| **D-3** | La barre de fiches ouvertes (étage 3) est conservée intacte | ✅ tranché |
| **D-4** | Groupes « Ressources » et « Commerce » supprimés → groupe unique **`CRM`** : Comptes & contacts *(accueil)*, Besoins & staffing, Engagements, Profils & expertises | ✅ tranché 2026-08-06 |
| **D-5** | Agenda = **2 destinations**. Les plannings sont des **calques** de « Mon agenda », pas des chapitres dupliqués | ✅ tranché 2026-08-06 |
| **D-6** | « Activité & congés » vit **une seule fois**, dans Engagements | ✅ tranché 2026-08-06 |
| **D-7** | Fil d'Ariane et bande d'en-tête supprimés | ✅ tranché |
| **D-8** | Descripteur de rail **contextuel à l'entité** sur Comptes & contacts | ✅ tranché |
| **D-9** | **Aucune page « Synthèse »** sur Comptes & contacts | ✅ tranché 2026-08-06 |
| **D-10** | « Fenêtres d'opportunités » = chantier data autonome | ⚠️ à confirmer |
| **D-11** | Autorité unique de priorisation ; 4 surfaces distinguées par leur horizon | ⚠️ à confirmer |
| **D-12** | Recrutement interne et positionnement sur besoin restent **deux funnels séparés** | ✅ tranché |
| **D-13** | Kanban supprimé partout ; contrôle d'étape inline en remplacement | ✅ tranché |
| **D-14** | Mobile refondu séparément ; ses données de navigation supprimables sans précaution | ✅ tranché |
| **D-15** | Les 22 routes orphelines ne sont **pas** supprimées | ✅ tranché |
| **D-16** | Un compte ouvert atterrit sur son **Accueil de cockpit**, pas sur « Entreprise » (amende D-9). `ClientIntelligenceHomeTab` **conservé et promu** — la question ouverte est close. | ✅ tranché 2026-08-07 |
| **D-17** | Rail du compte ouvert : **4 + 4 + 2**. « Contacts » fusionné dans Entreprise ; « Adressage » → **« Stratégie »** ; ex-chapitre « Stratégie » → « Approches commerciales » ; module « Études » retiré du rail compte. | ✅ tranché 2026-08-07 |
| **D-18** | « Fenêtres d'opportunités » = **vue dérivée** d'`account_issues` (urgence calculée ≥ 4 ET `kredo_fit` ≥ 3), pas une RPC d'unification. Allège **D-10**. | ✅ tranché 2026-08-07 |

### 9.1 Procédure d'amendement

Une décision ne se change pas dans un commit de code. Séquence :

1. Écrire l'amendement dans **ADR-0018 §4** avec sa date et sa justification.
2. Répercuter dans ce tableau.
3. Mettre à jour [l'arborescence texte](../ARBORESCENCE-NAVIGATION-CIBLE.txt) si la cible fonctionnelle bouge.
4. Consigner au **§11** l'impact sur les lots déjà livrés.

Toute décision nouvelle prend le numéro suivant (D-16, D-17…). **On ne réutilise jamais un numéro libéré.**

---

## 10. Suivi des lots

> Chaque agent **ajoute** sa ligne. Il ne modifie jamais celle d'un lot antérieur.
> Colonnes obligatoires, toutes renseignées. « Tests » attend des **chiffres réels**, pas « OK ».

| Lot | Périmètre | Agent | Branche | Commit / PR | Migration | Tests | Statut | Notes |
|---|---|---|---|---|---|---|---|---|
| **0** | Cadrage : audit du code, ADR-0018, arborescence cible, ledger. Aucun code applicatif. | Claude Code | `main` | `3be42660` (baseline) | Aucune | `tsc` ✅ · `build` ✅ · `vitest` 972/972 ✅ · `check:server-boundary` ❌ pré-existant | **done** | 4 décisions tranchées (D-4, D-5, D-6, D-9). 3 documents produits. Développement **non engagé** sur consigne du décideur. |
| 1.0 | Contrats : `section-rail.config.ts`, `module-registry.ts`, `rail-icons.tsx`, tokens CSS. | — | — | — | — | — | **à faire** | Attend l'instruction expresse et la clarification fonctionnelle page par page. |
| 1.1 | Extraction `SectionRail` + `SectionRailHost` ; 5 clones convertis. | — | — | — | — | — | à faire | |
| 1.2 | Menu principal : replié par défaut, overlay hover, suppression `use-sidebar-collapse`. | — | — | — | — | — | à faire | |
| 1.3 | Modules routés : Engagements + Équipe. Retrait `SectionNavBarSlot`. | — | — | — | — | — | à faire | |
| 1.4 | Client-state → routes : Finance, Automations, Veille, BI, Rapports. | — | — | — | — | — | à faire | |
| 1.5 | Section Modules + `EntityLauncher` + `ModuleHost`. | — | — | — | — | — | à faire | |
| 1.6 | Nettoyage : breadcrumb, Kanban + contrôle inline, Historique, code mort. | — | — | — | — | — | à faire | |
| 2.1 | Menu principal cible : groupe `CRM`, renommages. | — | — | — | — | — | à faire | |
| 2.2 | `/recruitment` → Besoins & staffing › Sourcing & recrutement. | — | — | — | — | — | à faire | |
| 2.3 | Activité & congés → Engagements ; réintégration `/missions/planning`. | — | — | — | — | — | à faire | |
| 2.4 | Comptes & contacts : rail contextuel, sections nommées. | — | — | — | — | — | à faire | |

Statuts autorisés : `à faire` · `en cours` · **`done`** · **`partial`** (livré avec limitation documentée) · **`blocked`** (raison obligatoire).

---

## 11. Journal des écarts, corrections et dettes

> Append-only. Chaque entrée est datée et signée. On n'efface jamais.

| Date | Lot | Agent | Type | Entrée |
|---|---|---|---|---|
| 2026-08-06 | 0 | Claude Code | Constat | `check:server-boundary` échoue à la baseline sur `src/features/knowledge-hub/expertise/get-kredo-expertise-snapshot.ts` (`import "server-only"` manquant, commit `71c0b5dc`). **Hors périmètre**, ne pas corriger ici. |
| 2026-08-06 | 0 | Claude Code | Constat | `npx eslint src` : 288 problèmes (149 erreurs, 139 warnings) à la baseline. Le lint global est **inexploitable** comme porte de validation. Erreur nommée : `VeilleSimulatorCard.tsx:43` (`react/no-unescaped-entities`, commit `afeb0d6f`). |
| 2026-08-06 | 0 | Claude Code | Écart | La demande initiale listait « Besoins & Staffing » à la fois dans les pages dont il faut supprimer la barre horizontale et dans celles où il faut la conserver. **Résolu par le code** : `getSectionTabsForPath("/missions/opps")` retourne `[]` — il n'y a aucune `SectionNavBar` sur cette page. La seule barre présente est l'étage 3, à conserver. Rien à supprimer. |
| 2026-08-06 | 0 | Claude Code | Écart | L'arborescence fournie plaçait « Activité & congés » **à la fois** dans Engagements et dans Profils & expertises. Résolu par **D-6** : Engagements uniquement. |
| 2026-08-06 | 0 | Claude Code | Dette | `ClientIntelligenceHomeTab` perd son entrée de rail du fait de D-9. Sort non tranché. **Aucune suppression avant arbitrage.** |
| 2026-08-06 | 0 | Claude Code | Risque | `src/app/(app)/recruitment/_actions/update-hiring-step.ts` n'a d'autre UI que le drag du Kanban. La suppression du Kanban (D-13) **doit** livrer un contrôle inline dans le même lot. |
| 2026-08-06 | 0 | Claude Code | Constat | `section-tab-styles.ts` est partagé entre l'étage 2 (à supprimer) et l'étage 3 (à conserver). Ne pas supprimer le fichier au lot 1.3. |
| 2026-08-07 | 0 | Claude Code | Décision | Passe fonctionnelle **Comptes & contacts** (action item #2 d'ADR-0018). 3 décisions ajoutées : **D-16** (atterrissage sur Accueil — **amende D-9**, qui prévoyait « Entreprise »), **D-17** (rail 4+4+2, renommages), **D-18** (Fenêtres d'opportunités = vue dérivée — **allège D-10**). Arborescence et ADR mis à jour. |
| 2026-08-07 | 0 | Claude Code | Résolution | La question ouverte « sort de `ClientIntelligenceHomeTab` » est **close** : conservé et promu en destination d'ouverture d'un compte (D-16). Aucune suppression à prévoir au lot 2.4. |
| 2026-08-07 | 0 | Claude Code | Constat | Le rail compte perd le module « Études » (D-17). Les études sectorielles restent accessibles depuis l'onglet Secteur et depuis Prospection › Ressources — cohérent avec ADR-0018 §3.2, aucun accès perdu. |
| 2026-08-07 | 0 | Claude Code | Dette | **Cadrage enjeux/playbook** : [CADRAGE-ENJEUX-PLAYBOOK-COMPTE.md](../intelligence/CADRAGE-ENJEUX-PLAYBOOK-COMPTE.md). Défauts mesurés en prod, à traiter **hors chantier Shell** : 16/64 échéances réglementaires périmées dont 14 encore `is_commercial_window=true` ; aucun `source_refs` d'`account_issues` n'est résoluble (cause : `get_account_issues_context` ne transmet pas les UUID) ; `account_issues` n'a pas de `dedupe_key` → une 2ᵉ exécution d'intel-031 dupliquerait les 40 lignes existantes. |
| 2026-08-07 | 0 | Claude Code | Constat | **La baseline du §3.1 est périmée.** `HEAD` = `628e3a9a` (2 commits au-delà de `3be42660`), et le working tree porte du travail concurrent **non committé** sur `n8n/workflows/intel-033-account-watch-refresh.{json,SETUP.md}` (correctif « gardes explicites et versioning `2026-08-07.1` », incident Ciffreo Bona / exécution n8n 83111). **Non touché par cette passe.** Tout agent reprenant le chantier doit re-mesurer sa baseline plutôt que se fier au §3.1. |
| 2026-08-07 | 0 | Claude Code | Écart | **`CLAUDE.md` est périmé sur le périmètre intelligence.** Mesuré le 2026-08-07 : `sector_id` renseigné sur **93/96** comptes (doc : 27/95) · `sector_pain_points` **83** (22) · `sector_regulatory_items` **64** (13) · `sector_events` **52** (15) · `account_signals` **808** (745) · `intelligence_sources` **128** (42) · playbooks sectoriels **14/14** (non documentés). À répercuter à la prochaine session touchant la base. |

---

## 12. Glossaire

| Terme | Définition |
|---|---|
| **Menu principal** | Étage 1. Composant `DesktopSidebar`. Bleu navy. Liste les **modules**. Replié par défaut (4rem). |
| **Rail de section** | Étage 2. Composant `SectionRail`. 11.5rem. Navigue **dans** un module. |
| **Barre de fiches ouvertes** | Étage 3. `SectionTabBar` et variantes. Interface multi-documents, **pas** de la navigation. Conservée. |
| **Module** (étage 1) | Une entrée du menu principal (ex. « Finance »). 12 en cible. |
| **Module** (section du rail) | Un **outil modal** listé dans la section « Modules » du rail (ex. « Analytics »). Terme conservé sur demande du décideur, malgré la collision avec le sens précédent. |
| **Chapitre** | Une destination **routée** à l'intérieur d'un module. Ex-« onglet ». |
| **Accueil de module** | Le bouton navy en tête de rail. Destination par défaut du module. |
| **Synthèse** | Un accueil de module dédié au pilotage. Soumis au gate N-5. |
| **Descripteur** | L'objet `SectionRailDescriptor` qui décrit le rail d'un module. |
| **Clone** | Une des 5 copies du rail existant, à remplacer par la primitive. |
| **Gate** | Une règle bloquante (N-1 à N-8). Un lot qui viole un gate est invalide. |
| **Porte de validation** | Une commande dont le résultat conditionne la livraison d'un lot (§3.3). |
