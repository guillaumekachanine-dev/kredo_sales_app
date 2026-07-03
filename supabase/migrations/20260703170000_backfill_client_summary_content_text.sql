-- ============================================================
-- REPORT-001 — Lot 1 : rattrapage idempotent des synthèses
-- client déjà générées avant la stabilisation.
--
-- Objectifs :
-- - reconstruire content_text lorsqu'il est absent ;
-- - propager ce texte du résultat vers le document et sa version ;
-- - renseigner data_cutoff_at depuis content_json.facts.dataCutoffAt ;
-- - renseigner scope_json depuis brief_json.scope si disponible.
-- ============================================================

WITH result_payload AS (
  SELECT
    r.id,
    NULLIF(
      concat_ws(
        E'\n\n',
        NULLIF(concat('# ', trim(coalesce(r.title, 'Synthèse client'))), '# '),
        NULLIF(trim(r.content_json #>> '{narrative,analysis}'), ''),
        NULLIF(
          concat(
            'Approche recommandée : ',
            trim(
              concat_ws(
                ' — ',
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,practice}'), ''),
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,offer}'), ''),
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,argument}'), '')
              )
            )
          ),
          'Approche recommandée : '
        ),
        NULLIF(
          concat(
            'Prochaine action : ',
            trim(coalesce(r.content_json #>> '{narrative,nextBestAction}', ''))
          ),
          'Prochaine action : '
        ),
        CASE
          WHEN jsonb_typeof(r.content_json #> '{narrative,warnings}') = 'array'
            AND jsonb_array_length(r.content_json #> '{narrative,warnings}') > 0
          THEN concat(
            'Warnings : ',
            (
              SELECT string_agg(trim(warning.value #>> '{}'), ' | ')
              FROM jsonb_array_elements(r.content_json #> '{narrative,warnings}') AS warning(value)
              WHERE trim(warning.value #>> '{}') <> ''
            )
          )
          ELSE NULL
        END
      ),
      ''
    ) AS content_text
  FROM public.ai_intelligence_results r
  WHERE r.result_type = 'client_summary'
),
latest_version_brief AS (
  SELECT DISTINCT ON (v.document_id)
    v.document_id,
    CASE
      WHEN jsonb_typeof(v.brief_json -> 'scope') = 'object' THEN v.brief_json -> 'scope'
      ELSE NULL
    END AS scope_json
  FROM public.intelligence_document_versions v
  JOIN public.intelligence_documents d ON d.id = v.document_id
  WHERE d.document_type = 'client_summary'
  ORDER BY v.document_id, v.version_number DESC
)
UPDATE public.ai_intelligence_results r
SET content_text = payload.content_text
FROM result_payload payload
WHERE r.id = payload.id
  AND r.result_type = 'client_summary'
  AND r.content_text IS NULL
  AND payload.content_text IS NOT NULL;

WITH result_payload AS (
  SELECT
    r.id,
    NULLIF(
      concat_ws(
        E'\n\n',
        NULLIF(concat('# ', trim(coalesce(r.title, 'Synthèse client'))), '# '),
        NULLIF(trim(r.content_json #>> '{narrative,analysis}'), ''),
        NULLIF(
          concat(
            'Approche recommandée : ',
            trim(
              concat_ws(
                ' — ',
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,practice}'), ''),
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,offer}'), ''),
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,argument}'), '')
              )
            )
          ),
          'Approche recommandée : '
        ),
        NULLIF(
          concat(
            'Prochaine action : ',
            trim(coalesce(r.content_json #>> '{narrative,nextBestAction}', ''))
          ),
          'Prochaine action : '
        ),
        CASE
          WHEN jsonb_typeof(r.content_json #> '{narrative,warnings}') = 'array'
            AND jsonb_array_length(r.content_json #> '{narrative,warnings}') > 0
          THEN concat(
            'Warnings : ',
            (
              SELECT string_agg(trim(warning.value #>> '{}'), ' | ')
              FROM jsonb_array_elements(r.content_json #> '{narrative,warnings}') AS warning(value)
              WHERE trim(warning.value #>> '{}') <> ''
            )
          )
          ELSE NULL
        END
      ),
      ''
    ) AS content_text
  FROM public.ai_intelligence_results r
  WHERE r.result_type = 'client_summary'
),
latest_version_brief AS (
  SELECT DISTINCT ON (v.document_id)
    v.document_id,
    CASE
      WHEN jsonb_typeof(v.brief_json -> 'scope') = 'object' THEN v.brief_json -> 'scope'
      ELSE NULL
    END AS scope_json
  FROM public.intelligence_document_versions v
  JOIN public.intelligence_documents d ON d.id = v.document_id
  WHERE d.document_type = 'client_summary'
  ORDER BY v.document_id, v.version_number DESC
)
UPDATE public.intelligence_documents d
SET
  current_content_text = COALESCE(d.current_content_text, payload.content_text),
  data_cutoff_at = COALESCE(
    d.data_cutoff_at,
    NULLIF(d.current_content_json #>> '{facts,dataCutoffAt}', '')::timestamptz
  ),
  scope_json = COALESCE(
    d.scope_json,
    (
      SELECT latest.scope_json
      FROM latest_version_brief latest
      WHERE latest.document_id = d.id
    )
  )
FROM result_payload payload
WHERE d.document_type = 'client_summary'
  AND d.source_result_id = payload.id
  AND (
    d.current_content_text IS NULL
    OR d.data_cutoff_at IS NULL
    OR d.scope_json IS NULL
  );

WITH result_payload AS (
  SELECT
    r.id,
    NULLIF(
      concat_ws(
        E'\n\n',
        NULLIF(concat('# ', trim(coalesce(r.title, 'Synthèse client'))), '# '),
        NULLIF(trim(r.content_json #>> '{narrative,analysis}'), ''),
        NULLIF(
          concat(
            'Approche recommandée : ',
            trim(
              concat_ws(
                ' — ',
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,practice}'), ''),
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,offer}'), ''),
                NULLIF(trim(r.content_json #>> '{narrative,recommendedApproach,argument}'), '')
              )
            )
          ),
          'Approche recommandée : '
        ),
        NULLIF(
          concat(
            'Prochaine action : ',
            trim(coalesce(r.content_json #>> '{narrative,nextBestAction}', ''))
          ),
          'Prochaine action : '
        ),
        CASE
          WHEN jsonb_typeof(r.content_json #> '{narrative,warnings}') = 'array'
            AND jsonb_array_length(r.content_json #> '{narrative,warnings}') > 0
          THEN concat(
            'Warnings : ',
            (
              SELECT string_agg(trim(warning.value #>> '{}'), ' | ')
              FROM jsonb_array_elements(r.content_json #> '{narrative,warnings}') AS warning(value)
              WHERE trim(warning.value #>> '{}') <> ''
            )
          )
          ELSE NULL
        END
      ),
      ''
    ) AS content_text
  FROM public.ai_intelligence_results r
  WHERE r.result_type = 'client_summary'
)
UPDATE public.intelligence_document_versions v
SET content_text = payload.content_text
FROM public.intelligence_documents d
JOIN result_payload payload ON payload.id = d.source_result_id
WHERE v.document_id = d.id
  AND d.document_type = 'client_summary'
  AND v.content_text IS NULL
  AND payload.content_text IS NOT NULL;
