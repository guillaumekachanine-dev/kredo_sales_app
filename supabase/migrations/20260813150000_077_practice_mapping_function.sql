-- 20260813150000_077_practice_mapping_function.sql
-- Table de correspondance et helpers SQL (Action A6 - MASTER STUDY)
-- Mappe l'ensemble des 8 practices et 44 offres KREDO (base offer_practices / offers)

CREATE OR REPLACE FUNCTION public.map_kredo_practice_to_offer_practice_slug(p_practice text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(p_practice))
    WHEN 'data_ai' THEN 'data-ia'
    WHEN 'cloud_eng' THEN 'digital-cloud'
    WHEN 'cyber' THEN 'cybersecurity'
    WHEN 'product' THEN 'agile-pm'
    WHEN 'testing' THEN 'qa-testing'
    WHEN 'apps' THEN 'custom-apps'
    WHEN 'design' THEN 'ux-ui-design'
    WHEN 'legacy' THEN 'legacy-mainframe'
    WHEN 'multi' THEN NULL
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.map_offer_practice_slug_to_kredo_practice(p_slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(p_slug))
    WHEN 'data-ia' THEN 'data_ai'
    WHEN 'data-ai' THEN 'data_ai'
    WHEN 'digital-cloud' THEN 'cloud_eng'
    WHEN 'cloud-engineering' THEN 'cloud_eng'
    WHEN 'cloud_eng' THEN 'cloud_eng'
    WHEN 'cybersecurity' THEN 'cyber'
    WHEN 'cyber' THEN 'cyber'
    WHEN 'agile-pm' THEN 'product'
    WHEN 'product' THEN 'product'
    WHEN 'qa-testing' THEN 'testing'
    WHEN 'custom-apps' THEN 'apps'
    WHEN 'ux-ui-design' THEN 'design'
    WHEN 'legacy-mainframe' THEN 'legacy'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.map_kredo_practice_to_offer_practice_slug(text) IS 'Action A6 MASTER STUDY : Convertit une kredo_practice (sector_*) en slug offer_practices (8 practices)';
COMMENT ON FUNCTION public.map_offer_practice_slug_to_kredo_practice(text) IS 'Action A6 MASTER STUDY : Convertit un slug offer_practices en kredo_practice';
