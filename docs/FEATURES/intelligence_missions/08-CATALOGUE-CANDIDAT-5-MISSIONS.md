# 08 — Carte fonctionnelle de l'intelligence Kredo et catalogue candidat (5 missions)

> **Nature** : note de cadrage produit, soumise à évaluation. **Aucun code, aucune migration, aucun JSON n8n n'a été touché.**
> **Date** : 2026-08-24 · **HEAD** : `5744983e` (`fix(database): neutralize account global scores`)
> **Autorité normative** : `docs/adr/ADR-0020-missions-intelligence.md` (décisions M-1 à M-7). En cas de divergence, l'ADR fait foi.
> **Méthode** : lecture des 8 documents de `docs/FEATURES/intelligence_missions/`, du code de `src/features/intelligence-missions/`, du registre `src/lib/intelligence/intelligence-registry.ts`, des 20 JSON de `n8n/workflows/`, des chantiers `DYNAMIC_PLAYBOOKS`, `dynamic_content_generator`, `account_global_scores_removal`, `master-study` — et **comptages live du 2026-08-24** sur `jvzgmhvwirsbdkjpmvla`. Tout chiffre cité ici est mesuré, pas repris d'un document antérieur.

---

## 1. Ce que je retiens de l'état du chantier

Le moteur est **livré et prouvé de bout en bout**, catalogue compris : contrairement à ce que dit encore le README du dossier, `mission-catalog.ts` porte **deux** presets — `veille-analyse-mensuelle` (v3) et `rentabilite-portefeuille` (v1). Les sept runs `mission:%` en base confirment le pilote L6.5 réussi.

Le coût marginal d'une mission supplémentaire est donc, aujourd'hui :

| Brique | Coût réel |
|---|---|
| Workflow n8n | **0** — `mission-001-run.json` est générique et figé |
| Import VPS | **0** |
| Migration | **0** — `MissionReportV1` + `mission_report` couvrent tout (M-7) |
| Contrat de sortie | **0** — aucune mission ne configure son schéma |
| Provider de corpus | 1 fichier + 1 valeur de `CorpusKind` + 4 sites à patcher |
| Preset | 1 entrée de catalogue |
| Branchement cockpit | 1 ligne dans `MISSION_COMPOSER_ACTION_CONFIGS` |

C'est ce qui rend la question « quelles missions ensuite » légitime : **ce n'est plus une question d'architecture, c'est une question de choix de cas d'usage.**

### 1.1 Deux contraintes structurelles à connaître avant de lire la suite

**(a) Le composeur ne sait sélectionner qu'un mois.** `MissionComposerConfig.buildSelectors` a la signature `(month: string) => CorpusSelector[]`, et les deux composeurs (Desktop et Mobile) rendent un `<input type="month">`. Toute mission dont le corpus se choisit autrement (un compte, un trimestre, une sélection) exige d'abord de **généraliser le composeur**. Le serveur, lui, est prêt : `parseCorpusSelector` accepte déjà `account_context` et `resolveMissionRunEntity` sait rattacher le run au compte pivot.

**(b) Un provider de corpus existe et n'est utilisé par aucune mission** : `account_context` (poids 90), qui hydrate compte + signaux actifs + contacts, ligne à ligne et citables. Il a été écrit, testé et durci en L1, puis jamais consommé — les deux presets prennent `veille_period` et `delivery_period`. C'est de l'actif immobilisé.

---

## 2. Carte fonctionnelle : ce que Kredo couvre déjà

J'ai classé les surfaces « analyse / intelligence » par **nature de l'opération**, pas par module. C'est la seule grille qui fait apparaître les trous.

### 2.1 Production de discours — **saturé**

| Surface | Ce qu'elle fait |
|---|---|
| **INTEL-020 / rédaction assistée** | ~50 scénarios sur 6 catégories d'activité (`commerce_prospection`, `commerce_actif`, `delivery`, `recrutement`, `management_consultants`, `internal_staff`). Sortie : `written_message` \| `spoken_pitch` \| `structured_briefing`. **106 runs**, le workflow le plus utilisé après `intel-010`. |
| **Dynamic Playbooks (LOT 0→6, août 2026)** | Battle Cards interactives : compte + persona + enjeu + angle + offre + objection → pitch situé. Branché sur INTEL-020, pas un nouveau moteur. |
| **Hub compte — étape 5 (pitch)** | `intel-032` produit le mapping enjeu↔offre et les angles ; INTEL-020 produit le texte. |

