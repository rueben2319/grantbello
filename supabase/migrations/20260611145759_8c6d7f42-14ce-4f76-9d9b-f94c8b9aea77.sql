-- Dedupe existing duplicate relationships, keeping the earliest one
DELETE FROM public.relationships r
USING public.relationships r2
WHERE r.person_id = r2.person_id
  AND r.related_person_id = r2.related_person_id
  AND r.relationship_type = r2.relationship_type
  AND r.ctid > r2.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS relationships_unique
  ON public.relationships (person_id, related_person_id, relationship_type);
