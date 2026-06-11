-- Migration 008: Add manager_contact_id to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS manager_contact_id uuid;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'contacts_manager_contact_id_fkey'
          AND table_name = 'contacts'
    ) THEN
        ALTER TABLE public.contacts 
          ADD CONSTRAINT contacts_manager_contact_id_fkey 
          FOREIGN KEY (manager_contact_id) 
          REFERENCES public.contacts(id) 
          ON DELETE SET NULL;
    END IF;
END
$$;

-- Migrate existing data from persons.metadata to contacts.manager_contact_id
UPDATE public.contacts c
SET manager_contact_id = (p.metadata->>'manager_contact_id')::uuid
FROM public.persons p
WHERE c.person_id = p.id
  AND p.metadata ? 'manager_contact_id'
  AND (p.metadata->>'manager_contact_id') IS NOT NULL
  AND (p.metadata->>'manager_contact_id') <> '';
