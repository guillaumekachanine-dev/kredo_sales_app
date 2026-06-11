-- Migration: Add is_priority to contacts table
ALTER TABLE public.contacts ADD COLUMN is_priority BOOLEAN DEFAULT false;
