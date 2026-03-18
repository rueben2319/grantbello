
-- Fix INSERT policy to prevent inserting admin role
DROP POLICY IF EXISTS "Admins can insert roles" ON public.family_roles;
CREATE POLICY "Admins can insert roles" ON public.family_roles
FOR INSERT TO authenticated
WITH CHECK (
  is_family_admin(auth.uid(), family_id)
  AND (user_id <> auth.uid())
  AND (invited_by = auth.uid())
  AND (role <> 'admin'::family_role)
);

-- Fix public relationships policy to hide private persons
DROP POLICY IF EXISTS "Public can view relationships in public families" ON public.relationships;
CREATE POLICY "Public can view relationships in public families" ON public.relationships
FOR SELECT TO public
USING (
  (EXISTS (
    SELECT 1 FROM families WHERE families.id = relationships.family_id AND families.is_public = true
  ))
  AND (NOT EXISTS (
    SELECT 1 FROM persons WHERE persons.id = relationships.person_id AND persons.is_private = true
  ))
  AND (NOT EXISTS (
    SELECT 1 FROM persons WHERE persons.id = relationships.related_person_id AND persons.is_private = true
  ))
);
