-- ADR-0012 Lot 3 — Backfill sector_id (D-8).
--
-- Décision de méthode (documentée, pas mécanique) : sur les 81 comptes porteurs
-- d'un metadata.sector_analysis FOLIO, la quasi-totalité décrit un marché
-- UNIQUE À L'ENTREPRISE (granularité 1 compte = 1 "secteur"), pas une taxonomie
-- partagée — cf. audit live 2026-07-07. Rattacher chaque compte à une fiche
-- sector_intelligence forcerait des regroupements artificiels sans valeur
-- mutualisée. Seuls les clusters de 2+ comptes décrivant EXPLICITEMENT le même
-- marché nommé (vérifié texte à l'appui, pas par le libellé grossier
-- companies.sector) sont rattachés ici. Le reste du parc (~68/95 comptes)
-- reste sector_id NULL — honnête, pas un manque à corriger de force.
--
-- Nouvelles fiches : descriptions factuelles tirées des synthèses FOLIO
-- existantes (pas de score/market_size inventé).
--
-- Résultat vérifié en base : 27/95 comptes avec sector_id (contre 14 avant),
-- 6 fiches sector_intelligence (3 nouvelles + 3 existantes, dont Parfumerie
-- étendue de 7 à 9 comptes).
--
-- Version réellement appliquée : 20260707193641 (Supabase utilise le timestamp
-- comme clé, pas le nom).

do $$
declare
  v_workspace_id uuid := '98dcd39d-f87b-4f9d-add9-ce76d635953a';
begin

-- ─── Cluster 1 : Parfumerie/Arômes — extension de la fiche existante ────────
update public.companies
set sector_id = (select id from public.sector_intelligence where slug = 'parfumerie-aromes')
where name in ('Argeville', 'Aromatech Group') and workspace_id = v_workspace_id;

-- ─── Cluster 2 : Transport & Mobilité régionale (PACA) ──────────────────────
insert into public.sector_intelligence (workspace_id, name, slug, description, status)
values (
  v_workspace_id,
  'Transport & Mobilité régionale',
  'transport-mobilite-regionale',
  'Transport de marchandises (last-mile, logistique) et transport public de voyageurs (urbain, interurbain, concessions autoroutières) en région PACA. Dynamiques convergentes observées sur les comptes du portefeuille : électrification des flottes, transition énergétique, numérisation, et croissance structurelle du e-commerce pour le dernier kilomètre. Description agrégée depuis les analyses FOLIO des comptes rattachés — pas encore une étude sectorielle dédiée.',
  'watch'
);

update public.companies
set sector_id = (select id from public.sector_intelligence where slug = 'transport-mobilite-regionale')
where name in ('Cogepart', 'ESCOTA (VINCI)', 'Groupe Transcan', 'KEOLIS Alpes-Maritimes', 'Régie ligne d azur')
  and workspace_id = v_workspace_id;

-- ─── Cluster 3 : BTP, Construction & Immobilier ─────────────────────────────
insert into public.sector_intelligence (workspace_id, name, slug, description, status)
values (
  v_workspace_id,
  'BTP, Construction & Immobilier',
  'btp-construction-immobilier',
  'Promotion immobilière, construction résidentielle, matériaux de construction et travaux publics. Marché français en reprise 2025-2026 après trois années de contraction (hausse des taux), avec stabilisation autour de 3,1% et hausse des transactions (+8,2% en 2025 selon les analyses FOLIO des comptes rattachés). Ancrage régional PACA fort pour plusieurs comptes. Description agrégée depuis les analyses FOLIO — pas encore une étude sectorielle dédiée.',
  'watch'
);

update public.companies
set sector_id = (select id from public.sector_intelligence where slug = 'btp-construction-immobilier')
where name in ('Groupe IDEC', 'Groupe Trecobat', 'Audemard', 'Renaudi')
  and workspace_id = v_workspace_id;

-- ─── Cluster 4 : EHPAD & Résidences Seniors ─────────────────────────────────
insert into public.sector_intelligence (workspace_id, name, slug, description, status)
values (
  v_workspace_id,
  'EHPAD & Résidences Seniors',
  'ehpad-residences-seniors',
  'Établissements d''hébergement pour personnes âgées dépendantes et résidences seniors, secteur privé commercial. Marché sous tension structurelle : demande démographique croissante (vieillissement, doublement des 85 ans et plus d''ici 2050) contre crise de confiance post-scandale Orpéa (2022), pénurie de personnel soignant et durcissement réglementaire — dynamiques citées explicitement dans les deux analyses FOLIO des comptes rattachés. Description agrégée depuis FOLIO — pas encore une étude sectorielle dédiée.',
  'watch'
);

update public.companies
set sector_id = (select id from public.sector_intelligence where slug = 'ehpad-residences-seniors')
where name in ('Domusvi', 'Emera') and workspace_id = v_workspace_id;

end $$;
