# 03 — Contrat des niveaux et des modules

Ce document fixe le mapping connaissance (`01`) → niveaux L1..L4, la liste canonique des modules,
et le modèle de couverture qui rend les niveaux réellement cumulatifs.

---

## 1. Ce qu'est un niveau, et ce qu'il n'est pas

Un niveau est **un profil de couverture**, pas un contrat, pas une table, pas un workflow, pas un
run plus long.

| | |
|---|---|
| ✅ Un niveau **est** | un sous-ensemble de modules à couvrir, avec un régime de preuve et une politique de sources |
| ❌ Un niveau **n'est pas** | un `schema_version`, un `run_type`, une colonne `companies.analysis_level`, ni un run monolithique de N minutes |

**L2 inclut L1 ; L3 inclut L1+L2 ; L4 inclut tout.** Mais passer de L2 à L3 **ne refait jamais
L1 et L2** : le système raisonne en modules *couverts / manquants / périmés* (A7).

> **Contrainte structurelle (A8).** Le task runner n8n coupe à 300 s ; les runs V4 réussis
> mesurent 404–425 s. Un « L4 » qui empilerait dans une exécution la lecture Master Study, la
> recherche, la synthèse et l'enchaînement INTEL-031 ne s'exécuterait jamais.
> **Un niveau se réalise en plusieurs runs de modules, agrégés à la lecture.**

---

## 2. Les quatre niveaux

| Niveau | Question | Familles `01` | Régime de preuve | Recherche externe |
|---|---|---|---|---|
| **L1 — Essentiel** | *Qui est cette entreprise et quelle est son empreinte ?* | F1 + amorce M1 | **Très strict** sur identité et chiffres | **Registre + site officiel seulement** |
| **L2 — Entreprise** | *Comment fonctionne-t-elle et où va-t-elle ?* | F2, F3, F6 partiel, T1–T4 | Déclarations + déductions appuyées | Oui, ciblée |
| **L3 — Écosystème** | *Dans quel jeu opère-t-elle ?* | F4, C5 | Inférence comparative autorisée | **Sur les gaps uniquement** |
| **L4 — Enjeux** | *Qu'est-ce qui la contraint, où est la porte ?* | F5, F6 complet | Faits / inférences / hypothèses **séparés** | Oui, recommandée |

### 2.1 — L1 doit rester volontairement léger

**On ne lance pas douze recherches et 16 000 tokens pour obtenir un SIREN, un NAF, un siège, un
CA et un effectif.** Ordre imposé :

```
1. Ce qui est déjà en CRM
2. account_facts courants (is_current, non expirés)
3. Résolution d'entité
4. Registre légal / site officiel
5. Recherche externe UNIQUEMENT sur les trous restants
```

> **Pour un compte déjà bien renseigné, L1 ne fait aucun appel LLM.** Le rapport essentiel est
> sérialisé depuis les champs structurés selon un gabarit rédactionnel déterministe. C'est la
> forme la plus stricte du principe « profondeur proportionnelle à la valeur commerciale ».

### 2.2 — L3 interroge KREDO avant Internet

C'est l'optimisation la plus rentable du chantier. Pour un compte dont le segment porte une
Master Study :

```
Résoudre le segment (companies.segment_id)
      ↓
Lire v_sector_knowledge_resolved / v_sector_knowledge_items
      ↓
Lire competitive_map_entries + value_chain_*
      ↓
Identifier ce qui s'applique au compte
      ↓
Identifier ce qui manque ou semble périmé
      ↓
Recherche externe SUR CES GAPS SEULEMENT
      ↓
Synthèse compte × environnement
```

**Cas nominal visé : L3 ne déclenche aucune recherche externe** et devient quasi gratuit et
quasi instantané, là où il est le plus utile. Au 10/09/2026, 53 fiches `sector_intelligence`
(15 macro + 38 segment) et 23 `competitive_map_entries` sont disponibles.

### 2.3 — L4 s'achève dans `account_issues`

L4 = INTEL-030 (comprendre) **puis** INTEL-031 (matérialiser). Voir `02` §3.1. Le rapport lit
les enjeux, il ne les duplique pas.

