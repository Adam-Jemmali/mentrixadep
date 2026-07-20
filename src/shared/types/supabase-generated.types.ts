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
      ai_package_cache: {
        Row: {
          cache_key: string
          created_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          payload?: Json
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          action: string
          count: number
          date: string
          user_id: string
        }
        Insert: {
          action: string
          count?: number
          date?: string
          user_id: string
        }
        Update: {
          action?: string
          count?: number
          date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: number
          ip_hash: string | null
          properties: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: number
          ip_hash?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: number
          ip_hash?: string | null
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ap_calc_verified_rank_cache: {
        Row: {
          accuracy_percent: number
          percentile: number | null
          updated_at: string
          user_id: string
          verified_count: number
        }
        Insert: {
          accuracy_percent?: number
          percentile?: number | null
          updated_at?: string
          user_id: string
          verified_count?: number
        }
        Update: {
          accuracy_percent?: number
          percentile?: number | null
          updated_at?: string
          user_id?: string
          verified_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ap_calc_verified_rank_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_cache: {
        Row: {
          cache_key: string
          created_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          payload?: Json
        }
        Relationships: []
      }
      auth_abuse_locks: {
        Row: {
          failure_count: number
          lock_key: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          failure_count?: number
          lock_key: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          failure_count?: number
          lock_key?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      availability: {
        Row: {
          active: boolean
          booking_status: string
          course: string
          created_at: string
          end_time: string
          id: string
          locked_by: string | null
          locked_until: string | null
          max_students: number
          price_per_session: number | null
          series_id: string | null
          start_time: string
          stripe_checkout_session_id: string | null
          tutor_id: string
        }
        Insert: {
          active?: boolean
          booking_status?: string
          course: string
          created_at?: string
          end_time: string
          id?: string
          locked_by?: string | null
          locked_until?: string | null
          max_students?: number
          price_per_session?: number | null
          series_id?: string | null
          start_time: string
          stripe_checkout_session_id?: string | null
          tutor_id: string
        }
        Update: {
          active?: boolean
          booking_status?: string
          course?: string
          created_at?: string
          end_time?: string
          id?: string
          locked_by?: string | null
          locked_until?: string | null
          max_students?: number
          price_per_session?: number | null
          series_id?: string | null
          start_time?: string
          stripe_checkout_session_id?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          not_before: string
          payload: Json
          priority: number
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          not_before?: string
          payload?: Json
          priority?: number
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          not_before?: string
          payload?: Json
          priority?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      blacklisted_users: {
        Row: {
          blacklisted_at: string
          blacklisted_by: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          blacklisted_at?: string
          blacklisted_by?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          blacklisted_at?: string
          blacklisted_by?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blacklisted_users_blacklisted_by_fkey"
            columns: ["blacklisted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blacklisted_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      breakthrough_events: {
        Row: {
          accuracy_after: number
          accuracy_before: number
          concept: string
          detected_at: string
          id: string
          session_id: string | null
          shared_at: string | null
          student_id: string
          subject: string
          triggered_by: string
        }
        Insert: {
          accuracy_after: number
          accuracy_before: number
          concept: string
          detected_at?: string
          id?: string
          session_id?: string | null
          shared_at?: string | null
          student_id: string
          subject: string
          triggered_by?: string
        }
        Update: {
          accuracy_after?: number
          accuracy_before?: number
          concept?: string
          detected_at?: string
          id?: string
          session_id?: string | null
          shared_at?: string | null
          student_id?: string
          subject?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakthrough_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakthrough_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      breakthrough_quest_queue: {
        Row: {
          available_at: string
          breakthrough_event_id: string
          completed_at: string | null
          created_at: string
          id: string
          quest_id: string | null
          sort_order: number
          student_id: string
          subject: string
          target_subtopic: string
          topic: string
        }
        Insert: {
          available_at?: string
          breakthrough_event_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          quest_id?: string | null
          sort_order: number
          student_id: string
          subject: string
          target_subtopic: string
          topic: string
        }
        Update: {
          available_at?: string
          breakthrough_event_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          quest_id?: string | null
          sort_order?: number
          student_id?: string
          subject?: string
          target_subtopic?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakthrough_quest_queue_breakthrough_event_id_fkey"
            columns: ["breakthrough_event_id"]
            isOneToOne: false
            referencedRelation: "breakthrough_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakthrough_quest_queue_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakthrough_quest_queue_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "video_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_division_map: {
        Row: {
          course: string
          division_id: string
        }
        Insert: {
          course: string
          division_id: string
        }
        Update: {
          course?: string
          division_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_division_map_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      division_messages: {
        Row: {
          body: string
          created_at: string
          division_key: string
          id: string
          image_path: string | null
          image_status: string
          parent_id: string | null
          thread_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          division_key: string
          id?: string
          image_path?: string | null
          image_status?: string
          parent_id?: string | null
          thread_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          division_key?: string
          id?: string
          image_path?: string | null
          image_status?: string
          parent_id?: string | null
          thread_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "division_messages_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "division_messages_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "mv_division_leaderboard"
            referencedColumns: ["division_key"]
          },
          {
            foreignKeyName: "division_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "division_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "division_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      division_war_badges: {
        Row: {
          created_at: string
          division_id: string
          division_name: string
          expires_at: string
          id: string
          user_id: string
          war_id: string
        }
        Insert: {
          created_at?: string
          division_id: string
          division_name: string
          expires_at: string
          id?: string
          user_id: string
          war_id: string
        }
        Update: {
          created_at?: string
          division_id?: string
          division_name?: string
          expires_at?: string
          id?: string
          user_id?: string
          war_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "division_war_badges_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_war_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_war_badges_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "division_wars"
            referencedColumns: ["id"]
          },
        ]
      }
      division_war_contributions: {
        Row: {
          division_id: string
          id: string
          last_updated: string
          quests_completed: number
          student_id: string
          total_accuracy_points: number
          war_id: string
        }
        Insert: {
          division_id: string
          id?: string
          last_updated?: string
          quests_completed?: number
          student_id: string
          total_accuracy_points?: number
          war_id: string
        }
        Update: {
          division_id?: string
          id?: string
          last_updated?: string
          quests_completed?: number
          student_id?: string
          total_accuracy_points?: number
          war_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "division_war_contributions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_war_contributions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_war_contributions_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "division_wars"
            referencedColumns: ["id"]
          },
        ]
      }
      division_wars: {
        Row: {
          created_at: string
          division_a_id: string
          division_b_id: string
          id: string
          status: string
          subject: string
          week_end: string
          week_start: string
          winner_division_id: string | null
        }
        Insert: {
          created_at?: string
          division_a_id: string
          division_b_id: string
          id?: string
          status?: string
          subject: string
          week_end: string
          week_start: string
          winner_division_id?: string | null
        }
        Update: {
          created_at?: string
          division_a_id?: string
          division_b_id?: string
          id?: string
          status?: string
          subject?: string
          week_end?: string
          week_start?: string
          winner_division_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "division_wars_division_a_id_fkey"
            columns: ["division_a_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_wars_division_b_id_fkey"
            columns: ["division_b_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_wars_winner_division_id_fkey"
            columns: ["winner_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      division_weekly_xp: {
        Row: {
          division_key: string
          updated_at: string
          user_id: string
          week_start: string
          xp_earned: number
        }
        Insert: {
          division_key: string
          updated_at?: string
          user_id: string
          week_start: string
          xp_earned?: number
        }
        Update: {
          division_key?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "division_weekly_xp_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "division_weekly_xp_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "mv_division_leaderboard"
            referencedColumns: ["division_key"]
          },
          {
            foreignKeyName: "division_weekly_xp_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      division_winners: {
        Row: {
          bonus_xp: number
          created_at: string
          division_key: string
          id: string
          rank: number
          user_id: string
          week_start: string
          weekly_xp: number
        }
        Insert: {
          bonus_xp?: number
          created_at?: string
          division_key: string
          id?: string
          rank: number
          user_id: string
          week_start: string
          weekly_xp?: number
        }
        Update: {
          bonus_xp?: number
          created_at?: string
          division_key?: string
          id?: string
          rank?: number
          user_id?: string
          week_start?: string
          weekly_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "division_winners_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "division_winners_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "mv_division_leaderboard"
            referencedColumns: ["division_key"]
          },
          {
            foreignKeyName: "division_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      duel_queue: {
        Row: {
          division_key: string
          queue_level: number
          queued_at: string
          user_id: string
        }
        Insert: {
          division_key: string
          queue_level?: number
          queued_at?: string
          user_id: string
        }
        Update: {
          division_key?: string
          queue_level?: number
          queued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_queue_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "duel_queue_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "mv_division_leaderboard"
            referencedColumns: ["division_key"]
          },
        ]
      }
      duel_xp_wagers: {
        Row: {
          challenger_id: string
          challenger_wager: number
          created_at: string
          duel_id: string
          id: string
          opponent_id: string
          opponent_wager: number
          settled_at: string | null
          status: string
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          challenger_wager: number
          created_at?: string
          duel_id: string
          id?: string
          opponent_id: string
          opponent_wager: number
          settled_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          challenger_wager?: number
          created_at?: string
          duel_id?: string
          id?: string
          opponent_id?: string
          opponent_wager?: number
          settled_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_xp_wagers_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_xp_wagers_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: true
            referencedRelation: "skill_duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_xp_wagers_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_xp_wagers_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_submissions: {
        Row: {
          created_at: string
          id: string
          message: string
          page_path: string | null
          user_agent: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          page_path?: string | null
          user_agent?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          page_path?: string | null
          user_agent?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      free_response_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string
          grading_result: Json | null
          id: string
          is_correct: boolean | null
          item_id: string
          normalized_expression: string | null
          partial_credit_fraction: number
          raw_input: string
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          attempt_number?: number
          attempted_at?: string
          grading_result?: Json | null
          id?: string
          is_correct?: boolean | null
          item_id: string
          normalized_expression?: string | null
          partial_credit_fraction?: number
          raw_input: string
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          grading_result?: Json | null
          id?: string
          is_correct?: boolean | null
          item_id?: string
          normalized_expression?: string | null
          partial_credit_fraction?: number
          raw_input?: string
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_response_attempts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_response_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_impact_history: {
        Row: {
          guide_id: string
          id: string
          impact_score: number
          recorded_at: string
          subject: string
        }
        Insert: {
          guide_id: string
          id?: string
          impact_score?: number
          recorded_at?: string
          subject: string
        }
        Update: {
          guide_id?: string
          id?: string
          impact_score?: number
          recorded_at?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_impact_history_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_impact_node_scores: {
        Row: {
          after_accuracy: number
          before_accuracy: number
          guide_id: string
          id: string
          impact_lift: number
          impact_score: number
          last_calculated: string
          node_name: string
          skill_node_id: string
          students_counted: number
          subject: string
        }
        Insert: {
          after_accuracy?: number
          before_accuracy?: number
          guide_id: string
          id?: string
          impact_lift?: number
          impact_score?: number
          last_calculated?: string
          node_name: string
          skill_node_id: string
          students_counted?: number
          subject: string
        }
        Update: {
          after_accuracy?: number
          before_accuracy?: number
          guide_id?: string
          id?: string
          impact_lift?: number
          impact_score?: number
          last_calculated?: string
          node_name?: string
          skill_node_id?: string
          students_counted?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_impact_node_scores_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_impact_node_scores_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_impact_percentile_snapshot: {
        Row: {
          accuracy_bucket: number
          computed_at: string
          skill_node_id: string
          user_count: number
        }
        Insert: {
          accuracy_bucket: number
          computed_at?: string
          skill_node_id: string
          user_count?: number
        }
        Update: {
          accuracy_bucket?: number
          computed_at?: string
          skill_node_id?: string
          user_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "guide_impact_percentile_snapshot_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_impact_scores: {
        Row: {
          guide_id: string
          id: string
          impact_score: number
          last_calculated: string
          sessions_counted: number
          subject: string
        }
        Insert: {
          guide_id: string
          id?: string
          impact_score?: number
          last_calculated?: string
          sessions_counted?: number
          subject: string
        }
        Update: {
          guide_id?: string
          id?: string
          impact_score?: number
          last_calculated?: string
          sessions_counted?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_impact_scores_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_teaching_portfolio: {
        Row: {
          added_at: string
          after_accuracy: number | null
          before_accuracy: number | null
          guide_id: string
          id: string
          node_name: string
          session_id: string | null
          share_artifact_id: string | null
          skill_node_id: string | null
          student_id: string
          student_opted_in: boolean
        }
        Insert: {
          added_at?: string
          after_accuracy?: number | null
          before_accuracy?: number | null
          guide_id: string
          id?: string
          node_name: string
          session_id?: string | null
          share_artifact_id?: string | null
          skill_node_id?: string | null
          student_id: string
          student_opted_in?: boolean
        }
        Update: {
          added_at?: string
          after_accuracy?: number | null
          before_accuracy?: number | null
          guide_id?: string
          id?: string
          node_name?: string
          session_id?: string | null
          share_artifact_id?: string | null
          skill_node_id?: string | null
          student_id?: string
          student_opted_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guide_teaching_portfolio_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_teaching_portfolio_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_teaching_portfolio_share_artifact_id_fkey"
            columns: ["share_artifact_id"]
            isOneToOne: true
            referencedRelation: "share_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_teaching_portfolio_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_teaching_portfolio_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_node_impact_rolling: {
        Row: {
          guide_id: string
          last_updated: string
          post_session_accuracy_avg: number
          pre_session_accuracy_avg: number
          sessions_counted: number
          skill_node_id: string
        }
        Insert: {
          guide_id: string
          last_updated?: string
          post_session_accuracy_avg?: number
          pre_session_accuracy_avg?: number
          sessions_counted?: number
          skill_node_id: string
        }
        Update: {
          guide_id?: string
          last_updated?: string
          post_session_accuracy_avg?: number
          pre_session_accuracy_avg?: number
          sessions_counted?: number
          skill_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_node_impact_rolling_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_node_impact_rolling_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_members: {
        Row: {
          added_at: string
          institution_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          institution_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          institution_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          admin_user_id: string | null
          created_at: string
          domain: string
          id: string
          logo_url: string | null
          name: string
          negotiated_rate_pct: number | null
          plan: Database["public"]["Enums"]["institution_plan"]
          session_credits: number
          updated_at: string
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          domain: string
          id?: string
          logo_url?: string | null
          name: string
          negotiated_rate_pct?: number | null
          plan?: Database["public"]["Enums"]["institution_plan"]
          session_credits?: number
          updated_at?: string
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          domain?: string
          id?: string
          logo_url?: string | null
          name?: string
          negotiated_rate_pct?: number | null
          plan?: Database["public"]["Enums"]["institution_plan"]
          session_credits?: number
          updated_at?: string
        }
        Relationships: []
      }
      intervention_retests: {
        Row: {
          completed_at: string | null
          created_at: string
          delta: number | null
          id: string
          post_accuracy: number | null
          pre_accuracy: number | null
          scheduled_for: string
          skill_node_id: string
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          delta?: number | null
          id?: string
          post_accuracy?: number | null
          pre_accuracy?: number | null
          scheduled_for: string
          skill_node_id: string
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          delta?: number | null
          id?: string
          post_accuracy?: number | null
          pre_accuracy?: number | null
          scheduled_for?: string
          skill_node_id?: string
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_retests_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_retests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      item_bank: {
        Row: {
          answer_alternatives: string[] | null
          answer_expression: string | null
          correct_answer: string
          created_at: string | null
          difficulty_rating: number | null
          distractor_tags: Json | null
          explanation: string
          grading_variables: Json | null
          id: string
          item_format: string
          options: Json | null
          partial_credit_rules: Json | null
          prompt: string
          question_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_skill_tags: string[]
          skill_node_id: string
          solution_steps: Json | null
          status: string
          step_sequence: Json | null
          stimulus: Json | null
        }
        Insert: {
          answer_alternatives?: string[] | null
          answer_expression?: string | null
          correct_answer: string
          created_at?: string | null
          difficulty_rating?: number | null
          distractor_tags?: Json | null
          explanation: string
          grading_variables?: Json | null
          id?: string
          item_format?: string
          options?: Json | null
          partial_credit_rules?: Json | null
          prompt: string
          question_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_skill_tags?: string[]
          skill_node_id: string
          solution_steps?: Json | null
          status?: string
          step_sequence?: Json | null
          stimulus?: Json | null
        }
        Update: {
          answer_alternatives?: string[] | null
          answer_expression?: string | null
          correct_answer?: string
          created_at?: string | null
          difficulty_rating?: number | null
          distractor_tags?: Json | null
          explanation?: string
          grading_variables?: Json | null
          id?: string
          item_format?: string
          options?: Json | null
          partial_credit_rules?: Json | null
          prompt?: string
          question_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_skill_tags?: string[]
          skill_node_id?: string
          solution_steps?: Json | null
          status?: string
          step_sequence?: Json | null
          stimulus?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "item_bank_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_board_events: {
        Row: {
          accuracy_pct: number | null
          avatar_url: string | null
          display_name: string
          event_type: string
          id: string
          is_first_attempt: boolean
          new_rank_tier: string | null
          node_name: string
          occurred_at: string
          skill_node_id: string | null
          unit_name: string
          user_id: string
        }
        Insert: {
          accuracy_pct?: number | null
          avatar_url?: string | null
          display_name: string
          event_type: string
          id?: string
          is_first_attempt?: boolean
          new_rank_tier?: string | null
          node_name: string
          occurred_at?: string
          skill_node_id?: string | null
          unit_name: string
          user_id: string
        }
        Update: {
          accuracy_pct?: number | null
          avatar_url?: string | null
          display_name?: string
          event_type?: string
          id?: string
          is_first_attempt?: boolean
          new_rank_tier?: string | null
          node_name?: string
          occurred_at?: string
          skill_node_id?: string | null
          unit_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_board_events_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_board_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_decay_alerts: {
        Row: {
          alert_sent_at: string | null
          current_state: string
          hours_until_decay: number
          skill_node_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_sent_at?: string | null
          current_state: string
          hours_until_decay: number
          skill_node_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_sent_at?: string | null
          current_state?: string
          hours_until_decay?: number
          skill_node_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_decay_alerts_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_decay_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_grid_snapshots: {
        Row: {
          created_at: string
          id: string
          node_states: Json
          rolling_accuracy: Json
          snapshot_week: string
          user_id: string
          verified_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          node_states?: Json
          rolling_accuracy?: Json
          snapshot_week: string
          user_id: string
          verified_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          node_states?: Json
          rolling_accuracy?: Json
          snapshot_week?: string
          user_id?: string
          verified_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "mastery_grid_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mentrixa_certifications: {
        Row: {
          accuracy_overall: number
          below_threshold_since: string | null
          id: string
          issued_at: string
          nodes_verified: number
          revoke_reason: string | null
          revoked_at: string | null
          subject: string
          total_nodes: number
          user_id: string
          verification_token: string
          verified_percentile: number
        }
        Insert: {
          accuracy_overall: number
          below_threshold_since?: string | null
          id?: string
          issued_at?: string
          nodes_verified: number
          revoke_reason?: string | null
          revoked_at?: string | null
          subject: string
          total_nodes: number
          user_id: string
          verification_token?: string
          verified_percentile: number
        }
        Update: {
          accuracy_overall?: number
          below_threshold_since?: string | null
          id?: string
          issued_at?: string
          nodes_verified?: number
          revoke_reason?: string | null
          revoked_at?: string | null
          subject?: string
          total_nodes?: number
          user_id?: string
          verification_token?: string
          verified_percentile?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentrixa_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_pack_credits: {
        Row: {
          created_at: string
          credits_granted: number
          credits_remaining: number
          expires_at: string
          granted_at: string
          id: string
          stripe_checkout_session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_granted: number
          credits_remaining: number
          expires_at: string
          granted_at?: string
          id?: string
          stripe_checkout_session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_granted?: number
          credits_remaining?: number
          expires_at?: string
          granted_at?: string
          id?: string
          stripe_checkout_session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "momentum_pack_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_session_credit_redemptions: {
        Row: {
          availability_id: string | null
          credit_id: string | null
          id: string
          idempotency_key: string
          pack_credit_id: string | null
          redeemed_at: string
          session_request_id: string | null
          user_id: string
        }
        Insert: {
          availability_id?: string | null
          credit_id?: string | null
          id?: string
          idempotency_key: string
          pack_credit_id?: string | null
          redeemed_at?: string
          session_request_id?: string | null
          user_id: string
        }
        Update: {
          availability_id?: string | null
          credit_id?: string | null
          id?: string
          idempotency_key?: string
          pack_credit_id?: string | null
          redeemed_at?: string
          session_request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "momentum_session_credit_redemptions_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: true
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_session_credit_redemptions_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "momentum_session_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_session_credit_redemptions_pack_credit_id_fkey"
            columns: ["pack_credit_id"]
            isOneToOne: false
            referencedRelation: "momentum_pack_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_session_credit_redemptions_session_request_id_fkey"
            columns: ["session_request_id"]
            isOneToOne: false
            referencedRelation: "session_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_session_credit_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_session_credits: {
        Row: {
          created_at: string
          credits_granted: number
          credits_remaining: number
          grant_source: string
          id: string
          period_month: string
          stripe_invoice_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_granted?: number
          credits_remaining?: number
          grant_source?: string
          id?: string
          period_month: string
          stripe_invoice_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_granted?: number
          credits_remaining?: number
          grant_source?: string
          id?: string
          period_month?: string
          stripe_invoice_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "momentum_session_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_sla_grants: {
        Row: {
          credit_id: string | null
          email_sent_at: string | null
          grant_source: string
          granted_at: string
          id: string
          idempotency_key: string
          intervention_retest_id: string
          movement_receipt_logged_at: string | null
          post_accuracy: number | null
          pre_accuracy: number | null
          session_id: string | null
          skill_node_id: string | null
          user_id: string
        }
        Insert: {
          credit_id?: string | null
          email_sent_at?: string | null
          grant_source?: string
          granted_at?: string
          id?: string
          idempotency_key: string
          intervention_retest_id: string
          movement_receipt_logged_at?: string | null
          post_accuracy?: number | null
          pre_accuracy?: number | null
          session_id?: string | null
          skill_node_id?: string | null
          user_id: string
        }
        Update: {
          credit_id?: string | null
          email_sent_at?: string | null
          grant_source?: string
          granted_at?: string
          id?: string
          idempotency_key?: string
          intervention_retest_id?: string
          movement_receipt_logged_at?: string | null
          post_accuracy?: number | null
          pre_accuracy?: number | null
          session_id?: string | null
          skill_node_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "momentum_sla_grants_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "momentum_session_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_sla_grants_intervention_retest_id_fkey"
            columns: ["intervention_retest_id"]
            isOneToOne: true
            referencedRelation: "intervention_retests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_sla_grants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_sla_grants_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "momentum_sla_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_receipts: {
        Row: {
          clicked_at: string | null
          email_sent_at: string | null
          generated_at: string
          id: string
          receipt_data: Json
          student_id: string
          week_start: string
        }
        Insert: {
          clicked_at?: string | null
          email_sent_at?: string | null
          generated_at?: string
          id?: string
          receipt_data: Json
          student_id: string
          week_start: string
        }
        Update: {
          clicked_at?: string | null
          email_sent_at?: string | null
          generated_at?: string
          id?: string
          receipt_data?: Json
          student_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "movement_receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      node_percentile_snapshot: {
        Row: {
          accuracy_bucket: number
          computed_at: string
          skill_node_id: string
          user_count: number
        }
        Insert: {
          accuracy_bucket: number
          computed_at?: string
          skill_node_id: string
          user_count?: number
        }
        Update: {
          accuracy_bucket?: number
          computed_at?: string
          skill_node_id?: string
          user_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "node_percentile_snapshot_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_custodian_access: {
        Row: {
          custodian_email: string
          granted_at: string
          id: string
          invite_id: string | null
          revoked_at: string | null
          student_id: string
        }
        Insert: {
          custodian_email: string
          granted_at?: string
          id?: string
          invite_id?: string | null
          revoked_at?: string | null
          student_id: string
        }
        Update: {
          custodian_email?: string
          granted_at?: string
          id?: string
          invite_id?: string | null
          revoked_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_custodian_access_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "parent_custodian_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_custodian_access_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_custodian_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          custodian_email: string
          expires_at: string
          id: string
          invite_token_hash: string
          revoked_at: string | null
          student_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          custodian_email: string
          expires_at: string
          id?: string
          invite_token_hash: string
          revoked_at?: string | null
          student_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          custodian_email?: string
          expires_at?: string
          id?: string
          invite_token_hash?: string
          revoked_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_custodian_invites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_snapshots: {
        Row: {
          clicked_at: string | null
          email_sent_at: string | null
          generated_at: string
          id: string
          snapshot_data: Json
          student_id: string
        }
        Insert: {
          clicked_at?: string | null
          email_sent_at?: string | null
          generated_at?: string
          id?: string
          snapshot_data: Json
          student_id: string
        }
        Update: {
          clicked_at?: string | null
          email_sent_at?: string | null
          generated_at?: string
          id?: string
          snapshot_data?: Json
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_secret: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_secret: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_secret?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_topic_tags: {
        Row: {
          correct: boolean
          created_at: string
          id: string
          quest_id: string
          skill_node_id: string | null
          subject: string
          subtopic: string
          topic: string
          user_id: string
        }
        Insert: {
          correct?: boolean
          created_at?: string
          id?: string
          quest_id: string
          skill_node_id?: string | null
          subject: string
          subtopic: string
          topic: string
          user_id: string
        }
        Update: {
          correct?: boolean
          created_at?: string
          id?: string
          quest_id?: string
          skill_node_id?: string | null
          subject?: string
          subtopic?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_topic_tags_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_topic_tags_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_topic_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          created_at: string
          creator_user_id: string | null
          id: string
          metadata: Json | null
          prompt: string
          solution: string | null
        }
        Insert: {
          created_at?: string
          creator_user_id?: string | null
          id?: string
          metadata?: Json | null
          prompt: string
          solution?: string | null
        }
        Update: {
          created_at?: string
          creator_user_id?: string | null
          id?: string
          metadata?: Json | null
          prompt?: string
          solution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quests_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          session_id: string
          student_id: string
          tutor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          session_id: string
          student_id: string
          tutor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          session_id?: string
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward_credited: boolean
          reward_xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_credited?: boolean
          reward_xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_credited?: boolean
          reward_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          account_linked_at: string | null
          created_at: string
          email: string
          id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          account_linked_at?: string | null
          created_at?: string
          email: string
          id?: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_linked_at?: string | null
          created_at?: string
          email?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rate_limits: {
        Row: {
          bucket_start: string
          hit_count: number
          rate_key: string
          updated_at: string
        }
        Insert: {
          bucket_start: string
          hit_count?: number
          rate_key: string
          updated_at?: string
        }
        Update: {
          bucket_start?: string
          hit_count?: number
          rate_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_ai_context: {
        Row: {
          chat_transcript: Json
          created_at: string
          recording_hints: Json
          screen_share_timeline: Json
          session_id: string
          tutor_id: string
          updated_at: string
          whiteboard_snapshot_data_url: string | null
          whiteboard_summary: Json
        }
        Insert: {
          chat_transcript?: Json
          created_at?: string
          recording_hints?: Json
          screen_share_timeline?: Json
          session_id: string
          tutor_id: string
          updated_at?: string
          whiteboard_snapshot_data_url?: string | null
          whiteboard_summary?: Json
        }
        Update: {
          chat_transcript?: Json
          created_at?: string
          recording_hints?: Json
          screen_share_timeline?: Json
          session_id?: string
          tutor_id?: string
          updated_at?: string
          whiteboard_snapshot_data_url?: string | null
          whiteboard_summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "session_ai_context_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_ai_context_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_ai_packages: {
        Row: {
          created_at: string
          flashcards: Json
          follow_up_topics: string[]
          followup_quests: Json
          generated_by: string | null
          key_points: string[] | null
          package_published_at: string | null
          practice_exercises: Json
          session_id: string
          studio_regenerate_count: number
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          flashcards?: Json
          follow_up_topics?: string[]
          followup_quests?: Json
          generated_by?: string | null
          key_points?: string[] | null
          package_published_at?: string | null
          practice_exercises?: Json
          session_id: string
          studio_regenerate_count?: number
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          flashcards?: Json
          follow_up_topics?: string[]
          followup_quests?: Json
          generated_by?: string | null
          key_points?: string[] | null
          package_published_at?: string | null
          practice_exercises?: Json
          session_id?: string
          studio_regenerate_count?: number
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_ai_packages_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_ai_packages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_briefs: {
        Row: {
          created_at: string
          email_sent_at: string | null
          guide_context_cached_at: string | null
          guide_context_json: Json | null
          id: string
          likely_coverage: string[]
          questions_to_ask: string[]
          session_id: string
          student_id: string
          warm_up_hint: string | null
          warm_up_prompt: string
          warm_up_title: string
          weak_spots: string[]
        }
        Insert: {
          created_at?: string
          email_sent_at?: string | null
          guide_context_cached_at?: string | null
          guide_context_json?: Json | null
          id?: string
          likely_coverage?: string[]
          questions_to_ask?: string[]
          session_id: string
          student_id: string
          warm_up_hint?: string | null
          warm_up_prompt?: string
          warm_up_title?: string
          weak_spots?: string[]
        }
        Update: {
          created_at?: string
          email_sent_at?: string | null
          guide_context_cached_at?: string | null
          guide_context_json?: Json | null
          id?: string
          likely_coverage?: string[]
          questions_to_ask?: string[]
          session_id?: string
          student_id?: string
          warm_up_hint?: string | null
          warm_up_prompt?: string
          warm_up_title?: string
          weak_spots?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "session_briefs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_briefs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_recording_transcription_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          file_size: number | null
          gemini_file_name: string | null
          gemini_file_uri: string | null
          id: string
          key_topics: Json
          last_error: string | null
          learner_questions: Json
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          mime_type: string
          not_before: string
          recording_id: string
          screen_share_summary: string | null
          session_id: string
          status: string
          storage_path: string
          transcript_excerpt: string | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          file_size?: number | null
          gemini_file_name?: string | null
          gemini_file_uri?: string | null
          id?: string
          key_topics?: Json
          last_error?: string | null
          learner_questions?: Json
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          mime_type: string
          not_before?: string
          recording_id: string
          screen_share_summary?: string | null
          session_id: string
          status?: string
          storage_path: string
          transcript_excerpt?: string | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          file_size?: number | null
          gemini_file_name?: string | null
          gemini_file_uri?: string | null
          id?: string
          key_topics?: Json
          last_error?: string | null
          learner_questions?: Json
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          mime_type?: string
          not_before?: string
          recording_id?: string
          screen_share_summary?: string | null
          session_id?: string
          status?: string
          storage_path?: string
          transcript_excerpt?: string | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recording_transcription_jobs_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: true
            referencedRelation: "video_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_recording_transcription_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_recording_transcription_jobs_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_requests: {
        Row: {
          availability_id: string | null
          created_at: string
          id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_destination_charge: boolean
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          student_id: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          availability_id?: string | null
          created_at?: string
          id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_destination_charge?: boolean
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          student_id: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          availability_id?: string | null
          created_at?: string
          id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_destination_charge?: boolean
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          student_id?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_requests_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_target_nodes: {
        Row: {
          id: string
          post_session_checked_at: string | null
          post_session_correct: boolean | null
          pre_session_correct: boolean | null
          retest_scheduled_at: string | null
          session_id: string
          skill_node_id: string
        }
        Insert: {
          id?: string
          post_session_checked_at?: string | null
          post_session_correct?: boolean | null
          pre_session_correct?: boolean | null
          retest_scheduled_at?: string | null
          session_id: string
          skill_node_id: string
        }
        Update: {
          id?: string
          post_session_checked_at?: string | null
          post_session_correct?: boolean | null
          pre_session_correct?: boolean | null
          retest_scheduled_at?: string | null
          session_id?: string
          skill_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_target_nodes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_target_nodes_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          availability_id: string | null
          cancelled_at: string | null
          cancelled_by_role: string | null
          completed: boolean
          course: string
          created_at: string
          end_time: string
          id: string
          payout_status: string | null
          platform_fee_cents: number | null
          price_per_session: number | null
          start_time: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_destination_charge: boolean
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_reason: string | null
          stripe_transfer_id: string | null
          student_hidden_at: string | null
          student_id: string
          studio_package_withdrawn_at: string | null
          tutor_hidden_at: string | null
          tutor_id: string
        }
        Insert: {
          availability_id?: string | null
          cancelled_at?: string | null
          cancelled_by_role?: string | null
          completed?: boolean
          course: string
          created_at?: string
          end_time: string
          id?: string
          payout_status?: string | null
          platform_fee_cents?: number | null
          price_per_session?: number | null
          start_time: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_destination_charge?: boolean
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_refund_reason?: string | null
          stripe_transfer_id?: string | null
          student_hidden_at?: string | null
          student_id: string
          studio_package_withdrawn_at?: string | null
          tutor_hidden_at?: string | null
          tutor_id: string
        }
        Update: {
          availability_id?: string | null
          cancelled_at?: string | null
          cancelled_by_role?: string | null
          completed?: boolean
          course?: string
          created_at?: string
          end_time?: string
          id?: string
          payout_status?: string | null
          platform_fee_cents?: number | null
          price_per_session?: number | null
          start_time?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_destination_charge?: boolean
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_refund_reason?: string | null
          stripe_transfer_id?: string | null
          student_hidden_at?: string | null
          student_id?: string
          studio_package_withdrawn_at?: string | null
          tutor_hidden_at?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      share_artifacts: {
        Row: {
          after_value: number | null
          artifact_type: string
          before_value: number | null
          created_at: string
          guide_id: string | null
          guide_name: string | null
          id: string
          image_url: string | null
          intervention_retest_id: string | null
          node_name: string | null
          rank_tier: string | null
          share_token: string
          user_id: string
        }
        Insert: {
          after_value?: number | null
          artifact_type: string
          before_value?: number | null
          created_at?: string
          guide_id?: string | null
          guide_name?: string | null
          id?: string
          image_url?: string | null
          intervention_retest_id?: string | null
          node_name?: string | null
          rank_tier?: string | null
          share_token?: string
          user_id: string
        }
        Update: {
          after_value?: number | null
          artifact_type?: string
          before_value?: number | null
          created_at?: string
          guide_id?: string | null
          guide_name?: string | null
          id?: string
          image_url?: string | null
          intervention_retest_id?: string | null
          node_name?: string | null
          rank_tier?: string | null
          share_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_artifacts_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_artifacts_intervention_retest_id_fkey"
            columns: ["intervention_retest_id"]
            isOneToOne: true
            referencedRelation: "intervention_retests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_artifacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_duels: {
        Row: {
          challenger_hidden_at: string | null
          completed_at: string | null
          created_at: string
          division_key: string
          forfeited_by: string | null
          id: string
          initiator_id: string | null
          is_ai_opponent: boolean
          item_bank_ids: string[]
          match_source: string | null
          opponent_answers: number[] | null
          opponent_hidden_at: string | null
          opponent_ready_at: string | null
          opponent_score: number | null
          opponent_student_id: string | null
          questions: Json
          reward_amount_cents: number
          status: string
          student_answers: number[] | null
          student_id: string
          student_ready_at: string | null
          student_score: number | null
          updated_at: string
          winner: string | null
        }
        Insert: {
          challenger_hidden_at?: string | null
          completed_at?: string | null
          created_at?: string
          division_key: string
          forfeited_by?: string | null
          id?: string
          initiator_id?: string | null
          is_ai_opponent?: boolean
          item_bank_ids?: string[]
          match_source?: string | null
          opponent_answers?: number[] | null
          opponent_hidden_at?: string | null
          opponent_ready_at?: string | null
          opponent_score?: number | null
          opponent_student_id?: string | null
          questions?: Json
          reward_amount_cents?: number
          status: string
          student_answers?: number[] | null
          student_id: string
          student_ready_at?: string | null
          student_score?: number | null
          updated_at?: string
          winner?: string | null
        }
        Update: {
          challenger_hidden_at?: string | null
          completed_at?: string | null
          created_at?: string
          division_key?: string
          forfeited_by?: string | null
          id?: string
          initiator_id?: string | null
          is_ai_opponent?: boolean
          item_bank_ids?: string[]
          match_source?: string | null
          opponent_answers?: number[] | null
          opponent_hidden_at?: string | null
          opponent_ready_at?: string | null
          opponent_score?: number | null
          opponent_student_id?: string | null
          questions?: Json
          reward_amount_cents?: number
          status?: string
          student_answers?: number[] | null
          student_id?: string
          student_ready_at?: string | null
          student_score?: number | null
          updated_at?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_duels_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "skill_duels_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "mv_division_leaderboard"
            referencedColumns: ["division_key"]
          },
        ]
      }
      skill_error_events: {
        Row: {
          created_at: string
          failure_tag: string | null
          id: string
          item_id: string | null
          secondary_tags: string[]
          skill_node_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failure_tag?: string | null
          id?: string
          item_id?: string | null
          secondary_tags?: string[]
          skill_node_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          failure_tag?: string | null
          id?: string
          item_id?: string | null
          secondary_tags?: string[]
          skill_node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_error_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_error_events_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_error_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_nodes: {
        Row: {
          common_misconceptions: string[] | null
          created_at: string | null
          description: string | null
          display_order: number
          exam_stakes: string | null
          id: string
          node_name: string
          node_slug: string
          prerequisites: string[] | null
          subject: string
          unit_name: string
          unit_number: number
        }
        Insert: {
          common_misconceptions?: string[] | null
          created_at?: string | null
          description?: string | null
          display_order: number
          exam_stakes?: string | null
          id?: string
          node_name: string
          node_slug: string
          prerequisites?: string[] | null
          subject: string
          unit_name: string
          unit_number: number
        }
        Update: {
          common_misconceptions?: string[] | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          exam_stakes?: string | null
          id?: string
          node_name?: string
          node_slug?: string
          prerequisites?: string[] | null
          subject?: string
          unit_name?: string
          unit_number?: number
        }
        Relationships: []
      }
      stripe_webhook_log: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
      student_courses: {
        Row: {
          course_name: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_goals: {
        Row: {
          active: boolean
          created_at: string
          goal_type: string
          id: string
          subject: string
          target_date: string | null
          target_percentile: number | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          goal_type: string
          id?: string
          subject: string
          target_date?: string | null
          target_percentile?: number | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          goal_type?: string
          id?: string
          subject?: string
          target_date?: string | null
          target_percentile?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_knowledge_nodes: {
        Row: {
          attempts: number
          correct: number
          correct_streak: number
          created_at: string
          first_attempt_correct: boolean | null
          id: string
          last_seen_at: string | null
          mastery_score: number
          next_review_at: string | null
          skill_node_id: string | null
          subject: string
          subtopic: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          correct?: number
          correct_streak?: number
          created_at?: string
          first_attempt_correct?: boolean | null
          id?: string
          last_seen_at?: string | null
          mastery_score?: number
          next_review_at?: string | null
          skill_node_id?: string | null
          subject: string
          subtopic: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          correct?: number
          correct_streak?: number
          created_at?: string
          first_attempt_correct?: boolean | null
          id?: string
          last_seen_at?: string | null
          mastery_score?: number
          next_review_at?: string | null
          skill_node_id?: string | null
          subject?: string
          subtopic?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_knowledge_nodes_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_knowledge_nodes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_node_rolling_stats: {
        Row: {
          attempts_in_window: number
          last_updated: string
          rolling_accuracy: number
          skill_node_id: string
          user_id: string
        }
        Insert: {
          attempts_in_window?: number
          last_updated?: string
          rolling_accuracy?: number
          skill_node_id: string
          user_id: string
        }
        Update: {
          attempts_in_window?: number
          last_updated?: string
          rolling_accuracy?: number
          skill_node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_node_rolling_stats_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_node_rolling_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          last_reconciled_at: string | null
          local_status: string
          mismatch_detail: string | null
          mismatch_flagged_at: string | null
          plan_tier: string
          stripe_customer_id: string | null
          stripe_status: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          last_reconciled_at?: string | null
          local_status: string
          mismatch_detail?: string | null
          mismatch_flagged_at?: string | null
          plan_tier?: string
          stripe_customer_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          last_reconciled_at?: string | null
          local_status?: string
          mismatch_detail?: string | null
          mismatch_flagged_at?: string | null
          plan_tier?: string
          stripe_customer_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_momentum_gates: {
        Row: {
          created_at: string
          eligible_at: string | null
          min_reviewed_items: number
          min_verified_first_attempts: number
          momentum_eligible: boolean
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          eligible_at?: string | null
          min_reviewed_items?: number
          min_verified_first_attempts?: number
          momentum_eligible?: boolean
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          eligible_at?: string | null
          min_reviewed_items?: number
          min_verified_first_attempts?: number
          momentum_eligible?: boolean
          subject?: string
          updated_at?: string
        }
        Relationships: [        ]
      }
      subject_demand_snapshot: {
        Row: {
          computed_at: string
          skill_node_id: string
          students_weak_count: number
          subject: string
        }
        Insert: {
          computed_at?: string
          skill_node_id: string
          students_weak_count?: number
          subject: string
        }
        Update: {
          computed_at?: string
          skill_node_id?: string
          students_weak_count?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_demand_snapshot_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_status_mismatches: {
        Row: {
          detail: string | null
          flagged_at: string
          id: string
          local_status: string
          resolved_at: string | null
          stripe_status: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          detail?: string | null
          flagged_at?: string
          id?: string
          local_status: string
          resolved_at?: string | null
          stripe_status: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          detail?: string | null
          flagged_at?: string
          id?: string
          local_status?: string
          resolved_at?: string | null
          stripe_status?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_status_mismatches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      symbolic_grading_cache: {
        Row: {
          computed_at: string
          correct_expr_hash: string
          result: boolean
          student_expr_hash: string
        }
        Insert: {
          computed_at?: string
          correct_expr_hash: string
          result: boolean
          student_expr_hash: string
        }
        Update: {
          computed_at?: string
          correct_expr_hash?: string
          result?: boolean
          student_expr_hash?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      trajectory_certificate_exports: {
        Row: {
          export_kind: string
          generated_at: string
          id: string
          user_id: string
          verified_percentile: number | null
        }
        Insert: {
          export_kind?: string
          generated_at?: string
          id?: string
          user_id: string
          verified_percentile?: number | null
        }
        Update: {
          export_kind?: string
          generated_at?: string
          id?: string
          user_id?: string
          verified_percentile?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trajectory_certificate_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trajectory_index_snapshots: {
        Row: {
          components: Json
          created_at: string
          id: string
          score: number
          snapshot_date: string
          subject: string
          user_id: string
        }
        Insert: {
          components?: Json
          created_at?: string
          id?: string
          score: number
          snapshot_date: string
          subject: string
          user_id: string
        }
        Update: {
          components?: Json
          created_at?: string
          id?: string
          score?: number
          snapshot_date?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trajectory_index_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_courses: {
        Row: {
          course_name: string
          created_at: string
          id: string
          proof_description: string
          tutor_id: string
          verified: boolean
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          proof_description?: string
          tutor_id: string
          verified?: boolean
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          proof_description?: string
          tutor_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tutor_courses_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_payout_ledger: {
        Row: {
          course: string | null
          created_at: string
          gross_cents: number
          hold_until: string | null
          id: string
          net_cents: number
          platform_fee_cents: number
          session_date: string | null
          session_id: string | null
          status: string
          student_id: string | null
          transfer_id: string | null
          transferred_at: string | null
          tutor_id: string
        }
        Insert: {
          course?: string | null
          created_at?: string
          gross_cents?: number
          hold_until?: string | null
          id?: string
          net_cents?: number
          platform_fee_cents?: number
          session_date?: string | null
          session_id?: string | null
          status?: string
          student_id?: string | null
          transfer_id?: string | null
          transferred_at?: string | null
          tutor_id: string
        }
        Update: {
          course?: string | null
          created_at?: string
          gross_cents?: number
          hold_until?: string | null
          id?: string
          net_cents?: number
          platform_fee_cents?: number
          session_date?: string | null
          session_id?: string | null
          status?: string
          student_id?: string | null
          transfer_id?: string | null
          transferred_at?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_payout_ledger_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_payout_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_payout_ledger_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_trajectory_snapshots: {
        Row: {
          created_at: string
          id: string
          score: number
          snapshot_date: string
          subject_scores: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score: number
          snapshot_date: string
          subject_scores?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          snapshot_date?: string
          subject_scores?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_trajectory_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_type: string
          created_at: string
          from_level: number | null
          id: string
          meta: Json
          title: string | null
          to_level: number | null
          user_id: string
        }
        Insert: {
          achievement_type?: string
          created_at?: string
          from_level?: number | null
          id?: string
          meta?: Json
          title?: string | null
          to_level?: number | null
          user_id: string
        }
        Update: {
          achievement_type?: string
          created_at?: string
          from_level?: number | null
          id?: string
          meta?: Json
          title?: string | null
          to_level?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_divisions: {
        Row: {
          division_key: string
          joined_at: string
          user_id: string
        }
        Insert: {
          division_key: string
          joined_at?: string
          user_id: string
        }
        Update: {
          division_key?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_divisions_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_divisions_division_key_fkey"
            columns: ["division_key"]
            isOneToOne: false
            referencedRelation: "mv_division_leaderboard"
            referencedColumns: ["division_key"]
          },
          {
            foreignKeyName: "user_divisions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          href: string | null
          id: string
          kind: string
          read_at: string | null
          source_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          read_at?: string | null
          source_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          source_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quest_progress: {
        Row: {
          id: string
          is_first_attempt_for_node: boolean | null
          last_attempt_at: string | null
          mode: string | null
          num_attempts: number
          quest_id: string
          skill_node_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          is_first_attempt_for_node?: boolean | null
          last_attempt_at?: string | null
          mode?: string | null
          num_attempts?: number
          quest_id: string
          skill_node_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          is_first_attempt_for_node?: boolean | null
          last_attempt_at?: string | null
          mode?: string | null
          num_attempts?: number
          quest_id?: string
          skill_node_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quest_progress_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quest_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          avatar_url: string | null
          bio: string | null
          display_name: string | null
          duel_opt_in: boolean
          email_marketing: boolean
          email_session_booked: boolean
          email_session_cancelled: boolean
          email_session_reminders: boolean
          email_weekly_summary: boolean
          focused_division_key: string | null
          last_seen_state: Json | null
          profile_visible_to_tutors: boolean
          rank_card_public: boolean
          rank_card_username: string | null
          session_buffer_minutes: number
          session_default_duration: number
          timezone: string
          updated_at: string
          user_id: string
          vfa_streak_days: number
          vfa_streak_last_date: string | null
          vfa_streak_longest: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          display_name?: string | null
          duel_opt_in?: boolean
          email_marketing?: boolean
          email_session_booked?: boolean
          email_session_cancelled?: boolean
          email_session_reminders?: boolean
          email_weekly_summary?: boolean
          focused_division_key?: string | null
          last_seen_state?: Json | null
          profile_visible_to_tutors?: boolean
          rank_card_public?: boolean
          rank_card_username?: string | null
          session_buffer_minutes?: number
          session_default_duration?: number
          timezone?: string
          updated_at?: string
          user_id: string
          vfa_streak_days?: number
          vfa_streak_last_date?: string | null
          vfa_streak_longest?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          display_name?: string | null
          duel_opt_in?: boolean
          email_marketing?: boolean
          email_session_booked?: boolean
          email_session_cancelled?: boolean
          email_session_reminders?: boolean
          email_weekly_summary?: boolean
          focused_division_key?: string | null
          last_seen_state?: Json | null
          profile_visible_to_tutors?: boolean
          rank_card_public?: boolean
          rank_card_username?: string | null
          session_buffer_minutes?: number
          session_default_duration?: number
          timezone?: string
          updated_at?: string
          user_id?: string
          vfa_streak_days?: number
          vfa_streak_last_date?: string | null
          vfa_streak_longest?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_focused_division_key_fkey"
            columns: ["focused_division_key"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_settings_focused_division_key_fkey"
            columns: ["focused_division_key"]
            isOneToOne: false
            referencedRelation: "mv_division_leaderboard"
            referencedColumns: ["division_key"]
          },
        ]
      }
      user_verifications: {
        Row: {
          admin_notes: string | null
          created_at: string
          deadline_at: string
          id: string
          info_request_message: string | null
          info_requested_at: string | null
          info_responded_at: string | null
          info_response: string | null
          outcome_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          deadline_at: string
          id?: string
          info_request_message?: string | null
          info_requested_at?: string | null
          info_responded_at?: string | null
          info_response?: string | null
          outcome_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role: string
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          deadline_at?: string
          id?: string
          info_request_message?: string | null
          info_requested_at?: string | null
          info_responded_at?: string | null
          info_response?: string | null
          outcome_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          division_xp: Json
          last_activity_at: string | null
          last_activity_date: string | null
          streak_days: number
          total_xp: number
          user_id: string
        }
        Insert: {
          division_xp?: Json
          last_activity_at?: string | null
          last_activity_date?: string | null
          streak_days?: number
          total_xp?: number
          user_id: string
        }
        Update: {
          division_xp?: Json
          last_activity_at?: string | null
          last_activity_date?: string | null
          streak_days?: number
          total_xp?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          age_confirmed_13_or_older: boolean
          age_confirmed_at: string | null
          approved: boolean
          auto_approve: boolean
          created_at: string
          guide_rank: string
          guide_rank_updated_at: string | null
          id: string
          is_blacklisted: boolean
          last_vfa_at: string | null
          referral_code: string
          referral_flagged: boolean
          referral_last_ip_hash: string | null
          referred_by: string | null
          role: string
          status: string
          stripe_account_id: string | null
          stripe_account_id_live: string | null
          stripe_account_id_test: string | null
          stripe_onboarding_at: string | null
          stripe_payouts_enabled: boolean
          updated_at: string
          verification_id: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          age_confirmed_13_or_older?: boolean
          age_confirmed_at?: string | null
          approved?: boolean
          auto_approve?: boolean
          created_at?: string
          guide_rank?: string
          guide_rank_updated_at?: string | null
          id: string
          is_blacklisted?: boolean
          last_vfa_at?: string | null
          referral_code: string
          referral_flagged?: boolean
          referral_last_ip_hash?: string | null
          referred_by?: string | null
          role: string
          status?: string
          stripe_account_id?: string | null
          stripe_account_id_live?: string | null
          stripe_account_id_test?: string | null
          stripe_onboarding_at?: string | null
          stripe_payouts_enabled?: boolean
          updated_at?: string
          verification_id?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          age_confirmed_13_or_older?: boolean
          age_confirmed_at?: string | null
          approved?: boolean
          auto_approve?: boolean
          created_at?: string
          guide_rank?: string
          guide_rank_updated_at?: string | null
          id?: string
          is_blacklisted?: boolean
          last_vfa_at?: string | null
          referral_code?: string
          referral_flagged?: boolean
          referral_last_ip_hash?: string | null
          referred_by?: string | null
          role?: string
          status?: string
          stripe_account_id?: string | null
          stripe_account_id_live?: string | null
          stripe_account_id_test?: string | null
          stripe_onboarding_at?: string | null
          stripe_payouts_enabled?: boolean
          updated_at?: string
          verification_id?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "user_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          user_id: string
          verification_id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          user_id: string
          verification_id: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          user_id?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_audit_log_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "user_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_first_grading_keys: {
        Row: {
          graded_at: string
          item_id: string
          part_key: string
          user_id: string
        }
        Insert: {
          graded_at?: string
          item_id: string
          part_key?: string
          user_id: string
        }
        Update: {
          graded_at?: string
          item_id?: string
          part_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verified_first_grading_keys_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_first_grading_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_first_attempts: {
        Row: {
          accuracy_pct: number
          attempted_at: string | null
          attempt_format: string
          id: string
          is_correct: boolean
          item_id: string
          part_key: string | null
          skill_node_id: string
          user_id: string
        }
        Insert: {
          accuracy_pct?: number
          attempted_at?: string | null
          attempt_format?: string
          id?: string
          is_correct: boolean
          item_id: string
          part_key?: string | null
          skill_node_id: string
          user_id: string
        }
        Update: {
          accuracy_pct?: number
          attempted_at?: string | null
          attempt_format?: string
          id?: string
          is_correct?: boolean
          item_id?: string
          part_key?: string | null
          skill_node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verified_first_attempts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_first_attempts_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_first_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      video_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          recording_consent_confirmed: boolean
          room_id: string
          session_id: string
          started_at: string
          storage_path: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          file_name: string
          file_size: number
          id?: string
          mime_type?: string
          recording_consent_confirmed?: boolean
          room_id: string
          session_id: string
          started_at: string
          storage_path: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          recording_consent_confirmed?: boolean
          room_id?: string
          session_id?: string
          started_at?: string
          storage_path?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_recordings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "video_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_recordings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      video_rooms: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string
          id: string
          room_token: string
          session_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at: string
          id?: string
          room_token: string
          session_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          room_token?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_rooms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapped_reports: {
        Row: {
          generated_at: string
          id: string
          image_url: Json | null
          report_data: Json
          report_year: number
          role: string
          share_token: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          image_url?: Json | null
          report_data: Json
          report_year: number
          role: string
          share_token?: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          image_url?: Json | null
          report_data?: Json
          report_year?: number
          role?: string
          share_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wrapped_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_award_ledger: {
        Row: {
          award_key: string
          created_at: string
          id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          award_key: string
          created_at?: string
          id?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          award_key?: string
          created_at?: string
          id?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_award_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_division_leaderboard: {
        Row: {
          division_key: string | null
          division_xp: number | null
          streak_days: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_guide_impact: {
        Row: {
          guide_id: string | null
          impact_score: number | null
          sessions_counted: number | null
          subject: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_tutor_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_guide_impact_by_node: {
        Row: {
          after_accuracy: number | null
          before_accuracy: number | null
          guide_id: string | null
          impact_lift: number | null
          impact_score: number | null
          node_name: string | null
          skill_node_id: string | null
          students_counted: number | null
          subject: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_tutor_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_first_attempts_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accuracy_to_percentile_bucket: {
        Args: { p_accuracy: number }
        Returns: number
      }
      acquire_availability_checkout_lock: {
        Args: {
          p_availability_id: string
          p_locked_until: string
          p_user_id: string
        }
        Returns: boolean
      }
      approve_session_request_atomic:
        | {
            Args: { p_actor_id: string; p_request_id: string }
            Returns: {
              session_id: string
            }[]
          }
        | {
            Args: {
              p_actor_id: string
              p_is_admin?: boolean
              p_request_id: string
            }
            Returns: {
              session_id: string
            }[]
          }
      assert_ap_calc_ab_skill_nodes: { Args: never; Returns: undefined }
      auto_complete_sessions: { Args: never; Returns: undefined }
      calculate_guide_rank: { Args: { p_guide_id: string }; Returns: string }
      can_student_cancel: { Args: { session_start: string }; Returns: boolean }
      cleanup_expired_rooms: { Args: never; Returns: undefined }
      complete_due_intervention_retests: {
        Args: {
          p_post_accuracy: number
          p_skill_node_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      count_ap_calc_ab_skill_nodes: { Args: never; Returns: number }
      create_user_verification: {
        Args: { p_role: string; p_user_id: string }
        Returns: string
      }
      delete_registration_requests_by_identity_email: {
        Args: { p_email: string }
        Returns: undefined
      }
      division_hub_cards: { Args: { p_user_id: string }; Returns: Json }
      duel_queue_join_and_match:
        | {
            Args: { p_division_key: string; p_joiner: string }
            Returns: {
              duel_id: string
              matched: boolean
              opponent_id: string
            }[]
          }
        | {
            Args: { p_division_key: string; p_joiner: string; p_level: number }
            Returns: {
              duel_id: string
              matched: boolean
              opponent_id: string
            }[]
          }
      expire_video_rooms: { Args: never; Returns: undefined }
      generate_referral_code_candidate: { Args: never; Returns: string }
      generate_room_token: { Args: never; Returns: string }
      generate_unique_referral_code: { Args: never; Returns: string }
      get_comparison_context: {
        Args: {
          p_actor_id: string
          p_actor_kind?: string
          p_skill_node_id: string
        }
        Returns: string
      }
      get_share_artifact_by_token: {
        Args: { p_token: string }
        Returns: {
          after_value: number
          artifact_type: string
          before_value: number
          created_at: string
          guide_name: string
          id: string
          image_url: string
          node_name: string
          rank_card_username: string
          share_token: string
        }[]
      }
      get_guide_breakthroughs: {
        Args: { p_guide_id: string; p_limit?: number }
        Returns: {
          concept: string
          post_percent: number
          pre_percent: number
        }[]
      }
      get_user_rank: {
        Args: { p_division_key: string; p_user_id: string }
        Returns: number
      }
      get_verified_first_attempt_rank: {
        Args: { p_user_id: string }
        Returns: {
          accuracy_percent: number
          percentile: number
          verified_count: number
        }[]
      }
      get_weakest_nodes: {
        Args: { p_limit?: number; p_subject: string; p_user_id: string }
        Returns: {
          accuracy_ratio: number
          attempts_count: number
          correct_count: number
          display_order: number
          id: string
          node_name: string
          node_slug: string
          subject: string
          unit_name: string
          unit_number: number
        }[]
      }
      identity_email_key: { Args: { e: string }; Returns: string }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_approved_student: { Args: { user_id: string }; Returns: boolean }
      is_approved_tutor: { Args: { user_id: string }; Returns: boolean }
      is_auto_approve_registrations: { Args: never; Returns: boolean }
      refresh_ap_calc_verified_rank_cache: { Args: never; Returns: undefined }
      refresh_ap_calc_verified_rank_cache_recent: {
        Args: { p_window?: string }
        Returns: number
      }
      refresh_division_leaderboard_mv: { Args: never; Returns: undefined }
      refresh_guide_impact_mv: { Args: never; Returns: undefined }
      registration_request_by_identity_email: {
        Args: { p_email: string }
        Returns: {
          account_linked_at: string | null
          created_at: string
          email: string
          id: string
          role: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "registration_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      seed_admin_user: { Args: { admin_user_id: string }; Returns: undefined }
      student_hub_snapshot: { Args: { p_user_id: string }; Returns: Json }
      sync_all_guide_ranks: { Args: never; Returns: undefined }
      sync_guide_impact_percentile_snapshot: { Args: never; Returns: number }
      sync_guide_impact_scores: { Args: never; Returns: undefined }
      sync_subject_demand_snapshot: { Args: never; Returns: number }
      sync_node_percentile_snapshot: { Args: never; Returns: number }
      sync_peer_comparison_snapshots: { Args: never; Returns: Json }
      utc_week_monday: { Args: { p_ts?: string }; Returns: string }
      verify_ap_calc_ab_skill_nodes: {
        Args: never
        Returns: {
          node_count: number
          passes: boolean
          unit_count: number
        }[]
      }
      verify_ap_calc_verified_rank_cache: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          passed: boolean
        }[]
      }
      verify_guidance_verdict_materialized: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          passed: boolean
        }[]
      }
      verify_intervention_retests: { Args: never; Returns: Json }
      verify_peer_comparison_snapshots: { Args: never; Returns: Json }
      verify_verified_first_attempt_mechanic: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          passed: boolean
        }[]
      }
    }
    Enums: {
      institution_plan: "free" | "basic" | "pro"
      verification_status:
        | "pending"
        | "in_review"
        | "approved"
        | "rejected"
        | "blacklisted"
        | "info_requested"
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
      institution_plan: ["free", "basic", "pro"],
      verification_status: [
        "pending",
        "in_review",
        "approved",
        "rejected",
        "blacklisted",
        "info_requested",
      ],
    },
  },
} as const
