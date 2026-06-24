-- Migration 030: Add missing FK/lookup indexes identified by full-stack audit
-- Covers junction tables and frequently-filtered FK columns that lacked indexes.

-- opportunity_candidates: only candidate_id was indexed, not opportunity_id
CREATE INDEX IF NOT EXISTS idx_oppcand_opportunity
  ON public.opportunity_candidates USING btree (opportunity_id);

-- opportunity_skills: only skill_id was indexed, not opportunity_id
CREATE INDEX IF NOT EXISTS idx_oppskills_opportunity
  ON public.opportunity_skills USING btree (opportunity_id);

-- opportunity_contacts: no indexes at all on this junction table
CREATE INDEX IF NOT EXISTS idx_oppcontacts_opportunity
  ON public.opportunity_contacts USING btree (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_oppcontacts_contact
  ON public.opportunity_contacts USING btree (contact_id);

-- person_skills: only skill_id was indexed, not person_id
CREATE INDEX IF NOT EXISTS idx_person_skills_person
  ON public.person_skills USING btree (person_id);

-- interactions.contact_id: used by getContactIdentity, no index
CREATE INDEX IF NOT EXISTS idx_interactions_contact
  ON public.interactions USING btree (contact_id, occurred_at DESC);

-- tasks: entity_type + entity_id used for polymorphic lookups
CREATE INDEX IF NOT EXISTS idx_tasks_entity
  ON public.tasks USING btree (entity_type, entity_id);
