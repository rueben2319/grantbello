import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database, Tables } from "@/integrations/supabase/types";

export type PendingChange = Tables<"pending_changes">;
export type PendingChangeAction = Database["public"]["Enums"]["pending_change_action"];

export function usePendingChanges(familyId: string | undefined, opts?: { statusFilter?: "pending" | "approved" | "rejected" | "all" }) {
  const statusFilter = opts?.statusFilter ?? "pending";
  return useQuery({
    queryKey: ["pending-changes", familyId, statusFilter],
    enabled: !!familyId,
    queryFn: async () => {
      let q = supabase.from("pending_changes").select("*").eq("family_id", familyId!);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function usePendingCount(familyId: string | undefined) {
  return useQuery({
    queryKey: ["pending-changes-count", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pending_changes")
        .select("*", { count: "exact", head: true })
        .eq("family_id", familyId!)
        .eq("status", "pending");
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });
}

export function useSubmitPendingChange() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: {
      family_id: string;
      sub_tree_id: string | null;
      action: PendingChangeAction;
      target_id?: string | null;
      payload: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("pending_changes")
        .insert({
          family_id: values.family_id,
          sub_tree_id: values.sub_tree_id,
          submitted_by: user!.id,
          action: values.action,
          target_id: values.target_id ?? null,
          payload: values.payload as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pending-changes", data.family_id] });
      qc.invalidateQueries({ queryKey: ["pending-changes-count", data.family_id] });
    },
  });
}

export function useApprovePendingChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase.rpc("apply_pending_change", { _id: id, _note: note ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-changes"] });
      qc.invalidateQueries({ queryKey: ["pending-changes-count"] });
      qc.invalidateQueries({ queryKey: ["family-persons"] });
      qc.invalidateQueries({ queryKey: ["family-relationships"] });
    },
  });
}

export function useRejectPendingChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase.rpc("reject_pending_change", { _id: id, _note: note ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-changes"] });
      qc.invalidateQueries({ queryKey: ["pending-changes-count"] });
    },
  });
}
