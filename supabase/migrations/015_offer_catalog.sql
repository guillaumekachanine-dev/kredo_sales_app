-- 015_offer_catalog.sql
-- Référentiel complet des offres de service KREDO DIGITAL
-- Tables : offer_practices · offers · offer_engagement_types · offer_pricing_grids
-- Seed initial : catalogue PDF 2026 (4 practices, 4 offres AI, 5 types d'engagement)

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Piliers technologiques / practices
CREATE TABLE public.offer_practices (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL DEFAULT current_workspace_id(),
  name         text        NOT NULL,
  slug         text        NOT NULL,
  description  text,
  perimeter    text,                          -- périmètre d'intervention & métiers
  stack_tags   text[]      NOT NULL DEFAULT '{}',
  color_hex    text,                          -- couleur UI (ex: '#2554B8')
  sort_order   smallint    NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

-- Offres de service rattachées à une practice
CREATE TABLE public.offers (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid        NOT NULL DEFAULT current_workspace_id(),
  practice_id          uuid        NOT NULL REFERENCES public.offer_practices(id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  slug                 text        NOT NULL,
  short_description    text,
  full_description     text,
  typical_deliverables text[]      NOT NULL DEFAULT '{}',
  typical_profiles     text[]      NOT NULL DEFAULT '{}',
  use_cases            text[]      NOT NULL DEFAULT '{}',
  keywords             text[]      NOT NULL DEFAULT '{}',
  sort_order           smallint    NOT NULL DEFAULT 0,
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, practice_id, slug)
);

-- Types d'engagement proposés par KREDO DIGITAL
CREATE TABLE public.offer_engagement_types (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL DEFAULT current_workspace_id(),
  name             text        NOT NULL,
  slug             text        NOT NULL,
  description      text,
  billing_model    text        NOT NULL CHECK (billing_model IN ('regie', 'forfait', 'mixte')),
  typical_duration text,                      -- ex : '3-12 mois'
  sort_order       smallint    NOT NULL DEFAULT 0,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

-- Grilles tarifaires par profil / séniorité / offre
CREATE TABLE public.offer_pricing_grids (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid        NOT NULL DEFAULT current_workspace_id(),
  offer_id           uuid        REFERENCES public.offers(id) ON DELETE SET NULL,
  practice_id        uuid        REFERENCES public.offer_practices(id) ON DELETE SET NULL,
  engagement_type_id uuid        REFERENCES public.offer_engagement_types(id) ON DELETE SET NULL,
  profile_name       text        NOT NULL,
  seniority_level    text        NOT NULL CHECK (seniority_level IN ('junior', 'confirme', 'senior', 'expert', 'lead')),
  tjm_min            numeric(10,2),
  tjm_max            numeric(10,2),
  currency           text        NOT NULL DEFAULT 'EUR',
  valid_from         date,
  valid_to           date,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_must_have_anchor  CHECK (offer_id IS NOT NULL OR practice_id IS NOT NULL),
  CONSTRAINT pricing_dates_coherent    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CONSTRAINT pricing_tjm_range         CHECK (tjm_max IS NULL OR tjm_min IS NULL OR tjm_max >= tjm_min)
);

-- ============================================================
-- 2. TRIGGERS updated_at
-- ============================================================

CREATE TRIGGER set_updated_at_offer_practices
  BEFORE UPDATE ON public.offer_practices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_offers
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_offer_engagement_types
  BEFORE UPDATE ON public.offer_engagement_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_offer_pricing_grids
  BEFORE UPDATE ON public.offer_pricing_grids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_offer_practices_workspace    ON public.offer_practices(workspace_id);
CREATE INDEX idx_offer_practices_active       ON public.offer_practices(workspace_id, is_active);

CREATE INDEX idx_offers_workspace             ON public.offers(workspace_id);
CREATE INDEX idx_offers_practice              ON public.offers(practice_id);
CREATE INDEX idx_offers_active                ON public.offers(workspace_id, is_active);

CREATE INDEX idx_offer_engagement_workspace   ON public.offer_engagement_types(workspace_id);
CREATE INDEX idx_offer_pricing_workspace      ON public.offer_pricing_grids(workspace_id);
CREATE INDEX idx_offer_pricing_offer          ON public.offer_pricing_grids(offer_id);
CREATE INDEX idx_offer_pricing_practice       ON public.offer_pricing_grids(practice_id);

-- ============================================================
-- 4. RLS — motif uniforme workspace
-- ============================================================

ALTER TABLE public.offer_practices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_engagement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_pricing_grids    ENABLE ROW LEVEL SECURITY;

-- offer_practices
CREATE POLICY "offer_practices_select" ON public.offer_practices
  FOR SELECT USING (workspace_id = current_workspace_id());
CREATE POLICY "offer_practices_insert" ON public.offer_practices
  FOR INSERT WITH CHECK (true);
CREATE POLICY "offer_practices_update" ON public.offer_practices
  FOR UPDATE USING (workspace_id = current_workspace_id());
CREATE POLICY "offer_practices_delete" ON public.offer_practices
  FOR DELETE USING (workspace_id = current_workspace_id());

-- offers
CREATE POLICY "offers_select" ON public.offers
  FOR SELECT USING (workspace_id = current_workspace_id());
CREATE POLICY "offers_insert" ON public.offers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "offers_update" ON public.offers
  FOR UPDATE USING (workspace_id = current_workspace_id());
CREATE POLICY "offers_delete" ON public.offers
  FOR DELETE USING (workspace_id = current_workspace_id());

-- offer_engagement_types
CREATE POLICY "offer_engagement_types_select" ON public.offer_engagement_types
  FOR SELECT USING (workspace_id = current_workspace_id());
CREATE POLICY "offer_engagement_types_insert" ON public.offer_engagement_types
  FOR INSERT WITH CHECK (true);
CREATE POLICY "offer_engagement_types_update" ON public.offer_engagement_types
  FOR UPDATE USING (workspace_id = current_workspace_id());
CREATE POLICY "offer_engagement_types_delete" ON public.offer_engagement_types
  FOR DELETE USING (workspace_id = current_workspace_id());

-- offer_pricing_grids
CREATE POLICY "offer_pricing_grids_select" ON public.offer_pricing_grids
  FOR SELECT USING (workspace_id = current_workspace_id());
CREATE POLICY "offer_pricing_grids_insert" ON public.offer_pricing_grids
  FOR INSERT WITH CHECK (true);
CREATE POLICY "offer_pricing_grids_update" ON public.offer_pricing_grids
  FOR UPDATE USING (workspace_id = current_workspace_id());
CREATE POLICY "offer_pricing_grids_delete" ON public.offer_pricing_grids
  FOR DELETE USING (workspace_id = current_workspace_id());

-- ============================================================
-- 5. SEED INITIAL — catalogue PDF 2026
-- ============================================================

DO $$
DECLARE
  v_ws            uuid;
  v_practice_ai   uuid;
  v_practice_dce  uuid;
  v_practice_apm  uuid;
  v_practice_cso  uuid;
BEGIN
  SELECT id INTO v_ws FROM public.workspaces LIMIT 1;
  IF v_ws IS NULL THEN
    RAISE EXCEPTION 'Aucun workspace trouvé — seed offer catalog impossible';
  END IF;

  -- ---- PRACTICES (4 piliers) ----
  INSERT INTO public.offer_practices
    (workspace_id, name, slug, description, perimeter, stack_tags, sort_order)
  VALUES
    (v_ws,
     'Data Intelligence & Artificial Intelligence',
     'data-ia',
     'Cadrage stratégique IA, architectures RAG, traitement sémantique, MLOps, automatisation cognitive des processus business.',
     'Cadrage stratégique, architectures RAG, traitement sémantique, MLOps, automatisation cognitive des processus business.',
     ARRAY['pgvector','n8n','Python','Databricks','LangChain'],
     1),

    (v_ws,
     'Digital & Cloud Engineering',
     'digital-cloud',
     'Conception d''applications web denses à fort trafic, APIs serverless haute performance, architectures Cloud natives sécurisées.',
     'Conception d''applications web denses à fort trafic, APIs serverless haute performance, architectures Cloud natives sécurisées.',
     ARRAY['Next.js 15','React','Supabase','TypeScript','AWS','Azure'],
     2),

    (v_ws,
     'Agile Product Management',
     'agile-pm',
     'Cadrage de produits B2B complexes, design system flat & premium, direction de projets au forfait, conduite du changement.',
     'Cadrage de produits B2B complexes, design system flat & premium, direction de projets au forfait, conduite du changement.',
     ARRAY['Product Owner','Scrum','UX/UI Design','Figma'],
     3),

    (v_ws,
     'Cybersecurity & SecOps',
     'cybersecurity',
     'Gouvernance SecOps, audit de code, durcissement des bases Supabase / PostgreSQL, architectures Cloud souveraines.',
     'Gouvernance SecOps, audit de code, durcissement des bases Supabase / PostgreSQL, architectures Cloud souveraines.',
     ARRAY['RLS Active','Terraform','SecNumCloud','CI/CD'],
     4);

  SELECT id INTO v_practice_ai  FROM public.offer_practices WHERE workspace_id = v_ws AND slug = 'data-ia';
  SELECT id INTO v_practice_dce FROM public.offer_practices WHERE workspace_id = v_ws AND slug = 'digital-cloud';
  SELECT id INTO v_practice_apm FROM public.offer_practices WHERE workspace_id = v_ws AND slug = 'agile-pm';
  SELECT id INTO v_practice_cso FROM public.offer_practices WHERE workspace_id = v_ws AND slug = 'cybersecurity';

  -- ---- OFFRES (practice Data-IA détaillée dans le PDF) ----
  INSERT INTO public.offers
    (workspace_id, practice_id, name, slug, short_description,
     typical_deliverables, typical_profiles, use_cases, sort_order)
  VALUES
    (v_ws, v_practice_ai,
     'Conseil Stratégique, Cadrage & Gouvernance IA',
     'conseil-gouvernance-ia',
     'Accompagnement des comités de direction et directions métiers dans l''identification des cas d''usage ROIstes et la définition de la roadmap IA.',
     ARRAY['Matrice d''éligibilité des use cases','Schéma directeur Data/IA','Charte éthique et de gouvernance des données'],
     ARRAY['Directeur de projet IA','Enterprise Architect','Legal Tech Advisor'],
     ARRAY['Définition roadmap IA','Gouvernance données','Sélection cas d''usage ROIstes'],
     1),

    (v_ws, v_practice_ai,
     'Ingénierie IA Générative & Systèmes RAG',
     'ia-generative-rag',
     'Mise en place d''assistants intelligents experts capables d''interroger la base de connaissances interne de l''entreprise de manière totalement sécurisée.',
     ARRAY[]::text[],
     ARRAY[]::text[],
     ARRAY['Super-assistants de gestion commerciale','Analyse automatisée de CV et matching RH','Analyseurs de contrats juridiques'],
     2),

    (v_ws, v_practice_ai,
     'Predictive Analytics & IA Industrielle (IoT / Maintenance)',
     'predictive-analytics-iot',
     'Développement et déploiement d''algorithmes prédictifs appliqués aux flux de données industriels et opérationnels.',
     ARRAY[]::text[],
     ARRAY['Data Scientists (PhD)','Data Engineers','Experts Métiers Sectoriels'],
     ARRAY['Maintenance prédictive sur lignes d''assemblage','Optimisation supply chain aéronautique','Prévision de consommation énergétique'],
     3),

    (v_ws, v_practice_ai,
     'Modern Data Stack & MLOps',
     'modern-data-stack-mlops',
     'Industrialisation du cycle de vie des modèles d''IA et structuration des pipelines de données pour alimenter les outils d''aide à la décision.',
     ARRAY[]::text[],
     ARRAY[]::text[],
     ARRAY['Pipelines de données sécurisés','Monitoring data drift','Mise en conformité RGPD'],
     4);

  -- ---- TYPES D'ENGAGEMENT ----
  INSERT INTO public.offer_engagement_types
    (workspace_id, name, slug, description, billing_model, typical_duration, sort_order)
  VALUES
    (v_ws, 'Régie Spécialisée', 'regie',
     'Mise à disposition de consultants experts en régie chez le client. Facturation au TJM.',
     'regie', '3-24 mois', 1),

    (v_ws, 'Forfait', 'forfait',
     'Engagement sur livrable contractuellement défini avec prix fixe et jalons de paiement.',
     'forfait', '1-6 mois', 2),

    (v_ws, 'Centre de Compétences', 'centre_competences',
     'Intégration structurée d''une équipe de consultants experts dans l''organisation client.',
     'regie', '6-36 mois', 3),

    (v_ws, 'Conseil & Cadrage', 'conseil',
     'Mission courte de conseil ou de cadrage stratégique avec livrable de recommandations.',
     'forfait', '2-8 semaines', 4),

    (v_ws, 'Audit', 'audit',
     'Audit technique ou sécurité avec rapport de préconisations priorisées.',
     'forfait', '2-4 semaines', 5);

END $$;