---

## 3. Les modules canoniques

Identifiants stables, testables, opposables au workflow. **Ce sont eux qui circulent dans le
contrat de lancement — jamais des libellés d'interface.**

| Module | Famille `01` | L1 | L2 | L3 | L4 | Source dominante |
|---|---|:-:|:-:|:-:|:-:|---|
| `entity_resolution` | — | **●** | **●** | **●** | **●** | Registre — **jamais désactivable** |
| `identity` | I1–I3, I7 | **●** | ● | ● | ● | Registre |
| `size_and_financials` | I4–I5 | **●** | ● | ● | ● | Registre / comptes publiés |
| `ownership` | I6 | ○ | ● | ● | ● | Registre / presse |
| `business_and_offering` | M1–M4, M6 | ○ | **●** | ● | ● | Site officiel |
| `business_model` | M3, M5, M7 | — | **●** | ● | ● | Déduction appuyée |
| `customers_and_market` | C1–C4, C6 | — | **●** | ● | ● | Site + presse |
| `history` | T1 | — | **●** | ● | ● | Presse / site |
| `news` | T2, T4 | — | **●** | ● | ● | `account_signals` **d'abord** |
| `ambitions` | T3 | — | **●** | ● | ● | Déclaratif daté |
| `sector_dynamics` | E1, E3, C5 | — | — | **●** | ● | **Master Study** |
| `competition` | E2, E4 | — | — | **●** | ● | **`competitive_map_entries`** |
| `value_chain` | E5, E6 | — | — | **●** | ● | **`value_chain_*`** |
| `technology_trends` | K5 | — | — | **●** | ● | Master Study + offres d'emploi |
| `regulatory` | T5, T6 | — | — | ○ | **●** | **`sector_regulatory_items`** |
| `organisation` | K1, T7 | — | — | — | **●** | Contacts + web |
| `dependencies` | E6, C4, T8 | — | — | ○ | **●** | Déduction appuyée |
| `it_intensity` | K2–K6 | — | — | — | **●** | **Interne + offres d'emploi** |
| `kredo_relation` | K7 | ● | ● | ● | ● | **Interne, déterministe** |
| `issues` | T7, T8 | — | — | — | **●** | → INTEL-031 |

**●** = couvert · **○** = optionnel (paramètres avancés) · **—** = hors niveau

### Règles opposables

1. **`entity_resolution` et `identity` ne sont jamais désactivables** (A1).
2. **`kredo_relation` est gratuit** — lecture relationnelle pure, présent à tous les niveaux.
3. **`sector_dynamics`, `competition`, `value_chain`, `regulatory` lisent d'abord la Master
   Study.** Une recherche externe sur ces modules alors que le segment est documenté est un
   défaut, pas une option (A7).
4. **`news` lit `account_signals` avant le web.** 843 signaux au 10/09/2026 ; re-chercher une
   actualité déjà en base est une anomalie.

> ⚠️ **État réel du plumbing.** `includedSubjects` existe dans le trigger et transite jusqu'au
> nœud `Validate Entity`, **mais seule la branche V3 le consomme** (`V3 Assemble Draft Prompt`,
> `V3 Merge Segments`). **Les 18 nœuds V4 l'ignorent totalement.** La modularité est donc à
> **construire**, pas à « assainir » — et le mapping actuel repose sur des libellés d'interface
> français (`'Fiche d'identité'`, `'Enjeux'`…) qui doivent disparaître au profit des
> identifiants ci-dessus.

---

## 4. Couverture et fraîcheur

### 4.1 — Le niveau atteint se lit, il ne se stocke pas

**Aucune colonne `companies.analysis_level`.** Ce serait une simplification trompeuse qui
casserait dès le scénario central : un compte analysé en L2, complété en L3 six mois plus tard.

**Et surtout, ne pas réutiliser `companies.depth_level`** : il porte la profondeur *lifecycle*
du compte (`mapped → noted → qualified → active`, ADR-0019), pas la profondeur des recherches.
Les confondre créerait une ambiguïté sémantique durable.

