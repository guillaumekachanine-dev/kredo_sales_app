# 02 — Distribution de la connaissance dans KREDO

**Ce document fait autorité sur la destination.** Un bloc de `01-CARTE-DE-LA-CONNAISSANCE-COMPTE.md`
qui n'apparaît nulle part ici n'a pas de raison d'être produit ; un écran qui affiche une donnée
absente de cette matrice est une deuxième vérité à maintenir.

Il reprend délibérément la doctrine de `docs/MASTER-STUDY/02-DISTRIBUTION-DANS-KREDO.md`.

---

## 1. La règle en une phrase

> **Une analyse cite. Elle ne possède pas.**

`ai_intelligence_results` dit *comment des faits, des sources et des observations s'assemblent
en compréhension à un instant T*. Il ne dit jamais *ce qui est vrai du compte* — ça, c'est le
travail de `companies` et `account_facts`.

Cette distinction est ce qui permet un écran très riche **sans entretenir cinq vérités
parallèles**.

---

## 2. La matrice de propriété

| Connaissance (`01`) | Propriétaire canonique | Producteur | Restitution primaire | Dans le rapport ? |
|---|---|---|---|---|
| **I1** identité légale, SIREN | `companies`, `account_facts` | INTEL-010 + registre | Socle / Drawer | Référence |
| **I2** NAF, activité déclarée | `companies`, `account_facts` | INTEL-010 | Socle | Référence |
| **I3** siège, implantations | `account_facts` | INTEL-010 / registre | Socle | Référence |
| **I4** effectif | `account_facts` (multi, daté) | INTEL-010 / registre | Socle | **Référence + conflit exposé** |
| **I5** CA, résultat | `account_facts` (multi, daté) | INTEL-010 / comptes publiés | Socle | Référence + contexte |
| **I6** actionnariat, opérations | `account_facts` + `account_signals` | INTEL-035 → INTEL-030 | Entreprise | Oui |
| **I7** dirigeants | `contacts` / `account_facts` | INTEL-010, humain | Contacts | Contexte |
| **M1–M7** métier, offre, modèle | **`ai_intelligence_results`** | INTEL-030 | Entreprise | **Oui — cœur** |
| **C1–C6** clients, marché | **`ai_intelligence_results`** | INTEL-030 | Entreprise | **Oui — cœur** |
| **E1** segment | `companies.segment_id` | Classification (ADR-0019) | Socle | Référence |
| **E2** concurrents nommés | `competitive_map_entries` | Master Study | Secteur | **Projection + delta** |
| **E3** leaders, structure marché | `sector_intelligence` | Master Study | Secteur | **Projection, jamais recalcul** |
| **E4** position relative | `ai_intelligence_results` | INTEL-030 | Entreprise | Oui |
| **E5** chaîne de valeur | `value_chain_*` | Master Study | Secteur | **Projection** |
| **E6** dépendances amont | `ai_intelligence_results` | INTEL-030 | Entreprise | Oui |
| **T1** histoire | `ai_intelligence_results` | INTEL-030 | Entreprise | Oui |
| **T2** actualité datée | **`account_signals`** | INTEL-033, imports | Veille | **Sélection / interprétation** |
| **T3** ambitions déclarées | `ai_intelligence_results` | INTEL-030 | Entreprise | Oui |
| **T4** investissements, projets | `account_signals` + résultat | INTEL-033 / INTEL-030 | Veille / Entreprise | Oui |
| **T5** réglementaire applicable | `sector_regulatory_items` | Master Study | Secteur / Enjeux | **Projection contextualisée** |
| **T6** échéances datées | `sector_regulatory_items`, `account_signals` | Master Study / veille | Enjeux | Oui |
| **T7–T8** enjeux, vulnérabilités | **`account_issues`** | **INTEL-031** | Enjeux | **Oui, en lecture** |
| **K1–K6** surface IT | `ai_intelligence_results` + `contacts` | INTEL-030 + CRM | Entreprise / Enjeux | Oui |
| **K7** historique KREDO | Tables relationnelles | Humain / CRM | Relation | **Contexte, jamais réinventé** |
| — stratégie commerciale | `commercial_strategy` | INTEL-032 | Stratégie | **Non — hors périmètre** |
| — roadmap | `account_roadmap_actions` | Aval gated | Roadmap | **Non — hors périmètre** |
| — corpus de sources d'un run | **`ai_intelligence_results`** (`account_source_plan`) | **INTEL-035** | Centre de contrôle | Annexe sources |
| — documents récupérés | **`account_source_documents`** *(nouvelle table, cf. `05` §6)* | INTEL-035 | Disclosure | Preuves |
| — sources et preuves | `intelligence_sources` + `_links` | Tous pipelines | Disclosure | Notes / sources |
| — rapport complet | `ai_intelligence_results.content_text` | Même run INTEL-030 | Lecteur tout-en-un | **L'objet lui-même** |
| — réglages de veille | `account_watch_settings` | Utilisateur | Centre de contrôle | Métadonnées seules |

