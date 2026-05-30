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
      coach_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          calories: number
          carbs: number
          date: string
          fat: number
          fiber: number | null
          id: string
          image_path: string | null
          logged_at: string
          meal: string
          name: string
          protein: number
          serving: string | null
          user_id: string
        }
        Insert: {
          calories: number
          carbs: number
          date: string
          fat: number
          fiber?: number | null
          id?: string
          image_path?: string | null
          logged_at?: string
          meal: string
          name: string
          protein: number
          serving?: string | null
          user_id?: string
        }
        Update: {
          calories?: number
          carbs?: number
          date?: string
          fat?: number
          fiber?: number | null
          id?: string
          image_path?: string | null
          logged_at?: string
          meal?: string
          name?: string
          protein?: number
          serving?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity: string
          age: number
          created_at: string
          gender: string
          height: number
          name: string
          target_calories: number
          target_carbs: number
          target_fat: number
          target_protein: number
          target_weight: number
          theme: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          activity?: string
          age?: number
          created_at?: string
          gender?: string
          height?: number
          name?: string
          target_calories?: number
          target_carbs?: number
          target_fat?: number
          target_protein?: number
          target_weight?: number
          theme?: string
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          activity?: string
          age?: number
          created_at?: string
          gender?: string
          height?: number
          name?: string
          target_calories?: number
          target_carbs?: number
          target_fat?: number
          target_protein?: number
          target_weight?: number
          theme?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          date: string
          id: string
          image_path: string
          user_id: string
          view: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          image_path: string
          user_id?: string
          view: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          image_path?: string
          user_id?: string
          view?: string
          weight?: number | null
        }
        Relationships: []
      }
      saved_meals: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fat: number
          fiber: number | null
          id: string
          image_path: string | null
          name: string
          protein: number
          serving: string | null
          user_id: string
        }
        Insert: {
          calories: number
          carbs: number
          created_at?: string
          fat: number
          fiber?: number | null
          id?: string
          image_path?: string | null
          name: string
          protein: number
          serving?: string | null
          user_id?: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          image_path?: string | null
          name?: string
          protein?: number
          serving?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weights: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          user_id?: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          weight?: number
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
