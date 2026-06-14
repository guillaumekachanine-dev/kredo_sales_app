-- ============================================================
-- 018_job_profiles_referentiel
-- Référentiel métier KREDO Digital 2026
-- Crée job_profiles lié à offer_practices (existant, migration 015)
-- + FK job_profile_id sur offer_pricing_grids (vide → safe)
-- + Seed des 6 fiches métier du PDF
-- ============================================================

-- ============================================================
-- 1. TABLE job_profiles
-- ============================================================
CREATE TABLE public.job_profiles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL DEFAULT current_workspace_id()
                               REFERENCES public.workspaces(id),
  practice_id      uuid        NOT NULL
                               REFERENCES public.offer_practices(id),
  title            text        NOT NULL,
  main_mission     text        NOT NULL,
  responsibilities text[]      NOT NULL DEFAULT '{}',
  tech_stack       text[]      NOT NULL DEFAULT '{}',
  kpis             text[]      NOT NULL DEFAULT '{}',
  source           text        NOT NULL DEFAULT 'internal'
                               CHECK (source IN ('internal', 'imported', 'ai_generated')),
  version          text        NOT NULL DEFAULT '2026',
  is_active        boolean     NOT NULL DEFAULT true,
  -- embedding vector(1536) : à ajouter en migration 019 quand pgvector sera activé (phase 3)
  metadata         jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_profiles_title_workspace_uniq UNIQUE (workspace_id, title)
);

-- ============================================================
-- 2. TRIGGER updated_at
-- ============================================================
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.job_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX idx_job_profiles_practice_id    ON public.job_profiles (practice_id);
CREATE INDEX idx_job_profiles_tech_stack_gin ON public.job_profiles USING gin (tech_stack);
CREATE INDEX idx_job_profiles_active         ON public.job_profiles (workspace_id) WHERE is_active;

-- ============================================================
-- 4. RLS — motif standard workspace (4 policies)
-- ============================================================
ALTER TABLE public.job_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_profiles_select" ON public.job_profiles
  FOR SELECT USING (workspace_id = current_workspace_id());

CREATE POLICY "job_profiles_insert" ON public.job_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "job_profiles_update" ON public.job_profiles
  FOR UPDATE USING (workspace_id = current_workspace_id());

CREATE POLICY "job_profiles_delete" ON public.job_profiles
  FOR DELETE USING (workspace_id = current_workspace_id());

-- ============================================================
-- 5. FK job_profile_id sur offer_pricing_grids (table vide → safe)
--    profile_name text reste pour saisie libre / legacy
-- ============================================================
ALTER TABLE public.offer_pricing_grids
  ADD COLUMN job_profile_id uuid REFERENCES public.job_profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_offer_pricing_grids_job_profile
  ON public.offer_pricing_grids (job_profile_id);

