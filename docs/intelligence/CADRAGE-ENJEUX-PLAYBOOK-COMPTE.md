# Cadrage — Enjeux du compte & Playbook du compte

**Date :** 2026-08-07 · **Chantier :** SHELL-0018, passe fonctionnelle « Comptes & contacts »
**Statut :** proposé, aucun développement engagé
**Rattachement :** [ADR-0018 §3.2](../adr/ADR-0018-refonte-shell-navigation-desktop.md) · [ADR-0012](../adr/ADR-0012-cockpit-intelligence-chaine-decision.md) · [arborescence cible](../ARBORESCENCE-NAVIGATION-CIBLE.txt)

> Ce document couvre deux sujets liés : la **rationalisation des enjeux** (§1 à §5) et le
> **playbook du compte** (§6). Il ne décide rien sur le Shell lui-même — il fournit la
> clarification fonctionnelle exigée par l'action item #2 d'ADR-0018.
>
> Toutes les mesures de ce document ont été prises **en base de production le 2026-08-07**.
> Les compteurs de `CLAUDE.md` sont périmés sur ce périmètre (cf. §7).

---

## 1. Ce qui s'appelle « enjeu » aujourd'hui — inventaire mesuré

Guillaume en citait quatre. Il y en a **six**, plus deux rendus qui dupliquent la même
donnée sur une même page.

| # | Gisement | Table / champ | Lignes | Portée native | Péremption | Sourcé |
|---|---|---|---|---|---|---|
| 1 | Pain points sectoriels | `sector_pain_points` | 83 | Secteur | **aucune** | verbatim seul |
| 2 | Calendrier réglementaire | `sector_regulatory_items` | 64 | Secteur | **aucune** | 50/64 URL |
| 3 | Événements déclencheurs | `sector_events` | 52 | Secteur | **aucune** | partiel |
| 4 | Signaux de veille | `account_signals` | 808 | Compte | 60 j (`expires_at`) | **voir §2.5** |
| 5 | Enjeux qualifiés | `account_issues` | 40 (7 comptes) | Compte | **aucune** | non résoluble |
| 6 | Points d'entrée playbook | `sector_intelligence.playbook` | 14 secteurs | Secteur | **aucune** | non |

Rendus qui affichent ces gisements :

```
/legacy/etudes/[slug]        PainPointsList · RegulatoryCalendar · TriggerEventsList   (1,2,3)
/ressources/playbook/[slug]  PlaybookPanel                                             (6)
cockpit > Secteur            SectorPainPointsSection · SectorRegulatoryTimeline ·
                             SectorCommercialEventsSection · SectorCommercialWindowsSection (1,2,3)
cockpit > Enjeux             AccountIssuesTable / AccountIssuesTopList                 (5)
cockpit > Accueil            bloc « fenêtre commerciale »                              (2,3)
/veille                      VeilleActualitesDesktop                                   (4)
```

### 1.1 La démonstration — un fait, cinq écritures, sept rendus

Le **Règlement UE 2023/1545 (étiquetage des allergènes, échéance 31/07/2026)** est
aujourd'hui stocké **cinq fois**, sans aucun lien entre les cinq :

| Où | Comment il y est écrit | Score / état |
|---|---|---|
| `sector_regulatory_items` | « Règlement UE 2023/1545 — Étiquetage des allergènes » | `critical`, `is_commercial_window = true` |
| `sector_events` | « Échéance Règlement UE 2023/1545 **dans moins de 2 mois** » | `event_type = regulatory` |
| `account_signals` (Robertet) | « Règlement UE 2023/1545 — Étiquetage des allergènes » | `global_score = 0.00`, **0 source** |
| `account_issues` (Robertet) | « Échéance critique étiquetage allergènes UE 2023/1545 (31/07/2026) » | importance 5 · urgence 5 · fit 4 |
| `sector_intelligence.playbook` | `entry_points[0]` — « urgence réglementaire immédiate » | texte libre |

**Trois défaillances dans ce seul exemple :**

1. **L'échéance est dépassée depuis le 31/07.** Nous sommes le 07/08. Les cinq
   écritures l'annoncent toujours comme à venir.
2. Le titre du `sector_event` contient une **date relative figée** (« dans moins de
   2 mois ») écrite le 14/06. Elle était vraie une semaine, elle est fausse depuis.
