// ============================================================
//  KREDO — Types de la base de données
//  GÉNÉRÉ depuis le schéma Supabase. NE PAS éditer à la main.
//  Régénérer après chaque migration :
//    npx supabase gen types typescript --project-id jvzgmhvwirsbdkjpmvla > src/types/database.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      sales_opportunities: {
        Row: {
          account_id: string | null                                        // nullable depuis migration 002
          acv: number | null                                               // GENERATED : duration × target_daily_rate
          client_context: string | null
          conviction: number
          created_at: string
          duration: number | null                                          // durée en jours (migration 002)
          engagement_notes: string | null
          estimated_gain: number | null
          id: string
          need_detail: string | null
          need_summary: string | null
          outcome: Database["public"]["Enums"]["sales_outcome"] | null
          owner_id: string
          priority: Database["public"]["Enums"]["sales_priority"]
          stage: Database["public"]["Enums"]["sales_stage"]
          start_date: string | null                                        // date ISO (migration 002)
          target_close_date: string | null
          target_daily_rate: number | null
          title: string
          updated_at: string
          weighted_gain: number | null                                     // GENERATED : estimated_gain × conviction / 100
        }
        Insert: {
          account_id?: string | null
          // acv — colonne GENERATED, ne pas inclure dans Insert
          client_context?: string | null
          conviction?: number
          created_at?: string
          duration?: number | null
          engagement_notes?: string | null
          estimated_gain?: number | null
          id?: string
          need_detail?: string | null
          need_summary?: string | null
          outcome?: Database["public"]["Enums"]["sales_outcome"] | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["sales_priority"]
          stage?: Database["public"]["Enums"]["sales_stage"]
          start_date?: string | null
          target_close_date?: string | null
          target_daily_rate?: number | null
          title: string
          updated_at?: string
          // weighted_gain — colonne GENERATED, ne pas inclure dans Insert
        }
        Update: {
          account_id?: string | null
          // acv — colonne GENERATED, ne pas inclure dans Update
          client_context?: string | null
          conviction?: number
          created_at?: string
          duration?: number | null
          engagement_notes?: string | null
          estimated_gain?: number | null
          id?: string
          need_detail?: string | null
          need_summary?: string | null
          outcome?: Database["public"]["Enums"]["sales_outcome"] | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["sales_priority"]
          stage?: Database["public"]["Enums"]["sales_stage"]
          start_date?: string | null
          target_close_date?: string | null
          target_daily_rate?: number | null
          title?: string
          updated_at?: string
          // weighted_gain — colonne GENERATED, ne pas inclure dans Update
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
      sales_stage: "en_cours" | "cv_sent" | "rt" | "win" | "lost" | "non_traitee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ------------------------------------------------------------
//  Raccourcis pratiques (à enrichir au fil des modules)
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
