-- 070 — Verrouillage du search_path des helpers de résolution sectorielle.
--
-- Le linter Supabase (0011_function_search_path_mutable) signale les 5 fonctions
-- introduites par la migration 069 : sans search_path fixé, un appelant peut
-- interposer son propre schéma devant `private`. Les corps ne référencent que
-- des fonctions de `pg_catalog` (toujours implicitement résolu) et des appels
-- déjà qualifiés `private.*` : `search_path = ''` est donc sans effet sur le
-- résultat — vérifié en dry-run, 38 lignes résolues / 488 items, identique.
alter function private.jsonb_is_filled(jsonb) set search_path = '';
alter function private.merge_sector_playbook(jsonb, jsonb) set search_path = '';
alter function private.merge_sector_practices_fit(jsonb, jsonb) set search_path = '';
alter function private.sector_playbook_source_level(jsonb, jsonb) set search_path = '';
alter function private.sector_practices_fit_source_level(jsonb, jsonb) set search_path = '';
