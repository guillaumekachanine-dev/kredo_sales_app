# E6 — Chaîne de valeur

> **Étape conditionnelle.** La chaîne de valeur n'est pas un livrable systématique : c'est un
> outil de découverte en rendez-vous, et il ne fonctionne que sur un secteur dont on a déjà
> l'étude concurrentielle et des comptes sur plusieurs maillons. Ailleurs, il produit un
> poster.

---

## 1. Axiomes

- **Règle anti-poster.** Pas de chaîne sans étude concurrentielle préalable (E5 livré). Un
  schéma à deux acteurs par maillon n'est pas une chaîne de valeur : c'est une décoration.
- **La règle anti-poster s'applique aussi au choix des secteurs**, pas seulement aux maillons.
  Deux à trois secteurs, pas quinze.
- **Le rendu est généré depuis les données, jamais dessiné.** Une ligne modifiée en base, une
  commande, et le schéma est à jour. Un schéma dessiné à la main diverge dès la première
  correction.
- **Aucun acteur hors portefeuille sans source.** La contrainte SQL l'interdit
  (`check (company_id is not null or source is not null)`) — 26 acteurs hors KREDO,
  26 sources, aucune exception sur le pilote.
- **`sector_id` désigne le SUJET de la chaîne, jamais l'appartenance de ses acteurs.** Un
  acteur positionné sur la chaîne BTP n'est pas reclassé en BTP. Ces tables n'écrivent **jamais**
  dans `companies`.
- **Ce n'est pas un support de présentation.** On ne le projette pas, on ne le commente pas.
  On le pose sur la table et on se tait.

---

## 2. Moyens employés

| | |
|---|---|
| **Opérateur** | Claude Opus (modélisation) + Guillaume (arbitrage des maillons et de la captation) |
| **Prompt** | `prompts/E6-chaine-de-valeur.md` |
| **Contexte injecté** | `04-secteur.json` §maillons · `05-comptes.json` · les comptes KREDO du macro et des macros voisins |
| **Rendu** | `docs/FEATURES/sector_intelligence/chaine-de-valeur/build.py` + générateur HTML autonome |
| **Durée** | 4 h par secteur, une fois E5 livré |

Le générateur **refuse de construire** si un acteur hors KREDO n'a pas de source, et affiche
la même alerte en rouge sous le schéma. C'est le seul contrôle qualité de ce corpus qui soit
implémenté dans l'outil de rendu.

---

## 3. Origine de l'information

