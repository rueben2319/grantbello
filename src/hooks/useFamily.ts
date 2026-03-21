import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export function useMyFamilies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-families", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<(Tables<"families"> & { role: string })[]> => {
      const { data: roles, error: rolesError } = await supabase
        .from("family_roles")
        .select("family_id, role")
        .eq("user_id", user!.id);

      if (rolesError) throw new Error(rolesError.message);

      if (!roles?.length) return [];

      const familyIds = roles.map((r) => r.family_id);
      const { data: families, error: familiesError } = await supabase
        .from("families")
        .select("*")
        .in("id", familyIds);

      if (familiesError) throw new Error(familiesError.message);

      return (families || []).map((f) => ({
        ...f,
        role: roles.find((r) => r.family_id === f.id)?.role || "viewer",
      }));
    },
  });
}

export function usePublicFamilies() {
  return useQuery({
    queryKey: ["public-families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useFamily(familyId: string | undefined) {
  return useQuery({
    queryKey: ["family", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .eq("id", familyId!)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
  });
}

/**
 * Fetches all persons belonging to a specific family.
 * Returns an empty array while loading or if familyId is undefined.
 * @throws {Error} if the Supabase query fails
 */
export function useFamilyPersons(familyId: string | undefined) {
  return useQuery({
    queryKey: ["family-persons", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persons")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at");

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

/**
 * Fetches all parent/spouse relationships for a specific family.
 * @throws {Error} if the Supabase query fails
 */
export function useFamilyRelationships(familyId: string | undefined) {
  return useQuery({
    queryKey: ["family-relationships", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationships")
        .select("*")
        .eq("family_id", familyId!);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useFamilyMembers(familyId: string | undefined) {
  return useQuery({
    queryKey: ["family-members", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_roles")
        .select("*, profiles:profiles(display_name, avatar_url)")
        .eq("family_id", familyId!);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useUserFamilyRole(familyId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-family-role", familyId, user?.id],
    enabled: !!familyId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_roles")
        .select("role")
        .eq("family_id", familyId!)
        .eq("user_id", user!.id)
        .single();

      if (error) throw new Error(error.message);
      return data?.role ?? null;
    },
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { name: string; description?: string; is_public?: boolean }) => {
      const { data, error } = await supabase
        .from("families")
        .insert({ ...values, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-families"] });
    },
  });
}

export function useUpdateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; description?: string; is_public?: boolean }) => {
      const { error } = await supabase.from("families").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["family", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["my-families"] });
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<"persons">) => {
      const { data, error } = await supabase.from("persons").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["family-persons", data.family_id] });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<TablesInsert<"persons">>) => {
      const { data, error } = await supabase.from("persons").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["family-persons", data.family_id] });
    },
  });
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<"relationships">) => {
      const { data, error } = await supabase.from("relationships").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["family-relationships", data.family_id] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from("persons").delete().eq("id", id);
      if (error) throw error;
      return familyId;
    },
    onSuccess: (familyId) => {
      queryClient.invalidateQueries({ queryKey: ["family-persons", familyId] });
      queryClient.invalidateQueries({ queryKey: ["family-relationships", familyId] });
    },
  });
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from("relationships").delete().eq("id", id);
      if (error) throw error;
      return familyId;
    },
    onSuccess: (familyId) => {
      queryClient.invalidateQueries({ queryKey: ["family-relationships", familyId] });
    },
  });
}
