BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'opportunities_stage_check'
      AND conrelid = 'public.opportunities'::regclass
  ) THEN
    ALTER TABLE public.opportunities
      DROP CONSTRAINT opportunities_stage_check;
  END IF;
END $$;

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_stage_check
  CHECK (
    stage = ANY (
      ARRAY[
        'qualification'::text,
        'recherche_profil'::text,
        'cv_envoyes'::text,
        'entretien_client'::text,
        'contractualisation'::text,
        'gagne'::text,
        'perdu'::text,
        'abandonne'::text,
        'non_traitee'::text
      ]
    )
  );

COMMIT;
