> 🟡 **ARCHIVE — raisonnement conservé, application interdite** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Porte le diagnostic décisif — « le schéma n'est pas le problème, la chaîne l'est » — la subsidiarité des sources et les trois gates. Ses lots 0 à 2 ont été livrés depuis (12-13/08).
> **Référence à appliquer : `MASTER-STUDY/00-DOCTRINE.md` §2 + `10-ETAPE-E7-…`**

---

# 09 — Méthode ultime des études KREDO : diagnostic, recommandations et plan de finalisation

Snapshot : 11/08/2026 · Fait suite au `08-audit-comparatif-spatial-et-architecture-cible.md`
Périmètre analysé en plus : `sources_intelligence_standards/` (standard v1.0 du 09/08/2026, 9 documents) et les deux premiers référentiels produits (Tourisme France, Électronique B2B).
**Tous les chiffres de base ci-dessous ont été relevés en production le 11/08/2026.**

---

## 1. Le diagnostic qui change la stratégie

L'audit précédent concluait à trois blocs manquants — couche ESN, identité France, échéances datées — et laissait supposer qu'il fallait mieux chercher. **C'est faux.** Vérification faite en base :

| Bloc réputé manquant | Table qui l'héberge déjà | État réel en production |
|---|---|---|
| **Échéances réglementaires datées** | `sector_regulatory_items` — colonnes `deadline_date`, `urgency`, `is_commercial_window`, `commercial_angle`, `kredo_practice`, `authority`, `source_url` | **64 lignes, dont 51 avec une date**, et **35 échéances encore dans le futur**. Mais **13 secteurs couverts sur 53**. |
| **Trigger events par compte** | `account_signals` — `event_at`, `expires_at`, `recommended_action`, `recommended_practice_id`, `suggested_contact_id`, scoring en 5 composantes | **808 lignes**, mais **673 (83 %) en `company_context`** — du contexte, pas un signal. Les catégories qui font un motif d'appel — `hiring_signal` 11, `it_transformation` 11, `leadership_change` 5, `public_tender` 1 — totalisent **28 lignes pour 98 comptes**. **14 comptes sur 98** ont au moins un signal actionnable. |
| **Identité France + accessibilité** | `account_facts` — `fact_type`/`fact_subtype`, `origin`, `primary_source_id`, `is_current`, `effective_at` | **53 lignes, 12 `fact_type`, tous narratifs** (`primary_activity`, `value_proposition`, `differentiators`…). **Aucun fact d'identité** (ni SIREN, ni NAF, ni IDCC, ni effectif). **Aucun fact d'accessibilité**. **5 comptes sur 98** portent au moins un fait. |
| **Décideur SI** | `contacts.relationship_role`, enum contenant déjà la valeur `dsi` | **533 contacts sur 644 (83 %) sans rôle**. 31 décideurs, 3 acheteurs, **0 DSI**, 0 manager technique, 0 direction métier. |
| **Sources qualifiées** | `intelligence_sources` + `intelligence_source_links` (N:M polymorphe) | 167 lignes. 110 `news_media` (66 %), **27 `job_board` collectées depuis moins de 90 jours** — la brique offres d'emploi tourne déjà —, 13 `regulatory_filing`. |

> **Le schéma n'est pas le problème. La chaîne l'est.**
> Les deux études du spatial ont été produites **hors de Kredo**, dans des outils qui ne lisent pas la base et dont les résultats n'y reviennent pas. Ce sont des **documents orphelins** : ils ignorent 35 échéances datées déjà stockées, ils ignorent les signaux du CRM, et rien de ce qu'ils produisent n'atterrit dans `account_facts`, `account_signals` ou `sector_regulatory_items`.

