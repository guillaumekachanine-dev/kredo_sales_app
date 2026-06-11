-- Migration 009: Add campaign_id to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS campaign_id uuid;
