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
      ai_intelligence_logs: {
        Row: {
          action: string
          company_id: string | null
          cost_estimate: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          message: string | null
          metadata: Json
          model_provider: string | null
          model_used: string | null
          phase: number | null
          result_id: string | null
          run_id: string | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
          workspace_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          model_provider?: string | null
          model_used?: string | null
          phase?: number | null
          result_id?: string | null
          run_id?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          workspace_id?: string
        }
        Update: {
          action?: string
          company_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          model_provider?: string | null
          model_used?: string | null
          phase?: number | null
          result_id?: string | null
          run_id?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_intelligence_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_intelligence_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_intelligence_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_intelligence_logs_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "ai_intelligence_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_intelligence_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_intelligence_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_intelligence_results: {
        Row: {
          company_id: string
          completed_at: string | null
          content_json: Json
          content_text: string | null
          cost_estimate: number | null
          created_at: string
          duration_ms: number | null
          id: string
          metadata: Json
          model_provider: string | null
          model_used: string | null
          needs_review: boolean
          owner_id: string
          phase: number
          result_type: string
          run_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["ai_result_status"]
          title: string | null
          tokens_input: number | null
          tokens_output: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          content_json?: Json
          content_text?: string | null
          cost_estimate?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          metadata?: Json
          model_provider?: string | null
          model_used?: string | null
          needs_review?: boolean
          owner_id?: string
          phase: number
          result_type: string
          run_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_result_status"]
          title?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          content_json?: Json
          content_text?: string | null
          cost_estimate?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          metadata?: Json
          model_provider?: string | null
          model_used?: string | null
          needs_review?: boolean
          owner_id?: string
          phase?: number
          result_type?: string
          run_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_result_status"]
          title?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_intelligence_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_intelligence_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_intelligence_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_intelligence_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_intelligence_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_intelligence_runs: {
        Row: {
          company_id: string
          completed_at: string | null
          config: Json
          created_at: string
          current_phase: number
          error_message: string | null
          failed_at: string | null
          id: string
          input_snapshot: Json
          needs_review: boolean
          owner_id: string
          run_type: string
          started_at: string | null
          status: Database["public"]["Enums"]["ai_run_status"]
          total_cost_estimate: number
          total_tokens_input: number
          total_tokens_output: number
          trigger_source: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          config?: Json
          created_at?: string
          current_phase?: number
          error_message?: string | null
          failed_at?: string | null
          id?: string
          input_snapshot?: Json
          needs_review?: boolean
          owner_id?: string
          run_type?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_run_status"]
          total_cost_estimate?: number
          total_tokens_input?: number
          total_tokens_output?: number
          trigger_source?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          config?: Json
          created_at?: string
          current_phase?: number
          error_message?: string | null
          failed_at?: string | null
          id?: string
          input_snapshot?: Json
          needs_review?: boolean
          owner_id?: string
          run_type?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_run_status"]
          total_cost_estimate?: number
          total_tokens_input?: number
          total_tokens_output?: number
          trigger_source?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_intelligence_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_intelligence_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "ai_intelligence_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity_id: string | null
          entity_type: string
          id: number
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: never
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: never
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          availability: string | null
          created_at: string
          expected_daily_rate: number | null
          expected_salary: number | null
          id: string
          internal_score: number | null
          metadata: Json
          mobility: string | null
          notes: string | null
          person_id: string
          recruiter_id: string | null
          seniority: string | null
          source: string | null
          status: string
          summary: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          availability?: string | null
          created_at?: string
          expected_daily_rate?: number | null
          expected_salary?: number | null
          id?: string
          internal_score?: number | null
          metadata?: Json
          mobility?: string | null
          notes?: string | null
          person_id: string
          recruiter_id?: string | null
          seniority?: string | null
          source?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          availability?: string | null
          created_at?: string
          expected_daily_rate?: number | null
          expected_salary?: number | null
          id?: string
          internal_score?: number | null
          metadata?: Json
          mobility?: string | null
          notes?: string | null
          person_id?: string
          recruiter_id?: string | null
          seniority?: string | null
          source?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          agency: string | null
          availability: string | null
          created_at: string
          current_title: string | null
          employee_ref: string | null
          entry_date: string | null
          exit_date: string | null
          id: string
          manager_id: string | null
          metadata: Json
          notes: string | null
          person_id: string
          practice: string | null
          seniority: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agency?: string | null
          availability?: string | null
          created_at?: string
          current_title?: string | null
          employee_ref?: string | null
          entry_date?: string | null
          exit_date?: string | null
          id?: string
          manager_id?: string | null
          metadata?: Json
          notes?: string | null
          person_id: string
          practice?: string | null
          seniority?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          agency?: string | null
          availability?: string | null
          created_at?: string
          current_title?: string | null
          employee_ref?: string | null
          entry_date?: string | null
          exit_date?: string | null
          id?: string
          manager_id?: string | null
          metadata?: Json
          notes?: string | null
          person_id?: string
          practice?: string | null
          seniority?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "collaborators_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "collaborators_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_score: number | null
          created_at: string
          description: string | null
          employee_count: number | null
          health: string | null
          hq_location: string | null
          id: string
          last_contact_at: string | null
          legal_name: string | null
          lifecycle_status: string
          metadata: Json
          name: string
          next_action_at: string | null
          next_action_label: string | null
          owner_id: string | null
          priority: string
          revenue: string | null
          sector: string | null
          segment: string | null
          size_band: string | null
          tags: string[]
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          ai_score?: number | null
          created_at?: string
          description?: string | null
          employee_count?: number | null
          health?: string | null
          hq_location?: string | null
          id?: string
          last_contact_at?: string | null
          legal_name?: string | null
          lifecycle_status?: string
          metadata?: Json
          name: string
          next_action_at?: string | null
          next_action_label?: string | null
          owner_id?: string | null
          priority?: string
          revenue?: string | null
          sector?: string | null
          segment?: string | null
          size_band?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Update: {
          ai_score?: number | null
          created_at?: string
          description?: string | null
          employee_count?: number | null
          health?: string | null
          hq_location?: string | null
          id?: string
          last_contact_at?: string | null
          legal_name?: string | null
          lifecycle_status?: string
          metadata?: Json
          name?: string
          next_action_at?: string | null
          next_action_label?: string | null
          owner_id?: string | null
          priority?: string
          revenue?: string | null
          sector?: string | null
          segment?: string | null
          size_band?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_relationships: {
        Row: {
          company_id: string
          created_at: string
          from_contact_id: string
          id: string
          notes: string | null
          relationship_type: string
          to_contact_id: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          from_contact_id: string
          id?: string
          notes?: string | null
          relationship_type: string
          to_contact_id: string
          workspace_id?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          from_contact_id?: string
          id?: string
          notes?: string | null
          relationship_type?: string
          to_contact_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_relationships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_relationships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_relationships_from_contact_id_fkey"
            columns: ["from_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_to_contact_id_fkey"
            columns: ["to_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          campaign_id: string | null
          company_id: string | null
          created_at: string
          decision_power: string | null
          department: string | null
          id: string
          is_priority: boolean | null
          job_title: string | null
          manager_contact_id: string | null
          person_id: string
          relationship_level: string | null
          relationship_role: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string
          decision_power?: string | null
          department?: string | null
          id?: string
          is_priority?: boolean | null
          job_title?: string | null
          manager_contact_id?: string | null
          person_id: string
          relationship_level?: string | null
          relationship_role?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string
          decision_power?: string | null
          department?: string | null
          id?: string
          is_priority?: boolean | null
          job_title?: string | null
          manager_contact_id?: string | null
          person_id?: string
          relationship_level?: string | null
          relationship_role?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          author_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          details: Json
          id: string
          next_action: string | null
          occurred_at: string
          opportunity_id: string | null
          sentiment: string | null
          summary: string | null
          type: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          next_action?: string | null
          occurred_at?: string
          opportunity_id?: string | null
          sentiment?: string | null
          summary?: string | null
          type: string
          workspace_id?: string
        }
        Update: {
          author_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          next_action?: string | null
          occurred_at?: string
          opportunity_id?: string | null
          sentiment?: string | null
          summary?: string | null
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      match_scores: {
        Row: {
          created_at: string
          id: string
          model_version: string | null
          opportunity_id: string
          overall_score: number | null
          person_id: string
          scores: Json
          source_run_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_version?: string | null
          opportunity_id: string
          overall_score?: number | null
          person_id: string
          scores?: Json
          source_run_id?: string | null
          workspace_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          model_version?: string | null
          opportunity_id?: string
          overall_score?: number | null
          person_id?: string
          scores?: Json
          source_run_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_scores_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_scores_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_scores_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "match_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_activity_reports: {
        Row: {
          billable_days: number
          collaborator_id: string
          created_at: string
          id: string
          metadata: Json
          mission_id: string
          non_billable_days: number
          period_end: string
          period_start: string
          status: string
          taci_snapshot: number
          tjm_snapshot: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billable_days: number
          collaborator_id: string
          created_at?: string
          id?: string
          metadata?: Json
          mission_id: string
          non_billable_days?: number
          period_end: string
          period_start: string
          status?: string
          taci_snapshot: number
          tjm_snapshot: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          billable_days?: number
          collaborator_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          mission_id?: string
          non_billable_days?: number
          period_end?: string
          period_start?: string
          status?: string
          taci_snapshot?: number
          tjm_snapshot?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_activity_reports_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_activity_reports_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "mission_activity_reports_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_activity_reports_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["mission_id"]
          },
          {
            foreignKeyName: "mission_activity_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          collaborator_id: string
          company_id: string
          created_at: string
          end_date: string | null
          external_ref: string | null
          gross_margin_pct: number | null
          id: string
          metadata: Json
          opportunity_id: string | null
          practice: string | null
          role_title: string | null
          seniority: string | null
          source: string | null
          start_date: string | null
          status: string
          taci: number
          tags: string[]
          title: string
          tjm: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          collaborator_id: string
          company_id: string
          created_at?: string
          end_date?: string | null
          external_ref?: string | null
          gross_margin_pct?: number | null
          id?: string
          metadata?: Json
          opportunity_id?: string | null
          practice?: string | null
          role_title?: string | null
          seniority?: string | null
          source?: string | null
          start_date?: string | null
          status?: string
          taci: number
          tags?: string[]
          title: string
          tjm: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          collaborator_id?: string
          company_id?: string
          created_at?: string
          end_date?: string | null
          external_ref?: string | null
          gross_margin_pct?: number | null
          id?: string
          metadata?: Json
          opportunity_id?: string | null
          practice?: string | null
          role_title?: string | null
          seniority?: string | null
          source?: string | null
          start_date?: string | null
          status?: string
          taci?: number
          tags?: string[]
          title?: string
          tjm?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "missions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "missions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "missions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          acv: number | null
          closed_at: string | null
          company_id: string | null
          context: Json
          conviction: number
          created_at: string
          duration_days: number | null
          estimated_gain: number | null
          id: string
          location: string | null
          loss_reason: string | null
          need_summary: string | null
          next_action_at: string | null
          next_action_label: string | null
          opportunity_type: string | null
          owner_id: string | null
          practice: string | null
          priority: string
          remote_policy: string | null
          seniority: string | null
          source: string | null
          stage: string
          start_date: string | null
          tags: string[]
          target_close_date: string | null
          target_daily_rate: number | null
          target_margin_pct: number | null
          title: string
          updated_at: string
          weighted_gain: number | null
          win_reason: string | null
          workspace_id: string
        }
        Insert: {
          acv?: number | null
          closed_at?: string | null
          company_id?: string | null
          context?: Json
          conviction?: number
          created_at?: string
          duration_days?: number | null
          estimated_gain?: number | null
          id?: string
          location?: string | null
          loss_reason?: string | null
          need_summary?: string | null
          next_action_at?: string | null
          next_action_label?: string | null
          opportunity_type?: string | null
          owner_id?: string | null
          practice?: string | null
          priority?: string
          remote_policy?: string | null
          seniority?: string | null
          source?: string | null
          stage?: string
          start_date?: string | null
          tags?: string[]
          target_close_date?: string | null
          target_daily_rate?: number | null
          target_margin_pct?: number | null
          title: string
          updated_at?: string
          weighted_gain?: number | null
          win_reason?: string | null
          workspace_id?: string
        }
        Update: {
          acv?: number | null
          closed_at?: string | null
          company_id?: string | null
          context?: Json
          conviction?: number
          created_at?: string
          duration_days?: number | null
          estimated_gain?: number | null
          id?: string
          location?: string | null
          loss_reason?: string | null
          need_summary?: string | null
          next_action_at?: string | null
          next_action_label?: string | null
          opportunity_type?: string | null
          owner_id?: string | null
          practice?: string | null
          priority?: string
          remote_policy?: string | null
          seniority?: string | null
          source?: string | null
          stage?: string
          start_date?: string | null
          tags?: string[]
          target_close_date?: string | null
          target_daily_rate?: number | null
          target_margin_pct?: number | null
          title?: string
          updated_at?: string
          weighted_gain?: number | null
          win_reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_candidates: {
        Row: {
          candidate_id: string
          client_feedback: string | null
          comment: string | null
          created_at: string
          id: string
          next_action: string | null
          opportunity_id: string
          proposed_at: string | null
          recruiter_id: string | null
          sent_to_client_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          candidate_id: string
          client_feedback?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          next_action?: string | null
          opportunity_id: string
          proposed_at?: string | null
          recruiter_id?: string | null
          sent_to_client_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          candidate_id?: string
          client_feedback?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          next_action?: string | null
          opportunity_id?: string
          proposed_at?: string | null
          recruiter_id?: string | null
          sent_to_client_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidates_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_contacts: {
        Row: {
          contact_id: string
          opportunity_id: string
          role: string | null
          workspace_id: string
        }
        Insert: {
          contact_id: string
          opportunity_id: string
          role?: string | null
          workspace_id?: string
        }
        Update: {
          contact_id?: string
          opportunity_id?: string
          role?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_skills: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          importance: string
          min_level: number | null
          min_years: number | null
          opportunity_id: string
          skill_id: string
          weight: number
          workspace_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          importance?: string
          min_level?: number | null
          min_years?: number | null
          opportunity_id: string
          skill_id: string
          weight?: number
          workspace_id?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          importance?: string
          min_level?: number | null
          min_years?: number | null
          opportunity_id?: string
          skill_id?: string
          weight?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_skills_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_skills_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      person_skills: {
        Row: {
          comment: string | null
          confidence: number | null
          created_at: string
          id: string
          last_used_year: number | null
          level: number | null
          person_id: string
          skill_id: string
          source: string | null
          workspace_id: string
          years: number | null
        }
        Insert: {
          comment?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          last_used_year?: number | null
          level?: number | null
          person_id: string
          skill_id: string
          source?: string | null
          workspace_id?: string
          years?: number | null
        }
        Update: {
          comment?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          last_used_year?: number | null
          level?: number | null
          person_id?: string
          skill_id?: string
          source?: string | null
          workspace_id?: string
          years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "person_skills_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_skills_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_skills_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          metadata: Json
          notes: string | null
          phone: string | null
          primary_email: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          primary_email?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          primary_email?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persons_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          ui_prefs: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          ui_prefs?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          ui_prefs?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          aliases: string[]
          category: string | null
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          aliases?: string[]
          category?: string | null
          created_at?: string
          id?: string
          name: string
          workspace_id?: string
        }
        Update: {
          aliases?: string[]
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          priority: string
          status: string
          title: string
          type: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_ai_intelligence_summary: {
        Row: {
          ai_score: number | null
          company_id: string | null
          company_name: string | null
          count_results: number | null
          count_runs: number | null
          has_client_analysis: boolean | null
          has_legacy_analysis: boolean | null
          has_legacy_pitches: boolean | null
          has_legacy_sector: boolean | null
          has_process_diagnostic: boolean | null
          has_roadmap: boolean | null
          has_sector_analysis: boolean | null
          latest_run_at: string | null
          latest_run_status: Database["public"]["Enums"]["ai_run_status"] | null
          priority: string | null
          sector: string | null
        }
        Relationships: []
      }
      v_mission_quarterly_revenue: {
        Row: {
          billable_days: number | null
          collaborator_id: string | null
          company_id: string | null
          company_name: string | null
          consultant_name: string | null
          cost: number | null
          employee_ref: string | null
          external_ref: string | null
          gross_margin: number | null
          gross_margin_pct: number | null
          mission_id: string | null
          mission_status: string | null
          mission_title: string | null
          person_id: string | null
          practice: string | null
          quarter_label: string | null
          quarter_start: string | null
          revenue: number | null
          role_title: string | null
          seniority: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_activity_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_workspace_id: { Args: never; Returns: string }
    }
    Enums: {
      ai_result_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
      ai_run_status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
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
      ai_result_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
      ],
      ai_run_status: ["queued", "running", "succeeded", "failed", "cancelled"],
    },
  },
} as const

// ------------------------------------------------------------
//  Raccourcis pratiques
// ------------------------------------------------------------
type PublicSchema = Database["public"]

export type Opportunity = PublicSchema["Tables"]["opportunities"]["Row"] & {
  account_id?: string | null
  duration?: number | null
  need_detail?: string | null
  client_context?: string | null
  engagement_notes?: string | null
  outcome?: SalesOutcome | null
}
export type OpportunityInsert = PublicSchema["Tables"]["opportunities"]["Insert"]
export type OpportunityUpdate = PublicSchema["Tables"]["opportunities"]["Update"]

export type Account = PublicSchema["Tables"]["companies"]["Row"]

export type Mission = PublicSchema["Tables"]["missions"]["Row"]
export type MissionInsert = PublicSchema["Tables"]["missions"]["Insert"]
export type MissionUpdate = PublicSchema["Tables"]["missions"]["Update"]

export type Contact = {
  id: string
  account_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  notes: string | null
  created_at: string
}

export type OpportunitySkill = {
  id: string
  opportunity_id: string
  skill_name: string
  importance: SkillImportance
  min_years: number | null
  created_at: string
}

export type OpportunityEvent = {
  id: string
  opportunity_id: string
  event_type: string
  body: string | null
  occurred_at: string
}

export type SalesStage = "detection" | "cv_envoyes" | "entretien_client" | "gagne" | "perdu" | "abandonne"
export type SalesOutcome = "gagnee" | "perdue" | "abandonnee"
export type SalesPriority = "haute" | "moyenne" | "basse"
export type ContactRole = "decisionnaire" | "operationnel" | "prescripteur" | "achat"
export type SkillImportance = "indispensable" | "souhaitee" | "bonus"

