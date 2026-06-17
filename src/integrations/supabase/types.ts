export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          person_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          person_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          id: string
          photo_url: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          id?: string
          photo_url: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          id?: string
          photo_url?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          family_id: string
          id: string
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type?: Database["public"]["Enums"]["event_type"]
          family_id: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          family_id?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_roles: {
        Row: {
          created_at: string
          family_id: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["family_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_roles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_roles_user_id_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      persons: {
        Row: {
          bio: string | null
          birth_date: string | null
          created_at: string
          death_date: string | null
          family_id: string
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_private: boolean
          last_name: string | null
          married_in: boolean
          middle_name: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          death_date?: string | null
          family_id: string
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_private?: boolean
          last_name?: string | null
          married_in?: boolean
          middle_name?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          death_date?: string | null
          family_id?: string
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_private?: boolean
          last_name?: string | null
          married_in?: boolean
          middle_name?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persons_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          created_at: string
          family_id: string
          id: string
          is_divorced: boolean
          person_id: string
          related_person_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          status: Database["public"]["Enums"]["spouse_status"]
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          is_divorced?: boolean
          person_id: string
          related_person_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          status?: Database["public"]["Enums"]["spouse_status"]
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          is_divorced?: boolean
          person_id?: string
          related_person_id?: string
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          status?: Database["public"]["Enums"]["spouse_status"]
        }
        Relationships: [
          {
            foreignKeyName: "relationships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_related_person_id_fkey"
            columns: ["related_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_profile_by_email: {
        Args: { _email: string; _family_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      get_user_family_role: {
        Args: { _family_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["family_role"]
      }
      is_family_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_editor_or_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      event_type:
        | "wedding"
        | "funeral"
        | "meeting"
        | "birth"
        | "graduation"
        | "reunion"
        | "other"
      family_role: "admin" | "editor" | "viewer"
      gender_type: "male" | "female" | "other"
      relationship_type: "parent" | "spouse"
      spouse_status: "active" | "divorced" | "widowed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_type: [
        "wedding",
        "funeral",
        "meeting",
        "birth",
        "graduation",
        "reunion",
        "other",
      ],
      family_role: ["admin", "editor", "viewer"],
      gender_type: ["male", "female", "other"],
      relationship_type: ["parent", "spouse"],
      spouse_status: ["active", "divorced", "widowed"],
    },
  },
} as const
