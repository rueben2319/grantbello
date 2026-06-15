
-- Event type enum
CREATE TYPE public.event_type AS ENUM ('wedding','funeral','meeting','birth','graduation','reunion','other');

-- EVENTS TABLE
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type public.event_type NOT NULL DEFAULT 'other',
  event_date date NOT NULL,
  location text,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events readable for public families or members"
  ON public.events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.families f WHERE f.id = events.family_id AND f.is_public = true)
    OR public.is_family_member(auth.uid(), events.family_id)
  );

CREATE POLICY "Editors/admins can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_family_editor_or_admin(auth.uid(), family_id));

CREATE POLICY "Editors/admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.is_family_editor_or_admin(auth.uid(), family_id))
  WITH CHECK (public.is_family_editor_or_admin(auth.uid(), family_id));

CREATE POLICY "Editors/admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (public.is_family_editor_or_admin(auth.uid(), family_id));

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_events_family_date ON public.events(family_id, event_date DESC);

-- EVENT ATTENDEES
CREATE TABLE public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, person_id)
);

GRANT SELECT ON public.event_attendees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendees TO authenticated;
GRANT ALL ON public.event_attendees TO service_role;

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees readable when event is readable"
  ON public.event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.families f ON f.id = e.family_id
      WHERE e.id = event_attendees.event_id
        AND (f.is_public = true OR public.is_family_member(auth.uid(), e.family_id))
    )
  );

CREATE POLICY "Editors/admins manage attendees"
  ON public.event_attendees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_attendees.event_id
        AND public.is_family_editor_or_admin(auth.uid(), e.family_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_attendees.event_id
        AND public.is_family_editor_or_admin(auth.uid(), e.family_id)
    )
  );

CREATE INDEX idx_event_attendees_event ON public.event_attendees(event_id);
CREATE INDEX idx_event_attendees_person ON public.event_attendees(person_id);

-- EVENT PHOTOS
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_photos TO authenticated;
GRANT ALL ON public.event_photos TO service_role;

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos readable when event is readable"
  ON public.event_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.families f ON f.id = e.family_id
      WHERE e.id = event_photos.event_id
        AND (f.is_public = true OR public.is_family_member(auth.uid(), e.family_id))
    )
  );

CREATE POLICY "Editors/admins manage photos"
  ON public.event_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_photos.event_id
        AND public.is_family_editor_or_admin(auth.uid(), e.family_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_photos.event_id
        AND public.is_family_editor_or_admin(auth.uid(), e.family_id)
    )
  );

CREATE INDEX idx_event_photos_event ON public.event_photos(event_id, sort_order);
