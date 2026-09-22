export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      lesson_attendance: {
        Row: {
          marked_at: string
          marked_by: string | null
          player_id: string
          registration_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          marked_at?: string
          marked_by?: string | null
          player_id: string
          registration_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          marked_at?: string
          marked_by?: string | null
          player_id?: string
          registration_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lesson_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_attendance_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "lesson_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_registrations: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          id: string
          joined_at: string
          lesson_id: string
          player_id: string
          promoted_at: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          lesson_id: string
          player_id: string
          promoted_at?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          lesson_id?: string
          player_id?: string
          promoted_at?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_registrations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          capacity: number
          court_count: number
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          location: string
          player_level_id: number | null
          registered_count: number
          registration_deadline: string | null
          registration_open: boolean
          series_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["lesson_status"]
          title: string
          updated_at: string
          waitlist_count: number
        }
        Insert: {
          capacity?: number
          court_count?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          location?: string
          player_level_id?: number | null
          registered_count?: number
          registration_deadline?: string | null
          registration_open?: boolean
          series_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["lesson_status"]
          title?: string
          updated_at?: string
          waitlist_count?: number
        }
        Update: {
          capacity?: number
          court_count?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          location?: string
          player_level_id?: number | null
          registered_count?: number
          registration_deadline?: string | null
          registration_open?: boolean
          series_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          title?: string
          updated_at?: string
          waitlist_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_player_level_id_fkey"
            columns: ["player_level_id"]
            isOneToOne: false
            referencedRelation: "player_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      player_levels: {
        Row: {
          active: boolean
          created_at: string
          id: number
          name: string
          rank: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: number
          name: string
          rank: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: number
          name?: string
          rank?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          approved_at: string | null
          avatar_path: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          player_level_id: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          approved_at?: string | null
          avatar_path?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          player_level_id?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          approved_at?: string | null
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          player_level_id?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_player_level_id_fkey"
            columns: ["player_level_id"]
            isOneToOne: false
            referencedRelation: "player_levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_members: {
        Args: { p_member_id?: string }
        Returns: Database["public"]["CompositeTypes"]["member_details"][]
        SetofOptions: {
          from: "*"
          to: "member_details"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_set_attendance: {
        Args: {
          p_registration_id: string
          p_status?: Database["public"]["Enums"]["attendance_status"]
        }
        Returns: Json
      }
      admin_set_member_active: {
        Args: { p_active: boolean; p_member_id: string }
        Returns: Json
      }
      admin_set_member_level: {
        Args: { p_member_id: string; p_player_level_id: number }
        Returns: undefined
      }
      admin_update_lessons: { Args: { p_lessons: Json }; Returns: number }
      cancel_registration: {
        Args: { p_lesson_id: string; p_reason?: string }
        Returns: Json
      }
      get_my_profile: {
        Args: never
        Returns: Database["public"]["CompositeTypes"]["member_details"][]
        SetofOptions: {
          from: "*"
          to: "member_details"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      join_lesson: { Args: { p_lesson_id: string }; Returns: Json }
      join_waitlist: { Args: { p_lesson_id: string }; Returns: Json }
      upcoming_sessions: {
        Args: { p_limit?: number }
        Returns: {
          capacity: number
          end_time: string
          id: string
          location: string
          registered_count: number
          registration_closes_at: string
          start_time: string
        }[]
      }
    }
    Enums: {
      attendance_status: "present" | "absent"
      lesson_status: "scheduled" | "cancelled" | "completed"
      registration_status: "joined" | "cancelled" | "waitlisted"
      user_role: "player" | "admin"
    }
    CompositeTypes: {
      member_details: {
        id: string | null
        full_name: string | null
        email: string | null
        phone: string | null
        avatar_path: string | null
        role: Database["public"]["Enums"]["user_role"] | null
        player_level_id: number | null
        player_level_name: string | null
        active: boolean | null
        created_at: string | null
        updated_at: string | null
        upcoming_lessons_count: number | null
        approved_at: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      attendance_status: ["present", "absent"],
      lesson_status: ["scheduled", "cancelled", "completed"],
      registration_status: ["joined", "cancelled", "waitlisted"],
      user_role: ["player", "admin"],
    },
  },
} as const

