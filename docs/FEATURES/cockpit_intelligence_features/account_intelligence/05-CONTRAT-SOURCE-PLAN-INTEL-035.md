# 05 — Contrat Source Plan (INTEL-035)

**Lot fondateur.** Ce n'est pas une extension de confort d'Account Intelligence : c'est le lot
qui répare la collecte, en lui donnant une surface produit au lieu de l'enfouir dans un nœud
Code.

---

## 1. Le problème que ce workflow existe pour régler

Relevé du 10/09/2026 sur `intel-030-account-knowledge` :

| | |
|---|---|
| Runs V4 | **12** |
| Réussis | **4 (33 %)** |
| `external_pages_fetched` sur les 4 réussis | **0, 0, 0, 0** |
| Sources par run | **6** — dont 5 agrégats internes, 1 registre légal |
| Durées des succès | **404 s, 408 s, 425 s** (+ un à 98 s) |
| Plafond task runner n8n | **300 s** — 2 runs morts exactement là |

Et sur l'ensemble du workflow, toutes versions : **23 succès / 22 échecs**.

**Ce n'est pas la sélection qui échoue, c'est la lecture.** Le scoring de `V4 Fetch Selected
Pages` privilégie déjà correctement le site officiel (+100), les `.gouv.fr` (+70), la presse
économique (+40). Il sélectionne de bonnes URL — puis les six requêtes parallèles à
`timeout: 6000` échouent intégralement contre des sites derrière Cloudflare, des paywalls et des
coquilles JavaScript, et le pipeline **continue** en marquant `external_research_degraded`.

---

## 2. Le piège à éviter : un preflight qui ne lit pas

Un preflight limité aux métadonnées (URL, domaine, titre, date, snippet) **ne règle rien** :

```
Preflight   → 12 sources pertinentes proposées
Utilisateur → valide les 12
INTEL-030   → fetch les 12 → 0 succès → external_research_degraded
Rapport     → la même prose non ancrée qu'aujourd'hui
```

On aurait ajouté une étape, un écran, un run et du délai — et **fait valider à l'utilisateur une
liste de sources dont aucune ne sera lue**. C'est pire que rien : ça transforme un défaut
technique silencieux en illusion co-signée.

> **INTEL-035 ne propose pas des URL candidates. Il propose des sources dont il a vérifié qu'il
> peut les lire, et dont il a conservé le texte extrait.**

---

## 3. Ce que le renversement débloque

| Problème | Résolution |
|---|---|
| **Mode dégradé silencieux (A2)** | Impossible de publier « établi » sur zéro page : l'absence de matière est visible **avant** de dépenser un token de synthèse |
| **Plafond d'exécution 300 s (A8)** | Le fetch — poste le plus lourd et le plus lent — sort du run d'analyse. INTEL-030 repasse largement sous le plafond, ce qui **débloque L3 et L4** |
| **Validation humaine creuse** | On valide de la matière récupérée, pas des promesses. « Les Échos, 14/03/2026, 8 200 car. » au lieu de « Les Échos » |
| **Double téléchargement** | On ne télécharge pas deux fois : **une seule fois, plus tôt**, et l'analyse consomme le cache |

---

## 4. Le workflow

```
INTEL-035 — account-source-preflight

 1. Résolution d'entité             ← module déterministe existant (A1, non négociable)
 2. Résolution du segment           ← companies.segment_id
 3. Inventaire de l'acquis          ← account_facts courants, sources déjà liées, signaux
 4. Lecture des corpus applicables  ← source_corpora, corpus sectoriel
 5. Dérivation des gaps             ← modules demandés − acquis frais
 6. Découverte web SUR LES GAPS
 7. FETCH RÉEL + extraction + hash + déduplication        ← le cœur
 8. Rejet explicite du non-récupérable, avec motif
 9. Classement par pertinence / autorité / fraîcheur
10. Publication du SourcePlan       ← result_type = "account_source_plan"
```

**Le run se termine.** Il n'attend jamais la validation humaine : un workflow n8n suspendu
pendant que l'utilisateur boit un café est un workflow perdu. La validation se fait dans KREDO,
puis **un second run indépendant** déclenche INTEL-030.

### Deux règles opposables

1. **Le plan ne contient que du récupéré.** Ce qui a échoué figure dans une section séparée
   `unreachable`, avec le motif. L'utilisateur voit la réalité, pas une intention.
2. **INTEL-030 devient un pur consommateur.** Il ne fait plus aucune découverte ni aucun fetch :
   il reçoit le manifeste approuvé et le texte en cache, et effectue **un seul appel LLM**.

---

## 5. Le classement des sources

**On ne demande jamais à un LLM de noter la fiabilité d'un site de 0 à 100.** C'est de la fausse
précision. Le classement repose sur cinq dimensions déterministes ou faiblement interprétées :

