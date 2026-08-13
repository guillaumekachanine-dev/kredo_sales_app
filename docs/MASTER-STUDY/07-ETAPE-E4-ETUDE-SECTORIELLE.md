# E4 — Étude sectorielle · la couche COMPRENDRE

> Le produit de cette étape est **de la légitimité métier**. Une ESN qui arrive en disant
> « nous faisons du cloud et de l'IA » est interchangeable. Une ESN qui arrive en disant
> « votre concurrent direct a industrialisé le suivi de chantier par photogrammétrie l'an
> dernier, et vos appels d'offres publics intègrent désormais un critère BIM » est un
> interlocuteur.

Lecteur : directeur commercial, business developer en préparation. Temps de lecture : 8 à 10
pages, lues une fois. Péremption : **24 mois** pour l'économie, **12 mois** pour les chiffres.

---

## 1. Axiomes

- **E4 ne renseigne aucun champ du régime déterministe** (A1). Le prompt l'interdit
  explicitement : SIREN, NAF, IDCC, effectif par établissement, dates réglementaires
  officielles sont **reçus** de E2, jamais produits ici.
- **Chaque bloc se termine par un « DONC, commercialement »** (A12), d'une à trois lignes.
  Sans « donc », le bloc ne passe pas la relecture et n'entre pas dans le livrable.
- **Les quatre conversions sont obligatoires** (`00-DOCTRINE.md` §3). Un tableau livré sans sa
  colonne de conversion est incomplet, pas « allégé ».
- **Le périmètre avant le chiffre** (A3). Interdiction absolue d'un CA groupe pour caractériser
  une branche. « Non publié » est une réponse attendue.
- **Écriture au niveau segment** (A4). Le macro ne reçoit que ce qui est authentiquement
  transversal à sa famille.
- **Un statut politique n'est pas un statut acquis.** Une proposition législative se déclare
  comme telle. C'est exactement le type de nuance qui fait la différence face à un DSI — et
  l'une des rares choses qu'une étude antérieure a parfaitement tenue.

---

## 2. Moyens employés

| | |
|---|---|
| **Opérateur** | **ChatGPT Deep Research** (meilleur rapport preuve/effort observé : 90 sources numérotées avec URL, hiérarchie officiel → primaire → sectoriel respectée) |
| **Alternative** | Claude Opus en Projet, si le corpus E3 est déjà complet et que la tâche est de synthétiser plutôt que de découvrir |
| **Prompt** | `prompts/E4-etude-sectorielle.md` |
| **Contexte injecté** | `00-cadrage.json` · `02-socle.json` · `03-sources.json` — les trois, systématiquement |
| **Budget recherche** | 25 à 40 requêtes, dont **15 % réservés à la vérification et non consommables en production** |
| **Durée** | 2 à 4 h |

Le budget de vérification est une réserve, pas une intention : sans quota séparé, la
vérification est toujours la première étape sacrifiée.

---

## 3. Origine de l'information

| Bloc | Origine | Tier attendu |
|---|---|---|
| Économie du secteur, financement, blocs clients | Statistiques publiques, fédérations, observatoires | T1/T3 |
| Modèles économiques | Publications d'entreprises, rapports annuels, appels d'offres | T2/T3 |
| Chaîne de valeur, maillons | Fédérations, presse professionnelle, publications d'acteurs | T3 |
| Fronts technologiques | Publications d'acteurs, conférences, organismes normatifs | T2/T3 |
| Dépendances de supply chain | Rapports de durabilité, analyses sectorielles, presse pro | T3 |
| **Régulation** | **Reçue de E2** — Légifrance, EUR-Lex, autorités | T1, jamais reconstitué |
| Chronologie des ruptures | Presse économique établie, communiqués | T2/T3 |
| Risques et opportunités | Synthèse argumentée du produit ci-dessus | dérivé, marqué comme tel |

---

## 4. Méthode

### 4.1 La structure du livrable — deux couches, deux temps de lecture

