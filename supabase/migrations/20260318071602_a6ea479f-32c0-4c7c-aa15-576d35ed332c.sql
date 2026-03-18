
-- Fix privilege escalation: add WITH CHECK to prevent promoting to admin
DROP POLICY IF EXISTS "Admins can update roles (not to admin)" ON public.family_roles;
CREATE POLICY "Admins can update roles (not to admin)" ON public.family_roles
FOR UPDATE TO authenticated
USING (is_family_admin(auth.uid(), family_id) AND (user_id <> auth.uid()))
WITH CHECK (is_family_admin(auth.uid(), family_id) AND (user_id <> auth.uid()) AND (role <> 'admin'::family_role));
