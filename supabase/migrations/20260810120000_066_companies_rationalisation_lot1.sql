-- =============================================================================
-- 066 — Rationalisation `companies` — Lot 1 : contrat taxonomique
-- =============================================================================
-- Autorité : docs/FEATURES/sector_intelligence/taxonomie-sectorielle/
--            REFERENTIEL-CLASSIFICATION.md v1.0 (09/08/2026) — fait foi.
-- Cette migration APPLIQUE le référentiel, elle ne le réinterprète pas.
--
-- Correspondance avec le référentiel :
--   §5.1  « Le macro se déduit du segment (segment.parent_id). On ne choisit
--           JAMAIS un macro directement »              → trigger de dérivation (B)
--   §3    « sector_id / segment_id : obligatoire »      → NOT NULL (D)
--   §10   contrôle 2 + exception datée des 13 comptes   → réconciliation (C)
--   §5.7  vertical_client, valeurs usuelles             → CHECK (E)
--   §5.8  relation_type détermine la motion             → source de vérité (F)
--   §12.3 « Ne jamais modifier ni supprimer
--           companies.sector »                          → INTOUCHÉ, aucun trigger
--
-- Hors périmètre, par dépendance de code (voir plan, lots 2 à 5) :
--   legacy_folio_score (17 fichiers src/ + 5 objets SQL), siren (9 fichiers +
--   2 fonctions), segment texte, health, metadata. Aucun n'est touché ici.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- A. Garde-fous
-- -----------------------------------------------------------------------------
do $$
declare v_bad int; v_orphan int;
begin
  select count(*) into v_bad
  from public.sector_intelligence seg
  left join public.sector_intelligence par on par.id = seg.parent_id
  where seg.level = 'segment' and (par.id is null or par.level <> 'macro');
  if v_bad > 0 then
    raise exception 'Taxonomie incohérente : % segment(s) sans parent macro (§4 du référentiel).', v_bad;
  end if;

  select count(*) into v_orphan from public.companies where segment_id is null;
  if v_orphan > 0 then
    raise exception '% compte(s) sans segment_id. Le §3 le rend obligatoire : les classer (au pire en seg-a-qualifier) avant 066.', v_orphan;
  end if;
end $$;


-- =============================================================================
-- B. LE CONTRAT — segment_id est la saisie, sector_id en est dérivé
-- =============================================================================
-- Référentiel §5.1, littéralement : « On ne choisit jamais un macro
-- directement : on choisit un segment, le macro suit. » Le trigger transforme
-- cette règle de procédure en invariant de base. C'est aussi ce qui rend sûre
-- l'édition depuis le front : le formulaire n'expose qu'UNE liste (les 38
-- segments), et sector_id se met à jour tout seul.
--
-- ⚠️ `companies.sector` (texte) n'est PAS touché — interdit absolu §12.3.
--    Il reste le témoin historique, figé. Sa dérive de libellé (« BTP,
--    Construction & Immobilier ») est donc CONSERVÉE, volontairement.

create or replace function private.companies_derive_sector_id()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_level  text;
  v_parent uuid;
begin
  select si.level, si.parent_id into v_level, v_parent
    from public.sector_intelligence si
   where si.id = new.segment_id;

  if v_level is null then
    raise exception using errcode = 'P0001', message = 'invalid_value',
      detail = 'segment_id must reference an existing sector_intelligence row.';
  end if;

  -- Un segment est rattaché à son macro ; un macro utilisé comme segment_id
  -- (classement au grain macro, toléré) est son propre secteur.
  new.sector_id := case when v_level = 'macro' then new.segment_id else v_parent end;
  return new;
end;
$function$;

comment on function private.companies_derive_sector_id() is
  'REFERENTIEL-CLASSIFICATION §5.1 : sector_id est dérivé de segment_id.parent_id, jamais saisi. Rend impossible la dérive des 13 comptes constatée le 2026-08-10.';

drop trigger if exists trg_companies_derive_sector_id on public.companies;
create trigger trg_companies_derive_sector_id
  before insert or update of segment_id, sector_id
  on public.companies
  for each row
  execute function private.companies_derive_sector_id();


