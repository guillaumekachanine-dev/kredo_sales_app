-- Colonne générée `src_number` sur source_corpus_items, dérivée de external_src_id
-- (format "SRC-0NN"). Permet une jointure directe src_id = src_number entre les src_ids
-- entiers du playbook (sector_intelligence) et le registre de sources déjà en base, sans
-- transformation de chaîne répétée côté front (SourceChip, Lot 1 Business Intelligence).
alter table public.source_corpus_items
  add column src_number integer
  generated always as (
    case
      when external_src_id ~ '^SRC-[0-9]+$'
        then substring(external_src_id from 5)::integer
      else null
    end
  ) stored;

comment on column public.source_corpus_items.src_number is
  'Dérivé de external_src_id ("SRC-0NN" -> NN). Clé de résolution des src_ids entiers stockés dans sector_intelligence.playbook.';

create index if not exists source_corpus_items_corpus_id_src_number_idx
  on public.source_corpus_items (corpus_id, src_number);
