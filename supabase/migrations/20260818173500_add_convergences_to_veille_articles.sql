-- Migration LOT 1 (Convergences) : Ajout de la colonne JSONB nullable `convergences` sur `veille_articles`.
--
-- Les anciens articles restent valides avec `convergences = NULL`.
-- Migration additive et idempotente.
ALTER TABLE public.veille_articles
ADD COLUMN IF NOT EXISTS convergences JSONB DEFAULT NULL;