| Critère | Ce qu'il mesure |
|---|---|
| **Pertinence** | la source répond-elle au module demandé ? |
| **Autorité** | registre, régulateur, entreprise elle-même, presse, étude spécialisée |
| **Correspondance d'entité** | parle-t-elle bien de **cette** personne morale ? (A1) |
| **Fraîcheur** | pertinente pour le type d'information cherché ? |
| **Récupérabilité** | **a-t-on effectivement pu la lire, à l'instant ?** |

### `effectiveness_score` est explicitement exclu du classement

`v_source_effectiveness_30d` mesure `observations`, `items_collected`, `items_retained`,
`productive_run_rate` : c'est-à-dire **« ce flux RSS produit-il des actualités de veille qu'on
garde ? »**. Sur les lignes relevées le 10/09/2026, `reliability_rate` vaut 1,0000 partout
tandis que `effectiveness_score` s'étale de 25 à 60 et que `productive_run_rate` est à 0,0000
sur la moitié.

> **Utiliser ce score pour classer des sources d'analyse compte est une erreur de catégorie.**
> Une source à 25 peut être un registre légal parfait pour ancrer un SIREN. Ce n'est pas un
> « signal secondaire à pondérer » : c'est un indicateur d'une autre activité. Il est **hors du
> ranking Account Intelligence.**

### Ce que le catalogue existant peut et ne peut pas fournir

Relevé `source_catalog` au 10/09/2026 :

| | |
|---|---|
| Sources | **62** |
| `origin='corpus'`, `validation_status='pending'` | **47** — jamais vérifiées |
| `origin='system'`, `valid` | 10 |
| `origin='system'`, **`unreachable`** | **4** |
| `origin='manual'` | **1** |
| Jamais sondées (`last_verified_at IS NULL`) | **58 / 62 (94 %)** |
| `usage_scopes` | `study` 27 · `news` 27 · `account_watch` 7 — **aucun scope Account Intelligence** |

Sur les 14 réellement sondées, **4 sont mortes (29 %)**, avec ce motif :

> *« Sonde 2026-09-06 (ADR-0022 §2.2) : flux RSS mort et repli site: Google News FR sans
> rendement. »*

**Le socle existe, mais il est bâti pour un autre métier : la moisson RSS périodique de la
veille.** `last_verified_at` valide un *flux*, pas la récupérabilité d'une *page*. Le
`source_catalog` reste donc utile comme **référentiel d'autorité et de corpus**, et
inopérant comme garantie de récupérabilité. C'est INTEL-035 qui produit cette garantie, au
moment du run.

---

## 6. Le contrat `SourcePlan`

```ts
type SourceKind =
  | "registry" | "company_official" | "press" | "specialised_study"
  | "regulatory" | "job_board" | "internal"

type SourceStatus = "recommended" | "approved" | "excluded" | "unreachable"

interface AccountSourcePlanEntry {
  /** Identifiant stable dans le plan — devient une source_ref citable. */
  id: string
  url: string
  domain: string
  kind: SourceKind
  title: string | null
  published_at: string | null
  /** Pourquoi cette source est proposée, en une phrase lisible. */
  reason: string
  /** Modules qu'elle est censée servir. */
  serves_modules: AccountIntelligenceModule[]
  status: SourceStatus

  /** Renseignés UNIQUEMENT si le document a été effectivement récupéré. */
  fetched_at: string | null
  content_hash: string | null
  extracted_chars: number | null
  /** Motif de rejet si status = "unreachable". */
  failure_reason: string | null
  /** Origine : proposé par le workflow, ou ajouté à la main. */
  origin: "discovered" | "manual" | "corpus" | "catalog"
}

interface AccountSourcePlanContent {
  schema_version: 1
  company_id: string
  entity_resolution: EntityResolutionSnapshot
  scope: {
    target_level: AccountIntelligenceLevel
    modules: AccountIntelligenceModule[]
  }
  entries: AccountSourcePlanEntry[]
  corpora: { id: string; label: string; item_count: number }[]
  coverage: {
    modules_with_material: AccountIntelligenceModule[]
    modules_without_material: AccountIntelligenceModule[]
  }
  generated_at: string
}
```

Publié comme résultat IA classique : `result_type = "account_source_plan"`.

### La seule addition de schéma du chantier

Le texte extrait doit vivre quelque part. `intelligence_sources` (550 lignes) porte
`canonical_url`, `collected_at`, `content_hash`, `collection_method`, `technical_metadata` — mais
son seul champ texte est `evidence_excerpt`, un **extrait**, pas un corps de page de
14 000 caractères.

> **`account_source_documents` est la seule table nouvelle justifiée de ce chantier.**
> Clé : `(run_id, content_hash)`. Colonnes : `url`, `canonical_url`, `fetched_at`,
> `extracted_text`, `extracted_chars`, `http_status`, `collection_method`, `workspace_id`.
> RLS : motif standard.
>
> Tordre `evidence_excerpt` pour y loger un corps de page serait un mensonge sémantique durable.
> L'assumer coûte une migration et se règle une fois.