-- ============================================================
-- 6. SEED — 6 fiches métier (lookup practice_id par slug)
-- ============================================================
WITH seed_data (practice_slug, title, main_mission, responsibilities, tech_stack, kpis) AS (
  VALUES
  (
    'data-ia',
    'Ingénieur IA / Data Scientist',
    'Concevoir, entraîner et déployer des modèles d''intelligence artificielle et d''analyse prédictive. L''Ingénieur IA transforme les données brutes en leviers de décision (Systèmes RAG, NLP, Computer Vision) intégrables dans les produits digitaux de nos clients.',
    ARRAY[
      'Cadrage des cas d''usage avec les métiers et définition des métriques de succès.',
      'Développement d''architectures RAG (Retrieval-Augmented Generation) sécurisées.',
      'Exploration, nettoyage de données et feature engineering.',
      'Mise en production des modèles via des pipelines MLOps.'
    ]::text[],
    ARRAY['Python', 'LangChain / LlamaIndex', 'pgvector', 'TensorFlow / PyTorch', 'Databricks']::text[],
    ARRAY[
      'Précision/Recall du modèle',
      'Temps de latence de l''inférence',
      'Taux d''adoption par les utilisateurs finaux'
    ]::text[]
  ),
  (
    'digital-cloud',
    'Lead Développeur Full-Stack',
    'Garant de la qualité et de la performance du code, le Lead Dev conçoit les architectures logicielles modernes, encadre l''équipe de développement et assure l''implémentation des fonctionnalités critiques (Front et Back).',
    ARRAY[
      'Définition des choix architecturaux (Serverless, Microservices, Single Page Apps).',
      'Développement des composants complexes et des API robustes.',
      'Code review, mentoring des développeurs juniors/confirmés et animation des rituels techniques.',
      'Optimisation des performances (Core Web Vitals, temps de réponse base de données).'
    ]::text[],
    ARRAY['Next.js 15', 'React / TypeScript', 'Supabase / PostgreSQL', 'Tailwind CSS', 'Vercel']::text[],
    ARRAY[
      'Couverture de tests (>80%)',
      'Sprint Velocity',
      'Temps de cycle (Lead Time for Changes)',
      'Taux de bugs en production'
    ]::text[]
  ),
  (
    'digital-cloud',
    'Architecte Cloud & DevOps',
    'Concevoir et maintenir les infrastructures cloud pour garantir la haute disponibilité, la sécurité et la scalabilité des applications. Le DevOps automatise l''ensemble de la chaîne de déploiement (CI/CD) et l''approvisionnement des ressources (IaC).',
    ARRAY[
      'Création et gestion des infrastructures "As Code" (IaC).',
      'Mise en place et optimisation des pipelines d''intégration et de déploiement continus.',
      'Monitoring, alerting et gestion des incidents en production (Astreintes).',
      'Pilotage de la stratégie FinOps pour maîtriser les coûts d''hébergement.'
    ]::text[],
    ARRAY['AWS / Azure / GCP', 'Terraform', 'Kubernetes / Docker', 'GitLab CI / GitHub Actions', 'Datadog']::text[],
    ARRAY[
      'Uptime (SLA > 99.9%)',
      'Fréquence de déploiement',
      'MTTR (Mean Time To Recovery)',
      'Optimisation budgétaire FinOps'
    ]::text[]
  ),
  (
    'agile-pm',
    'Product Owner',
    'Porteur de la vision produit, le PO fait le pont entre les enjeux métiers du client et l''équipe de développement. Il maximise la valeur du produit délivré en gérant rigoureusement le Backlog et en priorisant les fonctionnalités.',
    ARRAY[
      'Animation des ateliers de recueil des besoins avec les parties prenantes.',
      'Rédaction des User Stories et définition des critères d''acceptation (DoR, DoD).',
      'Gestion et priorisation constante du Product Backlog selon la valeur métier (ROI).',
      'Validation des incréments produits en fin de sprint.'
    ]::text[],
    ARRAY['Jira / Linear', 'Confluence / Notion', 'Figma (Lecture)', 'Outils Analytics (Mixpanel, GA)']::text[],
    ARRAY[
      'Time-to-Market',
      'Taux d''utilisation des nouvelles features',
      'CSAT / NPS (Satisfaction Client)',
      'Prédictibilité du Sprint'
    ]::text[]
  ),
  (
    'cybersecurity',
    'Ingénieur SecOps / Cybersécurité',
    'Intégrer la sécurité de manière continue et automatisée dès la phase de conception logicielle (Shift-Left). L''ingénieur SecOps protège le système d''information contre les menaces externes et internes.',
    ARRAY[
      'Implémentation des politiques de sécurité Cloud et bases de données (ex: Row Level Security).',
      'Réalisation d''audits de vulnérabilité et de tests d''intrusion (Pen-tests).',
      'Déploiement et gestion des outils de type SIEM et des gestionnaires d''identités (IAM).',
      'Sensibilisation des équipes de développement aux normes de code sécurisé (OWASP).'
    ]::text[],
    ARRAY['SIEM (Splunk/Sentinel)', 'SonarQube', 'Supabase RLS', 'Outils OWASP', 'SecNumCloud']::text[],
    ARRAY[
      'Temps de remédiation des vulnérabilités critiques (MTTR-Sec)',
      'Nombre de failles détectées en pré-production',
      'Score d''audit de conformité'
    ]::text[]
  ),
  (
    'data-ia',
    'Data Engineer',
    'Construire et maintenir les fondations de l''écosystème Data. Le Data Engineer conçoit les pipelines qui extraient, transforment et chargent (ETL/ELT) des volumes massifs de données pour les rendre exploitables par les analystes et les modèles d''IA.',
    ARRAY[
      'Développement de flux d''ingestion de données en temps réel ou en batch.',
      'Modélisation, stockage et optimisation des data warehouses ou data lakes.',
      'Garantie de la qualité, de la sécurité et de la traçabilité des données (Data Lineage).',
      'Mise en place de l''orchestration des jobs de traitement.'
    ]::text[],
    ARRAY['Python / Scala', 'SQL Datawarehouse (BigQuery/Snowflake)', 'Apache Airflow', 'dbt', 'Kafka']::text[],
    ARRAY[
      'Fiabilité des pipelines de données (Data Pipeline Uptime)',
      'Fraîcheur des données (Data Freshness)',
      'Temps d''exécution des jobs ETL'
    ]::text[]
  )
)
INSERT INTO public.job_profiles (workspace_id, practice_id, title, main_mission, responsibilities, tech_stack, kpis, source, version)
SELECT
  (SELECT id FROM public.workspaces LIMIT 1),
  p.id,
  s.title,
  s.main_mission,
  s.responsibilities,
  s.tech_stack,
  s.kpis,
  'internal',
  '2026'
FROM seed_data s
JOIN public.offer_practices p ON p.slug = s.practice_slug;