3. Sur `/legacy/etudes/parfumerie-aromes`, `RegulatoryCalendar` et `TriggerEventsList`
   affichent **le même fait deux fois sur le même écran**, depuis deux tables.

Ce n'est pas un cas isolé : **16 des 64 échéances réglementaires sont périmées, dont
14 encore marquées `is_commercial_window = true`.**

---

## 2. Critique de la méthode de catégorisation

### 2.1 Il n'existe aucune définition de ce qu'est un enjeu

Ce qui décide qu'un fait devient un « enjeu » est **le workflow qui l'a écrit**, pas une
règle. D'où cinq écritures concurrentes du même fait, avec des scores incompatibles
(0.00 en signal, 5/5 en enjeu, `critical` en réglementaire) et aucun arbitre.

### 2.2 La date n'est jamais un état

Seule `account_signals` porte une péremption (`expires_at`, 60 j, posée par intel-033 et
**respectée** par les RPC). Les quatre autres gisements n'ont ni statut ni date de revue.
Un enjeu créé le 07/07 avec `urgency = 5` vaudra toujours 5 dans deux ans.

> **C'est le défaut le plus coûteux commercialement** : un commercial qui cite une
> échéance passée devant un client perd sa crédibilité sur toute la fiche, y compris sur
> ce qui était juste.

### 2.3 Le périmètre est faux dans les deux sens

`sector_events` du secteur Parfumerie contient :

- « **Recomposition du capital de Robertet** » (`event_type = market`)
- « **Robertet lance NaturIA — IA générative de formulation** » (`event_type = competitor`)

Ce sont deux faits **propres au compte Robertet**, rangés au niveau secteur. Conséquence
directe : sur la fiche Robertet, l'onglet Secteur **présente Robertet comme son propre
concurrent**.

Symétriquement, l'échéance réglementaire sectorielle a été recopiée en `account_signals`
pour chacun des comptes du secteur.

### 2.4 La traçabilité est déclarative, jamais vérifiable

Le contrat `IntelligenceSourceRef = { table, id }` promet un pointeur vers une ligne
Supabase. Voici le contenu **réel** des `source_refs` des 5 enjeux de Robertet :

```json
{"table": "sectorContext.painPoints",      "id": "Screening réglementaire manuel"}
{"table": "sectorContext.regulatoryDeadlines","id": "Règlement UE 2023/1545"}
{"table": "processDiagnostic.matrice_impact","id": "QW-04"}
{"table": "signals",                        "id": "7e21c64c-…"}
```

**Aucun de ces `source_refs` n'est résoluble** : `table` porte le chemin JSON du payload
d'entrée, `id` porte un *libellé*. Même le seul UUID valide cite `"signals"`, qui n'est
pas un nom de table (`account_signals`).

**Cause racine identifiée** (et non supposée) : la RPC `get_account_issues_context` ne
transmet pas les `id` des pain points ni des échéances —

```sql
'painPoints', jsonb_build_object('title', spp.title, 'description', spp.description,
                                 'frequency_count', …, 'kredo_practice', …)
--            ^ pas de spp.id
```

Le modèle ne pouvait citer que ce qu'il voyait. **Ce n'est pas une hallucination, c'est
un défaut de contrat.**

### 2.5 Deux échelles de crédibilité cohabitent sans se distinguer à l'écran

| Taxonomie | Lignes | Sources | Scores | Fraîcheur |
|---|---|---|---|---|
| `adr-0011-lot1-v1` (backfill FOLIO/sector) | **735** | **0** | `relevance`/`urgency`/`global` = **0.00** | figée au 09/06–06/07 |
| `mvp-v1` (intel-033, en production) | **73** | **73/73** | composite déterministe réel | 07/07 → 04/08 |

Sur le même écran, un fait sourcé d'hier s'affiche à côté d'un fait FOLIO non sourcé de
juin **sans aucune marque distinctive**.

### 2.6 Le bruit n'est pas filtré au bon endroit

Signaux réellement attachés au compte **Robertet** via le backfill sectoriel :

> « Coupe du monde 2026 : chaleur, altitude, pollution, décalage horaire… »
> « Burgers, pancakes "fluffy", pain de mie… La tendance du "mou" dans nos assiettes »
> « La plus grande carte de vins au verre de Belgique ? C'est à Bruxelles ! »

intel-033 possède pourtant un filtre correct (`MIN_SIGNAL = 0.2` sur trois axes + plafond
de 5 signaux par source au-delà de 20). Le backfill n'en avait aucun.

