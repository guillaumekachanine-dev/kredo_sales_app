# Architecture de la connaissance utile — un compte vu par un business developer ESN

**Statut :** rapport de cadrage. Aucun code, aucune migration, aucun workflow modifié par ce document.
**Date :** 2026-08-26. Tous les chiffres ci-dessous sont **relevés en base de production** ce jour.
**Périmètre :** ce que l'on doit savoir d'une entreprise pour lui vendre des prestations IT.
**Hors périmètre, volontairement :** *où* trouver ces informations (chantier 2).

> Ce document **rouvre** le contrat fonctionnel `INTEL-030-ACCOUNT-KNOWLEDGE-V3-CONTRACT.md`,
> qui se déclare « gelé ». C'est assumé et argumenté au §2 : le gel porte sur un objet qui n'est
> pas celui dont le métier a besoin.

---

## 0. La thèse en une page

Le workflow `intel-030-account-knowledge` produit, dans sa version V3, **une encyclopédie
d'entreprise**. Sept sections : synthèse, identité, positionnement marché, offres et clientèle,
chaîne de valeur, environnement réglementaire, tendances. C'est un excellent plan… pour un
analyste financier, un journaliste économique ou un cabinet de stratégie.

Un business developer en ESN ne vend pas une analyse d'entreprise. Il vend **des jours-homme de
profils identifiés, à un TJM, à travers un canal d'achat, à un décideur qui a un budget et un
besoin daté**. Les sept questions qui décident de son action sont :

1. Ce compte **achète-t-il** de la prestation IT à l'extérieur, et par quel canal ?
2. Sommes-nous **autorisés** à le servir (référencement, panel, habilitation) ?
3. **Qui** décide, qui prescrit, qui bloque — et le connaissons-nous ?
4. **Quels chantiers** SI sont ouverts, et sur quelles technologies ?
5. **Pourquoi maintenant** — quel événement daté ouvre une fenêtre ?
6. **Qui est déjà en place** et à quelles conditions ?
7. **Qu'avons-nous déjà fait** chez eux, et qu'est-ce qui a marché ?

**Le contrat V3 ne pose aucune de ces sept questions.** Pire : il en *évacue* explicitement trois
(§ « Relocalisation future des blocs existants » — les blocs `Organisation`, `Activités
opérationnelles` et `Relation commerciale` sortent du flux éditorial). Il a gardé l'emballage
FOLIO et jeté le contenu commercial.

La déception n'est donc pas un défaut d'exécution : le workflow fait correctement ce qu'on lui a
demandé. **C'est la commande qui est fausse.**

---

# PARTIE I — AUDIT DE L'EXISTANT

## 1. Inventaire des processus qui écrivent la connaissance compte

Onze processus produisent aujourd'hui de la connaissance sur un compte. Aucun ne lit la sortie
d'un autre.

| Process | Finalité déclarée | Périmètre | Ce qu'il écrit réellement | Volume live |
|---|---|---|---|---|
| **intel-010-refresh-account-infos** (« Scan compte ») | Remplir le CRM | 1 compte | `enrichment_proposals` → après validation : `companies` (canonique), `account_facts` (25 types), candidats contacts, classification 7 axes | 150 runs · 1 325 propositions · **648 faits courants / 47 comptes** |
| **intel-030-account-knowledge** | Onglet « Entreprise » | 1 compte | `ai_intelligence_results.content_json` (V1/V2/V3) — étude narrative sourcée | **9 en V1 · 7 en V2 · 1 en V3** |
| **intel-031-issues-map** | Onglet « Enjeux » | 1 compte | `account_issues` — enjeu priorisé (importance/urgence/criticité/impact/**accessibilité**/**kredo_fit**) | 52 enjeux / **9 comptes** |
| **intel-032-strategy** | Onglet « Stratégie » | 1 compte | `commercial_strategy` — mapping enjeu↔offre, angles, messages par persona, objections | **1 résultat** |
| **intel-033-account-watch-refresh** (+ scheduler) | Veille dédiée | 1 compte | `account_signals`, `intelligence_sources`, `intelligence_source_links` | 843 signaux dont **120 actifs** · 8 veilles activées |
| **intel-034-account-signal-verification** | Fiabiliser un signal | 1 signal | `account_signal_verification` (résultat, jamais le statut métier) | actif |
| **intel-020-communication** | Pitch / briefing | 1 compte × 1 canal | `intelligence_documents` | 17 |
| **veille-hebdomadaire** / **intel-021** | Veille et analyse marché | workspace / secteur | `veille_articles`, `veille_digests`, `strategic_watch_analysis` | 10 / 2 / 6 |
| **A7 — intensité SI** (France Travail) | Mesurer la demande SI observable | 1 compte | *rien* — moteur écrit et testé, **écriture en base en attente de décision** | 9 faits `it_hiring_intensity` |
| **MASTER STUDY (E0→E7)** | Connaissance sectorielle et concurrentielle | macro / segment / compte | `sector_intelligence`, `competitive_map_entries`, `value_chain_*` | 53 fiches · 23 entrées carto · **premier run rejeté** |
| **Saisie humaine** | — | — | `contacts`, `interactions`, `opportunities`, `missions` | **la source la plus riche du système** |