-- =============================================================================
-- C. RÉCONCILIATION — lève l'exception datée du §10
-- =============================================================================
-- Le §10 du référentiel autorise 13 comptes en écart, « jusqu'à l'arbitrage des
-- 11 déplacements » listés dans journal-migration.md. Cette migration EST cet
-- arbitrage : segment_id gagne, parce qu'il a été classé compte par compte le
-- 09/08 alors que sector_id est le legacy non revu.
--
-- 11 déplacements réels + 2 artefacts Nutraceutique. Effet sur les fiches
-- « Approche sectorielle » (nombre de comptes affichés) :
--   Services aux entreprises & aux personnes ....  0 → 8   ← fiche vide aujourd'hui
--   Commerce, Distribution & Services spéc. .... 12 → 6    ← à réécrire (journal §73)
--   BTP, Construction & Négoce de matériaux .... 11 → 12   ← + Torbel Industrie
--   Secteur public, Ens. supérieur & Recherche . 11 → 10   ← − CCI Côte d'Azur
--   Transport & Mobilité régionale .............  6 → 7    ← + Autogrill
--   Industrie Manufacturière ...................  5 → 4    ← − Torbel Industrie
--   Tourisme, Hôtellerie & Loisirs .............  5 → 4    ← − Autogrill
--   EHPAD & Résidences Seniors .................  2 → 3    ← + UNAPEI PACA
--   Nutraceutique (segment) ....................  2 → 0    ← artefact, → Santé
-- Total inchangé : 96.

update public.companies set segment_id = segment_id;

do $$
declare v_mismatch int; v_non_macro int;
begin
  select count(*) into v_mismatch
    from public.companies c
    join public.sector_intelligence seg on seg.id = c.segment_id
   where c.sector_id is distinct from coalesce(seg.parent_id, seg.id);
  select count(*) into v_non_macro
    from public.companies c join public.sector_intelligence si on si.id = c.sector_id
   where si.level <> 'macro';
  if v_mismatch > 0 or v_non_macro > 0 then
    raise exception 'Réconciliation incomplète : % écart(s), % sector_id non-macro.', v_mismatch, v_non_macro;
  end if;
end $$;


-- =============================================================================
-- D. sector_id / segment_id deviennent obligatoires (§3)
-- =============================================================================
alter table public.companies alter column segment_id set not null;
alter table public.companies alter column sector_id  set not null;

-- Le FK segment_id avait été créé sans clause ON DELETE (NO ACTION implicite),
-- là où sector_id est en ON DELETE SET NULL — incompatible avec un NOT NULL.
-- On rend les deux explicites et cohérents : supprimer une fiche à laquelle des
-- comptes sont rattachés doit être bloqué, pas déclasser 96 comptes en silence.
alter table public.companies drop constraint companies_segment_id_fkey;
alter table public.companies add constraint companies_segment_id_fkey
  foreign key (segment_id) references public.sector_intelligence(id) on delete restrict;
alter table public.companies drop constraint companies_sector_id_fkey;
alter table public.companies add constraint companies_sector_id_fkey
  foreign key (sector_id) references public.sector_intelligence(id) on delete restrict;


-- =============================================================================
-- E. vertical_client — domaine contrôlé (§5.7)
-- =============================================================================
-- Seul axe de classification resté sans contrainte de domaine (text[] libre).
-- Liste = les 13 valeurs usuelles du §5.7 + 3 ajouts nécessités par la passe de
-- remplissage du 2026-08-10 (13 → 27 comptes) : `agroalimentaire` (aromaticiens
-- grassois), `retail` (fournisseurs du commerce), `energie` (Schneider).
-- Ces 3 ajouts font passer le référentiel en v1.1 — à consigner au §13.
alter table public.companies
  add constraint companies_vertical_client_check
  check (
    vertical_client is null
    or (cardinality(vertical_client) > 0
        and vertical_client <@ array[
          'finance','sante','hospitality','mobilite','immobilier','industrie',
          'environnement','automobile','parfumerie','pharma','secteur_public',
          'sport','defense',
          'agroalimentaire','retail','energie'
        ]::text[])
  );


-- =============================================================================
-- F. relation_type devient la source de vérité du statut relationnel (§5.8)
-- =============================================================================
-- Arbitrage inverse de ma première proposition, et c'est le référentiel qui
-- tranche : §5.8 fait de `relation_type` le paramètre normatif (il détermine la
-- motion commerciale), et §6.8 en fait le DÉRIVÉ de lifecycle_status à la
-- classification. La base confirme que relation_type est le plus propre :
--   relation_type    : 96/96, 4 valeurs, alignées sur le référentiel
--   lifecycle_status : CHECK à 4 valeurs en base, mais le front manipule
--                      `cible` (10 occurrences), `client_actif` (30) et
--                      `client_dormant` (8) — qui violeraient le CHECK à
--                      l'écriture. Le vocabulaire applicatif et le vocabulaire
--                      de la base ont divergé sans que personne le voie.
--
-- On ne supprime pas lifecycle_status (10 objets SQL le lisent, dont
-- v_crm_account_list et get_weekly_business_facts) : on en fait une PROJECTION
-- de relation_type. Une seule saisie, deux colonnes, plus de dual-write.

