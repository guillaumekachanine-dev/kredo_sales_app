Tu travailles sur Kredo. Lis d'abord `CLAUDE.md` à la racine du repo — il fait autorité sur la stack, les conventions et la méthode de travail attendue. Applique-le sans exception (lire avant d'écrire, annoncer puis exécuter, boucle de validation typecheck → test → check:server-boundary → lint → build).

## Contexte

Le moteur de missions d'intelligence de Kredo (ADR-0020, **Accepté**) est livré et prouvé de bout en bout : deux missions tournent en production (`veille-analyse-mensuelle`, `rentabilite-portefeuille`), sans une ligne de JSON n8n par mission — `mission-001-run.json` est un exécuteur générique figé, et `MissionReportV1`/`mission_report` sont l'unique contrat de sortie pour toutes les missions (ADR-0020 M-7).

Une roadmap à 5 nouvelles missions a été arrêtée le 2026-08-24. Tu démarres le **premier lot : L7.1, mission `activation-portefeuille`.**

**Lis, dans cet ordre, avant d'écrire une seule ligne :**
1. `docs/FEATURES/intelligence_missions/07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md` — c'est le patron d'implémentation le plus récent et le plus détaillé, sur une mission de forme très proche (corpus temporel, provider `user_rls`, preset, branchement cockpit). Tu reproduis sa méthode, pas son contenu.
2. `docs/FEATURES/intelligence_missions/08-CATALOGUE-CANDIDAT-5-MISSIONS.md`, section mission #1 (`activation-portefeuille`) — l'argumentation métier, la non-redondance avec l'existant, les comptages de corpus mesurés le 2026-08-24.
3. `docs/FEATURES/intelligence_missions/09-ROADMAP-5-MISSIONS.md`, section 2 (L7.1) — le cadrage technique de ce lot précisément : `CorpusKind`, sources, fichiers, tests, critère de sortie.

Ne relis pas `00` à `06` : non nécessaires, comme le dit déjà `07`.

## Ce que tu livres

Une mission `activation-portefeuille` qui répond, chaque mois, à la question : *sur quels comptes concentrer l'effort commercial maintenant, et pourquoi ceux-là.* Elle **ne rédige rien** (ça reste INTEL-020), **ne construit pas de pitch** (Dynamic Playbooks), **ne recalcule ni ne cumule aucun score de signal** — c'est la règle la plus stricte de ce lot, expliquée au point suivant.

### Le point de vigilance qui prime sur tout le reste

Le commit `5744983e` (`fix(database): neutralize account global scores`, HEAD au moment du cadrage) a retiré du runtime Kredo toute note globale de compte (potentiel, priorité, conviction), **sans créer de remplacement**. C'est le trou que cette mission comble — mais elle doit le combler par un **jugement argumenté et sourcé**, jamais par un score reconstitué en douce. Concrètement : le provider ne doit **à aucun moment** additionner, moyenner, classer ou pondérer les `urgency_score`/`relevance_score`/`potential_value_score`/`global_score` de plusieurs signaux d'un même compte. Chaque score reste attaché à *son* signal dans le corpus hydraté ; c'est le LLM, dans le rapport, qui argumente — pas le provider qui pré-calcule un ordre. Un test doit le prouver (voir plus bas), pas seulement l'affirmer en commentaire.

## Travail à réaliser

### 1. Ouvrir le `CorpusKind`

Nouveau kind `"prospection_window"`, sélecteur `{ kind: "prospection_window"; periodStart: string; periodEnd: string }`, fenêtre proposée : 30 jours glissants dérivés côté serveur (jamais un paramètre navigateur qui étendrait le corpus).

Fichiers à toucher, dans `src/features/intelligence-missions/domain/` :
- `mission-contracts.ts` — `CorpusKind` et `CorpusSelector`.
- `mission-selectors.ts` — **deux** branches à ajouter : `parseCorpusSelector` (le `return null` en fin de fonction rend l'oubli invisible à `tsc` — piège documenté en `07` §7 et `09` §9, vérifie les deux sites) et `corpusSelectorKey`.
- `validate-mission-report.ts` — `CORPUS_KINDS`.

`CORPUS_PROVIDERS` dans `data/corpus/corpus-provider-registry.ts` est un `Record<CorpusKind, CorpusProvider>` exhaustif : ouvrir le kind sans livrer le provider dans la même passe fait échouer `typecheck` volontairement — ne dégrade jamais ce type en `Partial<...>`.

### 2. Écrire le provider

Nouveau fichier `src/features/intelligence-missions/data/corpus/prospection-window-provider.ts`, calqué sur `delivery-period-provider.ts` (même en-tête documentaire, même garde `import "server-only"`, mêmes bornes dures de requête tracées en `provider_limit`, jamais de troncature silencieuse). Exécution `user_rls`, poids **85**.

Cinq sources, toutes confirmées en RLS standard `authenticated` (vérifié live le 2026-08-24) :

| Source | Grain d'un `CorpusItem` |
|---|---|
| `v_active_account_signals` (vue défensive, exclut déjà `archived`/`dismissed` et `detected_at` > 2 mois) | 1 item par signal : catégorie, type, titre, résumé, les 3 scores, justification, action recommandée |
| `companies` | 1 item par compte touché par au moins un signal retenu (nom, segment, `relation_type`, `lifecycle_status`) |
| `interactions` | 1 item = dernière interaction connue par compte touché ; si aucune, un item synthétique explicite « aucune interaction depuis l'ouverture » — pas un trou silencieux |
| `contacts` (rôle décideur/prescripteur/sponsor) | 1 item par interlocuteur qualifié sur un compte touché |
| `account_issues` (`status = 'open'`) | 1 item par enjeu déjà cartographié sur un compte touché |

Jointures en deux temps, jamais d'embed PostgREST (doctrine du repo).

Enregistrer dans `CORPUS_PROVIDERS`, plus la ligne de poids 85 dans le commentaire d'échelle du registre (il porte déjà l'échelle complète — le lire avant d'écrire, pas le deviner).

### 3. Le preset

`src/features/intelligence-missions/domain/mission-catalog.ts` : entrée `activation-portefeuille`, `version: 1`, `corpus.base: []`, `corpus.requiredAtLaunch: ["prospection_window"]`, `userAddition.allowed: false`, modèle `claude-sonnet-5` / `maxOutputTokens: 8_000` (aligné sur les deux presets existants).

Le `promptTemplate` porte, en plus des règles génériques déjà communes aux deux presets existants (fonder exclusivement sur le corpus, ne rien inventer, distinguer faits/interprétations) :
- l'interdiction explicite de cumuler ou moyenner des scores de signaux entre eux — chaque score cité doit être attribué à un signal précis ;
- au maximum 8 comptes désignés, chacun avec son déclencheur (signal ou enjeu) et son interlocuteur pressenti si le corpus le connaît ;
- la permission explicite d'écarter un compte à signal fort en motivant pourquoi (classification incomplète, relation dormante, absence d'interlocuteur qualifié) plutôt que de l'omettre en silence.

