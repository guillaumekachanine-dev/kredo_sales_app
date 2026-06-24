-- 027 : Tasks — lien secondaire polymorphe
-- Permet de relier une tâche à une entité secondaire (en plus de l'entité primaire).
-- Ex : tâche créée depuis un contact (entity_type='contact') mais aussi liée à une opportunité.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS linked_entity_type text,
  ADD COLUMN IF NOT EXISTS linked_entity_id   uuid;

CREATE INDEX IF NOT EXISTS idx_tasks_linked_entity
  ON public.tasks (workspace_id, linked_entity_type, linked_entity_id)
  WHERE linked_entity_id IS NOT NULL;
