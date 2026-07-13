BEGIN;

-- Correctif advisor sécurité (function_search_path_mutable) : les deux fonctions
-- déterministes ajoutées au Lot 3 (harden_import_account_scan_contacts) n'avaient
-- pas de search_path fixe, contrairement à la convention systématique du reste du
-- codebase (ex: import_account_scan_contacts lui-même, require_authenticated_user,
-- etc.) — un search_path mutable expose à un détournement si un rôle malveillant
-- crée un objet de même nom dans un schéma placé avant public dans le search_path
-- courant de la session. Appliqué en direct via apply_migration au Lot 3 ; ce
-- fichier reconstitue le miroir local manquant après vérification de dérive
-- (`list_migrations` distant vs `supabase/migrations/` local).

CREATE OR REPLACE FUNCTION private.normalize_linkedin_url(p_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(btrim(p_url)), '^https?://(www\.)?', ''),
        '[?#].*$', ''
      ),
      '/+$', ''
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION private.normalize_name_for_match(p_name text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, extensions
AS $$
  SELECT NULLIF(regexp_replace(lower(unaccent(btrim(p_name))), '\s+', ' ', 'g'), '');
$$;

COMMIT;
