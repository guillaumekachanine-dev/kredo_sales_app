-- ============================================================
--  KREDO — Migration 012 : Import diagnostic process DomusVi
--  Source : Audit_Strategique_DomusVi_Mars2026.pdf (LETHIA AI)
--  Phase : 3 (process_diagnostic)
--
--  Lookup-only — DomusVi doit exister dans companies.
--  PRÉREQUIS : bucket 'ai_intelligence_process_diagnostics' créé,
--  PDF uploadé sous domusvi/Audit_Strategique_DomusVi_Mars2026.pdf
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

  -- ── Lookup DomusVi (compte existant — pas de création) ──────────
  SELECT id INTO v_company_id
    FROM public.companies
   WHERE workspace_id = v_workspace_id
     AND name ILIKE '%domus%'
   LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Compte DomusVi introuvable dans companies (workspace %). Vérifiez le nom exact.', v_workspace_id;
  END IF;

  RAISE NOTICE 'DomusVi trouvé : %', v_company_id;

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
    'Diagnostic process — Optimisation des processus opérationnels DomusVi (Mars 2026)',
    'import',
    now(),
    jsonb_build_object(
      'pdf_storage_path', 'domusvi/Audit_Strategique_DomusVi_Mars2026.pdf',
      'pdf_bucket', 'ai_intelligence_process_diagnostics',
      'source_document', 'Audit Stratégique DomusVi — Optimisation des Processus Opérationnels — Mars 2026',
      'produced_by', 'LETHIA AI Consulting'
    ),
    $json${
      "synthese": "Cet audit révèle une réalité connue du terrain mais rarement quantifiée : les équipes DomusVi sont compétentes et engagées, mais elles opèrent dans un système qui les bride. La pénurie de personnel ne sera pas résolue à court terme — c'est un fait démographique. Mais l'impact de cette pénurie peut être massivement atténué en rendant chaque collaborateur plus efficace grâce à l'élimination des frictions, l'automatisation de l'administratif et la clarification des responsabilités.\n\nCinq convictions clés : (1) Chaque minute récupérée sur l'administratif est une minute rendue au résident — le personnel soignant ne consacre que 50% de son temps au soin direct, l'IA peut porter ce ratio à 65-70% sous 12 mois. (2) L'intérim est le symptôme, pas la maladie — la fidélisation et la planification prédictive peuvent réduire le recours à l'intérim de 20-30%. (3) Le directeur d'établissement est le maillon critique à protéger — lui donner un assistant IA et des processus automatisés, c'est sauver l'ensemble de la chaîne. (4) La donnée est le carburant de l'optimisation, mais elle n'existe pas encore sous forme exploitable — sans SIRH unifié et tableau de bord temps réel, chaque décision est prise à l'aveugle. (5) L'humain reste au centre — la technologie doit servir l'humain, pas l'inverse.",

      "contexte_sectoriel": {
        "marche": "Le secteur des EHPAD en France traverse une crise structurelle sans précédent. Les 7 500 établissements français (610 000 lits) font face à une convergence de pressions financières, humaines et réglementaires. 66% des EHPAD étaient déficitaires en 2023 (vs 27% en 2020). Pour les établissements publics, ce chiffre atteint 84,4%, avec un déficit cumulé estimé à 800 millions d'euros.",
        "donnees_cles_domusvi": {
          "ca_2023": "2,2 Md€ (+10% vs 2022)",
          "etablissements": "500+, 9 pays",
          "collaborateurs": "38 000",
          "taux_occupation_france": "94%"
        },
        "tendances_structurantes": [
          "Pénurie de personnel critique : 61% des EHPAD en difficulté de recrutement, 150 000+ postes/an en aides-soignants — recours massif à l'intérim",
          "Pression financière systémique : 66% des EHPAD déficitaires, inflation + Ségur non compensé",
          "Exigence réglementaire croissante : évaluations HAS, CPOM, contrôles ARS renforcés post-Orpea",
          "Virage numérique et IA : domotique, télémédecine, DUI, outils de planification IA",
          "Évolution vers des plateformes de services : EHPAD → plateforme (domicile + hébergement + accueil de jour)",
          "Consolidation du secteur : rachats, fusions, industrialisation indispensable pour les grands groupes"
        ],
        "implication_strategique": "L'optimisation des processus n'est pas un projet d'amélioration continue classique : c'est une condition de survie économique. Chaque heure gagnée sur l'administratif est une heure rendue au résident. Trois leviers : automatisation intelligente des tâches répétitives, refonte des processus générateurs de friction, amélioration des conditions de travail comme levier de rétention."
      },

      "cartographie_activites": {
        "personnel_medical": [
          {"ref": "M1", "activite": "Soins quotidiens", "description": "Toilette, habillage, aide aux repas, mobilisation, changes, prévention des escarres. Activités normées par le projet de soins individualisé (PSI).", "pct_temps": "35-40%"},
          {"ref": "M2", "activite": "Administration des traitements", "description": "Préparation et distribution des médicaments, injections, pansements, surveillance des constantes, gestion des protocoles d'urgence.", "pct_temps": "15-20%"},
          {"ref": "M3", "activite": "Transmissions et traçabilité", "description": "Saisie des transmissions ciblées dans le DUI, relevé des actes, alertes médicales, transmissions orales inter-équipes.", "pct_temps": "10-15%"},
          {"ref": "M4", "activite": "Coordination médicale", "description": "Lien avec médecins traitants, pharmacies, laboratoires, hôpitaux, spécialistes. Organisation des consultations et hospitalisations.", "pct_temps": "8-10%"},
          {"ref": "M5", "activite": "Animation et vie sociale", "description": "Activités thérapeutiques, ateliers mémoire, sorties, événements, lien avec les familles, accompagnement en fin de vie.", "pct_temps": "8-10%"},
          {"ref": "M6", "activite": "Gestion des plannings", "description": "Roulement, remplacement des absences, gestion des heures supplémentaires, intérim, adaptation aux urgences.", "pct_temps": "10-15%"}
        ],
        "staff_administratif": [
          {"ref": "A1", "activite": "Gestion des admissions", "description": "Réception des demandes, évaluation GIR, constitution du dossier, contrat de séjour, relation avec les familles, gestion liste d'attente, coordination avec le médecin coordonnateur.", "pct_temps": "15-20%"},
          {"ref": "A2", "activite": "Gestion RH opérationnelle", "description": "Recrutement (annonces, entretiens, onboarding), gestion des plannings, suivi des absences, déclarations intérim, gestion des contrats CDD/CDI, médecine du travail.", "pct_temps": "20-25%"},
          {"ref": "A3", "activite": "Facturation et recouvrement", "description": "Facturation tripartite (hébergement/dépendance/soins), suivi des paiements familles, relances impayés, gestion ASH, APA.", "pct_temps": "10-15%"},
          {"ref": "A4", "activite": "Reporting et conformité", "description": "Tableaux de bord d'activité, remontées siège, indicateurs qualité, préparation des évaluations HAS, suivi CPOM, déclarations obligatoires.", "pct_temps": "15-20%"},
          {"ref": "A5", "activite": "Relation familles et résidents", "description": "Accueil, réclamations, CVS (Conseil de Vie Sociale), communication, gestion des litiges, satisfaction.", "pct_temps": "10-15%"},
          {"ref": "A6", "activite": "Intendance et logistique", "description": "Commandes (alimentation, fournitures, matériel médical), suivi des prestataires (ménage, restauration, blanchisserie), maintenance bâtiment.", "pct_temps": "10-15%"}
        ],
        "fournisseurs": [
          {"ref": "F1", "activite": "Référencement et négociation", "description": "Sélection des fournisseurs (appels d'offres siège), négociation des contrats-cadres, conditions tarifaires, SLA qualité.", "pct_temps": "15-20%"},
          {"ref": "F2", "activite": "Commandes opérationnelles", "description": "Passation des commandes par les établissements, suivi des livraisons, contrôle réception, gestion des litiges qualité.", "pct_temps": "30-35%"},
          {"ref": "F3", "activite": "Gestion des contrats", "description": "Suivi des échéances, renouvellements, conformité réglementaire (traçabilité alimentaire, normes DASRI, certifications).", "pct_temps": "15-20%"},
          {"ref": "F4", "activite": "Suivi budgétaire achats", "description": "Consolidation des dépenses, analyse des écarts, reporting siège, optimisation des volumes.", "pct_temps": "15-20%"},
          {"ref": "F5", "activite": "Gestion de l'intérim médical", "description": "Relation avec les agences d'intérim santé, validation des profils, suivi des missions, contrôle des facturations.", "pct_temps": "15-20%"}
        ],
        "pouvoirs_publics": [
          {"ref": "P1", "activite": "Négociation CPOM", "description": "Contrat Pluriannuel d'Objectifs et de Moyens : négociation des dotations soins et dépendance, objectifs qualité, engagement sur 5 ans.", "pct_temps": "20-25%"},
          {"ref": "P2", "activite": "Évaluations et certifications", "description": "Préparation des évaluations HAS (interne + externe), plans d'amélioration, mise en conformité, suivi des recommandations.", "pct_temps": "20-25%"},
          {"ref": "P3", "activite": "Déclarations et reporting réglementaire", "description": "ERRD, coupes PATHOS/AGGIR, déclarations d'événements indésirables, enquêtes DREES.", "pct_temps": "15-20%"},
          {"ref": "P4", "activite": "Gestion des autorisations", "description": "Renouvellements d'autorisation, demandes de lits supplémentaires, habilitation aide sociale, autorisations de travaux.", "pct_temps": "10-15%"},
          {"ref": "P5", "activite": "Gestion de crise et inspection", "description": "Réponse aux contrôles ARS, gestion des signalements, plans de continuité d'activité (PCA), gestion des crises sanitaires.", "pct_temps": "15-20%"}
        ],
        "direction_financiere": [
          {"ref": "D1", "activite": "Consolidation et clôture", "description": "Consolidation mensuelle multi-établissements et multi-pays, clôtures trimestrielles, reporting actionnaires/banques.", "pct_temps": "25-30%"},
          {"ref": "D2", "activite": "Budget et prévisionnel", "description": "Élaboration budgétaire par établissement, pilotage des écarts, reprévisions, plans d'investissement.", "pct_temps": "15-20%"},
          {"ref": "D3", "activite": "Trésorerie et dette", "description": "Gestion de la trésorerie groupe, suivi des covenants bancaires, pilotage du BFR, relations avec les créanciers.", "pct_temps": "15-20%"},
          {"ref": "D4", "activite": "Contrôle de gestion", "description": "Analyse de rentabilité par établissement, coût par résident, analyse des variances masse salariale, pilotage de l'intérim.", "pct_temps": "15-20%"},
          {"ref": "D5", "activite": "Conformité et fiscalité", "description": "Obligations fiscales multi-pays, contrôles URSSAF, audits commissaires, conformité ARS sur les sections tarifaires.", "pct_temps": "10-15%"}
        ]
      },

      "repartition_charge": {
        "analyse": "Déséquilibre structurel commun à toutes les fonctions : les tâches administratives, de saisie et de reporting absorbent une part disproportionnée du temps, au détriment des activités à forte valeur ajoutée.",
        "constat_critique": "Le personnel soignant ne consacre que 50% de son temps au soin direct des résidents. Les 50% restants sont absorbés par la traçabilité, la coordination, les tâches administratives et la gestion des plannings. Dans un contexte de pénurie, chaque pourcentage récupéré sur l'administratif équivaut à recruter du personnel supplémentaire à effectif constant.",
        "par_fonction": [
          {"fonction": "Personnel médical", "coeur_metier": "Soins directs (50%)", "administratif": "Traçabilité / saisie DUI (15%)", "relationnel": "Plannings / coordination (20%)", "pilotage": "Relation familles (15%)"},
          {"fonction": "Staff administratif", "coeur_metier": "RH opérationnel (25%)", "administratif": "Admin / saisie / reporting (35%)", "relationnel": "Relation familles / admissions (20%)", "pilotage": "Logistique (20%)"},
          {"fonction": "Fournisseurs", "coeur_metier": "Commandes opérationnelles (35%)", "administratif": "Suivi admin / litiges (25%)", "relationnel": "Négociation (20%)", "pilotage": "Reporting (20%)"},
          {"fonction": "Pouvoirs publics", "coeur_metier": "CPOM / Évaluations (45%)", "administratif": "Déclarations / reporting (30%)", "relationnel": "Autorisations (15%)", "pilotage": "Gestion de crise (10%)"},
          {"fonction": "Direction financière", "coeur_metier": "Consolidation / clôture (30%)", "administratif": "Reporting / conformité (25%)", "relationnel": "Contrôle de gestion (25%)", "pilotage": "Stratégie / trésorerie (20%)"}
        ]
      },

      "cartographie_interlocuteurs": {
        "personnel_medical": [
          {"interlocuteur": "Résidents", "frequence": "Continu", "nature": "Soins, accompagnement, observation", "friction": "Ratio soignant/résident insuffisant"},
          {"interlocuteur": "Familles des résidents", "frequence": "Hebdomadaire", "nature": "Information, réclamation, accompagnement deuil", "friction": "Attentes croissantes, charge émotionnelle"},
          {"interlocuteur": "Médecins traitants", "frequence": "Hebdomadaire", "nature": "Prescriptions, visites, coordination soins", "friction": "Disponibilité limitée, délais de réponse"},
          {"interlocuteur": "Pharmacies / Laboratoires", "frequence": "Quotidien", "nature": "Dispensation, analyses, urgences", "friction": "Erreurs de transmission, délais"},
          {"interlocuteur": "Hôpitaux / Urgences", "frequence": "Variable", "nature": "Transferts, hospitalisations, retours", "friction": "Coordination défaillante, perte d'info"},
          {"interlocuteur": "Intérimaires / Remplaçants", "frequence": "Très fréquent", "nature": "Intégration, transmission, supervision", "friction": "Rotation élevée, méconnaissance du résident"},
          {"interlocuteur": "Direction d'établissement", "frequence": "Quotidien", "nature": "Alertes, besoins RH, organisation", "friction": "Surcharge de la direction"}
        ],
        "staff_administratif": [
          {"interlocuteur": "Familles (admissions, facturation)", "frequence": "Quotidien", "nature": "Dossiers, contrats, paiements, réclamations", "friction": "Complexité dossiers, impayés, émotionnel"},
          {"interlocuteur": "Siège DomusVi", "frequence": "Hebdomadaire", "nature": "Reporting, directives, validation budgétaire", "friction": "Multiplicité des remontées, formats changeants"},
          {"interlocuteur": "ARS / Conseil Départemental", "frequence": "Mensuel/Trimestriel", "nature": "CPOM, dotations, évaluations, contrôles", "friction": "Lourdeur procédurale, délais de réponse"},
          {"interlocuteur": "Agences d'intérim santé", "frequence": "Quasi-quotidien", "nature": "Demandes urgentes, validation profils, factures", "friction": "Coûts excessifs, qualité variable"},
          {"interlocuteur": "Fournisseurs divers", "frequence": "Hebdomadaire", "nature": "Commandes, livraisons, litiges, facturation", "friction": "Multiplicité, suivi manuel, erreurs"},
          {"interlocuteur": "Équipe soignante interne", "frequence": "Quotidien", "nature": "Besoins RH, plannings, formations, conflits", "friction": "Interface critique mais non outillée"}
        ],
        "direction_financiere": [
          {"interlocuteur": "Directeurs d'établissement", "frequence": "Mensuel", "nature": "Budgets, écarts, plans d'action", "friction": "Qualité hétérogène des données remontées"},
          {"interlocuteur": "Banques / Créanciers", "frequence": "Trimestriel", "nature": "Covenants, refinancement, reporting", "friction": "Exigence de précision, délais serrés"},
          {"interlocuteur": "ARS / Départements", "frequence": "Annuel/Ponctuel", "nature": "ERRD, tarification, négociation dotations", "friction": "Complexité tripartite, délais longs"},
          {"interlocuteur": "Commissaires aux comptes", "frequence": "Semestriel", "nature": "Audits, certifications, conformité", "friction": "Volume de justificatifs multi-entités"},
          {"interlocuteur": "Équipe achats / fournisseurs", "frequence": "Continu", "nature": "Validation factures, litiges, provisions", "friction": "Volume, circuit de validation long"}
        ]
      },

      "frictions": {
        "systemiques": [
          {"titre": "Le cercle vicieux de l'intérim", "description": "28% des directions recourent à l'intérim quotidiennement. L'intérim coûte 2 à 3 fois plus cher qu'un CDI, dégrade la continuité des soins (méconnaissance des résidents), épuise les titulaires qui doivent superviser, et aggrave le déficit financier qui empêche de recruter en CDI."},
          {"titre": "La noyade administrative des directeurs d'établissement", "description": "Le directeur cumule les rôles de DRH, DAF, directeur qualité, responsable sécurité et interlocuteur des familles. Le temps consacré au reporting et à la conformité réglementaire a augmenté de 40% en 3 ans."},
          {"titre": "Les silos d'information établissement/siège", "description": "Chaque établissement fonctionne avec ses propres outils (Excel, cahiers papier, logiciels différents). Le siège n'a pas de visibilité temps réel. La consolidation est manuelle et mobilise des jours-homme considérables."},
          {"titre": "La traçabilité chronophage", "description": "Les soignants passent 15 à 20% de leur temps à saisir des transmissions dans le DUI, souvent sur des postes partagés, avec des interfaces peu ergonomiques."},
          {"titre": "L'absence de standardisation des processus", "description": "Chaque établissement a développé ses propres pratiques d'admission, de facturation, de gestion des plannings et de reporting. L'intégration de nouveaux établissements (ex : Medeos, 34 sites) multiplie les hétérogénéités."}
        ],
        "par_fonction": {
          "personnel_medical": [
            {"pain_point": "Ratio soignant/résident insuffisant", "description": "L'effectif ne permet pas d'assurer un accompagnement individualisé de qualité dans les moments clés (repas, coucher, nuit).", "severite": "Critique"},
            {"pain_point": "Gestion des remplacements chaotique", "description": "L'appel aux remplaçants se fait par téléphone, WhatsApp, carnets personnels. Aucune plateforme centralisée, processus chronophage pour les cadres de santé.", "severite": "Élevé"},
            {"pain_point": "Coordination ville-hôpital défaillante", "description": "Les transferts aux urgences se font sans dossier complet. Les retours d'hospitalisation arrivent sans information exploitable. Risque iatrogène.", "severite": "Élevé"},
            {"pain_point": "Épuisement et perte de sens", "description": "Le soignant ne soigne plus assez. Il gère, il trace, il remplace, il compense. Le sentiment de maltraitance institutionnelle malgré soi est un facteur majeur de turnover.", "severite": "Critique"}
          ],
          "staff_administratif": [
            {"pain_point": "Surcharge RH opérationnelle", "description": "Le recrutement, la gestion des plannings, les déclarations d'intérim et les arrêts maladie consomment 25% du temps du staff administratif. Pas de SIRH intégré dans beaucoup d'établissements.", "severite": "Critique"},
            {"pain_point": "Facturation tripartite complexe", "description": "La séparation hébergement / dépendance / soins crée une mécanique de facturation lourde, avec des interlocuteurs différents (familles, département, ARS) et des délais de paiement hétérogènes.", "severite": "Élevé"},
            {"pain_point": "Reporting multi-canal", "description": "Le siège demande des reportings dans des formats spécifiques, l'ARS dans d'autres, le département dans d'autres encore. La direction passe des heures à reformater les mêmes données.", "severite": "Élevé"},
            {"pain_point": "Gestion des admissions artisanale", "description": "Les demandes d'admission arrivent par téléphone, email, courrier, via ViaTrajectoire. Le suivi des listes d'attente est souvent sur Excel ou papier.", "severite": "Moyen"},
            {"pain_point": "Impayés et recouvrement", "description": "Les impayés familles augmentent (reste à charge moyen ~2 200€/mois). Les procédures ASH sont longues et les relances manuelles.", "severite": "Moyen"}
          ],
          "fournisseurs": [
            {"pain_point": "Intérim : coût et qualité", "description": "L'intérim médical est la première variable d'ajustement et le premier poste de dérive budgétaire. Certains établissements y consacrent 10-15% de leur masse salariale totale.", "severite": "Critique"},
            {"pain_point": "Multiplicité des commandes", "description": "500+ établissements passent des commandes individuelles. Le pouvoir de négociation groupe est sous-exploité faute de centralisation et de données consolidées.", "severite": "Élevé"},
            {"pain_point": "Traçabilité réglementaire", "description": "Les normes alimentaires (HACCP), les dispositifs médicaux (traçabilité lots) et les déchets (DASRI) imposent une documentation lourde, souvent gérée sur papier.", "severite": "Moyen"}
          ]
        },
        "zones_grises": [
          {"zone": "Qui pilote la qualité des soins au quotidien ?", "analyse": "Le médecin coordonnateur a un rôle consultatif, la cadre de santé gère l'opérationnel, le directeur a la responsabilité juridique. En pratique, personne n'a l'autorité complète pour arbitrer."},
          {"zone": "Qui est responsable du remplissage de l'établissement ?", "analyse": "L'admission dépend du directeur, de l'évaluation médicale (médecin co.), de la validation administrative, et du pipeline ViaTrajectoire. Le taux d'occupation chute faute de processus fluide."},
          {"zone": "Qui gère la relation famille post-admission ?", "analyse": "Le directeur pour les aspects contractuels, l'équipe soignante pour le quotidien, la psychologue pour l'accompagnement. Les familles ne savent pas à qui s'adresser."},
          {"zone": "Qui déclenche et valide le recours à l'intérim ?", "analyse": "La cadre de santé identifie le besoin, le directeur valide le budget, l'administratif passe la commande. Le circuit de validation rallonge les délais et la recherche se fait dans l'urgence."}
        ],
        "goulots": [
          {"ref": "G1", "titre": "Absence → Remplacement → Intérim", "description": "Temps moyen : 4 à 24h. Le poste reste vacant pendant les heures critiques. La cadre de santé passe 1 à 2 heures par jour à téléphoner pour trouver des remplaçants.", "cible": "Remplacement automatisé en moins de 2h"},
          {"ref": "G2", "titre": "Admission → Installation → Facturation", "description": "Temps moyen : 2 à 4 semaines entre la demande et la première facturation. Chaque jour de lit vide coûte 150 à 250€ de manque à gagner.", "cible": "5 à 7 jours"},
          {"ref": "G3", "titre": "Reporting → Décision → Action", "description": "Les indicateurs arrivent au siège avec 2 à 4 semaines de retard. Les décisions sont prises sur des données obsolètes. La boucle de pilotage est trop lente pour un secteur en tension permanente.", "cible": "Dashboard temps réel"}
        ]
      },

      "feuille_de_route": {
        "quick_wins": [
          {"ref": "QW-01", "action": "Plateforme de remplacement digitalisée", "description": "Déployer un outil type Hublo/MStaff pour automatiser la recherche de remplaçants : alerte diffusée en un clic à un pool de professionnels qualifiés et géolocalisés. Fin des appels téléphoniques.", "gain": "1-2h/jour pour les cadres de santé", "levier": "IA + Process", "impact": "Critique", "fonction": "Médical + Admin"},
          {"ref": "QW-02", "action": "Dictée vocale pour les transmissions DUI", "description": "Équiper les soignants de terminaux mobiles avec saisie vocale (transcription IA). Les transmissions sont dictées au chevet du résident et structurées automatiquement.", "gain": "30-45 min/poste/jour", "levier": "IA", "impact": "Élevé", "fonction": "Médical"},
          {"ref": "QW-03", "action": "Dashboard temps réel par établissement", "description": "Connecter les données existantes (DUI, RH, facturation) dans un tableau de bord unique visible par la direction. Taux d'occupation, absentéisme, GMP, indicateurs qualité, masse salariale — en temps réel.", "gain": "Pilotage immédiat", "levier": "Process + IA", "impact": "Élevé", "fonction": "Management + DAF"},
          {"ref": "QW-04", "action": "Automatisation du reporting siège", "description": "Éliminer les saisies manuelles de reporting en connectant les systèmes d'information des établissements au portail siège via des flux automatisés (API ou ETL).", "gain": "4-8h/sem par directeur", "levier": "Process", "impact": "Élevé", "fonction": "Admin + DAF"},
          {"ref": "QW-05", "action": "Standardisation du processus d'admission", "description": "Déployer un workflow unique de traitement des demandes (ViaTrajectoire → évaluation → visite → contrat → installation) avec des SLA à chaque étape.", "gain": "Réduire le délai d'admission de 3-4 semaines à 7-10 jours", "levier": "Process", "impact": "Élevé", "fonction": "Admin"},
          {"ref": "QW-06", "action": "Mise en place de SLA intérim", "description": "Contractualiser des engagements de réponse avec les agences d'intérim : profil qualifié proposé sous 4h, confirmation sous 8h. Pénalités en cas de non-respect.", "gain": "Réduction du coût intérim de 10-15%", "levier": "Process + Humain", "impact": "Moyen", "fonction": "Admin + Fournisseurs"}
        ],
        "projets_structurants": [
          {"ref": "PS-01", "action": "SIRH unifié multi-établissements", "description": "Déployer un système RH intégré (plannings, absences, intérim, formations, évaluations) commun à tous les établissements. Élimine les fichiers Excel, centralise les données et permet le pilotage prédictif des effectifs.", "gain": "Fin des silos RH, pilotage prédictif", "levier": "Process + IA", "impact": "Critique"},
          {"ref": "PS-02", "action": "IA de planification prédictive des effectifs", "description": "Algorithme analysant l'historique (absences saisonnières, pics d'activité, profil de dépendance) pour anticiper les besoins de staffing à 30/60/90 jours.", "gain": "Anticipation 90j, réduction intérim 20-30%", "levier": "IA", "impact": "Critique"},
          {"ref": "PS-03", "action": "Portail familles digital", "description": "Plateforme unique où les familles peuvent suivre le quotidien de leur proche (photos activités, transmission simplifiée, rendez-vous, facturation). Réduit de 40-50% les appels téléphoniques.", "gain": "Satisfaction +, appels -40-50%", "levier": "IA + Process", "impact": "Élevé"},
          {"ref": "PS-04", "action": "Centrale d'achats intelligente", "description": "Unifier les commandes des 500+ établissements sur une plateforme centralisée avec négociation automatisée, suivi des livraisons et analyse des consommations.", "gain": "Économie estimée 8-12% sur les achats hors intérim", "levier": "Process + IA", "impact": "Élevé"},
          {"ref": "PS-05", "action": "Automatisation de la facturation tripartite", "description": "Industrialiser le processus de facturation en automatisant les calculs (tarifs hébergement, APA, dotation soins), les émissions de factures et les relances. Réduction du délai de facturation de 50%.", "gain": "Délai facturation -50%", "levier": "Process", "impact": "Élevé"},
          {"ref": "PS-06", "action": "Programme de fidélisation du personnel", "description": "Combiner outils IA (détection des signaux de désengagement, analyse du turnover) et actions humaines (parcours de carrière, reconnaissance, conditions de travail). Objectif : réduire le turnover de 25% à 18%.", "gain": "Turnover de 25% à 18%", "levier": "Humain + IA", "impact": "Critique"}
        ],
        "transformations_profondes": [
          {"ref": "TP-01", "action": "Agent IA assistant du directeur d'établissement", "description": "Assistant IA conversationnel capable de : répondre aux questions réglementaires, générer automatiquement les reportings ARS/siège, préparer les dossiers CPOM, analyser les indicateurs de performance et alerter sur les dérives.", "gain": "Directeur en pilote, plus en saisisseur", "levier": "IA", "impact": "Transformant"},
          {"ref": "TP-02", "action": "Dossier résident unifié et interopérable", "description": "Dossier numérique unique couvrant l'intégralité du parcours (admission → séjour → hospitalisation → retour → sortie), interopérable avec les systèmes hospitaliers, pharmacies et médecins traitants.", "gain": "Fin des ruptures d'information", "levier": "Process + IA", "impact": "Critique"},
          {"ref": "TP-03", "action": "Modèle de pilotage prédictif groupe", "description": "Système de Business Intelligence intégrant toutes les données opérationnelles, RH et financières pour modéliser l'évolution de chaque établissement à 6-12 mois : taux d'occupation, besoin en recrutement, rentabilité, risque qualité.", "gain": "Pilotage data-driven des 500+ sites", "levier": "IA", "impact": "Stratégique"},
          {"ref": "TP-04", "action": "Refonte du modèle EHPAD → Plateforme de services", "description": "Transformer progressivement le modèle pur EHPAD vers une plateforme intégrant hébergement, accueil de jour, services à domicile et télémédecine. Nécessite une réingénierie complète des processus opérationnels.", "gain": "Nouveau modèle économique", "levier": "Humain + Process", "impact": "Stratégique"}
        ]
      },

      "matrice_impact": [
        {"action": "QW-01 — Remplacement digitalisé", "impact": "Critique", "effort": "Faible", "phase": "Phase 1", "roi": "1-2h/jour récupérées par cadre de santé"},
        {"action": "QW-02 — Dictée vocale DUI", "impact": "Élevé", "effort": "Faible", "phase": "Phase 1", "roi": "30-45 min/poste/jour récupérées au soin"},
        {"action": "QW-04 — Reporting automatisé", "impact": "Élevé", "effort": "Faible", "phase": "Phase 1", "roi": "4-8h/sem récupérées par directeur"},
        {"action": "QW-05 — Process admission standardisé", "impact": "Élevé", "effort": "Moyen", "phase": "Phase 1", "roi": "Admission de 4 semaines à 10 jours"},
        {"action": "PS-01 — SIRH unifié", "impact": "Critique", "effort": "Élevé", "phase": "Phase 2", "roi": "Fin des silos RH, pilotage prédictif"},
        {"action": "PS-02 — IA planification effectifs", "impact": "Critique", "effort": "Moyen", "phase": "Phase 2", "roi": "Anticipation 90j, réduction intérim 20-30%"},
        {"action": "PS-04 — Centrale achats IA", "impact": "Élevé", "effort": "Moyen", "phase": "Phase 2", "roi": "Économie 8-12% sur achats récurrents"},
        {"action": "PS-06 — Fidélisation personnel", "impact": "Critique", "effort": "Élevé", "phase": "Phase 2", "roi": "Turnover de 25% à 18%"},
        {"action": "TP-01 — Agent IA directeur", "impact": "Transformant", "effort": "Élevé", "phase": "Phase 3", "roi": "Directeur en pilote, plus en saisisseur"},
        {"action": "TP-03 — BI prédictive groupe", "impact": "Stratégique", "effort": "Élevé", "phase": "Phase 3", "roi": "Pilotage data-driven des 500+ sites"}
      ],

      "prochaines_etapes": [
        {"echeance": "Semaine 1-2", "action": "Présentation de ce diagnostic au COMEX DomusVi. Validation du sponsoring, du budget et du chef de projet transformation."},
        {"echeance": "Semaine 3-4", "action": "Lancement des Quick Wins (QW-01 à QW-06) sur 5 établissements pilotes. Sélection des outils (Hublo, dictée vocale, BI)."},
        {"echeance": "Mois 2-3", "action": "Déploiement Quick Wins sur l'ensemble du parc France. Mesure des premiers gains (heures récupérées, coût intérim, satisfaction)."},
        {"echeance": "Mois 4-6", "action": "Lancement Phase 2 : SIRH unifié, IA planification, portail familles. Appel d'offres et cadrage."},
        {"echeance": "Mois 9-12", "action": "Bilan Phase 1+2. Mesure du ROI global. Go/No Go sur les transformations profondes (Phase 3)."},
        {"echeance": "Mois 18-24", "action": "Revue de transformation. Évaluation de l'impact sur la qualité de prise en charge, le turnover et la rentabilité."}
      ],

      "objectifs_transformation_18_mois": {
        "temps_soignant_soin": "65-70%",
        "reduction_cout_interim": "-25%",
        "reduction_temps_reporting_directeurs": "-50%",
        "turnover_cible": "18% (vs 25% actuel)"
      }
    }$json$
  );

  RAISE NOTICE 'Diagnostic process DomusVi importé avec succès.';

END;
$$;