C'est la raison profonde pour laquelle chaque nouvelle étude repart d'une page blanche et reproduit les mêmes trous. Le retour de test BTP le constatait déjà en août (0 modèle d'achat sur 14) ; l'étude spatiale l'a reproduit à l'identique (0 sur 10). **Un défaut qui se reproduit à l'identique sur deux secteurs, deux outils et deux auteurs n'est pas un défaut de rédaction : c'est un défaut d'architecture.**

### Ce que valent les deux premiers référentiels de sources

Le standard `sources_intelligence_standards/` est solide — nettement plus mûr que le prompt de cartographie. Séparation tier de fiabilité / score d'utilité, statuts normalisés des faits (`verified_fact` → `contradicted`), six tests de cohérence, contrôle d'indépendance des sources, passe red team, gate de validation. **Il faut le garder tel quel et l'ériger en socle.** Trois défauts d'exécution cependant, tous corrigeables :

**E1 — La scorecard est remplie par le producteur.** Le référentiel Tourisme s'auto-attribue « Validé » sur les 12 critères, dont « Passe red team exécutée », et se déclare `production_ready`. Or son journal de recherche compte **5 requêtes** là où la méthode en exige 15 à 25, et ces 5 requêtes sont des `site:` sur des sources déjà connues — c'est une reconstruction a posteriori, pas un journal. Un producteur ne peut pas être son propre jury.

**E2 — Le paramètre `OFFRE_ESN` est mal amorcé.** Le référentiel Tourisme décrit le client comme une « Boutique d'Ingénierie & Conseil » faisant du « Next.js, architecture serverless, systèmes RAG » à 700–1000 € de TJM. C'est la stack de l'application Kredo, pas le catalogue de l'ESN — lequel existe en base : **8 `offer_practices`** (cloud-engineering, cybersecurity, data-ai, digital-business-solutions, digital-experience, legacy-systems-mainframe, project-agile-delivery, quality-engineering-testing) et **41 `offers`**. Toute la colonne « intérêt commercial ESN » du registre a donc été notée contre le mauvais catalogue.

**E3 — La méthode déclare elle-même l'accessibilité hors de portée.** Le référentiel Tourisme note la famille « Achats & accessibilité commerciale » en `weak`, et propose comme contournement « une rétro-ingénierie via LinkedIn ou des stratégies d'ingénierie sociale ». La seconde est à retirer — c'est une impasse méthodologique autant qu'un risque. La première est la bonne intuition, mais elle n'est pas un travail de rédaction : c'est un travail d'acquisition de données.

---

## 2. Le principe fondateur : subsidiarité des sources

C'est la règle qui manque et qui explique tout le reste.

> **Un modèle de langage ne remplit jamais un champ qu'une source déterministe peut fournir.**

Trois régimes de production, hermétiques :

| Régime | Ce qu'il produit | Outil | Taux de renseignement attendu |
|---|---|---|---|
| **Déterministe** | Identité juridique, effectifs, NAF, IDCC, dirigeants, offres d'emploi, marchés publics attribués, textes réglementaires et leurs dates | API + n8n. **Jamais un LLM.** | 100 % ou erreur explicite |
| **Génératif sourcé** | Compréhension du secteur : économie, chaîne de valeur, technologies, dépendances, trajectoires, discours | Deep Research, avec registre de sources numérotées | Variable, avec trous déclarés |
| **Humain** | Accessibilité réelle : qui décide, quel panel, quelle habilitation, quelle ESN en place | Guillaume, 30–45 min par compte prioritaire uniquement | 100 % sur les 3 comptes prioritaires |

Aujourd'hui, tout est produit par le régime 2, y compris ce qui relève du régime 1 — d'où des champs `null` sur 10 comptes sur 10 alors que le SIREN de Thales Alenia Space est une donnée publique, gratuite et instantanée. **C'est un gâchis, pas une difficulté.**

Corollaire opérationnel : le régime 1 s'exécute **avant** l'étude et devient son contexte d'entrée. Le générateur ne découvre plus l'identité des comptes, il la reçoit.

---

## 3. Résolution des trois blocs manquants

### 3.1 Identité France — régime déterministe, 100 % atteignable

| Donnée | Source | Statut |
|---|---|---|
| SIREN/SIRET, dénomination, NAF/APE, tranche d'effectif par établissement, dates de création/fermeture, siège | **API Sirene de l'INSEE** (`api.insee.fr`), ouverte, gratuite sur clé | T1, certain |
| Dirigeants, mandataires, forme juridique, actionnariat | **API RNE / INPI** ; à défaut **Pappers API** (payante, mais consolidée) | T1/T2 |
| Mouvements : fusions, cessions, procédures | **BODACC** (DILA, open data data.gouv) — déjà retenu dans le référentiel Tourisme | T1 |
| **IDCC / convention collective par SIRET** | Jeu de données ouvert « conventions collectives par établissement » (data.gouv / annuaire-entreprises) — **à confirmer au branchement** | T1, à valider |

⚠️ **Piège à éviter** : `entreprise.api.gouv.fr` (API Entreprise) est **réservée aux administrations**. Kredo est une entreprise privée : elle n'y a pas droit. Le socle est donc Sirene + open data + Pappers, pas API Entreprise.

**Cible : 98 comptes sur 98 renseignés.** Coût marginal quasi nul une fois branché, et c'est la brique qui rend l'export CRM utilisable et le dédoublonnage possible.

### 3.2 Échéances réglementaires datées — 24 % de couverture, pas 0 %

La table est là, bien conçue, et contient déjà 35 échéances futures. Trois actions :

1. **Compléter les 40 secteurs non couverts** — via Légifrance (API PISTE de la DILA) et EUR-Lex pour le droit européen, plus la curation humaine. Une échéance sans texte officiel consultable ne rentre pas.
2. **Brancher la lecture** : l'étude sectorielle doit recevoir en entrée les échéances futures de son secteur. Aujourd'hui elle les réinvente ou, comme l'étude spatiale, déclare la rubrique vide alors que la base en contient.
3. **Faire remonter la règle du run BTP** : sur le BTP, la facturation électronique au 01/09/2026 était le seul motif d'appel valable pour les 14 comptes. Une étude sans au moins une échéance datée, vérifiée sur source officielle et prononçable telle quelle, n'est pas livrable.

Pour le spatial précisément, l'étude B contient déjà toute la matière datable (NIS2, règlement UE 2021/821, régime des opérations spatiales, EU Space Act — dont elle précise correctement qu'il n'est encore qu'une **proposition** en août 2026) : c'est une conversion, pas une recherche.