### 2.7 `account_issue_category` mélange deux classifications

```
business · delivery · people · regulatory   ← domaines côté CLIENT
it · data · cloud · cyber                   ← practices côté KREDO
```

C'est précisément **pourquoi `kredo_fit` a dû être ajouté** : pour rattraper ce que la
catégorie ne dit pas. Une colonne, deux axes, donc aucun des deux n'est exploitable.

### 2.8 Six scores écrits, trois affichés, aucun calibré

`account_issues` porte **six** colonnes `1..5` : `importance`, `urgency`, `criticality`,
`business_impact`, `accessibility`, `kredo_fit`. L'UI en affiche **trois**.
`criticality`, `business_impact` et `accessibility` ne sont lues nulle part.

Personne ne peut calibrer six échelles sur 40 lignes. Et `importance` / `criticality` /
`business_impact` sont trois noms pour la même question.

### 2.9 `frequency_count` est un indice de popularité, pas d'importance

Unique critère de tri des pain points (6, 5, 5, 4…). Il compte des occurrences dans un
corpus d'analyses FOLIO. Il ne dit **rien** de l'importance du sujet pour un compte donné.

### 2.10 Le référentiel de practices n'est pas raccordé

`sector_pain_points.kredo_practice` et `sector_regulatory_items.kredo_practice` utilisent
`data_ai`, `cloud_eng`, `product`, `cyber` — **4 valeurs texte libre** qui ne
correspondent à aucun `offer_practices.slug` réel (`data-ai`, `cloud-engineering`,
`cybersecurity`, … **8 practices**). Aucune jointure possible aujourd'hui.

---

## 3. Classification proposée

> **Principe directeur : ne pas créer d'objet nouveau.** Les deux bonnes tables existent
> déjà et portent chacune le bon cycle de vie. Ce qui manque, c'est **le lien entre les
> deux** — une seule table de liaison.

### 3.1 Deux niveaux, pas une taxonomie plate

```
   NIVEAU 1 — LE FAIT                    NIVEAU 2 — L'ENJEU
   account_signals  (existe)             account_issues  (existe)
   « il s'est passé X »                  « ils ont un problème Y »
   daté · sourcé · périssable            persistant · priorisé · actionnable
   produit par intel-033                 produit par intel-031
                    └────────── account_issue_signals ──────────┘
                                    (À CRÉER — la seule table)
```

Aujourd'hui **rien ne relie un signal à un enjeu**. Un signal expire à 60 jours et
emporte avec lui la preuve de l'enjeu qu'il justifiait.

### 3.2 Les 4 origines — dimension normative

Tout ce qui est aujourd'hui appelé « enjeu » se range dans **exactement une** de ces
quatre origines. Le test qui les sépare : **qu'est-ce qui rend cette information
fausse ?**

| Origine | Rendue fausse par | Portée native | Alimentée par | Péremption |
|---|---|---|---|---|
| `regulatory` | le calendrier | secteur → héritée | `sector_regulatory_items` | la date d'échéance |
| `structural` | une transformation du client | compte (ancrage secteur) | `sector_pain_points`, diagnostic, interactions | aucune — revue à 90 j |
| `event` | un fait plus récent | **compte** | `account_signals` (mvp-v1) | fraîcheur, 90 j |
| `market` | le marché | secteur | `sector_events`, `sector_news`, `veille_articles` | 90 j |

**Pourquoi quatre et pas plus :** c'est le nombre de **régimes de péremption distincts**.
Ajouter une cinquième origine sans lui donner son propre régime, c'est refaire l'erreur
actuelle.

> ⚠️ « Financier » et « organisationnel », cités dans la demande, ne sont **pas** des
> origines mais des **domaines**. Un enjeu financier peut venir d'une réglementation
> (CSRD), d'un problème structurel (pricing lent), d'un événement (résultats S1 en
> baisse) ou du marché (volatilité des matières premières). Confondre les deux est
> exactement l'erreur de `account_issue_category` (§2.7).

### 3.3 Trois axes orthogonaux, un seul rôle chacun

| Axe | Question | Valeurs | Qui décide |
|---|---|---|---|
| **Origine** | D'où ça vient, qu'est-ce qui le périme ? | 4 (§3.2) | **déterministe** — la table source |
| **Domaine** | De quoi ça parle, côté client ? | `reglementaire · financier · organisationnel · technologique · commercial · humain` | LLM |
| **Réponse KREDO** | Qu'est-ce qu'on sait en faire ? | **FK `offer_practices`** (8) ou `null` | LLM, contraint au référentiel |

