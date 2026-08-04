-- KREDO Intelligence — analyse stratégique mensuelle de la veille.
-- Étape séparée : PostgreSQL interdit l'utilisation immédiate d'une nouvelle
-- valeur d'enum dans certains objets de schéma au sein de la même transaction.
alter type public.intelligence_document_type
  add value if not exists 'strategic_watch_analysis';
