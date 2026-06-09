-- ============================================================
--  KREDO — Migration 002 : Mise à jour du module Opportunité
--  Cible : PostgreSQL / Supabase  —  Schéma : public
--
--  Changements :
--    1. Remplace les 5 valeurs de sales_stage par 6 nouvelles
--       qui fusionnent étape commerciale + résultat
--    2. Ajoute start_date et duration (en jours) sur sales_opportunities
--    3. Ajoute acv (Annual Contract Value calculé) en colonne GENERATED
--    4. Rend account_id nullable (client optionnel à la création)
-- ============================================================


-- ------------------------------------------------------------
--  1. MIGRATION DU TYPE sales_stage
--     Postgres ne permet pas de renommer des valeurs d'enum
--     directement avant PG15. La méthode portable :
--     créer un nouveau type → migrer la colonne → supprimer l'ancien.
-- ------------------------------------------------------------

-- 1a. Nouveau type avec les 6 valeurs métier
CREATE TYPE sales_stage_v2 AS ENUM (
  'en_cours',     -- Demande prise en compte, en cours de traitement
  'cv_sent',      -- Profils / CVs poussés au client
  'rt',           -- Réunion Technique organisée avec le candidat
  'win',          -- Affaire remportée
  'lost',         -- Affaire perdue
  'non_traitee'   -- Demande non jugée digne d'intérêt par l'ESN
);

-- 1b. Supprime le défaut (il référence l'ancien type)
ALTER TABLE sales_opportunities ALTER COLUMN stage DROP DEFAULT;

-- 1c. Migration des données existantes : mapping ancien → nouveau
ALTER TABLE sales_opportunities
  ALTER COLUMN stage TYPE sales_stage_v2
  USING CASE stage::text
    WHEN 'demande'       THEN 'en_cours'::sales_stage_v2
    WHEN 'qualification' THEN 'en_cours'::sales_stage_v2
    WHEN 'envoi_cv'      THEN 'cv_sent'::sales_stage_v2
    WHEN 'rt'            THEN 'rt'::sales_stage_v2
    WHEN 'signature'     THEN 'win'::sales_stage_v2
    ELSE                      'en_cours'::sales_stage_v2
  END;

-- 1d. Nouveau défaut
ALTER TABLE sales_opportunities ALTER COLUMN stage SET DEFAULT 'en_cours';

-- 1e. Supprime l'ancien type, renomme le nouveau
DROP TYPE sales_stage;
ALTER TYPE sales_stage_v2 RENAME TO sales_stage;


-- ------------------------------------------------------------
--  2. NOUVELLES COLONNES : start_date, duration, acv
-- ------------------------------------------------------------

ALTER TABLE sales_opportunities
  ADD COLUMN start_date  date,
  ADD COLUMN duration    integer CHECK (duration > 0);   -- durée en jours ouvrés

-- acv = Duration (j) × TJM cible (€) — recalculé automatiquement par Postgres
ALTER TABLE sales_opportunities
  ADD COLUMN acv numeric(12, 2)
    GENERATED ALWAYS AS (
      CASE
        WHEN duration IS NOT NULL AND target_daily_rate IS NOT NULL
          THEN duration::numeric * target_daily_rate
        ELSE NULL
      END
    ) STORED;


-- ------------------------------------------------------------
--  3. account_id devient nullable
--     (le client peut être saisi inline lors de la création)
-- ------------------------------------------------------------

ALTER TABLE sales_opportunities ALTER COLUMN account_id DROP NOT NULL;


-- ============================================================
--  FIN DE LA MIGRATION 002
-- ============================================================
