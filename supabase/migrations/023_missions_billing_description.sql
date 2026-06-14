-- ============================================================
-- 023_missions_billing_description (remote: 20260614080058)
-- Ajout : billing_condition (modalités facturation) + description libre
-- sur la table missions
-- ============================================================

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS billing_condition text,
  ADD COLUMN IF NOT EXISTS description       text;
