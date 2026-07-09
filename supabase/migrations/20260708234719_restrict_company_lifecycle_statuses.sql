-- Restrict companies.lifecycle_status to the CRM statuses used in the UI.
-- Canonical stored values:
--   prospect · client · ancien_client · partenaire
--
-- Existing legacy values are folded into the new set before recreating the
-- CHECK constraint, so the migration can run on populated workspaces.

alter table public.companies
  drop constraint if exists companies_lifecycle_status_check;

update public.companies
set lifecycle_status = case
  when lifecycle_status in ('client_actif', 'client_dormant') then 'client'
  when lifecycle_status = 'ancien_client' then 'ancien_client'
  when lifecycle_status = 'partenaire' then 'partenaire'
  else 'prospect'
end
where lifecycle_status is distinct from case
  when lifecycle_status in ('client_actif', 'client_dormant') then 'client'
  when lifecycle_status = 'ancien_client' then 'ancien_client'
  when lifecycle_status = 'partenaire' then 'partenaire'
  else 'prospect'
end;

alter table public.companies
  alter column lifecycle_status set default 'prospect';

alter table public.companies
  add constraint companies_lifecycle_status_check
  check (
    lifecycle_status = any (
      array[
        'prospect'::text,
        'client'::text,
        'ancien_client'::text,
        'partenaire'::text
      ]
    )
  );
