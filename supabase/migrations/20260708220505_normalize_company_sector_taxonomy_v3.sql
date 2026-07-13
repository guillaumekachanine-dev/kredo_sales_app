begin;

create temporary table tmp_company_sector_mapping (
  company_name text primary key,
  sector_name text not null,
  sector_slug text not null
) on commit drop;

insert into tmp_company_sector_mapping (company_name, sector_name, sector_slug) values
  ('ACRI-ST', 'Aéronautique, Spatial & Défense', 'aeronautique-spatial-defense'),
  ('Adecco', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Aéroport Nice Cote d Azur', 'Transport & Mobilité régionale', 'transport-mobilite-regionale'),
  ('Ampère Software Factory', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques'),
  ('Ansys', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques'),
  ('Appolonia', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques'),
  ('Aqualung', 'Industrie manufacturière, électronique & équipements', 'industrie-manufacturiere-electronique-equipements'),
  ('Argeville', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Arkopharma', 'Nutraceutique, Santé Naturelle & Compléments Alimentaires', 'nutraceutique-sante-naturelle'),
  ('Aromatech Group', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Ascoma', 'Banque, Finance & Assurance', 'banque-finance-assurance'),
  ('Audemard', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Autogrill', 'Tourisme, Hôtellerie & Loisirs', 'tourisme-hotellerie-loisirs'),
  ('Banque Populaire Mediterranée', 'Banque, Finance & Assurance', 'banque-finance-assurance'),
  ('Bioceanor', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques'),
  ('Bourbon Offshore', 'Énergie, Pétrochimie & Environnement', 'energie-petrochimie-environnement'),
  ('CASA (Communauté d agglomérations)', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('CCI Cote d Azur', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('CEGEMA', 'Banque, Finance & Assurance', 'banque-finance-assurance'),
  ('Centre LACASSAGNE', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('CHU de Nice', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('Ciffreo Bona', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('CNRS Geoazur', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('CNRS Institut de la mer de Villefranche', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('CNRS Observatoire Cote d Azur', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('CODIX', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques'),
  ('Cogepart', 'Transport & Mobilité régionale', 'transport-mobilite-regionale'),
  ('Depil Tech', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Domusvi', 'EHPAD & Résidences Seniors', 'ehpad-residences-seniors'),
  ('Emera', 'EHPAD & Résidences Seniors', 'ehpad-residences-seniors'),
  ('ESCOTA (VINCI)', 'Transport & Mobilité régionale', 'transport-mobilite-regionale'),
  ('Eurecom', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('Euro Protection Surveillance', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('European Society Of Cardiology', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('Exail Robotics', 'Aéronautique, Spatial & Défense', 'aeronautique-spatial-defense'),
  ('Experis France', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques'),
  ('Expressions Parfumees', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Fragonard', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Geostock', 'Énergie, Pétrochimie & Environnement', 'energie-petrochimie-environnement'),
  ('Giraudi', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Griesser', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Groupe Arthes', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Groupe IDEC', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Groupe Ippolito', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Groupe Transcan', 'Transport & Mobilité régionale', 'transport-mobilite-regionale'),
  ('Groupe Trecobat', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Harvest', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques'),
  ('Horus Pharma', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('Interima', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Iselection', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Jean Niel', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Keller Williams France', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('KEOLIS Alpes-Maritimes', 'Transport & Mobilité régionale', 'transport-mobilite-regionale'),
  ('L Occitane', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Laboratoires INELDEA', 'Nutraceutique, Santé Naturelle & Compléments Alimentaires', 'nutraceutique-sante-naturelle'),
  ('Lbm Bioesterel', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('Les Mutuelles du Soleil', 'Banque, Finance & Assurance', 'banque-finance-assurance'),
  ('Malongo', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Maman Bulle', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Median Technologies', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('Medipath', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('MMV', 'Tourisme, Hôtellerie & Loisirs', 'tourisme-hotellerie-loisirs'),
  ('MP SA (AVATACAR)', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Naphtachimie', 'Énergie, Pétrochimie & Environnement', 'energie-petrochimie-environnement'),
  ('Nice Matin', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Odalys Group', 'Tourisme, Hôtellerie & Loisirs', 'tourisme-hotellerie-loisirs'),
  ('PARFEX', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Payan Bertrand', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Petroineos', 'Énergie, Pétrochimie & Environnement', 'energie-petrochimie-environnement'),
  ('Pilatus Groupe', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Pizzorno Environnement', 'Énergie, Pétrochimie & Environnement', 'energie-petrochimie-environnement'),
  ('Polytech Nice Sophia', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('Ponant', 'Tourisme, Hôtellerie & Loisirs', 'tourisme-hotellerie-loisirs'),
  ('Préfecture 06', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('Rectorat de Nice', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('Régie ligne d azur', 'Transport & Mobilité régionale', 'transport-mobilite-regionale'),
  ('Renaudi', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Retif', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('Richardson', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Robertet', 'Parfumerie, Arômes & Cosmétique', 'parfumerie-aromes'),
  ('Schneider', 'Industrie manufacturière, électronique & équipements', 'industrie-manufacturiere-electronique-equipements'),
  ('Sepalumic', 'BTP, Construction & Immobilier', 'btp-construction-immobilier'),
  ('Seqoia soft', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques'),
  ('Skema Business School', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('Solimut', 'Banque, Finance & Assurance', 'banque-finance-assurance'),
  ('SOS Oxygene', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('STMicroelectronics', 'Industrie manufacturière, électronique & équipements', 'industrie-manufacturiere-electronique-equipements'),
  ('Thalès Alénia Space', 'Aéronautique, Spatial & Défense', 'aeronautique-spatial-defense'),
  ('Torbel Industrie', 'Industrie manufacturière, électronique & équipements', 'industrie-manufacturiere-electronique-equipements'),
  ('Tournaire', 'Industrie manufacturière, électronique & équipements', 'industrie-manufacturiere-electronique-equipements'),
  ('Ubaldi', 'Commerce, Distribution & Services spécialisés', 'commerce-distribution-services-specialises'),
  ('UNAPEI PACA', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('Université Nice Cote d Azur', 'Secteur public, Enseignement supérieur & Recherche', 'secteur-public-enseignement-recherche'),
  ('Univet', 'Santé, MedTech & Médico-social', 'sante-medtech-medico-social'),
  ('Voyage Privé', 'Tourisme, Hôtellerie & Loisirs', 'tourisme-hotellerie-loisirs'),
  ('Vulog', 'Logiciels, SaaS & Services numériques', 'logiciels-saas-services-numeriques');

with workspace as (
  select workspace_id
  from public.companies
  group by workspace_id
  order by count(*) desc
  limit 1
), sectors as (
  select *
  from (values
    ('aeronautique-spatial-defense', 'Aéronautique, Spatial & Défense', 'Acteurs aéronautiques, spatiaux, défense, robotique avancée et observation de la Terre. Vertical pertinent pour les besoins logiciels embarqués, data, systèmes critiques, cybersécurité et ingénierie complexe.', 'watch'),
    ('logiciels-saas-services-numeriques', 'Logiciels, SaaS & Services numériques', 'Éditeurs logiciels, plateformes SaaS, services numériques et sociétés technologiques B2B. Vertical prioritaire pour les sujets cloud, data, IA, cybersécurité, produit et delivery logiciel.', 'watch'),
    ('secteur-public-enseignement-recherche', 'Secteur public, Enseignement supérieur & Recherche', 'Administrations, collectivités, établissements publics, enseignement supérieur et organismes de recherche. Vertical structurant pour les modernisations SI, data platforms, cybersécurité, dématérialisation et pilotage public.', 'watch'),
    ('sante-medtech-medico-social', 'Santé, MedTech & Médico-social', 'Établissements de santé, laboratoires, medtech, santé à domicile, médico-social et réseaux de soins. Vertical porteur pour interopérabilité, data santé, cybersécurité, applications métier et automatisation opérationnelle.', 'watch'),
    ('commerce-distribution-services-specialises', 'Commerce, Distribution & Services spécialisés', 'Réseaux de distribution, services spécialisés, RH, médias, sécurité, retail et services opérationnels. Vertical volontairement transversal mais exploitable pour CRM, e-commerce, automatisation, data et outils métiers.', 'watch'),
    ('tourisme-hotellerie-loisirs', 'Tourisme, Hôtellerie & Loisirs', 'Hébergement touristique, voyage, loisirs, restauration en concession et croisières. Vertical orienté expérience client, réservation, pricing, plateformes digitales, data marketing et outils opérationnels.', 'watch'),
    ('energie-petrochimie-environnement', 'Énergie, Pétrochimie & Environnement', 'Raffinage, pétrochimie, stockage d’énergie, services offshore et environnement. Vertical pertinent pour systèmes industriels, maintenance, supervision, data, conformité et cybersécurité OT/IT.', 'watch'),
    ('industrie-manufacturiere-electronique-equipements', 'Industrie manufacturière, électronique & équipements', 'Industries manufacturières, électronique, équipements techniques, emballages, quincaillerie et biens industriels. Vertical adapté aux enjeux ERP/MES, supply chain, data industrielle, qualité et automatisation.', 'watch')
  ) as s(slug, name, description, status)
)
insert into public.sector_intelligence (
  workspace_id,
  slug,
  name,
  description,
  status,
  practices_fit,
  key_players_paca,
  key_players_national,
  playbook
)
select
  w.workspace_id,
  s.slug,
  s.name,
  s.description,
  s.status,
  '{"data_ai": 0, "cloud_eng": 0, "cyber": 0, "product": 0}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"personas": [], "objections": [], "entry_points": [], "roi_arguments": []}'::jsonb
from workspace w
cross join sectors s
on conflict (workspace_id, slug) do update
set name = excluded.name,
    description = excluded.description,
    status = excluded.status,
    updated_at = now();

do $$
declare
  mapping_count integer;
  company_count integer;
  unresolved_company_count integer;
  unresolved_sector_count integer;
begin
  select count(*) into mapping_count from tmp_company_sector_mapping;
  select count(*) into company_count from public.companies;

  if mapping_count <> company_count then
    raise exception 'Company sector mapping count mismatch: mapping %, companies %', mapping_count, company_count;
  end if;

  select count(*) into unresolved_company_count
  from tmp_company_sector_mapping m
  left join public.companies c on c.name = m.company_name
  where c.id is null;

  if unresolved_company_count <> 0 then
    raise exception 'Some mapped companies do not exist in public.companies: %', unresolved_company_count;
  end if;

  select count(*) into unresolved_sector_count
  from tmp_company_sector_mapping m
  join public.companies c on c.name = m.company_name
  left join public.sector_intelligence si
    on si.workspace_id = c.workspace_id
   and si.slug = m.sector_slug
  where si.id is null;

  if unresolved_sector_count <> 0 then
    raise exception 'Some mapped sectors do not exist in public.sector_intelligence: %', unresolved_sector_count;
  end if;
end $$;

update public.companies c
set sector = m.sector_name,
    sector_id = si.id,
    updated_at = now()
from tmp_company_sector_mapping m
join public.sector_intelligence si
  on si.slug = m.sector_slug
where c.name = m.company_name
  and si.workspace_id = c.workspace_id;

do $$
declare
  unmapped_after_update integer;
  missing_sector_id_after_update integer;
  distinct_sector_count integer;
begin
  select count(*) into unmapped_after_update
  from public.companies c
  left join tmp_company_sector_mapping m on m.company_name = c.name
  where m.company_name is null;

  if unmapped_after_update <> 0 then
    raise exception 'Unmapped companies remain after update: %', unmapped_after_update;
  end if;

  select count(*) into missing_sector_id_after_update
  from public.companies
  where sector is null or btrim(sector) = '' or sector_id is null;

  if missing_sector_id_after_update <> 0 then
    raise exception 'Companies with missing sector or sector_id after update: %', missing_sector_id_after_update;
  end if;

  select count(distinct sector) into distinct_sector_count from public.companies;

  if distinct_sector_count <> 14 then
    raise exception 'Unexpected distinct sector count after update: %', distinct_sector_count;
  end if;
end $$;

commit;;
