import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type EventType = "wedding" | "funeral" | "meeting" | "birth" | "graduation" | "reunion" | "other";

export type TimelineEvent = Tables<"events"> & {
  attendees: { person_id: string }[];
  photos: Tables<"event_photos">[];
};

export function useFamilyEvents(familyId: string | undefined) {
  return useQuery({
    queryKey: ["family-events", familyId],
    enabled: !!familyId,
    queryFn: async (): Promise<TimelineEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*, attendees:event_attendees(person_id), photos:event_photos(*)")
        .eq("family_id", familyId!)
        .order("event_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TimelineEvent[];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Omit<TablesInsert<"events">, "created_by"> & { attendee_ids?: string[] }) => {
      const { attendee_ids, ...eventValues } = values;
      const { data: ev, error } = await supabase
        .from("events")
        .insert({ ...eventValues, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;

      if (attendee_ids?.length) {
        const { error: aErr } = await supabase
          .from("event_attendees")
          .insert(attendee_ids.map((person_id) => ({ event_id: ev.id, person_id })));
        if (aErr) throw aErr;
      }
      return ev;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["family-events", data.family_id] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      attendee_ids,
      ...values
    }: { id: string; attendee_ids?: string[] } & Partial<TablesInsert<"events">>) => {
      const { data: ev, error } = await supabase
        .from("events")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      if (attendee_ids) {
        await supabase.from("event_attendees").delete().eq("event_id", id);
        if (attendee_ids.length) {
          const { error: aErr } = await supabase
            .from("event_attendees")
            .insert(attendee_ids.map((person_id) => ({ event_id: id, person_id })));
          if (aErr) throw aErr;
        }
      }
      return ev;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["family-events", data.family_id] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      return familyId;
    },
    onSuccess: (familyId) => {
      qc.invalidateQueries({ queryKey: ["family-events", familyId] });
    },
  });
}

export function useAddEventPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ event_id, photo_url, caption }: { event_id: string; photo_url: string; caption?: string }) => {
      const { data, error } = await supabase
        .from("event_photos")
        .insert({ event_id, photo_url, caption })
        .select("*, events(family_id)")
        .single();
      if (error) throw error;
      return data as unknown as Tables<"event_photos"> & { events: { family_id: string } };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["family-events", data.events.family_id] });
    },
  });
}

export function useDeleteEventPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from("event_photos").delete().eq("id", id);
      if (error) throw error;
      return familyId;
    },
    onSuccess: (familyId) => {
      qc.invalidateQueries({ queryKey: ["family-events", familyId] });
    },
  });
}
