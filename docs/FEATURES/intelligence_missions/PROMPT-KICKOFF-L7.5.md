Tu travailles sur Kredo. Lis d'abord `CLAUDE.md` à la racine du repo — il fait autorité sur la stack, les conventions et la méthode de travail attendue. Applique-le sans exception (lire avant d'écrire, annoncer puis exécuter, boucle de validation typecheck → test → check:server-boundary → lint → build).

## Contexte

Six missions d'intelligence tournent en production : `veille-analyse-mensuelle`, `rentabilite-portefeuille` (L6), `activation-portefeuille` (L7.1), `capacite-staffing` (L7.2), et `revue-compte-client` (L7.4, entity-scoped, clos le 2026-08-24 — pilote validé en conditions réelles sur Robertet et Voyage Privé après correction d'un bug de validation des citations, voir `docs/JOURNAL-SESSIONS.md` Session 51).

Tu démarres **L7.5 : mission `post-mortem-commercial`** — première mission du catalogue à granularité **trimestrielle**, et première à lire le pipe commercial clos (`opportunities` gagnées/perdues/abandonnées) plutôt que la delivery ou la prospection.

**Lis, dans cet ordre, avant d'écrire une seule ligne :**
1. `docs/FEATURES/intelligence_missions/09-ROADMAP-5-MISSIONS.md`, section 6 (L7.5) — le cadrage arrêté. **Deux points y sont corrigés ci-dessous** — lis-les avant de suivre le §6 littéralement.
2. `src/features/intelligence-missions/data/corpus/delivery-period-provider.ts` — le patron le plus proche pour la doctrine (poids, exclusion de colonnes confidentielles si besoin, dérivation trimestrielle via `getQuarterStart`, déjà écrite dans ce fichier ligne ~78, dupliquée dans `account-delivery-provider.ts`). `prospection-window-provider.ts` pour la forme d'un provider `periodStart`/`periodEnd` simple sans dérivation serveur cachée.
3. `src/lib/intelligence/intelligence-registry.ts` (entrée `prioritize_pipeline`, ligne ~144) et `src/components/intelligence/action-results/IntelligenceActionResultContent.tsx` / `PrioritizePipelineResult.tsx` — **pas le mécanisme que tu crois**, voir point de vigilance n°1.

Ne relis pas `00` à `05`, `07`, `08` en entier : non nécessaires. Pas de handoff numéroté séparé — `09` §6, ce prompt et les fichiers sources suffisent, comme pour L7.1-L7.4.

## Ce que tu livres

Une mission qui répond, pour un trimestre donné : *quelles affaires avons-nous gagnées ou perdues, pourquoi, et quels motifs se répètent.* Elle lit le pipe commercial **clos** sur la fenêtre (`stage` ∈ `gagne`/`perdu`/`abandonne`), avec son historique d'interactions, les profils présentés et leur issue, et les compétences demandées — ce qui n'existe dans aucun outil actuel du produit (`08` §5, mission post-mortem).

### Point de vigilance n°1 — `prioritize_pipeline` est déjà une action active, avec un mécanisme différent

Le `09` §6.5 propose de « requalifier `prioritize_pipeline` sur `/missions/opps` ». **Vérifié le 2026-08-24 : c'est un piège.** `prioritize_pipeline` existe dans `intelligence-registry.ts` avec `status: "active"` **depuis avant ce chantier**, et sert déjà un vrai usage : `IntelligenceActionResultContent.tsx` l'importe (`getPrioritizePipeline` depuis `@/lib/intelligence/actions/prioritize-pipeline`) et le rend via `PrioritizePipelineResult.tsx` — un mécanisme déterministe entièrement différent des missions d'intelligence, analogue au piège trouvé en L7.4 point de vigilance n°2 (mode Entité vs mode Page).

**Ne touche pas à `prioritize_pipeline`.** Choisis un nouvel id d'action dédié (ex. `post_mortem_pipeline` ou équivalent — vérifie qu'il n'entre pas en collision avec un id existant dans `intelligence-registry.ts`) et câble-le sur le patron déjà établi par `analyze_margins`/`prioritize_accounts`/`forecast_availability` (L6.4/L7.1/L7.2) : `status: "coming_soon" → "active"` dans le registre, branchement via `MISSION_COMPOSER_ACTION_CONFIGS` et `RegistryPanelContent` (`IntelligencePanel.tsx`) — mode Page, pas mode Entité (cette mission est mensuelle/trimestrielle, pas entity-scoped, donc `inputKind: "month"` comme les missions L6/L7.1/L7.2, pas `"account"` comme L7.4).

