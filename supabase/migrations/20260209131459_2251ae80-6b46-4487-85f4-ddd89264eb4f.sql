
-- ================================================
-- ENUMS
-- ================================================
CREATE TYPE public.family_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE public.relationship_type AS ENUM ('parent', 'spouse');
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other');

-- ================================================
-- PROFILES TABLE
-- ================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- FAMILIES TABLE
-- ================================================
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- ================================================
-- PERSONS TABLE
-- ================================================
CREATE TABLE public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT DEFAULT '',
  gender public.gender_type DEFAULT 'other',
  birth_date DATE,
  death_date DATE,
  bio TEXT DEFAULT '',
  photo_url TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RELATIONSHIPS TABLE
-- ================================================
CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  related_person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  relationship_type public.relationship_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

-- ================================================
-- FAMILY ROLES TABLE
-- ================================================
CREATE TABLE public.family_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  role public.family_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, family_id)
);
ALTER TABLE public.family_roles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ================================================

-- Check if user is a member of a family
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_roles
    WHERE user_id = _user_id AND family_id = _family_id
  )
$$;

-- Check if user is admin of a family
CREATE OR REPLACE FUNCTION public.is_family_admin(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_roles
    WHERE user_id = _user_id AND family_id = _family_id AND role = 'admin'
  )
$$;

-- Check if user is editor or admin of a family
CREATE OR REPLACE FUNCTION public.is_family_editor_or_admin(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_roles
    WHERE user_id = _user_id AND family_id = _family_id AND role IN ('admin', 'editor')
  )
$$;

-- Get user role in a family
CREATE OR REPLACE FUNCTION public.get_user_family_role(_user_id UUID, _family_id UUID)
RETURNS public.family_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.family_roles
  WHERE user_id = _user_id AND family_id = _family_id
$$;

-- ================================================
-- TRIGGER: Auto-create profile on signup
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- TRIGGER: Auto-assign admin role on family creation
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_family()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.family_roles (user_id, family_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_family_created
  AFTER INSERT ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_family();

-- ================================================
-- TRIGGER: Updated_at timestamps
-- ================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- RLS POLICIES: profiles
-- ================================================
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view profiles of family members" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.family_roles fr1
    JOIN public.family_roles fr2 ON fr1.family_id = fr2.family_id
    WHERE fr1.user_id = auth.uid() AND fr2.user_id = profiles.user_id
  )
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

-- ================================================
-- RLS POLICIES: families
-- ================================================
CREATE POLICY "Anyone can view public families" ON public.families FOR SELECT USING (is_public = true);
CREATE POLICY "Members can view their families" ON public.families FOR SELECT USING (public.is_family_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create families" ON public.families FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can update their family" ON public.families FOR UPDATE USING (public.is_family_admin(auth.uid(), id));
CREATE POLICY "Admins can delete their family" ON public.families FOR DELETE USING (public.is_family_admin(auth.uid(), id));

-- ================================================
-- RLS POLICIES: persons
-- ================================================
CREATE POLICY "Public can view non-private persons in public families" ON public.persons FOR SELECT USING (
  is_private = false AND EXISTS (SELECT 1 FROM public.families WHERE id = family_id AND is_public = true)
);
CREATE POLICY "Members can view all persons in their families" ON public.persons FOR SELECT USING (
  public.is_family_member(auth.uid(), family_id)
);
CREATE POLICY "Editors can insert persons" ON public.persons FOR INSERT TO authenticated WITH CHECK (
  public.is_family_editor_or_admin(auth.uid(), family_id)
);
CREATE POLICY "Editors can update persons" ON public.persons FOR UPDATE USING (
  public.is_family_editor_or_admin(auth.uid(), family_id)
);
CREATE POLICY "Admins can delete persons" ON public.persons FOR DELETE USING (
  public.is_family_admin(auth.uid(), family_id)
);

-- ================================================
-- RLS POLICIES: relationships
-- ================================================
CREATE POLICY "Public can view relationships in public families" ON public.relationships FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.families WHERE id = family_id AND is_public = true)
);
CREATE POLICY "Members can view relationships in their families" ON public.relationships FOR SELECT USING (
  public.is_family_member(auth.uid(), family_id)
);
CREATE POLICY "Editors can insert relationships" ON public.relationships FOR INSERT TO authenticated WITH CHECK (
  public.is_family_editor_or_admin(auth.uid(), family_id)
);
CREATE POLICY "Editors can update relationships" ON public.relationships FOR UPDATE USING (
  public.is_family_editor_or_admin(auth.uid(), family_id)
);
CREATE POLICY "Admins can delete relationships" ON public.relationships FOR DELETE USING (
  public.is_family_admin(auth.uid(), family_id)
);

-- ================================================
-- RLS POLICIES: family_roles
-- ================================================
CREATE POLICY "Members can view roles in their family" ON public.family_roles FOR SELECT USING (
  public.is_family_member(auth.uid(), family_id)
);
CREATE POLICY "Admins can insert roles" ON public.family_roles FOR INSERT TO authenticated WITH CHECK (
  public.is_family_admin(auth.uid(), family_id) AND user_id != auth.uid() AND invited_by = auth.uid()
);
CREATE POLICY "Admins can update roles (not to admin)" ON public.family_roles FOR UPDATE USING (
  public.is_family_admin(auth.uid(), family_id) AND user_id != auth.uid()
);
CREATE POLICY "Admins can delete roles (not self)" ON public.family_roles FOR DELETE USING (
  public.is_family_admin(auth.uid(), family_id) AND user_id != auth.uid()
);

-- ================================================
-- STORAGE: Photo bucket
-- ================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Authenticated users can update own photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos');

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX idx_persons_family_id ON public.persons(family_id);
CREATE INDEX idx_relationships_family_id ON public.relationships(family_id);
CREATE INDEX idx_relationships_person_id ON public.relationships(person_id);
CREATE INDEX idx_relationships_related_person_id ON public.relationships(related_person_id);
CREATE INDEX idx_family_roles_user_id ON public.family_roles(user_id);
CREATE INDEX idx_family_roles_family_id ON public.family_roles(family_id);
