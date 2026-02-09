
-- Fix families SELECT policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Anyone can view public families" ON public.families;
DROP POLICY IF EXISTS "Members can view their families" ON public.families;

CREATE POLICY "Anyone can view public families"
  ON public.families FOR SELECT
  USING (is_public = true);

CREATE POLICY "Members can view their families"
  ON public.families FOR SELECT
  USING (is_family_member(auth.uid(), id));

-- Fix persons SELECT policies
DROP POLICY IF EXISTS "Public can view non-private persons in public families" ON public.persons;
DROP POLICY IF EXISTS "Members can view all persons in their families" ON public.persons;

CREATE POLICY "Public can view non-private persons in public families"
  ON public.persons FOR SELECT
  USING ((is_private = false) AND EXISTS (
    SELECT 1 FROM families WHERE families.id = persons.family_id AND families.is_public = true
  ));

CREATE POLICY "Members can view all persons in their families"
  ON public.persons FOR SELECT
  USING (is_family_member(auth.uid(), family_id));

-- Fix relationships SELECT policies
DROP POLICY IF EXISTS "Public can view relationships in public families" ON public.relationships;
DROP POLICY IF EXISTS "Members can view relationships in their families" ON public.relationships;

CREATE POLICY "Public can view relationships in public families"
  ON public.relationships FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM families WHERE families.id = relationships.family_id AND families.is_public = true
  ));

CREATE POLICY "Members can view relationships in their families"
  ON public.relationships FOR SELECT
  USING (is_family_member(auth.uid(), family_id));

-- Fix profiles SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of family members" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view profiles of family members"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_roles fr1
    JOIN family_roles fr2 ON fr1.family_id = fr2.family_id
    WHERE fr1.user_id = auth.uid() AND fr2.user_id = profiles.user_id
  ));

-- Fix remaining restrictive policies to permissive where needed
DROP POLICY IF EXISTS "Admins can delete their family" ON public.families;
DROP POLICY IF EXISTS "Admins can update their family" ON public.families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;

CREATE POLICY "Admins can delete their family"
  ON public.families FOR DELETE
  USING (is_family_admin(auth.uid(), id));

CREATE POLICY "Admins can update their family"
  ON public.families FOR UPDATE
  USING (is_family_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Fix family_roles policies
DROP POLICY IF EXISTS "Members can view roles in their family" ON public.family_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.family_roles;
DROP POLICY IF EXISTS "Admins can update roles (not to admin)" ON public.family_roles;
DROP POLICY IF EXISTS "Admins can delete roles (not self)" ON public.family_roles;

CREATE POLICY "Members can view roles in their family"
  ON public.family_roles FOR SELECT
  USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Admins can insert roles"
  ON public.family_roles FOR INSERT
  WITH CHECK (is_family_admin(auth.uid(), family_id) AND user_id <> auth.uid() AND invited_by = auth.uid());

CREATE POLICY "Admins can update roles (not to admin)"
  ON public.family_roles FOR UPDATE
  USING (is_family_admin(auth.uid(), family_id) AND user_id <> auth.uid());

CREATE POLICY "Admins can delete roles (not self)"
  ON public.family_roles FOR DELETE
  USING (is_family_admin(auth.uid(), family_id) AND user_id <> auth.uid());

-- Fix persons write policies
DROP POLICY IF EXISTS "Editors can insert persons" ON public.persons;
DROP POLICY IF EXISTS "Editors can update persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can delete persons" ON public.persons;

CREATE POLICY "Editors can insert persons"
  ON public.persons FOR INSERT
  WITH CHECK (is_family_editor_or_admin(auth.uid(), family_id));

CREATE POLICY "Editors can update persons"
  ON public.persons FOR UPDATE
  USING (is_family_editor_or_admin(auth.uid(), family_id));

CREATE POLICY "Admins can delete persons"
  ON public.persons FOR DELETE
  USING (is_family_admin(auth.uid(), family_id));

-- Fix relationships write policies
DROP POLICY IF EXISTS "Editors can insert relationships" ON public.relationships;
DROP POLICY IF EXISTS "Editors can update relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can delete relationships" ON public.relationships;

CREATE POLICY "Editors can insert relationships"
  ON public.relationships FOR INSERT
  WITH CHECK (is_family_editor_or_admin(auth.uid(), family_id));

CREATE POLICY "Editors can update relationships"
  ON public.relationships FOR UPDATE
  USING (is_family_editor_or_admin(auth.uid(), family_id));

CREATE POLICY "Admins can delete relationships"
  ON public.relationships FOR DELETE
  USING (is_family_admin(auth.uid(), family_id));

-- Fix profiles write policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());
