-- ============================================================
-- ADR-0011 Lot 1 — Alimentation d'account_signals depuis les
-- sources déjà en base. Préalable obligatoire au moteur de
-- scoring (Lot 3+) : sans ceci, le composant "signaux d'achat"
-- resterait à 0 pour 100% des comptes.
--
-- 3 sources, 3 blocs INSERT idempotents (dedupe_key + unique
-- index existant sur (workspace_id, dedupe_key), ON CONFLICT DO
-- NOTHING) :
--   1. companies.metadata.analysis_data.signaux (backfill FOLIO,
--      93 comptes) — objet à 4 facettes fixes (PAS un tableau de
--      signaux comme supposé initialement) :
--        actualites_recentes (array de strings) → 1 ligne/item
--        tendance_croissance (string)           → 1 ligne
--        recrutements_recents (string)          → 1 ligne
--        indices_maturite_digitale (string)     → 1 ligne
--      Exclusion des valeurs "Non trouvé" en ÉGALITÉ EXACTE
--      (trim+lower), PAS en sous-chaîne : 6 valeurs contiennent
--      "non trouvé" mais restent informatives (ex. "Non trouvé -
--      contexte de PSE et fermetures de sites suggère absence de
--      recrutements" est un signal en soi). Vérifié sur les 93
--      lignes avant écriture de ce filtre.
--   2. sector_news des 90 derniers jours → 1 ligne par (compte
--      du secteur × news). confidence_score = relevance_score de
--      la news (déjà 0–1, vérifié sur échantillon réel).
--   3. sector_regulatory_items urgency IN (high, critical) avec
--      échéance future ou non datée (deadline_date IS NULL) → 1
--      ligne par (compte du secteur × item réglementaire).
--
-- Portée : seuls les comptes avec sector_id renseigné reçoivent
-- les signaux 2 et 3 (14/95 comptes au 2026-07-06, cf. CLAUDE.md
-- Session 20) — caveat déjà documenté, pas corrigé ici (hors
-- scope Lot 1, c'est un problème de rattachement sectoriel, pas
-- de scoring).
-- ============================================================

-- ------------------------------------------------------------
-- 1a. FOLIO — actualités récentes (array de strings)
-- ------------------------------------------------------------
INSERT INTO public.account_signals (
  workspace_id, company_id, signal_category, signal_type,
  title, summary, detected_at, last_evidence_at, expires_at,
  dedupe_key, confidence_score, taxonomy_version, scoring_rules_version,
  score_justification, status
)
SELECT
  c.workspace_id,
  c.id,
  'company_context',
  'folio_news_item',
  left(item, 140),
  item,
  (c.metadata->>'imported_at')::timestamptz,
  (c.metadata->>'imported_at')::timestamptz,
  (c.metadata->>'imported_at')::timestamptz + interval '60 days',
  'folio:' || c.id || ':actu:' || ord,
  0.5,
  'adr-0011-lot1-v1',
  'adr-0011-lot1-v1',
  'Backfill FOLIO (ADR-0011 Lot 1) — actualité extraite d''une analyse legacy non structurée, non vérifiée par une source horodatée individuellement.',
  'new'
FROM public.companies c,
  LATERAL jsonb_array_elements_text(
    coalesce(c.metadata->'analysis_data'->'signaux'->'actualites_recentes', '[]'::jsonb)
  ) WITH ORDINALITY AS t(item, ord)
WHERE c.metadata->'analysis_data'->'signaux' IS NOT NULL
  AND length(trim(item)) > 0
ON CONFLICT (workspace_id, dedupe_key) DO NOTHING;

-- ------------------------------------------------------------
-- 1b. FOLIO — tendance de croissance (string unique)
-- ------------------------------------------------------------
INSERT INTO public.account_signals (
  workspace_id, company_id, signal_category, signal_type,
  title, summary, detected_at, last_evidence_at, expires_at,
  dedupe_key, confidence_score, taxonomy_version, scoring_rules_version,
  score_justification, status
)
SELECT
  c.workspace_id,
  c.id,
  'company_context',
  'folio_growth_trend',
  'Tendance de croissance',
  c.metadata->'analysis_data'->'signaux'->>'tendance_croissance',
  (c.metadata->>'imported_at')::timestamptz,
  (c.metadata->>'imported_at')::timestamptz,
  (c.metadata->>'imported_at')::timestamptz + interval '60 days',
  'folio:' || c.id || ':tendance_croissance',
  0.5,
  'adr-0011-lot1-v1',
  'adr-0011-lot1-v1',
  'Backfill FOLIO (ADR-0011 Lot 1) — synthèse de tendance extraite d''une analyse legacy, non vérifiée par une source structurée.',
  'new'
FROM public.companies c
WHERE c.metadata->'analysis_data'->'signaux' IS NOT NULL
  AND c.metadata->'analysis_data'->'signaux'->>'tendance_croissance' IS NOT NULL
  AND lower(trim(c.metadata->'analysis_data'->'signaux'->>'tendance_croissance')) NOT IN ('non trouvé', 'non trouve')
ON CONFLICT (workspace_id, dedupe_key) DO NOTHING;

-- ------------------------------------------------------------
-- 1c. FOLIO — recrutements récents (string unique)
-- ------------------------------------------------------------
INSERT INTO public.account_signals (
  workspace_id, company_id, signal_category, signal_type,
  title, summary, detected_at, last_evidence_at, expires_at,
  dedupe_key, confidence_score, taxonomy_version, scoring_rules_version,
  score_justification, status
)
SELECT
  c.workspace_id,
  c.id,
  'company_context',
  'folio_hiring_signal',
  'Recrutements récents',
  c.metadata->'analysis_data'->'signaux'->>'recrutements_recents',
  (c.metadata->>'imported_at')::timestamptz,
  (c.metadata->>'imported_at')::timestamptz,
  (c.metadata->>'imported_at')::timestamptz + interval '60 days',
  'folio:' || c.id || ':recrutements_recents',
  0.5,
  'adr-0011-lot1-v1',
  'adr-0011-lot1-v1',
  'Backfill FOLIO (ADR-0011 Lot 1) — signal RH extrait d''une analyse legacy, non vérifié par une source structurée.',
  'new'
FROM public.companies c
WHERE c.metadata->'analysis_data'->'signaux' IS NOT NULL
  AND c.metadata->'analysis_data'->'signaux'->>'recrutements_recents' IS NOT NULL
  AND lower(trim(c.metadata->'analysis_data'->'signaux'->>'recrutements_recents')) NOT IN ('non trouvé', 'non trouve')
ON CONFLICT (workspace_id, dedupe_key) DO NOTHING;

-- ------------------------------------------------------------
-- 1d. FOLIO — indices de maturité digitale (string unique)
-- ------------------------------------------------------------
INSERT INTO public.account_signals (
  workspace_id, company_id, signal_category, signal_type,
  title, summary, detected_at, last_evidence_at, expires_at,
  dedupe_key, confidence_score, taxonomy_version, scoring_rules_version,
  score_justification, status
)
SELECT
  c.workspace_id,
  c.id,
  'company_context',
  'folio_digital_maturity',
  'Maturité digitale',
  c.metadata->'analysis_data'->'signaux'->>'indices_maturite_digitale',
  (c.metadata->>'imported_at')::timestamptz,
  (c.metadata->>'imported_at')::timestamptz,
  (c.metadata->>'imported_at')::timestamptz + interval '60 days',
  'folio:' || c.id || ':indices_maturite_digitale',
  0.5,
  'adr-0011-lot1-v1',
  'adr-0011-lot1-v1',
  'Backfill FOLIO (ADR-0011 Lot 1) — indice de maturité digitale extrait d''une analyse legacy, non vérifié par une source structurée.',
  'new'
FROM public.companies c
WHERE c.metadata->'analysis_data'->'signaux' IS NOT NULL
  AND c.metadata->'analysis_data'->'signaux'->>'indices_maturite_digitale' IS NOT NULL
  AND lower(trim(c.metadata->'analysis_data'->'signaux'->>'indices_maturite_digitale')) NOT IN ('non trouvé', 'non trouve')
ON CONFLICT (workspace_id, dedupe_key) DO NOTHING;

-- ------------------------------------------------------------
-- 2. sector_news des 90 derniers jours → comptes du même secteur
-- ------------------------------------------------------------
INSERT INTO public.account_signals (
  workspace_id, company_id, signal_category, signal_type,
  title, summary, event_at, detected_at, expires_at,
  dedupe_key, confidence_score, relevance_score, urgency_score,
  taxonomy_version, scoring_rules_version, score_justification, status
)
SELECT
  c.workspace_id,
  c.id,
  'sector_news',
  'sector_news_item',
  sn.title,
  sn.summary,
  sn.published_at,
  sn.created_at,
  sn.published_at + interval '90 days',
  'sector_news:' || c.id || ':' || sn.id,
  coalesce(sn.relevance_score, 0.3),
  coalesce(sn.relevance_score, 0),
  CASE WHEN sn.is_trigger_event THEN 0.7 ELSE 0 END,
  'adr-0011-lot1-v1',
  'adr-0011-lot1-v1',
  'Actualité sectorielle mutualisée (secteur ' || c.sector || '), pas spécifique au compte.',
  'new'
FROM public.companies c
JOIN public.sector_news sn
  ON sn.sector_id = c.sector_id
  AND sn.workspace_id = c.workspace_id
WHERE c.sector_id IS NOT NULL
  AND sn.published_at >= now() - interval '90 days'
ON CONFLICT (workspace_id, dedupe_key) DO NOTHING;

-- ------------------------------------------------------------
-- 3. sector_regulatory_items urgents (high/critical), échéance
--    future ou non datée → comptes du même secteur
-- ------------------------------------------------------------
INSERT INTO public.account_signals (
  workspace_id, company_id, signal_category, signal_type,
  title, summary, event_at, detected_at,
  dedupe_key, confidence_score, urgency_score,
  taxonomy_version, scoring_rules_version, score_justification, status
)
SELECT
  c.workspace_id,
  c.id,
  'regulatory',
  'regulatory_deadline',
  sri.name,
  sri.description,
  sri.deadline_date::timestamptz,
  now(),
  'sector_reg:' || c.id || ':' || sri.id,
  CASE sri.urgency WHEN 'critical' THEN 0.9 WHEN 'high' THEN 0.7 ELSE 0.5 END,
  CASE sri.urgency WHEN 'critical' THEN 0.9 WHEN 'high' THEN 0.6 ELSE 0.4 END,
  'adr-0011-lot1-v1',
  'adr-0011-lot1-v1',
  'Échéance réglementaire sectorielle mutualisée (secteur ' || c.sector || '), urgence=' || sri.urgency || '.',
  'new'
FROM public.companies c
JOIN public.sector_regulatory_items sri
  ON sri.sector_id = c.sector_id
  AND sri.workspace_id = c.workspace_id
WHERE c.sector_id IS NOT NULL
  AND sri.urgency IN ('high', 'critical')
  AND (sri.deadline_date IS NULL OR sri.deadline_date >= current_date)
ON CONFLICT (workspace_id, dedupe_key) DO NOTHING;
