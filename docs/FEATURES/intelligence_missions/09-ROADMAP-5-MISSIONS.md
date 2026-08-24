# 09 — Roadmap d'implémentation : 5 missions d'intelligence

> **Statut** : roadmap arrêtée, prête à exécution lot par lot.
> **Créé le** : 2026-08-24. **Prérequis lu** : `08-CATALOGUE-CANDIDAT-5-MISSIONS.md` (carte fonctionnelle, corpus mesuré, argumentation des 5 missions — **non reproduite ici**, ce document ne fait que l'implémentation).
> **Autorité normative** : `docs/adr/ADR-0020-missions-intelligence.md`. En cas de divergence, l'ADR fait foi.
> Chaque lot de ce document, à son démarrage, produit son propre handoff détaillé sur le modèle de `07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md` — celui-ci fixe le séquencement, le périmètre et les contrats, pas l'implémentation ligne à ligne.

---

## 1. Décision de séquencement

Le classement par valeur/coût de `08` (§6) reste la référence, avec un arbitrage tranché avec Guillaume le 2026-08-24 : **la généralisation du composeur reste un lot dédié, positionné juste avant la première mission qui en a besoin — pas repoussée indéfiniment, pas non plus mise en tête.** Trois missions se livrent avec le composeur actuel (sélecteur mensuel) ; ça n'a aucun sens de généraliser une UI avant d'avoir un deuxième cas d'usage qui le justifie réellement.

| Lot | Contenu | Composeur requis | Nouveau |
|---|---|---|---|
| **L7.1** | Mission `activation-portefeuille` | Existant (mois) | `CorpusKind` + provider + preset |
| **L7.2** | Mission `capacite-staffing` | Existant (mois) | `CorpusKind` + provider + preset |
| **L7.3** | Généraliser le composeur (sélecteur de compte) | — | Formulaire à variantes |
| **L7.4** | Mission `revue-compte-client` | Généralisé (compte) | 2 `CorpusKind` (réutilise `account_context`) + provider + preset |
| **L7.5** | Mission `post-mortem-commercial` | Existant + granularité trimestre | `CorpusKind` + provider + preset |
| **L7.6** | Mission `funnel-recrutement` | Existant (mois) | `CorpusKind` + provider + preset |

**Aucun lot ne touche n8n ni la base.** `mission-001-run.json` reste figé et `MissionReportV1` / `mission_report` restent le seul contrat de sortie (ADR-0020 M-7). C'est la propriété qui a rendu L6 possible et qui rend cette roadmap possible.

### 1.1 Le dataset de test

Guillaume génère un nouveau jeu de données de test qui couvrira les cinq missions. Deux conséquences pour chaque lot :
- **Les tests unitaires de provider ne dépendent jamais du dataset réel** : ils tournent sur `fake-supabase.ts`, comme les quatre providers existants. Le dataset réel ne conditionne que le **pilote** (dernière étape de chaque lot, sur le modèle L6.5), pas le développement.
- Le pilote de chaque lot est **bloqué** tant que le dataset ne couvre pas la fenêtre temporelle et les entités que la mission doit démontrer. À vérifier au démarrage de chaque lot, pas à la fin.

---

## 2. L7.1 — Mission `activation-portefeuille`

### 2.1 Corpus — nouveau `CorpusKind: prospection_window`

```ts
{ kind: "prospection_window"; periodStart: string; periodEnd: string }
```

`periodStart`/`periodEnd` bornent la fenêtre de signaux (proposé : 30 jours glissants, dérivés côté serveur comme `delivery_period` dérive ses 3 mois d'historique — jamais un paramètre navigateur qui étendrait le corpus à volonté).

### 2.2 Sources — exécution `user_rls`, poids **85**

| Source | Grain d'un `CorpusItem` | `ref.table` | RLS vérifiée |
|---|---|---|---|
| `v_active_account_signals` (exclut déjà `archived`/`dismissed` et `detected_at` > 2 mois) | 1 item par signal : `signal_category`, `signal_type`, `title`, `summary`, `urgency_score`, `relevance_score`, `potential_value_score`, `score_justification`, `recommended_action` | `v_active_account_signals` | `security_invoker`, confirmé |
| `companies` | 1 item par compte touché par au moins un signal retenu : `name`, `segment_id` (résolu via `v_sector_knowledge_resolved` si le budget le permet, sinon juste l'id), `relation_type`, `lifecycle_status`, `classification_confiance` | `companies` | RLS standard |
| `interactions` | 1 item = la dernière interaction connue par compte touché (`type`, `occurred_at`, `summary`, `sentiment`) ; si aucune, un item synthétique « aucune interaction depuis l'ouverture du compte » — **pas une absence silencieuse** | `interactions` | RLS standard |
| `contacts` (rôle `decideur`/`prescripteur`/`sponsor`) | 1 item par interlocuteur qualifié sur un compte touché : `job_title`, `relationship_role`, `decision_power` | `contacts` | RLS standard |
| `account_issues` (`status = 'open'`) | 1 item par enjeu déjà cartographié sur un compte touché : `title`, `category`, `criticality`, `business_impact` | `account_issues` | RLS standard, confirmée live 2026-08-24 |

**🔴 Règle non négociable, héritée du LOT 1 (`account_global_scores_removal`, HEAD `5744983e`)** : le provider ne calcule et n'expose **aucune agrégation de score par compte** (pas de somme, moyenne ou tri des `urgency_score`/`relevance_score`/`potential_value_score` groupés par `company_id`). Chaque score reste un fait attaché à **son** signal. Test dédié obligatoire : un compte avec 5 signaux à score élevé ne doit produire aucun `content` contenant un total ou une moyenne calculée par le provider.

### 2.3 Fichiers

| Fichier | Modification |
|---|---|
| `domain/mission-contracts.ts` | `CorpusKind` += `"prospection_window"` ; `CorpusSelector` += la variante |
| `domain/mission-selectors.ts` | branche `parseCorpusSelector` **et** `corpusSelectorKey` — les deux, cf. piège L6.0 |
| `domain/validate-mission-report.ts` | `CORPUS_KINDS` |
| `data/corpus/prospection-window-provider.ts` | nouveau, calqué sur `delivery-period-provider.ts` (fenêtre dérivée côté serveur, `capExclusion`, `import "server-only"`) |
| `data/corpus/corpus-provider-registry.ts` | entrée + ligne de poids 85 dans le commentaire d'échelle |
| `domain/mission-catalog.ts` | preset `activation-portefeuille`, `version: 1` |

### 2.4 Preset — contraintes de prompt spécifiques

En plus des règles génériques (fonder exclusivement sur le corpus, ne rien inventer, distinguer faits/interprétations) :
- « Ne calcule, ne cumule ni ne moyenne aucun score de signal entre eux. Chaque score cité doit être attribué à un signal précis, jamais à un compte pris globalement. »
- « Le rapport doit désigner au maximum 8 comptes. Pour chaque compte retenu, nomme le signal ou l'enjeu déclencheur et l'interlocuteur pressenti s'il est connu du corpus. »
- « Si un compte porte des signaux forts mais que le corpus indique une classification incomplète, une relation dormante ou l'absence d'interlocuteur qualifié, tu peux l'écarter explicitement — dis-le et motive-le plutôt que de l'omettre silencieusement. »

### 2.5 Branchement cockpit

`prioritize_accounts` (`src/lib/intelligence/intelligence-registry.ts`), aujourd'hui `coming_soon`, sur `/prospection` et `/prospection/accounts` : basculer `status: "active"`, ajuster `description`, ajouter l'entrée dans `MISSION_COMPOSER_ACTION_CONFIGS`. Même mécanique que L6.4 pour `analyze_margins` — pas de nouveau composant.

### 2.6 Tests

`__tests__/prospection-window-provider.test.ts` sur `fake-supabase.ts` :
1. fenêtre 30 jours correctement dérivée d'un sélecteur ;
2. un compte à 5 signaux forts ne produit **aucune agrégation** de score dans `content` (test qui échouerait si le provider recalculait un total) ;
3. absence d'interaction produit l'item synthétique, pas un trou silencieux ;
4. saturation d'une borne dure → exclusion `provider_limit` tracée.

`mission-catalog.test.ts` : lancement refusé sans sélecteur `prospection_window`.

### 2.7 Critère de sortie du pilote (falsifiable, sur le modèle L6.5)

Sur la fenêtre de test la plus récente couverte par le dataset généré :
1. le rapport désigne des comptes **nommés**, pas des catégories ;
2. au moins un compte à signal fort est explicitement écarté avec un motif tiré du corpus (test de la règle §2.4) ;
3. aucun score cumulé ou moyenné n'apparaît ;
4. chaque constat cite une source résolue contre la trace.

---

## 3. L7.2 — Mission `capacite-staffing`

### 3.1 Corpus — nouveau `CorpusKind: staffing_horizon`

```ts
{ kind: "staffing_horizon"; periodStart: string; periodEnd: string }
```

Fenêtre proposée : mois analysé + 3 mois à venir (horizon prospectif, symétrique de l'historique de `delivery_period`), dérivée côté serveur.

### 3.2 Sources — exécution `user_rls`, poids **88**

| Source | Grain | Point de vigilance |
|---|---|---|
| `collaborators` + `missions` (jointure en deux temps, jamais d'embed PostgREST) | 1 item par consultant : statut, mission courante, `end_date` ou mention explicite « sans date de fin connue » | 16 missions sur 33 sans `end_date` (mesuré 2026-08-24) — **ne jamais traduire l'absence en « pas de risque »** |
| `collaborator_absences` | 1 item par absence recouvrant l'horizon | RLS standard |
| `v_collaborator_ytd_activity` | 1 item par consultant : taux d'activité YTD, écart au TACI cible (**déjà calculés**, ne pas recalculer) | vue `security_invoker`, à confirmer au lot |
| `person_skills` (niveau ≥ 3), agrégées par collaborateur | 1 item par consultant : compétences significatives | RLS standard |
| `opportunities` ouvertes + `opportunity_skills` | 1 item par besoin ouvert avec ses compétences requises | **2 opportunités ouvertes mesurées le 2026-08-24** — le dataset de test doit en apporter davantage pour que cette source ait un rôle réel dans le pilote |

### 3.3 Fichiers

Même patron que L7.1 : `mission-contracts.ts`, `mission-selectors.ts`, `validate-mission-report.ts`, nouveau `data/corpus/staffing-horizon-provider.ts`, entrée registre (poids 88), preset dans `mission-catalog.ts`.

### 3.4 Preset — contrainte spécifique

« Quand une mission n'a pas de date de fin connue, dis-le explicitement comme une incertitude — ne conclus jamais à une absence de risque de banc sur cette base. » C'est la traduction directe de l'angle mort identifié en `08` §5, mission #3 : **le corpus troué fait partie du livrable, pas un défaut à masquer.**

### 3.5 Branchement cockpit

`forecast_availability` (`coming_soon` depuis l'origine) → `active`, sur `/consultants/activite-conges`.

### 3.6 Critère de sortie du pilote

1. le rapport nomme au moins un consultant se libérant dans l'horizon, avec sa date ;
2. il signale explicitement les missions sans date de fin comme incertitude, pas comme absence de risque ;
3. toute recommandation de repositionnement cite le besoin ouvert correspondant du corpus.

---

## 4. L7.3 — Généraliser le composeur

### 4.1 Ce qui bloque aujourd'hui, précisément

Vérifié dans le code le 2026-08-24 :

- `MissionComposerConfig.buildSelectors: (month: string) => CorpusSelector[]` — un seul type d'entrée possible.
- `MissionComposerDesktop.tsx` et `MissionComposerMobile.tsx` rendent chacun en dur un `<input type="month">`, tiennent l'état `month` en state local, et appellent `launcher.launch(month)`.
- `useMissionLauncher.launch(month: string)` transmet ce `string` tel quel à `config.buildSelectors`.

Aucun de ces trois fichiers ne sait aujourd'hui produire un sélecteur `account_context { companyId }`, alors que le provider serveur qui le consomme existe déjà et est testé (`account-context-provider.ts`).

### 4.2 Cible

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

`inputKind` pilote le rendu du formulaire (switch dans `MissionComposerDesktop`/`Mobile`) ; `buildSelectors` reste la seule fonction qui connaît la traduction input → `CorpusSelector[]`, comme aujourd'hui.

**Nouveau composant** : un sélecteur de compte pour le formulaire de lancement, construit sur `src/components/missions/AccountCombobox.tsx` (déjà utilisé dans `NewOpportunityDrawer`, `OpportunityEditForm`) avec `allowCreate={false}` — **aucune création de compte inline depuis un composeur de mission**, ce serait une fonctionnalité CRM qui n'a rien à faire ici.

**Préremplissage contextuel** — conforme à la vision fondatrice §8.1 (« depuis un compte → compte courant ») : quand le composeur s'ouvre en mode Entité (`entityContext.entityType === "company"`, `IntelligencePanel.tsx`), le sélecteur de compte doit être **prérempli avec `entityContext.entityId`**, pas laissé vide. C'est ce qui rend la mission `revue-compte-client` accessible en un clic depuis la fiche compte plutôt que de forcer une recherche.

### 4.3 Fichiers

| Fichier | Modification |
|---|---|
| `components/mission-composer-model.ts` | `MissionLaunchInput`, `MissionComposerConfig.inputKind`, adapter les deux configs existantes (`inputKind: "month"`) |
| `components/use-mission-launcher.ts` | `launch(input: MissionLaunchInput)` au lieu de `launch(month: string)` |
| `components/MissionComposerDesktop.tsx` | switch sur `config.inputKind` ; formulaire mois (existant, extrait en sous-composant) ou formulaire compte (nouveau) |
| `components/MissionComposerMobile.tsx` | même généralisation, layout mobile |
| `components/MissionAccountField.tsx` | nouveau — enveloppe `AccountCombobox` pour le composeur, préremplissage depuis `entityContext` |

### 4.4 Non-régression

Les deux presets existants passent par `inputKind: "month"` sans changement de comportement observable. `mission-composer-model.test.ts` et `mission-launch-pilot.test.ts` doivent rester verts **sans réécriture de leurs assertions métier** (même exigence que L6.3).

### 4.5 Ce que ce lot ne fait pas

- Pas de composeur générique de corpus multi-sources : deux formes (`month`, `account`) suffisent aux 5 missions du catalogue. Une troisième forme n'est ajoutée que si une sixième mission la réclame réellement.
- Pas de sélection de compte multiple : chaque mission entity-scoped du catalogue porte sur **un** compte à la fois.

### 4.6 Critère de sortie

`npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build` verts ; les deux presets existants inchangés à l'usage ; un test nouveau vérifie que l'ouverture du composeur en mode Entité compte préremplit le sélecteur de compte.

---

## 5. L7.4 — Mission `revue-compte-client`

### 5.1 Corpus — deux origines

1. **`account_context`** (existant, poids 90) — **premier consommateur réel** de ce provider depuis sa livraison en L1.
2. **Nouveau `CorpusKind: account_delivery { companyId }`**, poids proposé **92** (au-dessus d'`account_context` : l'ancre chiffrée ne doit jamais tomber par troncature, même doctrine que `delivery_period` en L6 §4.5).

### 5.2 Sources d'`account_delivery` — exécution `user_rls`

| Source | Grain |
|---|---|
| `missions` filtrées sur `company_id` | 1 item par mission du compte : `tjm`, `cjm`, `gross_margin_pct` (**générée**), dates, `practice` |
| `mission_activity_reports` sur 6 mois glissants | 1 item par CRA × mois (jours facturables, taux d'activité — **colonnes générées**) |
| `v_profitability_alerts` filtrée sur les missions du compte | 1 item par ligne portant au moins une alerte à `true` |
| `v_mission_quarterly_revenue` filtrée sur les missions du compte | 1 item par mission × trimestre |

**🔴 Reprendre à l'identique l'exclusion de colonne de `delivery-period-provider.ts` (L6.1)** : `gross_annual`, `charges_rate`, `working_days_per_year` n'entrent **jamais** dans `content`, quel que soit le rôle de l'appelant — parce que le livrable atterrit dans `intelligence_documents`, à RLS workspace standard, lisible par un `viewer`. Ce n'est pas une redécouverte à faire : c'est une règle à copier, avec son test.

**Règle anti-recalcul** (même motif que `delivery_period`, corpus de nombres) à porter dans `constraints.rules` du preset : « Ne recalcule aucun ratio ni écart. Tous les chiffres nécessaires sont déjà fournis, pré-calculés, dans le corpus. »

### 5.3 Fichiers

| Fichier | Modification |
|---|---|
| `mission-contracts.ts` | `CorpusKind` += `"account_delivery"` |
| `mission-selectors.ts` | branche `parseCorpusSelector` et `corpusSelectorKey` |
| `validate-mission-report.ts` | `CORPUS_KINDS` |
| `data/corpus/account-delivery-provider.ts` | nouveau |
| `corpus-provider-registry.ts` | entrée + poids 92 |
| `mission-catalog.ts` | preset `revue-compte-client`, `corpus.requiredAtLaunch: ["account_context", "account_delivery"]` |
| `mission-composer-model.ts` | `MissionComposerConfig` pour cette mission avec `inputKind: "account"`, `buildSelectors` produisant **les deux** sélecteurs à partir du même `companyId` |

### 5.4 Branchement cockpit

Mode Entité `company` (`IntelligencePanel.tsx`, `AccountPanelContent`) — la mission apparaît comme action disponible sur la fiche compte, aux côtés des actions existantes (`deep_analysis`, `generate_pitch`, `build_roadmap`). Le run se rattache automatiquement au compte via `resolveMissionRunEntity` (mécanique déjà écrite, cf. `build-mission-launch.ts`).

### 5.5 Tests

`__tests__/account-delivery-provider.test.ts` sur `fake-supabase.ts`, calqué sur `delivery-period-provider.test.ts` : fenêtre 6 mois, exclusion de `gross_annual` **prouvée** (pas supposée), `ref.id` composites stables, saturation tracée.

### 5.6 Critère de sortie du pilote

Sur un compte client réel du dataset de test (au moins 2 missions, CRA sur plusieurs mois) :
1. le rapport tranche explicitement sur la santé du compte, au-delà de l'énumération des chiffres ;
2. au moins un `finding` croise relation (signal, interaction, enjeu) et exécution (marge, CRA) — c'est le test que la mission fait ce que rien d'existant ne fait (`08` §5, mission #2) ;
3. aucun chiffre de rémunération individuelle n'apparaît, à aucun niveau du texte produit.

---

## 6. L7.5 — Mission `post-mortem-commercial`

### 6.1 Corpus — nouveau `CorpusKind: pipeline_period`

```ts
{ kind: "pipeline_period"; periodStart: string; periodEnd: string }
```

Fenêtre proposée : trimestre — première mission du catalogue à cette granularité. Le composeur (formulaire `month`) reste utilisable : `buildSelectors` calcule les bornes du trimestre contenant le mois choisi. Pas de nouveau `inputKind` : c'est une transformation de la donnée d'entrée, pas une nouvelle UI.

### 6.2 Sources — exécution `user_rls`, poids **80**

| Source | Grain |
|---|---|
| `opportunities` closes sur la fenêtre (`stage` ∈ `gagne`/`perdu`/`abandonne`) | 1 item par affaire : `stage`, `opportunity_type`, `acv`/`weighted_gain` (**générées**), TJM cible, durée |
| `interactions` liées (`opportunity_id`) | 1 item par interaction : type, sentiment, date |
| `opportunity_candidates` | 1 item par profil présenté et son issue |
| `opportunity_skills` | 1 item par besoin de compétence, importance, niveau minimum |
| `companies` des affaires concernées | 1 item de référentiel par compte |

### 6.3 Fichiers

Même patron : `mission-contracts.ts`, `mission-selectors.ts`, `validate-mission-report.ts`, `data/corpus/pipeline-period-provider.ts`, registre (poids 80), preset dans `mission-catalog.ts` avec `buildSelectors` trimestriel dans `mission-composer-model.ts`.

### 6.4 Preset — contrainte spécifique

« N'énonce aucune statistique en pourcentage sur l'ensemble des affaires (par exemple "X % des pertes"). Le volume du corpus ne le permet pas. Formule des constats nominatifs, affaire par affaire. » — garde-fou direct contre le risque identifié en `08` §5 (27 affaires/an, insuffisant pour une lecture statistique).

### 6.5 Branchement cockpit

Requalifie `prioritize_pipeline` (`active`, actuellement sans corpus réel dérrière — à vérifier au démarrage du lot) sur `/missions/opps`, ou nouvelle action dédiée si `prioritize_pipeline` sert déjà un autre usage à ce moment du calendrier.

### 6.6 Critère de sortie du pilote

1. chaque `finding` nomme une affaire, pas une moyenne ;
2. au moins un motif récurrent de perte est identifié et distingué d'un motif de gain ;
3. aucune statistique en pourcentage sur l'ensemble n'apparaît dans le texte produit.

---

## 7. L7.6 — Mission `funnel-recrutement`

### 7.1 Corpus — nouveau `CorpusKind: hiring_period`

```ts
{ kind: "hiring_period"; periodStart: string; periodEnd: string }
```

### 7.2 Sources — exécution `user_rls`, poids **75**

| Source | Grain |
|---|---|
| `candidate_hiring_processes` | 1 item par process : étape courante, dates d'ouverture |
| `candidate_hiring_milestones` | 1 item par jalon, avec délai depuis le jalon précédent **pré-calculé côté provider** (même doctrine anti-recalcul que le corpus financier — un délai est un nombre, le LLM ne le déduit pas) |
| `candidates` + `job_profiles` | 1 item de référentiel par candidat : profil recherché, TJM attendu, practice |
| `opportunity_candidates` | 1 item par présentation client et son issue |

### 7.3 Fichiers

Même patron que les lots précédents.

### 7.4 Preset — contrainte spécifique

« Si moins de 5 process de recrutement recoupent la fenêtre analysée, indique-le explicitement et limite les conclusions à ce que le volume permet réellement d'affirmer. » — seuil d'abstention explicite, corpus le plus mince des cinq (`08` §5, mission #5 : 34 process, 137 jalons, 6 étapes peuplées mesurés le 2026-08-24 — à revérifier avec le dataset de test).

### 7.5 Branchement cockpit

Rebranche `analyze_funnel` (`active`, actuellement routé vers le composeur de rédaction, scénario `recruiter_briefing_pre_interview`) — exactement le patron de L6.4 sur `analyze_margins` : retirer le `case "analyze_funnel":` de `resolveCommunicationConfig` (`IntelligenceActionCard.tsx`), l'ajouter à `MISSION_COMPOSER_ACTION_CONFIGS`.

### 7.6 Critère de sortie du pilote

1. le rapport nomme l'étape où le funnel perd le plus de candidats ;
2. au moins un délai anormal est cité avec sa source (jalon → jalon) ;
3. si le seuil de §7.4 est franchi, le rapport le déclare au lieu de conclure.

---

## 8. Boucle de validation — identique à chaque lot

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

`npm run test:n8n` reste **hors périmètre des six lots** : aucun ne touche `n8n/workflows/`. Ne pas le lancer par réflexe.

---

## 9. Pièges déjà vérifiés — valables sur les six lots

Repris de `07` §7, toujours vrais :

- **`parseCorpusSelector` n'est pas exhaustif au sens de `tsc`.** Ajouter un `CorpusKind` sans ajouter sa branche compile, puis échoue à l'exécution avec « Sélecteur de corpus invalide ». Vérifier les deux sites (`parseCorpusSelector` **et** `corpusSelectorKey`) à chaque lot, pas un seul.
- **`CORPUS_PROVIDERS` est un `Record<CorpusKind, CorpusProvider>` exhaustif** : ouvrir un `CorpusKind` sans livrer son provider dans la même PR fait échouer `typecheck` — c'est voulu, ne pas dégrader le type en `Partial<...>`.
- **`tsc` ne voit pas tout** : un composant client qui importe une *valeur* depuis un module `server-only` passe le typecheck et casse `next build`. Seul le build le révèle.
- **`.next/` périmé** produit de faux `TS6200`/`TS2300` : purger avant de conclure à une régression.
- **Vocabulaire finance** (L7.4 et tout preset touchant CJM/TJM/marge) : TJM = vendu, CJM = coûté, TACI = un taux, jamais un coût. Marge brute = colonne générée, jamais recalculée côté prompt ni côté code.
- **`missions.practice` reste un texte libre** sans FK vers `offer_practices.slug` : ne pas tenter de joindre.

---

## 10. Condition d'arrêt — par lot, pas globale

Contrairement à L6 (un seul pilote, un seul verdict), cette roadmap porte **six** critères de sortie indépendants (§2.7, §3.6, §4.6, §5.6, §6.6, §7.6). Un lot qui échoue son pilote n'entraîne pas l'arrêt des suivants : chaque mission a son propre corpus et sa propre preuve de valeur. La règle de gouvernance reste néanmoins celle de `07` §6 : **avant de démarrer un lot, vérifier qu'aucune capacité existante ne couvre déjà le besoin** — l'audit de `08` §7 (« ce que j'ai écarté ») fait cette vérification pour les 5 missions retenues ; elle n'a pas besoin d'être refaite, sauf si le code a changé entre-temps.

---

## 11. Ce que cette roadmap ne fait pas

- Elle ne fixe pas de dates : le rythme dépend de la disponibilité du dataset de test (§1.1) et des arbitrages de Guillaume.
- Elle ne rédige pas les `promptTemplate` complets de chaque preset : ils se rédigent au démarrage de chaque lot, avec le corpus réellement disponible sous les yeux — écrire un prompt avant d'avoir vu une hydratation réelle du provider serait spéculatif.
- Elle ne remet pas en cause le catalogue fermé (`08` §8, tranché) : ces six lots sont les seuls ajouts prévus. Une septième mission repartirait de `08`, pas de ce document.
