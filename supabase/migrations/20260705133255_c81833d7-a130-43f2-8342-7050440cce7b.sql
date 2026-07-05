ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS prefix text,
  ADD COLUMN IF NOT EXISTS suffix text,
  ADD COLUMN IF NOT EXISTS birthplace text,
  ADD COLUMN IF NOT EXISTS residence text,
  ADD COLUMN IF NOT EXISTS is_living boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS twin_group_id uuid;

UPDATE public.persons SET is_living = false WHERE death_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS persons_twin_group_id_idx ON public.persons(twin_group_id);