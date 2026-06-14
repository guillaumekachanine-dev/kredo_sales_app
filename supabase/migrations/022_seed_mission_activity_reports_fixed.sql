-- ============================================================
-- 022_seed_mission_activity_reports_fixed (remote: 20260614075506)
-- Correctif post-seed : ajustements mineurs sur quelques CRA
-- (statuts mai, arrondis billable_days). Idempotent via ON CONFLICT UPDATE.
-- ============================================================

-- Les données finales sont déjà incluses dans 021 (source de vérité récupérée
-- depuis le remote). Ce correctif ne contient pas de re-seed supplémentaire.
-- Il est conservé pour traçabilité du run remote 20260614075506.
SELECT 1; -- no-op idempotent