```
COUCHE 0 — CADRE                                    (0,5 p · gouvernance · lu une fois)
  0.1  Page de garde, estampillage, dates de péremption calculées
  0.2  Déclaration d'accès aux sources et plafond de confiance
  0.3  Périmètre, règle de comparabilité, ce qui est hors champ

COUCHE 1 — DÉCIDER                                  (2 p · directeur commercial · 5 min)
  1.1  Le marché en 5 thèses                                       → S13 market_thesis
  1.2  ► CALENDRIER SECTORIEL DATÉ — 1 à 3 échéances vérifiées     → S7  (reçu de E2)
  1.3  Le message sectoriel à porter, en une phrase                → S13
  1.4  Les 3 incertitudes de l'étude

COUCHE 2 — COMPRENDRE                     (8-10 p · réservoir de crédibilité · lu une fois)
  2.1  Économie du secteur : qui finance, qui décide, blocs clients      → S2
  2.2  ► MODÈLES ÉCONOMIQUES × N                                        → S3
         + colonne « ce que ce modèle implique pour l'achat de prestation »
  2.3  ► CHAÎNE DE VALEUR PAR MAILLON                                   → S8 (amorce de E6)
         + colonne « maillon où l'ESN se branche, et qui y est déjà »
  2.4  Fronts technologiques et zones de transition                     → S4
  2.5  Dépendances critiques de supply chain → services achetables      → S3/S8
  2.6  Régulation en couches → convertie en échéances datées            → S7
  2.7  Chronologie des ruptures, 8 ans                                  → S5
  2.8  Risques × opportunités                                           → S6
  2.9  Pain points sectoriels, avec fréquence comptée                   → S9
  2.10 Personas, objections, arguments ROI, fit practices               → S10-S12

ANNEXES
  A. Registre de sources numérotées (n° · fait attesté · éditeur · tier · URL · date)
  B. Journal de recherche horodaté — requêtes réellement jouées
  C. Trous déclarés, par rubrique
```

> Le top 3 des comptes, la segmentation, la matrice et les fiches **ne sont pas ici** : ils
> sont en E5. E4 et E5 s'exécutent dans le même run (A8) mais produisent deux fichiers.

### 4.2 Les quatre conversions, en détail

Elles ne sont pas des sections supplémentaires : ce sont des **colonnes obligatoires** des
tableaux 2.2, 2.3, 2.5 et de la section options stratégiques.

**① Modèles économiques → calendrier d'achat.** Un contrat NRE institutionnel, une concession
PPP à 12 ans et une vente de capacité n'ouvrent ni le même interlocuteur, ni le même type de
prestation, ni le même moment. Savoir *comment le compte gagne de l'argent* dit quel budget
existe, quand il est engagé, et qui le signe. C'est de la matière Q2 pure, et c'est le bloc le
plus sous-estimé des études produites jusqu'ici.

**② Chaîne de valeur → angle différencié + concurrence ESN.** Les concurrents d'un acteur
changent selon le maillon. Savoir à quel maillon on se branche et **qui y est déjà** fournit
l'argumentaire différencié et amorce le bloc C6.

**③ Dépendances → catalogue d'offres adossé à un risque nommé.** Chaque dépendance critique
désigne un service achetable — qualification, second sourcing, cyber-SBOM, traçabilité. La
conversion se fait contre les **8 practices et 41 offres réelles** de la base.

**④ Options stratégiques du secteur → carte des budgets à 18-36 mois.** C'est le seul usage
légitime, pour une ESN, d'un bloc de conseil écrit du point de vue du compte étalon. Retournées,
cinq options de trajectoire désignent cinq familles de budget, chacune adossée à une offre du
catalogue. **C'est ce mapping qui transforme la cartographie en pipeline.**

### 4.3 Les règles de comparabilité

- Un CA de branche non publié s'écrit « non publié ». Jamais reconstitué par règle de trois.
- Ratio CA/effectif calculé et comparé à la médiane du panel ; tout écart supérieur à un
  facteur 2 est expliqué ou signalé. *(Un compte du portefeuille affiche 70 salariés pour
  270 M€ — soit 3,86 M€ par salarié dans l'emballage industriel. Les deux valeurs sont
  probablement inversées ou d'un autre périmètre. Ce contrôle l'attrape.)*
- Un groupe multi-métiers : seule la branche concernée est retenue, nommée, et les autres sont
  citées sans être analysées.
- Une fréquence est un **comptage**, pas une impression. « 5 comptes » signifie qu'on a listé
  les 5, et leurs UUID vont dans `source_company_ids`.

### 4.4 L'accès aux sources — trois états, déclarés en préambule

| État | Ce qui est autorisé |
|---|---|
| **COMPLET** — recherche + ouverture des pages et PDF | Étude normale |
| **RECHERCHE SEULE** — recherche possible, ouverture des sources primaires bloquée | Production autorisée **mais** : aucune donnée étiquetable T1, confiance globale plafonnée à MOYENNE, avertissement en tête de livrable |
| **AUCUN** | **Arrêt.** Aucune cartographie produite. On rend la liste des recherches à effectuer |

C'est une garde volontaire : un LLM sans accès web produit une étude de mémoire — des noms
vrais, des chiffres approximatifs, des contrats plausibles mais inventés. **C'est le mode
d'échec le plus dangereux, parce que le résultat a l'air excellent.**

---

## 5. Articulation logique

**Amont** : E0, E1, E2, E3. Les quatre, sans exception — E4 ne démarre pas sur une page blanche.
**Aval** : E5 (dans le même run), E6 (conditionnel), E7.

