# Cockpit Intelligence — Cartographie Actions ↔ Process existants

**Date :** 24/08/2026  
**Statut :** audit fonctionnel/technique de référence avant implémentation  
**Branche observée :** `main`  
**Sources :** code GitHub courant + Supabase live + handoffs/ADR canoniques

---

# 1. Objet

Ce document établit, pour chaque **Action** de la matrice produit du futur **Cockpit Intelligence**, si le process métier existe déjà, s’il est partiel, en cours de développement ou à créer.

Il sert à distinguer :

- les actions qui nécessitent uniquement un raccordement UI/contextuel ;
- les actions qui peuvent réutiliser un moteur existant avec un adaptateur léger ;
- les nouvelles capacités métier à développer ;
- les Intelligence Missions déjà engagées mais pas encore présentes dans le catalogue exécutable de `main`.

## Statuts

- **EXISTE** : moteur/process réellement présent et exploitable.
- **PARTIEL** : socle substantiel présent, mais pas exactement l’action cible.
- **EN COURS** : capacité engagée dans le programme Intelligence Missions mais non encore exécutable depuis le catalogue courant.
- **À CRÉER** : aucun process existant ne couvre suffisamment la finalité.

---

# 2. Décisions produit actées le 24/08/2026

## 2.1 « Analyser les prestations »

**Décision :** l’action **« Intel Mission : Analyser les prestations »** correspond à la mission existante :

`rentabilite-portefeuille`

Il ne faut donc pas créer une nouvelle mission dédiée.

Cette mission analyse la rentabilité financière et opérationnelle du portefeuille, identifie les dérives par mission/client/consultant et produit des recommandations sourcées.

## 2.2 Recrutement — « Candidats VS besoins » renommé « Compétences VS Besoins »

Le libellé **« Candidats VS besoins »** était ambigu et ne correspondait pas à la finalité souhaitée.

Le libellé canonique devient :

> **Compétences VS Besoins**

Finalité : comparer la **capacité réellement sourcée/recrutée/qualifiée par KREDO** à la **demande réellement reçue et traitée**.

### Offre de compétences à synthétiser

Agrégation de :

- collaborateurs ;
- candidats ;
- vivier qualifié ;
- compétences associées ;
- practices ;
- niveaux/séniorités lorsque disponibles.

Exemples de sorties :

- top 5 profils les plus représentés ;
- top 5 compétences les plus fréquentes ;
- practice la plus représentée ;
- densité du vivier par famille de compétences ;
- couverture / rareté relative.

### Demande à comparer

Besoins/opportunités réellement reçus et traités sur une période de référence.

**Recommandation de période :**

- référence principale : **12 mois glissants**, suffisamment robuste pour éviter de sur-réagir à quelques besoins ponctuels ;
- lecture de tendance : **90 derniers jours**, afin de détecter une accélération ou un changement récent du marché adressé.

### Objectif métier

Évaluer si les efforts de sourcing, recrutement et spécialisation sont cohérents avec la réalité des besoins commerciaux KREDO.

L’expérience cible est dans l’esprit de la section **Marché** du Pool de compétences : matrice offre/demande/tension + rail des compétences/profils les plus significatifs.

Il ne faut pas créer un second moteur de matching opportunité → profils : cette action est une **analyse portefeuille offre de compétences ↔ demande marché**, pas un matching individuel.

## 2.3 Rapport technique Automatisations — dette critique

Le générateur actuel :

`src/app/api/reports/technical/generate/route.ts`

contient encore un fallback de démonstration lorsque aucun run n’est trouvé : il injecte artificiellement des volumes, succès/échecs, coûts et alertes.

**Décision : à supprimer avant d’exposer « Générer un rapport » comme action de production dans le Cockpit Intelligence.**

Aucune donnée simulée ne doit être substituée à une absence de données réelles.

---

# 3. Intelligence Missions — état réel du catalogue

Le moteur générique Intelligence Missions existe et doit être réutilisé.

Le catalogue exécutable de `main` contient actuellement :

1. `veille-analyse-mensuelle` ;
2. `rentabilite-portefeuille`.

Les 5 nouvelles missions prévues sont **en cours de développement** et ne doivent pas être considérées comme actives tant qu’elles n’ont pas rejoint le catalogue exécutable et passé leur QA :

1. `activation-portefeuille` ;
2. `capacite-staffing` ;
3. `revue-compte-client` ;
4. `post-mortem-commercial` ;
5. `funnel-recrutement`.

---

# 4. Audit par page