---

## 3. Les quatre frontières à ne jamais franchir

### 3.1 — Le rapport ne recrée pas les enjeux
`account_issues` porte `evidence_level`, provenance, sources, importance, urgence, criticité,
impact business, accessibilité, `kredo_fit`, contacts, prochain probe. C'est une ligne **mutable
et curable** — exactement ce qu'un paragraphe de `content_json` ne sait pas être.

**L4 s'écrit donc en deux temps :**
```
INTEL-030  →  comprendre en profondeur
     ↓
INTEL-031  →  matérialiser les enjeux dans account_issues
     ↓
rapport    →  restituer ces enjeux + leur contexte rédactionnel
```
Le rapport **lit** `account_issues`. Il n'en produit pas une copie.

### 3.2 — Le rapport ne recopie pas le secteur
Une analyse de Tournaire ne stocke pas une histoire de quinze ans du secteur de l'emballage.
Elle **résout le segment**, lit `v_sector_knowledge_resolved` et `v_sector_knowledge_items`, et
**projette ce qui concerne le compte**.

Rappel de la règle sectorielle (Lot 0, migrations 069-071) : la connaissance d'un compte se lit
par `companies.segment_id`, jamais par `sector_id` ; la résolution segment→macro n'existe qu'en
SQL et ne se réimplémente pas en TypeScript ; **substitution** champ par champ pour les
scalaires et le `playbook`, **union** pour les items.

### 3.3 — Le rapport n'écrit pas le CRM
Aucune écriture directe d'attribut compte depuis un artefact d'analyse. Le sas reste
`enrichment_proposals`, et la classification passe par `apply_account_classification()`, qui
relit le contenu depuis `ai_intelligence_results` — **le client n'envoie jamais de valeur à
écrire**.

### 3.4 — Le rapport ne conclut pas commercialement
Une *fenêtre d'opportunité* qualifiée `inferred` ou `hypothesis` : oui.
Une offre, un message, un interlocuteur cible : non — INTEL-032.

---

## 4. Le double format, sans double génération

La demande « format base de données + format rapport » **ne nécessite aucune architecture
nouvelle**. `ai_intelligence_results` porte `content_json` et `content_text` depuis l'origine,
et le pipeline V4 remplit déjà les deux.

```
Sources (documents réellement récupérés)
      ↓
Statements qualifiés
      ↓
Narrative de section
      ↓
   ARTEFACT CANONIQUE UNIQUE
      ├── content_json  → application, modularité, réemploi
      └── content_text  → lecteur « rapport complet »
```

> **Un second workflow « Generate Report » qui relirait les résultats pour les réécrire avec un
> autre LLM est explicitement interdit.** Il introduirait une divergence permanente entre la
> base structurée et le rapport lu par le commercial.

Le rapport « tout d'un bloc » est donc un **composant de visualisation** de `content_text`,
enrichi des métadonnées de sources du même artefact. Rien de plus.

La publication dans `intelligence_documents` (99 lignes au 10/09/2026) reste **volontaire** :
elle sert quand l'utilisateur veut conserver, rattacher ou partager un rapport dans le Knowledge
Hub. Le mécanisme `save-as-document` existe déjà et sait lire `content_json` + `content_text`.
**Aucune matérialisation documentaire automatique** au premier lot.

---

## 5. Les trois surfaces de restitution

| Surface | Question unique | Ce qu'elle lit |
|---|---|---|
| **Connaissance de l'entreprise** | *Qui est ce compte et comment fonctionne-t-il ?* | F1, F2, F3, F6 — artefact + socle |
| **Connaissance du secteur** | *Dans quel jeu opère-t-il ?* | F4 — **projection Master Study**, delta compte |
| **Enjeux et fenêtres** | *Qu'est-ce qui le contraint, où est la porte ?* | F5 — `account_issues` + contexte rédactionnel |

Chaque surface affiche du **récit d'abord**, la mécanique à la demande. Les marqueurs
épistémiques (`Établi` · `Déclaré` · `Déduit` · `Hypothèse`) et l'action **Sources / Vérifier**
sont disponibles au niveau des statements significatifs, jamais imposés paragraphe par
paragraphe.

> **Contrôle à faire à chaque lot :** l'onglet Secteur et l'onglet Enjeux consomment-ils toujours
> leur propriétaire canonique, ou ont-ils commencé à lire une copie dans le JSON d'analyse ?
> C'est la régression la plus probable de ce chantier.
