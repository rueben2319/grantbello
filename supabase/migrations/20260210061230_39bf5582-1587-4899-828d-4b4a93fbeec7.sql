-- Add married_in flag to persons table
ALTER TABLE public.persons ADD COLUMN married_in boolean NOT NULL DEFAULT false;