```
E2 ──► échéances datées, identité       ─┐
E3 ──► registre de sources qualifié     ─┼──► E4 ──► E5 (même contexte, autre fichier)
E1 ──► segment + corpus déjà en base    ─┘         └──► E6 si le secteur y a droit
```

**Ce que E4 débloque** : Q3 (crédibilité en trois minutes) et la moitié de Q4. C'est la couche
qui rend un commercial non interchangeable.

**Ce que E4 ne peut pas produire** : Q1 et Q2. Un livrable qui culmine sur des recommandations
*au compte étalon* — et non sur une cible pour l'ESN — ne donne ni ordre d'attaque, ni
interlocuteur, ni accroche. C'est un défaut de destinataire, pas de contenu, et il est
structurellement corrigé par E5.

---

## 6. Contrôle qualité

Exécuté en fin d'étape, avant E5, et **affiché** dans le livrable.

| # | Contrôle | Bloquant |
|---|---|---|
| 1 | Chaque chiffre porte millésime, périmètre et numéro de source résolvable en URL | Oui |
| 2 | Aucun chiffre de groupe utilisé pour caractériser une branche | Oui |
| 3 | Toute donnée fondant une décision est corroborée par 2 sources indépendantes, sinon marquée `single_source` | Oui |
| 4 | Ratio CA/effectif calculé et comparé à la médiane | Oui |
| 5 | Aucune date d'échéance non confirmée sur source officielle | Oui |
| 6 | **Chaque bloc de la couche 2 porte son « DONC, commercialement »** | Oui |
| 7 | **Les 4 conversions sont présentes en colonnes** | Oui |
| 8 | Les trous sont visibles et assumés, pas comblés | Oui |
| 9 | Le journal de recherche liste les requêtes réellement jouées, ≥ 25 | Oui |
| 10 | Aucun champ du régime déterministe rempli par le modèle | Oui |

Les contrôles 1 à 5, 9 et 10 sont **automatisables** et relèvent de G1. Les contrôles 6, 7, 8
relèvent de G2.

---

## 7. Destination et finalité

| Section | Bloc | Table cible |
|---|---|---|
| 1.1 · 1.3 | S13 | `sector_intelligence.playbook.market_thesis` · `.entry_points` |
| 1.2 · 2.6 | S7 | `sector_regulatory_items` (**mise à jour du commercial_angle**, pas des dates) |
| 0.3 | S1 | `sector_intelligence.description` · `caveats` |
| 2.1 | S2 | `market_size_eur_bn`, `market_growth_pct` |
| 2.2 · 2.5 | S3 | `playbook.economic_models` |
| 2.3 | S8 | amorce `value_chain_*` (E6) |
| 2.4 | S4 | `playbook.tech_fronts` |
| 2.7 | S5 | `sector_events` |
| 2.8 | S6 | `playbook.risks` |
| 2.9 | S9 | `sector_pain_points` (avec `source_company_ids`) |
| 2.10 | S10-S12 | `playbook.personas` · `.objections` · `.roi_arguments` · `practices_fit` |
| Annexe A | S14 | `intelligence_sources` + liens |
| Document entier | — | `intelligence_documents` type `master_study`, `primary_entity_type='sector'` |

**Écrans servis** : BI → Étude sectorielle (principal) · BI → Calendrier · Prospection →
Playbook et Fenêtres · Cockpit → Secteur et Stratégie.

### Correspondance des vocabulaires de practices & offres (Action A6)

Le catalogue KREDO s'appuie sur **8 practices** et **41 offres granulaires** (tables
`offer_practices` et `offers` dans Supabase). Trois vocabulaires coexistent et **un seul
slug leur est commun** (`cybersecurity`) — les confondre produit des jointures vides
silencieuses :

| `kredo_practice` (tables `sector_*`) | `offer_practices.slug` (**base, autorité**) | `PracticeSlug` (front, affichage) | Offres |
|---|---|---|---|
| `data_ai` | `data-ai` | `data-ia` | 5 |
| `cloud_eng` | `cloud-engineering` | `digital-cloud` | 5 |
| `cyber` | `cybersecurity` | `cybersecurity` | 5 |
| `testing` | `quality-engineering-testing` | `qa-testing` | 5 |
| `product` | `project-agile-delivery` | `agile-pm` | 5 |
| `design` | `digital-experience` | `ux-ui-design` | 5 |
| `apps` | `digital-business-solutions` | `custom-apps` | 6 |
| `legacy` | `legacy-systems-mainframe` | `legacy-mainframe` | 5 |

