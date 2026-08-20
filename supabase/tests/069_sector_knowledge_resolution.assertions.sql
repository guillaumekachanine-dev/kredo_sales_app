-- ============================================================================
-- Assertions — Lot 0, résolution sectorielle héritée (migrations 069 / 070).
--
-- Couvre la moitié SQL du contrat, hors de portée de Vitest : fusion du
-- playbook clé par clé, traitement du 0 dans `practices_fit`, provenance, et
-- invariants d'union des deux vues sur les données réelles.
-- La moitié TypeScript est couverte par
-- `src/lib/intelligence/sector-snapshot-data.test.ts`.
--
-- À rejouer tel quel : le script n'écrit rien et lève une exception au premier
-- invariant faux. Silence = tout est vert.
-- ============================================================================

do $$
declare
  macro_rempli   jsonb := '{"personas":["DSI","Dir. industriel"],"objections":["Trop cher"],"entry_points":["Audit flash"],"roi_arguments":["-20% de TCO"]}';
  seg_vide       jsonb := '{"personas":[],"objections":[],"entry_points":[],"roi_arguments":[]}';
  seg_partiel    jsonb := '{"personas":["RSSI spatial"],"objections":[],"entry_points":[],"roi_arguments":[]}';
  seg_complet    jsonb := '{"personas":["RSSI spatial"],"objections":["Habilitation"],"entry_points":["PoC souverain"],"roi_arguments":["Conformité DGA"]}';
  fusion         jsonb;