## 2. Ce que produit réellement `intel-030` — la preuve par le dernier run

Run du **2026-08-25 14:38** sur **Ciffreo Bona** (négoce de matériaux, 1 300 salariés au CRM,
609 M€ de CA, 7 contacts, 1 opportunité, 8 signaux). Premier et unique artefact V3 en base.
Résultat brut, `ai_intelligence_results.id = 6c08f0ad-…` :

```
source_coverage : { coverage_rate: 1, sourced_claims: 11, passed: true }
sources citées  : 1 seule — l'API Recherche d'entreprises (INSEE Sirene)
```

Les **onze** affirmations publiées :

| Chemin | Contenu | Nature | Conf. |
|---|---|---|---|
| `account_summary` | « …relève du code NAF 46.73A, tranche d'effectif 250-499, siège à Cannes » | analysis | 0.55 |
| `identity.company_name` | « enregistrée sous la dénomination CIFFREO BONA (SIREN 487652257) » | fact | 0.90 |
| `identity.legal_name` | « la raison sociale exacte est CIFFREO BONA » | fact | 0.75 |
| `identity.primary_activity` | « le code NAF est 46.73A » | fact | 0.85 |
| `identity.headquarters` | « siège à Cannes (06150) » | fact | 0.80 |
| `identity.employee_count` | « tranche d'effectif code 32, soit 250-499 » | fact | 0.70 |
| `identity.sector` | « le secteur relève du négoce de matériaux, **tel que déduit du code NAF 46.73A** » | analysis | 0.55 |
| `offers_and_customers.core_business` | « l'activité principale déclarée relève du code NAF 46.73A » | fact | 0.75 |
| `offers_and_customers.covered_domains[0]` | « le classement 46.73A situe le domaine dans le négoce de matériaux » | analysis | 0.60 |
| `value_chain.description` | « classée grossiste (46.73A), position d'intermédiaire » | analysis | 0.55 |
| `value_chain.key_links[0]` | « le maillon central déductible du code d'activité est le négoce/distribution » | analysis | 0.50 |

**Onze reformulations d'un seul code NAF.** Cinq d'entre elles sont typées `analysis` : le modèle
paraphrase la même donnée en changeant de temps de verbe. Deux appels LLM (rédaction puis
vérification indépendante) ont été consommés pour conclure que le code NAF dit ce que dit le code
NAF — les onze verdicts sont `confirmed`, tous étayés par la même unique source.

Sections **entièrement vides** : `market_positioning` (concurrents, avantages, menaces,
opportunités, politique et ambitions), `regulatory_environment` (les 3 sous-blocs),
`trends_and_news` (analyse ET `significant_signal_ids`), `identity.revenue`,
`identity.geographic_reach`, `identity.business_segment`, et 10 des 12 champs de
`offers_and_customers`.

Enfin, la fiche CRM porte **1 300 salariés** et l'étude publie **250-499** sans que rien ne
signale la contradiction : la « vérification indépendante » vérifie l'accord du claim avec sa
source, jamais l'accord des sources entre elles.

## 3. Diagnostic — cinq causes, par ordre de gravité

### D1 — L'objet est faux (cause racine)

