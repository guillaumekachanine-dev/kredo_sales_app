-- Migration to optimize contacts query performance by indexing workspace_id and created_at desc
create index if not exists idx_contacts_workspace_created_at_desc
on public.contacts (workspace_id, created_at desc);