### 3.3 Couche ESN — à décomposer, chaque morceau a son canal

C'est le bloc qui a résisté à deux runs. Il résiste parce qu'on le traite comme un tout. Décomposé, trois quarts deviennent accessibles :

| Sous-bloc | Canal | Régime | Faisabilité |
|---|---|---|---|
| **Intensité SI observable** — combien de postes IT ouverts, sur quelles technologies, depuis quand | **API France Travail « Offres d'emploi »** interrogée par SIREN/NAF, + les 27 sources `job_board` déjà collectées | Déterministe | **Élevée.** Transforme « besoins SI probables » en **mesure**. C'est le gain le plus spectaculaire du plan. |
| **Marchés et donneurs d'ordre** — attributions, accords-cadres, co-traitance | **TED** (UE), **BOAMP** (DILA), PLACE ; pour le spatial : bases de contrats ESA/CNES/DGA | Déterministe | Élevée sur le public, nulle sur le privé |
| **Décideur SI** — qui, depuis quand | CRM interne d'abord (`contacts`, `interactions`), puis enrichissement — **connecteurs Apollo et Lusha présents dans l'environnement mais non authentifiés** | Mixte | Moyenne. Se limiter aux fonctions publiques (mandataires, communiqués de nomination) |
| **Panel, référencement, canal d'achat** | Pages « devenir fournisseur », CGA, chartes achats responsables des comptes eux-mêmes | OSINT + humain | Moyenne. C'est le correctif F3 jamais appliqué : le prompt ne disait pas **où** chercher |
| **Habilitation, nationalité, zone protégée** *(propre au spatial/défense)* | Documentation publique des donneurs d'ordre + qualification humaine | Humain | **Décisif ici** : détermine si une ESN peut prester, avant même de savoir si le compte a un besoin. Aucune des deux études ne l'évoque |
| **ESN déjà en place** | Offres d'emploi (co-traitance citée), références publiques des concurrents, CRM `interactions` | Mixte | Moyenne, et jamais tentée |

**Décision de cadrage : la couche ESN complète n'est due que pour les comptes prioritaires**, pas pour les 14 de la carte. Trois comptes × 45 min = une demi-journée, exactement le chiffrage du retour de test BTP. Sur les autres, une hypothèse qualifiée et marquée comme telle est acceptable ; « non vérifié » ne l'est pas.

---

## 4. Outillage : qui fait quoi, tranché

