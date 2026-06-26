-- Ajoute la valeur 'ko_manager' au CHECK constraint de candidates.status
-- Représente un candidat refusé après entretien manager (distinct de 'refuse' global)

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_status_check;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_status_check CHECK (
    status IN (
      'nouveau',
      'qualifie',
      'vivier',
      'propose',
      'en_process',
      'recrute',
      'refuse',
      'indisponible',
      'archive',
      'ko_manager'
    )
  );
