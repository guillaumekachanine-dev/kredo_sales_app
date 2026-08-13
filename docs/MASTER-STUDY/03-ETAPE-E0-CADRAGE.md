# E0 — Cadrage

> Trois décisions déterminent tout le reste. Prenez-les explicitement, ne les laissez pas à
> l'assistant. **Si vous ne savez pas dire en une phrase ce que vous ferez du livrable lundi
> matin, ne lancez pas l'étude.**

---

## 1. Axiomes

- **Le périmètre avant le chiffre** (A3). Un périmètre flou produit une longlist fausse, et
  une longlist fausse ne se rattrape à aucune étape ultérieure : un acteur oublié en E5 ne
  réapparaît jamais.
- **La maille d'écriture est le segment** (A4). E0 fige un `segment_id` existant. Créer un
  segment est une décision de taxonomie (E1), jamais un effet de bord d'une étude.
- **Le compte étalon est un instrument de calibrage, pas un sujet.** S'il est choisi parce
  qu'on le connaît déjà, sa fiche devient le test de vérité de toute la méthode.
- **L'objectif commercial oriente le bloc accessibilité**, donc le coût de l'étude. Il se
  déclare, il ne se devine pas.

---

## 2. Moyens employés

| | |
|---|---|
| **Opérateur** | Guillaume, seul. Aucun LLM |
| **Outil** | Ce document + une lecture Supabase (segment, comptes, corpus existant) |
| **Durée** | 20 à 30 minutes |
| **Budget recherche** | 0 à 2 requêtes, uniquement pour lever une ambiguïté de périmètre |

---

## 3. Origine de l'information

| Paramètre | Origine |
|---|---|
| `segment_id`, `segment_slug`, `macro_id` | `sector_intelligence` — **le slug est la seule clé fonctionnelle** |
| Comptes du segment, leur classification | `companies` (`segment_id`, 7 axes de la migration 068) |
| Corpus déjà disponible | `sector_regulatory_items`, `sector_pain_points`, `sector_events`, `account_facts`, `competitive_map_entries` |
| `OFFRE_KREDO` | **`offer_practices` (8) et `offers` (41) en base.** Jamais saisi à la main |
| Comptes exclus **des cibles de prospection** | `companies.relation_type` — clients, pairs-partenaires, comptes sous NDA. **Exclus du top 3, pas du périmètre d'étude** (voir §4.4) |
| Définition du marché, compte étalon, objectif | Guillaume |

> **Correctif E2 du diagnostic d'août** : un référentiel a décrit l'offre KREDO comme
> « Boutique d'ingénierie & conseil, Next.js, serverless, RAG, 700-1000 € de TJM ». C'est la
> stack de l'application KREDO, pas le catalogue de l'ESN. Toute la colonne « intérêt
> commercial ESN » du registre avait donc été notée contre le mauvais catalogue.
> **`OFFRE_KREDO` se lit en base, point.**

---

## 4. Méthode

### 4.1 Les trois décisions

**1. La définition du marché.** C'est le test d'inclusion de tous les acteurs. Elle répond à :
*quelle offre, pour quels clients, sur quelle géographie*, en deux phrases non ambiguës.

- ❌ « le BTP » — 400 000 entreprises, aucune segmentation utile.
- ✅ « la conception et la réalisation d'ouvrages d'infrastructure et de bâtiment de plus de
  50 M€, pour des maîtres d'ouvrage publics ou de grands comptes privés, en France. »

**2. Le compte étalon.** Un acteur déjà connu : un client, un ancien prospect, un compte avec
une référence. Il sert à calibrer — si sa fiche paraît juste, on peut faire confiance aux
autres ; si elle est fausse sur ce qu'on sait déjà, **on arrête l'étude et on corrige la
méthode.**

**3. L'objectif commercial.** Il oriente la profondeur du bloc accessibilité :

| Objectif | Ce qu'il privilégie |
|---|---|
| Ouverture de nouveaux comptes | Accessibilité et triggers |
| Réponse à appels d'offres | Référencement, canaux d'achat, panels |
| Extension sur comptes existants | Chantiers technologiques visibles, ESN en place |
| Recrutement d'un angle sectoriel | Message sectoriel, thèses, chaîne de valeur |

### 4.2 Le bloc de paramétrage

Il se remplit dans `prompts/E0-cadrage.md`, se sauve en JSON, et devient **l'en-tête de tous
les prompts suivants**. Aucune étape ne redéclare un paramètre.

### 4.3 Ce que « compte exclu » veut dire — et ce que ça ne veut pas dire

**Un compte client reste dans le périmètre d'étude et dans la cartographie.** Le positionner
face aux concurrents étudiés est l'une des lectures que la carte doit rendre possible : c'est un
actif commercial, et c'est aussi le seul moyen de savoir où l'on se situe réellement sur un
segment. Il compte donc dans le seuil des 3 comptes de G0.

