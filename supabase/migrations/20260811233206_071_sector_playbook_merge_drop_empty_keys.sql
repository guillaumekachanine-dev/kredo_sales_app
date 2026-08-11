-- 071 — Fusion du playbook : une clé vide DES DEUX CÔTÉS disparaît du résultat.
--
-- Défaut révélé par les assertions du Lot 0
-- (`supabase/tests/069_sector_knowledge_resolution.assertions.sql`, ASSERT 5) :
-- la version 069 retombait sur `p_macro -> k` sans vérifier que la valeur du
-- macro portait elle-même du contenu. Un playbook macro aux 4 tableaux vides
-- produisait donc `{"personas":[],...}` — un objet non vide au sens de
-- `jsonb <> '{}'` et de `isNonEmptyJson()` côté TypeScript, donc un faux
-- positif du drapeau « playbook structuré » le jour où l'un de ces 3 macros
-- passerait `active`.
--
-- Après correction, `playbook <> '{}'::jsonb` signifie « il y a du contenu ».
-- Vérifié en dry-run : 30 segments gardent un playbook résolu non vide (les 8
-- autres sont les enfants des 3 macros sans aucune connaissance) et
-- 0 compte ne perd le drapeau.
--
-- `merge_sector_practices_fit` n'est volontairement PAS aligné : c'est un
-- vecteur de scores de forme fixe (4 practices) où 0 est une valeur légitime
-- (« pas d'adhérence »). En retirer les clés casserait la forme attendue par
-- les consommateurs.
create or replace function private.merge_sector_playbook(p_segment jsonb, p_macro jsonb)
returns jsonb language sql immutable parallel safe set search_path = '' as $$
  select coalesce(jsonb_object_agg(merged.k, merged.v) filter (where merged.v is not null), '{}'::jsonb)
  from (
    select k,
      case
        when private.jsonb_is_filled(coalesce(p_segment, '{}'::jsonb) -> k) then p_segment -> k
        when private.jsonb_is_filled(coalesce(p_macro, '{}'::jsonb) -> k)   then p_macro -> k
        else null
      end as v
    from jsonb_object_keys(coalesce(p_segment, '{}'::jsonb) || coalesce(p_macro, '{}'::jsonb)) as k
  ) merged;
$$;

comment on function private.merge_sector_playbook(jsonb, jsonb) is
  'Fusion clé par clé du playbook segment sur le playbook macro : pour chaque clé, le tableau du segment s''il est non vide, sinon celui du macro s''il est non vide, sinon la clé est omise.';
