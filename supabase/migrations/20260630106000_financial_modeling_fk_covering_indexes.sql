-- Lot 1 financial modeling FK covering indexes
-- Completes the additive schema with indexes aligned to the new composite
-- foreign keys introduced for workspace-safe references.

begin;

create index if not exists idx_collaborators_job_profile_workspace
  on public.collaborators (job_profile_id, workspace_id)
  where job_profile_id is not null;

create index if not exists idx_candidates_job_profile_workspace
  on public.candidates (job_profile_id, workspace_id)
  where job_profile_id is not null;

create index if not exists idx_financial_assumption_sets_created_by
  on public.financial_assumption_sets (created_by)
  where created_by is not null;

create index if not exists idx_financial_charge_rates_assumption_workspace
  on public.financial_charge_rates (assumption_set_id, workspace_id);

create index if not exists idx_client_pricing_agreements_company_workspace
  on public.client_pricing_agreements (company_id, workspace_id);

create index if not exists idx_client_pricing_agreements_created_by
  on public.client_pricing_agreements (created_by)
  where created_by is not null;

create index if not exists idx_client_pricing_agreement_lines_agreement_workspace
  on public.client_pricing_agreement_lines (agreement_id, workspace_id);

create index if not exists idx_client_pricing_agreement_lines_job_profile_workspace
  on public.client_pricing_agreement_lines (job_profile_id, workspace_id)
  where job_profile_id is not null;

create index if not exists idx_client_pricing_agreement_lines_engagement_workspace
  on public.client_pricing_agreement_lines (engagement_type_id, workspace_id)
  where engagement_type_id is not null;

create index if not exists idx_financial_models_collaborator_workspace
  on public.financial_models (collaborator_id, workspace_id)
  where collaborator_id is not null;

create index if not exists idx_financial_models_candidate_workspace
  on public.financial_models (candidate_id, workspace_id)
  where candidate_id is not null;

create index if not exists idx_financial_models_company_workspace
  on public.financial_models (company_id, workspace_id)
  where company_id is not null;

create index if not exists idx_financial_models_opportunity_workspace
  on public.financial_models (opportunity_id, workspace_id)
  where opportunity_id is not null;

create index if not exists idx_financial_models_pricing_agreement_workspace
  on public.financial_models (pricing_agreement_id, workspace_id)
  where pricing_agreement_id is not null;

create index if not exists idx_financial_models_precedent_mission_workspace
  on public.financial_models (precedent_mission_id, workspace_id)
  where precedent_mission_id is not null;

create index if not exists idx_financial_models_precedent_opportunity_workspace
  on public.financial_models (precedent_opportunity_id, workspace_id)
  where precedent_opportunity_id is not null;

create index if not exists idx_financial_models_job_profile_workspace
  on public.financial_models (job_profile_id, workspace_id)
  where job_profile_id is not null;

create index if not exists idx_financial_models_created_by
  on public.financial_models (created_by)
  where created_by is not null;

create index if not exists idx_financial_models_validated_by
  on public.financial_models (validated_by)
  where validated_by is not null;

create index if not exists idx_financial_model_expenses_model_workspace
  on public.financial_model_expenses (financial_model_id, workspace_id);

commit;
