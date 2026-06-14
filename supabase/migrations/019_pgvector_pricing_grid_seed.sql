-- ============================================================
-- 019_pgvector_pricing_grid_seed
-- 1. embedding vector(1536) sur job_profiles (pgvector activé)
-- 2. Colonnes tjm_recommended + location sur offer_pricing_grids
-- 3. Practice "QA & Testing" (absente de 015)
-- 4. Seed 120 lignes grille tarifaire TJM 2026
--    seniority_level : 'junior'|'confirme'|'senior'|'lead'|'expert'
--    Mapping CSV : Junior→junior, Confirmé→confirme, Senior→senior, Lead/Expert→lead
-- ============================================================

ALTER TABLE public.job_profiles
  ADD COLUMN embedding vector(1536);
-- Index ivfflat à créer APRÈS population des embeddings (min ~100 vecteurs)
-- CREATE INDEX idx_job_profiles_embedding ON job_profiles
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

ALTER TABLE public.offer_pricing_grids
  ADD COLUMN tjm_recommended numeric(10,2),
  ADD COLUMN location         text;

CREATE INDEX idx_offer_pricing_grids_location
  ON public.offer_pricing_grids (location);

INSERT INTO public.offer_practices (workspace_id, name, slug, description, perimeter, stack_tags, sort_order)
VALUES (
  (SELECT id FROM public.workspaces LIMIT 1),
  'QA & Testing',
  'qa-testing',
  'Assurance qualité, automatisation des tests fonctionnels et de performance, contrôle de la non-régression tout au long du cycle de développement.',
  'Automatisation des tests, tests de performance, contrôle qualité, reporting.',
  ARRAY['Selenium', 'Cypress', 'JMeter', 'Postman', 'k6']::text[],
  5
);

