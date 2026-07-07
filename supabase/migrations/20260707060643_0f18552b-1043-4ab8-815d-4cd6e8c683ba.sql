
-- Enums
CREATE TYPE public.pending_change_action AS ENUM (
  'add_person', 'update_person', 'delete_person',
  'add_relationship', 'delete_relationship'
);
CREATE TYPE public.pending_change_status AS ENUM ('pending', 'approved', 'rejected');

-- sub_trees
CREATE TABLE public.sub_trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  root_person_a_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  root_person_b_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  label text,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_trees_family_id ON public.sub_trees(family_id);
CREATE INDEX idx_sub_trees_admin_user_id ON public.sub_trees(admin_user_id);
CREATE UNIQUE INDEX sub_trees_unique_pair ON public.sub_trees(
  family_id,
  LEAST(root_person_a_id, COALESCE(root_person_b_id, root_person_a_id)),
  GREATEST(root_person_a_id, COALESCE(root_person_b_id, root_person_a_id))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_trees TO authenticated;
GRANT ALL ON public.sub_trees TO service_role;
GRANT SELECT ON public.sub_trees TO anon;

ALTER TABLE public.sub_trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view sub_trees" ON public.sub_trees
  FOR SELECT USING (
    public.is_family_member(auth.uid(), family_id)
    OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_id AND f.is_public = true)
  );
CREATE POLICY "Admins insert sub_trees" ON public.sub_trees
  FOR INSERT TO authenticated
  WITH CHECK (public.is_family_admin(auth.uid(), family_id) AND created_by = auth.uid());
CREATE POLICY "Admins update sub_trees" ON public.sub_trees
  FOR UPDATE TO authenticated
  USING (public.is_family_admin(auth.uid(), family_id))
  WITH CHECK (public.is_family_admin(auth.uid(), family_id));
CREATE POLICY "Admins delete sub_trees" ON public.sub_trees
  FOR DELETE TO authenticated
  USING (public.is_family_admin(auth.uid(), family_id));

CREATE TRIGGER update_sub_trees_updated_at
  BEFORE UPDATE ON public.sub_trees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is this user the sub-tree admin?
CREATE OR REPLACE FUNCTION public.is_sub_tree_admin(_user_id uuid, _sub_tree_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sub_trees WHERE id = _sub_tree_id AND admin_user_id = _user_id);
$$;