## 4.1 Cockpit

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| Priorités | **EXISTE** | `action_priorities` / `getActionPriorities()` | Croise opportunités, missions, alertes rentabilité/CRA, interactions et Agenda pour déterminer les actions prioritaires. | Liste ordonnée, urgence, impact, entité, lien et compteurs. |
| Brief hebdomadaire | **EXISTE** | `report-weekly-manager` | Pré-calcule les faits et priorités puis confie uniquement la narration à n8n/LLM. | Executive summary, focus semaine, priorités, risques, actions suggérées, document archivé. |
| Insights pipeline | **EXISTE** | `pipeline_insights` / `getPipelineInsights()` | Analyse pipe pondéré, distribution par étape, stagnation, concentration et momentum. | KPI pipeline + insights explicables. |
| IM — Activation portefeuille | **EN COURS** | future `activation-portefeuille` | Déterminer quels comptes activer maintenant et pourquoi. | Comptes prioritaires, preuves, interlocuteurs/angles et recommandations. |

### Verdict

Les trois premières actions sont des **raccordements**, pas de nouvelles features. L’Activation portefeuille sera activée lorsque sa mission sera réellement exécutable.

---

## 4.2 Agenda

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| Préparer la journée | **EXISTE** | `prepare_day` / `getPrepareDay()` | Agrège événements, tâches dues, interactions, opportunités et contexte candidat. | Timeline enrichie + readiness + tâches/alertes. |
| Préparer un RDV | **EXISTE** | `intel-020-communication` → `structured_briefing` / `meeting_briefing` | Construit une fiche contextualisée de préparation de rendez-vous. | Brief RDV structuré, archivable. |
| Anticiper les échéances — runway engagements | **PARTIEL** | AgendaSnapshot + `resolveMissionBoundariesSource()` | Produit déjà les débuts/fins de missions et leur contexte. | Les échéances unitaires existent ; manque l’agrégation 30/60/90 jours de type runway. |
| Piloter la prospection | **PARTIEL** | interactions + tasks + calendar_events + opportunities + futur workspace Prospection | Les actions commerciales et retards sont déjà observables. | Manque un process consolidé de suivi d’exécution incluant les campagnes commerciales. |

### À développer

- projection **Runway des engagements** ;
- consolidation **Pilotage de la prospection**, particulièrement la dimension campagnes.

---

## 4.3 Besoins & Staffing

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| Prioriser le pipeline | **EXISTE** | `prioritize_pipeline` | Classe les opportunités selon valeur, conviction, échéance et couverture staffing. | Opportunités classées + drivers de priorité. |
| Matcher les profils | **EXISTE** | moteur canonique `runOpportunityMatching()` / `computeMatching()` | Matching déterministe besoin → candidats/collaborateurs selon compétences, niveau, disponibilité, TJM, practice, etc. | Profils classés + confiance + critères + forces/faiblesses. |
| Préparer un candidat | **EXISTE / raccordement** | INTEL-020, scénarios recrutement/briefing | Prépare un candidat à une étape ou un entretien à partir du contexte disponible. | Briefing candidat structuré. |
| IM — post-mortem-commercial | **EN COURS** | future `post-mortem-commercial` | Analyse opportunités gagnées/perdues/abandonnées et patterns commerciaux. | Findings sourcés + recommandations correctives. |

---

## 4.4 Engagements

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| IM — Analyser les prestations | **EXISTE** | `rentabilite-portefeuille` | Analyse marges et dérives opérationnelles par mission/client/consultant. | Executive summary, findings sourcés, recommandations avec horizon. |
| Détecter les risques | **EXISTE** | `detect_risks` | Détecte marge faible/négative, faible activité, CRA, fin de mission, absences, concentration CA, etc. | Risques triés par sévérité + actions suggérées. |
| Prévoir le CA | **EXISTE** | `forecast_revenue` / `getForecastRevenue()` | Projette le CA M+1/M+2/M+3 à partir des missions, pipe, absences, fermetures clients et historique. | Scénarios pessimiste/réaliste/optimiste + contributions missions/pipe. |
| Anticiper les échéances | **PARTIEL** | Agenda mission boundaries | Les dates sont déjà exposées individuellement. | Manque la projection consolidée runway. |

---

## 4.5 Business Intelligence

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| Analyse à la demande | **EXISTE** | `WatchAnalysisInputV2` / `manual_custom` | Analyse personnalisée de 1 à 3 familles de sources avec intention utilisateur. | Analyse stratégique sourcée + `evidenceRefs` + document. |
| Prioriser les fenêtres commerciales | **À CRÉER** | — | Transformer signaux, connaissance segment, actualités/réglementation et contexte commercial en fenêtres d’action ordonnées. | Liste de fenêtres commerciales expliquées et sourcées. |
| Paramétrer la veille | **PARTIEL / raccordement** | watch settings + gestion des sources + `GlobalWatchSettingsDialog` | Configure veille, sources, cadence et paramètres. | Le module existe ; il reste à définir le pré-contexte exact du segment actif depuis BI. |

