-- 017_rename_taci_to_cjm.sql
-- Correction sémantique : ce que le schéma appelait « taci » sur missions et
-- mission_activity_reports est en réalité un COÛT JOURNALIER (≈ 434 €), pas un
-- taux. Le vrai TACI (Taux d'Activité Congés Inclus) est un taux 0–1, désormais
-- porté par collaborator_compensation (migration 016).
--
-- On renomme donc le coût en CJM (Coût Journalier Moyen). La marge brute reste
-- (TJM − CJM) / TJM ; on reconstruit la colonne générée pour qu'elle référence
-- explicitement cjm.

begin;

-- missions.taci → missions.cjm (la colonne générée gross_margin_pct en dépend ;
-- on la supprime puis la recrée sur cjm).
alter table public.missions drop column gross_margin_pct;
alter table public.missions rename column taci to cjm;
alter table public.missions
  add column gross_margin_pct numeric
  generated always as (round((tjm - cjm) / nullif(tjm, 0) * 100, 2)) stored;

comment on column public.missions.cjm is 'Coût Journalier Moyen (coût interne chargé du collaborateur sur la mission). À ne pas confondre avec le TACI (taux d''activité).';

-- mission_activity_reports.taci_snapshot → cjm_snapshot
alter table public.mission_activity_reports rename column taci_snapshot to cjm_snapshot;

comment on column public.mission_activity_reports.cjm_snapshot is 'Snapshot du CJM (coût journalier) sur la période du CRA.';

commit;