### Point de vigilance n°2 — la dérivation trimestrielle vit dans le composeur, pas dans le provider

Toutes les missions précédentes à sélecteur `periodStart`/`periodEnd` dérivent leur fenêtre **côté provider**, depuis la date serveur (`delivery_period` : mois + 3 mois d'historique ; `account_delivery` : 6 mois glissants). **`pipeline_period` est différente** : le `09` §6.1 précise que le sélecteur porte directement les bornes du **trimestre**, et que c'est `buildSelectors`, dans `mission-composer-model.ts`, qui calcule ces bornes à partir du mois choisi dans le formulaire (`inputKind: "month"`, réutilisé tel quel — pas de nouveau champ UI). Le provider, lui, reste simple : il reçoit `periodStart`/`periodEnd` déjà calculés et filtre dessus, sans logique de fenêtre glissante.

Utilise `getQuarterStart` (déjà écrite dans `delivery-period-provider.ts` et dupliquée dans `account-delivery-provider.ts` — ne la réécris pas une troisième fois, extrais-la si tu en vois l'occasion, mais ce n'est pas le sujet de ce lot) pour calculer le début du trimestre contenant le mois du formulaire ; la fin du trimestre est le dernier jour du 3ᵉ mois suivant.

## Travail à réaliser

### 1. Ouvrir le `CorpusKind`

Nouveau kind `"pipeline_period"`, sélecteur `{ kind: "pipeline_period"; periodStart: string; periodEnd: string }` — même forme que `veille_period`/`delivery_period`/`prospection_window`/`staffing_horizon`.

Fichiers : `mission-contracts.ts` (`CorpusKind` + `CorpusSelector`), `mission-selectors.ts` (**les deux branches** : `parseCorpusSelector` et `corpusSelectorKey` — piège documenté depuis `07`/`09` §9, toujours vrai), `validate-mission-report.ts` (`CORPUS_KINDS`).

### 2. Le provider `pipeline-period-provider.ts`

Poids **80** (`09` §6.2 et l'échelle documentée en tête de `corpus-provider-registry.ts` : entre 85 `prospection_window` et... vérifie la position exacte dans l'échelle actuelle, elle peut avoir changé depuis l'ajout de `account_delivery` à 92). Exécution `user_rls`.

Cinq sources, toutes filtrées sur la fenêtre et le workspace :
- `opportunities` dont `stage` ∈ `gagne`/`perdu`/`abandonne` et dont la date de clôture pertinente tombe dans `[periodStart, periodEnd]` — **vérifie quelle colonne porte la date de clôture** (`updated_at` ? une colonne dédiée ? aucune n'est garantie par `CLAUDE.md`) avant d'écrire le filtre ; si aucune colonne fiable n'existe, documente le choix de repli (ex. `updated_at`) et son imprécision plutôt que de le passer sous silence.
- `interactions` liées aux opportunités retenues (`opportunity_id`).
- `opportunity_candidates` liés (profils présentés, statut de présentation).
- `opportunity_skills` liés (compétences demandées, importance, niveau minimum).
- `companies` des comptes concernés (référentiel, pas de doublon si plusieurs affaires du même compte).

**Résous d'abord `opportunities`, tout le reste en dépend** (même séquencement que `account-delivery-provider.ts` : missions → CRA/alertes/CA).

Pas de colonne confidentielle connue à exclure ici (pas de rémunération individuelle dans ce corpus) — mais relis `opportunity_candidates`/`companies` pour confirmer qu'aucune ne porte de donnée sensible avant de conclure qu'il n'y a rien à exclure.

Enregistre dans `corpus-provider-registry.ts` (entrée + ligne de poids 80 dans le commentaire d'échelle).

### 3. Le preset

`mission-catalog.ts` : preset `post-mortem-commercial`, `version: 1`, `corpus.requiredAtLaunch: ["pipeline_period"]`.

**Contrainte spécifique non négociable (`09` §6.4)**, à porter dans `constraints.rules` ET dans le `promptTemplate` : interdiction de toute statistique en pourcentage sur l'ensemble des affaires (« X % des pertes... ») — garde-fou contre un corpus de ~27 affaires/an, insuffisant pour une lecture statistique. Le rapport doit rester nominatif, affaire par affaire.

### 4. Composeur et branchement cockpit

`mission-composer-model.ts` : nouvelle `MissionComposerConfig`, `inputKind: "month"`, `buildSelectors` qui calcule les bornes du trimestre contenant `input.month` (garde habituelle si `input.kind !== "month"`) et produit `[{ kind: "pipeline_period", periodStart, periodEnd }]`.

Branchement cockpit : voir point de vigilance n°1 — nouvel id d'action, mode Page (`RegistryPanelContent`/`MISSION_COMPOSER_ACTION_CONFIGS`), pas mode Entité.

### 5. Tests

`__tests__/pipeline-period-provider.test.ts` sur `fake-supabase.ts` :
1. filtrage correct sur `stage` (seules `gagne`/`perdu`/`abandonne` remontent, une affaire `en_cours`/`negociation` n'apparaît pas) ;
2. bornes de fenêtre respectées ;
3. `ref.id` stables et cohérents entre les 5 sources ;
4. isolation workspace ;
5. saturation d'une borne dure → exclusion `provider_limit` tracée.

`mission-composer-model.test.ts` : `buildSelectors` calcule le bon trimestre pour un mois donné à chacune des 4 positions (mois 1, 2 ou 3 du trimestre) — au moins un cas de passage d'année (décembre → T4 se terminant en décembre, pas de débordement sur l'année suivante).

`mission-catalog.test.ts` : preset complet, règle anti-statistique présente dans `constraints.rules` et dans le `promptTemplate`.

### 6. Le pilote

Choisis un trimestre du dataset de test avec un nombre significatif d'affaires closes (gagnées et perdues, pas uniquement l'un des deux) avant de lancer. Si aucun trimestre ne qualifie, arrête-toi à la fin des tests et dis-le — ne fabrique pas de données.

**Critère de sortie du pilote (`09` §6.6, inchangé)** :
1. chaque `finding` nomme une affaire précise, jamais une moyenne ou un agrégat ;
2. au moins un motif récurrent de perte est identifié et distingué explicitement d'un motif de gain ;
3. aucune statistique en pourcentage sur l'ensemble des affaires n'apparaît dans le texte produit, à aucun niveau (executiveSummary compris).

Une fois le pilote passé : consigner le run (id, trimestre, verdict des 3 critères) dans `docs/JOURNAL-SESSIONS.md` et marquer L7.5 `(CLOS)` dans `09` §6, sur le modèle de la Session 51.

## Ce que ce lot ne fait pas

- Ne touche pas à `prioritize_pipeline` ni à `@/lib/intelligence/actions/prioritize-pipeline` — mécanisme distinct, hors sujet.
- Aucune migration, aucun changement n8n, aucun réimport VPS.
- N'extrais pas `getQuarterStart` dans un module partagé sauf si ça ne coûte rien au périmètre — la duplication actuelle (`delivery-period-provider.ts`/`account-delivery-provider.ts`) est une dette connue, pas un blocage.

## Boucle de validation, dans cet ordre, à chaque étape significative

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

`npm run test:n8n` n'est pas requis : aucun fichier de `n8n/workflows/` n'est touché.

Rapporte les résultats réels de chaque commande, échecs compris. Si `typecheck` échoue sur `parseCorpusSelector`/`corpusSelectorKey`, relis `09` §9 avant de contourner autrement qu'en ajoutant la branche manquante.

**Avant de déclarer le lot clos** : vérifie en base (via le MCP Supabase, pas seulement via les logs applicatifs) que le run pilote a bien le statut `succeeded`, que le document est créé et lié au bon type d'entité, et que son contenu respecte réellement les 3 critères — ne te contente pas du message de succès de l'UI. Le lot L7.4 a révélé qu'un rapport de pilote peut être annoncé comme validé sans l'avoir réellement été.