> **Conclusion : toute idée de mission qui se termine par « … et rédiger le message » est une duplication.** Le moteur de missions ne doit jamais produire un livrable destiné à un destinataire externe.

### 2.2 Connaissance d'un compte unitaire — **bien couvert, et cadenassé**

La chaîne ADR-0012 en 5 étapes : `intel-030` (connaissance sourcée, Claims), `intel-031` (cartographie des enjeux → matérialise `account_issues`), `intel-032` (stratégie), plus `intel-010` (enrichissement CRM, 177 runs), `intel-033` (veille compte), `intel-034` (vérification de signaux), `report-account-summary` (fiche factuelle).

Volumes live : 46 `account_issues` sur **8 comptes**, 28 runs `intel-030`, 841 `account_signals`.

> **Angle mort assumé, écrit noir sur blanc dans le handoff L6 §2.3 : ce hub « ne voit ni CRA, ni CJM, ni P&L ».** Il connaît le compte comme prospect, jamais comme client livré. C'est le trou n°1 de cette carte.

### 2.3 Connaissance sectorielle — **couvert, et gouverné ailleurs**

MASTER-STUDY (autorité unique), 53 fiches `sector_intelligence`, résolution segment→macro en SQL, 23 entrées de cartographie concurrentielle, chaîne de valeur, playbooks sectoriels, Business Intelligence (accueil segment, chapitres, scatter comptes).

> **Ne pas y toucher avec une mission.** Le corpus de sources administrées compte **2 `source_corpora`** ; une mission branchée là produirait un livrable sur le vide, et empiéterait sur un chantier qui a sa propre gouvernance et ses propres gates.

### 2.4 Reporting périodique à périmètre figé — **couvert, mais rigide**

`report-activity-commercial` (9 runs), `report-activity-recruitment`, `report-manager-summary`, `report-weekly-manager` (16 runs, + cron), `intel-040-workspace-diagnostic` (10 runs, lecture de management sur 5 axes commerce/delivery/finance/équipe/recrutement).

Tous partagent la même doctrine : **des FAITS pré-calculés en SQL, le LLM rédige la synthèse sans recalculer.** C'est exactement la doctrine des missions — mais avec un workflow chacun, un périmètre gelé, et un import VPS manuel à chaque évolution.

> Ils **comptent** et **décrivent**. Aucun n'**impute** une cause ni ne cite une source vérifiable ligne à ligne.

### 2.5 Calcul déterministe — **couvert, et hors périmètre LLM (P6)**

Matching staffing (`compute-match.ts`, **573 `match_scores`**), modélisation financière (`financial_models`), scoring de signaux (`urgency/relevance/potential_value` par signal), P&L et marges en colonnes GÉNÉRÉES, brief hebdo « calculé, pas deviné ».

### 2.6 Le cache-misère mesuré

Le constat du handoff L6 §2.2 tient toujours au 2026-08-24, à une exception près : sur les **33 actions** du registre d'intelligence, **20 déclarent une intention d'ANALYSE** et sont routées vers le composeur de RÉDACTION ou marquées `coming_soon`.

`analyze_margins` a été rebranché en L6.4 — c'est aujourd'hui la seule action-mission d'analyse du registre, avec `monthly_watch_mission`. Restent notamment :

| Action | Statut réel |
|---|---|
| `prioritize_accounts` | `coming_soon` |
| `forecast_availability` | `coming_soon` |
| `analyze_skill_gaps`, `suggest_training` | `coming_soon` |
| `detect_anomalies`, `project_portfolio_review` | `coming_soon` |
| `analyze_funnel` | `active` → composeur de rédaction, scénario `recruiter_briefing_pre_interview` |
| `forecast_revenue`, `pipeline_insights`, `detect_risks` | `active` → composeur de rédaction |

