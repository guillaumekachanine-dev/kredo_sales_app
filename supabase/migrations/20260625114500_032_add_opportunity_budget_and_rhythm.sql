-- Migration: Add rhythm and budget columns to opportunities table
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS rythme text NULL;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS budget integer NULL;
