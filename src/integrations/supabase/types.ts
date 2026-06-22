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
      alert_templates: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_system: boolean
          message: string
          purpose: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean
          message: string
          purpose: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean
          message?: string
          purpose?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      boat_types: {
        Row: {
          category_group: string
          created_at: string
          icon_url: string | null
          id: string
          sort_order: number
          subcategory_name: string
          updated_at: string
        }
        Insert: {
          category_group: string
          created_at?: string
          icon_url?: string | null
          id: string
          sort_order?: number
          subcategory_name: string
          updated_at?: string
        }
        Update: {
          category_group?: string
          created_at?: string
          icon_url?: string | null
          id?: string
          sort_order?: number
          subcategory_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_slots: {
        Row: {
          booking_id: string
          created_at: string
          duration_minutes: number
          id: string
          starts_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          starts_at: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_slots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          aide_earnings: number
          aide_id: string
          angler_written_reason: string | null
          balance_due_minor: number | null
          cancellation_timestamp: string | null
          class_session_id: string | null
          course_id: string | null
          created_at: string
          currency: string
          deposit_minor: number | null
          guests: number
          id: string
          learner_id: string
          notes: string | null
          phone: string | null
          primary_angler_name: string | null
          promo_code_id: string | null
          service_fee_amount: number
          status: Database["public"]["Enums"]["booking_status_t"]
          stripe_checkout_session_id: string | null
          thread_id: string | null
          total_price: number
          trip_date: string | null
          updated_at: string
        }
        Insert: {
          aide_earnings: number
          aide_id: string
          angler_written_reason?: string | null
          balance_due_minor?: number | null
          cancellation_timestamp?: string | null
          class_session_id?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          deposit_minor?: number | null
          guests?: number
          id?: string
          learner_id: string
          notes?: string | null
          phone?: string | null
          primary_angler_name?: string | null
          promo_code_id?: string | null
          service_fee_amount: number
          status?: Database["public"]["Enums"]["booking_status_t"]
          stripe_checkout_session_id?: string | null
          thread_id?: string | null
          total_price: number
          trip_date?: string | null
          updated_at?: string
        }
        Update: {
          aide_earnings?: number
          aide_id?: string
          angler_written_reason?: string | null
          balance_due_minor?: number | null
          cancellation_timestamp?: string | null
          class_session_id?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string
          deposit_minor?: number | null
          guests?: number
          id?: string
          learner_id?: string
          notes?: string | null
          phone?: string | null
          primary_angler_name?: string | null
          promo_code_id?: string | null
          service_fee_amount?: number
          status?: Database["public"]["Enums"]["booking_status_t"]
          stripe_checkout_session_id?: string | null
          thread_id?: string | null
          total_price?: number
          trip_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_disputes: {
        Row: {
          admin_notes: string | null
          booking_id: string
          captain_details: string
          captain_id: string
          claim_type: Database["public"]["Enums"]["cancellation_dispute_type_t"]
          created_at: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["cancellation_dispute_status_t"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          booking_id: string
          captain_details: string
          captain_id: string
          claim_type: Database["public"]["Enums"]["cancellation_dispute_type_t"]
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["cancellation_dispute_status_t"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          booking_id?: string
          captain_details?: string
          captain_id?: string
          claim_type?: Database["public"]["Enums"]["cancellation_dispute_type_t"]
          created_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["cancellation_dispute_status_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_featured: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          admin_label: string | null
          aide_id: string
          cohort_title: string | null
          course_id: string | null
          created_at: string
          currency: string | null
          expires_at: string | null
          filled_seats: number
          id: string
          is_live: boolean
          is_public_cohort: boolean
          listing_title: string
          live_ended_at: string | null
          live_started_at: string | null
          max_seats: number
          meeting_point_address: string | null
          meeting_point_lat: number | null
          meeting_point_lng: number | null
          meeting_point_place_id: string | null
          price_minor: number | null
          session_dates_times_array: Json
          status: Database["public"]["Enums"]["class_session_status_t"]
          updated_at: string
        }
        Insert: {
          admin_label?: string | null
          aide_id: string
          cohort_title?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          filled_seats?: number
          id?: string
          is_live?: boolean
          is_public_cohort?: boolean
          listing_title: string
          live_ended_at?: string | null
          live_started_at?: string | null
          max_seats?: number
          meeting_point_address?: string | null
          meeting_point_lat?: number | null
          meeting_point_lng?: number | null
          meeting_point_place_id?: string | null
          price_minor?: number | null
          session_dates_times_array?: Json
          status?: Database["public"]["Enums"]["class_session_status_t"]
          updated_at?: string
        }
        Update: {
          admin_label?: string | null
          aide_id?: string
          cohort_title?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          filled_seats?: number
          id?: string
          is_live?: boolean
          is_public_cohort?: boolean
          listing_title?: string
          live_ended_at?: string | null
          live_started_at?: string | null
          max_seats?: number
          meeting_point_address?: string | null
          meeting_point_lat?: number | null
          meeting_point_lng?: number | null
          meeting_point_place_id?: string | null
          price_minor?: number | null
          session_dates_times_array?: Json
          status?: Database["public"]["Enums"]["class_session_status_t"]
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          topic: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          topic: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          topic?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      course_certificates: {
        Row: {
          aide_id: string
          aide_name: string
          cert_number: string
          course_title: string
          id: string
          issued_at: string
          learner_id: string
          learner_name: string
          order_id: string
        }
        Insert: {
          aide_id: string
          aide_name: string
          cert_number: string
          course_title: string
          id?: string
          issued_at?: string
          learner_id: string
          learner_name: string
          order_id: string
        }
        Update: {
          aide_id?: string
          aide_name?: string
          cert_number?: string
          course_title?: string
          id?: string
          issued_at?: string
          learner_id?: string
          learner_name?: string
          order_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_system: boolean
          purpose: string
          subject: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean
          purpose: string
          subject: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean
          purpose?: string
          subject?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      host_availability: {
        Row: {
          booking_id: string | null
          created_at: string
          date: string
          host_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          date: string
          host_id: string
          id?: string
          status: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          date?: string
          host_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_availability_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_availability_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          aide_id: string
          course_id: string
          created_at: string
          id: string
          learner_id: string
          message_body: string
          preferred_time: string | null
          status: string
        }
        Insert: {
          aide_id: string
          course_id: string
          created_at?: string
          id?: string
          learner_id: string
          message_body: string
          preferred_time?: string | null
          status?: string
        }
        Update: {
          aide_id?: string
          course_id?: string
          created_at?: string
          id?: string
          learner_id?: string
          message_body?: string
          preferred_time?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_aide_id_fkey"
            columns: ["aide_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_history: {
        Row: {
          id: string
          ip: string
          seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip: string
          seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip?: string
          seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journey_portfolio_flags: {
        Row: {
          asset_id: string | null
          created_at: string
          id: string
          journey_id: string
          reason: string | null
          reporter_id: string | null
          resolved_at: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          id?: string
          journey_id: string
          reason?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          id?: string
          journey_id?: string
          reason?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_portfolio_flags_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          base_price_minor: number
          capacity: number
          category: string | null
          course_id_slug: string
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          discount_percentage: number
          experience_level: string | null
          extra_session_price_minor: number
          featured: boolean
          featured_image_url: string | null
          id: string
          mentor_bio: string | null
          mentor_id: string
          moderation_note: string | null
          moderation_status: Database["public"]["Enums"]["journey_moderation_status"]
          portfolio_assets: Json
          priority_order: number
          search_vector: unknown
          session_count: number
          session_descriptions: string[]
          session_length_minutes: number
          session_titles: string[]
          showcase_audio_url: string | null
          showcase_images: Json
          showcase_intro: string | null
          showcase_video_url: string | null
          slug: string | null
          sort_order: number
          status: Database["public"]["Enums"]["journey_status"]
          stripe_price_id: string | null
          stripe_product_id: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          base_price_minor?: number
          capacity?: number
          category?: string | null
          course_id_slug?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          discount_percentage?: number
          experience_level?: string | null
          extra_session_price_minor?: number
          featured?: boolean
          featured_image_url?: string | null
          id?: string
          mentor_bio?: string | null
          mentor_id: string
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["journey_moderation_status"]
          portfolio_assets?: Json
          priority_order?: number
          search_vector?: unknown
          session_count?: number
          session_descriptions?: string[]
          session_length_minutes?: number
          session_titles?: string[]
          showcase_audio_url?: string | null
          showcase_images?: Json
          showcase_intro?: string | null
          showcase_video_url?: string | null
          slug?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["journey_status"]
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          base_price_minor?: number
          capacity?: number
          category?: string | null
          course_id_slug?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          discount_percentage?: number
          experience_level?: string | null
          extra_session_price_minor?: number
          featured?: boolean
          featured_image_url?: string | null
          id?: string
          mentor_bio?: string | null
          mentor_id?: string
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["journey_moderation_status"]
          portfolio_assets?: Json
          priority_order?: number
          search_vector?: unknown
          session_count?: number
          session_descriptions?: string[]
          session_length_minutes?: number
          session_titles?: string[]
          showcase_audio_url?: string | null
          showcase_images?: Json
          showcase_intro?: string | null
          showcase_video_url?: string | null
          slug?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["journey_status"]
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentor_availability: {
        Row: {
          created_at: string
          mentor_id: string
          paused: boolean
          slots: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          mentor_id: string
          paused?: boolean
          slots?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          mentor_id?: string
          paused?: boolean
          slots?: Json
          updated_at?: string
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          journey_id: string | null
          last_message_at: string
          learner_archived_at: string | null
          learner_id: string
          mentor_archived_at: string | null
          mentor_id: string
          notified_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_id?: string | null
          last_message_at?: string
          learner_archived_at?: string | null
          learner_id: string
          mentor_archived_at?: string | null
          mentor_id: string
          notified_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_id?: string | null
          last_message_at?: string
          learner_archived_at?: string | null
          learner_id?: string
          mentor_archived_at?: string | null
          mentor_id?: string
          notified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_size_bytes: number | null
          attachment_type: Database["public"]["Enums"]["attachment_type_t"]
          attachment_url: string | null
          author_timezone: string | null
          body: string | null
          booking_id: string | null
          created_at: string
          id: string
          is_urgent: boolean
          offer_currency: string | null
          offer_description: string | null
          offer_expires_at: string | null
          offer_price_minor: number | null
          offer_sessions: number | null
          offer_status: Database["public"]["Enums"]["offer_status_t"] | null
          payment_link_journey_id: string | null
          read_status: boolean
          sender_id: string
          thread_id: string
          time_zone_label: string | null
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size_bytes?: number | null
          attachment_type?: Database["public"]["Enums"]["attachment_type_t"]
          attachment_url?: string | null
          author_timezone?: string | null
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          is_urgent?: boolean
          offer_currency?: string | null
          offer_description?: string | null
          offer_expires_at?: string | null
          offer_price_minor?: number | null
          offer_sessions?: number | null
          offer_status?: Database["public"]["Enums"]["offer_status_t"] | null
          payment_link_journey_id?: string | null
          read_status?: boolean
          sender_id: string
          thread_id: string
          time_zone_label?: string | null
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size_bytes?: number | null
          attachment_type?: Database["public"]["Enums"]["attachment_type_t"]
          attachment_url?: string | null
          author_timezone?: string | null
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          is_urgent?: boolean
          offer_currency?: string | null
          offer_description?: string | null
          offer_expires_at?: string | null
          offer_price_minor?: number | null
          offer_sessions?: number | null
          offer_status?: Database["public"]["Enums"]["offer_status_t"] | null
          payment_link_journey_id?: string | null
          read_status?: boolean
          sender_id?: string
          thread_id?: string
          time_zone_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      operator_photos: {
        Row: {
          bytes: number | null
          created_at: string
          gallery_url: string
          height: number | null
          hero_url: string
          id: string
          is_cover: boolean
          operator_id: string
          position: number
          storage_path: string
          thumb_url: string
          width: number | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          gallery_url: string
          height?: number | null
          hero_url: string
          id?: string
          is_cover?: boolean
          operator_id: string
          position?: number
          storage_path: string
          thumb_url: string
          width?: number | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          gallery_url?: string
          height?: number | null
          hero_url?: string
          id?: string
          is_cover?: boolean
          operator_id?: string
          position?: number
          storage_path?: string
          thumb_url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_photos_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_slug_history: {
        Row: {
          created_at: string
          id: string
          old_business_slug: string
          old_location_slug: string
          operator_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          old_business_slug: string
          old_location_slug: string
          operator_id: string
        }
        Update: {
          created_at?: string
          id?: string
          old_business_slug?: string
          old_location_slug?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_slug_history_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          about: string | null
          advance_notice_hours: number | null
          base_currency: string
          booking_type:
            | Database["public"]["Enums"]["operator_booking_type"]
            | null
          business_type:
            | Database["public"]["Enums"]["operator_business_type"]
            | null
          cancellation_policy:
            | Database["public"]["Enums"]["operator_cancellation_policy"]
            | null
          cover_image_url: string | null
          created_at: string
          default_departure_address: string | null
          default_departure_city: string | null
          default_departure_country: string | null
          default_departure_lat: number | null
          default_departure_lng: number | null
          default_departure_place_id: string | null
          default_departure_state: string | null
          display_name: string | null
          featured: boolean
          fishing_environments: string[]
          id: string
          listing_number: string | null
          location: string | null
          location_slug: string | null
          moderation_note: string | null
          moderation_status: Database["public"]["Enums"]["journey_moderation_status"]
          owner_id: string
          primary_category:
            | Database["public"]["Enums"]["operator_primary_category"]
            | null
          priority_order: number
          slug: string | null
          status: string
          submitted_at: string | null
          target_species: string[]
          updated_at: string
        }
        Insert: {
          about?: string | null
          advance_notice_hours?: number | null
          base_currency?: string
          booking_type?:
            | Database["public"]["Enums"]["operator_booking_type"]
            | null
          business_type?:
            | Database["public"]["Enums"]["operator_business_type"]
            | null
          cancellation_policy?:
            | Database["public"]["Enums"]["operator_cancellation_policy"]
            | null
          cover_image_url?: string | null
          created_at?: string
          default_departure_address?: string | null
          default_departure_city?: string | null
          default_departure_country?: string | null
          default_departure_lat?: number | null
          default_departure_lng?: number | null
          default_departure_place_id?: string | null
          default_departure_state?: string | null
          display_name?: string | null
          featured?: boolean
          fishing_environments?: string[]
          id?: string
          listing_number?: string | null
          location?: string | null
          location_slug?: string | null
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["journey_moderation_status"]
          owner_id: string
          primary_category?:
            | Database["public"]["Enums"]["operator_primary_category"]
            | null
          priority_order?: number
          slug?: string | null
          status?: string
          submitted_at?: string | null
          target_species?: string[]
          updated_at?: string
        }
        Update: {
          about?: string | null
          advance_notice_hours?: number | null
          base_currency?: string
          booking_type?:
            | Database["public"]["Enums"]["operator_booking_type"]
            | null
          business_type?:
            | Database["public"]["Enums"]["operator_business_type"]
            | null
          cancellation_policy?:
            | Database["public"]["Enums"]["operator_cancellation_policy"]
            | null
          cover_image_url?: string | null
          created_at?: string
          default_departure_address?: string | null
          default_departure_city?: string | null
          default_departure_country?: string | null
          default_departure_lat?: number | null
          default_departure_lng?: number | null
          default_departure_place_id?: string | null
          default_departure_state?: string | null
          display_name?: string | null
          featured?: boolean
          fishing_environments?: string[]
          id?: string
          listing_number?: string | null
          location?: string | null
          location_slug?: string | null
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["journey_moderation_status"]
          owner_id?: string
          primary_category?:
            | Database["public"]["Enums"]["operator_primary_category"]
            | null
          priority_order?: number
          slug?: string | null
          status?: string
          submitted_at?: string | null
          target_species?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      order_session_completions: {
        Row: {
          completed_at: string
          completed_by: string
          id: string
          order_id: string
          session_index: number
        }
        Insert: {
          completed_at?: string
          completed_by: string
          id?: string
          order_id: string
          session_index: number
        }
        Update: {
          completed_at?: string
          completed_by?: string
          id?: string
          order_id?: string
          session_index?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          aide_payout_minor: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          journey_id: string
          learner_id: string
          mentor_id: string
          order_number: string | null
          order_status: Database["public"]["Enums"]["order_status_t"]
          platform_fee_minor: number
          receipt_url: string | null
          scheduled_time: string | null
          sessions_remaining: number
          snapshot_course_title: string | null
          snapshot_currency: string | null
          snapshot_session_duration: number | null
          snapshot_session_titles: Json
          snapshot_total_minor: number | null
          snapshot_total_sessions: number | null
          stripe_checkout_session_id: string | null
          total_paid_minor: number
          updated_at: string
        }
        Insert: {
          aide_payout_minor?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          journey_id: string
          learner_id: string
          mentor_id: string
          order_number?: string | null
          order_status?: Database["public"]["Enums"]["order_status_t"]
          platform_fee_minor?: number
          receipt_url?: string | null
          scheduled_time?: string | null
          sessions_remaining: number
          snapshot_course_title?: string | null
          snapshot_currency?: string | null
          snapshot_session_duration?: number | null
          snapshot_session_titles?: Json
          snapshot_total_minor?: number | null
          snapshot_total_sessions?: number | null
          stripe_checkout_session_id?: string | null
          total_paid_minor: number
          updated_at?: string
        }
        Update: {
          aide_payout_minor?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          journey_id?: string
          learner_id?: string
          mentor_id?: string
          order_number?: string | null
          order_status?: Database["public"]["Enums"]["order_status_t"]
          platform_fee_minor?: number
          receipt_url?: string | null
          scheduled_time?: string | null
          sessions_remaining?: number
          snapshot_course_title?: string | null
          snapshot_currency?: string | null
          snapshot_session_duration?: number | null
          snapshot_session_titles?: Json
          snapshot_total_minor?: number | null
          snapshot_total_sessions?: number | null
          stripe_checkout_session_id?: string | null
          total_paid_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          active_stripe_mode: string
          connected_at: string | null
          id: number
          is_platform_stripe_active: boolean
          platform_fee_pct: number
          platform_stripe_account_id: string | null
          stripe_checkout_webhook_set: boolean
          stripe_connect_webhook_set: boolean
          stripe_live_publishable_key: string | null
          stripe_live_secret_set: boolean
          stripe_live_webhook_set: boolean
          stripe_test_publishable_key: string | null
          stripe_test_secret_set: boolean
          stripe_test_webhook_set: boolean
          updated_at: string
        }
        Insert: {
          active_stripe_mode?: string
          connected_at?: string | null
          id: number
          is_platform_stripe_active?: boolean
          platform_fee_pct?: number
          platform_stripe_account_id?: string | null
          stripe_checkout_webhook_set?: boolean
          stripe_connect_webhook_set?: boolean
          stripe_live_publishable_key?: string | null
          stripe_live_secret_set?: boolean
          stripe_live_webhook_set?: boolean
          stripe_test_publishable_key?: string | null
          stripe_test_secret_set?: boolean
          stripe_test_webhook_set?: boolean
          updated_at?: string
        }
        Update: {
          active_stripe_mode?: string
          connected_at?: string | null
          id?: number
          is_platform_stripe_active?: boolean
          platform_fee_pct?: number
          platform_stripe_account_id?: string | null
          stripe_checkout_webhook_set?: boolean
          stripe_connect_webhook_set?: boolean
          stripe_live_publishable_key?: string | null
          stripe_live_secret_set?: boolean
          stripe_live_webhook_set?: boolean
          stripe_test_publishable_key?: string | null
          stripe_test_secret_set?: boolean
          stripe_test_webhook_set?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      platform_stripe_secrets: {
        Row: {
          id: number
          stripe_checkout_webhook_secret: string | null
          stripe_connect_webhook_secret: string | null
          stripe_live_secret_key: string | null
          stripe_live_webhook_secret: string | null
          stripe_test_secret_key: string | null
          stripe_test_webhook_secret: string | null
          updated_at: string
        }
        Insert: {
          id: number
          stripe_checkout_webhook_secret?: string | null
          stripe_connect_webhook_secret?: string | null
          stripe_live_secret_key?: string | null
          stripe_live_webhook_secret?: string | null
          stripe_test_secret_key?: string | null
          stripe_test_webhook_secret?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          stripe_checkout_webhook_secret?: string | null
          stripe_connect_webhook_secret?: string | null
          stripe_live_secret_key?: string | null
          stripe_live_webhook_secret?: string | null
          stripe_test_secret_key?: string | null
          stripe_test_webhook_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          bio: string | null
          bio_custom: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          is_payout_ready: boolean
          is_profile_complete: boolean
          last_ip: string | null
          last_ip_at: string | null
          last_name: string | null
          login_count: number
          motto: string | null
          phone_number: string | null
          postal_code: string | null
          state_province: string | null
          stripe_connect_id: string | null
          stripe_customer_id: string | null
          timezone: string | null
          updated_at: string
          user_number_id: string
          user_status: Database["public"]["Enums"]["user_status_t"]
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          bio_custom?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_payout_ready?: boolean
          is_profile_complete?: boolean
          last_ip?: string | null
          last_ip_at?: string | null
          last_name?: string | null
          login_count?: number
          motto?: string | null
          phone_number?: string | null
          postal_code?: string | null
          state_province?: string | null
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          timezone?: string | null
          updated_at?: string
          user_number_id?: string
          user_status?: Database["public"]["Enums"]["user_status_t"]
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          bio_custom?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_payout_ready?: boolean
          is_profile_complete?: boolean
          last_ip?: string | null
          last_ip_at?: string | null
          last_name?: string | null
          login_count?: number
          motto?: string | null
          phone_number?: string | null
          postal_code?: string | null
          state_province?: string | null
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          timezone?: string | null
          updated_at?: string
          user_number_id?: string
          user_status?: Database["public"]["Enums"]["user_status_t"]
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          journey_id: string | null
          owner_id: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          journey_id?: string | null
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          journey_id?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reported_listings: {
        Row: {
          created_at: string
          custom_details: string | null
          id: string
          listing_id: string
          reason_category: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          custom_details?: string | null
          id?: string
          listing_id: string
          reason_category: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          custom_details?: string | null
          id?: string
          listing_id?: string
          reason_category?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          aide_id: string
          booking_id: string | null
          created_at: string
          description: string
          id: string
          learner_id: string
          listing_id: string
          order_id: string | null
          rating: number
          title: string
        }
        Insert: {
          aide_id: string
          booking_id?: string | null
          created_at?: string
          description: string
          id?: string
          learner_id: string
          listing_id: string
          order_id?: string | null
          rating: number
          title: string
        }
        Update: {
          aide_id?: string
          booking_id?: string | null
          created_at?: string
          description?: string
          id?: string
          learner_id?: string
          listing_id?: string
          order_id?: string | null
          rating?: number
          title?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          category: Database["public"]["Enums"]["site_page_category"]
          content_html: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          is_external: boolean
          order_priority: number
          slug: string
          status: Database["public"]["Enums"]["site_page_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["site_page_category"]
          content_html?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_external?: boolean
          order_priority?: number
          slug: string
          status?: Database["public"]["Enums"]["site_page_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["site_page_category"]
          content_html?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_external?: boolean
          order_priority?: number
          slug?: string
          status?: Database["public"]["Enums"]["site_page_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          booking_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          submitter_id: string | null
          topic: string
          user_type: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          submitter_id?: string | null
          topic: string
          user_type: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          submitter_id?: string | null
          topic?: string
          user_type?: string
        }
        Relationships: []
      }
      tag_category_links: {
        Row: {
          category_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_category_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          is_seeded: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          is_seeded?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          is_seeded?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      trip_packages: {
        Row: {
          booking_type: Database["public"]["Enums"]["trip_booking_type"]
          charter_type: Database["public"]["Enums"]["trip_charter_type"]
          created_at: string
          currency: string
          departure_address: string | null
          departure_lat: number | null
          departure_lng: number | null
          departure_place_id: string | null
          description: string | null
          duration_minutes: number
          environments: string[]
          id: string
          itinerary: string | null
          max_party_size: number | null
          min_party_size: number
          min_seats_to_sail: number | null
          operator_id: string
          per_extra_minor: number
          price_minor: number
          seats_available: number | null
          start_time: string | null
          status: Database["public"]["Enums"]["trip_package_status"]
          target_species: string[]
          techniques: string[]
          template_key: string | null
          title: string
          updated_at: string
          vessel_id: string | null
        }
        Insert: {
          booking_type?: Database["public"]["Enums"]["trip_booking_type"]
          charter_type?: Database["public"]["Enums"]["trip_charter_type"]
          created_at?: string
          currency?: string
          departure_address?: string | null
          departure_lat?: number | null
          departure_lng?: number | null
          departure_place_id?: string | null
          description?: string | null
          duration_minutes: number
          environments?: string[]
          id?: string
          itinerary?: string | null
          max_party_size?: number | null
          min_party_size?: number
          min_seats_to_sail?: number | null
          operator_id: string
          per_extra_minor?: number
          price_minor?: number
          seats_available?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["trip_package_status"]
          target_species?: string[]
          techniques?: string[]
          template_key?: string | null
          title: string
          updated_at?: string
          vessel_id?: string | null
        }
        Update: {
          booking_type?: Database["public"]["Enums"]["trip_booking_type"]
          charter_type?: Database["public"]["Enums"]["trip_charter_type"]
          created_at?: string
          currency?: string
          departure_address?: string | null
          departure_lat?: number | null
          departure_lng?: number | null
          departure_place_id?: string | null
          description?: string | null
          duration_minutes?: number
          environments?: string[]
          id?: string
          itinerary?: string | null
          max_party_size?: number | null
          min_party_size?: number
          min_seats_to_sail?: number | null
          operator_id?: string
          per_extra_minor?: number
          price_minor?: number
          seats_available?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["trip_package_status"]
          target_species?: string[]
          techniques?: string[]
          template_key?: string | null
          title?: string
          updated_at?: string
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_packages_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_packages_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_alerts: {
        Row: {
          created_at: string
          id: string
          journey_id: string | null
          kind: Database["public"]["Enums"]["user_alert_kind"]
          message: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_id?: string | null
          kind: Database["public"]["Enums"]["user_alert_kind"]
          message: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_id?: string | null
          kind?: Database["public"]["Enums"]["user_alert_kind"]
          message?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          journey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          journey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          journey_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vessels: {
        Row: {
          boat_type_id: string | null
          created_at: string
          engine_size: string | null
          engine_type: string | null
          features: Json
          horsepower_per_engine: number | null
          id: string
          length_ft: number | null
          manufacturer: string | null
          max_cruising_speed_knots: number | null
          max_passenger_capacity: number
          model: string | null
          num_engines: number | null
          operator_id: string
          restored: boolean
          updated_at: string
          year: number | null
        }
        Insert: {
          boat_type_id?: string | null
          created_at?: string
          engine_size?: string | null
          engine_type?: string | null
          features?: Json
          horsepower_per_engine?: number | null
          id?: string
          length_ft?: number | null
          manufacturer?: string | null
          max_cruising_speed_knots?: number | null
          max_passenger_capacity: number
          model?: string | null
          num_engines?: number | null
          operator_id: string
          restored?: boolean
          updated_at?: string
          year?: number | null
        }
        Update: {
          boat_type_id?: string | null
          created_at?: string
          engine_size?: string | null
          engine_type?: string | null
          features?: Json
          horsepower_per_engine?: number | null
          id?: string
          length_ft?: number | null
          manufacturer?: string | null
          max_cruising_speed_knots?: number | null
          max_passenger_capacity?: number
          model?: string | null
          num_engines?: number | null
          operator_id?: string
          restored?: boolean
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vessels_boat_type_id_fkey"
            columns: ["boat_type_id"]
            isOneToOne: false
            referencedRelation: "boat_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessels_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: true
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contains_forbidden_keyword: { Args: { _input: string }; Returns: boolean }
      expire_pending_custom_offers: { Args: never; Returns: number }
      generate_unique_cert_number: { Args: never; Returns: string }
      generate_unique_listing_number: { Args: never; Returns: string }
      generate_unique_order_number: { Args: never; Returns: string }
      generate_unique_user_number_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_class_session_seats: {
        Args: { _class_session_id: string }
        Returns: Json
      }
      list_unknown_tags: {
        Args: never
        Returns: {
          name: string
          usage_count: number
        }[]
      }
      merge_tags: {
        Args: { _dup_ids: string[]; _master_id: string }
        Returns: Json
      }
      next_course_id_slug: { Args: never; Returns: string }
      purge_unused_custom_tags: { Args: never; Returns: number }
      slugify: { Args: { _input: string }; Returns: string }
      trip_seats_booked_by_date: {
        Args: { _trip_id: string }
        Returns: {
          seats_booked: number
          trip_date: string
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "mentor" | "learner" | "admin"
      attachment_type_t: "none" | "custom_offer" | "payment_link" | "file"
      booking_status_t:
        | "pending_offer"
        | "declined"
        | "pending_payment"
        | "confirmed"
        | "completed"
        | "cancelled"
      cancellation_dispute_status_t: "pending" | "approved" | "denied"
      cancellation_dispute_type_t: "policy_payout" | "other"
      class_session_status_t: "active" | "completed" | "cancelled"
      journey_moderation_status: "pending" | "approved" | "declined"
      journey_status: "draft" | "published" | "archived"
      offer_status_t: "pending" | "accepted" | "declined"
      operator_booking_type: "instant" | "inquiry"
      operator_business_type: "charter" | "guide"
      operator_cancellation_policy: "flexible" | "moderate" | "strict"
      operator_primary_category: "offshore" | "inshore" | "freshwater" | "fly"
      order_status_t: "active" | "completed" | "refunded" | "paid"
      site_page_category: "explore" | "resources" | "legal"
      site_page_status: "live" | "draft"
      trip_booking_type: "instant_book" | "request_to_book"
      trip_charter_type: "private_charter" | "shared_tour"
      trip_package_status: "draft" | "active" | "archived"
      user_alert_kind:
        | "listing_pending"
        | "listing_live"
        | "listing_declined"
        | "booking_confirmed"
        | "reschedule_requested"
        | "reschedule_accepted"
        | "reschedule_declined"
        | "trip_cancelled_by_angler"
      user_status_t: "unverified" | "verified" | "blocked" | "archived"
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
      app_role: ["mentor", "learner", "admin"],
      attachment_type_t: ["none", "custom_offer", "payment_link", "file"],
      booking_status_t: [
        "pending_offer",
        "declined",
        "pending_payment",
        "confirmed",
        "completed",
        "cancelled",
      ],
      cancellation_dispute_status_t: ["pending", "approved", "denied"],
      cancellation_dispute_type_t: ["policy_payout", "other"],
      class_session_status_t: ["active", "completed", "cancelled"],
      journey_moderation_status: ["pending", "approved", "declined"],
      journey_status: ["draft", "published", "archived"],
      offer_status_t: ["pending", "accepted", "declined"],
      operator_booking_type: ["instant", "inquiry"],
      operator_business_type: ["charter", "guide"],
      operator_cancellation_policy: ["flexible", "moderate", "strict"],
      operator_primary_category: ["offshore", "inshore", "freshwater", "fly"],
      order_status_t: ["active", "completed", "refunded", "paid"],
      site_page_category: ["explore", "resources", "legal"],
      site_page_status: ["live", "draft"],
      trip_booking_type: ["instant_book", "request_to_book"],
      trip_charter_type: ["private_charter", "shared_tour"],
      trip_package_status: ["draft", "active", "archived"],
      user_alert_kind: [
        "listing_pending",
        "listing_live",
        "listing_declined",
        "booking_confirmed",
        "reschedule_requested",
        "reschedule_accepted",
        "reschedule_declined",
        "trip_cancelled_by_angler",
      ],
      user_status_t: ["unverified", "verified", "blocked", "archived"],
    },
  },
} as const