---

## 4.6 Prospection Intelligence

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| IM — Activation portefeuille | **EN COURS** | future `activation-portefeuille` | Priorise les comptes à activer à l’échelle du portefeuille. | Comptes, raisons, interlocuteurs, angles, horizon. |
| Générer synthèse / analyse | **PARTIEL** | `manual_custom` | Le moteur générique d’analyse multi-source existe. | Il manque un preset/provider Prospection qui lui injecte le bon périmètre portefeuille. |
| IM — Revue compte client | **EN COURS** | future `revue-compte-client` | Croise relation commerciale, intelligence compte et delivery. | Santé du compte, risques/opportunités et recommandations d’expansion/correction. |
| Créer une campagne | **À CRÉER** | — | Aucun modèle métier de campagne canonique suffisamment complet aujourd’hui. | Campagne avec périmètre, séquence, actions, statut, suivi et résultats. |

---

## 4.7 Rapports & Rédaction

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| Générer un document | **EXISTE** | générateurs Reports / `REPORT_GENERATION_OPTIONS` | Génère les familles de rapports actuellement supportées. | Documents structurés persistés dans `intelligence_documents`. |
| Analyse transverse — 3 sources | **EXISTE** | `manual_custom` V2 | Analyse personnalisée de 1 à 3 sources/groupes avec intention. | Analyse sourcée + preuves + document. |
| Regroupement thématique | **À CRÉER** | — | Classe/regroupe automatiquement les documents selon un critère utilisateur. | Groupes thématiques par thème, client, actualité, date ou critère choisi. |

---

## 4.8 Veille & Actualités

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| Déclenchement manuel | **EXISTE** | veille globale via `/api/n8n/trigger`, `triggerMode: manual` | Déclenche un digest à partir des sources/configurations actives. | Nouveau digest suivi par run. |
| IM — Analyse mensuelle de la veille | **EXISTE** | `veille-analyse-mensuelle` | Analyse tendances, signaux faibles, réglementation, opportunités et risques sur une période. | `MissionReportV1` sourcé + recommandations. |
| Analyse transverse | **EXISTE** | `manual_custom` | Analyse multi-source à la demande. | Analyse autonome consultable dans Veille et Documents. |
| Suggérer des actions | **PARTIEL** | recommandations présentes dans signaux/analyses | Des recommandations existent déjà ponctuellement. | Manque une action dédiée qui consolide et convertit les signaux en actions concrètes : fenêtre, contact, corpus, tâche, etc. |

---

## 4.9 Équipe

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| IM — capacité-staffing | **EN COURS** | future `capacite-staffing` | Anticipe disponibilité/intercontrat en croisant missions, activité, absences, compétences et besoins. | Consultants/dates/signaux de capacité + recommandations. |
| Compétences VS besoins | **EXISTE / À ÉTENDRE** | socle `analyze_needs` + Pool de compétences | Compare compétences disponibles et demande du pipe. | Le socle existe ; la version cible doit agréger collaborateurs + candidats + vivier qualifié et comparer 12 mois glissants + tendance 90 jours. |
| Matcher les profils | **EXISTE** | moteur de matching canonique | Compare besoin précis et profils. | Classement explicable. |
| Identifier les écarts | **EXISTE** | `analyze_activity` | Compare activité/TACI, marge, fin de mission, absences et alertes. | Collaborateurs classés + écarts + recommandations. |

---

## 4.10 Recrutement

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| IM — funnel-recrutement | **EN COURS** | future `funnel-recrutement` | Analyse temporelle du funnel et de ses délais/goulots. | Patterns de perte, délais, blocages et recommandations sourcées. |
| Compétences VS Besoins | **EXISTE / À ÉTENDRE** | socle `analyze_needs` + Pool de compétences | Analyse adéquation offre de compétences KREDO ↔ besoins réellement traités. | Matrice demande/pool/tension + rail des profils/skills les plus représentés + tendances. |
| Préparer une communication candidat | **EXISTE** | INTEL-020 catégorie recrutement | Génère une communication contextualisée pour un candidat. | Email/message/pitch/briefing selon scénario. |
| Matching profil | **EXISTE** | moteur matching canonique | Matching déterministe profil ↔ besoin. | Score/confiance/critères/forces/faiblesses. |

### Important

L’action **Compétences VS Besoins** n’est pas un alias de Matching profil. Les deux doivent rester distinctes :

- **Matching profil** = décision individuelle sur un besoin ;
- **Compétences VS Besoins** = lecture portefeuille du positionnement de la capacité KREDO face à sa demande marché.

