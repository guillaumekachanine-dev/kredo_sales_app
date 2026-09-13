-- Migration 1/2 : Ajout du scope 'account' dans l'enum public.corpus_scope_kind
-- Nécessite une migration séparée pour que la nouvelle valeur soit commitée
-- avant son utilisation dans les contraintes et fonctions de la migration 2.

ALTER TYPE public.corpus_scope_kind ADD VALUE IF NOT EXISTS 'account';
