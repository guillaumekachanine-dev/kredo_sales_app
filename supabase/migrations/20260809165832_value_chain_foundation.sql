-- Chaînes de valeur sectorielles — migration strictement additive.
-- Décision : docs/chaine-de-valeur/DECISION-MODELE.md (v1.0, 09/08/2026)
-- Rollback : drop table value_chain_links, value_chain_actors, value_chain_nodes cascade;

create table public.value_chain_nodes (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  sector_id             uuid not null references public.sector_intelligence(id) on delete cascade,
  couche                text not null check (couche in ('chaine','prescripteur','financeur','technologie')),
  maillon               smallint check (maillon between 1 and 5),
  rang                  smallint not null default 1 check (rang between 1 and 3),
  label                 text not null,
  description           text,
  capture_valeur        smallint check (capture_valeur between 1 and 3),
  capture_justification text,
  confiance             text not null check (confiance in ('haute','moyenne','faible')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint vcn_maillon_ssi_chaine check ((couche = 'chaine') = (maillon is not null)),
  constraint vcn_capture_si_chaine  check (couche <> 'chaine' or capture_valeur is not null),
  constraint vcn_capture_justifiee  check (capture_valeur is null or capture_justification is not null)
);

comment on table public.value_chain_nodes is
  'Maillons et couches transverses d''une chaîne de valeur sectorielle. Une ligne = un nœud du schéma.';
comment on column public.value_chain_nodes.sector_id is
  'MACRO-secteur (sector_intelligence.level = macro). Désigne le SUJET de la chaîne, jamais l''appartenance de ses acteurs : un acteur positionné ici n''est pas reclassé.';
comment on column public.value_chain_nodes.maillon is
  '1..5 = grammaire générique (amont, transformation, réalisation, distribution, usage). NULL sur les couches transverses, qui traversent tous les maillons.';
comment on column public.value_chain_nodes.rang is
  'Ordre à l''intérieur d''un maillon, quand la filière s''y dédouble (BTP : production puis négoce de matériaux).';
comment on column public.value_chain_nodes.capture_valeur is
  'Zone de captation de valeur : 1 faible, 2 moyenne, 3 forte. Où est la marge, donc le budget SI.';

create unique index vcn_unique_chaine     on public.value_chain_nodes (sector_id, maillon, rang) where couche = 'chaine';
create unique index vcn_unique_transverse on public.value_chain_nodes (sector_id, couche, label) where couche <> 'chaine';
create index vcn_sector_idx    on public.value_chain_nodes (sector_id, couche, maillon, rang);
create index vcn_workspace_idx on public.value_chain_nodes (workspace_id);

create table public.value_chain_actors (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  node_id      uuid not null references public.value_chain_nodes(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete cascade,
  nom          text not null,
  role         text,
  poids        text,
  source       text,
  confiance    text check (confiance in ('haute','moyenne','faible')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint vca_source_obligatoire_hors_kredo check (company_id is not null or source is not null)
);

comment on table public.value_chain_actors is
  'Acteurs positionnés sur un nœud. Positionner n''est pas classer : cette table n''écrit jamais dans companies.';
comment on column public.value_chain_actors.company_id is
  'NULL = concurrent identifié dans une étude, sans fiche compte. C''est la lacune que cette table comble.';
comment on column public.value_chain_actors.nom is
  'Toujours renseigné, même quand company_id existe : le générateur rend le schéma sans jointure.';
comment on column public.value_chain_actors.source is
  'Obligatoire dès que company_id est NULL (contrainte vca_source_obligatoire_hors_kredo).';

create unique index vca_unique        on public.value_chain_actors (node_id, nom);
create index        vca_node_idx      on public.value_chain_actors (node_id);
create index        vca_company_idx   on public.value_chain_actors (company_id);
create index        vca_workspace_idx on public.value_chain_actors (workspace_id);

create table public.value_chain_links (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  node_amont   uuid not null references public.value_chain_nodes(id) on delete cascade,
  node_aval    uuid not null references public.value_chain_nodes(id) on delete cascade,
  nature       text not null check (nature in ('fournit','prescrit','finance','outille')),
  intensite    smallint not null check (intensite between 1 and 3),
  libelle      text,
  created_at   timestamptz not null default now(),
  constraint vcl_pas_de_boucle check (node_amont <> node_aval)
);

comment on table public.value_chain_links is
  'Dépendances entre nœuds. intensite = épaisseur du trait sur le schéma.';

create unique index vcl_unique        on public.value_chain_links (node_amont, node_aval, nature);
create index        vcl_amont_idx     on public.value_chain_links (node_amont);
create index        vcl_aval_idx      on public.value_chain_links (node_aval);
create index        vcl_workspace_idx on public.value_chain_links (workspace_id);

create trigger trg_value_chain_nodes_updated_at  before update on public.value_chain_nodes
  for each row execute function private.set_updated_at();
create trigger trg_value_chain_actors_updated_at before update on public.value_chain_actors
  for each row execute function private.set_updated_at();

alter table public.value_chain_nodes  enable row level security;
alter table public.value_chain_actors enable row level security;
alter table public.value_chain_links  enable row level security;

create policy workspace_isolation on public.value_chain_nodes  for all
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));
create policy workspace_isolation on public.value_chain_actors for all
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));
create policy workspace_isolation on public.value_chain_links  for all
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));

grant select, insert, update, delete
  on public.value_chain_nodes, public.value_chain_actors, public.value_chain_links
  to anon, authenticated, service_role;