---

## 4.11 Finance

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| Diagnostic IA du workspace | **EXISTE** | `intel-040-workspace-diagnostic` | Corrèle commerce, delivery, finance, équipe et recrutement à partir d’un contexte factuel pré-calculé. | Diagnostic macro sourcé + corrélations + priorités + document. |
| IM — Analyser les marges | **EXISTE** | `rentabilite-portefeuille` | Analyse où la marge se fait/se perd par mission/client/consultant. | Findings sourcés + recommandations. |
| Modélisation du CA | **À CRÉER** | — | Le forecast existant projette le CA mais ne permet pas de sélectionner des hypothèses gain/perte d’opportunités. | Simulateur interactif de scénarios de revenus. |
| Synthèse à la direction | **EXISTE / adaptation légère** | `report-manager-summary` | Produit une synthèse périodique des faits, performance, risques et priorités. | Document `manager_summary`. |

---

## 4.12 Automatisations

| Action | Statut | Process | Ce qu’il fait | Livrable |
|---|---|---|---|---|
| Générer un rapport | **EXISTE MAIS BLOQUÉ PAR DETTE** | `/api/reports/technical/generate` | Agrège runs, succès/échecs, coûts, durées, workflows et alertes. | Rapport technique. **Ne pas exposer avant suppression du fallback de démo.** |
| Analyser les erreurs | **PARTIEL** | `getAutomationsDashboardData()` + journal runs + `v_workflow_health` | Les données d’erreur, workflow, état, durée et récence existent. | Manque une synthèse/analyse dédiée. |
| Analyser les coûts | **PARTIEL** | dashboard + vues coûts | Coûts jour/7j/30j/all-time, timeline, coût par workflow et pricing/token gaps. | Manque l’action Intelligence de synthèse/priorisation, pas la donnée. |
| Prioriser les corrections | **À CRÉER** | — | Doit ordonner les problèmes selon criticité, fréquence, coût, impact, taux d’échec, stuck runs et récence. | Backlog priorisé de corrections. |

---

# 5. Backlog métier dédupliqué

## 5.1 Intelligence Missions déjà prévues

À terminer dans leur chantier dédié :

1. `activation-portefeuille` ;
2. `capacite-staffing` ;
3. `revue-compte-client` ;
4. `post-mortem-commercial` ;
5. `funnel-recrutement`.

Ces missions doivent utiliser le moteur Intelligence Missions existant ; aucun moteur parallèle.

## 5.2 Nouvelles capacités réellement à développer

Après déduplication :

1. **Runway des engagements** — projection consolidée 30/60/90j ;
2. **Pilotage de la prospection / campagnes** ;
3. **Créer une campagne** — modèle métier et cycle de vie ;
4. **Prioriser les fenêtres commerciales** en BI ;
5. **Regroupement thématique automatique** dans Rapports & Rédaction ;
6. **Modélisation du CA par scénarios gain/perte** ;
7. **Prioriser les corrections** Automatisations ;
8. extension **Compétences VS Besoins** pour inclure collaborateurs + candidats + vivier qualifié avec horizon 12 mois / tendance 90 jours.

## 5.3 Adaptateurs / raccordements, pas nouvelles features

À traiter comme intégrations du Cockpit :

- Préparer un RDV ;
- Préparer un candidat ;
- Paramétrer la veille depuis BI ;
- Générer synthèse/analyse Prospection ;
- Suggérer des actions depuis Veille ;
- Analyser les erreurs ;
- Analyser les coûts ;
- Synthèse à la direction ;
- toutes les actions déterministes déjà livrées (`action_priorities`, `prepare_day`, `pipeline_insights`, `detect_risks`, `forecast_revenue`, `prioritize_pipeline`, `analyze_needs`, `analyze_activity`).

---

# 6. Invariant d’architecture

La matrice ne doit pas entraîner la création d’un moteur par bouton.

Les capacités du Cockpit Intelligence doivent prioritairement orchestrer les briques transverses existantes :

```text
Intelligence déterministe
→ Intelligence Missions
→ INTEL-020 Rédaction assistée
→ Analyse transverse manual_custom
→ Reports
```

Une Action du Cockpit est un **point d’entrée contextualisé vers une capacité**, pas une nouvelle source de vérité.

---

# 7. Dette P0 avant généralisation

Avant de considérer le raccordement des actions Automatisations comme production-ready :

- supprimer le fallback de démonstration de `/api/reports/technical/generate` ;
- en absence de runs réels, retourner un état vide factuel ;
- ajouter un test de non-régression garantissant qu’aucune donnée factice n’est générée ;
- vérifier que le rapport technique ne masque jamais une erreur de lecture par des valeurs de démonstration.
