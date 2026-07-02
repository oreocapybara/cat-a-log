export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          bio: string | null
          tags_count: number
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          bio?: string | null
          tags_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          bio?: string | null
          tags_count?: number
          created_at?: string
        }
      }
      cats: {
        Row: {
          id: string
          name: string | null
          primary_photo_url: string
          lat: number
          lng: number
          is_ear_tipped: boolean
          notes: string | null
          tagged_by: string | null
          confidence_score: number
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          primary_photo_url: string
          lat: number
          lng: number
          is_ear_tipped?: boolean
          notes?: string | null
          tagged_by?: string | null
          confidence_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          primary_photo_url?: string
          lat?: number
          lng?: number
          is_ear_tipped?: boolean
          notes?: string | null
          tagged_by?: string | null
          confidence_score?: number
          created_at?: string
        }
      }
      sightings: {
        Row: {
          id: string
          cat_id: string
          photo_url: string
          lat: number
          lng: number
          spotted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cat_id: string
          photo_url: string
          lat: number
          lng: number
          spotted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cat_id?: string
          photo_url?: string
          lat?: number
          lng?: number
          spotted_by?: string | null
          created_at?: string
        }
      }
      match_votes: {
        Row: {
          id: string
          cat_a_id: string
          cat_b_id: string
          proposed_by: string | null
          votes_confirm: number
          votes_deny: number
          status: 'pending' | 'merged' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          cat_a_id: string
          cat_b_id: string
          proposed_by?: string | null
          votes_confirm?: number
          votes_deny?: number
          status?: 'pending' | 'merged' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          cat_a_id?: string
          cat_b_id?: string
          proposed_by?: string | null
          votes_confirm?: number
          votes_deny?: number
          status?: 'pending' | 'merged' | 'rejected'
          created_at?: string
        }
      }
      match_vote_entries: {
        Row: {
          id: string
          match_vote_id: string
          voted_by: string
          vote: 'confirm' | 'deny'
          created_at: string
        }
        Insert: {
          id?: string
          match_vote_id: string
          voted_by: string
          vote: 'confirm' | 'deny'
          created_at?: string
        }
        Update: {
          id?: string
          match_vote_id?: string
          voted_by?: string
          vote?: 'confirm' | 'deny'
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Cat = Database['public']['Tables']['cats']['Row']
export type Sighting = Database['public']['Tables']['sightings']['Row']
export type MatchVote = Database['public']['Tables']['match_votes']['Row']
export type MatchVoteEntry = Database['public']['Tables']['match_vote_entries']['Row']
