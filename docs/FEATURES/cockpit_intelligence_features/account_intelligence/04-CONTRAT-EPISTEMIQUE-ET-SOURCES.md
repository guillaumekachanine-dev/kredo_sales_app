# 04 — Contrat épistémique et sources

Ce document fixe ce que KREDO peut prétendre savoir, à quel prix, et comment il le montre.
C'est le document qui empêche la répétition simultanée des deux échecs : la V3 qui ne disait
plus rien, la V4 qui dit tout sans avoir rien lu.

---

## 1. Les quatre qualifications

L'échelle V4 est la bonne. **On n'en crée pas une cinquième, et on ne la remplace pas par un
score de confiance métier.**

| Qualification | Sens | Exemples | Exigence |
|---|---|---|---|
| **`established`** | Établi par une ou plusieurs preuves adéquates | SIREN, acquisition réalisée, implantation, chiffre publié, réglementation en vigueur | **≥ 1 source externe ancrée** (§2). Très forte exigence sur chiffres, dates, identité |
| **`declared`** | Ce qu'une organisation ou un dirigeant affirme | Ambition stratégique, objectif public, positionnement revendiqué | **Source de la déclaration nommée et datée**. Jamais convertie en vérité indépendante |
| **`inferred`** | Déduction raisonnable à partir de faits observables | Dépendance probable, segmentation, rôle dans la chaîne de valeur | Sources des faits mobilisés + **raisonnement explicite** |
| **`hypothesis`** | Piste méritant exploration | Besoin IT potentiel, tension supposée, fenêtre liée à un changement | Présentée comme telle. **Jamais promue en fait automatiquement** |

---

## 2. La règle d'ancrage — le cœur du document

C'est le correctif du défaut fondateur (A3).

### 2.1 — Ce qui compte comme source

| Type | Recevable ? | Pour quelle qualification |
|---|---|---|
| Document externe **effectivement récupéré**, avec URL, date et hash | ✅ | `established`, `declared` |
| Ligne `account_facts` précise (`fact.id`) | ✅ | `established` |
| Ligne `account_signals` précise (`signal.id`) avec `primary_source_id` | ✅ | `established`, `declared` |
| Fiche `sector_intelligence` / `competitive_map_entries` précise | ✅ | `inferred` (projection) |
| Ligne relationnelle CRM précise (opportunité, mission, contact) | ✅ | `established` sur K7 |
| Snippet de moteur de recherche | ❌ | **Jamais** — ce n'est pas une lecture |
| URL sélectionnée mais non récupérée | ❌ | **Jamais** |
| Agrégat interne (`internal:facts:<companyId>`, `internal:folio:<companyId>`…) | ❌ | **Jamais** |
| Étude FOLIO legacy | ⚠️ | **Indice de recherche uniquement.** Jamais une source d'ancrage |

### 2.2 — Les deux invariants opposables

> **INV-1 — Un `established` cite au moins une source externe ancrée.**
> Une source interne seule ne suffit jamais, **sauf** pour K7 (historique KREDO), qui est
> déterministe par nature.

> **INV-2 — Un agrégat n'est jamais une référence de statement.**
> `source_refs` ne contient que des identifiants désignant **une ligne ou un document**.

**Pourquoi ces deux règles existent.** Sur le run Tournaire du 07/09/2026, le garde-fou V4 a
fonctionné mécaniquement — les 3 `hypothesis` portent 0 référence, les 18 autres statements en
portent 1 chacun. Mais le catalogue de sources autorisées contenait cinq agrégats internes. Les
10 statements `declared` citent donc, pour l'essentiel, `internal:folio:<uuid>` :

> une étude legacy de deux ans, blanchie en affirmation fraîche et sourcée, présentée à
> l'utilisateur avec une puce « Source » qui affiche « Études FOLIO historiques ».

**La V4 valide la forme de la provenance, jamais sa substance.** INV-1 et INV-2 corrigent
exactement ça.

### 2.3 — Le compteur d'ancrage

Chaque artefact porte, **dans `content_json`** (pas seulement dans un `contextSnapshot` que
personne ne rend) :

```jsonc
"anchoring": {
  "external_documents_used": 7,     // documents réellement lus et cités
  "statements_total": 21,
  "statements_externally_anchored": 14,
  "anchoring_ratio": 0.67,
  "research_status": "nominal"      // | "degraded" | "internal_only"
}
```

`anchoring_ratio` est **la métrique de pilotage du chantier**. Sur le run Tournaire :
4 statements ancrés sur 21, tous sur le seul registre légal — **ratio 0,19**.

---

## 3. Ce que la déduction peut et ne peut pas toucher

### 3.1 — Déduction interdite (A4)

Identifiants juridiques · montants financiers · effectifs chiffrés · dates · opérations
capitalistiques réalisées · certifications · obligations et échéances réglementaires · identité
précise d'une personne · relations capitalistiques.

**Une déduction peut aider à *chercher*. Elle ne devient jamais la donnée finale.**

### 3.2 — Déduction autorisée, marquée `inferred`

Positionnement comparatif · rôle dans la chaîne de valeur · segmentation probable des clients ·
dépendances · vulnérabilités · tendances comportementales · importance relative d'un marché ·
exposition à une technologie · ambitions implicites cohérentes avec plusieurs décisions
observées.

### 3.3 — Hypothèse autorisée, marquée `hypothesis`

Existence d'un futur chantier IT · pression susceptible d'ouvrir un budget · opportunité
commerciale · changement organisationnel probable · besoin de compétences · fenêtre ouverte par
une contrainte réglementaire.

> **C'est là que la valeur du LLM est réelle :** non pas inventer ce qu'il ne sait pas, mais
> **relier ce que plusieurs sources prises isolément ne disent pas explicitement**.