Ce dont il est exclu, c'est de la **liste des cibles** — `transverse.comptes_prioritaires`. Et
cette exclusion dépend de l'objectif déclaré :

| `objectif_commercial` | Un client peut-il entrer dans le top 3 ? |
|---|---|
| `ouverture` | Non — l'objectif est d'ouvrir des comptes qu'on n'a pas |
| `appels_offres` | Non, sauf référencement à reconquérir |
| `extension` | **Oui** — c'est précisément la cible |
| `angle_sectoriel` | Sans objet, il n'y a pas de top 3 à produire |

*Amendement du 13/08/2026.* La règle antérieure excluait le compte du périmètre tout court, ce
qui produisait deux comptages incompatibles du même segment — 3 côté G0, 2 côté E0 — et faisait
tomber l'écart exactement sur le seuil.

### 4.4 Les quotas

Défaut : `leaders=3 · challengers=3 · mid_market=3 · outsiders_emergents=2 · outsiders_niche=3`.

Ce sont des **variables**, pas des lois. Si la réalité du marché les contredit — marché très
concentré ou très atomisé — on ajuste, on le dit, on justifie. **On ne complète jamais un
quota avec un acteur qui ne relève pas du segment.** Le compte étalon compte dans le quota de
sa catégorie.

---

## 5. Articulation logique

**Amont** : rien. E0 est le point d'entrée.
**Aval** : E1 (vérification de taxonomie) puis G0 (droit de lancer).

**Ce que E0 bloque s'il est bâclé** : tout. Un périmètre ambigu déplace la longlist, donc la
segmentation, donc le top 3, donc le message sectoriel. C'est la seule étape dont l'erreur ne
se rattrape pas.

---

## 6. Contrôle qualité

Cinq contrôles, tous exécutables en une minute :

| # | Contrôle | Rejet si |
|---|---|---|
| 1 | `segment_slug` existe dans `sector_intelligence` avec `level='segment'` | Le slug n'existe pas → passer par E1, pas créer à la volée |
| 2 | La définition du marché tient en 2 phrases et exclut explicitement quelque chose | Elle n'exclut rien : elle n'est pas un test d'inclusion |
| 3 | Le compte étalon est dans le portefeuille ou publiquement documenté | Ni l'un ni l'autre : pas de calibrage possible |
| 4 | `OFFRE_KREDO` est un extrait de `offer_practices` / `offers` | Saisi à la main → défaut E2 |
| 5 | L'objectif commercial est une des 4 valeurs | « tout » n'est pas un objectif |

---

## 7. Destination et finalité

| | |
|---|---|
| **Destination immédiate** | `registre/<AAAA-MM>-<segment-slug>/00-cadrage.json` |
| **Destination en base** | `ai_intelligence_runs.input_snapshot` à l'ingestion (E7) |
| **Lecteur** | Toutes les étapes suivantes, et la page de garde du livrable |
| **Décision qu'il porte** | Ce qui est dans le périmètre, et ce qui n'y est pas |

Le cadrage est **rejoué tel quel** à chaque mise à jour trimestrielle du secteur : c'est ce qui
rend deux runs comparables. Un cadrage modifié en cours de route invalide la comparaison — il
faut le dire et repartir d'un nouveau snapshot.

---

## 8. Livrables et formalisme

**Fichier** : `registre/<AAAA-MM>-<segment-slug>/00-cadrage.json`
**Schéma** : `schemas/cadrage.schema.json`

```json
{
  "version": "1.0",
  "date_snapshot": "2026-08-13",
  "segment": { "slug": "", "nom": "", "sector_intelligence_id": "", "macro_slug": "" },
  "definition_du_marche": "",
  "hors_champ": [""],
  "geographie": "France entière (métropole + DROM)",
  "compte_etalon": { "nom": "", "company_id": null, "motif_du_choix": "" },
  "quotas": { "leaders": 3, "challengers": 3, "mid_market": 3,
              "outsiders_emergents": 2, "outsiders_niche": 3 },
  "profondeur_historique_ans": 10,
  "exercice_de_reference": "dernier exercice clos publié",
  "objectif_commercial": "ouverture | appels_offres | extension | angle_sectoriel",
  "offre_kredo": { "practices": [""], "offers": [""], "lu_en_base_le": "2026-08-13" },
  "comptes_exclus": [{ "nom": "", "motif": "client | pair_partenaire | nda | conflit" }],
  "variante": "master | tier | compte_unique | trimestriel | chaine_de_valeur"
}
```

**Nommage du dossier d'étude** : `<AAAA-MM>-<segment-slug>`, ex. `2026-08-spatial-defense-systemes-critiques`.
Un dossier = un run = un snapshot. Un rejeu crée un nouveau dossier, jamais un écrasement.
