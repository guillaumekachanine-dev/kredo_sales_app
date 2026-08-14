-- Cover every foreign key introduced for account-signal playbook promotions.

create index sector_playbook_signals_sector_id_idx
  on public.sector_playbook_signals(sector_id);

create index sector_playbook_signals_promoted_by_idx
  on public.sector_playbook_signals(promoted_by);
