-- ============================================================
-- 034_seed_fixed_price_projects
-- Seed : 3 projets au forfait issus du PDF de référence
-- Arkopharma (Move-to-Cloud), PONANT (TMA), ISelection (IA/RAG)
-- ============================================================

DO $$
DECLARE
  v_ws              uuid;
  v_arko_company    uuid;
  v_ponant_company  uuid;
  v_iselection_company uuid;
  v_arko_project    uuid;
  v_ponant_project  uuid;
  v_iselection_project uuid;
  v_eng_forfait     uuid;
  v_offer_conseil   uuid;
BEGIN
  SELECT id INTO v_ws FROM public.workspaces LIMIT 1;
  IF v_ws IS NULL THEN
    RAISE EXCEPTION 'Aucun workspace trouvé — seed impossible';
  END IF;

  -- ── Lookup companies (les créer si absentes) ──────────────

  SELECT id INTO v_arko_company FROM public.companies
    WHERE workspace_id = v_ws AND name ILIKE '%arkopharma%' LIMIT 1;
  IF v_arko_company IS NULL THEN
    INSERT INTO public.companies (workspace_id, name, lifecycle_status, priority, tags)
    VALUES (v_ws, 'Arkopharma', 'client_actif', 'haute',
            ARRAY['pharma','cloud','secnumcloud'])
    RETURNING id INTO v_arko_company;
  END IF;

  SELECT id INTO v_ponant_company FROM public.companies
    WHERE workspace_id = v_ws AND name ILIKE '%ponant%' LIMIT 1;
  IF v_ponant_company IS NULL THEN
    INSERT INTO public.companies (workspace_id, name, lifecycle_status, priority, tags)
    VALUES (v_ws, 'PONANT', 'client_actif', 'haute',
            ARRAY['luxe','croisières','tma'])
    RETURNING id INTO v_ponant_company;
  END IF;

  SELECT id INTO v_iselection_company FROM public.companies
    WHERE workspace_id = v_ws AND name ILIKE '%iselection%' LIMIT 1;
  IF v_iselection_company IS NULL THEN
    INSERT INTO public.companies (workspace_id, name, lifecycle_status, priority, tags)
    VALUES (v_ws, 'ISelection', 'client_actif', 'normale',
            ARRAY['immobilier','ia','rag'])
    RETURNING id INTO v_iselection_company;
  END IF;

  -- ── Lookup engagement type ────────────────────────────────

  SELECT id INTO v_eng_forfait FROM public.offer_engagement_types
    WHERE workspace_id = v_ws AND slug = 'forfait' LIMIT 1;

  SELECT id INTO v_offer_conseil FROM public.offers
    WHERE workspace_id = v_ws AND slug = 'conseil-gouvernance-ia' LIMIT 1;

  -- ════════════════════════════════════════════════════════════
  -- PROJET 1 : Arkopharma — Move-to-Cloud & SecNumCloud
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.projects (
    workspace_id, company_id, engagement_type_id,
    code, title, status,
    start_date_planned, end_date_planned,
    start_date_actual,
    progress_pct,
    contract_amount, cost_target, cost_actual,
    description,
    scope,
    deliverables, technologies,
    lessons_learned,
    billing_milestones,
    ref_status, ref_visibility,
    tags
  ) VALUES (
    v_ws, v_arko_company, v_eng_forfait,
    'ARKO-2026-001',
    'Cadrage Move-to-Cloud & SecNumCloud',
    'active',
    '2026-05-12', '2026-07-04',
    '2026-05-12',
    75,
    26200.00, 14700.00, 16500.00,
    E'Prestation de conseil stratégique démarrée mi-mai 2026. Audit du SI On-Premise vieillissant et définition de la trajectoire vers un Cloud hybride (Azure) avec contraintes fortes de souveraineté des données de santé.\n\nDifficultés rencontrées :\n- Shadow IT : découverte de ~20 serveurs non documentés gérés par des filiales, +4 jours de charge imprévus.\n- Accès bloqués : le RSSI client a mis 2 semaines à fournir les accès aux hyperviseurs VMWare.',
    '{"included": ["Cartographie applicative et infrastructure (TCO initial)", "Architecture cible Landing Zone Azure + prérequis SecNumCloud", "Roadmap de migration (Rehost, Refactor, Rearchitect)", "Chiffrage FinOps cible et build migration"], "excluded": ["Exécution de la migration", "Achats licences Azure"]}',
    ARRAY['Cartographie applicative', 'Architecture Landing Zone Azure', 'Roadmap migration', 'Chiffrage FinOps'],
    ARRAY['Azure', 'VMWare', 'SecNumCloud', 'Terraform'],
    'Le Shadow IT est systématiquement sous-estimé. Prévoir 10-15% de buffer sur les audits infrastructure. Exiger les accès hyperviseur dès le kick-off.',
    '[{"label": "Kick-off + cadrage", "pct": 30, "amount": 7860, "due_date": "2026-05-19", "invoiced_at": "2026-05-20"}, {"label": "Livraison roadmap", "pct": 50, "amount": 13100, "due_date": "2026-06-20"}, {"label": "Recette finale", "pct": 20, "amount": 5240, "due_date": "2026-07-04"}]',
    'approved', 'named',
    ARRAY['cloud', 'audit', 'secnumcloud', 'pharma']
  ) RETURNING id INTO v_arko_project;

  -- Phases Arkopharma
  INSERT INTO public.project_phases (workspace_id, project_id, sort_order, label, status, start_date_planned, end_date_planned, start_date_actual, planned_days, consumed_days, deliverables) VALUES
    (v_ws, v_arko_project, 1, 'Audit & Cartographie', 'completed', '2026-05-12', '2026-05-30', '2026-05-12', 18, 22,
     ARRAY['Cartographie applicative', 'Inventaire serveurs', 'TCO initial']),
    (v_ws, v_arko_project, 2, 'Architecture cible', 'in_progress', '2026-06-02', '2026-06-20', '2026-06-02', 10, 7,
     ARRAY['Landing Zone Azure', 'Prérequis SecNumCloud']),
    (v_ws, v_arko_project, 3, 'Roadmap & chiffrage', 'planned', '2026-06-23', '2026-07-04', NULL, 7, 0,
     ARRAY['Roadmap migration', 'Chiffrage FinOps']);

  -- Équipe Arkopharma
  INSERT INTO public.project_team_members (workspace_id, project_id, role_label, seniority, is_project_lead, planned_days, actual_days, daily_cost, start_date, end_date, contribution) VALUES
    (v_ws, v_arko_project, 'Architecte Cloud', 'senior', true, 20, 24, 450.00, '2026-05-12', '2026-07-04',
     'Pilotage du cadrage, cartographie applicative, définition de la Landing Zone Azure'),
    (v_ws, v_arko_project, 'Expert SecOps', 'confirme', false, 15, 15, 380.00, '2026-05-12', '2026-07-04',
     'Audit de sécurité, prérequis SecNumCloud, recommandations durcissement');

  -- ════════════════════════════════════════════════════════════
  -- PROJET 2 : PONANT — TMA Socle Applicatif Client
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.projects (
    workspace_id, company_id, engagement_type_id,
    code, title, status,
    start_date_planned, end_date_planned,
    start_date_actual,
    progress_pct,
    contract_amount, cost_target, cost_actual,
    description,
    scope,
    deliverables, technologies,
    lessons_learned,
    billing_milestones,
    ref_status, ref_visibility, ref_anonymized_label,
    tags
  ) VALUES (
    v_ws, v_ponant_company, v_eng_forfait,
    'PONANT-2025-001',
    'TMA Socle Applicatif Client',
    'active',
    '2025-01-06', '2026-12-31',
    '2025-01-06',
    62,
    528000.00, 272800.00, 285300.00,
    E'Contrat de Tierce Maintenance Applicative (TMA) pluriannuel démarré en janvier 2025. MCO et évolutions du portail client et tunnel de réservation B2C.\n\nDifficultés rencontrées :\n- Démission imprévue d''un Développeur Confirmé (nov. 2025). Le Lead Dev a dû redescendre dans l''opérationnel pendant 1 mois → risque surchauffe.\n- SLA non respecté (mars 2026) : incident critique API paiement résolu en 9h au lieu des 4h imparties. Pénalité contractuelle appliquée (-5 000 €).\n- Coût de recrutement d''urgence via cabinet externe : -7 500 €.',
    '{"included": ["Résolution tickets P1 à P4 (SLA stricts)", "Features mineures en Unités d''Oeuvre", "Pipeline CI/CD et tests automatisés Cypress", "COPIL mensuels et reporting vélocité"], "excluded": ["Refonte UX majeure", "Migration technique hors périmètre contractuel"]}',
    ARRAY['MCO portail client', 'Évolutions tunnel réservation', 'Pipeline CI/CD', 'Tests Cypress'],
    ARRAY['React', 'Node.js', 'PostgreSQL', 'Cypress', 'GitLab CI'],
    'Le turnover en cours de TMA est le risque n°1. Prévoir un plan de succession documenté. Les SLA sur les incidents critiques doivent être calibrés avec une marge de sécurité interne (objectif interne = 3h pour un SLA client de 4h).',
    '[{"label": "Forfait mensuel MCO", "pct": 70, "amount": 369600, "due_date": null}, {"label": "UO évolutives (trimestriel)", "pct": 20, "amount": 105600, "due_date": null}, {"label": "Bonus qualité annuel", "pct": 10, "amount": 52800, "due_date": "2026-01-15"}]',
    'approved', 'anonymized', 'Acteur majeur du tourisme de luxe',
    ARRAY['tma', 'mco', 'b2c', 'croisières']
  ) RETURNING id INTO v_ponant_project;

  -- Phases PONANT (par trimestre)
  INSERT INTO public.project_phases (workspace_id, project_id, sort_order, label, status, start_date_planned, end_date_planned, planned_days, consumed_days, deliverables) VALUES
    (v_ws, v_ponant_project, 1, 'T1 2025 — Onboarding & stabilisation', 'completed', '2025-01-06', '2025-03-31', 220, 220,
     ARRAY['Prise en main codebase', 'Mise en place monitoring']),
    (v_ws, v_ponant_project, 2, 'T2 2025 — Croisière', 'completed', '2025-04-01', '2025-06-30', 220, 220,
     ARRAY['MCO courant', 'Features réservation']),
    (v_ws, v_ponant_project, 3, 'T3-T4 2025 — Turnover & rattrapage', 'completed', '2025-07-01', '2025-12-31', 440, 440,
     ARRAY['MCO courant', 'Remplacement développeur', 'Rattrapage dette technique']),
    (v_ws, v_ponant_project, 4, 'S1 2026 — Stabilisation post-incident', 'in_progress', '2026-01-01', '2026-06-30', 440, 320,
     ARRAY['MCO courant', 'Renforcement SLA', 'Tests automatisés Cypress']);

  -- Équipe PONANT
  INSERT INTO public.project_team_members (workspace_id, project_id, role_label, seniority, is_project_lead, planned_days, actual_days, daily_cost, start_date, end_date, contribution) VALUES
    (v_ws, v_ponant_project, 'Lead Full-Stack', 'senior', true, 440, 460, 350.00, '2025-01-06', '2026-12-31',
     'Pilotage technique, architecture, code review, COPIL mensuels'),
    (v_ws, v_ponant_project, 'Développeur Full-Stack', 'confirme', false, 440, 400, 280.00, '2025-01-06', '2025-10-31',
     'Développement features et résolution tickets — démission nov. 2025'),
    (v_ws, v_ponant_project, 'Développeur Full-Stack', 'confirme', false, 220, 180, 300.00, '2025-12-01', '2026-12-31',
     'Remplacement — recrutement cabinet externe'),
    (v_ws, v_ponant_project, 'QA Engineer', 'confirme', false, 440, 420, 260.00, '2025-01-06', '2026-12-31',
     'Tests automatisés Cypress, campagnes de régression, reporting qualité');

  -- ════════════════════════════════════════════════════════════
  -- PROJET 3 : ISelection — Automatisation Agents IA & RAG
  -- ════════════════════════════════════════════════════════════

  INSERT INTO public.projects (
    workspace_id, company_id, engagement_type_id, offer_id,
    code, title, status,
    start_date_planned, end_date_planned,
    start_date_actual,
    progress_pct,
    contract_amount, cost_target, cost_actual,
    description,
    scope,
    deliverables, technologies,
    lessons_learned,
    billing_milestones,
    ref_status, ref_visibility,
    tags
  ) VALUES (
    v_ws, v_iselection_company, v_eng_forfait, v_offer_conseil,
    'ISEL-2026-001',
    'Automatisation IA — Agents RAG Dossiers Locataires',
    'active',
    '2026-04-07', '2026-06-27',
    '2026-04-07',
    85,
    38750.00, 23250.00, 24450.00,
    E'Projet d''innovation fixed-price. Automatisation de la pré-qualification des dossiers locataires et réponse aux questions juridiques des mandataires via IA conversationnelle nourrie par base de connaissances contractuelle (RAG).\n\nDifficultés rencontrées :\n- Coûts d''API explosifs : absence de garde-fous sur les boucles n8n → consommation de tokens OpenAI imprévue (-1 200 € sur la marge).\n- Attentes irréalistes (effet ChatGPT) : le client pensait que l''IA prendrait 100% des décisions d''attribution. Recadrage du périmètre : Agent autonome → Copilot Human-in-the-loop.',
    '{"included": ["Ingestion et vectorisation 10 000 documents juridiques (pgvector)", "Workflows n8n (scraping + API OpenAI)", "Interface conversationnelle Next.js + RAG", "Prompt engineering et tuning anti-hallucination"], "excluded": ["Hébergement production client", "Formation utilisateurs finaux", "Développement mobile natif"]}',
    ARRAY['Pipeline vectorisation pgvector', 'Workflows n8n', 'Interface chat Next.js', 'Documentation prompt engineering'],
    ARRAY['Next.js', 'pgvector', 'n8n', 'OpenAI API', 'Python', 'PostgreSQL'],
    'Les coûts API LLM doivent être plafonnés dès le sprint 0 (rate limiting, token budgets par workflow). Le "recadrage Copilot" est un pattern récurrent en IA : l''intégrer systématiquement dans le cadrage initial.',
    '[{"label": "Sprint 0 — Cadrage & PoC", "pct": 30, "amount": 11625, "due_date": "2026-04-25", "invoiced_at": "2026-04-28"}, {"label": "Sprint 1 — Pipeline RAG", "pct": 35, "amount": 13562.50, "due_date": "2026-05-23", "invoiced_at": "2026-05-26"}, {"label": "Sprint 2 — Interface & tuning", "pct": 35, "amount": 13562.50, "due_date": "2026-06-27"}]',
    'approved', 'named',
    ARRAY['ia', 'rag', 'immobilier', 'innovation', 'n8n']
  ) RETURNING id INTO v_iselection_project;

  -- Phases ISelection
  INSERT INTO public.project_phases (workspace_id, project_id, sort_order, label, status, start_date_planned, end_date_planned, start_date_actual, planned_days, consumed_days, deliverables) VALUES
    (v_ws, v_iselection_project, 1, 'Sprint 0 — Cadrage & PoC', 'completed', '2026-04-07', '2026-04-25', '2026-04-07', 15, 15,
     ARRAY['Cadrage fonctionnel', 'PoC vectorisation', 'Architecture technique']),
    (v_ws, v_iselection_project, 2, 'Sprint 1 — Pipeline RAG', 'completed', '2026-04-28', '2026-05-23', '2026-04-28', 20, 22,
     ARRAY['Pipeline ingestion pgvector', 'Workflows n8n', 'API RAG']),
    (v_ws, v_iselection_project, 3, 'Sprint 2 — Interface & tuning', 'in_progress', '2026-05-26', '2026-06-27', '2026-05-26', 20, 16,
     ARRAY['Interface chat Next.js', 'Prompt engineering', 'Tests anti-hallucination']);

  -- Équipe ISelection
  INSERT INTO public.project_team_members (workspace_id, project_id, role_label, seniority, is_project_lead, planned_days, actual_days, daily_cost, start_date, end_date, contribution) VALUES
    (v_ws, v_iselection_project, 'AI Product Manager', 'senior', true, 15, 15, 450.00, '2026-04-07', '2026-06-27',
     'Cadrage fonctionnel, recadrage périmètre Copilot, coordination client'),
    (v_ws, v_iselection_project, 'Data Scientist', 'senior', false, 20, 22, 400.00, '2026-04-07', '2026-06-27',
     'Pipeline vectorisation, prompt engineering, tuning RAG'),
    (v_ws, v_iselection_project, 'Data Engineer', 'confirme', false, 20, 20, 300.00, '2026-04-07', '2026-06-27',
     'Workflows n8n, API intégration, interface chat Next.js');

  RAISE NOTICE 'Seed projects OK — 3 projets, % phases, % team members créés',
    (SELECT count(*) FROM public.project_phases WHERE project_id IN (v_arko_project, v_ponant_project, v_iselection_project)),
    (SELECT count(*) FROM public.project_team_members WHERE project_id IN (v_arko_project, v_ponant_project, v_iselection_project));

END $$;
