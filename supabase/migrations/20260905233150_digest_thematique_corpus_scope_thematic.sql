-- ADR-0022 §3.6 — troisieme portee de corpus : `thematic`.
--
-- Migration ISOLEE et volontairement vide de tout autre changement : PostgreSQL
-- interdit d'UTILISER une valeur d'enum ajoutee par ALTER TYPE ... ADD VALUE dans
-- la meme transaction que son ajout. La RPC d'ingestion qui compare a 'thematic'
-- arrive donc dans une migration ulterieure, apres commit de celle-ci.
--
--   system    : le socle editorial KREDO
--   sector    : un corpus Master Study E3, rattache a un segment
--   thematic  : un corpus de sujet, sans segment (Folio AI Tech, Folio AI Business)

alter type public.corpus_scope_kind add value if not exists 'thematic';
