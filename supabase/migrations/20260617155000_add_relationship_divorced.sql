-- Add is_divorced column to relationships table
ALTER TABLE public.relationships ADD COLUMN is_divorced BOOLEAN NOT NULL DEFAULT false;
