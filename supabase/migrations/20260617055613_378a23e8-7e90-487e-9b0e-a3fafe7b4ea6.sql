CREATE TYPE public.spouse_status AS ENUM ('active', 'divorced', 'widowed');

ALTER TABLE public.relationships
  ADD COLUMN status public.spouse_status NOT NULL DEFAULT 'active';

COMMENT ON COLUMN public.relationships.status IS 'Only meaningful for spouse relationships. Auto-parent-add logic only fires when status = active.';