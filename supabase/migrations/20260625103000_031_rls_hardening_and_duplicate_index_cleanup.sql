BEGIN;

-- Harden insert RLS to enforce workspace isolation on writes.
ALTER POLICY calendar_events_insert
  ON public.calendar_events
  WITH CHECK (workspace_id = private.current_workspace_id());

ALTER POLICY collaborator_absences_insert
  ON public.collaborator_absences
  WITH CHECK (workspace_id = private.current_workspace_id());

ALTER POLICY client_closures_insert
  ON public.client_closures
  WITH CHECK (workspace_id = private.current_workspace_id());

-- Remote production still has an older equivalent contact_id index on opportunity_contacts.
DROP INDEX IF EXISTS public.idx_opportunity_contacts_contact_id;

COMMIT;