| Information | Origine |
|---|---|
| Découpage en maillons | E4 §2.3 (tableau chaîne de valeur par maillon) |
| Acteurs hors portefeuille | E5 (les acteurs cartographiés) + sources du registre E3 |
| Acteurs KREDO | `companies` — **tous macros confondus**, c'est le point clé |
| Dépendances et intensités | E4 §2.5 (dépendances critiques) + presse professionnelle |
| Zones de captation de valeur | **Marges publiées, sourcées.** À défaut : raisonnement explicite + `confiance` faible |
| Couches transverses | prescripteur (régulateur, donneur d'ordre) · financeur · technologie |

**Le résultat le plus précieux du pilote BTP n'était pas le schéma** : c'est que **douze comptes
de la filière n'étaient pas dans le macro BTP**. Onze comptes déjà qualifiés, invisibles dans
toute lecture sectorielle. Le schéma les a rendus visibles — et ça, à soi seul, a rentabilisé
la demi-journée.

---

## 4. Méthode

### 4.1 Le modèle

```
value_chain_nodes    maillons (couche='chaine', maillon >= 1, rang 1..3)
                     + couches transverses (prescripteur | financeur | technologie)
value_chain_actors   comptes KREDO (company_id) ET acteurs hors portefeuille (company_id NULL + source)
value_chain_links    dépendances : fournit | prescrit | finance | outille, intensité 1..3
```

> **Articulation E4 / E6 (ADR-0021 §9.1 & MS-19)** : **E4 amorce** un nœud par maillon
> (`rang=1`, `capture_valeur` NULL) lors de l'ingestion canonique. **E6 approfondit** ensuite
> par modélisation et arbitrage humain : positionnement des acteurs (`value_chain_actors`),
> traçage des liens (`value_chain_links`), et complétion de `capture_valeur` /
> `capture_justification` par `UPDATE`.

### 4.2 Le déroulé

1. **Les maillons existent déjà, amorcés par l'import E4** ; ce lot les complète, il ne les
   recrée pas. Si un maillon n'a aucun acteur nommé à l'issue de l'analyse, il fusionne avec
   le voisin par arbitrage.
2. **Positionner les acteurs.** D'abord les comptes KREDO, **tous macros confondus** — c'est là
   que se produit la découverte. Puis les acteurs de E5. Puis les manquants sourcés.
3. **Tracer les dépendances** avec leur nature et leur intensité.
4. **Marquer la captation de valeur.** Une zone de captation exige une justification
   (`check (capture_valeur is null or capture_justification is not null)`). Adosser à une marge
   publiée quand elle existe ; sinon `confiance` faible, et le dire sur le schéma.
5. **Poser les trois couches transverses.** La couche prescripteur ne contient normalement
   aucun compte KREDO — on ne vend pas à un régulateur — **mais c'est la seule couche datée**,
   donc celle qui porte le motif d'appel de tous les maillons.
6. **Régénérer** : `python3 chaine-de-valeur/build.py <secteur>`.
7. **Déduire la liste de prospection** par couverture croissante des maillons. C'est le tableau
   sous le schéma, et c'est le second livrable de l'étape.

### 4.3 Les trois sections textuelles obligatoires

Le modèle de nœud doit porter, en plus de sa description : **maillons clés**, **dépendances
critiques**, **points de vulnérabilité**. Ce sont les trois entrées que l'onglet BI affiche à
côté du schéma, et sans lesquelles le schéma seul n'est pas lisible hors rendez-vous.

### 4.4 L'usage en rendez-vous

L'ouverture, mot pour mot :

> « Avant qu'on parle de nous, je voudrais vérifier que j'ai bien compris votre filière. Voilà
> comment je la vois. **Où est-ce que je me trompe ?** »

Trois choses comptent, aucune n'est décorative : *« avant qu'on parle de nous »* annonce que ce
n'est pas un pitch ; *« votre filière »* et non « le secteur » parle de son monde ; *« où
est-ce que je me trompe »* oblige à pointer du doigt, là où « qu'en pensez-vous » invite un
« c'est intéressant » poli.

**Celui qui parle en premier a perdu.** Le prospect corrige toujours, et ce qu'il corrige est
l'information qu'on est venu chercher. Ne défendre **aucune** case : une case défendue est un
rendez-vous perdu.

Les formulations complètes (relances, questions de captation, ce qu'il ne faut jamais dire,
remontée de filière) vivent dans
`docs/FEATURES/sector_intelligence/chaine-de-valeur/NOTE-EXPLOITATION.md` §2-§3, qui reste
lisible à ce titre. **C'est un actif commercial, pas de la documentation.**

---

## 5. Articulation logique

**Amont** : E5 **obligatoirement livré**. C'est la condition de la règle anti-poster.
**Aval** : onglet BI Chaîne de valeur, onglet Secteur du cockpit, et la liste de prospection
déduite.

**Condition de lancement** — les trois, cumulatives :
1. Une étude concurrentielle (E5) existe sur le secteur ;
2. KREDO a des comptes sur **au moins trois maillons** ;
3. Au moins une couche transverse porte une échéance datée.

**Cibles retenues après le pilote BTP** : **Parfumerie & Arômes** (meilleur corpus, un client,
chaîne courte compositions → emballage → marques) et **Santé** (corpus dense, régime
réglementaire fort). Les autres n'ont pas d'étude concurrentielle.

---

## 6. Contrôle qualité

| # | Contrôle | Où il est tenu |
|---|---|---|
| 1 | Aucun acteur hors KREDO sans source | Contrainte SQL + refus de `build.py` |
| 2 | Aucune zone de captation sans justification | Contrainte SQL |
| 3 | `confiance` NOT NULL sur tout nœud | Contrainte SQL |
| 4 | Régénérable sans doublon | Index uniques `(sector_id, maillon, rang)`, `(node_id, nom)`, `(node_amont, node_aval, nature)` |
| 5 | Pas de maillon théorique | **Contrôle humain après peuplement** — aucune contrainte SQL ne l'exprime |
| 6 | Lisible en moins de 30 secondes | Humain. *Tenu à moitié sur le pilote : la structure amont→aval se lit, la captation demande un aller-retour vers la légende* |
| 7 | **Un praticien du secteur le regarderait sans tiquer** | **G3. Irremplaçable, et non tenu à ce jour** |

**Le point faible connu, et c'est le cœur du sujet** : sur le pilote BTP, **une seule zone de
captation sur sept** est adossée à un chiffre sourcé. Les six autres sont des raisonnements
honnêtes mais non chiffrés — le schéma le dit, la confiance est affichée, mais **un directeur
financier du secteur verrait le trou en dix secondes**. Sourcer les marges est le premier
chantier de toute chaîne, avant l'industrialisation.

**Le pilote reste un prototype validé en interne tant qu'il n'a pas été montré à un compte
client du secteur.** C'est le seul test qui compte, et il est gratuit.

---

## 7. Destination et finalité

| | |
|---|---|
| **Tables** | `value_chain_nodes` · `value_chain_actors` · `value_chain_links` |
| **Écrans** | BI → **Chaîne de valeur** (`SectorEcosystemDesktop`, `SectorValueDesktop`, `SectorMapMobile`) · Cockpit → **Secteur** (A12) |
| **Export** | HTML autonome, A4 paysage (1180 × 789 = 198 mm de haut), imprimable et posable sur une table |
| **Lecteur** | Le commercial en rendez-vous, et le directeur commercial en revue de couverture |

**Trois usages, par valeur décroissante** :
1. **Outil de découverte en rendez-vous** — le prospect corrige, on apprend.
2. **Remontée de filière** — un client sur un maillon ouvre ses voisins.
   *« Nous travaillons avec X sur [sujet]. En regardant leur filière, votre nom est revenu comme
   un de leurs interlocuteurs directs. »* C'est vrai, vérifiable, et ça ne divulgue rien.
3. **Lecture de couverture** — quel maillon KREDO ne couvre pas, et ce qu'il faut y créer.

---

## 8. Livrables et formalisme

| Livrable | Forme | Emplacement |
|---|---|---|
| Modèle de chaîne | **`.json` validé** contre `schemas/value-chain.schema.json` | `registre/<run>/06-chaine.json` |
| Schéma publiable | HTML autonome, généré | `chaine-de-valeur/<secteur>/chaine-<secteur>.html` |
| Liste de prospection déduite | Tableau markdown, par couverture croissante | `registre/<run>/06-prospection.md` |

```json
{
  "meta": { "sector_slug": "", "level": "macro", "date_snapshot": "", "confiance_globale": "" },
  "noeuds": [{ "couche": "chaine|prescripteur|financeur|technologie",
               "maillon": 1, "rang": 1, "nom": "", "description": "",
               "maillons_cles": "", "dependances_critiques": "", "points_vulnerabilite": "",
               "capture_valeur": "forte|moyenne|faible|null",
               "capture_justification": "", "confiance": "haute|moyenne|faible" }],
  "acteurs": [{ "node_nom": "", "nom": "", "company_id": null, "source": "",
                "relation": "client|prospect|pair_partenaire|hors_portefeuille",
                "confiance": "" }],
  "liens": [{ "node_amont": "", "node_aval": "", "nature": "fournit|prescrit|finance|outille",
              "intensite": 1 }],
  "compteurs": { "noeuds": 0, "acteurs": 0, "acteurs_hors_kredo": 0,
                 "acteurs_hors_kredo_sources": 0, "liens": 0 }
}
```

`acteurs_hors_kredo == acteurs_hors_kredo_sources` est l'invariant que `build.py` vérifie et
que G1 rejoue.
