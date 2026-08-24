Tu travailles sur Kredo. Lis d'abord `CLAUDE.md` à la racine du repo — il fait autorité sur la stack, les conventions et la méthode de travail attendue. Applique-le sans exception (lire avant d'écrire, annoncer puis exécuter, boucle de validation typecheck → test → check:server-boundary → lint → build).

## Contexte

Le moteur de missions d'intelligence de Kredo (ADR-0020, **Accepté**) tourne en production avec **quatre** missions actives : `veille-analyse-mensuelle`, `rentabilite-portefeuille` (L6), `activation-portefeuille` (L7.1) et `capacite-staffing` (L7.2, livré le 2026-08-24). Les quatre partagent aujourd'hui le même composeur à sélecteur mensuel.

Tu démarres **L7.3 : généraliser le composeur** — un lot différent des précédents. Ce n'est pas un nouveau `CorpusKind` ni un nouveau provider : c'est un refactor du système de types et des deux composants de formulaire (`MissionComposerDesktop.tsx`/`Mobile.tsx`) pour qu'ils sachent produire un sélecteur `account_context { companyId }` en plus du sélecteur mensuel actuel. C'est le prérequis de `revue-compte-client` (L7.4), qui est *entity-scoped* (une mission par compte, pas par mois).

**Lis, dans cet ordre, avant d'écrire une seule ligne :**
1. `docs/FEATURES/intelligence_missions/09-ROADMAP-5-MISSIONS.md`, section 4 (L7.3) — le cadrage arrêté le 2026-08-24. **Un détail y est déjà obsolète** : le §4.3 parle d'« adapter les deux configs existantes » — il y en a **quatre** aujourd'hui (`VEILLE_MISSION_COMPOSER_CONFIG`, `RENTABILITE_MISSION_COMPOSER_CONFIG`, `ACTIVATION_PORTEFEUILLE_MISSION_COMPOSER_CONFIG`, `CAPACITE_STAFFING_MISSION_COMPOSER_CONFIG`), toutes avec `inputKind: "month"` une fois ce lot livré. Le reste du §4 est vérifié exact contre le code au 2026-08-24 (voir point de vigilance ci-dessous).
2. Les fichiers réels, pas un handoff : `src/features/intelligence-missions/components/mission-composer-model.ts`, `use-mission-launcher.ts`, `MissionComposerDesktop.tsx`, `MissionComposerMobile.tsx`, `src/components/missions/AccountCombobox.tsx`, `src/hooks/use-intelligence-context.ts`. Ce lot touche des composants React existants plus qu'il n'en crée — les lire vaut mieux que n'importe quel résumé.

Ne relis pas `00` à `08` : non nécessaires. Pas de handoff numéroté séparé pour ce lot — `09` §4, ce prompt et les fichiers sources suffisent, comme pour L7.1/L7.2.

## Ce que tu livres

Le composeur sait produire deux formes de sélecteur selon un `inputKind` déclaré par la config : `"month"` (existant, inchangé pour les 4 missions actuelles) et `"account"` (nouveau, pour L7.4). Aucune mission du catalogue ne passe à `inputKind: "account"` dans ce lot — ce lot livre la capacité, L7.4 s'en sert.

### Le point de vigilance qui prime sur tout le reste

**Ce repo n'a AUCUNE infrastructure de test de composants React.** Vérifié le 2026-08-24 :
- `vitest.config.ts` : `include: ["src/**/*.test.ts"]` — **pas** `.test.tsx`.
- Zéro fichier `.test.tsx` dans tout `src/`.
- `@testing-library/react` n'est **pas** une dépendance du projet.