Le contrat V3 décrit **l'entreprise en tant qu'entité économique**. Le métier a besoin de
**l'entreprise en tant qu'acheteuse de prestations IT**. Ce sont deux objets différents, et le
second n'est pas un sous-ensemble du premier : la taille de la DSI, le régime d'achat, le
référencement, les ESN en place, le TJM pratiqué, les chantiers ouverts n'apparaissent dans
aucune des sept sections.

Le contrat va jusqu'à sortir du flux éditorial les trois blocs qui portaient la valeur
commerciale (`Organisation`, `Activités opérationnelles`, `Relation commerciale`). L'onglet
Entreprise a donc été *appauvri* par sa refonte.

### D2 — La taxe de sourçage a mangé le contenu

La règle « aucune affirmation sans source réellement consultée » est juste. Sa mise en œuvre ne
l'est pas : **trois canaux de collecte** (site officiel, INSEE, RSS Google News), aucun repli.

- Site officiel : `V3 Consult & Normalize Sources` écarte la page si le texte extrait fait moins
  de 120 caractères — cas normal d'un site en rendu JS. Aucune preuve retenue.
- Presse : requête RSS sur `"raison sociale"` — muette pour une ETI régionale.
- INSEE : **toujours disponible**, et structurellement porteur de la seule identité administrative.