`practice_id` en **clé étrangère** plutôt qu'en enum : le référentiel existe, il est déjà
consommé par le catalogue d'offres et par `get_commercial_strategy_context`. Un enum
dupliqué diverge (§2.10).

Un enjeu dont `practice_id` est `null` est **légitime** : c'est un enjeu réel du client
que KREDO ne sait pas adresser. Le dire vaut mieux que forcer un rattachement.

### 3.4 Trois scores : deux jugés, un calculé

| Score | Devient | Qui l'écrit |
|---|---|---|
| `importance` + `criticality` + `business_impact` | **`impact`** (1-5) — combien coûte l'inaction | LLM |
| `kredo_fit` | inchangé (1-5) | LLM, cohérent avec `practice_id` |
| `accessibility` | **supprimé** — jamais lu, relève de la stratégie | — |
| `urgency` | **calculé, jamais jugé** | code déterministe |

**Pourquoi l'urgence doit cesser d'être jugée par un LLM** : c'est la seule dimension qui
change **sans que rien ne se passe**. Un 5/5 écrit le 07/07 vaut toujours 5 aujourd'hui
alors que l'échéance est passée. Une urgence figée est fausse dès le lendemain.

Formule (`method_version: "issue-urgency-v1"`, doctrine `DeterministicIndicator` déjà en
place dans `intelligence-common-contracts.ts`) :

```
regulatory  → jours avant échéance : >180j=1 · 90-180=2 · 30-90=3 · 7-30=4 · <7=5
                                     passée → 0 + statut « échu »
event       → fraîcheur du signal rattaché le plus récent : <15j=5 · <30j=4 · <60j=3 · <90j=2 · >90j=1
market      → idem event, plafonné à 3
structural  → 2 par défaut · +1 si corroboré par un signal frais · +1 si cité en interaction <30j
```

Un enjeu à échéance passée **ne disparaît pas** : il bascule en `expired` et sort de la
liste active. C'est ce qui manque partout aujourd'hui.

### 3.5 Ce qu'on ne crée pas

- ❌ pas de table `enjeux` unifiée compte + secteur (elle réintroduirait le mélange de portées de §2.3)
- ❌ pas de nouvelle taxonomie de signaux — `mvp-v1` et ses 10 catégories tiennent
- ❌ pas de nouveau collecteur — intel-033 tient
- ✅ **une seule table nouvelle : `account_issue_signals`**

---

## 4. Architecture du workflow

### 4.1 Le principe : séparer la détection (faite) de la qualification (à refondre)

intel-033 est un pipeline mûr et en production : 40 nœuds, collecte site officiel + RSS
presse + registres + appels d'offres, déduplication, qualification LLM sur 3 axes,
**scoring déterministe en code** (`0.35·pertinence + 0.20·fraîcheur + 0.20·urgence +
0.15·fit + 0.10·fiabilité`), écriture de `intelligence_sources` + `account_signals` +
`intelligence_source_links`. Il produit 73 signaux **tous sourcés**.

> **Le workflow des enjeux ne doit donc pas collecter.** Il ne va sur aucun site web. Il
> lit ce qui est déjà en base et **réconcilie**.

### 4.2 intel-031 v2 — un réconciliateur, pas un générateur

```
   COLLECTE          ┌──────────────────────────────────────────────┐
   (inchangée)       │ intel-033  — EXISTE, en production           │
                     │ web → dédup → LLM 3 axes → score code →      │
                     │ intelligence_sources + account_signals        │
                     └───────────────────┬──────────────────────────┘
                                         │ signaux sourcés, datés, 60 j
   ANCRAGE           ┌───────────────────┴──────────────────────────┐
   STRUCTUREL        │ sector_pain_points · sector_regulatory_items │
   (existe)          │ sector_events · diagnostic · interactions     │
                     └───────────────────┬──────────────────────────┘
                                         ▼
   QUALIFICATION     ┌──────────────────────────────────────────────┐
   (à refondre)      │ intel-031 v2 — 0 appel réseau · Haiku        │
                     │   passe 1  RATTACHER  signal → enjeu ouvert  │
                     │   passe 2  CRÉER      faits orphelins        │
                     │   passe 3  CLORE      échéance passée, périmé│
                     └───────────────────┬──────────────────────────┘
                                         ▼
                        account_issues  +  account_issue_signals
```

