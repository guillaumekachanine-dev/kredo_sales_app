-- Migration 041: rattachement direct calendar_events → missions
-- Permet de filtrer les événements de suivi par mission_id (plan de la mission)
-- au lieu de uniquement par company_id (qui mélange plusieurs missions du même compte).
-- Les données existantes conservent mission_id NULL (comportement de fallback company_id).

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS mission_id uuid NULL
    REFERENCES public.missions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_mission_id
  ON public.calendar_events (mission_id)
  WHERE mission_id IS NOT NULL;

COMMENT ON COLUMN public.calendar_events.mission_id IS
  'Lien optionnel vers une mission spécifique. Quand renseigné, les événements de suivi'
  ' de la fiche Mission filtrent par ce champ plutôt que par company_id.';