begin
  -- 1. Segment aux 4 clés VIDES → le playbook macro est intégralement conservé.
  --    C'est le piège n°1 du lot : une fusion « blob entier, segment
  --    prioritaire » écraserait ici 13 playbooks macro remplis.
  fusion := private.merge_sector_playbook(seg_vide, macro_rempli);
  if fusion <> macro_rempli then
    raise exception 'ASSERT 1 — segment vide : playbook macro non conservé (%)', fusion;
  end if;
  if private.sector_playbook_source_level(seg_vide, macro_rempli) <> 'macro' then
    raise exception 'ASSERT 1b — segment vide : provenance devrait être macro';
  end if;

  -- 2. Segment PARTIEL → fusion clé par clé, pas de bascule en bloc.
  fusion := private.merge_sector_playbook(seg_partiel, macro_rempli);
  if fusion -> 'personas' <> '["RSSI spatial"]'::jsonb then
    raise exception 'ASSERT 2a — clé remplie du segment non retenue (%)', fusion;
  end if;
  if fusion -> 'objections' <> macro_rempli -> 'objections'
     or fusion -> 'entry_points' <> macro_rempli -> 'entry_points'
     or fusion -> 'roi_arguments' <> macro_rempli -> 'roi_arguments' then
    raise exception 'ASSERT 2b — clés vides du segment non héritées du macro (%)', fusion;
  end if;
  if private.sector_playbook_source_level(seg_partiel, macro_rempli) <> 'segment' then
    raise exception 'ASSERT 2c — segment partiel : provenance devrait être segment';
  end if;

  -- 3. Segment COMPLET → le macro est ignoré.
  fusion := private.merge_sector_playbook(seg_complet, macro_rempli);
  if fusion <> seg_complet then
    raise exception 'ASSERT 3 — segment complet : le macro aurait dû être ignoré (%)', fusion;
  end if;

  -- 4. Clé présente d'un seul côté.
  fusion := private.merge_sector_playbook('{"personas":["A"]}'::jsonb, '{"objections":["B"]}'::jsonb);
  if fusion <> '{"personas":["A"],"objections":["B"]}'::jsonb then
    raise exception 'ASSERT 4 — union des clés incorrecte (%)', fusion;
  end if;

  -- 5. Clé vide des deux côtés → absente du résultat (pas de bruit à l'écran).
  fusion := private.merge_sector_playbook('{"personas":[]}'::jsonb, '{"personas":[]}'::jsonb);
  if fusion <> '{}'::jsonb then
    raise exception 'ASSERT 5 — clé vide des deux côtés non éliminée (%)', fusion;
  end if;

  -- 6. NULL des deux côtés → objet vide, jamais NULL.
  if private.merge_sector_playbook(null, null) <> '{}'::jsonb then
    raise exception 'ASSERT 6 — fusion de deux NULL devrait donner {}';
  end if;

  -- 7. practices_fit : un score à 0 vaut « non renseigné » (squelette de seed).
  fusion := private.merge_sector_practices_fit(
    '{"cyber":0,"data_ai":0,"product":0,"cloud_eng":0}'::jsonb,
    '{"cyber":2,"data_ai":4,"product":3,"cloud_eng":3}'::jsonb);
  if fusion <> '{"cyber":2,"data_ai":4,"product":3,"cloud_eng":3}'::jsonb then
    raise exception 'ASSERT 7 — practices_fit de seed a masqué le profil macro (%)', fusion;
  end if;

  -- 8. practices_fit partiellement renseigné → mélange clé par clé.
  fusion := private.merge_sector_practices_fit(
    '{"cyber":5,"data_ai":0}'::jsonb,
    '{"cyber":2,"data_ai":4}'::jsonb);
  if fusion <> '{"cyber":5,"data_ai":4}'::jsonb then
    raise exception 'ASSERT 8 — practices_fit : fusion clé par clé incorrecte (%)', fusion;
  end if;

  -- 9. practices_fit garde sa FORME même quand les deux côtés valent 0 : c'est
  --    un vecteur de scores à 4 clés où 0 signifie « pas d'adhérence », pas
  --    « non renseigné au point de disparaître ». Asymétrie assumée avec le
  --    playbook (migration 071).
  fusion := private.merge_sector_practices_fit('{"cyber":0}'::jsonb, '{"cyber":0}'::jsonb);
  if fusion <> '{"cyber":0}'::jsonb then
    raise exception 'ASSERT 9 — practices_fit ne doit pas perdre ses clés (%)', fusion;
  end if;

  raise notice 'Fusions : 9/9 assertions vertes.';
end $$;

do $$
declare
  ecart integer;
  sans_invoker integer;
begin
  -- 10. Les deux vues portent bien `security_invoker` : sans lui, elles
  --    s'exécutent avec les droits du propriétaire et traversent la RLS
  --    workspace.
  select count(*) into sans_invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('v_sector_knowledge_resolved', 'v_sector_knowledge_items')
    and not coalesce(c.reloptions::text[] @> array['security_invoker=true'], false);
  if sans_invoker > 0 then
    raise exception 'ASSERT 10 — % vue(s) sans security_invoker', sans_invoker;
  end if;

  -- 11. UNION, jamais substitution : pour chaque segment, le nombre d'items
  --     visibles = ses items propres + ceux de son macro parent.
  select count(*) into ecart
  from (
    select s.id as segment_id,
      (select count(*) from public.sector_regulatory_items x where x.sector_id = s.id)
      + (select count(*) from public.sector_pain_points   x where x.sector_id = s.id)
      + (select count(*) from public.sector_events        x where x.sector_id = s.id)
      + (select count(*) from public.sector_news          x where x.sector_id = s.id)
      + coalesce((select count(*) from public.sector_regulatory_items x where x.sector_id = s.parent_id), 0)
      + coalesce((select count(*) from public.sector_pain_points   x where x.sector_id = s.parent_id), 0)
      + coalesce((select count(*) from public.sector_events        x where x.sector_id = s.parent_id), 0)
      + coalesce((select count(*) from public.sector_news          x where x.sector_id = s.parent_id), 0) as attendu,
      (select count(*) from public.v_sector_knowledge_items i where i.segment_id = s.id) as obtenu
    from public.sector_intelligence s
    where s.level = 'segment'
  ) t
  where t.attendu <> t.obtenu;
  if ecart > 0 then
    raise exception 'ASSERT 11 — % segment(s) où items <> segment + macro (substitution au lieu d''union ?)', ecart;
  end if;

  -- 12. Une ligne résolue par fiche segment, exactement.
  select count(*) into ecart
  from (
    select (select count(*) from public.sector_intelligence where level = 'segment') as fiches,
           (select count(*) from public.v_sector_knowledge_resolved) as lignes
  ) t
  where t.fiches <> t.lignes;
  if ecart > 0 then
    raise exception 'ASSERT 12 — v_sector_knowledge_resolved ne couvre pas 1:1 les fiches segment';
  end if;

  -- 13. Aucun item ne remonte sans provenance exploitable.
  select count(*) into ecart
  from public.v_sector_knowledge_items
  where resolved_level not in ('segment', 'macro') or item_kind is null or item_id is null;
  if ecart > 0 then
    raise exception 'ASSERT 13 — % item(s) sans provenance exploitable', ecart;
  end if;

  -- 14. Non-régression : aucun compte ne perd le drapeau « playbook
  --     structuré » en passant de la lecture macro à la lecture résolue.
  select count(*) into ecart
  from public.companies c
  join public.sector_intelligence m on m.id = c.sector_id
  join public.v_sector_knowledge_resolved r on r.segment_id = c.segment_id
  where (m.status = 'active' and m.playbook is not null and m.playbook <> '{}'::jsonb)
    and not (
      (case when r.playbook_level = 'segment' then r.segment_status else r.macro_status end) = 'active'
      and r.playbook <> '{}'::jsonb
    );
  if ecart > 0 then
    raise exception 'ASSERT 14 — % compte(s) perdent le drapeau playbook structuré', ecart;
  end if;

  raise notice 'Vues : 5/5 assertions vertes.';
end $$;

do $$
begin
  -- 15. Le verrou l'emporte toujours, même si une valeur brute existe des deux côtés
  --     (défense contre un état incohérent que l'importeur ne devrait jamais produire,
  --     mais que la vue ne doit jamais laisser passer si un bug le produit quand même).
  if private.sector_resolve_scalar(4.9, 4.2, true) is not null then
    raise exception 'ASSERT 15a — le verrou devrait forcer NULL même avec une valeur segment ET macro';
  end if;
  if private.sector_scalar_level(4.9, true) <> 'locked' then
    raise exception 'ASSERT 15b — un segment verrouillé doit rester `locked` même s''il porte une valeur brute';
  end if;

  -- 16. Sans verrou, le comportement est inchangé (non-régression du COALESCE existant).
  if private.sector_resolve_scalar(4.9, 4.2, false) <> 4.9 then
    raise exception 'ASSERT 16a — sans verrou, la valeur segment doit primer';
  end if;
  if private.sector_resolve_scalar(null, 4.2, false) <> 4.2 then
    raise exception 'ASSERT 16b — sans verrou et sans valeur segment, le macro doit passer';
  end if;
  if private.sector_scalar_level(4.9, false) <> 'segment' or private.sector_scalar_level(null, false) <> 'macro' then
    raise exception 'ASSERT 16c — provenance segment/macro incorrecte sans verrou';
  end if;

  -- 17. Aucune fiche existante n'est verrouillée avant la première ingestion Master Study
  --     (resolution_locks doit valoir ''{}'' partout tant que L2/L3 n'ont encore rien écrit).
  --     Cette assertion cessera d'être vraie après le premier import réel (L3) — c'est attendu,
  --     elle vérifie l'état DE CETTE MIGRATION, pas un invariant permanent. Si elle échoue à ce
  --     stade, quelque chose a écrit dans resolution_locks avant l'heure : investiguer avant de
  --     continuer, ne pas l'assouplir en silence.
  if (select count(*) from public.sector_intelligence where resolution_locks <> '{}'::jsonb) <> 0 then
    raise exception 'ASSERT 17 — resolution_locks non vide avant toute ingestion Master Study (L2/L3 pas encore livrés)';
  end if;

  -- 18. v_sector_knowledge_resolved expose bien les 3 nouvelles colonnes de niveau, avec des
  --     valeurs dans le domaine attendu (jamais autre chose que segment/macro/locked).
  if exists (
    select 1 from public.v_sector_knowledge_resolved
    where attractiveness_score_level not in ('segment','macro','locked')
       or market_size_eur_bn_level not in ('segment','macro','locked')
       or market_growth_pct_level not in ('segment','macro','locked')
  ) then
    raise exception 'ASSERT 18 — un niveau de provenance hors domaine (segment/macro/locked)';
  end if;

  raise notice 'L1 — provenance et verrou : 4/4 assertions supplémentaires vertes.';
end $$;

