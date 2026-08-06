-- 20260806160000_add_company_id_to_veille_articles.sql
-- Ajout de la colonne company_id à veille_articles pour lier un article à un compte CRM.

alter table public.veille_articles
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_veille_articles_company_id
  on public.veille_articles (company_id)
  where company_id is not null;
