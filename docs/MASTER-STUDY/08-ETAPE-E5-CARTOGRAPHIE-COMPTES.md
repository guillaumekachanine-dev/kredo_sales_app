# E5 — Cartographie concurrentielle et comptes · la couche ATTAQUER

> Lecteur : le commercial, 90 secondes avant un appel. C'est la couche qui répond à Q1 (quel
> compte) et Q2 (par quelle porte). **C'est aussi celle qui a échoué deux fois de suite** —
> zéro modèle d'achat renseigné sur 14 comptes en BTP, puis zéro sur 10 en spatial. Ce
> document existe d'abord pour que ça n'arrive pas une troisième fois.

Péremption : **12 mois** pour la segmentation et les chiffres, **3 mois** pour les triggers.

---

## 1. Axiomes

- **Plancher de preuve** (A7). Aucun compte n'est scoré, classé ni priorisé sans entité
  juridique France, ordre de grandeur de taille sur périmètre déclaré, un trigger daté, et
  deux sources indépendantes dont une T1/T2. En dessous : **réserve à qualifier**.
- **Le score fait autorité partout** (A6). Le top 3 de la synthèse **est** le top 3 du tableau.
  Tout écart se justifie en une ligne, ou il est interdit.
- **La couche accessibilité n'est jamais « non vérifié »** sur un compte prioritaire. Une
  hypothèse qualifiée et marquée comme telle est acceptée ; « non vérifié » ne l'est pas.
- **Aucune inférence non marquée** (A11). « Besoins SI probables » est banni : on écrit
  « chantiers observés », adossés à une preuve.
- **L'unité de fiche est l'unité de décision d'achat**, pas la personne morale. Un groupe
  portant deux entités avec des DSI et des circuits d'achat distincts donne **deux fiches**, et
  compte pour deux dans les quotas.
- **Les champs du régime déterministe sont reçus, jamais produits** (A1).

---

## 2. Moyens employés

| | |
|---|---|
| **Opérateur** | **Claude Opus, dans un Projet contenant ce corpus** — la tâche est de respecter un schéma et de refuser d'inventer, pas de découvrir |
| **Prompt** | `prompts/E5-cartographie-comptes.md` |
| **Contexte injecté** | `00-cadrage.json` · `02-socle.json` · `03-sources.json` · **`04-secteur.json`** |
| **Humain** | Guillaume : **30 à 45 min par compte prioritaire** sur la couche accessibilité. Trois comptes = une demi-journée |
| **Budget recherche** | 3 à 6 requêtes par compte, jamais en parallèle |
| **Durée** | 3 à 4 h de production + 0,5 j humain |

**Le traitement compte par compte est une contrainte, pas un conseil.** Traités en parallèle,
les comptes produisent des fiches interchangeables où seuls les noms changent — c'est
observable et c'est irrécupérable.

---

## 3. Origine de l'information

Cinq requêtes par compte, dans cet ordre. La quatrième est **la plus rentable de toute la
méthode**.

| # | Requête | Alimente |
|---|---|---|
| 1 | Identité — **reçue de E2**, non recherchée | B1 |
| 2 | Publications de l'entreprise : résultats, plan stratégique, rapport annuel | B2, B3-1, B3-6 |
| 3 | Presse professionnelle, 12 derniers mois | B2 (contrats), B3-3, B4 (triggers) |
| 4 | **Offres d'emploi et technologies** | B4 (chantiers observés) |
| 5 | « intelligence artificielle » + nom de l'acteur | B3-4 (écart annoncé/déployé) |
| 6 | *(optionnelle)* levée de doute sur un point contradictoire | — |

**Pourquoi la 4** : les offres publiées révèlent la feuille de route **réelle**, à la différence
des communiqués qui révèlent la feuille de route **souhaitée**. C'est la source qui a révélé
une équipe Data & IA d'une vingtaine de personnes en recrutement chez un grand constructeur,
qu'aucune autre source ne mentionnait. Quand E2 est branché sur France Travail, cette requête
devient un comptage et cesse d'être une recherche.

**Où chercher la couche accessibilité** — la rubrique la plus utile et la plus souvent laissée
vide, alors que l'information est publique :

