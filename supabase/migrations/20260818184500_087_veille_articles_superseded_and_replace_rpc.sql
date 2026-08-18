-- 20260818184500_087_veille_articles_superseded_and_replace_rpc.sql
-- LOT 2.3 : Idempotence sûre et conservation documentaire des articles de veille.
-- Ajout de `superseded_at` sur `veille_articles` et fonction RPC transactionnelle `replace_veille_digest_articles`.

ALTER TABLE public.veille_articles
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz NULL;

COMMENT ON COLUMN public.veille_articles.superseded_at IS
  'LOT 2.3 : NULL = article appartenant à la sélection active du digest. Non-NULL = ancienne sélection archivée conservant les références documentaires/listes/corpus.';

-- Index partiels pour optimiser les requêtes sur les articles actifs
CREATE INDEX IF NOT EXISTS idx_veille_articles_digest_active
  ON public.veille_articles (digest_id, selection_rank)
  WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_veille_articles_workspace_active
  ON public.veille_articles (workspace_id, published_at, selection_rank)
  WHERE superseded_at IS NULL;

-- Fonction transactionnelle atomique pour remplacer la sélection active d'un digest
CREATE OR REPLACE FUNCTION public.replace_veille_digest_articles(
  p_digest_id uuid,
  p_articles jsonb
)
RETURNS setof public.veille_articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- 1. Vérifier l'existence du digest et récupérer son workspace_id
  SELECT workspace_id INTO v_workspace_id
  FROM public.veille_digests
  WHERE id = p_digest_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Digest % introuvable', p_digest_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. Marquer les anciens articles actifs de ce digest comme superseded
  UPDATE public.veille_articles
  SET superseded_at = now(),
      updated_at = now()
  WHERE digest_id = p_digest_id
    AND superseded_at IS NULL;

  -- 3. Insérer les nouveaux articles s'il y en a
  IF p_articles IS NOT NULL AND jsonb_array_length(p_articles) > 0 THEN
    RETURN QUERY
    INSERT INTO public.veille_articles (
      digest_id,
      workspace_id,
      selection_rank,
      titre_fr,
      source_name,
      source_catalog_id,
      url,
      url_hash,
      published_at,
      resume,
      analyse_kredo,
      action_commerciale,
      secteur_principal,
      secteur_secondaire,
      categorie,
      tags,
      convergences,
      superseded_at
    )
    SELECT
      p_digest_id,
      COALESCE((elem->>'workspace_id')::uuid, v_workspace_id),
      (elem->>'selection_rank')::smallint,
      elem->>'titre_fr',
      elem->>'source_name',
      CASE WHEN (elem->>'source_catalog_id') IS NOT NULL AND (elem->>'source_catalog_id') <> ''
           THEN (elem->>'source_catalog_id')::uuid
           ELSE NULL END,
      elem->>'url',
      elem->>'url_hash',
      CASE WHEN (elem->>'published_at') IS NOT NULL AND (elem->>'published_at') <> ''
           THEN (elem->>'published_at')::timestamptz
           ELSE NULL END,
      elem->>'resume',
      elem->>'analyse_kredo',
      elem->>'action_commerciale',
      COALESCE(elem->>'secteur_principal', 'transverse'),
      COALESCE(elem->>'secteur_secondaire', ''),
      elem->>'categorie',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(elem->'tags')), '{}'::text[]),
      elem->'convergences',
      NULL
    FROM jsonb_array_elements(p_articles) AS elem
    RETURNING *;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_veille_digest_articles(uuid, jsonb) TO authenticated, service_role, anon;

COMMENT ON FUNCTION public.replace_veille_digest_articles(uuid, jsonb) IS
  'LOT 2.3 — Remplacement transactionnel et idempotent des articles d''un digest. Les anciens articles actifs sont marqués superseded_at = now() et la nouvelle sélection est insérée atomiquement.';