WITH pricing_data (
  practice_slug, role_title, job_profile_title,
  seniority_level, location, tjm_min, tjm_recommended, tjm_max
) AS (VALUES
  -- ── Digital & Cloud Engineering ──────────────────────────────────────────
  -- Développeur Front-End (React/Vue)
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL::text,'junior','Paris',390::numeric,410::numeric,430::numeric),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'junior','PACA (Sophia/Nice)',330,350,370),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'junior','Nearshore (Maroc)',180,190,200),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'confirme','Paris',520,550,580),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'confirme','PACA (Sophia/Nice)',450,470,490),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'confirme','Nearshore (Maroc)',240,250,260),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'senior','Paris',660,690,720),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'senior','PACA (Sophia/Nice)',550,580,610),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'senior','Nearshore (Maroc)',290,310,330),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'lead','Paris',780,820,860),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'lead','PACA (Sophia/Nice)',660,700,740),
  ('digital-cloud','Développeur Front-End (React/Vue)',NULL,'lead','Nearshore (Maroc)',350,370,390),
  -- Développeur Back-End (Java/Node/Python)
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'junior','Paris',430,450,470),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'junior','PACA (Sophia/Nice)',360,380,400),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'junior','Nearshore (Maroc)',190,200,210),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'confirme','Paris',570,600,630),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'confirme','PACA (Sophia/Nice)',480,510,540),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'confirme','Nearshore (Maroc)',260,270,280),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'senior','Paris',710,750,790),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'senior','PACA (Sophia/Nice)',610,640,670),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'senior','Nearshore (Maroc)',320,340,360),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'lead','Paris',860,900,940),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'lead','PACA (Sophia/Nice)',720,760,800),
  ('digital-cloud','Développeur Back-End (Java/Node/Python)',NULL,'lead','Nearshore (Maroc)',380,400,420),
  -- Développeur Full-Stack
  ('digital-cloud','Développeur Full-Stack',NULL,'junior','Paris',470,490,510),
  ('digital-cloud','Développeur Full-Stack',NULL,'junior','PACA (Sophia/Nice)',390,410,430),
  ('digital-cloud','Développeur Full-Stack',NULL,'junior','Nearshore (Maroc)',210,220,230),
  ('digital-cloud','Développeur Full-Stack',NULL,'confirme','Paris',620,650,680),
  ('digital-cloud','Développeur Full-Stack',NULL,'confirme','PACA (Sophia/Nice)',520,550,580),
  ('digital-cloud','Développeur Full-Stack',NULL,'confirme','Nearshore (Maroc)',280,290,300),
  ('digital-cloud','Développeur Full-Stack',NULL,'senior','Paris',770,810,850),
  ('digital-cloud','Développeur Full-Stack',NULL,'senior','PACA (Sophia/Nice)',660,690,720),
  ('digital-cloud','Développeur Full-Stack',NULL,'senior','Nearshore (Maroc)',350,370,390),
  ('digital-cloud','Développeur Full-Stack',NULL,'lead','Paris',930,980,1030),
  ('digital-cloud','Développeur Full-Stack',NULL,'lead','PACA (Sophia/Nice)',790,830,870),
  ('digital-cloud','Développeur Full-Stack',NULL,'lead','Nearshore (Maroc)',420,440,460),
  -- Architecte Cloud / DevOps → job_profile 'Architecte Cloud & DevOps'
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','junior','Paris',530,560,590),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','junior','PACA (Sophia/Nice)',460,480,500),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','junior','Nearshore (Maroc)',240,250,260),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','confirme','Paris',710,750,790),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','confirme','PACA (Sophia/Nice)',610,640,670),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','confirme','Nearshore (Maroc)',320,340,360),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','senior','Paris',890,940,990),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','senior','PACA (Sophia/Nice)',760,800,840),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','senior','Nearshore (Maroc)',400,420,440),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','lead','Paris',1060,1120,1180),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','lead','PACA (Sophia/Nice)',910,960,1010),
  ('digital-cloud','Architecte Cloud / DevOps','Architecte Cloud & DevOps','lead','Nearshore (Maroc)',480,510,540),
  -- ── Data Intelligence & AI ───────────────────────────────────────────────
  -- Data Scientist / Ingénieur IA → job_profile 'Ingénieur IA / Data Scientist'
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','junior','Paris',490,520,550),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','junior','PACA (Sophia/Nice)',430,450,470),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','junior','Nearshore (Maroc)',230,240,250),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','confirme','Paris',660,700,740),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','confirme','PACA (Sophia/Nice)',570,600,630),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','confirme','Nearshore (Maroc)',300,320,340),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','senior','Paris',840,880,920),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','senior','PACA (Sophia/Nice)',700,740,780),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','senior','Nearshore (Maroc)',370,390,410),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','lead','Paris',1000,1050,1100),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','lead','PACA (Sophia/Nice)',850,890,930),
  ('data-ia','Data Scientist / Ingénieur IA','Ingénieur IA / Data Scientist','lead','Nearshore (Maroc)',450,470,490),
  -- Data Engineer → job_profile 'Data Engineer'
  ('data-ia','Data Engineer','Data Engineer','junior','Paris',470,490,510),
  ('data-ia','Data Engineer','Data Engineer','junior','PACA (Sophia/Nice)',390,410,430),
  ('data-ia','Data Engineer','Data Engineer','junior','Nearshore (Maroc)',210,220,230),
  ('data-ia','Data Engineer','Data Engineer','confirme','Paris',620,650,680),
  ('data-ia','Data Engineer','Data Engineer','confirme','PACA (Sophia/Nice)',520,550,580),
  ('data-ia','Data Engineer','Data Engineer','confirme','Nearshore (Maroc)',280,290,300),
  ('data-ia','Data Engineer','Data Engineer','senior','Paris',770,810,850),
  ('data-ia','Data Engineer','Data Engineer','senior','PACA (Sophia/Nice)',660,690,720),
  ('data-ia','Data Engineer','Data Engineer','senior','Nearshore (Maroc)',350,370,390),
  ('data-ia','Data Engineer','Data Engineer','lead','Paris',930,980,1030),
  ('data-ia','Data Engineer','Data Engineer','lead','PACA (Sophia/Nice)',790,830,870),
  ('data-ia','Data Engineer','Data Engineer','lead','Nearshore (Maroc)',420,440,460),
  -- ── Cybersecurity & SecOps ───────────────────────────────────────────────
  -- Ingénieur SecOps / Cybersécurité → job_profile exact
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','junior','Paris',570,600,630),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','junior','PACA (Sophia/Nice)',480,510,540),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','junior','Nearshore (Maroc)',260,270,280),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','confirme','Paris',760,800,840),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','confirme','PACA (Sophia/Nice)',650,680,710),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','confirme','Nearshore (Maroc)',340,360,380),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','senior','Paris',950,1000,1050),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','senior','PACA (Sophia/Nice)',810,850,890),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','senior','Nearshore (Maroc)',430,450,470),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','lead','Paris',1140,1200,1260),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','lead','PACA (Sophia/Nice)',970,1020,1070),
  ('cybersecurity','Ingénieur SecOps / Cybersécurité','Ingénieur SecOps / Cybersécurité','lead','Nearshore (Maroc)',510,540,570),
  -- ── Agile Product Management ─────────────────────────────────────────────
  -- Product Owner (PO) → job_profile 'Product Owner'
  ('agile-pm','Product Owner (PO)','Product Owner','junior','Paris',470,490,510),
  ('agile-pm','Product Owner (PO)','Product Owner','junior','PACA (Sophia/Nice)',390,410,430),
  ('agile-pm','Product Owner (PO)','Product Owner','junior','Nearshore (Maroc)',210,220,230),
  ('agile-pm','Product Owner (PO)','Product Owner','confirme','Paris',620,650,680),
  ('agile-pm','Product Owner (PO)','Product Owner','confirme','PACA (Sophia/Nice)',520,550,580),
  ('agile-pm','Product Owner (PO)','Product Owner','confirme','Nearshore (Maroc)',280,290,300),
  ('agile-pm','Product Owner (PO)','Product Owner','senior','Paris',770,810,850),
  ('agile-pm','Product Owner (PO)','Product Owner','senior','PACA (Sophia/Nice)',660,690,720),
  ('agile-pm','Product Owner (PO)','Product Owner','senior','Nearshore (Maroc)',350,370,390),
  ('agile-pm','Product Owner (PO)','Product Owner','lead','Paris',930,980,1030),
  ('agile-pm','Product Owner (PO)','Product Owner','lead','PACA (Sophia/Nice)',790,830,870),
  ('agile-pm','Product Owner (PO)','Product Owner','lead','Nearshore (Maroc)',420,440,460),
  -- Scrum Master
  ('agile-pm','Scrum Master',NULL,'junior','Paris',430,450,470),
  ('agile-pm','Scrum Master',NULL,'junior','PACA (Sophia/Nice)',360,380,400),
  ('agile-pm','Scrum Master',NULL,'junior','Nearshore (Maroc)',190,200,210),
  ('agile-pm','Scrum Master',NULL,'confirme','Paris',570,600,630),
  ('agile-pm','Scrum Master',NULL,'confirme','PACA (Sophia/Nice)',480,510,540),
  ('agile-pm','Scrum Master',NULL,'confirme','Nearshore (Maroc)',260,270,280),
  ('agile-pm','Scrum Master',NULL,'senior','Paris',710,750,790),
  ('agile-pm','Scrum Master',NULL,'senior','PACA (Sophia/Nice)',610,640,670),
  ('agile-pm','Scrum Master',NULL,'senior','Nearshore (Maroc)',320,340,360),
  ('agile-pm','Scrum Master',NULL,'lead','Paris',860,900,940),
  ('agile-pm','Scrum Master',NULL,'lead','PACA (Sophia/Nice)',720,760,800),
  ('agile-pm','Scrum Master',NULL,'lead','Nearshore (Maroc)',380,400,420),
  -- ── QA & Testing ─────────────────────────────────────────────────────────
  -- QA Automation Engineer
  ('qa-testing','QA Automation Engineer',NULL,'junior','Paris',360,380,400),
  ('qa-testing','QA Automation Engineer',NULL,'junior','PACA (Sophia/Nice)',300,320,340),
  ('qa-testing','QA Automation Engineer',NULL,'junior','Nearshore (Maroc)',160,170,180),
  ('qa-testing','QA Automation Engineer',NULL,'confirme','Paris',480,500,520),
  ('qa-testing','QA Automation Engineer',NULL,'confirme','PACA (Sophia/Nice)',400,420,440),
  ('qa-testing','QA Automation Engineer',NULL,'confirme','Nearshore (Maroc)',210,220,230),
  ('qa-testing','QA Automation Engineer',NULL,'senior','Paris',590,620,650),
  ('qa-testing','QA Automation Engineer',NULL,'senior','PACA (Sophia/Nice)',500,530,560),
  ('qa-testing','QA Automation Engineer',NULL,'senior','Nearshore (Maroc)',270,280,290),
  ('qa-testing','QA Automation Engineer',NULL,'lead','Paris',710,750,790),
  ('qa-testing','QA Automation Engineer',NULL,'lead','PACA (Sophia/Nice)',610,640,670),
  ('qa-testing','QA Automation Engineer',NULL,'lead','Nearshore (Maroc)',320,340,360)
)
INSERT INTO public.offer_pricing_grids (
  workspace_id, practice_id, job_profile_id,
  profile_name, seniority_level, location,
  tjm_min, tjm_recommended, tjm_max,
  currency, valid_from
)
SELECT
  (SELECT id FROM public.workspaces LIMIT 1),
  p.id,
  jp.id,
  d.role_title,
  d.seniority_level,
  d.location,
  d.tjm_min,
  d.tjm_recommended,
  d.tjm_max,
  'EUR',
  '2026-01-01'
FROM pricing_data d
JOIN public.offer_practices p ON p.slug = d.practice_slug
LEFT JOIN public.job_profiles jp ON jp.title = d.job_profile_title;