Conséquence directe sur le critère de sortie du `09` §4.6 (« un test nouveau vérifie que l'ouverture du composeur en mode Entité compte préremplit le sélecteur de compte ») : **ce test ne peut pas être un test de rendu de composant.** Si tu écris un `.test.tsx` avec React Testing Library, il ne tournera jamais (exclu par `vitest.config.ts`) ou cassera au premier `npm install` manquant — piège à session perdue, exactement le genre que `CLAUDE.md` documente pour d'autres pièges.

La conséquence architecturale : **extrais la logique de préremplissage en fonction pure, testable en `.test.ts`**, séparée du JSX qui l'appelle. Par exemple une fonction `resolveInitialAccountSelection(entityContext: IntelligenceEntityContext | null): AccountValue | null` (ou équivalent) dans `mission-composer-model.ts` ou un nouveau module `domain`-like du dossier `components/`, appelée depuis `MissionAccountField.tsx` mais testée seule, sans monter de composant. Le nom exact t'appartient — le principe ne se négocie pas.

## Travail à réaliser

### 1. Généraliser les types

Dans `src/features/intelligence-missions/components/mission-composer-model.ts` :

```ts
export type MissionLaunchInput =
  | { kind: "month"; month: string }
  | { kind: "account"; companyId: string }

export type MissionComposerConfig = {
  missionSlug: string
  label: string
  description: string
  inputKind: MissionLaunchInput["kind"]
  buildSelectors: (input: MissionLaunchInput) => CorpusSelector[]
}
```

`buildSelectors` change de signature (`month: string` → `input: MissionLaunchInput`) : adapte les 4 constructeurs existants (`VEILLE_MISSION_COMPOSER_CONFIG`, `RENTABILITE_MISSION_COMPOSER_CONFIG`, `ACTIVATION_PORTEFEUILLE_MISSION_COMPOSER_CONFIG`, `CAPACITE_STAFFING_MISSION_COMPOSER_CONFIG`) pour qu'ils déclarent `inputKind: "month"` et lisent `input.month` (avec une garde — un `MissionLaunchInput` de la mauvaise forme ne doit jamais atteindre silencieusement `monthToXxx()`).

### 2. `useMissionLauncher`

`src/features/intelligence-missions/components/use-mission-launcher.ts` : `launch(month: string)` devient `launch(input: MissionLaunchInput)`. Répercute dans les deux appelants (`MissionComposerDesktop.tsx` ligne `onClick={() => void launcher.launch(month)}`, `MissionComposerMobile.tsx` équivalent).

### 3. Les deux composeurs — switch sur `inputKind`

`MissionComposerDesktop.tsx` et `MissionComposerMobile.tsx` rendent aujourd'hui en dur un `<Input type="month">`. Extrais ce bloc dans un sous-composant (ex. `MissionMonthField.tsx`) et ajoute un `switch (config.inputKind)` qui rend soit ce champ mois, soit le nouveau champ compte (point 4). L'état local (`month` actuellement) devient un état générique typé `MissionLaunchInput | null` ou équivalent — le bouton "Lancer" doit rester désactivé tant que l'entrée n'est pas valide, exactement comme `disabled={isBusy || !month}` aujourd'hui.

### 4. `MissionAccountField.tsx` — nouveau composant

Enveloppe `AccountCombobox` (`src/components/missions/AccountCombobox.tsx`) avec `allowCreate={false}` — **aucune création de compte inline depuis un composeur de mission**, ce serait une fonctionnalité CRM hors sujet ici (`AccountCombobox` a `allowCreate = true` par défaut, il faut le forcer explicitement).

Préremplissage : lis `entityContext` via `useIntelligenceContext((state) => state.entityContext)` (`src/hooks/use-intelligence-context.ts`, store Zustand global — pas de prop-drilling nécessaire, `IntelligenceActionCard.tsx` fait déjà exactement ça). Si `entityContext?.entityType === "company"`, préremplis avec `entityContext.entityId` (et `entityContext.label` pour l'affichage). La fonction pure du point de vigilance ci-dessus fait cette résolution ; le composant l'appelle et hydrate son state initial.

### 5. Tests

`mission-composer-model.test.ts` :
- les 4 configs existantes construisent toujours les mêmes sélecteurs qu'avant, via `buildSelectors({ kind: "month", month })` — **assertions métier inchangées**, seule la forme d'appel change (même discipline que L6.3 : ne réécris pas ce que le test vérifiait, adapte seulement la syntaxe d'appel).
- nouveau : la fonction de résolution du préremplissage (point de vigilance) rend `null` quand `entityContext` est `null` ou d'un type autre que `"company"`, et la valeur attendue quand `entityContext.entityType === "company"`.

Vérifie aussi que `mission-launch-pilot.test.ts` reste vert sans modification de ses assertions métier — il exerce `launchMission`/le pipeline de lancement, pas directement `MissionComposerConfig.buildSelectors`, donc il ne devrait pas être affecté par ce refactor ; si `typecheck` le fait pourtant échouer, c'est un signal que la généralisation a une fuite de type quelque part, pas une raison d'ajuster ses assertions.

## Ce que ce lot ne fait pas

- Aucune mission du catalogue ne passe à `inputKind: "account"` — `revue-compte-client` (L7.4) est la première à s'en servir.
- Pas de composeur générique multi-source : deux formes (`month`, `account`) suffisent aux 5 missions prévues par la roadmap. Une troisième forme n'est ajoutée que si une future mission la réclame réellement.
- Pas de sélection de compte multiple.
- Aucun branchement de `AccountPanelContent` (`IntelligencePanel.tsx`, mode Entité) vers un `MissionComposerConfig` — c'est explicitement le travail de L7.4 §5.4 (« la mission apparaît comme action disponible sur la fiche compte »). Ce lot rend `MissionAccountField` capable de se préremplir *si* `entityContext` est déjà présent dans le store global au moment où le composeur s'ouvre, mais ne câble aucun nouveau point d'entrée UI vers `AccountPanelContent`.
- Aucune migration, aucun changement n8n, aucun réimport VPS.

## Boucle de validation, dans cet ordre, à chaque étape significative

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

`npm run test:n8n` n'est pas requis sur ce lot : aucun fichier de `n8n/workflows/` n'est touché.

Rapporte les résultats réels de chaque commande, échecs compris. Si `typecheck` révèle une erreur de type sur `buildSelectors` ou `launch` à un site que ce document n'a pas listé, c'est probablement un appelant de `useMissionLauncher`/`MissionComposerConfig` non recensé ici — cherche tous les usages avant de conclure à un cas particulier à contourner.

## Critère de sortie

`typecheck && test && check:server-boundary && lint && build` verts ; les 4 presets existants inchangés à l'usage (même comportement observable qu'avant ce lot) ; un test `.test.ts` (jamais `.test.tsx`) prouve que le préremplissage du sélecteur de compte fonctionne quand `entityContext.entityType === "company"` et rend `null`/absent sinon.