-- pending_changes
CREATE TABLE public.pending_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  sub_tree_id uuid REFERENCES public.sub_trees(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action public.pending_change_action NOT NULL,
  target_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.pending_change_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pending_changes_family_id ON public.pending_changes(family_id);
CREATE INDEX idx_pending_changes_status ON public.pending_changes(status);
CREATE INDEX idx_pending_changes_submitted_by ON public.pending_changes(submitted_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_changes TO authenticated;
GRANT ALL ON public.pending_changes TO service_role;

ALTER TABLE public.pending_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all pending" ON public.pending_changes
  FOR SELECT USING (public.is_family_admin(auth.uid(), family_id));
CREATE POLICY "Submitters view own pending" ON public.pending_changes
  FOR SELECT USING (submitted_by = auth.uid());
CREATE POLICY "Sub-admins submit pending" ON public.pending_changes
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND status = 'pending'
    AND (
      public.is_family_admin(auth.uid(), family_id)
      OR (sub_tree_id IS NOT NULL AND public.is_sub_tree_admin(auth.uid(), sub_tree_id))
    )
  );
CREATE POLICY "Admins review pending" ON public.pending_changes
  FOR UPDATE TO authenticated
  USING (public.is_family_admin(auth.uid(), family_id))
  WITH CHECK (public.is_family_admin(auth.uid(), family_id));
CREATE POLICY "Admins delete pending" ON public.pending_changes
  FOR DELETE TO authenticated
  USING (public.is_family_admin(auth.uid(), family_id));

CREATE TRIGGER update_pending_changes_updated_at
  BEFORE UPDATE ON public.pending_changes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apply a pending change (approve). Only family admins may call.
CREATE OR REPLACE FUNCTION public.apply_pending_change(_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pc public.pending_changes;
  p jsonb;
BEGIN
  SELECT * INTO pc FROM public.pending_changes WHERE id = _id FOR UPDATE;
  IF pc.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF pc.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
  IF NOT public.is_family_admin(auth.uid(), pc.family_id) THEN
    RAISE EXCEPTION 'Only family admins can approve';
  END IF;

  p := pc.payload;

  IF pc.action = 'add_person' THEN
    INSERT INTO public.persons (
      family_id, first_name, middle_name, last_name, prefix, suffix,
      gender, birth_date, death_date, bio, photo_url, is_private,
      married_in, birthplace, residence, is_living, twin_group_id
    ) VALUES (
      pc.family_id,
      COALESCE(p->>'first_name',''),
      p->>'middle_name',
      COALESCE(p->>'last_name',''),
      p->>'prefix',
      p->>'suffix',
      COALESCE((p->>'gender')::gender_type, 'other'),
      NULLIF(p->>'birth_date','')::date,
      NULLIF(p->>'death_date','')::date,
      COALESCE(p->>'bio',''),
      p->>'photo_url',
      COALESCE((p->>'is_private')::boolean, false),
      COALESCE((p->>'married_in')::boolean, false),
      p->>'birthplace',
      p->>'residence',
      COALESCE((p->>'is_living')::boolean, true),
      NULLIF(p->>'twin_group_id','')::uuid
    );
  ELSIF pc.action = 'update_person' THEN
    UPDATE public.persons SET
      first_name  = COALESCE(p->>'first_name', first_name),
      middle_name = COALESCE(p->>'middle_name', middle_name),
      last_name   = COALESCE(p->>'last_name', last_name),
      prefix      = COALESCE(p->>'prefix', prefix),
      suffix      = COALESCE(p->>'suffix', suffix),
      gender      = COALESCE((p->>'gender')::gender_type, gender),
      birth_date  = CASE WHEN p ? 'birth_date' THEN NULLIF(p->>'birth_date','')::date ELSE birth_date END,
      death_date  = CASE WHEN p ? 'death_date' THEN NULLIF(p->>'death_date','')::date ELSE death_date END,
      bio         = COALESCE(p->>'bio', bio),
      photo_url   = CASE WHEN p ? 'photo_url' THEN p->>'photo_url' ELSE photo_url END,
      is_private  = COALESCE((p->>'is_private')::boolean, is_private),
      married_in  = COALESCE((p->>'married_in')::boolean, married_in),
      birthplace  = CASE WHEN p ? 'birthplace' THEN p->>'birthplace' ELSE birthplace END,
      residence   = CASE WHEN p ? 'residence' THEN p->>'residence' ELSE residence END,
      is_living   = COALESCE((p->>'is_living')::boolean, is_living),
      twin_group_id = CASE WHEN p ? 'twin_group_id' THEN NULLIF(p->>'twin_group_id','')::uuid ELSE twin_group_id END
    WHERE id = pc.target_id AND family_id = pc.family_id;
  ELSIF pc.action = 'delete_person' THEN
    DELETE FROM public.persons WHERE id = pc.target_id AND family_id = pc.family_id;
  ELSIF pc.action = 'add_relationship' THEN
    INSERT INTO public.relationships (family_id, person_id, related_person_id, relationship_type, status)
    VALUES (
      pc.family_id,
      (p->>'person_id')::uuid,
      (p->>'related_person_id')::uuid,
      (p->>'relationship_type')::relationship_type,
      COALESCE((p->>'status')::spouse_status, 'active')
    );
  ELSIF pc.action = 'delete_relationship' THEN
    DELETE FROM public.relationships WHERE id = pc.target_id AND family_id = pc.family_id;
  END IF;

  UPDATE public.pending_changes
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = _note
    WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_pending_change(_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc public.pending_changes;
BEGIN
  SELECT * INTO pc FROM public.pending_changes WHERE id = _id FOR UPDATE;
  IF pc.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF NOT public.is_family_admin(auth.uid(), pc.family_id) THEN
    RAISE EXCEPTION 'Only family admins can reject';
  END IF;
  UPDATE public.pending_changes
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = _note
    WHERE id = _id;
END;
$$;
