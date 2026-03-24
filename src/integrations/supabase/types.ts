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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          created_at: string
          id: string
          interview_timeline: string | null
          name: string
          notes: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"] | null
          updated_at: string
          user_id: string
          why_interested: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interview_timeline?: string | null
          name: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          updated_at?: string
          user_id: string
          why_interested?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interview_timeline?: string | null
          name?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          updated_at?: string
          user_id?: string
          why_interested?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_interaction_date: string | null
          linkedin_url: string | null
          next_followup_date: string | null
          notes: string | null
          relationship_strength:
            | Database["public"]["Enums"]["relationship_strength"]
            | null
          role_title: string | null
          school_alumni_status: string | null
          shared_interests: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_interaction_date?: string | null
          linkedin_url?: string | null
          next_followup_date?: string | null
          notes?: string | null
          relationship_strength?:
            | Database["public"]["Enums"]["relationship_strength"]
            | null
          role_title?: string | null
          school_alumni_status?: string | null
          shared_interests?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_interaction_date?: string | null
          linkedin_url?: string | null
          next_followup_date?: string | null
          notes?: string | null
          relationship_strength?:
            | Database["public"]["Enums"]["relationship_strength"]
            | null
          role_title?: string | null
          school_alumni_status?: string | null
          shared_interests?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drafted_messages: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          subject: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string
          id?: string
          message_type: Database["public"]["Enums"]["message_type"]
          subject?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafted_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          snoozed_until: string | null
          status: Database["public"]["Enums"]["followup_status"] | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["followup_status"] | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["followup_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          contact_id: string
          created_at: string
          date: string
          followup_date: string | null
          id: string
          key_takeaways: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          promised_next_steps: string | null
          raw_notes: string | null
          sent_thank_you: boolean | null
          source: string
          structured_summary: Json | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          date: string
          followup_date?: string | null
          id?: string
          key_takeaways?: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          promised_next_steps?: string | null
          raw_notes?: string | null
          sent_thank_you?: boolean | null
          source?: string
          structured_summary?: Json | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          date?: string
          followup_date?: string | null
          id?: string
          key_takeaways?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          promised_next_steps?: string | null
          raw_notes?: string | null
          sent_thank_you?: boolean | null
          source?: string
          structured_summary?: Json | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          graduation_year: number | null
          id: string
          onboarding_completed: boolean | null
          school: string | null
          target_companies: string[] | null
          target_industries: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          graduation_year?: number | null
          id: string
          onboarding_completed?: boolean | null
          school?: string | null
          target_companies?: string[] | null
          target_industries?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          graduation_year?: number | null
          id?: string
          onboarding_completed?: boolean | null
          school?: string | null
          target_companies?: string[] | null
          target_industries?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      followup_status: "pending" | "completed" | "snoozed"
      meeting_type:
        | "coffee_chat"
        | "info_interview"
        | "networking_event"
        | "class_project"
        | "alumni_call"
      message_type: "thank_you" | "follow_up" | "check_in" | "alumni_outreach"
      pipeline_stage:
        | "interested"
        | "reached_out"
        | "coffee_chat_completed"
        | "applied"
        | "interviewing"
        | "offer"
        | "closed"
      relationship_strength: "cold" | "warm" | "strong"
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
      followup_status: ["pending", "completed", "snoozed"],
      meeting_type: [
        "coffee_chat",
        "info_interview",
        "networking_event",
        "class_project",
        "alumni_call",
      ],
      message_type: ["thank_you", "follow_up", "check_in", "alumni_outreach"],
      pipeline_stage: [
        "interested",
        "reached_out",
        "coffee_chat_completed",
        "applied",
        "interviewing",
        "offer",
        "closed",
      ],
      relationship_strength: ["cold", "warm", "strong"],
    },
  },
} as const
