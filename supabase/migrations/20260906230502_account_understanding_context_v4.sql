-- Account Knowledge V4, Lot 2 — dossier déterministe de compréhension compte.
--
-- Cette RPC est volontairement distincte de get_account_knowledge_context : la
-- V3 continue de l'utiliser jusqu'au benchmark et à la bascule. Le service n8n
-- l'appelle sous service_role ; SECURITY INVOKER conserve toutefois la doctrine
-- de sécurité des RPC de lecture et les privilèges retirent l'accès implicite.
--
-- Les documents sont exposés sous forme de métadonnées, pas de corps : leurs
-- contenus peuvent dépasser 10 kB et sont souvent eux-mêmes générés. Le dossier
-- V4 garde ainsi son budget de contexte pour les données primaires (CRM, FOLIO,
-- secteur et web au Lot 3), sans transformer un document historique en preuve.

create or replace function public.get_account_understanding_context(
  p_workspace_id uuid,
  p_company_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'company', (
      select jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'legal_name', c.legal_name,
        'siren', c.siren,
        'naf_code', c.naf_code,
        'lifecycle_status', c.lifecycle_status,
        'sector', c.sector,
        'sector_id', c.sector_id,
        'segment', c.segment,
        'segment_id', c.segment_id,
        'hq_location', c.hq_location,
        'employee_count', c.employee_count,
        'revenue', c.revenue,
        'size_band', c.size_band,
        'priority', c.priority,
        'description', c.description,
        'website', c.website
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'contacts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ct.id, 'person_id', ct.person_id, 'full_name', p.full_name,
        'job_title', ct.job_title, 'department', ct.department,
        'relationship_role', ct.relationship_role, 'decision_power', ct.decision_power,
        'relationship_level', ct.relationship_level, 'is_priority', ct.is_priority
      ) order by ct.is_priority desc, ct.relationship_level desc nulls last), '[]'::jsonb)
      from public.contacts ct
      join public.persons p on p.id = ct.person_id
      where ct.company_id = p_company_id and ct.workspace_id = p_workspace_id
    ),
    'recentInteractions', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.occurred_at desc), '[]'::jsonb)
      from (
        select id, contact_id, type, occurred_at, summary, sentiment, next_action
        from public.interactions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by occurred_at desc
        limit 15
      ) i
    ),
    'opportunities', (
      select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at desc), '[]'::jsonb)
      from (
        select id, title, stage, opportunity_type, estimated_gain, weighted_gain,
               target_daily_rate, next_action_label, next_action_at, closed_at,
               win_reason, loss_reason, created_at
        from public.opportunities
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by created_at desc
        limit 20
      ) o
    ),
    'missions', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.start_date desc nulls last), '[]'::jsonb)
      from (
        select id, title, role_title, practice, status, start_date, end_date,
               tjm, gross_margin_pct, billing_condition, description
        from public.missions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by start_date desc nulls last
        limit 20
      ) m
    ),
    -- Tous les signaux sont utiles à la compréhension datée : leur statut et
    -- leurs dates permettent au moteur V4 de les qualifier sans les confondre
    -- avec une actualité active.
    'signals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'category', s.signal_category, 'type', s.signal_type,
        'title', s.title, 'summary', s.summary, 'status', s.status,
        'confidence_score', s.confidence_score, 'relevance_score', s.relevance_score,
        'urgency_score', s.urgency_score, 'potential_value_score', s.potential_value_score,
        'global_score', s.global_score, 'detected_at', s.detected_at,
        'event_at', s.event_at, 'last_evidence_at', s.last_evidence_at,
        'expires_at', s.expires_at, 'primary_source_id', s.primary_source_id
      ) order by s.detected_at desc nulls last, s.created_at desc), '[]'::jsonb)
      from public.account_signals s
      where s.company_id = p_company_id and s.workspace_id = p_workspace_id
    ),
    -- Aucun filtre verified_at : le niveau de preuve est porté explicitement
    -- dans chaque fait et traité par le générateur V4.
    'accountFacts', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.fact_type, f.fact_subtype nulls first), '[]'::jsonb)
      from (
        select af.id, af.fact_type, af.fact_subtype, af.cardinality,
               af.value_text, af.value_json, af.normalized_value, af.origin,
               af.confidence_score, af.primary_source_id, af.effective_at,
               af.verified_at, af.expires_at, af.created_at, af.updated_at
        from public.account_facts af
        where af.workspace_id = p_workspace_id
          and af.target_type = 'company'
          and af.target_id = p_company_id
          and af.is_current = true
      ) f
    ),
    'factSources', (
      select coalesce(jsonb_agg(to_jsonb(src) order by src.collected_at desc), '[]'::jsonb)
      from (
        select src.id, src.source_type, src.source_name, src.source_url,
               src.canonical_url, src.published_at, src.collected_at,
               src.reliability_score, src.collection_method, src.evidence_excerpt
        from public.intelligence_sources src
        where src.workspace_id = p_workspace_id
          and (
            src.id in (
              select af.primary_source_id
              from public.account_facts af
              where af.workspace_id = p_workspace_id and af.target_type = 'company'
                and af.target_id = p_company_id and af.is_current = true
                and af.primary_source_id is not null
            )
            or src.id in (
              select l.source_id
              from public.intelligence_source_links l
              where l.workspace_id = p_workspace_id and l.object_type = 'fact'
                and l.object_id in (
                  select af.id
                  from public.account_facts af
                  where af.workspace_id = p_workspace_id and af.target_type = 'company'
                    and af.target_id = p_company_id and af.is_current = true
                )
            )
          )
      ) src
    ),
    'factSourceLinks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fact_id', l.object_id, 'source_id', l.source_id, 'link_role', l.link_role
      )), '[]'::jsonb)
      from public.intelligence_source_links l
      where l.workspace_id = p_workspace_id and l.object_type = 'fact'
        and l.object_id in (
          select af.id
          from public.account_facts af
          where af.workspace_id = p_workspace_id and af.target_type = 'company'
            and af.target_id = p_company_id and af.is_current = true
        )
    ),
    'accountIssues', (
      select coalesce(jsonb_agg(to_jsonb(ai) order by ai.updated_at desc), '[]'::jsonb)
      from (
        select id, title, category, problem_statement, evidence_level, provenance,
               source_refs, importance, urgency, criticality, business_impact,
               accessibility, kredo_fit, contact_ids, recommended_next_probe,
               status, created_at, updated_at
        from public.account_issues
        where company_id = p_company_id and workspace_id = p_workspace_id
      ) ai
    ),
    'intelligenceDocuments', (
      select coalesce(jsonb_agg(to_jsonb(doc) order by doc.updated_at desc), '[]'::jsonb)
      from (
        select id, source_result_id, title, document_type, status, primary_entity_type,
               primary_entity_id, tags, is_favorite, version_number, last_used_at,
               archived_at, scope_json, period_start, period_end, data_cutoff_at,
               approved_by, approved_at, created_at, updated_at
        from public.intelligence_documents
        where workspace_id = p_workspace_id
          and primary_entity_type = 'company'
          and primary_entity_id = p_company_id
      ) doc
    ),
    -- companies.segment_id est la clé de lecture. companies.sector_id est une
    -- projection historique, jamais la source de la connaissance résolue.
    'sectorKnowledge', (
      select to_jsonb(v)
      from public.v_sector_knowledge_resolved v
      join public.companies c on c.id = p_company_id and c.workspace_id = p_workspace_id
      where v.workspace_id = p_workspace_id and v.segment_id = c.segment_id
    ),
    'sectorKnowledgeItems', (
      select coalesce(jsonb_agg(to_jsonb(v) order by v.item_kind, v.deadline_date nulls last, v.published_at desc nulls last), '[]'::jsonb)
      from public.v_sector_knowledge_items v
      join public.companies c on c.id = p_company_id and c.workspace_id = p_workspace_id
      where v.workspace_id = p_workspace_id and v.segment_id = c.segment_id
    ),
    'competitiveMapEntries', (
      select coalesce(jsonb_agg(to_jsonb(cme) order by cme.updated_at desc), '[]'::jsonb)
      from public.competitive_map_entries cme
      join public.companies c on c.id = p_company_id and c.workspace_id = p_workspace_id
      left join public.v_sector_knowledge_resolved v
        on v.workspace_id = c.workspace_id and v.segment_id = c.segment_id
      where cme.workspace_id = p_workspace_id
        and (
          cme.company_id = p_company_id
          or cme.segment_id = c.segment_id
          or cme.sector_id = v.macro_id
        )
    ),
    'valueChainNodes', (
      select coalesce(jsonb_agg(to_jsonb(vcn) order by vcn.couche, vcn.rang, vcn.maillon), '[]'::jsonb)
      from public.value_chain_nodes vcn
      join public.companies c on c.id = p_company_id and c.workspace_id = p_workspace_id
      left join public.v_sector_knowledge_resolved v
        on v.workspace_id = c.workspace_id and v.segment_id = c.segment_id
      where vcn.workspace_id = p_workspace_id
        and vcn.sector_id in (c.segment_id, v.macro_id)
    ),
    'valueChainActors', (
      select coalesce(jsonb_agg(to_jsonb(vca) order by vca.nom), '[]'::jsonb)
      from public.value_chain_actors vca
      where vca.workspace_id = p_workspace_id
        and (
          vca.company_id = p_company_id
          or vca.node_id in (
            select vcn.id
            from public.value_chain_nodes vcn
            join public.companies c on c.id = p_company_id and c.workspace_id = p_workspace_id
            left join public.v_sector_knowledge_resolved v
              on v.workspace_id = c.workspace_id and v.segment_id = c.segment_id
            where vcn.workspace_id = p_workspace_id
              and vcn.sector_id in (c.segment_id, v.macro_id)
          )
        )
    ),
    'valueChainLinks', (
      select coalesce(jsonb_agg(to_jsonb(vcl) order by vcl.created_at), '[]'::jsonb)
      from public.value_chain_links vcl
      where vcl.workspace_id = p_workspace_id
        and (
          vcl.node_amont in (
            select vcn.id
            from public.value_chain_nodes vcn
            join public.companies c on c.id = p_company_id and c.workspace_id = p_workspace_id
            left join public.v_sector_knowledge_resolved v
              on v.workspace_id = c.workspace_id and v.segment_id = c.segment_id
            where vcn.workspace_id = p_workspace_id
              and vcn.sector_id in (c.segment_id, v.macro_id)
          )
          or vcl.node_aval in (
            select vcn.id
            from public.value_chain_nodes vcn
            join public.companies c on c.id = p_company_id and c.workspace_id = p_workspace_id
            left join public.v_sector_knowledge_resolved v
              on v.workspace_id = c.workspace_id and v.segment_id = c.segment_id
            where vcn.workspace_id = p_workspace_id
              and vcn.sector_id in (c.segment_id, v.macro_id)
          )
        )
    ),
    -- FOLIO reste complet et explicitement legacy : il peut éclairer la
    -- synthèse mais ne devient jamais une preuve sans qualification V4.
    'folioAnalysisData', (
      select c.metadata->'analysis_data'
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'folioSectorAnalysis', (
      select c.metadata->'sector_analysis'
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'processDiagnostic', (
      select r.content_json
      from public.ai_intelligence_results r
      where r.company_id = p_company_id and r.workspace_id = p_workspace_id
        and r.result_type = 'process_diagnostic' and r.status = 'succeeded'
      order by r.created_at desc
      limit 1
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_account_understanding_context(uuid, uuid) from public;
revoke all on function public.get_account_understanding_context(uuid, uuid) from anon, authenticated;
grant execute on function public.get_account_understanding_context(uuid, uuid) to service_role;

comment on function public.get_account_understanding_context(uuid, uuid) is
  'Account Knowledge V4, Lot 2 — contexte unifié déterministe pour intel-030. Appelée uniquement sous service_role ; conserve les faits et signaux courants et archivés, la connaissance sectorielle résolue à la maille companies.segment_id, la chaîne de valeur, FOLIO complet et les métadonnées documentaires.';
