-- 016_collaborator_compensation.sql
-- Domaine RH / Finance — coût collaborateur confidentiel + définition correcte du TACI.
--
-- Contexte : jusqu'ici aucune donnée salariale n'existait. Le « coût » était
-- mélangé avec le TACI sur missions (cf. migration 017). On introduit ici une
-- table de rémunération DATÉE (effective-dated) pour deux raisons :
--   1. Temporalité — un salaire évolue (augmentations, promos) ; une colonne
--      unique sur collaborators ne saurait pas représenter un historique.
--   2. Confidentialité — collaborators est en RLS workspace permissive (tout le
--      monde lit) ; la rémunération doit être réservée aux owner/admin.
--
-- Sémantique TACI (corrigée) : « Taux d'Activité Congés Inclus » — un TAUX
-- (fraction 0–1), pas un coût. Il pondère les jours ouvrés pour donner les jours
-- réellement facturables, et alimente donc le CJM (Coût Journalier Moyen).
--   CJM = coût annuel chargé / (jours ouvrés × TACI)
-- La marge brute reste = (TJM − CJM) / TJM.

begin;

-- 1. Helper rôle (sur le modèle de current_workspace_id) -----------------------
create or replace function public.is_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and workspace_id = current_workspace_id()
      and role in ('owner', 'admin')
  );
$$;

comment on function public.is_workspace_admin() is
  'TRUE si l''utilisateur courant est owner/admin de son workspace. Sert aux RLS des données confidentielles (rémunération).';

-- 2. Table de rémunération datée ----------------------------------------------
create table public.collaborator_compensation (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null default current_workspace_id() references workspaces(id),
  collaborator_id       uuid not null references collaborators(id) on delete cascade,

  effective_from        date not null,
  effective_to          date,                                   -- NULL = en vigueur

  gross_annual          numeric(12,2) not null,                 -- salaire brut annuel
  charges_rate          numeric(5,4)  not null default 0.45,    -- charges patronales (45 %)
  working_days_per_year integer       not null default 218,     -- jours ouvrés de référence
  taci                  numeric(5,4)  not null default 1.0,     -- Taux d'Activité Congés Inclus (0–1)

  -- CJM (Coût Journalier Moyen) = dérivé GÉNÉRÉ, jamais recalculé au front.
  cjm                   numeric(10,2) generated always as (
                          round(
                            gross_annual * (1 + charges_rate)
                            / nullif(working_days_per_year * taci, 0)
                          , 2)
                        ) stored,

  variable_pay          numeric(12,2) default 0,                -- variable annuel éventuel
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint collaborator_compensation_taci_range
    check (taci > 0 and taci <= 1),
  constraint collaborator_compensation_period
    check (effective_to is null or effective_to >= effective_from)
);

comment on table  public.collaborator_compensation is 'Historique de rémunération collaborateur (confidentiel, RLS owner/admin). Source du CJM.';
comment on column public.collaborator_compensation.taci is 'Taux d''Activité Congés Inclus (fraction 0–1). Pondère les jours ouvrés pour obtenir les jours facturables.';
comment on column public.collaborator_compensation.cjm  is 'Coût Journalier Moyen (généré) = gross_annual × (1+charges_rate) / (working_days_per_year × taci).';

-- Une seule ligne « en vigueur » (effective_to NULL) par collaborateur.
create unique index collaborator_compensation_current_uniq
  on public.collaborator_compensation (collaborator_id)
  where effective_to is null;
create index collaborator_compensation_collab_period_idx
  on public.collaborator_compensation (collaborator_id, effective_from desc);

-- 3. RLS — workspace ET admin/owner uniquement --------------------------------
alter table public.collaborator_compensation enable row level security;

create policy collaborator_compensation_select on public.collaborator_compensation
  for select using (workspace_id = current_workspace_id() and is_workspace_admin());
create policy collaborator_compensation_insert on public.collaborator_compensation
  for insert with check (workspace_id = current_workspace_id() and is_workspace_admin());
create policy collaborator_compensation_update on public.collaborator_compensation
  for update using (workspace_id = current_workspace_id() and is_workspace_admin())
            with check (workspace_id = current_workspace_id() and is_workspace_admin());
create policy collaborator_compensation_delete on public.collaborator_compensation
  for delete using (workspace_id = current_workspace_id() and is_workspace_admin());

-- 4. Triggers : updated_at + audit (donnée sensible → traçabilité) ------------
create trigger set_updated_at
  before update on public.collaborator_compensation
  for each row execute function public.set_updated_at();

create trigger log_audit
  after insert or update or delete on public.collaborator_compensation
  for each row execute function public.log_audit();

-- 5. Seed — rétro-calcul depuis le dataset fictif -----------------------------
-- Les collaborateurs portent dans metadata.test_dataset un coût de référence
-- (taci_reference, en réalité un CJM). On back-solve le salaire brut pour que
-- le CJM généré retombe sur ce coût validé, avec un TACI réaliste par séniorité.
--   gross_annual = cjm_cible × jours_ouvrés × taci / (1 + charges)
insert into public.collaborator_compensation
  (collaborator_id, workspace_id, effective_from, gross_annual,
   charges_rate, working_days_per_year, taci, notes)
select
  c.id,
  c.workspace_id,
  coalesce(c.entry_date, date '2024-01-01'),
  round((c.metadata #>> '{test_dataset,taci_reference}')::numeric * 218 * act.rate / 1.45, 2),
  0.45,
  218,
  act.rate,
  'Seed fictif — rétro-calculé depuis test_dataset (coût de référence) + TACI réaliste par séniorité.'
from collaborators c
cross join lateral (
  select case lower(coalesce(c.seniority, ''))
    when 'junior'   then 0.88
    when 'confirmé' then 0.92
    when 'confirme' then 0.92
    when 'senior'   then 0.95
    when 'expert'   then 0.97
    when 'lead'     then 0.97
    else 0.92
  end as rate
) act
where (c.metadata #>> '{test_dataset,taci_reference}') is not null;

-- 6. Purge du financier confidentiel hors de metadata (RLS permissive) --------
-- On retire le coût (taci_reference) et la marge (margin_pct_reference, qui
-- combinée au TJM révèle le coût). On conserve tjm_reference (taux de vente,
-- non confidentiel) comme simple marqueur de jeu de test.
update collaborators
set metadata = (metadata #- '{test_dataset,taci_reference}')
                          #- '{test_dataset,margin_pct_reference}'
where metadata #> '{test_dataset}' is not null;

commit;