### 3.4 — Le `rationale` d'une inférence

Un `inferred` sans raisonnement lisible est un `hypothesis` déguisé. Le contrat V4 ne porte pas
de champ `rationale` : **c'est le premier candidat sérieux à une V5** (`03` §5). En attendant,
le raisonnement est porté dans le `text` du statement, qui doit rendre l'appui explicite —
*« la concentration de la production sur le site de Grasse constitue une dépendance, ce qui
découle de X et Y »*, jamais *« l'entreprise est dépendante de son site »*.

---

## 4. Les trois modes de restitution

| Mode | Contenu affiché | Usage |
|---|---|---|
| **Strict** | `established` + `declared` | Préparation d'un rendez-vous à fort enjeu |
| **Équilibré** *(défaut)* | + `inferred` | Lecture courante |
| **Exploratoire** | + `hypothesis` | Recherche d'angles, brainstorm |

**Deux règles :**

1. **Le mode ne change jamais la nature d'une information.** Une hypothèse reste une hypothèse
   en mode exploratoire. Le mode décide seulement de ce que KREDO accepte d'afficher.
2. **Le mode est un filtre de lecture, pas un paramètre de génération** (`03` §5). On génère les
   quatre qualifications une fois ; on filtre ensuite, gratuitement et réversiblement.

Pas de slider 0–100, pas de « créativité 0,37 », pas de température exposée. La marge de manœuvre
demandée entre déduction et vérification stricte **est** ce sélecteur à trois positions.

---

## 5. Les conflits de sources

**Une contradiction se montre, elle ne s'arbitre pas silencieusement.**

Cas canonique : le CRM dit 1 300 salariés, le registre une tranche 250–499. Trois comportements
interdits : choisir arbitrairement, produire deux paragraphes contradictoires comme si de rien
n'était, supprimer la donnée.

Comportement attendu :

```
Effectif — deux valeurs divergentes
  ├── 1 300          CRM, saisie du 12/03/2026
  └── 250 à 499      Registre INSEE, tranche au 01/2026
  → [ Vérifier ]  (INTEL-034)
```

`account_facts` supporte nativement ce cas : `cardinality = 'multi'`, plusieurs lignes
`is_current` avec des `primary_source_id` distincts. **Le conflit est une donnée, pas une
erreur.**

---

## 6. Le garde-fou des chiffres

Le pipeline V4 remplace tout nombre absent du dossier par la locution
« un ordre de grandeur à confirmer » (fonction `guardFigures`). L'intention est juste — ne pas
laisser sortir un chiffre non ancré — mais l'exécution opère au niveau du token et détruit la
phrase :

> *« un chiffre d'affaires net déclaré de **un ordre de grandeur à confirmer** en 2023 »*

visible dans la première phrase de la synthèse du run Tournaire, et propagé dans un statement
`declared`.

**Règle corrigée :** un chiffre non ancré ne se substitue pas dans la phrase — **il fait tomber
le statement entier** en `hypothesis`, ou la phrase est reformulée sans le chiffre. Un rapport
lisible sans chiffre vaut mieux qu'un rapport troué de placeholders.

---

## 7. La vérification à la demande

> **La qualification est automatique. La vérification approfondie est volontaire.**

C'est le compromis qui évite le travers de la V3 (deuxième recherche et deuxième LLM pour chaque
phrase) tout en offrant un mécanisme sérieux quand une information devient déterminante.

```
L'analyse affiche une information
      ↓
L'utilisateur voit son statut épistémique et ses sources
      ↓
Il juge l'information importante ou douteuse → [ Vérifier ]
      ↓
Recherche de preuves indépendantes, source initiale exclue
      ↓
confirmed | contradicted | insufficient_evidence  + rationale + preuves
```

Le patron méthodologique est celui d'INTEL-034 : deux canaux, exclusion de la source initiale,
rétrogradation automatique d'une confirmation sans preuve secondaire, pas d'appel LLM en
l'absence de source indépendante, et **aucune mutation automatique du statut métier**.

> ⚠️ **INTEL-034 n'a jamais fonctionné.** Un seul run à ce jour, `failed`, le 14/08/2026. Ce
> n'est pas une brique disponible à recycler : c'est un patron méthodologique valide dont
> l'implémentation reste à prouver. Le lot de vérification générique (`06` §5, Lot 5) commence
> donc par le faire tourner une fois sur son cas d'origine.

Le workflow actuel étant fortement couplé à `account_signals`, on créera un **sibling** plutôt
que de complexifier le workflow signal pour un usage encore non consommé. L'UI peut prévoir le
bouton **Vérifier** dès le nouveau renderer, désactivé tant que la capacité n'est pas livrée.

---

## 8. Ce que l'utilisateur voit

Le texte reste le premier niveau de lecture. Les preuves sont accessibles à la demande.

| Élément | Toujours visible | À la demande |
|---|---|---|
| Récit de section | ✅ | |
| Marqueur épistémique sur statement significatif | ✅ | |
| Bandeau d'ancrage du rapport (`research_status`) | ✅ | |
| Liste des sources d'un statement | | ✅ |
| Document récupéré, date, extrait | | ✅ |
| Conflit de valeurs | ✅ *(si présent)* | détail |
| Bouton **Vérifier** | | ✅ |
| `knowledge_gaps` de la section | ✅ | |

> **Le bandeau d'ancrage n'est pas décoratif.** Un rapport en `research_status: "internal_only"`
> ouvre sur une phrase qui le dit : *« Analyse produite sans consultation de source externe —
> fondée sur les données KREDO et le registre légal. »* C'est la traduction à l'écran de A2, et
> la seule chose qui aurait empêché le rapport Tournaire d'être trompeur.
