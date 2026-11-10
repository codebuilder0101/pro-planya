/**
 * Supabase database types.
 *
 * Mirrors supabase/migrations in the exact shape produced by `supabase gen types`.
 * Regenerate after every migration once the project is linked:
 *   npm run gen:types   (from /app; see README)
 * and commit the result. Do not edit by hand after the first generation.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type ExperienceCardRow = {
  id: string
  host_id: string
  title: string
  category_id: string
  comuna: string
  starts_at: string
  ends_at: string
  capacity: number
  seats_taken: number
  is_free: boolean
  price_clp: number | null
  cover_url: string | null
  is_featured: boolean
  rating_avg: number
  rating_count: number
  lat: number
  lng: number
  distance_km: number | null
}

type BookingRow = {
  id: string
  experience_id: string
  user_id: string
  seats: number
  status: Database['public']['Enums']['booking_status']
  created_at: string
  cancelled_at: string | null
}

type ConversationRow = {
  id: string
  experience_id: string
  explorer_id: string
  host_id: string
  created_at: string
  last_message_at: string | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Database['public']['Enums']['user_role']
          full_name: string
          avatar_url: string | null
          cover_url: string | null
          bio: string
          interests: string[]
          city: string | null
          is_suspended: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: Database['public']['Enums']['user_role']
          full_name?: string
          avatar_url?: string | null
          cover_url?: string | null
          bio?: string
          interests?: string[]
          city?: string | null
          is_suspended?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: Database['public']['Enums']['user_role']
          full_name?: string
          avatar_url?: string | null
          cover_url?: string | null
          bio?: string
          interests?: string[]
          city?: string | null
          is_suspended?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          icon: string
          color: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          icon: string
          color: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon?: string
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      experiences: {
        Row: {
          id: string
          host_id: string
          title: string
          description: string
          category_id: string
          location: unknown
          comuna: string
          starts_at: string
          ends_at: string
          capacity: number
          seats_taken: number
          is_free: boolean
          price_clp: number | null
          source_name: string | null
          source_url: string | null
          status: Database['public']['Enums']['experience_status']
          is_featured: boolean
          cover_url: string | null
          rating_avg: number
          rating_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          host_id: string
          title: string
          description: string
          category_id: string
          location: unknown
          comuna: string
          starts_at: string
          ends_at: string
          capacity: number
          seats_taken?: number
          is_free?: boolean
          price_clp?: number | null
          source_name?: string | null
          source_url?: string | null
          status?: Database['public']['Enums']['experience_status']
          is_featured?: boolean
          cover_url?: string | null
          rating_avg?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          host_id?: string
          title?: string
          description?: string
          category_id?: string
          location?: unknown
          comuna?: string
          starts_at?: string
          ends_at?: string
          capacity?: number
          seats_taken?: number
          is_free?: boolean
          price_clp?: number | null
          source_name?: string | null
          source_url?: string | null
          status?: Database['public']['Enums']['experience_status']
          is_featured?: boolean
          cover_url?: string | null
          rating_avg?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'experiences_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'experiences_host_id_fkey'
            columns: ['host_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      experience_photos: {
        Row: {
          id: string
          experience_id: string
          url: string
          storage_path: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          experience_id: string
          url: string
          storage_path?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          experience_id?: string
          url?: string
          storage_path?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'experience_photos_experience_id_fkey'
            columns: ['experience_id']
            isOneToOne: false
            referencedRelation: 'experiences'
            referencedColumns: ['id']
          },
        ]
      }
      places: {
        Row: {
          id: string
          name: string
          description: string
          category_id: string | null
          location: unknown
          comuna: string
          photo_url: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          category_id?: string | null
          location: unknown
          comuna: string
          photo_url?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category_id?: string | null
          location?: unknown
          comuna?: string
          photo_url?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'places_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      bookings: {
        Row: BookingRow
        Insert: {
          id?: string
          experience_id: string
          user_id: string
          seats: number
          status?: Database['public']['Enums']['booking_status']
          created_at?: string
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          experience_id?: string
          user_id?: string
          seats?: number
          status?: Database['public']['Enums']['booking_status']
          created_at?: string
          cancelled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_experience_id_fkey'
            columns: ['experience_id']
            isOneToOne: false
            referencedRelation: 'experiences'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: ConversationRow
        Insert: {
          id?: string
          experience_id: string
          explorer_id: string
          host_id: string
          created_at?: string
          last_message_at?: string | null
        }
        Update: {
          id?: string
          experience_id?: string
          explorer_id?: string
          host_id?: string
          created_at?: string
          last_message_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_experience_id_fkey'
            columns: ['experience_id']
            isOneToOne: false
            referencedRelation: 'experiences'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_explorer_id_fkey'
            columns: ['explorer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_host_id_fkey'
            columns: ['host_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          body: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          body: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          body?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      favorites: {
        Row: {
          user_id: string
          experience_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          experience_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          experience_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_experience_id_fkey'
            columns: ['experience_id']
            isOneToOne: false
            referencedRelation: 'experiences'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          experience_id: string
          author_id: string
          rating: number
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          experience_id: string
          author_id: string
          rating: number
          comment?: string
          created_at?: string
        }
        Update: {
          id?: string
          experience_id?: string
          author_id?: string
          rating?: number
          comment?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_experience_id_fkey'
            columns: ['experience_id']
            isOneToOne: false
            referencedRelation: 'experiences'
            referencedColumns: ['id']
          },
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string | null
          target_type: Database['public']['Enums']['report_target']
          target_id: string
          reported_user_id: string | null
          reason: Database['public']['Enums']['report_reason']
          comment: string
          status: Database['public']['Enums']['report_status']
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          reporter_id?: string | null
          target_type: Database['public']['Enums']['report_target']
          target_id: string
          reported_user_id?: string | null
          reason: Database['public']['Enums']['report_reason']
          comment?: string
          status?: Database['public']['Enums']['report_status']
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string | null
          target_type?: Database['public']['Enums']['report_target']
          target_id?: string
          reported_user_id?: string | null
          reason?: Database['public']['Enums']['report_reason']
          comment?: string
          status?: Database['public']['Enums']['report_status']
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reports_reported_user_id_fkey'
            columns: ['reported_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_resolved_by_fkey'
            columns: ['resolved_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey'
            columns: ['blocked_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey'
            columns: ['blocker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: Database['public']['Enums']['push_platform']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform: Database['public']['Enums']['push_platform']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: Database['public']['Enums']['push_platform']
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_experience: {
        Args: { p_experience_id: string; p_seats?: number }
        Returns: BookingRow
      }
      cancel_booking: {
        Args: { p_booking_id: string }
        Returns: BookingRow
      }
      become_host: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
      search_experiences: {
        Args: {
          p_query?: string | null
          p_category_ids?: string[] | null
          p_lat?: number | null
          p_lng?: number | null
          p_radius_km?: number | null
          p_date_from?: string | null
          p_date_to?: string | null
          p_free_only?: boolean
          p_featured_only?: boolean
          p_sort?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: ExperienceCardRow[]
      }
      nearby_experiences: {
        Args: { p_lat: number; p_lng: number; p_radius_km?: number; p_limit?: number; p_offset?: number }
        Returns: ExperienceCardRow[]
      }
      count_nearby_experiences: {
        Args: { p_lat: number; p_lng: number; p_radius_km?: number }
        Returns: number
      }
      get_experience: {
        Args: { p_experience_id: string; p_lat?: number | null; p_lng?: number | null }
        Returns: {
          id: string
          host_id: string
          title: string
          description: string
          category_id: string
          comuna: string
          starts_at: string
          ends_at: string
          capacity: number
          seats_taken: number
          is_free: boolean
          price_clp: number | null
          source_name: string | null
          source_url: string | null
          status: Database['public']['Enums']['experience_status']
          is_featured: boolean
          cover_url: string | null
          rating_avg: number
          rating_count: number
          lat: number
          lng: number
          distance_km: number | null
          host_full_name: string
          host_avatar_url: string | null
          host_bio: string
          my_booking_id: string | null
          my_booking_seats: number | null
          is_favorite: boolean
        }[]
      }
      list_places: {
        Args: {
          p_lat?: number | null
          p_lng?: number | null
          p_category_ids?: string[] | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          name: string
          description: string
          category_id: string | null
          comuna: string
          photo_url: string | null
          tags: string[]
          lat: number
          lng: number
          distance_km: number | null
        }[]
      }
      list_my_experiences: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          id: string
          host_id: string
          title: string
          category_id: string
          comuna: string
          starts_at: string
          ends_at: string
          capacity: number
          seats_taken: number
          is_free: boolean
          price_clp: number | null
          status: Database['public']['Enums']['experience_status']
          is_featured: boolean
          cover_url: string | null
          rating_avg: number
          rating_count: number
          lat: number
          lng: number
        }[]
      }
      experience_participants: {
        Args: { p_experience_id: string }
        Returns: { user_id: string; full_name: string; avatar_url: string | null; seats: number }[]
      }
      get_or_create_conversation: {
        Args: { p_experience_id: string }
        Returns: ConversationRow
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      list_my_conversations: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          id: string
          experience_id: string
          experience_title: string | null
          experience_cover_url: string | null
          other_user_id: string
          other_full_name: string
          other_avatar_url: string | null
          last_message_body: string | null
          last_message_sender_id: string | null
          last_message_at: string
          unread_count: number
        }[]
      }
      register_push_token: {
        Args: { p_token: string; p_platform: Database['public']['Enums']['push_platform'] }
        Returns: undefined
      }
      admin_list_users: {
        Args: { p_query?: string | null; p_limit?: number; p_offset?: number }
        Returns: {
          id: string
          email: string
          full_name: string
          role: Database['public']['Enums']['user_role']
          city: string | null
          avatar_url: string | null
          is_suspended: boolean
          created_at: string
        }[]
      }
    }
    Enums: {
      user_role: 'explorer' | 'host' | 'admin'
      experience_status: 'published' | 'hidden' | 'cancelled' | 'removed'
      booking_status: 'confirmed' | 'cancelled'
      report_target: 'experience' | 'profile' | 'conversation'
      report_reason: 'spam' | 'offensive' | 'fraud' | 'other'
      report_status: 'open' | 'resolved' | 'dismissed'
      push_platform: 'ios' | 'android'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
export type FunctionReturns<T extends keyof PublicSchema['Functions']> =
  PublicSchema['Functions'][T]['Returns']
