-- Enrichissement de la table sales_opportunities avec les champs métier V1
alter table sales_opportunities add column if not exists practice text null;
alter table sales_opportunities add column if not exists opportunity_type text null;
alter table sales_opportunities add column if not exists source text null;
alter table sales_opportunities add column if not exists location text null;
alter table sales_opportunities add column if not exists remote_policy text null;
alter table sales_opportunities add column if not exists seniority text null;
alter table sales_opportunities add column if not exists next_action_label text null;
alter table sales_opportunities add column if not exists next_action_at timestamptz null;
alter table sales_opportunities add column if not exists win_reason text null;
alter table sales_opportunities add column if not exists loss_reason text null;

-- Ajout des index pour optimiser les requêtes fréquentes
create index if not exists idx_sales_opportunities_practice on sales_opportunities(practice);
create index if not exists idx_sales_opportunities_opportunity_type on sales_opportunities(opportunity_type);
create index if not exists idx_sales_opportunities_next_action_at on sales_opportunities(next_action_at);