---

## 3. Les trous — et leur matière disponible

Un trou ne compte que s'il a du corpus. Comptages live du **2026-08-24** :

| Trou fonctionnel | Corpus disponible | Verdict |
|---|---|---|
| **Priorisation du portefeuille de prospection** | 112 comptes (105 prospects), **841 signaux** dont **119 détectés sur 60 j** touchant 14 comptes, 183 interactions, 642 contacts, 45 enjeux ouverts | 🟢 riche |
| **Compte client vu à 360° (relation × exécution)** | 6 clients actifs, 33 missions (26 actives), 227 CRA, 183 interactions, signaux, contacts | 🟢 suffisant, à forte valeur unitaire |
| **Anticipation staffing / risque de banc** | 30 collaborateurs (26 en mission, 3 intercontrat), 11 missions à date de fin future (prochaine 2026-09-01), **16 missions sans date de fin**, 88 absences, 271 `person_skills` | 🟡 réel mais troué — l'angle mort fait partie du livrable |
| **Apprentissage commercial (gagné/perdu)** | **27 affaires clôturées sur 12 mois** (15 gagnées / 7 perdues / 5 abandonnées), 39 présentations de profils, 55 besoins en compétences, 132 interactions rattachées à un compte | 🟢 suffisant |
| **Performance du funnel de recrutement** | 34 process, **137 jalons**, 42 candidats, 6 étapes peuplées | 🟡 mince mais exploitable |
| Analyse sectorielle à la demande | 2 `source_corpora`, 14 `content_collections` | 🔴 vide — **exclu** |
| Revue de portefeuille projets | **3 projets** | 🔴 vide — **exclu** |
| Priorisation du pipe ouvert | **2 opportunités ouvertes** | 🔴 vide — **exclu**, et la question utile est ailleurs (cf. mission #4) |

### 3.1 Le trou qui vient de s'ouvrir, et qui décide du classement

Le commit HEAD `5744983e` (LOT 1, `account_global_scores_removal`) **retire du runtime toute note synthétique de potentiel, valeur, conviction ou priorité d'un compte — sans créer de score de remplacement**, c'est écrit explicitement.

Conséquence directe, non compensée à ce jour : **plus rien dans Kredo ne répond à « par quel compte je commence lundi matin ».** Le tri repose désormais sur des « critères factuels successifs » (actions dépassées, signaux urgents, inactivité, date, puis nom). C'est honnête, ce n'est pas une réponse commerciale.

Et c'est précisément la forme de réponse que le moteur de missions sait produire, et que le score ne savait pas : **un jugement argumenté, imputé à un compte nommé et adossé à des sources citées** — au lieu d'un nombre opaque. La mission ne réintroduit pas le score qu'on vient de retirer ; elle occupe la place que ce retrait a laissée vide, avec un objet de nature différente.

---

## 4. Filtres appliqués pour retenir 5 missions

| # | Filtre | Origine |
|---|---|---|
| F1 | **Non-redondance prouvée** feature par feature (INTEL-020, hub compte, Playbooks, `report-*`, INTEL-040) | Handoff L6 §6 — « une capacité déjà servie n'est pas une mission, c'est une duplication » |
| F2 | **Corpus réellement peuplé**, mesuré live | Audit `01` §9 — le premier périmètre proposé par la vision était le moins peuplé de la base |
| F3 | **`MissionReportV1` inchangé** — aucune catégorie de `Finding` ajoutée, aucun `resultType` | ADR-0020 M-7 |
| F4 | **Ni n8n, ni migration** | Test de sortie du chantier, vérifié en L6 |
| F5 | **Le livrable déclenche une décision** : tout constat imputé à une entité nommée, toute recommandation datée d'un horizon | Vision §3.1 — « analyser sans objectif est une instruction incomplète » |
| F6 | **Corpus numérique = pré-calcul obligatoire côté provider** + règle anti-recalcul dans `constraints.rules` | Handoff L6 §4.4 — applicable à 4 des 5 missions retenues |

---

## 5. Les 5 missions retenues

Classées par **valeur métier rapportée au coût de livraison**.

---

### Mission #1 — `activation-portefeuille` · Activation du portefeuille de prospection

**Finalité.** Répondre à la seule question qu'un commercial se pose vraiment le lundi matin : *sur quels comptes je mets mon énergie cette semaine, et pourquoi ceux-là.*

**Périmètre fonctionnel.**
À partir des signaux d'achat détectés sur une fenêtre d'un mois, des comptes qu'ils touchent, de la fraîcheur de la relation et des enjeux déjà cartographiés : désigner **au plus 8 comptes à activer maintenant**, chacun avec son déclencheur, son angle d'entrée et son interlocuteur pressenti. Sont explicitement hors périmètre : la rédaction du message (INTEL-020), la construction du pitch (Playbooks), la production de connaissance sur le compte (hub ADR-0012).

**Corpus** — nouveau `CorpusKind : prospection_window { periodStart, periodEnd }`, exécution `user_rls`, poids proposé **85** :

| Source | Grain d'un `CorpusItem` |
|---|---|
| `v_active_account_signals` (défensive : exclut archivés/rejetés et > 2 mois) | 1 item par signal, avec `signal_category`, `urgency_score`, `relevance_score`, `score_justification`, `recommended_action` |
| `companies` | 1 item par compte touché (segment, classification, `relation_type`, `lifecycle_status`) |
| `interactions` | 1 item par dernière interaction connue du compte, ou une ligne « aucune interaction depuis N jours » |
| `contacts` (décideurs / prescripteurs) | 1 item par interlocuteur identifié sur les comptes touchés |
| `account_issues` (status `open`) | 1 item par enjeu déjà cartographié |

**🔴 Contrainte non négociable, héritée du LOT 1** : le provider **ne somme jamais** les scores de signaux d'un même compte et ne produit **aucune note par compte**. Il expose les scores tels quels, signal par signal, comme faits sourcés. Le classement produit par la mission est un **ordre argumenté**, pas un score reconstitué par la bande. À écrire dans `constraints.rules` et à couvrir par un test de provider.

**Articulation avec l'existant.**
- **En amont** : consomme la production de `intel-033` (veille compte), `intel-034` (vérification de signaux) et du backfill FOLIO. Ces workflows produisent des signaux que personne ne synthétise aujourd'hui à l'échelle du portefeuille.
- **En aval** : chaque compte retenu bascule vers Dynamic Playbooks (situation → pitch) puis INTEL-020 (rédaction). La mission devient **l'entrée du tunnel** dont les Playbooks sont le milieu.
- **Ne recouvre pas** INTEL-040 : celui-ci lit le workspace sur 5 axes, il ne classe aucun compte.
- **Branchement cockpit** : `prioritize_accounts`, aujourd'hui `coming_soon`, sur `/prospection` et `/prospection/accounts`.

**Livrable attendu** — `MissionReportV1`, `mission_report`, archivé dans `intelligence_documents` :
- `executiveSummary` (≤ 8 phrases) : où concentrer l'effort ce mois, et ce qu'il faut cesser de travailler ;
- `findings` (≤ 8) : un compte nommé par constat, catégories `opportunite` / `risque` / `signal_faible`, chacun cité sur au moins un signal ou une interaction identifiée ;
- `recommendations` (≤ 5) : compte + interlocuteur + angle, `horizon` ∈ `immediate` / `30_days` ;
- `sourceRefs` : les signaux et interactions réellement mobilisés.

**Valeur métier.** La plus élevée du catalogue, pour trois raisons cumulées : le besoin est quotidien et non couvert ; le trou vient d'être creusé volontairement par le LOT 1 ; le corpus est le plus riche de la base (841 signaux, 119 frais). Et c'est la mission qui alimente toutes les autres surfaces commerciales déjà construites.

**Coût.** Le plus faible : 1 provider, 1 preset, 1 ligne de mapping. **Le sélecteur est un mois — aucun travail sur le composeur.**

**Risque.** Un rapport qui se contente de recopier les signaux les mieux notés. Critère de sortie falsifiable à poser : *le rapport doit écarter explicitement au moins un compte à signal fort pour une raison relationnelle ou de classification, et le dire.*

---

### Mission #2 — `revue-compte-client` · Revue de compte client (relation × exécution)

**Finalité.** Voir un client actif comme un tout : la relation commerciale **et** la réalité de ce qu'on lui livre. Aujourd'hui les deux moitiés ne se rencontrent nulle part dans Kredo.

**Périmètre fonctionnel.**
Pour un compte client : croiser l'exécution (missions en cours, CRA, marge par mission, dates de fin, alertes de rentabilité) et la relation (interactions, contacts, signaux, enjeux ouverts) pour produire trois choses — l'état de santé de la relation, le risque de non-renouvellement daté, et les leviers d'extension étayés. Hors périmètre : le pitch d'extension, la fiche factuelle (`report-account-summary`), la connaissance prospect (`intel-030`).

**Corpus** — `account_context` (**provider existant, jamais consommé**, poids 90) **+** nouveau `CorpusKind : account_delivery { companyId }`, poids proposé **92** :

| Source | Grain |
|---|---|
| `missions` du compte | 1 item par mission (TJM, CJM, `gross_margin_pct` **généré**, dates, practice) |
| `mission_activity_reports` | 1 item par CRA × mois sur 6 mois (jours facturables, taux d'activité — colonnes générées) |
| `v_profitability_alerts` | 1 item par ligne portant au moins une alerte |
| `v_mission_quarterly_revenue` | 1 item par mission × trimestre |

**🔴 Reprendre à l'identique l'exclusion de colonne de `delivery-period-provider.ts`** : ni `gross_annual`, ni `charges_rate`, ni `working_days_per_year`. La raison n'est pas la RLS du lanceur — c'est que le livrable atterrit dans `intelligence_documents`, à **RLS workspace standard**, lisible par un `viewer`. Handoff L6 §4.3.

**Articulation avec l'existant.**
- **Comble l'angle mort déclaré du hub ADR-0012** : « ne voit ni CRA, ni CJM, ni P&L ».
- **Complète la mission `rentabilite-portefeuille`** sans la recouper : celle-là regarde le centre de profit par le haut sur un mois ; celle-ci regarde **un compte** sur son historique. L'une trouve la dérive, l'autre la traite.
- **Réutilise le pivot compte déjà implémenté** : `resolveMissionRunEntity` rattache déjà le run à `entityType: "company"` dès qu'un item `account_context/companies` est présent. Le rapport apparaît donc automatiquement sur la fiche compte.
- **Branchement cockpit** : mode Entité `company`, et `/prospection/accounts/[companyId]`.

**Livrable attendu.** `MissionReportV1` — `executiveSummary` tranchant sur la santé du compte ; `findings` (≤ 8) en `risque` / `opportunite` / `tendance`, chacun imputé à une mission ou un consultant nommé ; `recommendations` (≤ 5) avec `horizon`, typiquement : renégociation de TJM, anticipation de fin de mission, extension sur une practice voisine.

**Valeur métier.** La plus forte valeur unitaire du catalogue : **6 clients actifs portent 26 missions actives**, c'est-à-dire la totalité du CA récurrent. Un non-renouvellement non anticipé coûte plusieurs mois de marge — et le décrochage de juillet 2026 (−19,26 pts de marge brute, cf. L6.5) montre que ce risque est réel, pas théorique.

**Coût.** Le plus élevé des cinq : 1 provider **+ la généralisation du composeur** à un sélecteur d'entité. C'est un investissement à amortir sur toutes les missions entity-scoped futures, pas un coût propre à celle-ci — mais il doit être payé ici.

**Risque.** Deux corpus de natures différentes (prose + nombres) dans une même mission : le budget doit garantir que la partie chiffrée ne tombe pas par troncature — d'où le poids 92, au-dessus d'`account_context`.

---

### Mission #3 — `capacite-staffing` · Couverture staffing et risque de banc

**Finalité.** Voir venir l'intercontrat au lieu de le constater. En ESN, le banc est le premier destructeur de marge, et il est **toujours prévisible** — les dates de fin de mission et les congés sont en base.

**Périmètre fonctionnel.**
Sur le mois analysé et les 3 mois à venir : identifier qui va se libérer, ce que ça coûte, quelles compétences deviennent disponibles, et sur quels besoins ouverts les repositionner. **Le livrable doit nommer explicitement l'angle mort du corpus** — 16 des 33 missions n'ont pas de date de fin — plutôt que de le traiter comme une absence de risque. Hors périmètre : le matching besoin↔profil (moteur déterministe, 573 `match_scores`), qui reste la brique appelée après.

**Corpus** — nouveau `CorpusKind : staffing_horizon { periodStart, periodEnd }`, poids proposé **90** :

| Source | Grain |
|---|---|
| `collaborators` + `missions` | 1 item par consultant : statut, mission courante, date de fin ou mention explicite « sans date de fin » |
| `collaborator_absences` | 1 item par absence recouvrant l'horizon |
| `v_collaborator_ytd_activity` | 1 item par consultant : taux d'activité YTD, écart au TACI cible (déjà calculés) |
| `person_skills` agrégées | 1 item par consultant : compétences niveau ≥ 3 |
| `opportunities` ouvertes + `opportunity_skills` | 1 item par besoin ouvert |

**Articulation avec l'existant.**
- Débloque `forecast_availability`, `coming_soon` depuis l'origine.
- **Miroir temporel de `rentabilite-portefeuille`** : celle-ci explique la marge passée, celle-là prévient la marge future. Même famille de corpus, question inversée.
- Alimente `/consultants/activite-conges` et `/missions/opps` ; s'arrête où commence le matching déterministe.

**Livrable attendu.** `MissionReportV1` — `findings` en `risque` (consultant nommé, date de disponibilité, coût de banc estimé **lu, pas calculé**) et `signal_faible` (baisse de taux d'activité, absences concentrées) ; `recommendations` avec `horizon`, en repositionnement ou en anticipation commerciale.

**Valeur métier.** Élevée. 3 consultants en intercontrat et 11 fins de mission datées, sur un effectif de 30 : chaque mois de banc évité vaut ~20 jours × TJM. La mission transforme une donnée déjà en base en anticipation.

**Coût.** 1 provider (le plus large des cinq, 5 sources) + 1 preset. **Sélecteur = un mois** — pas de travail composeur, l'horizon glissant est dérivé côté serveur, comme la profondeur d'historique de `delivery_period` (décision D-5 du L6).

**Risque.** Corpus troué (16 missions sans date de fin). C'est la raison pour laquelle « nommer l'angle mort » entre dans le critère de sortie : un rapport qui conclut « aucun risque de banc » sur un corpus incomplet est un échec, pas un bon résultat.

---

### Mission #4 — `post-mortem-commercial` · Post-mortem des affaires clôturées

**Finalité.** Apprendre de ce qui s'est joué. Kredo compte les affaires gagnées et perdues ; rien n'explique **pourquoi**, ni ne dit ce qu'il faut corriger.

**Périmètre fonctionnel.**
Sur une fenêtre (un trimestre) : les opportunités clôturées, leur historique d'interactions, les profils présentés, les compétences demandées, les TJM cibles, les délais entre étapes → dégager les causes récurrentes, ce qui distingue structurellement un gain d'une perte, et les correctifs à appliquer. Hors périmètre : la priorisation du pipe ouvert — avec **2 opportunités ouvertes**, cette question n'a pas de matière et n'est de toute façon pas la bonne.

**Corpus** — nouveau `CorpusKind : pipeline_period { periodStart, periodEnd }`, poids proposé **80** :

| Source | Grain |
|---|---|
| `opportunities` clôturées sur la fenêtre | 1 item par affaire (stage final, `opportunity_type`, `acv` et `weighted_gain` **générés**, TJM cible, durée) |
| `interactions` rattachées | 1 item par interaction (type, sentiment, date) |
| `opportunity_candidates` | 1 item par profil présenté et son statut de présentation |
| `opportunity_skills` | 1 item par besoin en compétences (importance, niveau minimum) |
| `companies` des affaires | 1 item de référentiel par compte concerné |

**Articulation avec l'existant.**
- `report-activity-commercial` **compte** les volumes sur une période ; cette mission **impute** des causes. Périmètres disjoints, même famille de données.
- Complète la mission #1 : l'une décide où aller, l'autre dit ce qu'on a mal fait la dernière fois — et l'une alimente l'autre à chaque cycle.
- Branchement : `/missions/opps` (`prioritize_pipeline`, à requalifier honnêtement) ou une action dédiée.

**Livrable attendu.** `MissionReportV1` — `findings` en `tendance` (motifs récurrents de perte), `risque` (délais, dépendance à un type d'affaire), `opportunite` (ce qui gagne réellement) ; `recommendations` correctives à `horizon` `30_days` / `quarter`.

**Valeur métier.** Réelle mais différée : c'est de l'apprentissage, pas de l'action immédiate. Elle monte fortement dès que le pipe se repeuple — et elle est **le seul dispositif d'apprentissage commercial du produit**, ce qui justifie sa présence dans les cinq.

**Coût.** 1 provider + 1 preset, plus une extension mineure du composeur (granularité trimestre en plus du mois).

**Risque.** 27 affaires sur 12 mois, dont 5 abandonnées : suffisant pour dégager des motifs, insuffisant pour une statistique. La règle de prompt doit interdire toute généralisation quantitative (« X % des pertes ») et n'autoriser que des constats nominatifs.

---

### Mission #5 — `funnel-recrutement` · Performance du funnel de recrutement

**Finalité.** Savoir où le recrutement bloque. En ESN, le recrutement conditionne le staffing, donc le CA : un funnel qui perd ses candidats à l'étape technique coûte des missions non staffées.

**Périmètre fonctionnel.**
Sur une fenêtre : les process de recrutement et leurs jalons, les délais entre étapes, les sorties et leurs causes, les profils recherchés au regard du vivier → nommer les étapes qui bloquent, les délais anormaux, les profils sur lesquels on échoue systématiquement. Hors périmètre : la rédaction du brief recruteur (INTEL-020), le matching candidat↔besoin (déterministe).

**Corpus** — nouveau `CorpusKind : hiring_period { periodStart, periodEnd }`, poids proposé **75** :

| Source | Grain |
|---|---|
| `candidate_hiring_processes` | 1 item par process (étape courante, dates) |
| `candidate_hiring_milestones` | 1 item par jalon, avec délai depuis le jalon précédent **pré-calculé** |
| `candidates` + `job_profiles` | 1 item de référentiel par candidat (profil, TJM attendu, practice) |
| `opportunity_candidates` | 1 item par présentation client et son issue |

**Articulation avec l'existant.**
- Requalifie `analyze_funnel`, aujourd'hui `active` mais routé vers le composeur de rédaction (scénario `recruiter_briefing_pre_interview`) — le cas le plus net du cache-misère décrit au handoff L6 §2.2, après `analyze_margins` déjà traité.
- `report-activity-recruitment` compte les volumes ; cette mission explique les blocages.
- Alimente la mission #3 : un funnel bloqué est une cause de découverture staffing.

**Livrable attendu.** `MissionReportV1` — `findings` par étape nommée (`risque` sur les étapes de déperdition, `tendance` sur les délais), imputés à un process ou un profil identifié ; `recommendations` à `horizon` `immediate` / `30_days`.

**Valeur métier.** La plus étroite des cinq — un seul métier concerné — mais directement branchée sur la capacité à staffer, donc sur le CA. Elle est retenue parce qu'elle **ferme le dernier axe métier non couvert** de Kredo (commerce, delivery, finance, équipe sont pris par les missions #1 à #4).

**Coût.** 1 provider + 1 preset. Sélecteur = un mois.

**Risque.** Le corpus le plus mince : 34 process, 137 jalons, 6 étapes peuplées. Poser un seuil d'abstention explicite dans `constraints.rules` — sous un nombre de process donné sur la fenêtre, le rapport doit le dire au lieu de conclure.

---

## 6. Synthèse et ordre recommandé

| Rang | Mission | Trou comblé | Corpus | Coût | Composeur |
|---|---|---|---|---|---|
| 1 | `activation-portefeuille` | Priorisation commerciale (LOT 1) | 🟢 riche | Faible | Mois — **rien à faire** |
| 2 | `revue-compte-client` | Compte 360° relation × exécution | 🟢 fort unitaire | **Élevé** | **Sélecteur d'entité à construire** |
| 3 | `capacite-staffing` | Anticipation du banc | 🟡 troué | Moyen | Mois |
| 4 | `post-mortem-commercial` | Apprentissage commercial | 🟢 correct | Faible | + granularité trimestre |
| 5 | `funnel-recrutement` | Blocages du recrutement | 🟡 mince | Faible | Mois |

**Ordre que je recommande, et pourquoi :** **#1, puis #3, puis #2, puis #4, puis #5.**

#1 d'abord parce qu'elle a la plus forte valeur au plus faible coût et qu'elle comble un trou ouvert la semaine dernière. #3 ensuite, avant #2, alors qu'elle vaut moins : elle réutilise la mécanique de fenêtre glissante déjà écrite pour `delivery_period` et se livre sans toucher au composeur — deux missions livrées avant d'engager le seul vrai chantier UI. #2 en troisième position paie alors la généralisation du composeur avec trois presets derrière pour l'amortir, au lieu d'un seul. #4 et #5 ferment la carte.

**Trois missions sur cinq (#1, #3, #5) se livrent exactement comme L6 : sans une ligne de JSON n8n, sans import VPS, sans migration.** #4 ajoute une granularité de période, #2 seule ouvre un chantier UI.

---

## 7. Ce que j'ai écarté, et pourquoi

| Idée | Motif d'exclusion |
|---|---|
| Analyse sectorielle à la demande (cas d'usage n°2 de la vision) | Corpus vide (2 `source_corpora`) **et** territoire gouverné par MASTER-STUDY, avec ses propres gates |
| Préparation de rendez-vous / plan d'attaque compte | Couvert par Dynamic Playbooks (situation → pitch) + INTEL-020 depuis août 2026 |
| Diagnostic transverse du workspace | `intel-040` le fait déjà sur 5 axes, avec cron |
| Revue de portefeuille projets | 3 projets en base |
| Priorisation du pipe ouvert | 2 opportunités ouvertes ; la question utile est le post-mortem (#4) |
| Shortlist candidats expliquée | Le moteur de matching est déterministe (P6) ; le narratif LLM est un lot déjà cadré ailleurs |
| Reprise des 12 workflows métier existants | Hors doctrine : le moteur de missions est une **addition**, pas une refonte (handoff L6 §9) |

---

## 8. Deux points à trancher avant implémentation

1. **La généralisation du composeur est-elle un lot à part entière ?** Elle est le prérequis de toute mission entity-scoped, et le handoff L6.3 avait explicitement refusé de construire un composeur générique de corpus « que deux presets ne justifient pas ». Avec cinq presets dont un entity-scoped, l'arbitrage change — mais il doit être pris, pas subi.

2. **Le catalogue reste-t-il un catalogue, ou devient-il une capacité ouverte ?** À cinq presets, la question « une mission libre partage-t-elle le contrat d'un preset ? » (question ouverte n°2 de la vision fondatrice, jamais tranchée) redevient concrète. Ma position : **rester fermé**. Le prompt et les contraintes sont ce qui garantit qu'un rapport financier ne recalcule aucun ratio et qu'un rapport de prospection ne reconstitue aucun score. Ouvrir le champ libre au lancement, c'est rendre cette garantie facultative.

---

## 9. Ce que ce document ne fait pas

- Il **ne modifie rien** : pas de code, pas de catalogue, pas de migration, pas de JSON n8n.
- Il **ne préjuge pas de la condition d'arrêt** du handoff L6 §6. Celle-ci portait sur l'échec de L6.5 ; L6.5 a réussi (run `mission:rentabilite-portefeuille` en `succeeded`). L'investissement peut donc reprendre — mais chaque mission ci-dessous doit porter, comme L6.5, **son propre critère de sortie falsifiable**, écrit avant le lancement du pilote.
- Il **ne remplace pas un handoff d'implémentation**. Chaque mission retenue exige son propre document, sur le modèle de `07`.
