-- ============================================================
--  KREDO — Migration 011 : Import diagnostic process Robertet
--  Source : Audit_Strategique_Robertet_Mars2026.pdf (LETHIA AI)
--  Phase : 3 (process_diagnostic)
--
--  Ce script importe en base l'étude de diagnostic process
--  réalisée par Claude hors KREDO. Pattern réutilisable pour
--  les 2 autres études (même structure content_json, autre company).
--
--  PRÉREQUIS : à exécuter via le dashboard Supabase → SQL Editor
--  ou `supabase db push` avec la service role key.
--  Les variables workspace_id et owner_id sont résolues
--  automatiquement depuis profiles (single-tenant pour l'instant).
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

  -- ── Lookup Robertet (compte existant — pas de création) ─────────
  SELECT id INTO v_company_id
    FROM public.companies
   WHERE workspace_id = v_workspace_id
     AND name ILIKE '%robertet%'
   LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Compte Robertet introuvable dans companies (workspace %). Vérifiez le nom exact.', v_workspace_id;
  END IF;

  RAISE NOTICE 'Robertet trouvé : %', v_company_id;

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
    'Diagnostic process — Optimisation des processus opérationnels (Mars 2026)',
    'import',
    now(),
    jsonb_build_object(
      'pdf_storage_path', 'robertet/Audit_Strategique_Robertet_Mars2026.pdf',
      'pdf_bucket', 'ai_intelligence_process_diagnostics',
      'source_document', 'Audit Stratégique Robertet — Mars 2026',
      'produced_by', 'LETHIA AI Consulting'
    ),
    $json${
      "synthese": "Robertet dispose d'atouts exceptionnels — intégration verticale unique, patrimoine olfactif irremplaçable, positionnement premium sur le naturel — mais son modèle opérationnel n'a pas encore absorbé la révolution numérique et IA qui transforme le secteur. Les concurrents investissent massivement dans l'IA de formulation, la digitalisation de la relation client et l'automatisation des processus. Robertet doit accélérer sous peine de voir son avantage concurrentiel historique érodé par la technologie.\n\nTrois axes d'action pour la DSI : (1) Armer la R&D et la création avec des outils IA de formulation pour maintenir l'avance compétitive sur le naturel. (2) Industrialiser et automatiser les processus administratifs, commerciaux et supply chain pour libérer du temps sur les activités à forte valeur ajoutée. (3) Unifier le SI sur un périmètre international (50+ pays) pour permettre un pilotage groupe en temps réel.",

      "cartographie_activites": {
        "R&D et Création": {
          "description": "17 centres de création mondiaux pilotés depuis Grasse. Expertise sur 1 600+ matières premières naturelles.",
          "activites": [
            { "code": "R1", "label": "Briefs et analyse de marché", "part_temps": "15-20%" },
            { "code": "R2", "label": "Formulation et création (50 à 200 essais/projet)", "part_temps": "30-35%" },
            { "code": "R3", "label": "Évaluation sensorielle (panels)", "part_temps": "10-15%" },
            { "code": "R4", "label": "Conformité réglementaire (IFRA, REACH, allergènes)", "part_temps": "10-15%" },
            { "code": "R5", "label": "Industrialisation (lab → pilote → échelle industrielle)", "part_temps": "10-15%" },
            { "code": "R6", "label": "Documentation et PI", "part_temps": "5-10%" }
          ]
        },
        "Production Industrielle": {
          "description": "Extraction, distillation, synthèse, mélanges, conditionnement. Grasse + usines complémentaires.",
          "activites": [
            { "code": "P1", "label": "Planification de production", "part_temps": "20%" },
            { "code": "P2", "label": "Fabrication (extraction, distillation, mélange)", "part_temps": "40%" },
            { "code": "P3", "label": "Contrôle qualité (GC-MS, tests organoleptiques)", "part_temps": "20%" },
            { "code": "P4", "label": "Conditionnement et expédition", "part_temps": "10%" },
            { "code": "P5", "label": "Maintenance et HSE (ICPE)", "part_temps": "10-15%" },
            { "code": "P6", "label": "Amélioration continue (Lean, TRS)", "part_temps": "5-10%" }
          ]
        },
        "Supply Chain": {
          "description": "Approvisionnement stratégique en MP naturelles. Intégration verticale (filiales agricoles). Volatilité des cours.",
          "activites": [
            { "code": "S1", "label": "Approvisionnement MP (1 600+ références)", "part_temps": "25-30%" },
            { "code": "S2", "label": "Gestion des stocks (périssabilité)", "part_temps": "15-20%" },
            { "code": "S3", "label": "Logistique internationale (50+ pays, ADR/IATA/IMDG)", "part_temps": "20-25%" },
            { "code": "S4", "label": "S&OP et prévisions de demande", "part_temps": "15-20%" },
            { "code": "S5", "label": "Relations fournisseurs (audit, certifications bio/fair trade)", "part_temps": "10-15%" }
          ]
        },
        "Commercial et Développement": {
          "description": "B2B complexe. Clients : agroalimentaires, parfumerie niche/luxe, cosmétique, entretien. Cycle de vente 6-18 mois.",
          "activites": [
            { "code": "C1", "label": "Prospection et développement", "part_temps": "15-20%" },
            { "code": "C2", "label": "Gestion comptes clés (cross-sell divisions)", "part_temps": "25-30%" },
            { "code": "C3", "label": "Réponse aux briefs (coordination création/réglementaire)", "part_temps": "20-25%" },
            { "code": "C4", "label": "Pricing et négociation", "part_temps": "15-20%" },
            { "code": "C5", "label": "CRM et reporting", "part_temps": "10-15%" }
          ]
        },
        "Administratif et Support": {
          "activites": [
            { "code": "A1", "label": "RH (recrutement profils rares, paie multi-pays)", "part_temps": "25-30%" },
            { "code": "A2", "label": "Affaires réglementaires (REACH, CSRD, multi-juridictions)", "part_temps": "20-25%" },
            { "code": "A3", "label": "Systèmes d'information (ERP, PLM, LIMS, CRM)", "part_temps": "15-20%" },
            { "code": "A4", "label": "Juridique et PI (formules, brevets, contrats)", "part_temps": "10-15%" },
            { "code": "A5", "label": "Communication et RSE (CSRD, investisseurs)", "part_temps": "10-15%" }
          ]
        },
        "Direction Financière": {
          "activites": [
            { "code": "D1", "label": "Consolidation groupe (50+ pays, multi-devises, IFRS)", "part_temps": "25-30%" },
            { "code": "D2", "label": "Contrôle de gestion (rentabilité produit/client/division)", "part_temps": "20-25%" },
            { "code": "D3", "label": "Trésorerie et change (couverture, financement stocks)", "part_temps": "15-20%" },
            { "code": "D4", "label": "Fiscalité et compliance (prix de transfert 50+ pays)", "part_temps": "15-20%" },
            { "code": "D5", "label": "Relations investisseurs (Euronext, rapport annuel)", "part_temps": "10%" }
          ]
        }
      },

      "repartition_charge": {
        "constat_cle": "La charge réglementaire et de conformité représente 20 à 30 % du temps dans quasiment toutes les fonctions. C'est le premier poste d'optimisation. L'IA documentaire peut réduire cette charge de 40 à 60 % tout en améliorant la fiabilité et la traçabilité.",
        "par_fonction": [
          { "fonction": "R&D / Création", "coeur_metier": "Création et formulation (45%)", "qualite_conformite": "Réglementaire / doc (25%)", "coordination": "Évaluation / tests (20%)", "pilotage": "Industrialisation (10%)" },
          { "fonction": "Production", "coeur_metier": "Fabrication (40%)", "qualite_conformite": "Qualité / contrôles (20%)", "coordination": "Planification (20%)", "pilotage": "Maintenance / HSE (20%)" },
          { "fonction": "Supply Chain", "coeur_metier": "Approvisionnement (30%)", "qualite_conformite": "Logistique (25%)", "coordination": "Gestion stocks (20%)", "pilotage": "S&OP / prévisions (25%)" },
          { "fonction": "Commercial", "coeur_metier": "Relation client (35%)", "qualite_conformite": "Réponse briefs (20%)", "coordination": "Admin / CRM (25%)", "pilotage": "Prospection (20%)" },
          { "fonction": "Admin / Support", "coeur_metier": "RH et réglementaire (50%)", "qualite_conformite": "SI et juridique (30%)", "coordination": "Communication (20%)", "pilotage": "" },
          { "fonction": "DAF", "coeur_metier": "Consolidation / clôture (30%)", "qualite_conformite": "Contrôle de gestion (25%)", "coordination": "Fiscalité / compliance (25%)", "pilotage": "Trésorerie (20%)" }
        ]
      },

      "frictions": {
        "systemiques": [
          {
            "nom": "Le goulot réglementaire",
            "description": "Chaque nouvelle formulation doit passer par un screening réglementaire (IFRA, REACH, législations alimentaires locales, allergènes). Ce screening est largement manuel, mobilise des experts rares et constitue le principal goulot du cycle brief-to-market. Délai moyen : 2 à 4 semaines pour une vérification complète. Les concurrents (Symrise, Givaudan) automatisent ce processus avec l'IA.",
            "severite": "Critique"
          },
          {
            "nom": "La déconnexion Lab – Usine",
            "description": "Les formules créées au laboratoire ne sont pas toujours directement transposables à l'échelle industrielle. Les pertes de rendement, les ajustements de paramètres et les aller-retours entre R&D et production génèrent des retards de 1 à 3 semaines et des surcoûts matières de 5 à 10 % sur les premières productions.",
            "severite": "Élevé"
          },
          {
            "nom": "L'hétérogénéité des SI entre filiales",
            "description": "Les 50+ implantations internationales opèrent avec des systèmes d'information hétérogènes (ERP différents, Excel, outils locaux). La consolidation est manuelle, les données commerciales ne remontent pas en temps réel, et le pilotage groupe est réactif plutôt que prédictif.",
            "severite": "Critique"
          },
          {
            "nom": "Le cycle brief-to-submission trop long",
            "description": "De la réception du brief client à la soumission d'une proposition créative, le délai moyen est de 6 à 10 semaines. Les concurrents les plus rapides (Givaudan, Firmenich) visent 3 à 4 semaines grâce à l'IA de formulation. Chaque semaine de retard augmente le risque de perte du brief au profit d'un concurrent.",
            "severite": "Critique"
          },
          {
            "nom": "La complexité des prix de revient",
            "description": "Calculer le coût de revient d'une formule intégrant 20 à 80 matières premières, dont les cours fluctuent quotidiennement, avec des origines multi-pays et des taux de change variables, est un exercice complexe. Les commerciaux n'ont pas de visibilité en temps réel et doivent solliciter la DAF pour chaque cotation.",
            "severite": "Élevé"
          }
        ],
        "par_fonction": {
          "R&D et Création": [
            { "pain_point": "Time-to-submission excessif", "analyse": "6-10 semaines du brief à la soumission. L'IA de formulation pourrait réduire de 40 % le temps d'exploration.", "severite": "Critique" },
            { "pain_point": "Gestion des formules artisanale", "analyse": "Formules dans des systèmes hétérogènes (PLM, Excel, carnets). Recherche laborieuse dans 50 000+ formulations.", "severite": "Élevé" },
            { "pain_point": "Screening réglementaire manuel", "analyse": "Chaque ingrédient vérifié manuellement contre IFRA, REACH, listes alimentaires. Travail répétitif à fort risque d'erreur.", "severite": "Critique" },
            { "pain_point": "Perte de connaissance à la rotation", "analyse": "Quand un parfumeur senior quitte le groupe, des décennies de savoir-faire partent avec lui. Pas de capitalisation structurée.", "severite": "Élevé" },
            { "pain_point": "Feedback client non structuré", "analyse": "Retours clients par email/téléphone/oral. Pas de boucle de feedback formalisée alimentant l'apprentissage.", "severite": "Moyen" }
          ],
          "Commercial": [
            { "pain_point": "CRM sous-exploité", "analyse": "Données parcellaires. Commerciaux gèrent une partie du pipe dans des fichiers personnels. Pas de vue consolidée du pipeline groupe.", "severite": "Élevé" },
            { "pain_point": "Pricing complexe et lent", "analyse": "Calcul prix de vente = coût MP (cours du jour) + coût production + marge cible + conditions client + taux de change. Processus de 2-5 jours.", "severite": "Élevé" },
            { "pain_point": "Manque de visibilité sur la création", "analyse": "Le commercial ne sait pas en temps réel où en est la création sur son brief. Relances manuelles, délais non trackés.", "severite": "Élevé" },
            { "pain_point": "Coordination inter-divisions complexe", "analyse": "Un même client peut être travaillé par Parfumerie, Arômes et MP. Pas de coordination formalisée.", "severite": "Moyen" },
            { "pain_point": "Reporting multinational hétérogène", "analyse": "Chaque filiale reporte dans des formats et rythmes différents. Consolidation commerciale mondiale = exercice mensuel laborieux.", "severite": "Moyen" }
          ],
          "Production et Supply Chain": [
            { "pain_point": "Volatilité des MP naturelles", "analyse": "Cours pouvant varier de 30 à 100 % en un an (vanille, rose, jasmin). Absence d'outil prédictif, achats réactifs.", "severite": "Critique" },
            { "pain_point": "Planning perturbé par les urgences", "analyse": "Commandes urgentes = 15 à 25 % des OF. Chaque urgence désorganise le planning et dégrade le TRS des lignes.", "severite": "Élevé" },
            { "pain_point": "Délai de libération qualité", "analyse": "Analyse GC-MS et contrôles organoleptiques : 2 à 5 jours. S'ajoute au lead time de production.", "severite": "Élevé" },
            { "pain_point": "Complexité logistique internationale", "analyse": "Expédition de produits chimiques dans 50+ pays : MSDS, certificats, ADR, IATA, douanes.", "severite": "Élevé" },
            { "pain_point": "Traçabilité de bout en bout incomplète", "analyse": "La chaîne du champ (producteur) au lot client n'est pas numérisée. CSRD et attentes clients exigent une transparence totale.", "severite": "Moyen" }
          ]
        },
        "goulots": [
          {
            "nom": "Cycle Brief → Screening réglementaire → Soumission",
            "temps_actuel": "6-10 semaines",
            "cible": "3-4 semaines",
            "freins": "Screening réglementaire (2-4 sem.) + exploration manuelle des formulations (3-5 sem.)",
            "impact": "Perte de briefs au profit de concurrents plus rapides"
          },
          {
            "nom": "Cycle Commande client → Libération qualité → Expédition",
            "temps_actuel": "3-6 semaines",
            "cible": "1-2 semaines",
            "freins": "Délai d'analyse qualité (2-5 jours) + complexité documentation logistique internationale"
          },
          {
            "nom": "Cycle Budget → Cotation → Pricing → Acceptation client",
            "temps_actuel": "5-10 jours",
            "cible": "24-48h",
            "freins": "Complexité du calcul de prix de revient (multi-MP, multi-origines, multi-devises) + circuits de validation internes"
          },
          {
            "nom": "Zones grises de gouvernance",
            "description": "Pas de matrice de priorisation des briefs, pas de SLA brief-to-submission, pas de vue consolidée de la marge par projet, pas de gestionnaire de compte global multi-divisions formalisé."
          }
        ]
      },

      "feuille_de_route": {
        "quick_wins": [
          { "ref": "QW-01", "action": "IA de screening réglementaire automatisé", "description": "Assistant IA entraîné sur IFRA, REACH et législations alimentaires pour pré-screener chaque formulation en temps réel. Gain : de 2-4 semaines à 2-3 jours par formule.", "levier": "IA", "impact": "Critique", "fonctions": "R&D + Réglementaire" },
          { "ref": "QW-02", "action": "Générateur IA de documentation technique", "description": "Automatiser la production des FDS, certificats d'analyse, déclarations de conformité et fiches CSRD. Gain : 60-80 % du temps documentation.", "levier": "IA", "impact": "Élevé", "fonctions": "Réglementaire + Production" },
          { "ref": "QW-03", "action": "Dashboard temps réel groupe", "description": "Connecter les ERP des principales entités à un tableau de bord unifié : CA, pipeline, stocks critiques, KPIs production, délais. Fin du reporting manuel.", "levier": "Process + IA", "impact": "Élevé", "fonctions": "DAF + Management" },
          { "ref": "QW-04", "action": "Outil de pricing dynamique", "description": "Calculateur connecté aux cours des MP, aux formules et aux taux de change — prix de revient et de vente en moins de 10 minutes. Accès direct pour les commerciaux.", "levier": "IA + Process", "impact": "Élevé", "fonctions": "Commercial + DAF" },
          { "ref": "QW-05", "action": "Standardisation du brief client", "description": "Template de brief structuré et obligatoire. Pas de création lancée sans brief complet.", "levier": "Process", "impact": "Moyen", "fonctions": "Commercial + R&D" },
          { "ref": "QW-06", "action": "SLA formalisés brief-to-submission", "description": "Engagements de délai à chaque étape (brief J+2, screening J+5, première soumission J+21). Suivi automatisé, alertes en cas de dépassement.", "levier": "Process + Humain", "impact": "Moyen", "fonctions": "Toutes" }
        ],
        "projets_structurants": [
          { "ref": "PS-01", "action": "Plateforme IA de formulation assistée", "description": "Moteur IA entraîné sur les 50 000+ formulations Robertet. Propose des bases de formulation à partir du brief, accélère l'exploration, optimise les coûts matières. Le parfumeur reste maître. Réduction time-to-submission de 40-50 %.", "levier": "IA", "impact": "Critique", "fonctions": "R&D" },
          { "ref": "PS-02", "action": "Knowledge Base olfactive — capitalisation du savoir-faire", "description": "Numériser et structurer les carnets des parfumeurs, les évaluations sensorielles, les retours clients dans une base vectorielle interrogeable (RAG). Préservation du patrimoine immatériel de Robertet.", "levier": "IA", "impact": "Élevé", "fonctions": "R&D" },
          { "ref": "PS-03", "action": "Unification ERP / SI international", "description": "Déployer un socle ERP commun (SAP S/4HANA ou équivalent) sur les principales entités, modules standardisés achats/production/ventes/finance. Phase 1 : 10 principales filiales.", "levier": "Process", "impact": "Critique", "fonctions": "DSI + Toutes" },
          { "ref": "PS-04", "action": "Traçabilité blockchain des MP naturelles", "description": "Solution de traçabilité numérique du producteur au lot final, couvrant certifications (bio, fair trade, COSMOS), analyses qualité et empreinte carbone. Différenciateur premium.", "levier": "Process + IA", "impact": "Élevé", "fonctions": "Supply Chain + RSE" },
          { "ref": "PS-05", "action": "CRM unifié et intelligence commerciale", "description": "CRM groupe avec pipeline consolidé, historique briefs/soumissions, scoring des opportunités et coordination comptes multi-divisions. Intégré avec l'outil de pricing dynamique.", "levier": "Process + IA", "impact": "Élevé", "fonctions": "Commercial" },
          { "ref": "PS-06", "action": "Outil de prévision des cours de MP", "description": "Modèle prédictif analysant données de récolte, météo, marché et géopolitique pour anticiper l'évolution des cours des MP naturelles à 3-6 mois. Avantage achats de 5-10 %.", "levier": "IA", "impact": "Élevé", "fonctions": "Supply Chain + DAF" }
        ],
        "transformations_profondes": [
          { "ref": "TP-01", "action": "Co-pilote IA du parfumeur", "description": "Assistant IA intégré au poste du parfumeur / aromaticien : suggestion de formulations, simulation olfactive prédictive, optimisation coût/performance, génération de variantes. Robertet passe de l'artisanat assisté à la création augmentée.", "levier": "IA", "impact": "Transformant", "fonctions": "R&D" },
          { "ref": "TP-02", "action": "Jumeau numérique de l'usine de Grasse", "description": "Modélisation numérique des lignes de production pour simuler les impacts de changements (nouveaux produits, variations de volumes, maintenance) avant implémentation. Réduction des pertes de scaling de 30-50 %.", "levier": "IA + Process", "impact": "Stratégique", "fonctions": "Production" },
          { "ref": "TP-03", "action": "Plateforme client self-service", "description": "Portail digital permettant aux clients de suivre leurs projets en temps réel (statut des briefs, tracking commandes, certificats, documentation), de soumettre des briefs structurés et d'interagir avec la création.", "levier": "Process + IA", "impact": "Élevé", "fonctions": "Commercial + R&D" },
          { "ref": "TP-04", "action": "Observatoire IA des tendances olfactives et gustatives", "description": "Système de veille automatisé analysant les lancements produits mondiaux, les brevets, les réseaux sociaux et les données de marché pour alimenter la création avec des insights prospectifs en temps réel.", "levier": "IA", "impact": "Stratégique", "fonctions": "R&D + Commercial" }
        ]
      },

      "matrice_impact": [
        { "ref": "QW-01", "action": "Screening réglementaire IA", "impact": "Critique", "effort": "Faible", "phase": "Phase 1", "roi": "De 2-4 semaines à 2-3 jours par formule" },
        { "ref": "QW-02", "action": "Documentation IA", "impact": "Élevé", "effort": "Faible", "phase": "Phase 1", "roi": "60-80 % du temps doc récupéré" },
        { "ref": "QW-04", "action": "Pricing dynamique", "impact": "Élevé", "effort": "Faible", "phase": "Phase 1", "roi": "Cotation en 10 min vs 2-5 jours" },
        { "ref": "QW-06", "action": "SLA brief-to-submission", "impact": "Moyen", "effort": "Faible", "phase": "Phase 1", "roi": "Time-to-market mesurable et pilotable" },
        { "ref": "PS-01", "action": "IA formulation assistée", "impact": "Critique", "effort": "Moyen", "phase": "Phase 2", "roi": "Time-to-submission de 8 à 4 semaines" },
        { "ref": "PS-03", "action": "Unification ERP", "impact": "Critique", "effort": "Élevé", "phase": "Phase 2", "roi": "Pilotage groupe temps réel" },
        { "ref": "PS-05", "action": "CRM unifié", "impact": "Élevé", "effort": "Moyen", "phase": "Phase 2", "roi": "Pipeline consolidé, win rate +15-20 %" },
        { "ref": "PS-06", "action": "Prévision cours MP", "impact": "Élevé", "effort": "Moyen", "phase": "Phase 2", "roi": "Avantage achats 5-10 %" },
        { "ref": "TP-01", "action": "Co-pilote IA parfumeur", "impact": "Transformant", "effort": "Élevé", "phase": "Phase 3", "roi": "Création augmentée, avance concurrentielle" },
        { "ref": "TP-04", "action": "Observatoire tendances IA", "impact": "Stratégique", "effort": "Moyen", "phase": "Phase 3", "roi": "Anticipation des tendances de marché" }
      ]
    }$json$
  );

  RAISE NOTICE 'Résultat phase 3 inséré pour le run %', v_run_id;

END $$;