Le résultat est mécanique : **l'architecture maximise la prouvabilité et minimise l'utilité.** Ce
qui est le plus prouvable (SIREN, NAF, tranche d'effectif) est le moins décisif ; ce qui est le
plus décisif (qui décide, ce qu'ils achètent, à qui, à quel prix) est rarement prouvable par une
source publique gratuite — et se trouve souvent **déjà dans le CRM**.

### D3 — Le workflow ignore la matière déjà présente

La RPC `get_account_knowledge_context` sert pourtant `accountFacts`, `contacts`,
`recentInteractions`, `opportunities`, `missions`, `signals`. Trois filtres les neutralisent :

1. **`verifiedFacts = facts.filter(f => f.verified_at)`** (nœud `V3 Prepare Context & Research
   Plan`) — Ciffreo Bona n'a de toute façon **aucun fait** : les 648 faits courants du workspace
   sont concentrés sur 47 comptes sur 112.
2. **Les signaux archivés sont invisibles.** La RPC filtre
   `status not in ('dismissed','false_positive','expired','archived')`. Or les **8 signaux** de
   Ciffreo Bona sont **tous** `archived` — conséquence de l'archivage calendaire à 2 mois.
   L'excerpt de la source CRM créée par le run le dit noir sur blanc :
   `« Contacts: 7 · interactions: 0 · opportunites: 0 · missions: 0 · signaux: 0 »`.
   Le compte avait huit signaux ; l'étude n'en a vu aucun.
3. **Les contacts ne peuvent plus devenir un claim** : le bloc `organisation` a été retiré en V3.
   Sept contacts identifiés, dont les décideurs SI, n'ont aucun endroit où atterrir.

### D4 — La connaissance décisive existe déjà, non structurée

C'est le constat le plus important de cet audit, et le plus encourageant.

| Ce qui manque « officiellement » | Ce que la base contient réellement |
|---|---|
| Bloc A3 « **0 DSI** » (MASTER STUDY, carte de la connaissance) | **310 contacts sur 642** portent un intitulé SI. Dont **56 « DSI »**, **14 « RSSI »**, **13 « CTO »**, 8 « Responsable Infrastructure », 4 « Responsable Informatique »… |
| Rôle décisionnel | `relationship_role` est **null sur 520 contacts / 642** (81 %) — l'information est dans `job_title`, pas dans le champ prévu |
| Prix pratiqué par compte | `missions` porte **33 lignes, TJM moyen par compte 500 → 850 €**, marge brute 29 → 43 %, par compte et par practice |
| Ce qui marche / ne marche pas | `opportunities` : **14 `win_reason` et 12 `loss_reason` renseignés sur 30** opportunités |
| Organigramme client | `company_relationships` : **0 ligne** — la table existe, personne ne l'alimente |
| ESN en place (bloc C6) | **0** — jamais collecté, jamais demandé, alors que c'est une information que le BD connaît de tête |

**Le problème n'est pas d'aller chercher la connaissance : c'est de la ranger et de la faire
parler.**

### D5 — Aucune consolidation

Six processus écrivent sur le même compte dans cinq magasins (`companies`, `account_facts`,
`account_signals`, `account_issues`, `ai_intelligence_results`), chacun avec sa taxonomie propre,
aucun ne lisant la sortie des autres. Il n'existe **aucun read-model unifié du compte**. La page
affiche donc des blocs juxtaposés, pas un briefing.

Symptôme mesurable de cette dispersion : `account_roadmap_actions` = **0 ligne**,
`company_relationships` = **0 ligne**, `commercial_strategy` = **1 résultat**. La fin de chaîne
est vide parce que le début de chaîne ne produit pas de quoi l'alimenter.

---

# PARTIE II — ARCHITECTURE DE LA CONNAISSANCE UTILE

## 4. Le principe de tri

> **Une information est utile si, et seulement si, elle change une décision ou une action
> du business developer.**

Test à appliquer à chaque item : *quelle décision change-t-elle ?* Si aucune → ce n'est pas de la
connaissance, c'est de la décoration. Ce test seul disqualifie la moitié du contrat V3.

### Les six décisions du BD en ESN

| Réf. | Décision | Question |
|---|---|---|
| **D-A** | Prioriser | Ce compte mérite-t-il mon temps, et dans quel ordre par rapport aux 111 autres ? |
| **D-B** | Entrer | Par quelle porte, quel interlocuteur, quel canal d'achat ? |
| **D-C** | Proposer | Quelle practice, quelle offre, quel profil ? |
| **D-D** | Cadencer | Quand frapper, avec quelle accroche ? |
| **D-E** | Valoriser | À quel TJM, à quelles conditions contractuelles ? |
| **D-F** | Tenir | Comment sécuriser la récurrence et détecter le risque de sortie ? |

### Les quatre niveaux d'importance

| Niveau | Définition opérationnelle | Conséquence si absent |
|---|---|---|
| **P0 — Bloquant** | Sans cette information, **on ne peut pas travailler le compte** de manière rationnelle. | Le BD agit à l'aveugle ou n'agit pas. Une case P0 vide doit produire **une tâche**, pas un blanc. |
| **P1 — Différenciant** | Détermine **l'angle** : ce qui distingue une approche pertinente d'un mail générique. | Le BD travaille, mais banalement. Taux de transformation en berne. |
| **P2 — Crédibilisant** | Enrichit le discours, prouve qu'on a fait le travail. | Perte de crédibilité en rendez-vous, sans blocage. |
| **P3 — Décor** | À produire seulement si c'est gratuit. **Ne jamais dépenser un appel LLM pour ça.** | Aucune. |

---

## 5. Les huit catégories de la connaissance utile

### C1 — ADRESSABILITÉ : ce compte est-il achetable, et par nous ?

*C'est la catégorie que le système actuel ignore intégralement, et c'est la première à
renseigner. Un compte non adressable ne mérite aucune autre analyse.*

| # | Information | Niv. | Décision | État actuel |
|---|---|:-:|:-:|---|
| C1.1 | **Existence et taille de la fonction SI** (DSI interne, RSI, informatique gérée par la DAF, externalisée en totalité) | **P0** | D-A | ⛔ absent |
| C1.2 | **Politique d'externalisation** : régie / forfait / TMA / interne strict / offshore / nearshore | **P0** | D-A, D-C | ⛔ absent |
| C1.3 | **Canal d'achat** : gré à gré · panel-référencement · appel d'offres privé · marché public · centrale d'achat · plateforme de sourcing (Beeline, Provigis, Ariba…) | **P0** | D-B | ⛔ absent (`companies.regime_achat` existe mais porte la classification 7 axes, pas le canal opérationnel) |
| C1.4 | **Statut de référencement Kredo** : référencé · en cours · hors panel · exclu · panel fermé jusqu'à *date* | **P0** | D-A, D-B | ⛔ absent |
| C1.5 | **ESN et prestataires en place** (incumbents), part estimée, ancienneté | **P1** | D-B, D-E | ⛔ **0** — bloc `C6` de la carte MASTER STUDY, jamais alimenté |
| C1.6 | **Échéance des contrats-cadres / du panel** | **P0** | D-D | ⛔ absent — c'est pourtant la fenêtre d'entrée n°1 |
| C1.7 | **Volume d'achat SI externalisé** estimé (€/an, ou nb de prestataires présents) | **P1** | D-A | ⛔ absent |
| C1.8 | **Conditions contractuelles connues** : délai de paiement, pénalités, clause de réversibilité, exigence d'assurance | **P2** | D-E | ⛔ absent |
| C1.9 | **Habilitations et exigences d'accès** : défense/SecNumCloud, santé (HDS), bancaire, ISO 27001, critères RSE | **P2** | D-A, D-C | ⛔ absent |
| C1.10 | **Sites livrables** et distance aux implantations Kredo | **P1** | D-C | ⚠️ partiel (`hq_location`, faits `establishment` : 35) |

> **La quasi-totalité de C1 n'est pas une information à *chercher* : c'est une information que le
> BD *possède* et que le système ne lui a jamais demandé de saisir.** C'est le premier chantier de
> capture, pas de recherche.

---

### C2 — ORGANISATION DE LA DÉCISION : qui signe, qui prescrit, qui bloque

| # | Information | Niv. | Décision | État actuel |
|---|---|:-:|:-:|---|
| C2.1 | **Cartographie de la DSI** : DSI, RSSI, CTO, responsables de domaine (infra, réseau, data, applicatif, cyber, poste de travail) | **P0** | D-B | 🟢 **matière présente, non structurée** : 310 intitulés SI sur 642 contacts |
| C2.2 | **Rôle dans la décision** : décideur · prescripteur · acheteur · utilisateur · bloqueur | **P0** | D-B | 🔴 `relationship_role` **null à 81 %** (520/642) |
| C2.3 | **Direction des achats** : interlocuteur, seuils de délégation, pouvoir de veto | **P1** | D-B, D-E | ⚠️ 3 contacts `acheteur` sur 642 |
| C2.4 | **Notre niveau de relation** par interlocuteur : inconnu · froid · tiède · chaud · sponsor | **P0** | D-B, D-D | 🔴 `relationship_level` renseigné sur **50 contacts / 642** (8 %) |
| C2.5 | **Date et nature de la dernière interaction** par interlocuteur | **P0** | D-D | 🟢 `interactions` (185) + `companies.last_contact_at` |
| C2.6 | **Arrivée récente / mobilité d'un décideur** (fenêtre des 100 jours) | **P1** | D-D | ⚠️ signaux `leadership_change` : 5 |
| C2.7 | **Chaîne de reporting interne** (qui reporte à qui, qui influence qui) | **P2** | D-B | 🔴 `company_relationships` = **0 ligne** |
| C2.8 | **Coach / relais interne** identifié | **P2** | D-B | ⛔ absent |
| C2.9 | **Entité juridique qui achète réellement** (souvent ≠ entité analysée : cf. le cas Thales du README A7) | **P1** | D-B, D-E | ⛔ absent |

---

### C3 — BESOIN ET DEMANDE : qu'est-ce qui va être acheté

| # | Information | Niv. | Décision | État actuel |
|---|---|:-:|:-:|---|
| C3.1 | **Chantiers SI en cours et annoncés** : migration cloud, refonte ERP, programme data, mise en conformité, refonte poste de travail | **P0** | D-C, D-D | ⚠️ faits `transformation_program` : 29 |
| C3.2 | **Offres d'emploi SI ouvertes** — la demande observable, datée, non déclarative | **P0** | D-C, D-D | 🟡 moteur A7 **écrit et testé**, écriture en base **en attente de décision** |
| C3.3 | **Profils recherchés** (rattachés à `job_profiles`) et volumétrie | **P0** | D-C | ⛔ absent |
| C3.4 | **Stack technologique en place** et fronts de transition | **P1** | D-C | ⚠️ faits `technology` : 23 faits / 13 comptes |
| C3.5 | **Enjeux prioritaires étayés** (avec niveau de preuve) | **P1** | D-C, D-D | 🟢 `account_issues` : 52 enjeux / **9 comptes** — le modèle est bon, la couverture est faible |
| C3.6 | **Contraintes réglementaires datées** créant une fenêtre (NIS2, DORA, IA Act, accessibilité…) | **P1** | D-D | 🟢 `sector_regulatory_items` (13 items) via le segment |
| C3.7 | **Cycle budgétaire** : mois d'arbitrage, exercice fiscal | **P1** | D-D | ⛔ absent |
| C3.8 | **Budget SI** ou ratio budget SI / CA | **P2** | D-A | ⛔ absent |
| C3.9 | **Maturité numérique / dette technique observée** | **P2** | D-C | ⚠️ 89 signaux `folio_digital_maturity` (legacy, non sourcés) |

---

### C4 — TIMING : pourquoi maintenant

*Une information vraie mais non datée n'ouvre aucune fenêtre. Cette catégorie est la seule où
la fraîcheur prime sur la profondeur.*

| # | Information | Niv. | Décision | État actuel |
|---|---|:-:|:-:|---|
| C4.1 | **Signaux d'achat datés et qualifiés** : levée de fonds, croissance, incident cyber, nouveau site, acquisition, marché public publié | **P0** | D-D | 🟢 `account_signals` — mais **120 actifs sur 843**, et 83 % du stock est du backfill FOLIO non sourcé |
| C4.2 | **Nomination d'un décideur SI** (DSI, RSSI, CTO) | **P0** | D-D | ⚠️ 5 signaux `leadership_change` |
| C4.3 | **Échéance contractuelle** : fin de marché, renouvellement de panel, fin de mission d'un concurrent | **P0** | D-D | ⛔ absent — *l'information la plus actionnable du métier, nulle part dans le système* |
| C4.4 | **Fin de mission d'un consultant Kredo** en cours (risque et opportunité de rebond) | **P0** | D-F | 🟢 `missions.end_date` + CRA |
| C4.5 | **Fenêtre réglementaire** avec date butoir | **P1** | D-D | 🟢 `sector_regulatory_items.deadline_date` |
| C4.6 | **Saisonnalité** du compte (fermetures, gel budgétaire) | **P2** | D-D | ⚠️ `client_closures` : 6 lignes |
| C4.7 | **Péremption de la connaissance elle-même** : « dernière mise à jour il y a N jours » par catégorie | **P1** | toutes | ⛔ absent (existe au niveau run, pas au niveau information) |

---

### C5 — NOTRE POSITION : l'histoire Kredo avec ce compte

*Catégorie entièrement disponible en base, entièrement sous-exploitée. Coût de production : nul.*

| # | Information | Niv. | Décision | État actuel |
|---|---|:-:|:-:|---|
| C5.1 | **Missions réalisées** : practice, profil, durée, TJM, marge, satisfaction | **P0** | D-C, D-E | 🟢 **33 missions**, TJM moyen par compte **500→850 €**, marge **29→43 %** |
| C5.2 | **Opportunités gagnées / perdues et leurs motifs** | **P0** | D-C, D-E | 🟢 14 `win_reason` / 12 `loss_reason` sur 30 opportunités — **jamais restitué à l'écran** |
| C5.3 | **Consultants actuellement placés**, date de fin, taux d'activité | **P0** | D-F | 🟢 `missions` + `mission_activity_reports` (**227 CRA**) |
| C5.4 | **TJM plancher / plafond accepté historiquement** par ce compte | **P1** | D-E | 🟡 dérivable de C5.1, non calculé |
| C5.5 | **Densité relationnelle** : nb d'interactions sur 12 mois, tendance | **P1** | D-A, D-F | 🟡 dérivable de `interactions` |
| C5.6 | **Documents produits** (pitchs, propositions, comptes rendus) | **P2** | D-D | 🟢 `intelligence_documents` (87) |
| C5.7 | **Références activables** : comptes similaires gagnés, projets référençables | **P1** | D-C | ⚠️ `projects.ref_status` — 3 projets |
| C5.8 | **Motif de perte structurel** (prix / profil / référencement / timing) agrégé | **P1** | D-A, D-E | ⛔ non agrégé |

---

### C6 — CAPACITÉ À SERVIR : le fit Kredo

| # | Information | Niv. | Décision | État actuel |
|---|---|:-:|:-:|---|
| C6.1 | **Adéquation practice ↔ besoin** (8 practices Kredo) | **P0** | D-C | ⚠️ `account_issues.kredo_fit` existe (9 comptes) ; `missions.practice` reste du **texte libre sans FK** |
| C6.2 | **Disponibilité des profils** correspondants (intercontrat, fins de mission) | **P1** | D-C, D-D | 🟢 `collaborators` + CRA + `collaborator_absences` |
| C6.3 | **Grille tarifaire** practice × type d'engagement × profil, confrontée au TJM du compte | **P1** | D-E | 🟢 `offer_pricing_grids` (120 lignes) |
| C6.4 | **Accord tarifaire contractuel** propre au compte | **P1** | D-E | 🔴 `client_pricing_agreements` = **0 ligne** |
| C6.5 | **Capacité géographique** à staffer sur site | **P1** | D-C | ⚠️ dérivable |
| C6.6 | **Compétences internes rares** correspondant à la stack du compte | **P2** | D-C | 🟢 `person_skills` (271) |

---

### C7 — IDENTITÉ ET SOLIDITÉ : le socle administratif

*Nécessaire, jamais suffisant. C'est là que vit 90 % de la production actuelle de `intel-030`.*

| # | Information | Niv. | Décision | État actuel |
|---|---|:-:|:-:|---|
| C7.1 | **Entité juridique retenue** (groupe vs entité qui contracte) — arbitrage explicite | **P1** | D-B, D-E | ⚠️ posé par le README A7, non porté en base |
| C7.2 | **SIREN, NAF, forme juridique, date de création** | **P1** | D-B | 🟢 37 SIREN / 112 comptes · 36 NAF · faits `legal_id` (56) |
| C7.3 | **Effectif et CA**, avec la maille (entité vs groupe) et la date | **P1** | D-A | ⚠️ 75 effectifs / 66 CA — **incohérences non détectées** (Ciffreo Bona : 1 300 au CRM vs 250-499 INSEE) |
| C7.4 | **Santé financière** : résultat, capitaux propres, retards de paiement, procédure collective | **P1** | D-A, D-E | ⛔ absent — *risque client jamais évalué* |
| C7.5 | **Établissements et implantations** | **P2** | D-C | ⚠️ 40 faits `establishment_count` / 35 `establishment` |
| C7.6 | **Appartenance à un groupe, actionnariat** | **P2** | D-B | ⚠️ faits `partner` (47) |
| C7.7 | **Convention collective (IDCC)** | **P3** | — | 🟢 50 faits — *produit, jamais utilisé par personne* |

---

### C8 — CONTEXTE MARCHÉ ET CONCURRENCE : le décor argumentaire

*Utile en rendez-vous, jamais décisif pour agir. À mutualiser au segment, pas à régénérer par
compte.*

| # | Information | Niv. | Décision | État actuel |
|---|---|:-:|:-:|---|
| C8.1 | **Positionnement du compte dans son marché** | **P2** | D-D | 🟢 39 faits `market_position` + `competitive_map_entries` (23) |
| C8.2 | **Concurrents directs du compte** | **P2** | D-D | ⚠️ 9 faits `competitor` |
| C8.3 | **Chaîne de valeur et dépendances** | **P2** | D-D | ⚠️ `value_chain_*` — 1 secteur (BTP) |
| C8.4 | **Pain points sectoriels** | **P2** | D-C | 🟢 `sector_pain_points` via segment |
| C8.5 | **Réglementation sectorielle en vigueur** | **P2** | D-D | 🟢 `sector_regulatory_items` |
| C8.6 | **Discours institutionnel, raison d'être, ambitions affichées** | **P3** | — | ⚠️ produit par V3 (`policy_and_ambitions`), vide en pratique |
| C8.7 | **Actualité corporate sans lien avec un achat** | **P3** | — | 🔴 460 signaux `folio_news_item` — **le plus gros volume de la base, la plus faible valeur** |

---

## 6. Le verdict de couverture

| Catégorie | Poids décisionnel | Couverture actuelle | Couvert par `intel-030` V3 |
|---|:-:|:-:|:-:|
| **C1 — Adressabilité** | ★★★★★ | **~5 %** | **0 %** |
| **C2 — Organisation de la décision** | ★★★★★ | ~35 % (non structuré) | **0 %** (bloc retiré) |
| **C3 — Besoin et demande** | ★★★★☆ | ~25 % | ~5 % |
| **C4 — Timing** | ★★★★☆ | ~30 % | **0 %** (`trends_and_news` vide) |
| **C5 — Notre position** | ★★★★☆ | ~80 % en base, **~10 % restitué** | **0 %** (bloc retiré) |
| **C6 — Capacité à servir** | ★★★☆☆ | ~50 % | 0 % |
| **C7 — Identité et solidité** | ★★☆☆☆ | ~45 % | **~85 %** |
| **C8 — Contexte marché** | ★★☆☆☆ | ~40 % | ~15 % (théorique) |

> **Le workflow couvre C7 et C8 — les deux catégories les moins décisives — et rien d'autre.**
> C'est la formulation exacte de la déception.

---

## 7. Faire parler la donnée : quatre lectures dérivées, jamais stockées

L'objectif final n'est pas d'afficher huit catégories : c'est d'en tirer **quatre verdicts** qui
tiennent en une phrase chacun, calculés, jamais rédigés par un LLM, chacun accompagné de ce qui
lui manque pour être fiable.

| Lecture | Question | Alimentée par | Forme |
|---|---|---|---|
| **L1 — Verdict d'adressabilité** | Peut-on vendre ici, et à quelle condition ? | C1 + C7.4 + C6.1 | `adressable` · `sous condition (référencement)` · `fermé jusqu'à <date>` · **`indéterminé — N informations P0 manquantes`** |
| **L2 — Porte d'entrée** | Par qui commencer ? | C2 + C5.2 + C5.5 | 1 contact nommé + rôle + niveau de relation + date du dernier contact |
| **L3 — Fenêtre de tir** | Pourquoi maintenant ? | C4 + C3.1 + C3.2 | 1 événement daté + son échéance + son implication commerciale |
| **L4 — Angle Kredo** | Quoi proposer et à quel prix ? | C3 × C6 + C5.1 + C5.8 | practice + profil + fourchette de TJM historique du compte |

Trois règles non négociables pour ces lectures :

1. **Une case P0 vide n'est pas un blanc, c'est une tâche.** L'interface doit afficher
   « inconnu → *qualifier le canal d'achat* » avec un bouton de saisie. C'est le seul moyen de
   passer de 5 % à 60 % de couverture sur C1, et aucun LLM ne le fera à notre place.
2. **La connaissance interne est une preuve de premier rang.** Un fait dont la source est
   « Guillaume, réunion du 12/03 » vaut mieux qu'une paraphrase de code NAF. Le mécanisme de
   `Claim` doit accepter une source de type `human_verified` **sans dégrader la confiance**, et
   le CRM (`internal_crm`) doit rester citable — c'est déjà le cas, mais V3 n'en fait rien.
3. **Aucune lecture dérivée n'est stockée.** Ce sont des vues sur l'état courant, recalculées.
   Une roadmap figée le jour d'un run est fausse le lendemain.

---

## 8. Ce que devient `intel-030` (esquisse, à instruire)

L'audit conduit à trois déplacements, énoncés ici sans engagement d'implémentation :

1. **Cesser de produire une encyclopédie.** C7 et C8 sont des sous-produits déterministes du
   scan (`intel-010`) et de la connaissance sectorielle (segment) — pas la matière d'une étude
   rédigée par LLM, encore moins vérifiée par un second appel LLM.
2. **Renverser le rapport recherche / capture.** C1 et C2, les deux catégories les plus
   décisives, se **saisissent**. Le chantier prioritaire est un formulaire de qualification, pas
   un workflow de collecte.
3. **Restituer ce qui existe déjà.** C5 est en base à ~80 % et à l'écran à ~10 %. Zéro appel LLM,
   zéro collecte externe, gain immédiat.

Le chantier 2 (sources) ne devient utile qu'après ce recadrage : chercher mieux les mauvaises
informations ne produira pas de meilleures décisions.

---

## 9. Ce que ce document ne tranche pas

- **Où** trouver chaque information (chantier 2, explicitement hors périmètre).
- Le **schéma de stockage** : aucune table nouvelle n'est proposée ici. `account_facts` porte
  déjà une taxonomie extensible de 25 types ; C1 et C2 y logeraient probablement sans migration
  structurelle, sous réserve d'instruction.
- Le **sort des artefacts V1/V2/V3 déjà produits** (17 en base) : ils restent lisibles, la
  question de leur remplacement est un lot à part.
- La **maille compte** : entité juridique ou groupe. Arbitrage ouvert, déjà signalé par le
  README A7 et par le champ `entite_retenue` de `02-socle.json`. Il conditionne C7.1, C1.5 et
  C3.2 — à trancher avant toute collecte.