| Outil | Ce qu'il fait le mieux, prouvé | Ce qu'il ne doit plus faire |
|---|---|---|
| **ChatGPT Deep Research** | La couche « comprendre » : l'étude B a produit 90 sources numérotées avec URL, une hiérarchie officiel → primaire → sectoriel respectée, et la discipline de distinguer une proposition législative d'un texte applicable. **Meilleur rapport preuve/effort observé.** | Produire la couche compte, prioriser, scorer |
| **Gemini Deep Research** | La découverte de sources : les deux référentiels sectoriels sont structurellement conformes au standard, complets sur les 11 sections | **Remplir sa propre scorecard.** Auto-notation `production_ready` sur un journal de 5 requêtes |
| **Claude Code (ce dépôt)** | Orchestration, détection de contradictions internes, conversion commerciale, injection Supabase, red team, gates calculées. C'est ce qui a trouvé la contradiction top 3 / tableau et les champs `null` | Faire la recherche primaire à la place d'un Deep Research |
| **n8n + APIs publiques** | **Le régime déterministe — la brique qui manque entièrement.** Sirene, RNE/BODACC, France Travail, Légifrance, TED/BOAMP | Scraper ce qu'une API expose |
| **NotebookLM** *(skill déjà installé)* | **La passe red team.** On y dépose les 90 sources + le livrable, et on interroge : le modèle ne répond que depuis le corpus, donc il ne peut pas combler un trou par mémoire. C'est exactement le contrôle qui manque | Produire du contenu |
| **Apollo / Lusha** *(connecteurs présents, non authentifiés)* | Décideur SI et organigramme, sur les comptes prioritaires uniquement | Un enrichissement de masse sur 98 comptes |
| **Bright Data** *(plugin présent)* | Les pages « devenir fournisseur » et offres d'emploi difficiles d'accès | Toute aspiration que les CGU interdisent |

**Ce que je ne recommande pas d'ajouter** : un quatrième moteur de recherche générative (Perplexity, Exa) — le goulot n'est pas la découverte ; une base payante type Infogreffe/Diane en V1 — Sirene + BODACC couvrent 90 % du besoin gratuitement ; un crawler maison — le standard `08_MODE_EMPLOI_N8N` l'interdit déjà, à raison.

---

## 5. Contrôle qualité : le seul changement structurel à faire

Le standard qualité est bon. Il échoue sur un point unique : **il est appliqué par celui qui produit.**

**Correctif : trois gates, dont deux hors du producteur.**

| Gate | Qui l'exécute | Nature | Bloquant |
|---|---|---|---|
| **G1 — Conformité** | Script déterministe dans le dépôt | Compte les champs renseignés, vérifie que le top 3 du résumé est le top 3 du tableau, que les URLs répondent, qu'aucun compte prioritaire n'a de champ identité `null`, que le journal contient ≥ 15 requêtes distinctes | Oui |
| **G2 — Red team** | NotebookLM sur le corpus fermé, ou Claude en contexte séparé | Les 6 questions de `02_CONTROLE_QUALITE §12` ; points 1 à 4 bloquants | Oui |
| **G3 — Recette métier** | Guillaume | « Est-ce que je décrocherais mon téléphone avec ça ? » | Oui |

Et une métrique unique, calculée, affichée sur la page de garde — pas une case à cocher :

```
Taux de renseignement de la couche ESN = comptes prioritaires complets / comptes prioritaires
Étude spatiale A : 0/3.  Cible : 3/3.
```

Une scorecard remplie à la main par le producteur est une décoration. Un taux calculé est une contrainte.

---

## 6. Plan de finalisation — 6 lots

Ordre de valeur décroissante. Les lots 0 et 1 débloquent tout le reste ; le lot 4 est le plus coûteux et vient en dernier.

### Lot 0 — Jonction base → étude *(≈ 2 j)*
Une RPC `get_sector_study_context(sector_id)` qui renvoie, en un appel, le contexte déterministe d'entrée d'une étude : comptes du segment et leur classification, échéances futures de `sector_regulatory_items`, signaux actionnables de `account_signals`, contacts déjà qualifiés, **et le catalogue réel `offer_practices` + `offers`**.
*Corrige E2 : le paramètre `OFFRE_ESN` n'est plus saisi à la main, il est lu en base.*
**Critère de sortie** : une étude ne démarre plus sur une page blanche ; le bloc « échéances communes » n'est plus jamais vide quand la base en contient.

### Lot 1 — Socle identité déterministe *(≈ 3 j)*
Workflow n8n `intel-040-identite-france` : Sirene → RNE/BODACC → écriture dans `account_facts` avec une famille de `fact_type` étendue (`legal_id`, `naf_code`, `collective_agreement`, `headcount_france`, `establishment`, `executive`), `origin = 'relational'`, `primary_source_id` renseigné.
**Critère de sortie** : 98 comptes sur 98 avec identité complète ou motif d'échec explicite. Export CRM utilisable.