alter table public.companies drop constraint companies_lifecycle_status_check;
alter table public.companies
  add constraint companies_lifecycle_status_check
  check (lifecycle_status = any (array['prospect','client','ancien_client','pair_partenaire']));

create or replace function private.companies_project_lifecycle_status()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if new.relation_type is not null then
    new.lifecycle_status := new.relation_type;
  end if;
  return new;
end;
$function$;

comment on function private.companies_project_lifecycle_status() is
  'REFERENTIEL-CLASSIFICATION §5.8 : relation_type est la saisie ; lifecycle_status en est la projection, conservée pour les 10 objets SQL qui la lisent.';

drop trigger if exists trg_companies_project_lifecycle_status on public.companies;
create trigger trg_companies_project_lifecycle_status
  before insert or update of relation_type, lifecycle_status
  on public.companies
  for each row
  execute function private.companies_project_lifecycle_status();

-- Alignement : Experis France passe de `ancien_client` à `pair_partenaire`,
-- conformément au §8 (jurisprudence ESN) et à sa classification du 09/08.
update public.companies set relation_type = relation_type;

alter table public.companies alter column relation_type set not null;


-- =============================================================================
-- G. Index mort + documentation des colonnes
-- =============================================================================
-- GIN de 96 Ko, idx_scan = 0, sur des tags dont 93/96 valent
-- 'import:prospects_csv'. La colonne `tags` est conservée : elle porte les
-- seules localisations fines (Nice, Sophia, Grasse, Carros) non stockées ailleurs.
drop index if exists public.idx_companies_tags;

comment on column public.companies.sector is
  'TÉMOIN HISTORIQUE — INTERDIT EN ÉCRITURE (REFERENTIEL §12.3). Texte libre figé. Ne jamais modifier ni supprimer. Lire sector_id.';
comment on column public.companies.sector_id is
  'Macro-secteur. DÉRIVÉ de segment_id (§5.1) par trg_companies_derive_sector_id — ne pas écrire directement.';
comment on column public.companies.segment_id is
  'Segment. UNIQUE point de saisie de la taxonomie (§5.2). C''est ce champ que le front doit exposer en liste déroulante.';
comment on column public.companies.relation_type is
  'Statut relationnel, source de vérité (§5.8). lifecycle_status en est la projection.';
comment on column public.companies.lifecycle_status is
  'PROJECTION de relation_type — ne pas écrire directement. Conservée pour les 10 objets SQL qui la lisent.';
comment on column public.companies.moment is
  'Cause n°3, « pourquoi maintenant » (§5.5). 1/96 renseigné : défaut de recherche, pas de modèle. Chantier n°1 du référentiel §13.';
comment on column public.companies.vertical_client is
  'Canal d''héritage de corpus (§5.7) : la filière SERVIE par un fournisseur, jamais son propre secteur. 27/96 au 2026-08-10.';
comment on column public.companies.legacy_folio_score is
  'DÉPRÉCIÉ — suppression décidée. Bloqué par 17 fichiers src/ et 5 objets SQL (lot 3).';
comment on column public.companies.siren is
  'DÉPRÉCIÉ — suppression décidée. Bloqué par 9 fichiers src/ (scan de compte n8n) et 2 fonctions (lot 4). Retire aussi la seule contrainte anti-doublon.';
comment on column public.companies.segment is
  'DÉPRÉCIÉ (lot 5) — texte libre historique, remplacé par segment_id. 9 objets SQL le lisent encore.';
comment on column public.companies.metadata is
  'DÉPRÉCIATION PROGRESSIVE — blob legacy FOLIO, 14 Ko/compte, TOASTé. Préférer les colonnes générées meta_*. Contient une 3e copie du segment.';

commit;

-- =============================================================================
-- POST-MIGRATION — hors transaction
-- =============================================================================
-- 1. analyze public.companies;
-- 2. npm run db:types
-- 3. src/lib/supabase/sector.ts:73 — 'companies' → 'companies!companies_sector_id_fkey'
--    (embed PostgREST ambigu depuis le FK segment_id : PGRST201, page vide)
-- 4. CLAUDE.md : lifecycle_status = 4 valeurs (projection de relation_type).
-- 5. REFERENTIEL-CLASSIFICATION.md → v1.1 : §5.7 + 3 verticaux, §10 exception
--    datée levée, §13 vertical_client 27/96.
-- =============================================================================