**Aujourd'hui, seule la passe 2 existe** — et elle recrée tout à chaque exécution.

### 4.3 Les nœuds (≈ 16, patron canonique de la maison)

| # | Nœud | Rôle |
|---|---|---|
| 1-3 | Webhook · Verify Signature (HMAC) · Validate Payload | inchangé, patron maison |
| 4 | Update Run → `running` | inchangé |
| 5 | **Hydrate — RPC `get_account_issues_context` v2** | §4.4 |
| 6 | **Compute Urgency & Expiry** (Code, 0 token) | recalcule l'urgence des enjeux ouverts, marque les échus |
| 7 | IF — matière nouvelle ? | signaux non rattachés **ou** enjeu non revu depuis 30 j → sinon on saute au 13 |
| 8 | Build Reconciliation Prompt | contexte borné, **UUID inclus** |
| 9 | LLM Reconcile — **Haiku** | classification + rédaction courte sur contexte fourni |
| 10 | Parse & Validate | rejets durs, §4.5 |
| 11 | Build Writes | upsert par `dedupe_key`, **jamais d'insert nu** |
| 12 | Supabase: Upsert Issues + Links | `account_issues` + `account_issue_signals` |
| 13-16 | Prepare Callback · Sign · Callback · branche échec | patron maison |

> **Le nœud 6 justifie à lui seul l'exécution du workflow** : il coûte zéro token et
> corrige le défaut le plus grave (§2.2). Un run qui ne trouve aucune matière nouvelle
> reste utile.

### 4.4 RPC `get_account_issues_context` v2 — cinq corrections

| # | Correction | Pourquoi |
|---|---|---|
| 1 | **transmettre les UUID** des pain points, échéances, événements | cause racine de la traçabilité fantôme (§2.4) |
| 2 | filtrer les échéances **à venir**, trier par date **croissante** | aujourd'hui `order by … limit 5` renvoie les 5 plus **anciennes** — pour Parfumerie, 3 des 5 sont périmées |
| 3 | ajouter `sector_events` | absent aujourd'hui, c'est pourtant l'origine `market` |
| 4 | joindre `intelligence_sources` via `account_signals.primary_source_id` | pour que la preuve porte une URL et une date |
| 5 | exclure les signaux `adr-0011-lot1-v1` du corpus de **création** | non sourcés, non scorés — ils restent en lecture de contexte |

> ⚠️ Défaut SQL à corriger au passage : dans la v1, `limit 8` s'applique à la sous-requête
> **sans `ORDER BY`**, le tri étant fait *après* dans le `jsonb_agg`. La sélection des
> 8 pain points est donc arbitraire. Invisible sur Parfumerie (exactement 8), latent ailleurs.

### 4.5 Méthode de filtrage et de jugement de la pertinence

Quatre filtres, du plus amont au plus aval :

| # | Où | Règle |
|---|---|---|
| **F1** | intel-033 (**existe**) | `pertinence ≥ 0.2` **ou** `fit ≥ 0.2` **ou** `urgence ≥ 0.2` · plafond 5 signaux/source au-delà de 20 |
| **F2** | intel-031 v2 | un signal **crée** un enjeu si `global_score ≥ 0.35` · il **corrobore** un enjeu ouvert dès `0.20` — corroborer coûte moins cher que créer |
| **F3** | intel-031 v2 | **plafond dur de 12 enjeux ouverts par compte.** Au-delà, le modèle doit fusionner ou clore, jamais empiler |
| **F4** | intel-031 v2 | un enjeu `structural` **sans ancrage** (ni pain point, ni diagnostic, ni interaction) est **refusé** — garde-fou anti-enjeu générique (« ils doivent moderniser leur SI ») |

Rejets durs au nœud 10 : tout `signal_id` / `pain_point_id` / `regulatory_item_id` absent
du contexte → rejet du run ; `practice_id` hors référentiel → forcé à `null` ;
`provenance` hors `relational | folio_legacy | inferred` → rejet (règle D-3 déjà en
vigueur sur intel-030/031/032).

### 4.6 Migration minimale