### 4.2 — Un registre de couverture, pas un calcul sur le dernier run

Dériver la couverture du seul dernier run réussi ne survit pas au cumul. La couverture se lit
**au-dessus du stock de faits**, qui porte déjà tout le nécessaire :

`account_facts` expose `effective_at`, `verified_at`, `expires_at`, `is_current`,
`confidence_score`, `origin`, `primary_source_id` — 963 lignes au 10/09/2026.

```
Pour chaque module :
   dernier run l'ayant couvert (ai_intelligence_runs.input_snapshot)
 + faits courants rattachés (account_facts.is_current, expires_at)
 + signaux récents (account_signals.detected_at)
 = état de couverture
```

Implémentation : **une vue SQL**, pas une table. Aucune migration au premier lot.

### 4.3 — Les quatre états affichés

| État | Condition |
|---|---|
| **Jamais étudié** | aucun run n'a couvert le module |
| **Couvert** | couvert, et dans sa fenêtre de fraîcheur |
| **Partiellement couvert** | couvert avec `knowledge_gaps` déclarés, ou en mode dégradé |
| **Périmé** | hors fenêtre de fraîcheur |

### 4.4 — Fenêtres de fraîcheur par module

| Fenêtre | Modules | Justification |
|---|---|---|
| **Permanent** | `identity` (I1–I2) | Un SIREN ne périme pas |
| **12 mois** | `size_and_financials`, `ownership`, `business_and_offering` | Rythme des exercices |
| **6 mois** | `business_model`, `customers_and_market`, `value_chain`, `organisation`, `it_intensity` | Structurel mais mouvant |
| **3 mois** | `sector_dynamics`, `competition`, `technology_trends`, `regulatory` | Suit le rythme Master Study |
| **1 mois** | `news`, `issues` | Actualité |
| **Temps réel** | `kredo_relation` | Lu à chaque affichage |

> **La fraîcheur est portée par module, jamais par rapport.** Un rapport « de 18 jours » dont
> l'identité est permanente et l'actualité périmée n'est ni frais ni périmé : il est **partiel**.

---

## 5. Le contrat de lancement

```ts
type AccountIntelligenceLevel = 1 | 2 | 3 | 4
type EpistemicMode = "strict" | "balanced" | "exploratory"
type RefreshMode   = "missing_or_stale" | "full"
type SourcePolicy  = "approved_only" | "allow_gap_discovery"

interface AccountIntelligenceRunInput {
  companyId: string
  targetLevel: AccountIntelligenceLevel
  /** Identifiants canoniques (§3). Absent = tous les modules du niveau. */
  includedModules?: AccountIntelligenceModule[]
  refreshMode: RefreshMode
  /** Filtre de RESTITUTION, jamais de génération — cf. 04 §4. */
  epistemicMode: EpistemicMode
  /** Manifeste approuvé issu d'INTEL-035 — cf. 05. */
  sourcePlanResultId: string
  sourcePolicy: SourcePolicy
}
```

**Trois décisions portées par ce contrat :**

1. **`epistemicMode` n'est pas un paramètre de run.** S'il conditionnait la génération, on
   paierait un run par mode et on ne pourrait plus comparer. On génère toujours les quatre
   qualifications ; le mode filtre à l'affichage. Il devient gratuit et réversible.
2. **Les réglages de veille n'entrent pas dans l'input.** Ils ont leur stockage durable
   (`account_watch_settings`, 14 lignes). Le centre de contrôle les édite dans la même fenêtre
   sans les dupliquer dans chaque run.
3. **`sourcePlanResultId` est obligatoire dès qu'un module exige de la recherche externe.**
   C'est la traduction contractuelle de A2 : pas de corpus approuvé, pas d'analyse externe.

`accountKnowledgeSchemaVersion: 4` est conservé. **Pas de V5 tant qu'un besoin métier concret
n'est pas démontré irreprésentable en V4** — le candidat le plus probable étant un `rationale`
explicite par inférence et un identifiant de module stable par statement (voir `04` §3).
