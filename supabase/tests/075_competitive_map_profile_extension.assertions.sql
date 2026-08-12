-- ============================================================================
-- Assertions — BI « Environnement concurrentiel » Lot 1 (migration 075).
--
-- Couvre la moitié SQL du contrat d'ingestion, hors de portée de Vitest :
-- forme des colonnes ajoutées, garde-fous, et surtout la sémantique d'upsert
-- (même snapshot = mise à jour / nouvelle date = nouvelle ligne d'historique).
-- La moitié TypeScript est couverte par
-- `src/features/competitive-map/domain/competitive-map-output.test.ts`.
--
-- LECTURE SEULE côté données réelles : la partie qui écrit tourne dans une
-- transaction explicitement annulée en fin de bloc. Le script lève une
-- exception au premier invariant faux. Silence = tout est vert.
--
-- À rejouer : psql "$DATABASE_URL" -f supabase/tests/075_competitive_map_profile_extension.assertions.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Partie 1 — forme du schéma (aucune écriture)
-- ----------------------------------------------------------------------------
do $$
declare
  v_def text;
begin
  -- 1. accessibilite_score : smallint, nullable, borné 1..5.
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'competitive_map_entries'
       and column_name = 'accessibilite_score'
       and data_type = 'smallint' and is_nullable = 'YES'
  ) then
    raise exception 'ASSERT 1 — accessibilite_score absente ou mal typée (attendu smallint nullable)';
  end if;

  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conrelid = 'public.competitive_map_entries'::regclass
     and conname = 'competitive_map_entries_accessibilite_score_check';
  if v_def is null then
    raise exception 'ASSERT 1b — CHECK 1..5 manquant sur accessibilite_score';
  end if;

  -- 2. profile_json : jsonb NOT NULL DEFAULT '{}'. Le NOT NULL est ce qui
  --    garantit qu'une lecture Lot 2 n'a jamais à gérer le cas null.
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'competitive_map_entries'
       and column_name = 'profile_json'
       and data_type = 'jsonb' and is_nullable = 'NO'
       and column_default = '''{}''::jsonb'
  ) then
    raise exception 'ASSERT 2 — profile_json absente ou sans NOT NULL DEFAULT ''{}''::jsonb';
  end if;

  -- 3. La clé d'upsert n'a pas bougé : (company_id, sector_id, study_snapshot_date).
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conrelid = 'public.competitive_map_entries'::regclass
     and conname = 'cme_unique_par_etude';
  if v_def is null or v_def <> 'UNIQUE (company_id, sector_id, study_snapshot_date)' then
    raise exception 'ASSERT 3 — clé d''upsert modifiée : %', coalesce(v_def, 'contrainte absente');
  end if;

  -- 4. RLS toujours active et non affaiblie (motif workspace, FOR ALL).
  if not (select relrowsecurity from pg_class where oid = 'public.competitive_map_entries'::regclass) then
    raise exception 'ASSERT 4 — RLS désactivée sur competitive_map_entries';
  end if;
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'competitive_map_entries'
       and cmd = 'ALL' and qual like '%current_workspace_id%' and with_check like '%current_workspace_id%'
  ) then
    raise exception 'ASSERT 4b — policy d''isolation workspace absente ou affaiblie';
  end if;

  -- 5. La RPC persiste bien les trois champs du lot.
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'ingest_competitive_map_batch'
       and p.prosecdef
       and p.prosrc like '%accessibilite_score%'
       and p.prosrc like '%profile_json%'
       and p.prosrc like '%is_benchmark_account%'
  ) then
    raise exception 'ASSERT 5 — ingest_competitive_map_batch ne persiste pas les 3 champs du Lot 1';
  end if;

  raise notice 'Partie 1 (schéma) — OK';
end $$;

-- ----------------------------------------------------------------------------
-- Partie 2 — sémantique d'upsert, dans une transaction ANNULÉE
-- ----------------------------------------------------------------------------
-- Écrit deux entrées sur un compte réel du workspace, puis ROLLBACK. Rien ne
-- subsiste : c'est une vérification de comportement, pas un seed.
begin;

do $$
declare
  v_ws        uuid;
  v_company   uuid;
  v_sector    uuid;
  v_count     int;
  v_score     smallint;
  v_profile   jsonb;
  v_benchmark boolean;
begin
  select w.id into v_ws from public.workspaces w limit 1;
  select c.id into v_company from public.companies c where c.workspace_id = v_ws limit 1;
  select s.id into v_sector from public.sector_intelligence s
   where s.workspace_id = v_ws and s.level = 'macro' limit 1;

  if v_ws is null or v_company is null or v_sector is null then
    raise notice 'Partie 2 ignorée — workspace/compte/secteur introuvable';
    return;
  end if;

  -- Snapshot A, première écriture.
  insert into public.competitive_map_entries (
    workspace_id, company_id, sector_id, is_benchmark_account, category,
    accessibilite_score, appetence_score, confiance, study_snapshot_date, profile_json
  ) values (
    v_ws, v_company, v_sector, false, 'leader',
    2, 19, 'moyenne', date '2026-08-08', '{"proposition_valeur":"v1"}'::jsonb
  );

  -- 6. MÊME snapshot -> mise à jour, pas de doublon.
  insert into public.competitive_map_entries (
    workspace_id, company_id, sector_id, is_benchmark_account, category,
    accessibilite_score, appetence_score, confiance, study_snapshot_date, profile_json
  ) values (
    v_ws, v_company, v_sector, true, 'leader',
    4, 24, 'haute', date '2026-08-08', '{"proposition_valeur":"v2"}'::jsonb
  )
  on conflict (company_id, sector_id, study_snapshot_date) do update set
    is_benchmark_account = excluded.is_benchmark_account,
    accessibilite_score  = excluded.accessibilite_score,
    appetence_score      = excluded.appetence_score,
    confiance            = excluded.confiance,
    profile_json         = excluded.profile_json,
    updated_at           = now();

  select count(*) into v_count from public.competitive_map_entries
   where company_id = v_company and sector_id = v_sector and study_snapshot_date = date '2026-08-08';
  if v_count <> 1 then
    raise exception 'ASSERT 6 — même snapshot : % lignes au lieu de 1', v_count;
  end if;

  select accessibilite_score, profile_json, is_benchmark_account
    into v_score, v_profile, v_benchmark
    from public.competitive_map_entries
   where company_id = v_company and sector_id = v_sector and study_snapshot_date = date '2026-08-08';
  if v_score <> 4 or v_profile ->> 'proposition_valeur' <> 'v2' or not v_benchmark then
    raise exception 'ASSERT 6b — l''upsert n''a pas mis à jour les 3 champs du lot (score=%, profil=%, etalon=%)',
      v_score, v_profile, v_benchmark;
  end if;

  -- 7. NOUVELLE date de snapshot -> nouvelle ligne, l'historique est conservé.
  insert into public.competitive_map_entries (
    workspace_id, company_id, sector_id, is_benchmark_account, category,
    accessibilite_score, appetence_score, confiance, study_snapshot_date, profile_json
  ) values (
    v_ws, v_company, v_sector, false, 'challenger',
    3, 22, 'moyenne', date '2026-11-08', '{}'::jsonb
  );

  select count(*) into v_count from public.competitive_map_entries
   where company_id = v_company and sector_id = v_sector
     and study_snapshot_date in (date '2026-08-08', date '2026-11-08');
  if v_count <> 2 then
    raise exception 'ASSERT 7 — nouveau snapshot : % lignes au lieu de 2 (historique perdu)', v_count;
  end if;

  -- 8. Accessibilité hors bornes -> rejetée par le CHECK.
  begin
    insert into public.competitive_map_entries (
      workspace_id, company_id, sector_id, category,
      accessibilite_score, confiance, study_snapshot_date
    ) values (
      v_ws, v_company, v_sector, 'leader', 7, 'haute', date '2027-01-01'
    );
    raise exception 'ASSERT 8 — accessibilite_score = 7 accepté alors que le CHECK est 1..5';
  exception when check_violation then
    null; -- comportement attendu
  end;

  -- 9. profile_json ne reçoit jamais de fait chiffré sourcé (ADR-0019 D-4) :
  --    les colonnes canoniques de companies restent intactes après ingestion.
  if exists (
    select 1 from public.competitive_map_entries
     where company_id = v_company
       and (profile_json ? 'ca_meur' or profile_json ? 'effectif_france')
  ) then
    raise exception 'ASSERT 9 — un fait chiffré sourcé a été écrit dans profile_json';
  end if;

  raise notice 'Partie 2 (upsert) — OK';
end $$;

rollback;