> ⚠️ **La colonne du milieu est la seule qui joint.** `offers`, `offer_pricing_grids` et
> toute requête SQL passent par `offer_practices.slug`. `PracticeSlug` ne sert qu'à
> l'affichage (couleurs, images, badges) et n'a aucune existence en base. Une première
> version de cette table, livrée le 13/08, présentait la colonne de droite comme étant
> `offer_practices.slug` : sept correspondances sur huit ne joignaient donc rien.
>
> Valeurs de `kredo_practice` réellement présentes en base au 13/08 : `data_ai`,
> `cloud_eng`, `cyber`, `product`, `multi`. Les quatre autres sont prévues par le contrat
> mais sans occurrence. `multi` ne se mappe sur aucune practice.

Les 41 offres granulaires (`generative-ai-rag-automation`, `soc-detection-incident-response`,
`cloud-migration-application-modernization`, `test-automation-continuous-quality`…) sont
indexées dans `src/lib/config/practices.ts` (`KREDO_OFFERS_CATALOG`), chacune rattachée à un
slug **base**. Le pont entre vocabulaires est explicite et testé :
`PRACTICE_SLUG_TO_OFFER_PRACTICE`, `mapKredoPracticeToOfferPractice()`,
`mapOfferPracticeToKredoPractice()`. Il n'existe **pas** de fonction SQL équivalente : la
migration `077_practice_mapping_function.sql` a été retirée sans jamais être appliquée,
ses deux fonctions renvoyant des slugs inexistants.

**Finalité** : que le commercial tienne trois minutes de conversation métier sans être
interchangeable, et qu'il sache pourquoi il appelle maintenant.

---

## 8. Livrables et formalisme

| Livrable | Forme | Emplacement |
|---|---|---|
| Connaissance sectorielle structurée | **`.json` validé** contre `schemas/sector-knowledge.schema.json` | `registre/<run>/04-secteur.json` |
| Rapport de lecture | Markdown **généré depuis le JSON** (A9) | `registre/<run>/04-secteur.md` |
| Journal de recherche | Markdown horodaté | `registre/<run>/04-journal.md` |

Squelette du JSON (détail dans le schéma) :

```json
{
  "meta": { "segment_slug": "", "date_snapshot": "", "acces_web": "complet|recherche_seule",
            "confiance_plafond": "haute|moyenne|faible", "auteur": "", "version": "1.0" },
  "perimetre": { "definition": "", "hors_champ": [""], "regle_comparabilite": "" },
  "theses": [{ "id": 1, "these": "", "preuve_src_ids": [], "donc_commercialement": "" }],
  "message_sectoriel": "",
  "incertitudes": [""],
  "marche": { "taille_eur_bn": null, "croissance_pct": null, "perimetre": "", "src_ids": [] },
  "blocs_clients": [{ "nom": "", "qui_finance": "", "cycle_budgetaire": "", "src_ids": [] }],
  "modeles_economiques": [{ "nom": "", "description": "",
      "implication_achat_prestation": "", "src_ids": [] }],
  "maillons": [{ "rang": 1, "nom": "", "contenu": "", "acteurs_types": [""],
      "ou_lesn_se_branche": "", "qui_y_est_deja": [""], "src_ids": [] }],
  "fronts_technologiques": [{ "nom": "", "etat": "", "zone_de_transition": true, "src_ids": [] }],
  "dependances_critiques": [{ "nom": "", "criticite": "", "risque": "",
      "prestation_ouverte": "", "practice_kredo": "", "src_ids": [] }],
  "regulation": [{ "reg_item_id": null, "libelle": "", "statut": "acquis|proposition",
      "deadline_date": "", "authority": "", "source_url": "", "commercial_angle": "",
      "kredo_practice": "" }],
  "chronologie": [{ "date": "", "fait": "", "portee": "", "src_ids": [] }],
  "risques_opportunites": [{ "risque": "", "opportunite": "", "src_ids": [] }],
  "pain_points": [{ "libelle": "", "frequency_count": 0, "source_company_ids": [], "src_ids": [] }],
  "playbook": { "personas": [], "objections": [], "entry_points": [], "roi_arguments": [],
                "market_thesis": [], "economic_models": [], "tech_fronts": [], "risks": [] },
  "budgets_18_36_mois": [{ "trajectoire": "", "famille_de_budget": "", "offer_slug": "" }],
  "sources": [{ "src_id": 1, "publisher": "", "url": "", "tier": 1, "atteste": "",
                "consulted_at": "" }],
  "trous": [{ "rubrique": "", "motif": "", "recherche_effectuee": "" }],
  "compteurs": { "theses": 0, "modeles_economiques": 0, "maillons": 0, "sources": 0 }
}
```

`compteurs` existe pour rendre l'invariant A9 vérifiable en une ligne de script :
chaque compteur doit égaler la longueur de sa liste. C'est ce qui attrape la troncature
silencieuse.
