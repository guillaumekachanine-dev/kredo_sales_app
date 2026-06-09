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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      crm_accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          sector: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_id?: string
          sector?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          account_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          job_title: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          job_title?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content_json: Json
          content_text: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          is_pinned: boolean
          owner_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content_json?: Json
          content_text?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          is_pinned?: boolean
          owner_id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content_json?: Json
          content_text?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          is_pinned?: boolean
          owner_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sales_opportunities: {
        Row: {
          account_id: string | null
          acv: number | null
          client_context: string | null
          conviction: number
          created_at: string
          duration: number | null
          engagement_notes: string | null
          estimated_gain: number | null
          id: string
          location: string | null
          loss_reason: string | null
          need_detail: string | null
          need_summary: string | null
          next_action_at: string | null
          next_action_label: string | null
          opportunity_type: string | null
          outcome: Database["public"]["Enums"]["sales_outcome"] | null
          owner_id: string
          practice: string | null
          priority: Database["public"]["Enums"]["sales_priority"]
          remote_policy: string | null
          seniority: string | null
          source: string | null
          stage: Database["public"]["Enums"]["sales_stage"]
          start_date: string | null
          target_close_date: string | null
          target_daily_rate: number | null
          title: string
          updated_at: string
          weighted_gain: number | null
          win_reason: string | null
        }
        Insert: {
          account_id?: string | null
          acv?: number | null
          client_context?: string | null
          conviction?: number
          created_at?: string
          duration?: number | null
          engagement_notes?: string | null
          estimated_gain?: number | null
          id?: string
          location?: string | null
          loss_reason?: string | null
          need_detail?: string | null
          need_summary?: string | null
          next_action_at?: string | null
          next_action_label?: string | null
          opportunity_type?: string | null
          outcome?: Database["public"]["Enums"]["sales_outcome"] | null
          owner_id?: string
          practice?: string | null
          priority?: Database["public"]["Enums"]["sales_priority"]
          remote_policy?: string | null
          seniority?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["sales_stage"]
          start_date?: string | null
          target_close_date?: string | null
          target_daily_rate?: number | null
          title: string
          updated_at?: string
          weighted_gain?: number | null
          win_reason?: string | null
        }
        Update: {
          account_id?: string | null
          acv?: number | null
          client_context?: string | null
          conviction?: number
          created_at?: string
          duration?: number | null
          engagement_notes?: string | null
          estimated_gain?: number | null
          id?: string
          location?: string | null
          loss_reason?: string | null
          need_detail?: string | null
          need_summary?: string | null
          next_action_at?: string | null
          next_action_label?: string | null
          opportunity_type?: string | null
          outcome?: Database["public"]["Enums"]["sales_outcome"] | null
          owner_id?: string
          practice?: string | null
          priority?: Database["public"]["Enums"]["sales_priority"]
          remote_policy?: string | null
          seniority?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["sales_stage"]
          start_date?: string | null
          target_close_date?: string | null
          target_daily_rate?: number | null
          title?: string
          updated_at?: string
          weighted_gain?: number | null
          win_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunity_contacts: {
        Row: {
          contact_id: string
          opportunity_id: string
          owner_id: string
          role: Database["public"]["Enums"]["crm_contact_role"] | null
        }
        Insert: {
          contact_id: string
          opportunity_id: string
          owner_id?: string
          role?: Database["public"]["Enums"]["crm_contact_role"] | null
        }
        Update: {
          contact_id?: string
          opportunity_id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["crm_contact_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunity_contacts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunity_events: {
        Row: {
          body: string | null
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          opportunity_id: string
          owner_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          occurred_at?: string
          opportunity_id: string
          owner_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          opportunity_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunity_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunity_skills: {
        Row: {
          created_at: string
          id: string
          importance: Database["public"]["Enums"]["sales_skill_importance"]
          min_years: number | null
          opportunity_id: string
          owner_id: string
          skill_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          importance?: Database["public"]["Enums"]["sales_skill_importance"]
          min_years?: number | null
          opportunity_id: string
          owner_id?: string
          skill_name: string
        }
        Update: {
          created_at?: string
          id?: string
          importance?: Database["public"]["Enums"]["sales_skill_importance"]
          min_years?: number | null
          opportunity_id?: string
          owner_id?: string
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunity_skills_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      crm_contact_role:
        | "decisionnaire"
        | "operationnel"
        | "prescripteur"
        | "achat"
      sales_outcome: "gagnee" | "perdue" | "abandonnee"
      sales_priority: "haute" | "moyenne" | "basse"
      sales_skill_importance: "indispensable" | "souhaitee" | "bonus"
      sales_stage:
        | "en_cours"
        | "cv_sent"
        | "rt"
        | "win"
        | "lost"
        | "non_traitee"
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
      crm_contact_role: [
        "decisionnaire",
        "operationnel",
        "prescripteur",
        "achat",
      ],
      sales_outcome: ["gagnee", "perdue", "abandonnee"],
      sales_priority: ["haute", "moyenne", "basse"],
      sales_skill_importance: ["indispensable", "souhaitee", "bonus"],
      sales_stage: ["en_cours", "cv_sent", "rt", "win", "lost", "non_traitee"],
    },
  },
} as const

// ------------------------------------------------------------
//  Raccourcis pratiques
// ------------------------------------------------------------
type PublicSchema = Database["public"]

export type Opportunity = PublicSchema["Tables"]["sales_opportunities"]["Row"]
export type OpportunityInsert = PublicSchema["Tables"]["sales_opportunities"]["Insert"]
export type OpportunityUpdate = PublicSchema["Tables"]["sales_opportunities"]["Update"]

export type Account = PublicSchema["Tables"]["crm_accounts"]["Row"]
export type Contact = PublicSchema["Tables"]["crm_contacts"]["Row"]
export type OpportunitySkill = PublicSchema["Tables"]["sales_opportunity_skills"]["Row"]
export type OpportunityEvent = PublicSchema["Tables"]["sales_opportunity_events"]["Row"]

export type SalesStage = PublicSchema["Enums"]["sales_stage"]
export type SalesOutcome = PublicSchema["Enums"]["sales_outcome"]
export type SalesPriority = PublicSchema["Enums"]["sales_priority"]