```sql
-- 1. la seule table nouvelle
create table account_issue_signals (
  issue_id  uuid not null references account_issues(id)  on delete cascade,
  signal_id uuid not null references account_signals(id) on delete cascade,
  primary key (issue_id, signal_id), …
);

-- 2. account_issues : rendre le workflow ré-exécutable et l'urgence honnête
alter table account_issues
  add column dedupe_key       text not null,     -- + UNIQUE(workspace_id, company_id, dedupe_key)
  add column origin           account_issue_origin not null,   -- 4 valeurs (§3.2)
  add column practice_id      uuid references offer_practices(id),
  add column deadline_date    date,
  add column urgency_method   text,              -- "issue-urgency-v1"
  add column urgency_computed_at timestamptz,
  add column last_reviewed_at timestamptz;
-- statut : + 'expired'
```

`importance`/`criticality`/`business_impact` → `impact` et retrait d'`accessibility` :
à faire en une migration séparée, **après** que la nouvelle génération ait tourné (40
lignes seulement, aucune urgence à casser l'existant).

### 4.7 Coût

Contexte ≈ 8-12 k tokens, sortie ≈ 2 k, **Haiku** (classification + rédaction courte sur
contexte fourni — aucune recherche). **≈ 0,01 $ par compte et par exécution**, soit
**≈ 1 $/mois** pour les 89 comptes adressables en cadence mensuelle. À comparer à
intel-033 (Sonnet + collecte web).

---

## 5. Présentation de l'onglet « Enjeux »

### 5.1 La contrainte qui doit piloter le design

> **87 comptes sur 96 n'ont aujourd'hui ni enjeu qualifié ni signal frais.**
> 7 comptes ont des enjeux. 6 ont des signaux `mvp-v1` non expirés. 12 sont sous veille.

Concevoir cet onglet pour le cas « rempli » revient à concevoir pour 8 % du parc.

### 5.2 Trois états, pas un

| État | Part du parc | Contenu |
|---|---|---|
| **A — Héritage sectoriel** | ~91 % | **Ce n'est pas un empty state.** 93/96 comptes ont un `sector_id` : on affiche les échéances et pain points du secteur qui s'appliquent au compte, non encore qualifiés, avec un bouton « Qualifier pour ce compte ». Pour Parfumerie : 8 pain points, 5 échéances, 5 événements de vraie matière. |
| **B — Qualifié** | ~8 % | la liste des enjeux (§5.3) |
| **C — À revoir** | — | bandeau en tête si un enjeu est échu ou non revu depuis 90 j |

**L'onglet n'est donc jamais vide pour un compte sectorisé.**

### 5.3 Le rendu — carte, pas tableau

Le `DataTable` actuel affiche 8 colonnes dont 3 badges numériques. Il est illisible et
son tri par défaut (`importance desc`) fige une hiérarchie qui n'est plus la bonne dès
que l'urgence devient dynamique.

Unité de rendu : **une carte par enjeu**, groupées par origine, dans un ordre fixe —
**Réglementaire → Événement → Structurel → Marché**, soit l'ordre de péremption
croissante, donc l'ordre d'action.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⚖ RÉGLEMENTAIRE               échéance dans 23 j · 31/07/2026        │ ← origine + urgence CALCULÉE
│ Étiquetage allergènes UE 2023/1545                                   │
│ Le screening manuel ne tient pas la charge avant l'échéance.         │ ← problem_statement, 1 phrase
│                                                                       │
│ Impact ●●●●○        Réponse KREDO · Data & IA                        │ ← 2 axes, pas 6
│ Preuves 3 ▸  [JO UE · 05/2023] [Signal · 24/07] [Pain point · Grasse]│ ← résoluble, daté, cliquable
│ Contact  Dir. Affaires Réglementaires                                │
│ →  « Comment gérez-vous le screening aujourd'hui ? »                 │ ← recommended_next_probe
│                                   [Confirmer] [Écarter] [Adresser]   │
└──────────────────────────────────────────────────────────────────────┘
```

**Cinq partis pris, chacun motivé par un défaut mesuré :**

1. **L'urgence est une phrase, jamais un chiffre.** « échéance dans 23 j » se vérifie
   d'un coup d'œil ; « urgence 5/5 » ne se vérifie jamais. C'est le seul rendu qui rend
   *visible* une donnée périmée (§2.2). Un enjeu échu s'affiche « échéance dépassée le
   31/07 » en `danger`, en tête, et non caché.
2. **Le compteur de preuves est le contrôle de crédibilité**, toujours visible, jamais
   replié par défaut au-delà de 0. Un enjeu à 0 preuve s'affiche en bordure pointillée
   avec la mention `déduit` — l'utilisateur doit savoir qu'il lit une déduction (§2.4).
3. **Pas de matrice importance × urgence.** Déjà écartée au Lot 4 d'ADR-0012 ; et
   l'urgence devenant dynamique, un point se déplacerait sans action de l'utilisateur.
4. **Trois actions, pas quatre.** `Confirmer` → `provenance = human_verified`.
   `Écarter` → `dismissed` (jamais de suppression, D-3). `Adresser` → ouvre le composeur
   de communication ou crée une opportunité — le chemin existe déjà
   (`CreateCommercialWindowDialog` appelle `createOpportunity`).
5. **Mobile** : les 3 premiers enjeux par urgence calculée, carte pleine largeur, preuves
   en `<details>`. Jamais de `DataTable` (règle du projet).

### 5.4 Articulation avec les onglets voisins — à écrire dans la nav

| Onglet | Niveau | Répond à |
|---|---|---|
| **Actualités** | 1 — le flux | « que vient-il de se passer chez eux ? » |
| **Enjeux** | 2 — le stock qualifié | « qu'est-ce qui coince durablement ? » |
| **Secteur** | ancrage mutualisé | « qu'est-ce qui vaut pour tout le secteur ? » |
| **Stratégie › Fenêtres d'opportunités** | **vue dérivée** | « qu'est-ce qui est adressable *maintenant* ? » |

**« Fenêtres d'opportunités » n'est pas une donnée : c'est un filtre** sur `account_issues`
— `urgence_calculée ≥ 4` **et** `kredo_fit ≥ 3`.

> Cela allège considérablement **D-10** : il n'y a pas de « RPC d'unification de
> 5 sources » à construire. Les 5 sources convergent déjà dans `account_issues` via
> intel-031 v2. Le chapitre BI « Fenêtres d'opportunités » est le **même filtre à la
> portée portefeuille**. Un calcul, deux scopes (N-7). → proposé comme **D-18**.

---

## 6. Playbook du compte — commentaire, faisabilité, limites

### 6.1 Le concept est solide, et pour une raison précise

Le playbook sectoriel est **déjà structuré par enjeu** : chaque persona porte un champ
`enjeu`. Structure réelle des 14 secteurs :

```json
{ "personas":      [{ "role": "…", "enjeu": "…", "peur": "…" }],
  "objections":    [{ "objection": "…", "reponse": "…" }],
  "entry_points":  ["…"],
  "roi_arguments": ["…"] }
```

Le playbook du compte n'est donc pas une invention : c'est **le playbook sectoriel résolu
sur un compte**, où l'`enjeu` générique devient un `account_issue` réel.

### 6.2 Ce qui existe déjà — 80 % de la matière

| Demande | Existe | Manque |
|---|---|---|
| Synthétiser les enjeux | `account_issues` | — |
| Classer les fenêtres commerciales | filtre §5.4 | la vue |
| Solutions et approches adaptées | `commercial_strategy.offer_matches` (intel-032) | — |
| Contacts concernés + persona | `contacts.relationship_role` + `playbook.personas[].role` | **l'appariement** |
| Éléments de langage (pitch d'appel, 1er RDV) | intel-020, canaux `spoken_pitch_30s` et `meeting_briefing` | — |
| Objections + réponses | `playbook.objections` (secteur) + `commercial_strategy.objections` (compte) | — |
| Section nourrie manuellement | — | **tout** |

### 6.3 Recommandation — ne pas en faire un artefact généré

> **Le playbook du compte doit être une vue composée, calculée à l'ouverture. Pas un
> document généré.**

S'il est généré, il est figé à sa date, il périme comme tout le reste, et on obtient
**un sixième endroit** où le règlement UE 2023/1545 apparaît — exactement le problème
que §1 documente.

Composition à la lecture :

```
Playbook du compte  =  account_issues            (enjeux + urgence recalculée)
                    +  commercial_strategy       (offres, angles, objections — intel-032)
                    +  sector_intelligence.playbook (personas, objections, ROI — hérité)
                    +  contacts                  (appariement persona)
                    +  account_playbook_notes    ← SEULE table nouvelle
```

**Zéro workflow n8n nouveau. Zéro token. Toujours à jour par construction**, parce qu'il
ne stocke rien de dérivé.

### 6.4 Les limites, dites franchement

1. **Il ne sera bon que sur 7 comptes aujourd'hui.** Sans `account_issues` ni
   `commercial_strategy`, il retombe sur le playbook sectoriel + les contacts — honnête,
   mais ce n'est plus « le playbook du compte ». **Le prérequis n'est pas technique, il
   est de couverture.**
2. **L'appariement persona ↔ contact est le maillon faible.** `playbook.personas[].role`
   est du texte libre (« Directeur R&D / Création ») ; `contacts.relationship_role` est
   un enum (`dsi`, `decideur`, `rh`…). `dsi` → « DSI / Responsable Transformation »
   fonctionne ; « Directeur R&D / Création » ne correspond à aucune valeur. Il faut un
   **mapping explicite**, pas une heuristique de comparaison de chaînes.
3. **La section manuelle change la nature de l'objet.** Dès qu'un humain écrit dedans, on
   ne peut plus régénérer sans risque d'écrasement. D'où : notes en **table séparée**,
   jamais fusionnées dans un blob régénérable — leçon déjà tirée sur
   `account_knowledge` V1→V3 (curation par drapeaux, jamais par réécriture).
4. **`PlaybookPage.tsx` n'est pas réutilisable tel quel.** Il prend `sector:
   SectorWithRelations` et pilote 4 sections en state local
   (`snapshot | pitch | playbook | actions`). Le réutiliser suppose de le découpler vers
   un contrat minimal — même travail que celui déjà fait sur `PitchMailDrawerContent`
   (Session 16, découplé de `ClientIntelligenceData`). **Précédent connu, coût connu.**
5. **Risque de recouvrement avec l'onglet « Approches commerciales ».** Sans ligne de
   partage, on livre deux fois la même page. Ligne proposée :
   **Stratégie › Approches commerciales = la matière** (mapping enjeu ↔ offre, éditable) ·
   **Playbook = la mise en forme pour l'action** (lecture seule, imprimable, un écran
   avant l'appel).
6. **« Ajouter au playbook » n'existe pas.** `AddToListExplanationDialog` est aujourd'hui
   une modale d'explication (« cette fonctionnalité vous permettra prochainement… ») —
   elle n'écrit rien.

### 6.5 Prérequis, dans l'ordre

| # | Prérequis | Bloquant pour |
|---|---|---|
| 1 | `account_issue_signals` + urgence calculée + `dedupe_key` | l'onglet Enjeux **et** le playbook |
| 2 | intel-031 v2 exécuté sur les 89 comptes adressables | la couverture (§6.4-1) |
| 3 | Mapping explicite persona ↔ `relationship_role` | la section contacts |
| 4 | `account_playbook_notes` + action réelle « Ajouter au playbook » | la section manuelle |
| 5 | Découplage de `PlaybookPage` vers un contrat minimal | le rendu |

---

## 7. Écarts constatés avec la documentation du projet

À répercuter dans `CLAUDE.md` lors de la prochaine session touchant la base.

| Sujet | `CLAUDE.md` | Mesuré le 2026-08-07 |
|---|---|---|
| `companies.sector_id` renseigné | 27/95 | **93/96** — le backfill sectoriel a été fait |
| `sector_pain_points` | 22 | **83** |
| `sector_regulatory_items` | 13 | **64** |
| `sector_events` | 15 | **52** |
| `account_signals` | 745 | **808** (735 legacy + 73 `mvp-v1`) |
| `account_issues` | 22 | **40** sur 7 comptes |
| Playbooks sectoriels | non documenté | **14/14 secteurs** en ont un |
| `intelligence_sources` | 42 | **128** |

---

## 8. Ce qui n'est pas tranché

| # | Question | Impact |
|---|---|---|
| Q1 | La refonte des scores (`impact`, retrait d'`accessibility`) se fait-elle avant ou après le premier passage d'intel-031 v2 ? | 40 lignes seulement — recommandation : **après** |
| Q2 | `sector_events` porte des faits propres à un compte (§2.3). Migre-t-on ces lignes vers `account_signals`, ou les laisse-t-on en l'état avec un filtre à l'affichage ? | 52 lignes à trier manuellement |
| Q3 | Les 735 signaux `adr-0011-lot1-v1` non sourcés : archivés, ou conservés en contexte de lecture seule ? | recommandation : **conservés, marqués, exclus de la création d'enjeux** |
| Q4 | Le mapping `kredo_practice` (4 valeurs texte) → `offer_practices` (8 slugs) : table de correspondance ou reprise manuelle des 147 lignes concernées ? | §2.10 |
