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
      account_facts: {
        Row: {
          cardinality: string
          confidence_score: number
          created_at: string
          effective_at: string | null
          expires_at: string | null
          fact_subtype: string | null
          fact_type: string
          id: string
          is_current: boolean
          normalized_value: string
          normalized_value_hash: string
          origin: string
          primary_source_id: string | null
          source_proposal_id: string | null
          target_id: string
          target_type: string
          updated_at: string
          value_json: Json | null
          value_text: string | null
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          cardinality: string
          confidence_score?: number
          created_at?: string
          effective_at?: string | null
          expires_at?: string | null
          fact_subtype?: string | null
          fact_type: string
          id?: string
          is_current?: boolean
          normalized_value: string
          normalized_value_hash: string
          origin: string
          primary_source_id?: string | null
          source_proposal_id?: string | null
          target_id: string
          target_type: string
          updated_at?: string
          value_json?: Json | null
          value_text?: string | null
          verified_at?: string | null
          workspace_id?: string
        }
        Update: {
          cardinality?: string
          confidence_score?: number
          created_at?: string
          effective_at?: string | null
          expires_at?: string | null
          fact_subtype?: string | null
          fact_type?: string
          id?: string
          is_current?: boolean
          normalized_value?: string
          normalized_value_hash?: string
          origin?: string
          primary_source_id?: string | null
          source_proposal_id?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string
          value_json?: Json | null
          value_text?: string | null
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_facts_primary_source_id_fkey"
            columns: ["primary_source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_facts_source_proposal_id_fkey"
            columns: ["source_proposal_id"]
            isOneToOne: false
            referencedRelation: "enrichment_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_facts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      account_signals: {
        Row: {
          company_id: string
          confidence_score: number
          created_at: string
          dedupe_key: string
          detected_at: string
          event_at: string | null
          expires_at: string | null
          global_score: number
          id: string
          last_evidence_at: string
          potential_value_score: number
          primary_source_id: string | null
          recommended_action: string | null
          recommended_practice_id: string | null
          relevance_score: number
          run_id: string | null
          score_details: Json
          score_justification: string | null
          scoring_rules_version: string
          signal_category: string
          signal_type: string
          status: string
          suggested_contact_id: string | null
          summary: string | null
          taxonomy_version: string
          title: string
          updated_at: string
          urgency_score: number
          workspace_id: string
        }
        Insert: {
          company_id: string
          confidence_score?: number
          created_at?: string
          dedupe_key: string
          detected_at?: string
          event_at?: string | null
          expires_at?: string | null
          global_score?: number
          id?: string
          last_evidence_at?: string
          potential_value_score?: number
          primary_source_id?: string | null
          recommended_action?: string | null
          recommended_practice_id?: string | null
          relevance_score?: number
          run_id?: string | null
          score_details?: Json
          score_justification?: string | null
          scoring_rules_version?: string
          signal_category: string
          signal_type: string
          status?: string
          suggested_contact_id?: string | null
          summary?: string | null
          taxonomy_version?: string
          title: string
          updated_at?: string
          urgency_score?: number
          workspace_id?: string
        }
        Update: {
          company_id?: string
          confidence_score?: number
          created_at?: string
          dedupe_key?: string
          detected_at?: string
          event_at?: string | null
          expires_at?: string | null
          global_score?: number
          id?: string
          last_evidence_at?: string
          potential_value_score?: number
          primary_source_id?: string | null
          recommended_action?: string | null
          recommended_practice_id?: string | null
          relevance_score?: number
          run_id?: string | null
          score_details?: Json
          score_justification?: string | null
          scoring_rules_version?: string
          signal_category?: string
          signal_type?: string
          status?: string
          suggested_contact_id?: string | null
          summary?: string | null
          taxonomy_version?: string
          title?: string
          updated_at?: string
          urgency_score?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "account_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "account_signals_primary_source_id_fkey"
            columns: ["primary_source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signals_recommended_practice_id_fkey"
            columns: ["recommended_practice_id"]
            isOneToOne: false
            referencedRelation: "offer_practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_intelligence_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signals_suggested_contact_id_fkey"
            columns: ["suggested_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_signals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      calendar_events: {
        Row: {
          all_day: boolean
          candidate_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          ends_at: string
          event_type: string
          id: string
          location: string | null
          meeting_url: string | null
          metadata: Json
          opportunity_id: string | null
          organizer_id: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          all_day?: boolean
          candidate_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          event_type: string
          id?: string
          location?: string | null
          meeting_url?: string | null
          metadata?: Json
          opportunity_id?: string | null
          organizer_id?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          all_day?: boolean
          candidate_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          event_type?: string
          id?: string
          location?: string | null
          meeting_url?: string | null
          metadata?: Json
          opportunity_id?: string | null
          organizer_id?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "calendar_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_hiring_milestones: {
        Row: {
          calendar_event_id: string | null
          completed_at: string | null
          created_at: string
          hiring_process_id: string
          id: string
          notes: string | null
          result: string
          scheduled_at: string | null
          step: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          calendar_event_id?: string | null
          completed_at?: string | null
          created_at?: string
          hiring_process_id: string
          id?: string
          notes?: string | null
          result?: string
          scheduled_at?: string | null
          step: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          calendar_event_id?: string | null
          completed_at?: string | null
          created_at?: string
          hiring_process_id?: string
          id?: string
          notes?: string | null
          result?: string
          scheduled_at?: string | null
          step?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_hiring_milestones_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_hiring_milestones_hiring_process_id_fkey"
            columns: ["hiring_process_id"]
            isOneToOne: false
            referencedRelation: "candidate_hiring_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_hiring_milestones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_hiring_processes: {
        Row: {
          candidate_id: string
          close_reason: string | null
          closed_at: string | null
          created_at: string
          current_step: string
          id: string
          job_profile_id: string | null
          recruiter_id: string | null
          started_at: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          candidate_id: string
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          current_step?: string
          id?: string
          job_profile_id?: string | null
          recruiter_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          candidate_id?: string
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          current_step?: string
          id?: string
          job_profile_id?: string | null
          recruiter_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_hiring_processes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_hiring_processes_job_profile_id_fkey"
            columns: ["job_profile_id"]
            isOneToOne: false
            referencedRelation: "job_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_hiring_processes_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_hiring_processes_workspace_id_fkey"
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
          current_title: string | null
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
          current_title?: string | null
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
          current_title?: string | null
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
      client_closures: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          is_recurring: boolean
          label: string
          notes: string | null
          start_date: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          is_recurring?: boolean
          label: string
          notes?: string | null
          start_date: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_recurring?: boolean
          label?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_closures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_closures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "client_closures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "client_closures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_absences: {
        Row: {
          absence_type: Database["public"]["Enums"]["absence_type"]
          collaborator_id: string
          created_at: string
          duration_days: number
          end_date: string
          id: string
          metadata: Json
          notes: string | null
          start_date: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          absence_type: Database["public"]["Enums"]["absence_type"]
          collaborator_id: string
          created_at?: string
          duration_days: number
          end_date: string
          id?: string
          metadata?: Json
          notes?: string | null
          start_date: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          absence_type?: Database["public"]["Enums"]["absence_type"]
          collaborator_id?: string
          created_at?: string
          duration_days?: number
          end_date?: string
          id?: string
          metadata?: Json
          notes?: string | null
          start_date?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_absences_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_absences_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_collaborator_ytd_activity"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "collaborator_absences_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "collaborator_absences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_compensation: {
        Row: {
          charges_rate: number
          cjm: number | null
          collaborator_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          gross_annual: number
          id: string
          notes: string | null
          taci: number
          updated_at: string
          variable_pay: number | null
          working_days_per_year: number
          workspace_id: string
        }
        Insert: {
          charges_rate?: number
          cjm?: number | null
          collaborator_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          gross_annual: number
          id?: string
          notes?: string | null
          taci?: number
          updated_at?: string
          variable_pay?: number | null
          working_days_per_year?: number
          workspace_id?: string
        }
        Update: {
          charges_rate?: number
          cjm?: number | null
          collaborator_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          gross_annual?: number
          id?: string
          notes?: string | null
          taci?: number
          updated_at?: string
          variable_pay?: number | null
          working_days_per_year?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_compensation_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_compensation_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_collaborator_ytd_activity"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "collaborator_compensation_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "collaborator_compensation_workspace_id_fkey"
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
            referencedRelation: "v_collaborator_ytd_activity"
            referencedColumns: ["collaborator_id"]
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
          knowledge_state: string
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
          sector_id: string | null
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
          knowledge_state?: string
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
          sector_id?: string | null
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
          knowledge_state?: string
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
          sector_id?: string | null
          segment?: string | null
          size_band?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_intelligence"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "contacts_manager_contact_id_fkey"
            columns: ["manager_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
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
      enrichment_proposals: {
        Row: {
          application_conflict: Json | null
          application_error: string | null
          applied_at: string | null
          applied_by: string | null
          attribute_name: string
          attribute_subkey: string | null
          confidence_score: number
          created_at: string
          decided_by: string | null
          decision_at: string | null
          decision_reason: string | null
          id: string
          initial_snapshot: Json
          justification: string | null
          normalized_value: Json
          normalized_value_hash: string
          old_value: Json | null
          origin: string
          primary_source_id: string | null
          proposal_key: string
          proposed_value: Json
          requested_by: string | null
          run_id: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          application_conflict?: Json | null
          application_error?: string | null
          applied_at?: string | null
          applied_by?: string | null
          attribute_name: string
          attribute_subkey?: string | null
          confidence_score?: number
          created_at?: string
          decided_by?: string | null
          decision_at?: string | null
          decision_reason?: string | null
          id?: string
          initial_snapshot?: Json
          justification?: string | null
          normalized_value?: Json
          normalized_value_hash: string
          old_value?: Json | null
          origin: string
          primary_source_id?: string | null
          proposal_key: string
          proposed_value: Json
          requested_by?: string | null
          run_id?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          application_conflict?: Json | null
          application_error?: string | null
          applied_at?: string | null
          applied_by?: string | null
          attribute_name?: string
          attribute_subkey?: string | null
          confidence_score?: number
          created_at?: string
          decided_by?: string | null
          decision_at?: string | null
          decision_reason?: string | null
          id?: string
          initial_snapshot?: Json
          justification?: string | null
          normalized_value?: Json
          normalized_value_hash?: string
          old_value?: Json | null
          origin?: string
          primary_source_id?: string | null
          proposal_key?: string
          proposed_value?: Json
          requested_by?: string | null
          run_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_proposals_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_proposals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_proposals_primary_source_id_fkey"
            columns: ["primary_source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_proposals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_proposals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_intelligence_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_source_links: {
        Row: {
          created_at: string
          id: string
          link_role: string
          object_id: string
          object_type: string
          source_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_role: string
          object_id: string
          object_type: string
          source_id: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          link_role?: string
          object_id?: string
          object_type?: string
          source_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_source_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_source_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_sources: {
        Row: {
          canonical_url: string | null
          collected_at: string
          collection_method: string
          content_hash: string | null
          created_at: string
          evidence_excerpt: string | null
          external_reference: string | null
          id: string
          published_at: string | null
          reliability_score: number
          source_key: string
          source_name: string
          source_type: string
          source_url: string | null
          technical_metadata: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          canonical_url?: string | null
          collected_at?: string
          collection_method: string
          content_hash?: string | null
          created_at?: string
          evidence_excerpt?: string | null
          external_reference?: string | null
          id?: string
          published_at?: string | null
          reliability_score?: number
          source_key: string
          source_name: string
          source_type: string
          source_url?: string | null
          technical_metadata?: Json
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          canonical_url?: string | null
          collected_at?: string
          collection_method?: string
          content_hash?: string | null
          created_at?: string
          evidence_excerpt?: string | null
          external_reference?: string | null
          id?: string
          published_at?: string | null
          reliability_score?: number
          source_key?: string
          source_name?: string
          source_type?: string
          source_url?: string | null
          technical_metadata?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_sources_workspace_id_fkey"
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
          calendar_event_id: string | null
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
          calendar_event_id?: string | null
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
          calendar_event_id?: string | null
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
            foreignKeyName: "interactions_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: true
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
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
      job_profiles: {
        Row: {
          created_at: string
          embedding: string | null
          id: string
          is_active: boolean
          kpis: string[]
          main_mission: string
          metadata: Json
          practice_id: string
          responsibilities: string[]
          source: string
          tech_stack: string[]
          title: string
          updated_at: string
          version: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          id?: string
          is_active?: boolean
          kpis?: string[]
          main_mission: string
          metadata?: Json
          practice_id: string
          responsibilities?: string[]
          source?: string
          tech_stack?: string[]
          title: string
          updated_at?: string
          version?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          id?: string
          is_active?: boolean
          kpis?: string[]
          main_mission?: string
          metadata?: Json
          practice_id?: string
          responsibilities?: string[]
          source?: string
          tech_stack?: string[]
          title?: string
          updated_at?: string
          version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_profiles_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "offer_practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_profiles_workspace_id_fkey"
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
          activity_rate_percent: number | null
          billable_days: number
          business_days: number
          cjm_snapshot: number
          collaborator_id: string
          created_at: string
          id: string
          metadata: Json
          mission_id: string
          non_billable_days: number
          period_end: string
          period_start: string
          pto_days: number
          sick_days: number
          status: string
          tjm_snapshot: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activity_rate_percent?: number | null
          billable_days: number
          business_days?: number
          cjm_snapshot: number
          collaborator_id: string
          created_at?: string
          id?: string
          metadata?: Json
          mission_id: string
          non_billable_days?: number
          period_end: string
          period_start: string
          pto_days?: number
          sick_days?: number
          status?: string
          tjm_snapshot: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          activity_rate_percent?: number | null
          billable_days?: number
          business_days?: number
          cjm_snapshot?: number
          collaborator_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          mission_id?: string
          non_billable_days?: number
          period_end?: string
          period_start?: string
          pto_days?: number
          sick_days?: number
          status?: string
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
            referencedRelation: "v_collaborator_ytd_activity"
            referencedColumns: ["collaborator_id"]
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
          billing_condition: string | null
          cjm: number
          collaborator_id: string
          company_id: string
          created_at: string
          description: string | null
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
          tags: string[]
          title: string
          tjm: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_condition?: string | null
          cjm: number
          collaborator_id: string
          company_id: string
          created_at?: string
          description?: string | null
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
          tags?: string[]
          title: string
          tjm: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          billing_condition?: string | null
          cjm?: number
          collaborator_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
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
            referencedRelation: "v_collaborator_ytd_activity"
            referencedColumns: ["collaborator_id"]
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
      offer_engagement_types: {
        Row: {
          billing_model: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          typical_duration: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_model: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          typical_duration?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          billing_model?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          typical_duration?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      offer_practices: {
        Row: {
          color_hex: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          perimeter: string | null
          slug: string
          sort_order: number
          stack_tags: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          perimeter?: string | null
          slug: string
          sort_order?: number
          stack_tags?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          perimeter?: string | null
          slug?: string
          sort_order?: number
          stack_tags?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      offer_pricing_grids: {
        Row: {
          created_at: string
          currency: string
          engagement_type_id: string | null
          id: string
          job_profile_id: string | null
          location: string | null
          notes: string | null
          offer_id: string | null
          practice_id: string | null
          profile_name: string
          seniority_level: string
          tjm_max: number | null
          tjm_min: number | null
          tjm_recommended: number | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          engagement_type_id?: string | null
          id?: string
          job_profile_id?: string | null
          location?: string | null
          notes?: string | null
          offer_id?: string | null
          practice_id?: string | null
          profile_name: string
          seniority_level: string
          tjm_max?: number | null
          tjm_min?: number | null
          tjm_recommended?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          workspace_id?: string
        }
        Update: {
          created_at?: string
          currency?: string
          engagement_type_id?: string | null
          id?: string
          job_profile_id?: string | null
          location?: string | null
          notes?: string | null
          offer_id?: string | null
          practice_id?: string | null
          profile_name?: string
          seniority_level?: string
          tjm_max?: number | null
          tjm_min?: number | null
          tjm_recommended?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_pricing_grids_engagement_type_id_fkey"
            columns: ["engagement_type_id"]
            isOneToOne: false
            referencedRelation: "offer_engagement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_pricing_grids_job_profile_id_fkey"
            columns: ["job_profile_id"]
            isOneToOne: false
            referencedRelation: "job_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_pricing_grids_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_pricing_grids_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "offer_practices"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          full_description: string | null
          id: string
          is_active: boolean
          keywords: string[]
          name: string
          practice_id: string
          short_description: string | null
          slug: string
          sort_order: number
          typical_deliverables: string[]
          typical_profiles: string[]
          updated_at: string
          use_cases: string[]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          full_description?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          name: string
          practice_id: string
          short_description?: string | null
          slug: string
          sort_order?: number
          typical_deliverables?: string[]
          typical_profiles?: string[]
          updated_at?: string
          use_cases?: string[]
          workspace_id?: string
        }
        Update: {
          created_at?: string
          full_description?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          name?: string
          practice_id?: string
          short_description?: string | null
          slug?: string
          sort_order?: number
          typical_deliverables?: string[]
          typical_profiles?: string[]
          updated_at?: string
          use_cases?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "offer_practices"
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
          opened_at: string | null
          opportunity_type: string | null
          owner_id: string | null
          practice: string | null
          priority: string
          remote_policy: string | null
          required_headcount: number
          requires_staffing: boolean
          sector_id: string | null
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
          opened_at?: string | null
          opportunity_type?: string | null
          owner_id?: string | null
          practice?: string | null
          priority?: string
          remote_policy?: string | null
          required_headcount?: number
          requires_staffing?: boolean
          sector_id?: string | null
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
          opened_at?: string | null
          opportunity_type?: string | null
          owner_id?: string | null
          practice?: string | null
          priority?: string
          remote_policy?: string | null
          required_headcount?: number
          requires_staffing?: boolean
          sector_id?: string | null
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
            foreignKeyName: "opportunities_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_intelligence"
            referencedColumns: ["id"]
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
          positioning_origin: string | null
          proposed_at: string | null
          recruiter_id: string | null
          sent_to_client_at: string | null
          status: string
          status_changed_at: string | null
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
          positioning_origin?: string | null
          proposed_at?: string | null
          recruiter_id?: string | null
          sent_to_client_at?: string | null
          status?: string
          status_changed_at?: string | null
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
          positioning_origin?: string | null
          proposed_at?: string | null
          recruiter_id?: string | null
          sent_to_client_at?: string | null
          status?: string
          status_changed_at?: string | null
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
      performance_criteria: {
        Row: {
          code: string
          comparison_operator: string
          created_at: string
          id: string
          is_quantitative: boolean
          label: string
          metadata: Json
          objective_category: string
          plan_id: string
          target_value: number
          unit: string
          updated_at: string
          weight_pct: number
          workspace_id: string
        }
        Insert: {
          code: string
          comparison_operator: string
          created_at?: string
          id?: string
          is_quantitative?: boolean
          label: string
          metadata?: Json
          objective_category: string
          plan_id: string
          target_value: number
          unit: string
          updated_at?: string
          weight_pct: number
          workspace_id?: string
        }
        Update: {
          code?: string
          comparison_operator?: string
          created_at?: string
          id?: string
          is_quantitative?: boolean
          label?: string
          metadata?: Json
          objective_category?: string
          plan_id?: string
          target_value?: number
          unit?: string
          updated_at?: string
          weight_pct?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_criteria_plan_workspace_fkey"
            columns: ["plan_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "performance_plans"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "performance_criteria_plan_workspace_fkey"
            columns: ["plan_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "v_commercial_performance_monthly"
            referencedColumns: ["plan_id", "workspace_id"]
          },
          {
            foreignKeyName: "performance_criteria_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_plans: {
        Row: {
          baseline_end: string | null
          baseline_start: string | null
          created_at: string
          currency: string
          fiscal_year: number
          fixed_salary_amount: number
          id: string
          owner_profile_id: string
          period_end: string
          period_start: string
          role_title: string
          source: string
          status: string
          target_variable_amount: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          baseline_end?: string | null
          baseline_start?: string | null
          created_at?: string
          currency?: string
          fiscal_year: number
          fixed_salary_amount: number
          id?: string
          owner_profile_id: string
          period_end: string
          period_start: string
          role_title: string
          source?: string
          status?: string
          target_variable_amount: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          baseline_end?: string | null
          baseline_start?: string | null
          created_at?: string
          currency?: string
          fiscal_year?: number
          fixed_salary_amount?: number
          id?: string
          owner_profile_id?: string
          period_end?: string
          period_start?: string
          role_title?: string
          source?: string
          status?: string
          target_variable_amount?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_plans_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_plans_workspace_id_fkey"
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
      pnl_monthly: {
        Row: {
          created_at: string
          direct_costs_salaries: number
          direct_costs_subcontractors: number
          gross_margin_percent: number | null
          gross_margin_value: number | null
          id: string
          notes: string | null
          operating_profit_percent: number | null
          operating_profit_value: number | null
          period_month: string
          revenue_total: number
          source: string
          structural_costs_it: number
          structural_costs_mgmt: number
          structural_costs_rent: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          direct_costs_salaries?: number
          direct_costs_subcontractors?: number
          gross_margin_percent?: number | null
          gross_margin_value?: number | null
          id?: string
          notes?: string | null
          operating_profit_percent?: number | null
          operating_profit_value?: number | null
          period_month: string
          revenue_total: number
          source?: string
          structural_costs_it?: number
          structural_costs_mgmt?: number
          structural_costs_rent?: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          direct_costs_salaries?: number
          direct_costs_subcontractors?: number
          gross_margin_percent?: number | null
          gross_margin_value?: number | null
          id?: string
          notes?: string | null
          operating_profit_percent?: number | null
          operating_profit_value?: number | null
          period_month?: string
          revenue_total?: number
          source?: string
          structural_costs_it?: number
          structural_costs_mgmt?: number
          structural_costs_rent?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pnl_monthly_workspace_id_fkey"
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
      project_phases: {
        Row: {
          consumed_days: number
          created_at: string
          deliverables: string[]
          end_date_actual: string | null
          end_date_planned: string | null
          id: string
          label: string
          notes: string | null
          planned_days: number | null
          project_id: string
          sort_order: number
          start_date_actual: string | null
          start_date_planned: string | null
          status: Database["public"]["Enums"]["project_phase_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          consumed_days?: number
          created_at?: string
          deliverables?: string[]
          end_date_actual?: string | null
          end_date_planned?: string | null
          id?: string
          label: string
          notes?: string | null
          planned_days?: number | null
          project_id: string
          sort_order?: number
          start_date_actual?: string | null
          start_date_planned?: string | null
          status?: Database["public"]["Enums"]["project_phase_status"]
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          consumed_days?: number
          created_at?: string
          deliverables?: string[]
          end_date_actual?: string | null
          end_date_planned?: string | null
          id?: string
          label?: string
          notes?: string | null
          planned_days?: number | null
          project_id?: string
          sort_order?: number
          start_date_actual?: string | null
          start_date_planned?: string | null
          status?: Database["public"]["Enums"]["project_phase_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          actual_days: number
          allocation_pct: number | null
          collaborator_id: string | null
          contribution: string | null
          created_at: string
          daily_cost: number | null
          end_date: string | null
          id: string
          is_external: boolean
          is_project_lead: boolean
          planned_days: number | null
          project_id: string
          role_label: string
          seniority: string | null
          start_date: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actual_days?: number
          allocation_pct?: number | null
          collaborator_id?: string | null
          contribution?: string | null
          created_at?: string
          daily_cost?: number | null
          end_date?: string | null
          id?: string
          is_external?: boolean
          is_project_lead?: boolean
          planned_days?: number | null
          project_id: string
          role_label: string
          seniority?: string | null
          start_date?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          actual_days?: number
          allocation_pct?: number | null
          collaborator_id?: string | null
          contribution?: string | null
          created_at?: string
          daily_cost?: number | null
          end_date?: string | null
          id?: string
          is_external?: boolean
          is_project_lead?: boolean
          planned_days?: number | null
          project_id?: string
          role_label?: string
          seniority?: string | null
          start_date?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_collaborator_ytd_activity"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "project_team_members_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_margin_pct: number | null
          billing_milestones: Json
          code: string | null
          company_id: string
          contract_amount: number | null
          cost_actual: number
          cost_target: number | null
          created_at: string
          deliverables: string[]
          description: string | null
          end_date_actual: string | null
          end_date_planned: string | null
          engagement_type_id: string | null
          id: string
          lessons_learned: string | null
          metadata: Json
          offer_id: string | null
          opportunity_id: string | null
          owner_id: string | null
          progress_pct: number
          ref_anonymized_label: string | null
          ref_status: Database["public"]["Enums"]["project_ref_status"]
          ref_visibility: Database["public"]["Enums"]["project_ref_visibility"]
          scope: Json
          start_date_actual: string | null
          start_date_planned: string | null
          status: Database["public"]["Enums"]["project_status"]
          tags: string[]
          target_margin_pct: number | null
          technologies: string[]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actual_margin_pct?: number | null
          billing_milestones?: Json
          code?: string | null
          company_id: string
          contract_amount?: number | null
          cost_actual?: number
          cost_target?: number | null
          created_at?: string
          deliverables?: string[]
          description?: string | null
          end_date_actual?: string | null
          end_date_planned?: string | null
          engagement_type_id?: string | null
          id?: string
          lessons_learned?: string | null
          metadata?: Json
          offer_id?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          progress_pct?: number
          ref_anonymized_label?: string | null
          ref_status?: Database["public"]["Enums"]["project_ref_status"]
          ref_visibility?: Database["public"]["Enums"]["project_ref_visibility"]
          scope?: Json
          start_date_actual?: string | null
          start_date_planned?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[]
          target_margin_pct?: number | null
          technologies?: string[]
          title: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          actual_margin_pct?: number | null
          billing_milestones?: Json
          code?: string | null
          company_id?: string
          contract_amount?: number | null
          cost_actual?: number
          cost_target?: number | null
          created_at?: string
          deliverables?: string[]
          description?: string | null
          end_date_actual?: string | null
          end_date_planned?: string | null
          engagement_type_id?: string | null
          id?: string
          lessons_learned?: string | null
          metadata?: Json
          offer_id?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          progress_pct?: number
          ref_anonymized_label?: string | null
          ref_status?: Database["public"]["Enums"]["project_ref_status"]
          ref_visibility?: Database["public"]["Enums"]["project_ref_visibility"]
          scope?: Json
          start_date_actual?: string | null
          start_date_planned?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[]
          target_margin_pct?: number | null
          technologies?: string[]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_ai_intelligence_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "projects_engagement_type_id_fkey"
            columns: ["engagement_type_id"]
            isOneToOne: false
            referencedRelation: "offer_engagement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_events: {
        Row: {
          commercial_opportunity: string | null
          created_at: string
          description: string | null
          event_date: string | null
          event_type: string
          id: string
          sector_id: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          commercial_opportunity?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type: string
          id?: string
          sector_id: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          commercial_opportunity?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          sector_id?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_events_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_intelligence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_intelligence: {
        Row: {
          attractiveness_score: number | null
          avg_tjm_max: number | null
          avg_tjm_min: number | null
          created_at: string
          description: string | null
          digital_maturity: string | null
          id: string
          key_players_national: Json
          key_players_paca: Json
          market_growth_pct: number | null
          market_size_eur_bn: number | null
          name: string
          playbook: Json
          practices_fit: Json
          slug: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attractiveness_score?: number | null
          avg_tjm_max?: number | null
          avg_tjm_min?: number | null
          created_at?: string
          description?: string | null
          digital_maturity?: string | null
          id?: string
          key_players_national?: Json
          key_players_paca?: Json
          market_growth_pct?: number | null
          market_size_eur_bn?: number | null
          name: string
          playbook?: Json
          practices_fit?: Json
          slug: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attractiveness_score?: number | null
          avg_tjm_max?: number | null
          avg_tjm_min?: number | null
          created_at?: string
          description?: string | null
          digital_maturity?: string | null
          id?: string
          key_players_national?: Json
          key_players_paca?: Json
          market_growth_pct?: number | null
          market_size_eur_bn?: number | null
          name?: string
          playbook?: Json
          practices_fit?: Json
          slug?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_intelligence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_news: {
        Row: {
          created_at: string
          id: string
          is_trigger_event: boolean
          published_at: string | null
          relevance_score: number | null
          sector_id: string
          source: string | null
          summary: string | null
          tags: string[]
          title: string
          url: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_trigger_event?: boolean
          published_at?: string | null
          relevance_score?: number | null
          sector_id: string
          source?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          url?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_trigger_event?: boolean
          published_at?: string | null
          relevance_score?: number | null
          sector_id?: string
          source?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_news_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_intelligence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_news_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_pain_points: {
        Row: {
          created_at: string
          description: string | null
          frequency_count: number
          id: string
          kredo_practice: string | null
          sector_id: string
          source_company_ids: string[]
          title: string
          updated_at: string
          verbatim: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency_count?: number
          id?: string
          kredo_practice?: string | null
          sector_id: string
          source_company_ids?: string[]
          title: string
          updated_at?: string
          verbatim?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency_count?: number
          id?: string
          kredo_practice?: string | null
          sector_id?: string
          source_company_ids?: string[]
          title?: string
          updated_at?: string
          verbatim?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_pain_points_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_intelligence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_pain_points_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_regulatory_items: {
        Row: {
          authority: string | null
          commercial_angle: string | null
          created_at: string
          deadline_date: string | null
          description: string | null
          id: string
          is_commercial_window: boolean
          kredo_practice: string | null
          name: string
          sector_id: string
          updated_at: string
          urgency: string
          workspace_id: string
        }
        Insert: {
          authority?: string | null
          commercial_angle?: string | null
          created_at?: string
          deadline_date?: string | null
          description?: string | null
          id?: string
          is_commercial_window?: boolean
          kredo_practice?: string | null
          name: string
          sector_id: string
          updated_at?: string
          urgency?: string
          workspace_id: string
        }
        Update: {
          authority?: string | null
          commercial_angle?: string | null
          created_at?: string
          deadline_date?: string | null
          description?: string | null
          id?: string
          is_commercial_window?: boolean
          kredo_practice?: string | null
          name?: string
          sector_id?: string
          updated_at?: string
          urgency?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_regulatory_items_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_intelligence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_regulatory_items_workspace_id_fkey"
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
          skill_description: string | null
          workspace_id: string
        }
        Insert: {
          aliases?: string[]
          category?: string | null
          created_at?: string
          id?: string
          name: string
          skill_description?: string | null
          workspace_id?: string
        }
        Update: {
          aliases?: string[]
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          skill_description?: string | null
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
          calendar_event_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          priority: string
          status: string
          title: string
          type: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          calendar_event_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          priority?: string
          status?: string
          title: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          assignee_id?: string | null
          calendar_event_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          priority?: string
          status?: string
          title?: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_monthly_snapshots: {
        Row: {
          active_consultants_count: number
          created_at: string
          id: string
          intercontract_rate_pct: number
          notes: string | null
          period_month: string
          source: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_consultants_count: number
          created_at?: string
          id?: string
          intercontract_rate_pct: number
          notes?: string | null
          period_month: string
          source?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          active_consultants_count?: number
          created_at?: string
          id?: string
          intercontract_rate_pct?: number
          notes?: string | null
          period_month?: string
          source?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_monthly_snapshots_workspace_id_fkey"
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
      v_collaborator_activity_summary: {
        Row: {
          activity_rate_percent: number | null
          billable_days: number | null
          business_days: number | null
          cjm_snapshot: number | null
          collab_status: string | null
          collaborator_id: string | null
          cra_status: string | null
          daily_employer_cost: number | null
          employer_cost: number | null
          entry_date: string | null
          full_name: string | null
          gross_annual: number | null
          non_billable_days: number | null
          period_start: string | null
          pto_days: number | null
          real_margin: number | null
          real_margin_pct: number | null
          revenue: number | null
          sick_days: number | null
          theoretical_margin_pct: number | null
          tjm_snapshot: number | null
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
            referencedRelation: "v_collaborator_ytd_activity"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "mission_activity_reports_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["collaborator_id"]
          },
        ]
      }
      v_collaborator_ytd_activity: {
        Row: {
          collaborator_id: string | null
          entry_date: string | null
          full_name: string | null
          gap_vs_target: number | null
          months_covered: number | null
          taci_target: number | null
          total_billable_days: number | null
          total_business_days: number | null
          total_non_billable_days: number | null
          total_pto_days: number | null
          total_sick_days: number | null
          year: number | null
          ytd_activity_rate: number | null
          ytd_employer_cost: number | null
          ytd_real_margin: number | null
          ytd_revenue: number | null
        }
        Relationships: []
      }
      v_commercial_performance_monthly: {
        Row: {
          active_consultants_actual: number | null
          active_consultants_gap: number | null
          active_consultants_target: number | null
          annual_revenue_target: number | null
          fiscal_year: number | null
          gross_margin_actual_pct: number | null
          gross_margin_actual_value: number | null
          gross_margin_gap_pct: number | null
          gross_margin_target_pct: number | null
          intercontract_rate_actual_pct: number | null
          mission_capacity_method: string | null
          month_number: number | null
          net_recruitments_target: number | null
          new_client_logos_target: number | null
          owner_profile_id: string | null
          period_month: string | null
          plan_id: string | null
          revenue_actual: number | null
          revenue_actual_cumulative: number | null
          revenue_gap_cumulative: number | null
          revenue_gap_monthly: number | null
          revenue_per_active_consultant_month: number | null
          revenue_target_cumulative: number | null
          revenue_target_monthly: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_plans_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      v_performance_criteria_compensation: {
        Row: {
          allocated_variable_amount: number | null
          code: string | null
          comparison_operator: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          is_quantitative: boolean | null
          label: string | null
          objective_category: string | null
          plan_id: string | null
          target_value: number | null
          unit: string | null
          updated_at: string | null
          weight_pct: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_criteria_plan_workspace_fkey"
            columns: ["plan_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "performance_plans"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "performance_criteria_plan_workspace_fkey"
            columns: ["plan_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "v_commercial_performance_monthly"
            referencedColumns: ["plan_id", "workspace_id"]
          },
          {
            foreignKeyName: "performance_criteria_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_profitability_alerts: {
        Row: {
          activity_rate_percent: number | null
          alert_cra_not_validated: boolean | null
          alert_high_sick_days: boolean | null
          alert_low_activity: boolean | null
          alert_low_margin: boolean | null
          alert_negative_margin: boolean | null
          collaborator_id: string | null
          cra_status: string | null
          full_name: string | null
          period_start: string | null
          real_margin_pct: number | null
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
            referencedRelation: "v_collaborator_ytd_activity"
            referencedColumns: ["collaborator_id"]
          },
          {
            foreignKeyName: "mission_activity_reports_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "v_mission_quarterly_revenue"
            referencedColumns: ["collaborator_id"]
          },
        ]
      }
    }
    Functions: {
      apply_enrichment_proposal: {
        Args: { p_proposal_id: string; p_reason?: string }
        Returns: Database["public"]["CompositeTypes"]["proposal_operation_result"]
        SetofOptions: {
          from: "*"
          to: "proposal_operation_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_calendar_event: {
        Args: {
          p_all_day?: boolean
          p_candidate_id?: string
          p_company_id?: string
          p_contact_id?: string
          p_create_task?: boolean
          p_description?: string
          p_ends_at: string
          p_event_type: string
          p_location?: string
          p_meeting_url?: string
          p_opportunity_id?: string
          p_starts_at: string
          p_task_due_date?: string
          p_task_priority?: string
          p_task_title?: string
          p_title: string
        }
        Returns: Json
      }
      decide_enrichment_proposal: {
        Args: { p_decision: string; p_proposal_id: string; p_reason?: string }
        Returns: Database["public"]["CompositeTypes"]["proposal_operation_result"]
        SetofOptions: {
          from: "*"
          to: "proposal_operation_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_and_apply_enrichment_proposal: {
        Args: { p_proposal_id: string; p_reason?: string }
        Returns: Database["public"]["CompositeTypes"]["proposal_operation_result"]
        SetofOptions: {
          from: "*"
          to: "proposal_operation_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      absence_type:
        | "conge_paye"
        | "rtt"
        | "maladie"
        | "sans_solde"
        | "contrainte_perso"
        | "formation"
        | "fermeture_client"
        | "autre"
      ai_result_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
      ai_run_status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
      project_phase_status: "planned" | "in_progress" | "completed" | "blocked"
      project_ref_status: "not_reference" | "draft" | "approved" | "archived"
      project_ref_visibility: "named" | "anonymized" | "confidential"
      project_status: "draft" | "active" | "delivered" | "closed" | "cancelled"
    }
    CompositeTypes: {
      proposal_operation_result: {
        proposal_id: string | null
        status: string | null
        operation: string | null
        target_type: string | null
        target_id: string | null
        target_field: string | null
        fact_id: string | null
        previous_value: Json | null
        applied_value: Json | null
        conflict: Json | null
        message: string | null
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
      absence_type: [
        "conge_paye",
        "rtt",
        "maladie",
        "sans_solde",
        "contrainte_perso",
        "formation",
        "fermeture_client",
        "autre",
      ],
      ai_result_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
      ],
      ai_run_status: ["queued", "running", "succeeded", "failed", "cancelled"],
      project_phase_status: ["planned", "in_progress", "completed", "blocked"],
      project_ref_status: ["not_reference", "draft", "approved", "archived"],
      project_ref_visibility: ["named", "anonymized", "confidential"],
      project_status: ["draft", "active", "delivered", "closed", "cancelled"],
    },
  },
} as const