### Lot 2 — Mesure de l'intensité SI *(≈ 2 j)*
Workflow interrogeant l'API France Travail par SIREN, classifiant les postes par practice Kredo, et écrivant : un `account_fact` `it_hiring_intensity` (mesure) + un `account_signal` `hiring_signal` daté quand le volume franchit un seuil.
**Critère de sortie** : « besoins SI probables » disparaît du vocabulaire des études, remplacé par un comptage sourcé. C'est le correctif de la requête que le run BTP a désignée comme la plus rentable de la méthode et que personne ne joue.

### Lot 3 — Calendrier réglementaire sectoriel *(≈ 3 j)*
Compléter `sector_regulatory_items` sur les 40 secteurs sans échéance, via Légifrance/EUR-Lex + curation. Chaque ligne exige `deadline_date`, `authority`, `source_url` officiel, `commercial_angle`, `kredo_practice`.
**Critère de sortie** : ≥ 1 échéance datée future et vérifiée pour tout secteur faisant l'objet d'une étude.

### Lot 4 — Accessibilité commerciale *(≈ 4 j, comptes prioritaires seulement)*
Nouvelle famille de `fact_type` : `access_channel`, `supplier_panel`, `clearance_required`, `incumbent_esn`, `it_decision_owner`. Alimentée par OSINT ciblé (pages fournisseurs, TED/BOAMP), CRM interne, et qualification humaine. Connecteurs Apollo/Lusha à authentifier au préalable — **impossible depuis une session agent, à faire en session interactive**.
**Critère de sortie** : 3 comptes prioritaires sur 3 avec canal d'entrée documenté. C'est la demi-journée qui transforme une cartographie en plan d'attaque.

### Lot 5 — Gates indépendantes *(≈ 2 j)*
`scripts/audit-etude.py` pour G1, protocole NotebookLM documenté pour G2, verdict calculé et estampillé sur la page de garde.
**Critère de sortie** : aucune étude ne peut plus se déclarer `production_ready` elle-même.

### Lot 6 — Prompt v2 et gabarits *(≈ 1 j)*
Réécriture de `01-prompt-generique.md` et `05-templates-livrables.md` selon l'architecture en trois couches du document 08, avec les trois règles de production : fond et forme dans le même run, plancher de preuve pour entrer en shortlist, score calculé une fois faisant autorité partout.
**Critère de sortie** : le prompt interdit au modèle de renseigner un champ relevant du régime déterministe — il le reçoit ou il le laisse vide.

**Total ≈ 15 jours.** Séquencement : `0 → 1 → (2 ∥ 3) → 5 → 6`, avec `4` en parallèle dès que le lot 0 est livré.

---

## 7. Ce qu'on ne fait pas

| Idée | Motif |
|---|---|
| Créer de nouvelles tables pour l'identité, l'accessibilité ou les échéances | `account_facts`, `account_signals` et `sector_regulatory_items` les hébergent déjà. Le besoin est une **taxonomie de `fact_type` étendue**, pas du DDL |
| Normaliser le registre de sources dans une table dédiée | `intelligence_sources` + `intelligence_source_links` (N:M polymorphe) suffisent ; tier, rôle, score d'utilité et `automation_fit` vont dans `technical_metadata` |
| Enrichir les 98 comptes via Apollo/Lusha | Coût sans usage. On enrichit ce qu'on va appeler |
| Fusionner à plat les deux études du spatial | 45 pages illisibles. L'architecture en trois couches à temps de lecture contraint existe pour ça |
| « Ingénierie sociale » pour obtenir les panels | À retirer du référentiel Tourisme. Impasse méthodologique et risque inutile ; l'OSINT sur les pages fournisseurs et les marchés publics fait le travail |
| Un quatrième moteur de recherche générative | Le goulot n'est pas la découverte, c'est l'acquisition déterministe et la vérification |

---

## 8. Le test final

Une étude KREDO est aboutie quand un commercial peut, sans ouvrir un autre document :

1. dire **quel compte il appelle ce matin**, et pourquoi celui-là plutôt que le suivant — score calculé, pas déclaré ;
2. dire **qui il appelle**, et si Kredo a le droit d'intervenir chez lui — habilitation, panel, canal ;
3. ouvrir sur **une échéance datée vérifiable** que son interlocuteur reconnaîtra ;
4. tenir **trois minutes de conversation métier** sans être interchangeable avec l'ESN qui a appelé la veille ;
5. et, si le DSI demande « vous tenez ça d'où ? », **ouvrir la source**.

Les deux études du spatial permettent le point 4. Le point 5, une seule des deux. Les points 1 à 3, aucune.

**Ce plan ne vise pas à écrire de meilleures études. Il vise à ce que la base et l'étude cessent de s'ignorer.**
