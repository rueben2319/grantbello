import type { Tables } from "@/integrations/supabase/types";

export type Branch = {
  id: string;
  persons: [Tables<"persons">, Tables<"persons">?];
  childCount: number;
  primaryPersonId: string;
  generation: number;
};
