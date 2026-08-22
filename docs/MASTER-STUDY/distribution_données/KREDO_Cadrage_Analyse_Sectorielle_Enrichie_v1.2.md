# KREDO — Cadrage : Enrichissement Business Intelligence (Accueil · Analyse sectorielle · Playbook)

**Statut** : Cadrage v1.2 — **checklist Lot 0 intégralement validée**, remplace la v1.1
**Identifiant catalogue** : à assigner par Dosta (proposition : famille INTEL, prolonge INTEL-011)
**Document source** : `04-secteur.md` (étude E4 — Compositions & ingrédients B2B, segment `seg-parfumerie-compositions-b2b`)
**Document lié** : `KREDO_Cadrage_Mode_Terrain_v1.0.md` (checklist encore ouverte, indépendante de celle-ci)

**Changements depuis la v1.1** :
1. Réutilisation des 8 comptes `parfumerie-aromes` pour le pilote — **confirmée**.
2. Format de stockage Cadre / Message sectoriel / Trajectoires — **clés `playbook`**, noms verrouillés ci-dessous.

---

## 1-5. Inchangé depuis la v1.1

Contexte, état des lieux, périmètre, hors périmètre, invariants : voir v1.1. Seuls les points ci-dessous évoluent.

## 6. Décisions techniques verrouillées pour le Lot 0

### 6.1 Réutilisation des comptes (confirmé)

Le tableau comparatif du segment pilote `seg-parfumerie-compositions-b2b` s'appuie sur les 8 comptes déjà qualifiés dans `competitive_map_entries` pour `parfumerie-aromes`. Le Lot 0 doit :
- soit rattacher ces lignes au `sector_id` du segment pilote (si la relation macro → segment le permet proprement),
- soit les lire par jointure sans les déplacer, en affichant la mention « comptes issus de l'étude sectorielle Parfumerie, Arômes & Cosmétique ».

Ce choix d'implémentation (rattachement vs jointure) reste à l'appréciation de Claude Code en Lot 0 — l'un ou l'autre respecte l'invariant Single Source of Truth, tant qu'aucune ligne n'est dupliquée.

### 6.2 Clés `playbook` pour Cadre / Message sectoriel / Trajectoires (verrouillé)

Pour rester cohérent avec les clés déjà en place (`market_thesis`, `risks`, `tech_fronts`, `economic_models`, `dependances_critiques`, `personas`, `objections`, `entry_points`, `roi_arguments`), les trois nouvelles clés proposées sont :

| Nouvelle clé `playbook` | Contenu | Forme attendue |
|---|---|---|
| `cadre` | Périmètre étudié, hors champ, règle de comparabilité | `{"perimetre": "", "hors_champ": [""], "regle_comparabilite": ""}` |
| `message_sectoriel` | La phrase de synthèse du secteur | Chaîne de caractères simple |
| `trajectoires` | Trajectoires et budgets à 18-36 mois | Tableau d'objets `{"trajectoire": "", "famille_budget": "", "offre_kredo": "", "src_ids": []}` — même forme que `risks`/`dependances_critiques` pour rester homogène |

Ce format est une proposition de structure conforme aux clés existantes ; Claude Code peut l'ajuster légèrement en Lot 0 si la réalité des données l'exige, tant que le principe (clé `playbook`, pas de nouvelle table ni colonne) est respecté.

Point non tranché par ce message et laissé à la main de Claude Code en Lot 0 : la séparation propre entre **blocs clients** et **modèles économiques**, aujourd'hui mélangés dans une seule clé `economic_models` avec deux formes d'objets différentes (voir v1.1 §2.1). Je recommande d'ajouter un champ `type: "bloc_client" | "modele_economique"` à chaque entrée plutôt que de scinder en deux clés, pour ne pas casser la compatibilité avec la donnée déjà injectée sur `seg-parfumerie-compositions-b2b`.

## 7. Checklist Lot 0 — état final

- [x] Répartition des sections — validée
- [x] Invariants — validés
- [x] Emplacement Cadre/Message/Trajectoires (onglet) — Accueil/Synthèse
- [x] Localisation tableau comparatif — `competitive_map_entries`
- [x] Priorité Lot 14 (repopulation) — dernier chantier
- [x] Mode Terrain — document séparé produit
- [x] Réutilisation des 8 comptes `parfumerie-aromes` — confirmée
- [x] Format de stockage Cadre/Message/Trajectoires — clés `playbook`, noms verrouillés (§6.2)

**Le cadrage desktop est maintenant complet.** Le Lot 0 peut être lancé dès ton feu vert.

## 8. Ce qui reste ouvert, séparément

La checklist du document `KREDO_Cadrage_Mode_Terrain_v1.0.md` (§8 de ce document) n'a pas encore de réponses de ta part — elle n'est pas bloquante pour lancer le Lot 0 du chantier desktop, puisque le Mode Terrain (Lot 13) dépend justement des Lots 0-12 pour avoir de la donnée à consommer.
