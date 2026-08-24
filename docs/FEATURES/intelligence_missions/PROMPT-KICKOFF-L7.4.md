Tu travailles sur Kredo. Lis d'abord `CLAUDE.md` à la racine du repo — il fait autorité sur la stack, les conventions et la méthode de travail attendue. Applique-le sans exception (lire avant d'écrire, annoncer puis exécuter, boucle de validation typecheck → test → check:server-boundary → lint → build).

## Contexte

Cinq missions d'intelligence tournent en production : `veille-analyse-mensuelle`, `rentabilite-portefeuille` (L6), `activation-portefeuille` (L7.1), `capacite-staffing` (L7.2), et le composeur sait depuis L7.3 produire un sélecteur `{ kind: "account"; companyId }` en plus du sélecteur mensuel (`MissionLaunchInput`, `MissionAccountField.tsx`).

Tu démarres **L7.4 : mission `revue-compte-client`** — la première mission *entity-scoped* du catalogue (une mission par compte, pas par mois), et le premier vrai consommateur de `inputKind: "account"`.

**Lis, dans cet ordre, avant d'écrire une seule ligne :**
1. `docs/FEATURES/intelligence_missions/09-ROADMAP-5-MISSIONS.md`, section 5 (L7.4) — le cadrage arrêté le 2026-08-24. **Deux points y sont corrigés ci-dessous, un détail et un défaut réel** — lis-les avant de suivre le §5 littéralement.
2. `src/features/intelligence-missions/data/corpus/account-context-provider.ts` (existant depuis L1, jamais réellement consommé jusqu'ici) et `delivery-period-provider.ts` (L6, le patron le plus proche : fenêtre temporelle glissante, exclusion stricte de colonnes confidentielles).
3. `src/components/intelligence/IntelligencePanel.tsx` (fonction `AccountPanelContent`) et `src/components/intelligence/PanelActionsGrid.tsx` — **pas le mécanisme que tu crois**, voir point de vigilance n°2.

Ne relis pas `00` à `04`, `06`, `08` : non nécessaires. Pas de handoff numéroté séparé — `09` §5, ce prompt et les fichiers sources suffisent, comme pour L7.1-L7.3.

## Ce que tu livres

Une mission qui répond, pour un compte donné : *quel est l'état réel de la relation avec ce client, et où la rentabilité de la delivery se fait ou se perd.* Elle croise deux origines de corpus — `account_context` (relation : signaux, contacts, enjeux) et le nouveau `account_delivery` (exécution : missions, CRA, marge, alertes) — ce qui n'existe dans aucun outil actuel du produit (`08` §5, mission #2).

### Point de vigilance n°1 — détail obsolète de la roadmap

Le `09` §5.3 dit « `mission-composer-model.ts` | `MissionComposerConfig` pour cette mission avec `inputKind: "account"` » — exact, mais écrit avant que L7.3 ne livre `MissionLaunchInput`/`resolveInitialAccountSelection`. Tu n'as **rien** à généraliser : le composeur sait déjà produire un `{ kind: "account"; companyId }` depuis `MissionAccountField`. Ta config `buildSelectors` reçoit cet input et doit produire **les deux** sélecteurs (`account_context` + `account_delivery`) à partir du même `companyId` — c'est la seule chose à écrire côté composeur.

### Point de vigilance n°2 — le vrai défaut du cadrage, vérifié contre le code le 2026-08-24

**a) `AccountPanelContent` n'est PAS le mécanisme utilisé par L6.4/L7.1/L7.2.** Ces trois lots n'ont eu qu'à basculer un `status: "coming_soon" → "active"` dans `intelligence-registry.ts` parce qu'ils vivent tous en mode Page (`RegistryPanelContent`, qui consulte `resolveIntelligenceActions`/`IntelligenceActionCard`/`MISSION_COMPOSER_ACTION_CONFIGS`). **Le mode Entité `company` (`AccountPanelContent`, `IntelligencePanel.tsx`) est un système entièrement différent et ne consulte ni l'un ni l'autre** : il rend `PanelActionsGrid` (`src/components/intelligence/PanelActionsGrid.tsx`), dont la liste d'actions (`ACCOUNT_ACTIONS`, ligne 18) est un tableau local codé en dur, sans lien avec `intelligence-registry.ts`. `AccountPanelContent` gère son propre état local `activeAction: "pitch" | "summary" | null` (type `AccountPanelAction`, ligne 34) et un `onActionClick` qui ne reconnaît que deux ids.

Concrètement, pour ce lot, il faut :
- ajouter une entrée à `ACCOUNT_ACTIONS` dans `PanelActionsGrid.tsx` (nouvel id, ex. `review_account` — choisis un id qui n'entre pas en collision avec `deep_analysis`/`build_roadmap`, tous deux sémantiquement différents et toujours `coming_soon`), `active: true` ;
- élargir `AccountPanelAction` (ou le type d'état équivalent) pour porter ce nouveau cas, et rendre `MissionComposerDesktop`/`MissionComposerMobile` avec `MISSION_COMPOSER_ACTION_CONFIGS[...]` quand il est actif — même patron que `RegistryPanelContent` (`IntelligencePanel.tsx`, la fonction juste après `AccountPanelContent`), mais câblé dans l'arbre du mode Entité, pas du mode Page.

Cette étape ne figure dans **aucune** ligne du tableau `09` §5.3 : ajoute `PanelActionsGrid.tsx` et `IntelligencePanel.tsx` à ta liste de fichiers modifiés.

**b) `v_profitability_alerts` ne peut PAS être filtrée « sur les missions du compte » telle quelle — elle n'a ni `company_id` ni `mission_id`.** Vérifié dans `src/types/database.generated.ts` (ligne ~8035) : ses seules colonnes sont `collaborator_id`, `period_start`, `cra_status`, `activity_rate_percent`, `real_margin_pct` et les 5 booléens `alert_*`. Un collaborateur travaille sur plusieurs missions/comptes dans le temps — filtrer cette vue par `collaborator_id` seul ferait fuiter dans le rapport d'un client les alertes de rentabilité d'un consultant sur un **autre** client, à un **autre** moment. C'est exactement la classe de défaut trouvée et corrigée sur `activation-portefeuille` (troncature globale d'`interactions` faisant mentir le corpus) — une source mal filtrée qui produit un fait vrai en apparence mais hors sujet.

La correction : `mission_activity_reports`, elle, a bien `mission_id` (colonne réelle, vérifiée) — filtre-la d'abord par `.in("mission_id", missionIdsDuCompte)` (missions déjà résolues via `company_id`). À partir de ces lignes correctement scopées, construis l'ensemble des paires `` `${collaborator_id}:${period_start}` `` réellement rattachées aux missions de CE compte, puis ne retiens dans `v_profitability_alerts` (récupérée par `.in("collaborator_id", ...)`, forcément plus large) que les lignes dont la paire appartient à cet ensemble. Sans ce filtrage a posteriori, ne branche pas cette source — un item absent est acceptable, un item hors sujet ne l'est pas.

## Travail à réaliser

### 1. Ouvrir le `CorpusKind`

Nouveau kind `"account_delivery"`, sélecteur `{ kind: "account_delivery"; companyId: string }` — **même forme que `account_context`, pas celle de `delivery_period`** : pas de `periodStart`/`periodEnd`, le provider dérive lui-même sa fenêtre de 6 mois glissants depuis la date serveur (`new Date()`), jamais depuis un paramètre navigateur.

Fichiers : `mission-contracts.ts` (`CorpusKind` + `CorpusSelector`), `mission-selectors.ts` (**les deux branches** : `parseCorpusSelector` et `corpusSelectorKey` — piège documenté depuis `07`/`09` §9, toujours vrai), `validate-mission-report.ts` (`CORPUS_KINDS`).

### 2. Le provider `account-delivery-provider.ts`

Calqué sur `delivery-period-provider.ts` pour la doctrine (poids, exclusion de colonnes, anti-recalcul), sur `account-context-provider.ts` pour la forme du sélecteur. Poids **92** (au-dessus d'`account_context` à 90 : l'ancre chiffrée ne tombe jamais par troncature de budget, même règle que `delivery_period` en L6).

Quatre sources, `user_rls` :
- `missions` filtrées sur `company_id` — résolues en premier, tout le reste en dépend.
- `mission_activity_reports` filtrée sur `.in("mission_id", missionIds)`, fenêtre 6 mois glissants sur `period_start`/`period_end`.
- `v_mission_quarterly_revenue` filtrée sur `.eq("company_id", companyId)` (colonne réelle, déjà utilisée ainsi dans `delivery-period-provider.ts`).
- `v_profitability_alerts` — filtrage en deux temps décrit au point de vigilance n°2b, jamais un simple `.in("collaborator_id", ...)`.

**🔴 Exclusion de colonnes non négociable, copiée de `delivery-period-provider.ts` (commentaire de tête de ce fichier) : `gross_annual`, `charges_rate`, `working_days_per_year` n'entrent jamais dans `.select(...)` ni dans `content`.** Le livrable atterrit dans `intelligence_documents`, lisible par un `viewer` — RLS workspace standard, pas la RLS confidentielle `is_workspace_admin()` de `collaborator_compensation`.

Enregistre dans `corpus-provider-registry.ts` (entrée + ligne de poids 92 dans le commentaire d'échelle, entre 95 `delivery_period` et 90 `account_context`).

### 3. Le preset

`mission-catalog.ts` : preset `revue-compte-client`, `version: 1`, `corpus.requiredAtLaunch: ["account_context", "account_delivery"]`, `maxOutputTokens: 16_000` d'emblée (leçon de L7.1 — ce preset croise deux corpus chiffrés+relationnels, pas de raison de repartir à 8_000 pour re-découvrir le même problème). Règle anti-recalcul dans `constraints.rules`, sur le modèle de `rentabilite-portefeuille` : « Ne recalcule aucun ratio ni écart. Tous les chiffres nécessaires sont déjà fournis, pré-calculés, dans le corpus. »

### 4. Composeur et branchement cockpit

`mission-composer-model.ts` : nouvelle `MissionComposerConfig` avec `inputKind: "account"`, `buildSelectors` qui construit les **deux** sélecteurs (`account_context`, `account_delivery`) à partir du même `input.companyId` (avec la garde habituelle si `input.kind !== "account"`).

Branchement cockpit : voir point de vigilance n°2a — `PanelActionsGrid.tsx` + `AccountPanelContent` (`IntelligencePanel.tsx`), pas `intelligence-registry.ts`.

### 5. Tests

`__tests__/account-delivery-provider.test.ts` sur `fake-supabase.ts`, calqué sur `delivery-period-provider.test.ts` :
1. fenêtre 6 mois correctement dérivée ;
2. exclusion de `gross_annual`/`charges_rate`/`working_days_per_year` **prouvée** (le test doit échouer si le provider se met un jour à les sélectionner), pas seulement supposée ;
3. `ref.id` composites stables (mission × période, comme `delivery_period`) ;
4. **le test qui prouve le point de vigilance n°2b** : un collaborateur avec des alertes de rentabilité sur DEUX comptes différents (jeu de données avec deux `company_id` de missions distincts) ne doit faire apparaître dans le corpus du compte A que ses alertes réellement rattachées à une mission de A, jamais celles de B ;
5. saturation d'une borne dure → exclusion `provider_limit` tracée.

`mission-catalog.test.ts` : lancement refusé sans les deux sélecteurs requis (mécanisme déjà générique, testé pour `requiredAtLaunch` — vérifie juste que le preset les déclare tous les deux).

### 6. Le pilote

Comme pour L7.1/L7.2 : vérifie que le dataset de test couvre un compte avec au moins 2 missions et des CRA sur plusieurs mois avant de lancer. Si le dataset n'est pas prêt, arrête-toi à la fin des tests et dis-le.

**Critère de sortie du pilote (`09` §5.6, inchangé)** :
1. le rapport tranche explicitement sur la santé du compte, au-delà de l'énumération des chiffres ;
2. au moins un `finding` croise relation (signal, interaction, enjeu) et exécution (marge, CRA) ;
3. aucun chiffre de rémunération individuelle n'apparaît, à aucun niveau du texte produit.

## Ce que ce lot ne fait pas

- Aucune généralisation supplémentaire du composeur — L7.3 a déjà livré ce qu'il faut.
- Aucun changement à `intelligence-registry.ts` ou `resolveIntelligenceActions` — hors sujet, ce lot vit entièrement dans `AccountPanelContent`.
- Aucune migration, aucun changement n8n, aucun réimport VPS.
- Ne réutilise pas `deep_analysis` ou `build_roadmap` pour cette mission : ce sont des actions distinctes, toujours `coming_soon`, qui gardent leur propre avenir.

## Boucle de validation, dans cet ordre, à chaque étape significative

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

`npm run test:n8n` n'est pas requis : aucun fichier de `n8n/workflows/` n'est touché.

Rapporte les résultats réels de chaque commande, échecs compris. Si `typecheck` échoue sur `parseCorpusSelector`/`corpusSelectorKey`, relis `09` §9 avant de contourner autrement qu'en ajoutant la branche manquante.
