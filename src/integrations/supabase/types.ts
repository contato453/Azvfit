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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          base_points: number
          category_id: string
          created_at: string
          description: string | null
          edition_id: string
          id: string
          is_active: boolean
          max_per_day: number | null
          max_per_week: number | null
          max_total: number | null
          name: string
          points_per_unit: number | null
          requires_evidence: boolean
          rules: Json
          updated_at: string
        }
        Insert: {
          base_points?: number
          category_id: string
          created_at?: string
          description?: string | null
          edition_id: string
          id?: string
          is_active?: boolean
          max_per_day?: number | null
          max_per_week?: number | null
          max_total?: number | null
          name: string
          points_per_unit?: number | null
          requires_evidence?: boolean
          rules?: Json
          updated_at?: string
        }
        Update: {
          base_points?: number
          category_id?: string
          created_at?: string
          description?: string | null
          edition_id?: string
          id?: string
          is_active?: boolean
          max_per_day?: number | null
          max_per_week?: number | null
          max_total?: number | null
          name?: string
          points_per_unit?: number | null
          requires_evidence?: boolean
          rules?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_categories: {
        Row: {
          created_at: string
          description: string | null
          edition_id: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          edition_id: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          edition_id?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_categories_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_records: {
        Row: {
          activity_date: string
          activity_id: string
          activity_time: string | null
          created_at: string
          edition_id: string
          id: string
          notes: string | null
          points_awarded: number | null
          quantity: number
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["record_status"]
          submitted_at: string | null
          truth_declared: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_id: string
          activity_time?: string | null
          created_at?: string
          edition_id: string
          id?: string
          notes?: string | null
          points_awarded?: number | null
          quantity?: number
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          submitted_at?: string | null
          truth_declared?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_id?: string
          activity_time?: string | null
          created_at?: string
          edition_id?: string
          id?: string
          notes?: string | null
          points_awarded?: number | null
          quantity?: number
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          submitted_at?: string | null
          truth_declared?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_records_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_records_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          edition_id: string
          event_id: string | null
          id: string
          notified_at: string | null
          notify_participants: boolean
          publish_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          edition_id: string
          event_id?: string | null
          id?: string
          notified_at?: string | null
          notify_participants?: boolean
          publish_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          edition_id?: string
          event_id?: string | null
          id?: string
          notified_at?: string | null
          notify_participants?: boolean
          publish_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          context: Json
          created_at: string
          edition_id: string | null
          entity_id: string | null
          entity_table: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          context?: Json
          created_at?: string
          edition_id?: string | null
          entity_id?: string | null
          entity_table: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          context?: Json
          created_at?: string
          edition_id?: string | null
          entity_id?: string | null
          entity_table?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          category_slug: string
          created_at: string
          criteria: string | null
          description: string | null
          edition_id: string
          id: string
          is_active: boolean
          is_published: boolean
          position: number | null
          prize_amount: number | null
          prize_note: string | null
          sort_order: number
          title: string
          updated_at: string
          winner_user_id: string | null
        }
        Insert: {
          category_slug: string
          created_at?: string
          criteria?: string | null
          description?: string | null
          edition_id: string
          id?: string
          is_active?: boolean
          is_published?: boolean
          position?: number | null
          prize_amount?: number | null
          prize_note?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Update: {
          category_slug?: string
          created_at?: string
          criteria?: string | null
          description?: string | null
          edition_id?: string
          id?: string
          is_active?: boolean
          is_published?: boolean
          position?: number | null
          prize_amount?: number | null
          prize_note?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      conduct_incidents: {
        Row: {
          context: Json
          created_at: string
          decided_by: string
          description: string | null
          edition_id: string
          id: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          measure: Database["public"]["Enums"]["incident_measure"]
          points_delta: number
          reason: string
          record_id: string | null
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          decided_by: string
          description?: string | null
          edition_id: string
          id?: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          measure: Database["public"]["Enums"]["incident_measure"]
          points_delta?: number
          reason: string
          record_id?: string | null
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          decided_by?: string
          description?: string | null
          edition_id?: string
          id?: string
          incident_type?: Database["public"]["Enums"]["incident_type"]
          measure?: Database["public"]["Enums"]["incident_measure"]
          points_delta?: number
          reason?: string
          record_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conduct_incidents_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conduct_incidents_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "activity_records"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_agente: {
        Row: {
          agente: string | null
          created_at: string | null
          email: string | null
          id: number
          interesse_duvida: string | null
          role: string | null
          status: string | null
          user_name: string | null
          user_number: string | null
          user_profile: string | null
        }
        Insert: {
          agente?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          interesse_duvida?: string | null
          role?: string | null
          status?: string | null
          user_name?: string | null
          user_number?: string | null
          user_profile?: string | null
        }
        Update: {
          agente?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          interesse_duvida?: string | null
          role?: string | null
          status?: string | null
          user_name?: string | null
          user_number?: string | null
          user_profile?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      edition_participants: {
        Row: {
          created_at: string
          disqualified_at: string | null
          disqualified_by: string | null
          disqualified_reason: string | null
          edition_id: string
          id: string
          is_active: boolean
          is_disqualified: boolean
          team: string | null
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disqualified_at?: string | null
          disqualified_by?: string | null
          disqualified_reason?: string | null
          edition_id: string
          id?: string
          is_active?: boolean
          is_disqualified?: boolean
          team?: string | null
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disqualified_at?: string | null
          disqualified_by?: string | null
          disqualified_reason?: string | null
          edition_id?: string
          id?: string
          is_active?: boolean
          is_disqualified?: boolean
          team?: string | null
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edition_participants_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      editions: {
        Row: {
          awards_date: string | null
          created_at: string
          created_by: string | null
          day_fit_date: string | null
          id: string
          is_current: boolean
          name: string
          participation_term: string | null
          regulation: string | null
          scoring_config: Json
          scoring_end_date: string | null
          show_ranking: boolean
          start_date: string | null
          status: Database["public"]["Enums"]["edition_status"]
          tiebreaker_config: Json
          updated_at: string
          year: number
        }
        Insert: {
          awards_date?: string | null
          created_at?: string
          created_by?: string | null
          day_fit_date?: string | null
          id?: string
          is_current?: boolean
          name: string
          participation_term?: string | null
          regulation?: string | null
          scoring_config?: Json
          scoring_end_date?: string | null
          show_ranking?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["edition_status"]
          tiebreaker_config?: Json
          updated_at?: string
          year: number
        }
        Update: {
          awards_date?: string | null
          created_at?: string
          created_by?: string | null
          day_fit_date?: string | null
          id?: string
          is_current?: boolean
          name?: string
          participation_term?: string | null
          regulation?: string | null
          scoring_config?: Json
          scoring_end_date?: string | null
          show_ranking?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["edition_status"]
          tiebreaker_config?: Json
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      event_stations: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          event_id: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          points: number
          qr_token: string
          sort_order: number
          start_time: string | null
          station_code: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          event_id: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          points?: number
          qr_token?: string
          sort_order?: number
          start_time?: string | null
          station_code: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          event_id?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          points?: number
          qr_token?: string
          sort_order?: number
          start_time?: string | null
          station_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_stations_event_id_fkey"
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
          edition_id: string
          end_time: string | null
          event_date: string | null
          event_type: string
          id: string
          is_published: boolean
          location: string | null
          name: string
          notes: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          edition_id: string
          end_time?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          is_published?: boolean
          location?: string | null
          name: string
          notes?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          edition_id?: string
          end_time?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          is_published?: boolean
          location?: string | null
          name?: string
          notes?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          created_at: string
          edition_id: string
          file_hash: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          mission_participation_id: string | null
          record_id: string | null
          storage_path: string
          totalpass_checkin_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          edition_id: string
          file_hash?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          mission_participation_id?: string | null
          record_id?: string | null
          storage_path: string
          totalpass_checkin_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          edition_id?: string
          file_hash?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          mission_participation_id?: string | null
          record_id?: string | null
          storage_path?: string
          totalpass_checkin_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidences_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_mission_participation_fk"
            columns: ["mission_participation_id"]
            isOneToOne: false
            referencedRelation: "mission_participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "activity_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_totalpass_checkin_fk"
            columns: ["totalpass_checkin_id"]
            isOneToOne: false
            referencedRelation: "totalpass_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up: {
        Row: {
          created_at: string | null
          id: number
          last_message: string | null
          user_number: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_message?: string | null
          user_number?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_message?: string | null
          user_number?: string | null
        }
        Relationships: []
      }
      health_passport: {
        Row: {
          corrected_at: string | null
          corrected_by: string | null
          edition_id: string
          id: string
          method: string
          points_awarded: number
          reason: string | null
          stamped_at: string
          stamped_by: string | null
          station_id: string
          status: string
          user_id: string
        }
        Insert: {
          corrected_at?: string | null
          corrected_by?: string | null
          edition_id: string
          id?: string
          method?: string
          points_awarded?: number
          reason?: string | null
          stamped_at?: string
          stamped_by?: string | null
          station_id: string
          status?: string
          user_id: string
        }
        Update: {
          corrected_at?: string | null
          corrected_by?: string | null
          edition_id?: string
          id?: string
          method?: string
          points_awarded?: number
          reason?: string | null
          stamped_at?: string
          stamped_by?: string | null
          station_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_passport_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_passport_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "event_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_participations: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          notes: string | null
          points_awarded: number | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["record_status"]
          submitted_at: string | null
          truth_declared: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          notes?: string | null
          points_awarded?: number | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          submitted_at?: string | null
          truth_declared?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          notes?: string | null
          points_awarded?: number | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          submitted_at?: string | null
          truth_declared?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_participations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          audience: Json
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          edition_id: string
          ends_at_ts: string | null
          evidence_type: string | null
          id: string
          is_published: boolean
          max_participations: number
          mission_type: Database["public"]["Enums"]["mission_type"]
          points: number
          publish_at: string | null
          requires_evidence: boolean
          starts_at_ts: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Json
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          edition_id: string
          ends_at_ts?: string | null
          evidence_type?: string | null
          id?: string
          is_published?: boolean
          max_participations?: number
          mission_type?: Database["public"]["Enums"]["mission_type"]
          points: number
          publish_at?: string | null
          requires_evidence?: boolean
          starts_at_ts?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Json
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          edition_id?: string
          ends_at_ts?: string | null
          evidence_type?: string | null
          id?: string
          is_published?: boolean
          max_participations?: number
          mission_type?: Database["public"]["Enums"]["mission_type"]
          points?: number
          publish_at?: string | null
          requires_evidence?: boolean
          starts_at_ts?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          edition_id: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          edition_id?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          edition_id?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      point_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          edition_id: string
          id: string
          is_manual: boolean
          kind: Database["public"]["Enums"]["ledger_kind"]
          points: number
          reason: string | null
          rule_snapshot: Json
          source_id: string | null
          source_table: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          edition_id: string
          id?: string
          is_manual?: boolean
          kind: Database["public"]["Enums"]["ledger_kind"]
          points: number
          reason?: string | null
          rule_snapshot?: Json
          source_id?: string | null
          source_table?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          edition_id?: string
          id?: string
          is_manual?: boolean
          kind?: Database["public"]["Enums"]["ledger_kind"]
          points?: number
          reason?: string | null
          rule_snapshot?: Json
          source_id?: string | null
          source_table?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_ledger_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          phone: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ranking_entries: {
        Row: {
          approved_activities: number
          day_fit_participation: boolean
          extra_missions: number
          id: string
          participant_name: string
          position: number
          publication_id: string
          tiebreak_note: string | null
          total_points: number
          totalpass_checkins: number
          user_id: string
          weekly_frequency: number
        }
        Insert: {
          approved_activities?: number
          day_fit_participation?: boolean
          extra_missions?: number
          id?: string
          participant_name: string
          position: number
          publication_id: string
          tiebreak_note?: string | null
          total_points?: number
          totalpass_checkins?: number
          user_id: string
          weekly_frequency?: number
        }
        Update: {
          approved_activities?: number
          day_fit_participation?: boolean
          extra_missions?: number
          id?: string
          participant_name?: string
          position?: number
          publication_id?: string
          tiebreak_note?: string | null
          total_points?: number
          totalpass_checkins?: number
          user_id?: string
          weekly_frequency?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranking_entries_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "ranking_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_publications: {
        Row: {
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          edition_id: string
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          published_at: string
          published_by: string | null
          status: string
          title: string
        }
        Insert: {
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          edition_id: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          published_at?: string
          published_by?: string | null
          status?: string
          title: string
        }
        Update: {
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          edition_id?: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          published_at?: string
          published_by?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_publications_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      record_reviews: {
        Row: {
          action: string
          context: Json
          created_at: string
          from_status: Database["public"]["Enums"]["record_status"] | null
          id: string
          points_after: number | null
          points_before: number | null
          reason: string | null
          record_id: string
          reviewer_id: string
          source_table: string
          to_status: Database["public"]["Enums"]["record_status"] | null
        }
        Insert: {
          action: string
          context?: Json
          created_at?: string
          from_status?: Database["public"]["Enums"]["record_status"] | null
          id?: string
          points_after?: number | null
          points_before?: number | null
          reason?: string | null
          record_id: string
          reviewer_id: string
          source_table: string
          to_status?: Database["public"]["Enums"]["record_status"] | null
        }
        Update: {
          action?: string
          context?: Json
          created_at?: string
          from_status?: Database["public"]["Enums"]["record_status"] | null
          id?: string
          points_after?: number | null
          points_before?: number | null
          reason?: string | null
          record_id?: string
          reviewer_id?: string
          source_table?: string
          to_status?: Database["public"]["Enums"]["record_status"] | null
        }
        Relationships: []
      }
      regulation_acceptances: {
        Row: {
          accepted_at: string
          edition_id: string
          id: string
          privacy_accepted: boolean
          privacy_version: string
          terms_accepted: boolean
          user_id: string
          version: string
          voluntary_confirmed: boolean
        }
        Insert: {
          accepted_at?: string
          edition_id: string
          id?: string
          privacy_accepted?: boolean
          privacy_version?: string
          terms_accepted?: boolean
          user_id: string
          version?: string
          voluntary_confirmed?: boolean
        }
        Update: {
          accepted_at?: string
          edition_id?: string
          id?: string
          privacy_accepted?: boolean
          privacy_version?: string
          terms_accepted?: boolean
          user_id?: string
          version?: string
          voluntary_confirmed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "regulation_acceptances_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          edition_id: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          edition_id?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          edition_id?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      totalpass_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          edition_id: string
          gym_name: string | null
          id: string
          points_awarded: number | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["record_status"]
          submitted_at: string | null
          truth_declared: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin_date: string
          created_at?: string
          edition_id: string
          gym_name?: string | null
          id?: string
          points_awarded?: number | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          submitted_at?: string | null
          truth_declared?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          edition_id?: string
          gym_name?: string | null
          id?: string
          points_awarded?: number | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          submitted_at?: string | null
          truth_declared?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "totalpass_checkins_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          edition_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          edition_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          edition_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_bonuses: {
        Row: {
          created_at: string
          edition_id: string
          granted_by: string | null
          id: string
          points: number
          reason: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          edition_id: string
          granted_by?: string | null
          id?: string
          points: number
          reason: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          edition_id?: string
          granted_by?: string | null
          id?: string
          points?: number
          reason?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_bonuses_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      apply_manual_adjustment: {
        Args: {
          _context?: Json
          _edition_id: string
          _points: number
          _reason: string
          _user_id: string
        }
        Returns: number
      }
      cancel_ranking_publication: {
        Args: { _publication_id: string; _reason: string }
        Returns: {
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          edition_id: string
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          published_at: string
          published_by: string | null
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "ranking_publications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_ranking: {
        Args: { _edition_id: string }
        Returns: {
          approved_activities: number
          day_fit_participation: boolean
          extra_missions: number
          participant_name: string
          position: number
          total_points: number
          totalpass_checkins: number
          user_id: string
          weekly_frequency: number
        }[]
      }
      day_fit_config: { Args: { _edition_id: string }; Returns: Json }
      expire_evidences: {
        Args: { _days?: number; _edition_id: string }
        Returns: {
          storage_path: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_comissao_of: { Args: { _edition_id: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _context?: Json
          _edition_id?: string
          _entity_id: string
          _entity_table: string
          _reason?: string
        }
        Returns: undefined
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      passport_checkin: {
        Args: {
          _code?: string
          _method: string
          _qr_token?: string
          _station_id: string
        }
        Returns: {
          corrected_at: string | null
          corrected_by: string | null
          edition_id: string
          id: string
          method: string
          points_awarded: number
          reason: string | null
          stamped_at: string
          stamped_by: string | null
          station_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "health_passport"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      passport_checkin_code: {
        Args: { _code: string; _edition_id: string }
        Returns: {
          corrected_at: string | null
          corrected_by: string | null
          edition_id: string
          id: string
          method: string
          points_awarded: number
          reason: string | null
          stamped_at: string
          stamped_by: string | null
          station_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "health_passport"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_announcement: {
        Args: { _announcement_id: string }
        Returns: {
          body: string
          created_at: string
          created_by: string | null
          edition_id: string
          event_id: string | null
          id: string
          notified_at: string | null
          notify_participants: boolean
          publish_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "announcements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_ranking: {
        Args: {
          _edition_id: string
          _notes?: string
          _period_end?: string
          _period_start?: string
          _title: string
        }
        Returns: {
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          edition_id: string
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          published_at: string
          published_by: string | null
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "ranking_publications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recalc_participant_points: {
        Args: { _edition_id: string; _user_id: string }
        Returns: number
      }
      recalc_totalpass_bonus: {
        Args: { _edition_id: string; _user_id: string }
        Returns: undefined
      }
      register_conduct_incident: {
        Args: {
          _context?: Json
          _description?: string
          _edition_id: string
          _incident_type: Database["public"]["Enums"]["incident_type"]
          _measure: Database["public"]["Enums"]["incident_measure"]
          _points_delta?: number
          _reason: string
          _record_id: string
          _user_id: string
        }
        Returns: {
          context: Json
          created_at: string
          decided_by: string
          description: string | null
          edition_id: string
          id: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          measure: Database["public"]["Enums"]["incident_measure"]
          points_delta: number
          reason: string
          record_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "conduct_incidents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_activity_record: {
        Args: {
          _action: string
          _context?: Json
          _points?: number
          _reason?: string
          _record_id: string
        }
        Returns: {
          activity_date: string
          activity_id: string
          activity_time: string | null
          created_at: string
          edition_id: string
          id: string
          notes: string | null
          points_awarded: number | null
          quantity: number
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["record_status"]
          submitted_at: string | null
          truth_declared: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_mission_participation: {
        Args: {
          _action: string
          _context?: Json
          _participation_id: string
          _points?: number
          _reason?: string
        }
        Returns: {
          created_at: string
          id: string
          mission_id: string
          notes: string | null
          points_awarded: number | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["record_status"]
          submitted_at: string | null
          truth_declared: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "mission_participations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_totalpass_checkin: {
        Args: {
          _action: string
          _checkin_id: string
          _context?: Json
          _reason?: string
        }
        Returns: {
          checkin_date: string
          created_at: string
          edition_id: string
          gym_name: string | null
          id: string
          points_awarded: number | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["record_status"]
          submitted_at: string | null
          truth_declared: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "totalpass_checkins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_passport_action: {
        Args: {
          _action: string
          _reason?: string
          _station_id: string
          _user_id: string
        }
        Returns: {
          corrected_at: string | null
          corrected_by: string | null
          edition_id: string
          id: string
          method: string
          points_awarded: number
          reason: string | null
          stamped_at: string
          stamped_by: string | null
          station_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "health_passport"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      station_codes: {
        Args: { _event_id: string }
        Returns: {
          name: string
          qr_token: string
          station_code: string
          station_id: string
        }[]
      }
      sync_passport_points: {
        Args: { _edition_id: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "comissao" | "colaborador"
      edition_status:
        | "planejamento"
        | "inscricoes"
        | "ativa"
        | "auditoria"
        | "encerrada"
        | "arquivada"
      incident_measure:
        | "advertencia"
        | "desconsideracao"
        | "perda_pontos"
        | "desclassificacao"
      incident_type:
        | "evidencia_reutilizada"
        | "evidencia_invalida"
        | "fora_do_periodo"
        | "informacoes_inconsistentes"
        | "pontuacao_indevida"
      ledger_kind:
        | "registro"
        | "missao"
        | "totalpass"
        | "bonus"
        | "ajuste"
        | "penalidade"
      mission_type: "extra" | "semanal" | "surpresa"
      record_status:
        | "rascunho"
        | "enviado"
        | "em_analise"
        | "correcao_solicitada"
        | "aprovado"
        | "recusado"
        | "cancelado"
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
      app_role: ["admin", "comissao", "colaborador"],
      edition_status: [
        "planejamento",
        "inscricoes",
        "ativa",
        "auditoria",
        "encerrada",
        "arquivada",
      ],
      incident_measure: [
        "advertencia",
        "desconsideracao",
        "perda_pontos",
        "desclassificacao",
      ],
      incident_type: [
        "evidencia_reutilizada",
        "evidencia_invalida",
        "fora_do_periodo",
        "informacoes_inconsistentes",
        "pontuacao_indevida",
      ],
      ledger_kind: [
        "registro",
        "missao",
        "totalpass",
        "bonus",
        "ajuste",
        "penalidade",
      ],
      mission_type: ["extra", "semanal", "surpresa"],
      record_status: [
        "rascunho",
        "enviado",
        "em_analise",
        "correcao_solicitada",
        "aprovado",
        "recusado",
        "cancelado",
      ],
    },
  },
} as const
