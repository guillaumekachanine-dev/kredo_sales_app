-- 028 — Expand interactions_type_check to include front-end used types
-- Previous constraint (lot0 migration) only allowed 12 values.
-- OpportunityTimelinePanel and the commercial-action dialog need additional types.

ALTER TABLE public.interactions
  DROP CONSTRAINT IF EXISTS interactions_type_check;

ALTER TABLE public.interactions
  ADD CONSTRAINT interactions_type_check
  CHECK (
    type = ANY (ARRAY[
      'appel'::text,
      'email'::text,
      'rdv'::text,
      'rdv_client'::text,
      'linkedin'::text,
      'dejeuner'::text,
      'evenement'::text,
      'relance'::text,
      'negociation'::text,
      'envoi_offre'::text,
      'reunion'::text,
      'autre'::text,
      'changement_etape'::text,
      'note'::text,
      'envoi_cv'::text,
      'entretien_client'::text,
      'proposition'::text,
      'signature'::text,
      'perte'::text
    ])
  );
