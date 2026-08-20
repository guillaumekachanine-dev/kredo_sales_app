# 07 — Handoff courant : mission « Rentabilité du portefeuille » (L6)

> **Statut** : 🎯 **point d'entrée opérationnel du chantier.** Cadrage arrêté, implémentation à démarrer (lot L6.0).
> **Créé le** : 2026-08-20.
> **Remplace** : `05-HANDOFF-IMPLEMENTATION.md` (historique L0→L3) et `06-HANDOFF-L5-INCIDENT.md` (historique de l'incident + preuve L5).
> **Autorité normative** : `docs/adr/ADR-0020-missions-intelligence.md` (décisions M-1 à M-7). En cas de divergence, **l'ADR fait foi**.
>
> Ce document est **autoportant** : un agent entrant l'exécute sans lire `00` à `06`.
> Tous les chiffres de base qu'il cite ont été mesurés live le **2026-08-20** et portent
> cette date. Toute décision qu'il prend est justifiée sur place.

---

## 1. Où en est le chantier

| Lot | Contenu | État |
|---|---|---|
| Cadrage | ADR-0020, décisions M-1 à M-7 | ✅ Terminé |
| L0 | Contrats, catalogue TypeScript, preset pilote | ✅ Livré |
| L1 | `CorpusProvider`s, budget, trace, assemblage de prompt | ✅ Livré |
| L2 | Exécuteur n8n générique `mission-001-run` | ✅ Livré et **figé** |
| L3 | Callback, validation stricte `MissionReportV1`, type `mission_report` | ✅ Livré |
| L4 | Composeur UX Desktop + Mobile | ✅ Livré (commit `08482338`) |
| L5 | Pilote `veille-analyse-mensuelle` rejoué sur juillet 2026 | ✅ Validé le 2026-08-20 (run `581e4732-b949-4000-822f-14d86b951351`) |
| **L6** | **Mission #2 — `rentabilite-portefeuille`** | 🎯 **À faire — objet de ce document** |

La chaîne validée de bout en bout :

```text
Navigateur authentifié
  → POST /api/n8n/trigger  (branche missionSlug)
  → résolution serveur du MissionSpec
  → résolution / budget / trace du corpus
  → assemblage systemPrompt + userPrompt
  → ai_intelligence_runs (run_type = 'mission:<slug>')
  → mission-001-run (n8n)
  → Anthropic
  → callback Next.js signé
  → JSON.parse strict + validation MissionReportV1
  → vérification des SourceRef contre input_snapshot.trace
  → ai_intelligence_results (result_type = mission_report)
```

---

## 2. Pourquoi cette mission, et pas une autre

### 2.1 Le problème que L5 n'a pas pu démontrer

Le pilote L5 devait produire un livrable **iso-`intel-021`** : c'était le protocole de preuve.
Conséquence : il a démontré une non-régression, pas une capacité nouvelle. La valeur du moteur
reste donc à prouver sur un cas que **rien d'existant ne couvre**.

### 2.2 Le fait qui décide

Vérifié dans le code le 2026-08-20 — `src/components/intelligence/IntelligenceActionCard.tsx`,
fonction `resolveCommunicationConfig` :

| Action de `intelligence-registry.ts` | Description déclarée | Ce que le clic déclenche réellement |
|---|---|---|
| `analyze_margins` | « Décrypter les marges par mission, client et consultant » | composeur de **rédaction**, scénario `investment_arbitrage_argument` |
| `detect_anomalies` | « Identifier les écarts financiers et incohérences de facturation » | idem |
| `analyze_funnel` | « Analyser le funnel » | scénario `recruiter_briefing_pre_interview` |
| `project_portfolio_review` | « Synthétiser avancement, budget et risques des projets actifs » | scénario `project_status_pitch` |
| `forecast_revenue` | « Projeter le chiffre d'affaires » | scénario `direction_summary_pitch` |
| `analyze_skill_gaps` | « Gaps compétences vs demande marché » | scénario `internal_validation_before_send` |

**Une vingtaine des 33 actions du registre sont des intentions d'ANALYSE routées vers le
moteur de RÉDACTION.** Kredo ne calcule rien : il fait rédiger un argumentaire *qui parle* de
marges. INTEL-020 n'est pas « la feature qui couvre déjà le besoin » — c'est le cache-misère
de ce qui n'est pas couvert.

`analyze_margins` est le plus caricatural des six, et il porte le cœur de métier d'un centre
de profit en ESN. C'est donc lui la mission #2.

### 2.3 Non-redondance, feature par feature

| Feature existante | Pourquoi elle ne couvre pas ce besoin |
|---|---|
| **INTEL-020 (rédaction assistée)** | `CommunicationOutputKind` ∈ {`written_message`, `spoken_pitch`, `structured_briefing`} : produit un texte **destiné à un destinataire**, sans `evidence[]` vérifiée contre un corpus. Corpus = le contexte d'**une** entité résolu par le scénario |
| **Hub compte (intel-030 / 031 / 032)** | Corpus = **un** compte, 5 analyses figées, RPC d'hydratation dédiées. Ne voit ni CRA, ni CJM, ni P&L |
| **Pages `/missions/actives`, `/pilotage`** | **Affichent** les chiffres. N'en tirent aucun constat, aucune imputation, aucune recommandation, aucune trace de source |
| **`report-*` (rapports n8n)** | Rapports d'activité à périmètre figé, un workflow chacun, import VPS manuel à chaque évolution |

### 2.4 Ce que ce lot prouve à l'échelle du chantier

`n8n/workflows/mission-001-run.json` **ne contient aucune occurrence de « veille »** (vérifié :
0). Le workflow est intégralement générique.

> **La mission #2 se livre sans écrire une ligne de JSON n8n et sans aucun import sur le VPS.**

C'est le test de sortie annoncé au cadrage du chantier. L6 est le lot qui le vérifie.

---

## 3. Cadrage de la mission

### 3.1 Intention métier

> À partir de l'activité facturée, des coûts internes et du P&L d'un mois donné, replacés sur
> les trois mois précédents : identifier **où la rentabilité du centre de profit se fait et se
> perd**, nommer les dérives par mission / client / consultant, et formuler les actions
> prioritaires.

- **Slug** : `rentabilite-portefeuille`
- **Contrat de sortie** : `MissionReportV1` — **inchangé**. Aucun nouveau `resultType`, aucun
  nouveau `intelligence_document_type`, aucune migration.
- **Destinataire** : le manager de centre de profit (le `systemPrompt` générique le nomme déjà).

### 3.2 Décisions arrêtées le 2026-08-20

| # | Question | Décision | Motif |
|---|---|---|---|
| D-1 | Maille temporelle | **Mois analysé + 3 mois d'historique** | Aligné sur `mission_activity_reports` (227 CRA mensuels), `pnl_monthly` (15 mois), `v_collaborator_activity_summary`. Sans historique, la catégorie `tendance` du contrat serait morte et le rapport ne dirait que « la marge est de X % » |
| D-2 | Point d'entrée cockpit | **Réutiliser `analyze_margins`** | L'action existe déjà sur `/missions`, `/missions/actives`, `/missions/projets`. On supprime son routage vers le composeur de rédaction. Créer une action parallèle laisserait deux entrées concurrentes sur la même intention dans le même panneau |
| D-3 | Catégories de `Finding` | **Réutilisées telles quelles** | `tendance` / `signal_faible` / `opportunite` / `risque` / `autre` couvrent le besoin ; `reglementaire` reste inutilisé. Étendre l'union réintroduirait un schéma de sortie par mission, interdit par **ADR-0020 M-7** |
| D-4 | Mode d'exécution du provider | **`user_rls`** | Décision de sécurité, cf. §4.3 |
| D-5 | Profondeur d'historique | **Dérivée côté serveur**, jamais envoyée par le client | Une profondeur pilotée par le navigateur serait un levier de coût LLM exposé à l'appelant |

---

## 4. Le corpus — nouveau `CorpusKind` : `delivery_period`

### 4.1 Sélecteur

```ts
{ kind: "delivery_period"; periodStart: string; periodEnd: string }
```

`periodStart` / `periodEnd` sont les **bornes du mois analysé** (format `YYYY-MM-DD` strict,
validé par `isIsoDate`). Le provider dérive lui-même la fenêtre d'hydratation en remontant de
**3 mois** avant `periodStart` (D-5).

### 4.2 Sources hydratées

Toutes vérifiées live le 2026-08-20 : `security_invoker = true` et `SELECT` accordé à
`authenticated`.

| Source | Grain d'un `CorpusItem` | `ref.table` | `ref.id` |
|---|---|---|---|
| `pnl_monthly` | 1 item par mois de la fenêtre | `pnl_monthly` | `id` (uuid) |
| `v_collaborator_activity_summary` | 1 item par collaborateur × mois | `v_collaborator_activity_summary` | `${collaborator_id}:${period_start}` |
| `v_profitability_alerts` | 1 item par ligne portant au moins une alerte à `true` | `v_profitability_alerts` | `${collaborator_id}:${period_start}:alerts` |
| `v_mission_quarterly_revenue` | 1 item par mission × trimestre recouvrant la fenêtre | `v_mission_quarterly_revenue` | `${mission_id}:${quarter_start}` |
| `missions` | 1 item par mission active sur la fenêtre (référentiel : client, practice, TJM, CJM, `gross_margin_pct`) | `missions` | `id` (uuid) |

**Les `ref.id` composites sont légitimes.** `refKey()` vaut `` `${kind}:${table}:${id}` `` et
traite l'identifiant comme une **chaîne opaque**
(`src/features/intelligence-missions/domain/validate-mission-report.ts`, fonction `refKey`) ;
le validateur ne fait que comparer une citation aux entrées `kept: true` de la trace. Aucun
contrôle de format uuid n'existe à ce niveau.

### 4.3 Mode d'exécution : `user_rls` — et c'est une décision de sécurité

Ces vues dérivent de `collaborator_compensation`, dont **les 4 policies RLS exigent
`is_workspace_admin()`**. Elles sont toutes `security_invoker = true`.

Conséquence, et c'est l'effet recherché : sous le client Supabase de l'utilisateur, **un
non-admin obtient simplement zéro ligne de coût**. La confidentialité de la rémunération est
portée par la base, jamais par le prompt.

> 🔴 **Un provider `service_role` ici serait une fuite de rémunération dans un rapport LLM
> archivé.** Ne pas « corriger » un corpus vide en basculant en service-role : un corpus vide
> pour un non-admin est le comportement correct.

Comme ses trois pairs, le provider porte quand même un `.eq("workspace_id", …)` explicite —
seconde serrure, doctrine du repo, jamais la protection principale.

### 4.4 Le point dur : un corpus de nombres, pas de prose

Les trois providers existants (`veille_period`, `intelligence_document`, `account_context`)
hydratent de la **prose**. Celui-ci hydrate des **nombres** — et un LLM qui recalcule des
ratios se trompe de façon crédible.

**Parade, obligatoire des deux côtés :**

1. **Dans le provider** — pré-calculer tous les dérivés et les rendre **déjà formatés** dans
   `content` : marge en valeur et en %, écart vs M-1, écart vs moyenne des 3 mois, jours
   facturables vs jours ouvrés. Le LLM lit, il ne calcule pas.
2. **Dans les `constraints.rules` du preset** — la règle explicite :
   > « Ne recalcule aucun ratio ni aucun écart. Tous les chiffres et toutes les variations
   > nécessaires sont fournis dans le corpus. Ne produis aucun chiffre absent du corpus. »

C'est la transposition directe de la règle projet « ne jamais recalculer la marge côté front »
(`missions.gross_margin_pct` et `collaborator_compensation.cjm` sont des colonnes GÉNÉRÉES).

### 4.5 Budget

```ts
{ maxTotalChars: 120_000, maxCharsPerItem: 1_200, maxItems: 250 }
```

Dimensionné sur le réel mesuré le 2026-08-20 : `missions` 33, `mission_activity_reports` 227,
`collaborators` 30, `pnl_monthly` 15, `collaborator_absences` 88. Sur une fenêtre de 4 mois :
~80 lignes d'activité + ~4 × N synthèses collaborateur + 4 lignes P&L + le référentiel missions.

**Poids du provider : `95`** — au-dessus d'`account_context` (90), de `intelligence_document`
(70) et de `veille_period` (50). Motif : la ligne P&L du mois analysé est l'ancre de la
mission ; elle ne doit jamais tomber par troncature de budget. Documenter ce poids dans le
commentaire de `corpus-provider-registry.ts`, qui porte déjà l'échelle complète.

---

## 5. Roadmap d'implémentation

Six lots livrables indépendamment. **Aucun ne touche n8n, aucun ne touche la base.**

### L6.0 — Ouvrir le `CorpusKind`

**Fichiers** (production ; les tests suivent) :

| Fichier | Modification |
|---|---|
| `src/features/intelligence-missions/domain/mission-contracts.ts` | `CorpusKind` += `"delivery_period"` ; `CorpusSelector` += la variante |
| `src/features/intelligence-missions/domain/mission-selectors.ts` | branche dans `parseCorpusSelector` **et** cas dans `corpusSelectorKey` |
| `src/features/intelligence-missions/domain/validate-mission-report.ts` | `CORPUS_KINDS` (`satisfies Record<CorpusKind, true>`) |
| `src/features/intelligence-missions/data/corpus/corpus-provider-registry.ts` | `CORPUS_PROVIDERS` (`Record<CorpusKind, CorpusProvider>`) — se fait en L6.1 |

> 🔴 **Trois de ces quatre sites sont désignés par `tsc`. Le quatrième, non.**
> `parseCorpusSelector` se termine par `return null` : oublier sa branche **compile
> parfaitement** et fait échouer tout lancement à l'exécution avec « Sélecteur de corpus
> invalide à l'index 0 ». C'est le piège le plus coûteux de ce lot.

**Critère de sortie** : `npm run typecheck` vert, et un test dans
`__tests__/mission-selectors.test.ts` qui parse un sélecteur `delivery_period` valide, en
rejette un aux dates inversées, et vérifie la clé rendue par `corpusSelectorKey`.

---

### L6.1 — Le provider

**Fichier créé** : `src/features/intelligence-missions/data/corpus/delivery-period-provider.ts`
— calqué sur `veille-period-provider.ts` (même en-tête documentaire, même `capExclusion`, même
`import "server-only"`).

**Points de vigilance :**
- fenêtre d'historique **dérivée dans le provider** (D-5) ;
- une borne dure de requête par source, avec exclusion `provider_limit` tracée à saturation —
  jamais de troncature muette (ADR-0020 §4.4) ;
- jointures **en deux temps**, jamais d'embed PostgREST (doctrine du repo) ;
- les lignes de `v_profitability_alerts` sans aucune alerte à `true` ne produisent **pas**
  d'item : ce serait du bruit, pas une exclusion.

**Enregistrement** : entrée dans `CORPUS_PROVIDERS`, plus la ligne de poids `95` dans le
commentaire d'échelle du registre.

**Tests** — `__tests__/delivery-period-provider.test.ts`, sur `fake-supabase.ts` :
1. la fenêtre hydratée couvre bien 4 mois à partir d'un sélecteur d'un seul mois ;
2. saturation d'une borne → exclusion `provider_limit` présente dans le résultat ;
3. **un utilisateur non-admin (vues rendant 0 ligne de coût) obtient un corpus partiel, pas
   une erreur** ;
4. les `ref.id` composites sont stables et déterministes.

**Critère de sortie** : `npm test` vert + `npm run check:server-boundary` vert.

---

### L6.2 — Le preset

**Fichier** : `src/features/intelligence-missions/domain/mission-catalog.ts` — une entrée
`rentabilite-portefeuille`, `version: 1`, `corpus.base: []`,
`corpus.requiredAtLaunch: ["delivery_period"]`, `userAddition: { allowed: false, kinds: [] }`,
budget du §4.5, modèle `claude-sonnet-5` / `maxOutputTokens: 8_000` (aligné sur le pilote
veille, dont la version 3 a dû monter à 8 000 — ne pas repartir plus bas).

Le `promptTemplate` demande, en plus des règles génériques déjà portées par
`buildMissionSystemPrompt` :
- un `executiveSummary` qui **tranche** (où se fait la marge, où elle se perd) ;
- au maximum 8 `findings`, imputés à une mission / un client / un consultant nommé ;
- au maximum 5 `recommendations` avec `horizon` renseigné ;
- la règle anti-recalcul du §4.4 dans `constraints.rules`.

**Critère de sortie** : `mission-catalog.test.ts` vérifie que le lancement est refusé sans
sélecteur `delivery_period`, et un test d'`assemble-mission-prompt` fige le prompt rendu.

---

### L6.3 — Généraliser le composeur

Aujourd'hui le composeur est **câblé en dur sur la veille** :
`mission-composer-model.ts` expose `launchMonthlyWatchMission(month)` et
`MONTHLY_WATCH_MISSION_SLUG` ; `MissionComposerDesktop.tsx` porte le titre et le sélecteur de
mois en dur ; `use-mission-launcher.ts` appelle directement la fonction de la veille.

**Travail** : faire passer le preset (label, description, libellé du livrable) et la fabrique
de sélecteurs en **props**, avec un `launchMission(slug, selectors)` générique côté modèle.
Les deux missions partagent alors le même composant Desktop et le même composant Mobile.

Le formulaire reste un `<input type="month">` dans les deux cas — la mission rentabilité prend
elle aussi un mois. **Ne pas construire de composeur générique de corpus** : ce n'est ni
demandé ni justifié par deux presets.

**Critère de sortie** : le pilote veille ne régresse pas (`mission-composer-model.test.ts` et
`mission-launch-pilot.test.ts` verts sans réécriture de leurs assertions métier).

---

### L6.4 — Rebrancher `analyze_margins`

| Fichier | Modification |
|---|---|
| `src/components/intelligence/IntelligenceActionCard.tsx` | **supprimer** le `case "analyze_margins":` (et `"detect_anomalies"` qui partage sa branche → à basculer en `coming_soon` honnête plutôt qu'en faux composeur) de `resolveCommunicationConfig` ; traiter `analyze_margins` comme action-mission |
| `src/components/intelligence/IntelligencePanel.tsx` | `isAvailableMissionAction` ne peut plus tester une constante unique — passer à un **ensemble** d'action-ids de mission |
| `src/components/intelligence/IntelligenceFAB.tsx` | même généralisation (`resolved.contextualActions.find(...)`) |
| `src/lib/intelligence/intelligence-registry.ts` | ajuster le `label` / la `description` d'`analyze_margins` pour décrire le livrable réel, et confirmer `status: "active"` |

**Critère de sortie, vérifiable à l'œil** : sur `/missions/actives`, « Analyse des marges »
ouvre le composeur de mission. Il n'ouvre plus le composeur de mails.

> ⚠️ La QA visuelle est faite par Guillaume. Ne pas ouvrir de navigateur sans qu'il en donne
> la main.

---

### L6.5 — Le pilote, en production

**Lancer la mission sur juillet 2026.**

Les données réelles portent un décrochage net, mesuré le 2026-08-20 sur `pnl_monthly` :

```
2026-06   CA 262 880 €   marge brute 48,02 %   (source cra_derived)
2026-07   CA 197 430 €   marge brute 28,76 %   (source cra_derived)   ← −19,26 pts
2026-08   CA 176 005 €   marge brute 18,25 %   (source cra_derived)
```

et, sur `mission_activity_reports`, la cause candidate présente dans le corpus :

```
2026-06   21 CRA   426,0 jours facturables
2026-07   19 CRA   318,5 jours facturables   ← −25 %
```

> ### Critère de sortie — falsifiable, pas déclaratif
>
> **Le rapport de juillet 2026 est validé si et seulement si :**
> 1. il **nomme** le décrochage de marge du mois ;
> 2. il l'**impute** à au moins une cause présente dans le corpus ;
> 3. chaque constat chiffré **cite** une source résolue contre la trace ;
> 4. il ne produit **aucun chiffre absent** du corpus.
>
> Un rapport plausible qui ne voit pas le décrochage est un **échec**, pas un premier jet.

À consigner à la validation, comme pour L5 : id d'exécution n8n, `run_id`, `run_type`,
`missionVersion`, statistiques de corpus (`kept`/`requested`/`totalChars`), `result_id`,
`result_type`, titre produit.

---

## 6. Condition d'arrêt du chantier

Elle est écrite ici pour qu'aucun agent entrant ne la contourne par enthousiasme.

> **Si L6.5 échoue, le catalogue est gelé à deux presets et l'investissement cesse.**

On ne démantèle rien : L0→L5 sont amortis, le pilote veille fonctionne et le moteur ne coûte
plus rien à l'entretien. Mais l'échec de L6.5 signifierait que le moteur n'apporte rien sur un
corpus numérique — c'est-à-dire sur tout ce qui distingue les missions du moteur de rédaction.
Dans ce cas, **la bonne décision est d'arrêter**, et la faire prendre à Guillaume, pas de
relancer un L7.

Corollaire, issu de la règle de gouvernance du chantier : avant de transformer une idée en
mission, **auditer l'existant**. Une capacité déjà servie par INTEL-020 ou par le hub compte
n'est pas une mission — c'est une duplication.

---

## 7. Pièges vérifiés

- 🔴 **`parseCorpusSelector` n'est pas exhaustif au sens de `tsc`.** Ajouter un `CorpusKind`
  sans ajouter sa branche compile, puis échoue à l'exécution. Cf. L6.0.
- **`tsc` ne voit pas tout.** Un composant client important une *valeur* depuis un module
  `server-only` passe le typecheck et casse `next build`. Seul le build le révèle — et
  `build:webpack` est la seule application réelle de la frontière (Turbopack la tolère).
- **`.next/` périmé** produit de faux `TS6200` / `TS2300` : purger avant de conclure à une
  régression.
- **`npm test` n'inclut que `src/**/*.test.ts`.** `npm run test:n8n` est **sans objet sur ce
  lot** : aucun fichier de `n8n/workflows/` n'est touché. Ne pas le lancer par réflexe, et
  surtout **ne pas modifier `mission-001-run.json`** — il est figé, générique, et l'intérêt du
  lot est précisément de ne pas y toucher.
- **Vocabulaire finance — ne pas confondre**, un prompt qui se trompe ici produit un rapport
  faux et crédible :
  - **TJM** = Taux Journalier Moyen (vendu au client) ;
  - **CJM** = Coût Journalier Moyen (coût interne chargé) ;
  - **TACI** = Taux d'**Activité** Congés Inclus — un **TAUX entre 0 et 1**, pas un coût ;
  - marge brute = (TJM − CJM) / TJM, **colonne générée**, jamais recalculée.
- **`missions.practice` est un texte libre historique** sans FK vers `offer_practices.slug`.
  Ne pas tenter de joindre : dette documentée et volontairement non corrigée.
- **RLS `collaborator_compensation`** : 4 policies exigeant `is_workspace_admin()` — ce n'est
  pas le motif uniforme du reste de la base. Cf. §4.3.

---

## 8. Boucle de validation

Dans cet ordre, à chaque lot :

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

`npm run test:n8n` : **non requis sur ce chantier** (§7).

---

## 9. Ce que ce lot ne fait pas

- **Aucune migration.** Ni table, ni colonne, ni valeur d'enum. `mission_report` existe déjà
  (migration `20260818140533`).
- **Aucun JSON n8n, aucun import VPS.** C'est le point de la démonstration.
- **Aucun nouveau contrat de sortie.** `MissionReportV1` est le seul, pour toutes les missions
  (ADR-0020 M-7).
- **Aucun composeur générique de corpus.** Deux presets ne le justifient pas ; le construire
  maintenant serait de l'anticipation.
- **Aucune reprise des 12 workflows métier existants.** Le moteur de missions est une
  **addition**, pas une refonte : une généralisation ne rentabilise que les cas à venir.