Après validation, **INTEL-030 recopie le manifeste approuvé dans son `input_snapshot`** : il n'a
pas à « retrouver » ce que l'utilisateur avait approuvé.

---

## 7. Source de run vs source permanente

Deux concepts qu'il ne faut pas confondre :

| | Source permanente | URL de cette étude |
|---|---|---|
| Exemple | INSEE, Les Échos, ANSSI, EUR-Lex | `entreprise.fr/investors/strategy-2026.pdf` |
| Vit dans | `source_catalog` | le `SourcePlan` du run |
| Raisonne au | **domaine** | **document** |
| Créée par | Gestion des sources (UI + Server Actions existantes) | INTEL-035 ou saisie manuelle |

L'interface propose donc **deux actions distinctes** :

- **Ajouter une URL à cette analyse** → modifie le `SourcePlan`, rien d'autre.
- **Enregistrer cette source dans KREDO** → passe par le système de Gestion des sources.

> **Une URL ponctuelle n'entre jamais automatiquement dans `source_catalog`.** Le catalogue
> raisonne au domaine, et la création manuelle actuelle produit une source permanente avec
> `usage_scopes: ["news"]`. Sans cette règle, le catalogue devient un cimetière d'articles — et
> les données montrent qu'il est aujourd'hui préservé : **1 seule source `manual` sur 62**.

Une URL saisie à la main **est fetchée immédiatement** comme les autres : si elle est
inaccessible, elle apparaît `unreachable`. Aucune exception au principe « on ne propose que ce
qu'on a lu ».

---

## 8. Le preflight est-il conditionnel ?

**Non — il est obligatoire dès qu'un module exige de la recherche externe.** Vu le taux d'échec
mesuré (0/4 en nominal, 29 % du catalogue sondé mort), lancer une analyse externe sans preuve
préalable de matière disponible est exactement ce qui a produit les rapports actuels.

Mais son **coût varie fortement** selon le niveau, et c'est là que la modulation se joue :

| Niveau | Preflight | Coût attendu |
|---|---|---|
| **L1 — Essentiel** | Registre + site officiel seulement | Quasi nul, 2 fetch |
| **L2 — Entreprise** | Oui, sur les modules manquants ou périmés | Modéré |
| **L3 — Écosystème** | **Aucune découverte web si le segment porte une Master Study** | **Quasi nul** |
| **L4 — Enjeux** | Oui, le plus large | Le plus élevé |

---

## 9. `sourcePolicy`

| Valeur | Comportement |
|---|---|
| **`approved_only`** *(défaut)* | INTEL-030 respecte strictement le corpus validé. Un manque produit un `knowledge_gap` explicite : *« information insuffisamment documentée dans le corpus approuvé »* |
| `allow_gap_discovery` | Recherche complémentaire autorisée quand un gap bloque une section. Les sources ainsi ajoutées sont **identifiées explicitement** dans le rapport |

`approved_only` par défaut est le bon choix — **mais uniquement parce que le preflight garantit
désormais de la matière**. Avec un preflight limité aux métadonnées, ce défaut produirait
mécaniquement des rapports vides.

---

## 10. L'interface

### Desktop — bloc **Sources** du centre de contrôle, juste après le périmètre

```
SOURCES DE L'ANALYSE                    [ Préparer / actualiser ]

Récupérées — 7 documents
  ✓ Site corporate — Métiers            tournaire.fr · 10/09 · 11 200 car.
  ✓ Registre légal                      annuaire-entreprises · 10/09 · 3 100 car.
  ✓ Rachat par Motion Equity            lesechos.fr · 14/03/2026 · 8 200 car.
  ✓ Corpus « Emballage industriel »     4 items
  …

Non accessibles — 3                                          [ détail ]
  ✕ usinenouvelle.fr        403 — accès refusé
  ✕ societe.com             délai dépassé (6 s)

Modules sans matière — 2
  ⚠ it_intensity · organisation

[ + Ajouter une URL ]   [ + Ajouter un corpus ]     [ Valider les sources ]
```

Chaque ligne dit **pourquoi la source est là** et **ce qu'on en a tiré**. C'est ce qui distingue
une validation réelle d'une case à cocher.

### Mobile — synthèse, jamais la liste

```
Sources
7 documents récupérés · 3 inaccessibles
2 modules sans matière
[ Modifier ]      + Ajouter une URL
```

`Modifier` ouvre une sheet dédiée offrant les mêmes choix que le desktop.

---

## 11. Portée future

La capacité dépasse Account Intelligence :

```
              SOURCE PREFLIGHT
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
Account          Analyse        Étude
Intelligence     approfondie    sectorielle
```

**On ne construit aujourd'hui que le cas Account Intelligence.** Le contrat `SourcePlan` est
conçu pour ne pas l'interdire — il ne porte aucune hypothèse propre au compte hors de `scope`.
