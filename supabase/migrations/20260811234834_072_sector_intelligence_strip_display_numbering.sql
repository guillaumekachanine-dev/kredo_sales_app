-- 072 — Sortir la numérotation « 5.1 » / « 12.1 » du nom des segments.
--
-- Demande de Guillaume (2026-08-12) : cette nomenclature pollue l'affichage.
--
-- Pourquoi la migration est le bon geste, et pas un strip côté UI :
--
-- 1. RIEN NE S'APPUIE SUR LE NOM. Toute la chaîne de classification passe par le
--    `slug` : `apply_account_classification()` fait `si.slug = v_segment_slug`,
--    et le workflow n8n INTEL-010 valide le choix du LLM contre une liste fermée
--    de slugs. Le `name` n'y est qu'un libellé humain — le débarrasser de son
--    préfixe réduit même le bruit envoyé au modèle.
-- 2. LA NUMÉROTATION EST DÉJÀ INCOHÉRENTE. 37 segments sur 38 la portent ; la
--    fiche « Nutraceutique, Santé Naturelle & Compléments Alimentaires » ne l'a
--    jamais eue. Et les macros, eux, ne sont pas numérotés : le « 5 » de « 5.1 »
--    désigne un rang de macro qui n'existe nulle part en base.
-- 3. ELLE NUISAIT AU TRI. Le tri se fait sur du texte : « 10.1 » passait avant
--    « 2.1 ». Aucune requête n'ordonne `sector_intelligence` par `name` de toute
--    façon (le tri applicatif se fait sur `attractiveness_score`), donc il n'y a
--    aucun ordre à préserver — et l'ordre alphabétique devient enfin correct.
-- 4. AUCUNE COPIE DÉNORMALISÉE À REPRENDRE. `companies.segment` (texte libre
--    hérité) ne contient aucune valeur numérotée : vérifié, 0 ligne sur 48
--    valeurs distinctes.
--
-- `display_code` conserve le préfixe verbatim : l'opération reste sans perte et
-- réversible, et les références « Segment 12.1 » du REFERENTIEL-CLASSIFICATION
-- restent résolvables en base. Colonne purement documentaire — aucun code ne la
-- lit, et rien ne doit la réinjecter dans un libellé.

alter table public.sector_intelligence
  add column if not exists display_code text;

comment on column public.sector_intelligence.display_code is
  'Code hiérarchique historique du référentiel de taxonomie (ex. « 5.1 »), extrait de `name` par la migration 072. Documentaire uniquement : la clé fonctionnelle est `slug`, la hiérarchie est portée par `parent_id`. Ne jamais le réafficher devant le nom.';

-- `updated_at` ne doit PAS bouger : il alimente l'indicateur de fraîcheur de
-- /prospection/approche-sectorielle (`sector-activation-data.ts`, lastUpdatedAt).
-- Un renommage cosmétique ferait croire que la connaissance sectorielle a été
-- rafraîchie ce jour-là.
alter table public.sector_intelligence disable trigger trg_sector_intelligence_updated_at;

update public.sector_intelligence
   set display_code = substring(name from '^(\d+\.\d+)\s'),
       name         = regexp_replace(name, '^\d+\.\d+\s+', '')
 where name ~ '^\d+\.\d+\s';

alter table public.sector_intelligence enable trigger trg_sector_intelligence_updated_at;
