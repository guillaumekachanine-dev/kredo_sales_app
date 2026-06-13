-- ============================================================
--  KREDO — Migration 013 : Import diagnostic process Experis France
--  Source : audit_esn_europe_2026.pdf (LETHIA AI)
--  Phase : 3 (process_diagnostic)
--
--  Lookup-only — Experis doit exister dans companies.
--  PRÉREQUIS : bucket 'ai_intelligence_process_diagnostics' créé,
--  PDF uploadé sous experis/audit_esn_europe_2026.pdf
-- ============================================================

DO $$
DECLARE
  v_workspace_id uuid;
  v_owner_id     uuid;
  v_company_id   uuid;
  v_run_id       uuid;
BEGIN

  -- ── Résolution workspace + owner (mono-tenant) ──────────────────
  SELECT workspace_id, id
    INTO v_workspace_id, v_owner_id
    FROM public.profiles
   LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Aucun profil trouvé — exécutez ce script après inscription.';
  END IF;

  -- ── Lookup Experis (compte existant — pas de création) ──────────
  SELECT id INTO v_company_id
    FROM public.companies
   WHERE workspace_id = v_workspace_id
     AND name ILIKE '%experis%'
   LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Compte Experis introuvable dans companies (workspace %). Vérifiez le nom exact.', v_workspace_id;
  END IF;

  RAISE NOTICE 'Experis trouvé : %', v_company_id;

  -- ── Créer un run d'import (status succeeded, trigger import) ────
  INSERT INTO public.ai_intelligence_runs (
    workspace_id,
    owner_id,
    company_id,
    run_type,
    status,
    trigger_source,
    current_phase,
    started_at,
    completed_at
  )
  VALUES (
    v_workspace_id,
    v_owner_id,
    v_company_id,
    'process_diagnostic_import',
    'succeeded',
    'import',
    3,
    now(),
    now()
  )
  RETURNING id INTO v_run_id;

  RAISE NOTICE 'Run créé : %', v_run_id;

  -- ── Insérer le résultat phase 3 ─────────────────────────────────
  INSERT INTO public.ai_intelligence_results (
    workspace_id,
    owner_id,
    company_id,
    run_id,
    phase,
    result_type,
    status,
    title,
    model_provider,
    completed_at,
    metadata,
    content_json
  )
  VALUES (
    v_workspace_id,
    v_owner_id,
    v_company_id,
    v_run_id,
    3,
    'process_diagnostic',
    'succeeded',
    'Diagnostic process — Audit opérationnel ESN Europe (Mars 2026)',
    'import',
    now(),
    jsonb_build_object(
      'pdf_storage_path', 'experis/audit_esn_europe_2026.pdf',
      'pdf_bucket', 'ai_intelligence_process_diagnostics',
      'source_document', 'Audit Opérationnel ESN Europe — Diagnostic & Roadmap d''Optimisation 2026',
      'produced_by', 'LETHIA AI Consulting'
    ),
    $json${
      "synthese": "Cet audit révèle une organisation qui fonctionne, mais qui fonctionne en deçà de son potentiel. Les équipes sont compétentes et engagées, mais elles sont ralenties par des processus non optimisés, des outils sous-exploités, et une circulation de l'information défaillante. Dans le contexte de marché 2026 — où la vitesse de réaction et la qualité de service deviennent des facteurs différenciants critiques — ces inefficacités ne sont plus un inconfort : elles sont un risque concurrentiel.\n\nCinq convictions structurantes : (1) L'IA n'est pas un projet informatique, c'est un changement de méthode de travail. (2) Le premier chantier n'est pas technologique mais informationnel — un CRM renseigné, des briefs structurés, des feedbacks tracés, sans cette hygiène de la donnée, aucune IA ne produira de valeur. (3) Les quick wins financent les transformations de fond. (4) Le modèle ESN de 2026 récompense la vitesse et la pertinence, pas le volume. (5) L'humain reste au centre — l'objectif est de restituer du temps pour ce que les équipes font de mieux : convaincre, négocier, accompagner, décider.\n\nROI annuel estimé (base conservatrice pour 100 consultants) : 675K€ — 1 260K€. Investissement : 120-250K€. Ratio ROI année 1 : x3 à x5.",

      "contexte_sectoriel": {
        "marche_esn_2026": "Après une contraction historique de -1,8% en 2025 (première baisse en plus de quinze ans), le secteur amorce un redressement mesuré. Les projections Numeum/PAC de janvier 2026 dessinent un paysage contrasté.",
        "indicateurs_cles": {
          "croissance_marche_numerique": "+4,3%",
          "croissance_esn": "+1,4% (35 Md€)",
          "croissance_editeurs_logiciels": "+8,4% (31,6 Md€)",
          "part_projets_saas": "77%"
        },
        "tendances_structurantes": [
          "Migration de la valeur vers le logiciel : les éditeurs SaaS captent la croissance (+8,4%) pendant que les ESN stagnent (+1,4%). Le modèle de régie et de body-shopping est structurellement menacé.",
          "IA générative comme levier de performance : 81% des ESN identifient l'IA comme première source de croissance. Les gains de productivité estimés atteignent 17% en 2026 mais l'usage reste majoritairement au stade pilote.",
          "Consolidation des panels fournisseurs : les grands comptes réduisent leur nombre d'ESN partenaires pour constituer des 'core partners' stratégiques.",
          "Pression sur les marges et sélectivité : chaque euro IT doit se justifier par des métriques tangibles. Le storytelling ne suffit plus.",
          "Cybersécurité et conformité réglementaire : NIS2, IA Act, RGAA génèrent des projets récurrents. 47% des recruteurs citent la cybersécurité comme compétence prioritaire."
        ]
      },

      "cartographie_activites": {
        "recrutement": [
          {"activite": "Sourcing candidats", "description": "Recherche active sur jobboards, LinkedIn, CVthèques internes, cooptation, vivier interne", "frequence": "Quotidienne", "charge": "25-30%"},
          {"activite": "Qualification / Pré-sélection", "description": "Lecture CV, matching compétences/besoin, premier filtre téléphonique ou écrit", "frequence": "Quotidienne", "charge": "15-20%"},
          {"activite": "Entretiens de recrutement", "description": "Entretiens techniques et motivationnels (visio/présentiel), évaluation soft skills", "frequence": "3-5x/semaine", "charge": "15-20%"},
          {"activite": "Gestion administrative candidat", "description": "Création fiches candidat, saisie CRM/ATS, collecte documents, relances", "frequence": "Quotidienne", "charge": "10-15%"},
          {"activite": "Proposition & négociation", "description": "Rédaction propositions, négociation salariale, closing candidat", "frequence": "Hebdomadaire", "charge": "5-10%"},
          {"activite": "Animation du vivier", "description": "Relance candidats en veille, newsletters, événements, suivi post-entretien", "frequence": "Hebdomadaire", "charge": "5-8%"},
          {"activite": "Coordination avec le commerce", "description": "Briefs besoin, shortlists, debriefs client, ajustements profil recherché", "frequence": "Quotidienne", "charge": "10-15%"},
          {"activite": "Reporting & KPI", "description": "Suivi pipe recrutement, taux de transformation, délais, rapports hebdo/mensuels", "frequence": "Hebdomadaire", "charge": "5%"}
        ],
        "commercial": [
          {"activite": "Prospection & développement", "description": "Identification prospects, cold calls/emails, networking, veille appels d'offres", "frequence": "Quotidienne", "charge": "20-25%"},
          {"activite": "Gestion du portefeuille client", "description": "Suivi satisfaction, visites régulières, détection de besoins additionnels, fidélisation", "frequence": "Quotidienne", "charge": "20-25%"},
          {"activite": "Recueil & qualification des besoins", "description": "RDV de cadrage, rédaction de fiches de poste, compréhension contexte technique et organisationnel", "frequence": "Quotidienne", "charge": "15-20%"},
          {"activite": "Matching & proposition commerciale", "description": "Sélection profils (avec recrutement), rédaction propositions, présentation candidats au client", "frequence": "Quotidienne", "charge": "15-20%"},
          {"activite": "Négociation & closing", "description": "Négociation TJM/salaire, conditions contractuelles, signature, passage de relais", "frequence": "Hebdomadaire", "charge": "10%"},
          {"activite": "Suivi de mission", "description": "Points réguliers consultant/client, gestion aléas, renouvellements, fins de mission", "frequence": "Hebdomadaire", "charge": "10-15%"},
          {"activite": "Veille marché & concurrence", "description": "Suivi des tendances technologiques, mapping concurrentiel, événements sectoriels", "frequence": "Mensuelle", "charge": "3-5%"},
          {"activite": "Reporting & CRM", "description": "Mise à jour pipeline, prévisions CA, reporting Direction, saisie CRM", "frequence": "Hebdomadaire", "charge": "5-8%"}
        ],
        "management_delivery": [
          {"activite": "Suivi des consultants en mission", "description": "Points individuels, gestion des comptes rendus d'activité (CRA), écoute terrain", "frequence": "Hebdomadaire", "charge": "25-30%"},
          {"activite": "People management", "description": "Entretiens annuels, plans de carrière, montée en compétences, gestion des alertes RH", "frequence": "Continue", "charge": "15-20%"},
          {"activite": "Gestion des inter-contrats", "description": "Identification formations, missions internes, préparation remise en mission, moral", "frequence": "Variable", "charge": "10-15%"},
          {"activite": "Coordination recrutement/commerce", "description": "Arbitrage priorisation besoin, validation propositions, escalade décisions", "frequence": "Quotidienne", "charge": "10-15%"},
          {"activite": "Pilotage financier", "description": "Suivi marge, taux d'occupation (TACE), CA prévisionnel, optimisation staffing", "frequence": "Hebdomadaire", "charge": "10-15%"},
          {"activite": "Relation client niveau N+1", "description": "Comités de pilotage, escalade qualité, négociations stratégiques, QBR", "frequence": "Mensuelle", "charge": "5-10%"},
          {"activite": "Animation d'équipe", "description": "Réunions d'agence, team building, communication interne, culture d'entreprise", "frequence": "Hebdomadaire", "charge": "5-8%"},
          {"activite": "Reporting & décisionnel", "description": "Consolidation KPIs, dashboards, réunions de direction, plans d'action", "frequence": "Hebdomadaire", "charge": "5-8%"}
        ]
      },

      "repartition_charge": {
        "analyse": "Déséquilibre structurel commun : les tâches à faible valeur ajoutée (administratif, saisie, recherche d'information, reporting manuel) consomment entre 30% et 45% du temps des équipes, au détriment des activités à forte valeur (relation candidat/client, négociation, stratégie).",
        "par_categorie": [
          {"categorie": "Activités à haute valeur ajoutée (relation humaine, négociation, stratégie)", "recrutement": "30-35%", "commercial": "35-40%", "management": "40-45%", "potentiel_ia": "Faible — Assistance"},
          {"categorie": "Activités à valeur intermédiaire (analyse, qualification, coordination)", "recrutement": "25-30%", "commercial": "25-30%", "management": "25-30%", "potentiel_ia": "Moyen — Augmentation"},
          {"categorie": "Activités à faible valeur ajoutée (saisie, recherche, reporting, admin)", "recrutement": "35-40%", "commercial": "30-35%", "management": "30-35%", "potentiel_ia": "Élevé — Automatisation"}
        ],
        "lecture_cle": "En moyenne, un collaborateur ESN passe 1,5 jour par semaine sur des tâches qui pourraient être automatisées ou significativement accélérées par l'IA. Pour une équipe de 100 personnes : environ 30 000 heures/an de productivité récupérable, soit l'équivalent de 15 ETP."
      },

      "cartographie_interlocuteurs": {
        "recrutement": [
          {"interlocuteur": "Candidats actifs", "nature": "Entretiens, suivi process, négociation, onboarding", "frequence": "Quotidienne", "criticite": "Critique"},
          {"interlocuteur": "Candidats passifs / vivier", "nature": "Approche, relance, animation communauté", "frequence": "Hebdomadaire", "criticite": "Haute"},
          {"interlocuteur": "Commerciaux internes", "nature": "Brief besoin, shortlist, debrief post-entretien client", "frequence": "Quotidienne", "criticite": "Critique"},
          {"interlocuteur": "Managers / Business Managers", "nature": "Validation profil, arbitrage priorités, escalade", "frequence": "Hebdomadaire", "criticite": "Haute"},
          {"interlocuteur": "Clients (entretien technique)", "nature": "Coordination planning, feedback, décision", "frequence": "Variable", "criticite": "Haute"}
        ],
        "commercial": [
          {"interlocuteur": "Clients existants (opérationnel)", "nature": "Suivi mission, satisfaction, renouvellement, upsell", "frequence": "Quotidienne", "criticite": "Critique"},
          {"interlocuteur": "Clients existants (décideur)", "nature": "QBR, négociation cadre, stratégie partenariale", "frequence": "Mensuelle", "criticite": "Critique"},
          {"interlocuteur": "Prospects", "nature": "Prospection, RDV découverte, proposition, closing", "frequence": "Quotidienne", "criticite": "Haute"},
          {"interlocuteur": "Recruteurs internes", "nature": "Transmission besoin, suivi sourcing, feedback candidat", "frequence": "Quotidienne", "criticite": "Critique"},
          {"interlocuteur": "Consultants en mission", "nature": "Points de suivi, alertes, fin de mission", "frequence": "Hebdomadaire", "criticite": "Haute"}
        ],
        "management": [
          {"interlocuteur": "Consultants managés", "nature": "Suivi carrière, CRA, satisfaction, développement", "frequence": "Hebdomadaire", "criticite": "Critique"},
          {"interlocuteur": "Clients (niveau pilotage)", "nature": "Comités, escalade, QBR, renouvellements stratégiques", "frequence": "Mensuelle", "criticite": "Critique"},
          {"interlocuteur": "Commerciaux", "nature": "Coordination staffing, remontée terrain, arbitrage", "frequence": "Quotidienne", "criticite": "Haute"},
          {"interlocuteur": "Recruteurs", "nature": "Priorisation recrutements, validation profils", "frequence": "Hebdomadaire", "criticite": "Haute"},
          {"interlocuteur": "Direction Générale", "nature": "Reporting P&L, TACE, plans stratégiques, comités", "frequence": "Hebdomadaire", "criticite": "Critique"}
        ]
      },

      "frictions": {
        "systemiques": [
          {"titre": "Le syndrome du double CRM", "description": "Les données candidats, clients et missions sont dispersées entre un ATS, un CRM commercial, des fichiers Excel personnels, des notes dans les mails et des conversations Slack/Teams non archivées. Personne n'a une vue à 360° de la relation."},
          {"titre": "La boucle de feedback cassée", "description": "Lorsqu'un candidat est présenté à un client et refusé, le retour au recruteur est souvent tardif (2 à 5 jours), incomplet et non structuré. Le recruteur ne peut pas corriger son ciblage. Le candidat attend sans nouvelle et finit par accepter une offre ailleurs."},
          {"titre": "Le reporting comme activité et non comme sous-produit", "description": "Chaque fonction consacre entre 5 et 10% de son temps à produire du reporting qui est en réalité une re-saisie d'informations déjà connues mais non consolidées automatiquement. Les managers passent leurs lundis matins à 'mettre à jour les tableaux'."},
          {"titre": "L'hyper-sollicitation par messagerie", "description": "Les commerciaux, recruteurs et managers sont interrompus 40 à 60 fois par jour par des messages instantanés (Slack, Teams, mails). La plupart concernent des demandes d'information qui existent déjà quelque part. Chaque interruption coûte en moyenne 23 minutes de reconcentration."}
        ],
        "par_fonction": {
          "recrutement": [
            {"rank": 1, "pain_point": "Time-to-fill trop long (25-45 jours en moyenne)", "impact": "Perte de candidats, insatisfaction client", "cause_racine": "Process séquentiel, manque de parallélisation"},
            {"rank": 2, "pain_point": "CV non qualifiés envoyés au client", "impact": "Perte de crédibilité, retravail", "cause_racine": "Brief insuffisant, pas de scoring automatique"},
            {"rank": 3, "pain_point": "Vivier inexploité (80% des CV dormants)", "impact": "Sourcing redondant, coûts jobboards élevés", "cause_racine": "Pas de CRM candidat actif, pas de nurturing"},
            {"rank": 4, "pain_point": "Duplication des recherches entre recruteurs", "impact": "Perte de temps, candidats sur-sollicités", "cause_racine": "Pas de visibilité transverse sur les recherches en cours"},
            {"rank": 5, "pain_point": "Ghosting candidat post-entretien", "impact": "Image employeur dégradée, vivier perdu", "cause_racine": "Pas de workflow de suivi automatisé"},
            {"rank": 6, "pain_point": "Inadéquation compétences/besoin réel", "impact": "Taux de placement faible, turnover mission", "cause_racine": "Brief commercial trop vague, pas de scoring technique"},
            {"rank": 7, "pain_point": "Saisie CRM/ATS considérée comme corvée", "impact": "Données incomplètes, analytics impossibles", "cause_racine": "UX des outils, absence de valeur perçue immédiate"},
            {"rank": 8, "pain_point": "Absence de données prédictives", "impact": "Recrutement réactif et non anticipatif", "cause_racine": "Pas de modèle de prévision de la demande"}
          ],
          "commercial": [
            {"rank": 1, "pain_point": "Pipeline commercial non fiable", "impact": "Forecast imprécis, décisions erronées", "cause_racine": "Saisie CRM tardive, qualification subjective"},
            {"rank": 2, "pain_point": "Temps de réponse client >48h", "impact": "Perte d'opportunités, image réactive", "cause_racine": "Dépendance au recrutement, pas de profils pré-qualifiés"},
            {"rank": 3, "pain_point": "Propositions commerciales non personnalisées", "impact": "Taux de conversion faible", "cause_racine": "Templates génériques, manque d'intelligence client"},
            {"rank": 4, "pain_point": "Méconnaissance des missions en cours", "impact": "Opportunités de renouvellement ratées", "cause_racine": "Pas de dashboard temps réel, silos d'information"},
            {"rank": 5, "pain_point": "Prospection non ciblée", "impact": "ROI prospection faible (2-5%)", "cause_racine": "Pas de scoring prospect, approche volume vs. valeur"},
            {"rank": 6, "pain_point": "Négociation TJM sans données marché", "impact": "Marge érodée ou offre non compétitive", "cause_racine": "Pas de benchmark automatisé, intuition seule"},
            {"rank": 7, "pain_point": "Perte d'information au changement de commercial", "impact": "Relation client à reconstruire", "cause_racine": "Données dans la tête, pas dans le CRM"},
            {"rank": 8, "pain_point": "Conflits internes sur l'ownership client", "impact": "Énergie gaspillée, image confuse pour le client", "cause_racine": "Règles d'attribution floues, pas de système unique"}
          ],
          "management": [
            {"rank": 1, "pain_point": "TACE non piloté en temps réel", "impact": "Intercontrat subi, marge dégradée", "cause_racine": "Données dispersées, reporting mensuel vs. temps réel"},
            {"rank": 2, "pain_point": "Démissions non anticipées", "impact": "Perte de mission, coût de remplacement x2", "cause_racine": "Pas d'indicateurs prédictifs (satisfaction, engagement)"},
            {"rank": 3, "pain_point": "Intercontrat mal géré", "impact": "Consultant démotivé, départ", "cause_racine": "Pas de plan structuré, formation par défaut"},
            {"rank": 4, "pain_point": "Entretiens annuels perçus comme une formalité", "impact": "Pas de plan de carrière, fidélisation faible", "cause_racine": "Processus RH lourd, pas d'actions concrètes qui suivent"},
            {"rank": 5, "pain_point": "Surcharge managériale (span of control)", "impact": "Management superficiel, détection tardive des alertes", "cause_racine": "Ratio manager/consultant trop élevé (1:25-30)"},
            {"rank": 6, "pain_point": "Arbitrage staffing entre agences", "impact": "Consultants 'captifs' d'une agence, pas de mobilité", "cause_racine": "Silos géographiques, pas de plateforme de matching interne"},
            {"rank": 7, "pain_point": "Reporting consolidé chronophage", "impact": "Lundi matin entier perdu en compilation", "cause_racine": "Pas d'automatisation, Excel comme outil de pilotage"},
            {"rank": 8, "pain_point": "Visibilité insuffisante sur les compétences du bench", "impact": "Matching lent, opportunités ratées", "cause_racine": "Pas de cartographie dynamique des compétences"}
          ]
        },
        "zones_grises": [
          {"zone": "Ownership du candidat en process", "description": "Entre le moment où le recruteur a qualifié un candidat et celui où le commercial le présente au client, la responsabilité du suivi est floue. Qui relance ? Qui informe du délai ?", "consequence": "Le candidat se sent abandonné et accepte une offre concurrente"},
          {"zone": "Responsabilité de la satisfaction consultant", "description": "Le manager gère la carrière, le commercial gère la mission, le client gère le quotidien. Personne n'est clairement responsable de la satisfaction globale.", "consequence": "Les alertes remontent trop tard ; le consultant démissionne 'sans prévenir'"},
          {"zone": "Fin de mission et transition", "description": "La détection de fin de mission et la remise en staffing impliquent commercial + manager + recrutement. Aucun workflow clair ne définit les rôles et les délais.", "consequence": "Période d'intercontrat allongée de 2 à 4 semaines en moyenne"},
          {"zone": "Qualification des besoins techniques", "description": "Le commercial recueille le besoin mais n'a pas toujours l'expertise technique pour le qualifier finement. Le recruteur reçoit un brief incomplet.", "consequence": "20 à 30% des CV envoyés ne correspondent pas au besoin réel"},
          {"zone": "Données et mises à jour CRM", "description": "Personne n'est clairement responsable de la qualité des données. Chacun saisit 'quand il a le temps'.", "consequence": "Analytics faussées, décisions basées sur des données obsolètes"}
        ],
        "goulots": [
          {"ref": "G1", "titre": "Le recrutement comme facteur limitant du chiffre d'affaires", "description": "La capacité à placer des consultants est directement conditionnée par la capacité à en recruter. Un besoin client urgent (réponse attendue sous 48-72h) se heurte à un process de sourcing qui prend 5 à 10 jours avant de produire une shortlist exploitable.", "impact": "Première cause de perte d'opportunités commerciales"},
          {"ref": "G2", "titre": "Le manager surchargé comme point de blocage décisionnel", "description": "Le manager est au carrefour de toutes les décisions. Avec un ratio de 25 à 30 consultants par manager, la bande passante décisionnelle est saturée. Les signaux faibles (insatisfaction consultant, désengagement) ne sont pas captés à temps.", "impact": "Décisions retardées, signaux faibles manqués"},
          {"ref": "G3", "titre": "L'information client non partagée", "description": "L'intelligence client (historique, contacts, besoins latents, signaux faibles) reste dans la tête du commercial ou dans ses emails. Lors d'un changement de commercial, l'ESN repart de zéro sur la relation.", "impact": "Perte d'intelligence client, risque de churne"}
        ]
      },

      "feuille_de_route": {
        "matrice_priorisation": [
          {"quadrant": "Quick Wins", "caracteristique": "Impact fort / Effort faible", "exemples": "Scoring CV par IA, alertes CRM automatiques, templates de propositions intelligents, dashboards temps réel", "horizon": "0-3 mois"},
          {"quadrant": "Projets stratégiques", "caracteristique": "Impact fort / Effort moyen-fort", "exemples": "Plateforme de matching IA, CRM unifié, workflow de suivi de mission automatisé, scoring prédictif", "horizon": "3-6 mois"},
          {"quadrant": "Optimisations ciblées", "caracteristique": "Impact moyen / Effort faible", "exemples": "Rituels d'équipe, règles d'ownership claires, standards de saisie CRM, feedback structuré", "horizon": "0-3 mois"},
          {"quadrant": "Transformations de fond", "caracteristique": "Impact fort / Effort fort", "exemples": "Refonte du modèle de staffing, plateforme de compétences, IA conversationnelle interne", "horizon": "6-12 mois"}
        ],
        "actions_recrutement": [
          {"ref": "R1", "action": "Scoring et pré-qualification automatisée des CV", "description": "Moteur d'analyse de CV par IA qui, à réception d'un besoin client, score automatiquement l'ensemble du vivier interne et remonte les 10 meilleurs profils en moins de 5 minutes. Le scoring intègre : adéquation compétences techniques, localisation, disponibilité, historique de missions, prétentions salariales, et compatibilité culturelle estimée.", "gain": "Réduction du time-to-shortlist de 5 jours à 2 heures", "technologie": "RAG sur base vectorielle de CV + LLM pour l'analyse sémantique"},
          {"ref": "R2", "action": "Workflow de nurturing candidat automatisé", "description": "Système de communication automatisée avec le vivier : alertes d'opportunités pertinentes, articles sectoriels, invitations événements, enquêtes de disponibilité périodiques. L'objectif est de maintenir une relation active avec les 80% de candidats actuellement dormants.", "gain": "+30% de candidats réactivés du vivier, réduction des coûts jobboards de 20%", "technologie": "Séquences automatisées (n8n ou équivalent), segmentation IA"},
          {"ref": "R3", "action": "Brief structuré et partagé en temps réel", "description": "Remplacer le brief oral ou le mail informel par un formulaire structuré (complété par le commercial, enrichi par l'IA) qui capture de manière exhaustive le contexte de la mission.", "gain": "-30% de CV hors cible envoyés au client, feedback plus rapide et plus précis", "technologie": "Formulaire dynamique + IA qui suggère des compétences adjacentes"}
        ],
        "actions_commercial": [
          {"ref": "C1", "action": "CRM augmenté par l'IA : intelligence client en temps réel", "description": "Enrichir le CRM existant avec une couche d'intelligence artificielle qui agrège automatiquement les actualités du client (levées de fonds, projets IT, recrutements), les interactions récentes, les signaux faibles (baisse de commandes, changement d'interlocuteur), et génère des recommandations d'actions commerciales.", "gain": "+15% de taux de renouvellement, détection 3x plus rapide des opportunités d'upsell", "technologie": "Intégration API actualités + LLM d'analyse + alertes automatiques dans le CRM"},
          {"ref": "C2", "action": "Générateur de propositions commerciales intelligentes", "description": "Outil de génération de propositions commerciales qui, à partir du brief besoin et du contexte client, produit automatiquement un document personnalisé intégrant la présentation des profils recommandés, les références clients pertinentes, le positionnement tarifaire benchmarké, et les engagements de service.", "gain": "Temps de rédaction divisé par 3, taux de conversion +10%", "technologie": "RAG sur base de propositions passées + LLM de génération + template dynamique"},
          {"ref": "C3", "action": "Scoring prédictif du pipeline", "description": "Remplacer la qualification subjective du pipeline par un modèle de scoring basé sur les données historiques : type de client, secteur, taille du besoin, nombre d'interactions, vélocité du process. Le score est mis à jour automatiquement et alimente un forecast fiable à 30/60/90 jours.", "gain": "Précision du forecast +40%, pilotage du pipe par les données et non par l'intuition", "technologie": "Modèle ML sur données CRM historiques, intégré au dashboard commercial"}
        ],
        "actions_management": [
          {"ref": "M1", "action": "Dashboard de pilotage en temps réel", "description": "Tableau de bord unique et automatisé qui consolide en temps réel : TACE par consultant/équipe/agence, pipe commercial pondéré, alertes de fin de mission à J-30/J-60, satisfaction consultant (micro-sondages automatisés), et indicateurs financiers clés.", "gain": "Suppression du reporting manuel du lundi (3-4h/semaine récupérées par manager)", "technologie": "Intégration données CRM + SIRH + facturation + IA d'alerting"},
          {"ref": "M2", "action": "Système d'alerte prédictif sur les risques de départ", "description": "Modèle prédictif qui identifie les consultants à risque de démission avant qu'ils ne l'annoncent. Signaux intégrés : durée de mission, évolution salariale vs. marché, temps depuis le dernier entretien manager, baisse d'engagement, sentiment exprimé dans les micro-sondages.", "gain": "Réduction du turnover non anticipé de 20 à 30%, économie de 15-30K€ par départ évité", "technologie": "Modèle de scoring prédictif alimenté par les données RH et opérationnelles"},
          {"ref": "M3", "action": "Plateforme de matching interne pour le staffing", "description": "Plateforme interne qui matche automatiquement les consultants disponibles (intercontrat ou fin de mission proche) avec les besoins ouverts dans toutes les agences. Le matching est IA-driven : compétences, localisation, mobilité, historique de mission, préférences du consultant.", "gain": "Réduction de l'intercontrat moyen de 3-4 semaines à 1-2 semaines", "technologie": "Algorithme de matching multi-critères + interface simple pour les managers et commerciaux"}
        ],
        "quick_wins": [
          {"rank": 1, "action": "Scoring automatique des CV entrants par IA", "fonction": "Recrutement", "gain": "80% de temps de tri économisé", "effort": "Faible"},
          {"rank": 2, "action": "Alertes automatiques de fin de mission J-60", "fonction": "Management", "gain": "Anticipation staffing, -2 sem. d'intercontrat", "effort": "Faible"},
          {"rank": 3, "action": "Template de brief besoin structuré et obligatoire", "fonction": "Commerce + Recrutement", "gain": "-30% de CV hors cible", "effort": "Faible"},
          {"rank": 4, "action": "Dashboard TACE automatisé temps réel", "fonction": "Management", "gain": "4h/semaine récupérées par manager", "effort": "Moyen"},
          {"rank": 5, "action": "Séquences de nurturing candidat automatisées", "fonction": "Recrutement", "gain": "+30% de réactivation vivier", "effort": "Moyen"},
          {"rank": 6, "action": "Résumé automatique des réunions par IA", "fonction": "Transverse", "gain": "20 min/réunion économisées", "effort": "Faible"},
          {"rank": 7, "action": "Alerte IA sur actualités clients stratégiques", "fonction": "Commerce", "gain": "Opportunités détectées 3x plus vite", "effort": "Faible"},
          {"rank": 8, "action": "Micro-sondages mensuels consultant automatisés", "fonction": "Management", "gain": "Signaux faibles captés tôt", "effort": "Faible"},
          {"rank": 9, "action": "Générateur de comptes-rendus d'entretien candidat", "fonction": "Recrutement", "gain": "15 min/entretien économisées", "effort": "Faible"},
          {"rank": 10, "action": "Workflow de feedback client structuré sous 24h", "fonction": "Commerce + Recrutement", "gain": "Boucle de feedback 5x plus rapide", "effort": "Faible"}
        ],
        "transformations_structurelles": [
          {"horizon": "3-6 mois", "projet": "CRM unifié augmenté", "description": "Fusionner les données candidat/client/consultant dans une plateforme unique avec couche IA. Fin des silos d'information.", "impact": "Vue 360° pour chaque collaborateur, fin de la perte d'intelligence client"},
          {"horizon": "3-6 mois", "projet": "Plateforme de matching IA", "description": "Outil de matching multi-critères entre besoins clients et consultants disponibles, cross-agences.", "impact": "Intercontrat réduit de 50%, staffing en heures au lieu de jours"},
          {"horizon": "3-6 mois", "projet": "Scoring prédictif pipeline", "description": "Modèle ML qui score les opportunités commerciales et alimente un forecast fiable.", "impact": "Forecast +40% plus précis, pilotage data-driven"},
          {"horizon": "6-12 mois", "projet": "Agent IA conversationnel interne", "description": "Chatbot interne capable de répondre aux questions opérationnelles (état candidat, TJM marché, TACE...).", "impact": "Suppression de 60% des interruptions par messagerie"},
          {"horizon": "6-12 mois", "projet": "Plateforme de compétences dynamique", "description": "Cartographie en temps réel des compétences de tous les consultants, enrichie automatiquement par les missions.", "impact": "Matching plus pertinent, plans de formation ciblés"},
          {"horizon": "6-12 mois", "projet": "Modèle prédictif de turnover", "description": "Détection automatique des consultants à risque de départ avec recommandation d'actions.", "impact": "Turnover réduit de 20-30%, économie 15-30K€/départ"}
        ]
      },

      "roi_global": {
        "perimetre": "Agence type de 100 consultants facturables, équipe opérationnelle de 15 personnes",
        "leviers": [
          {"levier": "Réduction du time-to-fill de 35 à 15 jours", "gain_annuel": "150-250 K€"},
          {"levier": "Réduction de l'intercontrat de 4 à 2 semaines", "gain_annuel": "200-400 K€"},
          {"levier": "Réduction du turnover non anticipé de 25%", "gain_annuel": "75-150 K€"},
          {"levier": "Temps récupéré sur tâches à faible VA", "gain_annuel": "120-200 K€"},
          {"levier": "Amélioration du taux de conversion commercial", "gain_annuel": "100-200 K€"},
          {"levier": "Réduction des coûts de sourcing externe", "gain_annuel": "30-60 K€"}
        ],
        "roi_annuel_estime": "675 K€ — 1 260 K€",
        "investissement_estime": "120 K€ — 250 K€",
        "ratio_roi_annee_1": "x3 à x5"
      },

      "sequence_deploiement": [
        {"phase": "Phase 1 — Fondations", "horizon": "Mois 1-3", "focus": "Quick wins IA + hygiène données + workflows de base", "objectif": "Démontrer la valeur, embarquer les équipes"},
        {"phase": "Phase 2 — Structuration", "horizon": "Mois 3-6", "focus": "CRM unifié + matching IA + scoring pipeline", "objectif": "Industrialiser les processus critiques"},
        {"phase": "Phase 3 — Intelligence", "horizon": "Mois 6-9", "focus": "Agent IA interne + modèle prédictif + plateforme compétences", "objectif": "Passer en mode prédictif et proactif"},
        {"phase": "Phase 4 — Excellence", "horizon": "Mois 9-12", "focus": "Optimisation continue + extension aux autres BU Europe", "objectif": "Devenir la référence interne du groupe"}
      ]
    }$json$
  );

  RAISE NOTICE 'Diagnostic process Experis importé avec succès.';

END;
$$;
