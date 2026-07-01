with ranked_contacts as (
  select
    opportunity_id,
    contact_id,
    row_number() over (
      partition by opportunity_id
      order by
        case role
          when 'manager_operationnel' then 1
          when 'contact_technique' then 2
          when 'decideur' then 3
          when 'sponsor' then 4
          when 'acheteur' then 5
          when 'rh' then 6
          when 'validateur_final' then 7
          else 8
        end,
        contact_id
    ) as contact_rank
  from public.opportunity_contacts
)
delete from public.opportunity_contacts as target
using ranked_contacts
where target.opportunity_id = ranked_contacts.opportunity_id
  and target.contact_id = ranked_contacts.contact_id
  and ranked_contacts.contact_rank > 2;

create or replace function public.enforce_opportunity_contacts_max_two()
returns trigger
language plpgsql
as $$
declare
  linked_contacts_count integer;
begin
  if tg_op = 'UPDATE' then
    select count(*)
      into linked_contacts_count
    from public.opportunity_contacts
    where opportunity_id = new.opportunity_id
      and contact_id <> old.contact_id;
  else
    select count(*)
      into linked_contacts_count
    from public.opportunity_contacts
    where opportunity_id = new.opportunity_id;
  end if;

  if linked_contacts_count >= 2 then
    raise exception 'Deux contacts maximum peuvent être liés à une opportunité.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists opportunity_contacts_max_two_guard
  on public.opportunity_contacts;

create trigger opportunity_contacts_max_two_guard
before insert or update of opportunity_id, contact_id
on public.opportunity_contacts
for each row
execute function public.enforce_opportunity_contacts_max_two();