| Sous-bloc | Où |
|---|---|
| Panel, référencement, canal d'achat | Page « devenir fournisseur » / « espace fournisseurs », conditions générales d'achat, charte achats responsables, rapport de durabilité (chapitre achats et chaîne de valeur), avis de marché |
| Habilitation, nationalité, zone protégée | Documentation publique des donneurs d'ordre, exigences des marchés |
| ESN déjà en place | Offres d'emploi citant la co-traitance, références publiées par les concurrents, `interactions` du CRM |
| Décideur SI | CRM interne d'abord, puis fonctions publiques uniquement (mandataires, communiqués de nomination) |

Le défaut historique n'était pas que l'information manquait : **le prompt ne disait pas où
chercher.**

---

## 4. Méthode

### 4.1 Longlist puis segmentation

**Longlist : 25 à 40 acteurs**, croisant au minimum quatre familles de sources indépendantes
(classements de la presse professionnelle · fédérations et annuaires d'adhérents · registres
d'entreprises · attributions de marchés et communiqués). Un acteur qui n'apparaît que dans une
seule famille est vérifié spécifiquement : c'est souvent un doublon ou un homonyme.

**Règle d'inclusion des acteurs étrangers** — trois marqueurs, deux suffisent : entité
juridique française avec identifiant national · effectif France substantiel au regard du
segment · **autonomie de décision ou d'achat en France**. Le troisième est le plus important :
*un site piloté intégralement depuis l'étranger n'achète pas de prestation locale.*

**Table de décision**, appliquée littéralement, dans l'ordre :

| Catégorie | Part relative au leader | Critère complémentaire |
|---|---|---|
| `leader` | ≥ 0,6 | Couverture large de la chaîne, capacité à porter les projets les plus complexes |
| `challenger` | 0,2 – 0,6 | Ambition explicite de croissance ou de rattrapage |
| `mid_market` | 0,05 – 0,2 | Positionnement solide, souvent régional ou partiel |
| `outsider_emergent` | < 0,05 | **et** croissance ≥ 15 %/an sur 3 ans, ou levée, ou entrée récente crédible |
| `outsider_niche` | < 0,05 | Trajectoire stable et assumée, mono-segment ou technique |

**Quand la part relative n'est pas calculable** — cas fréquent, à traiter et non à contourner.
Les groupes cotés multi-branches ne publient presque jamais le CA d'une branche sur un seul
pays. On bascule sur le **critère de substitution**, dans cet ordre : (a) présence sur les
groupements, consortiums et attributions majeurs — c'est un fait observable, et le marché s'y
désigne lui-même ses premiers rôles ; (b) capacité démontrée à porter les projets les plus
complexes ; (c) CA de branche monde, **ordinal seulement**.

On écrit noir sur blanc que la part relative n'était pas calculable et quel critère l'a
remplacée. *Une segmentation dont la règle est dite reste reproductible ; une segmentation dont
la règle est cachée ne l'est pas.*

### 4.2 La fiche compte — cinq blocs

```
B1  IDENTITÉ ET CADRE                    ← REÇU DE E2, non recherché
      raison sociale · SIREN · groupe · NAF · IDCC · statut · effectif France · sites
      régime réglementaire sectoriel créant de la demande SI

B2  MÉTIER ET CHAÎNE DE VALEUR
      métier sur le segment · fournisseurs amont → valeur propre → clients
      autres métiers du groupe : cités, non analysés
      1 à 2 contrats d'envergure, datés, sourcés, montant si publié
      « non trouvé » + recherche effectuée si rien — jamais un nom de projet inventé

B3  LES SIX GRILLES
      1 financière — CA du périmètre, évolution 3 ans, rentabilité si publiée
      2 empreinte métier — part de la chaîne réellement couverte, note 1-5
      3 réputation — faits observables uniquement, qualifiée forte/correcte/fragilisée
      4 innovation et R&D
        ⚠ sous-rubrique OBLIGATOIRE : IA — ANNONCÉ vs DÉPLOYÉ, et l'écart
      5 avantages concurrentiels + une ligne « vulnérabilité principale »
      6 trajectoire et ambitions affichées

B4  ► COUCHE ESN — obligatoire, jamais « non vérifié » sur un compte prioritaire
      organisation SI et décideur (fonction publique + date de prise de poste)
      modèle d'achat : panel, référencement, canal, achats responsables, délais
      ★ conditions d'accès sectorielles : habilitation, nationalité, zone protégée
      ESN déjà en place                                            → C6
      chantiers technologiques OBSERVÉS (offres d'emploi, communiqués, marchés)
      triggers 12 mois, datés au mois, sourcés
      appétence 1/3/5 → /35, et accessibilité isolée comme axe propre
      → conclut par : « voie d'entrée la plus probable pour une ESN », en une phrase

B5  TRADUCTION COMMERCIALE
      angle d'entrée en une phrase, adossé à une preuve des blocs 1-4
      deux accroches formulées telles qu'on peut les dire au téléphone
      ce qu'il ne faut PAS dire à ce compte
      niveau de confiance de la fiche + trous assumés
```

**La grille B3-4 « IA : annoncé vs déployé » n'a le droit d'être vide sur aucun compte.** C'est
la grille qui distingue une ESN d'un fournisseur : elle mesure l'écart entre le discours et la
production, donc le besoin. Dans les deux études auditées, c'était la seule case vide — et la
plus différenciante.

### 4.3 L'appétence et l'accessibilité

```
total = capacite_a_payer + intensite_it + 2 × moment + 2 × accessibilite + fit_offre
```

Notes **1 / 3 / 5 uniquement**. Total sur **35**. `moment` et `accessibilite` comptent double :
ce sont les deux critères qui déterminent si un compte est attaquable **ce trimestre ou dans
deux ans**.

⚠️ **L'erreur à ne pas commettre** : `5 + 5 + 3 + 2 + 4 = 19` est un /25 déguisé.
Le calcul juste est `5 + 5 + (2×3) + (2×2) + 4 = 24`. L'import KREDO recalcule le canonique
depuis les cinq composantes et émet un avertissement en cas de divergence — mais un livrable
qui somme naïvement est un livrable défectueux.

`accessibilite` est également extraite **comme axe propre** : c'est l'ordonnée de la carte de
priorisation (C2b). **Jamais de valeur de remplacement quand elle manque** — l'acteur reste
« non positionné ». Attribuer 5/5 à un compte dont on ne sait rien, au motif qu'une petite
structure est plus abordable, est exactement le défaut qui a fait entrer le compte le moins
bien noté d'une carte en n°2 de son top 3.

### 4.4 La sortie ordonnée

| Section | Contenu | Bloc |
|---|---|---|
| 3.1 | Segmentation : comment les catégories ont été tranchées | C1 |
| 3.2 | **Carte de priorisation** : X = appétence /35, Y = accessibilité, taille = CA | C2b |
| 3.3 | Tableau comparatif — colonnes identité **renseignées** | C4 |
| 3.4 | Fiches compte × N (5 blocs) | C3 · A4 A5 A6 |
| 3.5 | **Battle card** 1 page pour les comptes prioritaires | dérivé |
| 3.6 | **Réserve à qualifier** — comptes sous plancher de preuve | C3 |
| 3.7 | Acteurs écartés et motif | C5 |
| 3.8 | Top 3 à attaquer · 3 à écarter · message sectoriel | C2b |

**La section « acteurs écartés » se conserve telle quelle.** Une section qui dit où ne pas
dépenser d'effort vaut une section qui dit où en dépenser. Le bon motif d'exclusion est
l'absence d'autonomie d'achat France — pas la taille.

La matrice empreinte × maturité (C2) est conservée comme **lecture de positionnement**, mais
ce n'est pas elle qui décide : c'est C2b, la carte appétence × accessibilité, celle qui sert en
revue de pipeline.

---

## 5. Articulation logique

**Amont** : E4 (même run, même contexte, même registre de sources) et E2 (identité).
**Aval** : E7 (ingestion), puis toute la surface Environnement concurrentiel.

**Ce que E5 débloque** : Q1 et Q2, donc le seul chemin vers un plan d'attaque. Sans E5, on a
une étude de marché.

**Ce qui bloque E5** : l'absence de E2. Une cartographie sans identité France produit des
fiches non importables, non dédoublonnables, et un top 3 sous plancher de preuve. C'est
mécanique, pas conjoncturel.

---

## 6. Contrôle qualité

**Test d'acceptation du livrable** — dix critères, tous bloquants :

1. Le top 3 de la synthèse **est** le top 3 du tableau, ou l'écart est justifié en une ligne.
2. Aucun compte du top 3 n'a de champ identité `null`.
3. La couche B4 est renseignée pour **100 % des comptes prioritaires**. Hypothèse qualifiée
   acceptée, « non vérifié » refusé.
4. Au moins une échéance réglementaire commune, datée, vérifiée sur source officielle et
   prononçable telle quelle *(reçue de E2)*.
5. Chaque compte prioritaire porte au moins un trigger daté au mois, sourcé, des 12 derniers
   mois.
6. Chaque grille B3-4 (IA annoncé/déployé) est renseignée.
7. Chaque chiffre porte un numéro de source résolvable en URL.
8. Le journal de recherche existe et liste les requêtes réellement jouées.
9. Les comptes sous plancher de preuve sont en réserve, pas dans la carte.
10. La page de garde porte les dates de péremption calculées (triggers 3 mois · financier
    12 mois).

**Métrique affichée, pas cochée** (A10) :
`taux de renseignement de la couche ESN = comptes prioritaires complets / comptes prioritaires`.
Sur les deux études auditées : **0/3**. Cible : 3/3.

---

## 7. Destination et finalité

```
05-comptes.json
  └─► CompetitiveMapImportWizard (bac d'arbitrage — PAS de workflow n8n, écarté par ADR-0019)
       ├─ résolution d'entité : resolved | ambiguous | not_found
       ├─ companies              : création depth_level='mapped', origin='competitive_map'
       ├─ competitive_map_entries: catégorie, scores, profile_json (le narratif)
       └─ account_facts          : les chiffres sourcés (CA, effectif) — jamais dans profile_json
```

| Bloc | Table | Écran |
|---|---|---|
| C1 C2 C2b C3 C4 C5 | `competitive_map_entries` | BI → **Environnement concurrentiel** |
| C6 · A6 | `account_facts` (`incumbent_esn`, `access_channel`, `supplier_panel`, `clearance_required`, `it_decision_owner`, `outsourcing_policy`) | Cockpit → **Entreprise** · Prospection → **Brief** |
| A4 A5 | `account_facts` | Cockpit → **Entreprise** |
| Chiffres | `account_facts` avec `primary_source_id` | Cockpit → **Socle** et **Entreprise** |
| A12 | `competitive_map_entries` + `value_chain_actors` | Cockpit → **Secteur** |

**Règle D-3 (ADR-0019), à appliquer à chaque nouveau consommateur de `companies`** : un compte
`mapped` n'entre ni dans les statistiques, ni dans les combobox, ni ne porte de contact.

**Finalité** : que le commercial sache quel compte appeler ce matin, pourquoi celui-là, à qui
parler, et si KREDO a le droit d'intervenir.

---

## 8. Livrables et formalisme

| Livrable | Forme | Emplacement |
|---|---|---|
| Cartographie et fiches | **`.json` validé** contre `schemas/competitive-map.schema.json` | `registre/<run>/05-comptes.json` |
| Rapport de lecture | Markdown généré depuis le JSON | `registre/<run>/05-comptes.md` |
| Battle cards | Markdown, 1 page par compte prioritaire | `registre/<run>/05-battlecards.md` |
| Journal de recherche | Markdown horodaté | `registre/<run>/05-journal.md` |

> ✅ **Roadmap A4 — corrigé le 13/08/2026** (commit `149d3e98`). Le parseur lit désormais les six
> clés de `profil_compte` qui portent la valeur commerciale : `couche_esn`, `grilles`,
> `traduction_commerciale`, `metier_chaine_valeur`, `contrats_majeurs`, `maillon`. **La couche ESN
> peut donc être produite et importée** — elle ne l'était pas avant cette date, et les dix
> `competitive_map_entries` du Spatial, qui pèsent 40 à 73 octets, en gardent la trace.
>
> **Le contrat normatif de ce livrable est le code**, pas le schéma :
> `src/features/competitive-map/domain/competitive-map-output.ts`. Il tolère déjà les écarts
> réels observés (catégories à tirets, dates `JJ/MM/AAAA`, demi-points sur les notes,
> `confiance: elevee` legacy, `identifiant_national` absent). En cas de divergence entre le
> schéma JSON de ce corpus et ce module, **le module gagne et le schéma est corrigé**.

Champs obligatoires par compte : `nom` · `categorie` · `justification_categorie` ·
`perimetre_ca` · `empreinte_metier` · `maturite_numerique` · `appetence` (5 composantes) ·
`accessibilite` · `angle_entree` · `confiance` · `trigger_events[]` · `sources[]` ·
`profil_compte` (B2-B5) · `trous[]`.

Champs **interdits au modèle** (reçus de E2, en lecture seule) : `identifiant_national`,
`code_activite`, `convention_collective`, `effectif_france`, dates réglementaires officielles.