### 4. Rebrancher le cockpit

`src/lib/intelligence/intelligence-registry.ts` : action `prioritize_accounts`, aujourd'hui `coming_soon` sur `/prospection` et `/prospection/accounts` — passer `status: "active"`, ajuster `description` pour décrire le livrable réel. Ajouter l'entrée dans `MISSION_COMPOSER_ACTION_CONFIGS` (`src/features/intelligence-missions/components/mission-composer-model.ts`), avec `buildSelectors` construisant le sélecteur `prospection_window` à partir du mois choisi dans le formulaire existant — **aucun changement du composeur n'est nécessaire pour ce lot**, le sélecteur mensuel actuel suffit.

Patron exact à reproduire : `analyze_margins` a été rebranché de façon identique en L6.4 (`07` §5, section L6.4) — même mécanique, même fichiers.

### 5. Tests

`__tests__/prospection-window-provider.test.ts` sur `fake-supabase.ts`, au minimum :
1. la fenêtre de 30 jours est correctement dérivée d'un sélecteur d'un seul mois ;
2. **un compte porteur de 5 signaux à score élevé ne produit aucune agrégation de score dans `content`** — le test qui doit échouer si le provider se met un jour à sommer ou moyenner ;
3. l'absence d'interaction sur un compte produit l'item synthétique attendu, pas un trou ;
4. saturation d'une borne dure de requête → exclusion `provider_limit` présente dans le résultat.

`mission-catalog.test.ts` : le lancement est refusé sans sélecteur `prospection_window`.

### 6. Le pilote

Avant de lancer le pilote, vérifie que le dataset de test (généré séparément par Guillaume) couvre bien une fenêtre de 30 jours avec des signaux réels sur plusieurs comptes — sans quoi le pilote ne peut rien démontrer. Si le dataset n'est pas encore disponible ou insuffisant, **arrête-toi à la fin du point 5** et dis-le explicitement plutôt que de lancer un pilote sur un corpus vide.

Si le dataset est prêt, lance la mission sur la fenêtre la plus récente qu'il couvre et consigne, comme pour L5/L6.5 : id d'exécution n8n, `run_id`, `run_type`, `missionVersion`, statistiques de corpus (`kept`/`requested`/`totalChars`), `result_id`, titre produit.

**Critère de sortie du pilote — falsifiable, pas déclaratif :**
1. le rapport désigne des comptes **nommés**, jamais des catégories ;
2. au moins un compte à signal fort est explicitement écarté, avec un motif tiré du corpus ;
3. aucun score cumulé ou moyenné n'apparaît nulle part dans le texte produit ;
4. chaque constat chiffré cite une source résolue contre la trace.

Un rapport plausible qui ne remplit pas ces quatre points est un échec de ce lot, pas un premier jet à affiner.

## Ce que ce lot ne fait pas

- Aucune migration, aucune valeur d'enum nouvelle, aucun JSON n8n, aucun import VPS.
- Aucun nouveau `resultType` ni type documentaire : `mission_report` couvre cette mission comme les deux précédentes.
- Aucun changement au composeur (`MissionComposerDesktop.tsx`, `MissionComposerMobile.tsx`, `use-mission-launcher.ts`) : ce lot utilise le sélecteur mensuel existant tel quel. La généralisation du composeur est un lot séparé (L7.3 de la roadmap), qui vient plus tard parce qu'une autre mission (`revue-compte-client`, entity-scoped) en a réellement besoin — ne l'anticipe pas ici.
- Aucune réouverture du débat sur le catalogue fermé ou sur les missions écartées : `08` §7 et §8 ont déjà tranché.

## Boucle de validation, dans cet ordre, à chaque étape significative

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

`npm run test:n8n` n'est pas requis sur ce lot : aucun fichier de `n8n/workflows/` n'est touché, et il ne doit surtout pas l'être.

Rapporte les résultats réels de chaque commande, échecs compris. Si `typecheck` révèle une erreur à un site que ce document n'a pas listé, c'est probablement `parseCorpusSelector` ou `corpusSelectorKey` — relis `09` §9 avant de la contourner autrement qu'en ajoutant la branche manquante.
