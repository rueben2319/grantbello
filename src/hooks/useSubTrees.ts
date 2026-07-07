import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFamilyRole } from "@/hooks/useFamily";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type SubTree = Tables<"sub_trees">;

export function useFamilySubTrees(familyId: string | undefined) {
  return useQuery({
    queryKey: ["sub-trees", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_trees")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useMySubTrees(familyId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-sub-trees", familyId, user?.id],
    enabled: !!familyId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_trees")
        .select("*")
        .eq("family_id", familyId!)
        .eq("admin_user_id", user!.id);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateSubTree() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Omit<TablesInsert<"sub_trees">, "created_by">) => {
      const { data, error } = await supabase
        .from("sub_trees")
        .insert({ ...values, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sub-trees", data.family_id] });
      qc.invalidateQueries({ queryKey: ["my-sub-trees", data.family_id] });
    },
  });
}

export function useUpdateSubTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<TablesInsert<"sub_trees">>) => {
      const { data, error } = await supabase.from("sub_trees").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sub-trees", data.family_id] });
      qc.invalidateQueries({ queryKey: ["my-sub-trees", data.family_id] });
    },
  });
}

export function useDeleteSubTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from("sub_trees").delete().eq("id", id);
      if (error) throw error;
      return familyId;
    },
    onSuccess: (familyId) => {
      qc.invalidateQueries({ queryKey: ["sub-trees", familyId] });
      qc.invalidateQueries({ queryKey: ["my-sub-trees", familyId] });
    },
  });
}

/**
 * Determines whether the current user can edit persons directly, submit changes
 * for approval as a sub-tree admin, or has no edit power at all.
 */
export function useEditGate(familyId: string | undefined) {
  const { data: role } = useUserFamilyRole(familyId);
  const { data: mySubs } = useMySubTrees(familyId);
  const canEditDirectly = role === "admin" || role === "editor";
  const isFamilyAdmin = role === "admin";
  const isSubAdminOnly = !canEditDirectly && (mySubs?.length ?? 0) > 0;
  const canEdit = canEditDirectly || isSubAdminOnly;
  return {
    role: role ?? null,
    canEdit,
    canEditDirectly,
    isFamilyAdmin,
    isSubAdminOnly,
    subTreeId: mySubs?.[0]?.id ?? null,
  };
}

/** Auto-suggest candidate roots from persons/relationships. */
export function suggestSubTreeRoots(
  persons: Tables<"persons">[],
  relationships: Tables<"relationships">[],
  existingSubTrees: SubTree[]
): { rootA: Tables<"persons">; rootB?: Tables<"persons">; childCount: number }[] {
  const parentOf = new Map<string, Set<string>>();
  for (const r of relationships) {
    if (r.relationship_type !== "parent") continue;
    if (!parentOf.has(r.person_id)) parentOf.set(r.person_id, new Set());
    parentOf.get(r.person_id)!.add(r.related_person_id);
  }
  const personById = new Map(persons.map((p) => [p.id, p]));

  const usedPairs = new Set(
    existingSubTrees.map((s) => {
      const a = s.root_person_a_id;
      const b = s.root_person_b_id;
      if (!b) return `single:${a}`;
      return `pair:${[a, b].sort().join("|")}`;
    })
  );

  const suggestions: { rootA: Tables<"persons">; rootB?: Tables<"persons">; childCount: number }[] = [];
  const consumed = new Set<string>();

  // Couples with shared children
  const spouseRels = relationships.filter((r) => r.relationship_type === "spouse");
  for (const sr of spouseRels) {
    const a = personById.get(sr.person_id);
    const b = personById.get(sr.related_person_id);
    if (!a || !b) continue;
    const aKids = parentOf.get(a.id) ?? new Set();
    const bKids = parentOf.get(b.id) ?? new Set();
    const shared = [...aKids].filter((k) => bKids.has(k));
    if (shared.length === 0) continue;
    const key = `pair:${[a.id, b.id].sort().join("|")}`;
    if (usedPairs.has(key)) continue;
    if (suggestions.find((s) => s.rootB && [s.rootA.id, s.rootB.id].sort().join("|") === [a.id, b.id].sort().join("|"))) continue;
    suggestions.push({ rootA: a, rootB: b, childCount: shared.length });
    consumed.add(a.id);
    consumed.add(b.id);
  }

  // Single parents with children (not already covered by a couple)
  for (const [parentId, kids] of parentOf) {
    if (consumed.has(parentId)) continue;
    const key = `single:${parentId}`;
    if (usedPairs.has(key)) continue;
    const p = personById.get(parentId);
    if (!p) continue;
    suggestions.push({ rootA: p, childCount: kids.size });
  }

  return suggestions.sort((a, b) => b.childCount - a.childCount);
}

/** Descendants (deep) of a given root or pair, for mini-preview rendering. */
export function getSubTreeMembers(
  persons: Tables<"persons">[],
  relationships: Tables<"relationships">[],
  rootAId: string,
  rootBId: string | null
): { members: Tables<"persons">[]; generations: Map<string, number> } {
  const personById = new Map(persons.map((p) => [p.id, p]));
  const childrenOf = new Map<string, Set<string>>();
  for (const r of relationships) {
    if (r.relationship_type !== "parent") continue;
    if (!childrenOf.has(r.person_id)) childrenOf.set(r.person_id, new Set());
    childrenOf.get(r.person_id)!.add(r.related_person_id);
  }
  const generations = new Map<string, number>();
  generations.set(rootAId, 0);
  if (rootBId) generations.set(rootBId, 0);
  const queue: string[] = [rootAId];
  if (rootBId) queue.push(rootBId);
  const seen = new Set<string>([rootAId, rootBId ?? ""].filter(Boolean));
  while (queue.length) {
    const cur = queue.shift()!;
    const gen = generations.get(cur)!;
    for (const k of childrenOf.get(cur) ?? []) {
      if (seen.has(k)) continue;
      seen.add(k);
      generations.set(k, gen + 1);
      queue.push(k);
    }
  }
  const members = [...seen].map((id) => personById.get(id)).filter(Boolean) as Tables<"persons">[];
  return { members, generations };
}
