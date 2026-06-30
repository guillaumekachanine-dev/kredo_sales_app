-- ============================================================
-- 010b_sector_intelligence (remote: 20260613190818)
-- Référentiel sectoriel multi-table : sector_intelligence (hub)
-- + sector_news / sector_events / sector_pain_points / sector_regulatory_items
-- RLS : policy unique "workspace_isolation" FOR ALL (≠ motif 4-policies standard)
-- ============================================================

-- ── sector_intelligence (hub sectoriel) ─────────────────────
CREATE TABLE IF NOT EXISTS public.sector_intelligence (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name                  text        NOT NULL,
  slug                  text        NOT NULL,
  description           text,
  status                text        NOT NULL DEFAULT 'watch',
  attractiveness_score  numeric,
  market_size_eur_bn    numeric,
  market_growth_pct     numeric,
  digital_maturity      text,
  practices_fit         jsonb       NOT NULL DEFAULT '{"cyber": 0, "data_ai": 0, "product": 0, "cloud_eng": 0}',
  key_players_paca      jsonb       NOT NULL DEFAULT '[]',
  key_players_national  jsonb       NOT NULL DEFAULT '[]',
  avg_tjm_min           integer,
  avg_tjm_max           integer,
  playbook              jsonb       NOT NULL DEFAULT '{"personas": [], "objections": [], "entry_points": [], "roi_arguments": []}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sector_intelligence_workspace_id_slug_key UNIQUE (workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_si_workspace ON public.sector_intelligence (workspace_id);
CREATE INDEX IF NOT EXISTS idx_si_status    ON public.sector_intelligence (status);
CREATE INDEX IF NOT EXISTS idx_si_score     ON public.sector_intelligence (workspace_id, attractiveness_score DESC NULLS LAST);

ALTER TABLE public.sector_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON public.sector_intelligence
  FOR ALL
  USING     (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

CREATE TRIGGER trg_sector_intelligence_updated_at
  BEFORE UPDATE ON public.sector_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── sector_news ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sector_news (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sector_id        uuid        NOT NULL REFERENCES public.sector_intelligence(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  source           text,
  url              text,
  summary          text,
  published_at     timestamptz,
  relevance_score  numeric,
  tags             text[]      NOT NULL DEFAULT '{}',
  is_trigger_event boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sn_sector    ON public.sector_news (sector_id);
CREATE INDEX IF NOT EXISTS idx_sn_published ON public.sector_news (sector_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_sn_trigger   ON public.sector_news (sector_id) WHERE is_trigger_event = true;

ALTER TABLE public.sector_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON public.sector_news
  FOR ALL
  USING     (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- ── sector_events ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sector_events (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sector_id              uuid        NOT NULL REFERENCES public.sector_intelligence(id) ON DELETE CASCADE,
  title                  text        NOT NULL,
  event_type             text        NOT NULL,
  description            text,
  event_date             date,
  source_url             text,
  commercial_opportunity text,
  status                 text        NOT NULL DEFAULT 'pending',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_se_sector ON public.sector_events (sector_id);
CREATE INDEX IF NOT EXISTS idx_se_date   ON public.sector_events (event_date);
CREATE INDEX IF NOT EXISTS idx_se_status ON public.sector_events (sector_id, status);

ALTER TABLE public.sector_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON public.sector_events
  FOR ALL
  USING     (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

CREATE TRIGGER trg_sector_events_updated_at
  BEFORE UPDATE ON public.sector_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── sector_pain_points ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sector_pain_points (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sector_id          uuid        NOT NULL REFERENCES public.sector_intelligence(id) ON DELETE CASCADE,
  title              text        NOT NULL,
  description        text,
  frequency_count    integer     NOT NULL DEFAULT 1,
  source_company_ids uuid[]      NOT NULL DEFAULT '{}',
  kredo_practice     text,
  verbatim           text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spp_sector    ON public.sector_pain_points (sector_id);
CREATE INDEX IF NOT EXISTS idx_spp_frequency ON public.sector_pain_points (sector_id, frequency_count DESC);

ALTER TABLE public.sector_pain_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON public.sector_pain_points
  FOR ALL
  USING     (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

CREATE TRIGGER trg_sector_pain_points_updated_at
  BEFORE UPDATE ON public.sector_pain_points
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── sector_regulatory_items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sector_regulatory_items (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sector_id            uuid        NOT NULL REFERENCES public.sector_intelligence(id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  authority            text,
  description          text,
  deadline_date        date,
  urgency              text        NOT NULL DEFAULT 'medium',
  kredo_practice       text,
  commercial_angle     text,
  is_commercial_window boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sri_sector  ON public.sector_regulatory_items (sector_id);
CREATE INDEX IF NOT EXISTS idx_sri_deadline ON public.sector_regulatory_items (deadline_date);
CREATE INDEX IF NOT EXISTS idx_sri_urgency  ON public.sector_regulatory_items (sector_id, urgency);

ALTER TABLE public.sector_regulatory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON public.sector_regulatory_items
  FOR ALL
  USING     (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

CREATE TRIGGER trg_sector_regulatory_items_updated_at
  BEFORE UPDATE ON public.sector_regulatory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
