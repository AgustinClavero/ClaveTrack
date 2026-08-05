// ============================================================
// Tipos generados desde Supabase (proyecto wupbgwyansjhfncorhwy).
// Regenerar tras cada migración:
//   npx supabase gen types typescript --project-id wupbgwyansjhfncorhwy > src/types/database.ts
// (o vía MCP generate_typescript_types)
// ============================================================

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      body_entries: {
        Row: {
          arm_cm: number | null
          bloating: number | null
          chest_cm: number | null
          created_at: string | null
          energy: number | null
          hip_cm: number | null
          id: string
          leg_cm: number | null
          log_date: string
          note: string | null
          sleep_h: number | null
          updated_at: string | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          bloating?: number | null
          chest_cm?: number | null
          created_at?: string | null
          energy?: number | null
          hip_cm?: number | null
          id?: string
          leg_cm?: number | null
          log_date?: string
          note?: string | null
          sleep_h?: number | null
          updated_at?: string | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          bloating?: number | null
          chest_cm?: number | null
          created_at?: string | null
          energy?: number | null
          hip_cm?: number | null
          id?: string
          leg_cm?: number | null
          log_date?: string
          note?: string | null
          sleep_h?: number | null
          updated_at?: string | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      body_photos: {
        Row: {
          created_at: string | null
          id: string
          log_date: string
          pose: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_date?: string
          pose?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          log_date?: string
          pose?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          checkin_done_at: string | null
          created_at: string | null
          energy: number | null
          focus_note: string | null
          hunger: number | null
          id: string
          log_date: string
          mood: number | null
          score: number | null
          sleep_h: number | null
          stress: number | null
          focus_done: boolean | null
          sleep_quality: number | null
          updated_at: string | null
          user_id: string
          water_ml: number | null
        }
        Insert: {
          checkin_done_at?: string | null
          created_at?: string | null
          energy?: number | null
          focus_note?: string | null
          hunger?: number | null
          id?: string
          log_date?: string
          mood?: number | null
          score?: number | null
          sleep_h?: number | null
          stress?: number | null
          focus_done?: boolean | null
          sleep_quality?: number | null
          updated_at?: string | null
          user_id: string
          water_ml?: number | null
        }
        Update: {
          checkin_done_at?: string | null
          created_at?: string | null
          energy?: number | null
          focus_note?: string | null
          hunger?: number | null
          id?: string
          log_date?: string
          mood?: number | null
          score?: number | null
          sleep_h?: number | null
          stress?: number | null
          focus_done?: boolean | null
          sleep_quality?: number | null
          updated_at?: string | null
          user_id?: string
          water_ml?: number | null
        }
        Relationships: []
      }
      daily_scores: {
        Row: {
          breakdown: Json
          created_at: string | null
          id: string
          log_date: string
          total: number
          updated_at: string | null
          user_id: string
          weights: Json
          xp: number
        }
        Insert: {
          breakdown?: Json
          created_at?: string | null
          id?: string
          log_date: string
          total: number
          updated_at?: string | null
          user_id: string
          weights?: Json
          xp?: number
        }
        Update: {
          breakdown?: Json
          created_at?: string | null
          id?: string
          log_date?: string
          total?: number
          updated_at?: string | null
          user_id?: string
          weights?: Json
          xp?: number
        }
        Relationships: []
      }
      foods: {
        Row: {
          base: string
          brand: string | null
          carbs_g: number
          category: string
          created_at: string | null
          default_qty: number | null
          fat_g: number
          fiber_g: number
          id: string
          is_dressing: boolean
          is_favorite: boolean
          is_mix: boolean
          is_processed: boolean
          kcal: number
          name: string
          protein_g: number
          sodium_mg: number
          state: string | null
          sugar_g: number
          unit_grams: number | null
          unit_label: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base?: string
          brand?: string | null
          carbs_g?: number
          category?: string
          created_at?: string | null
          default_qty?: number | null
          fat_g?: number
          fiber_g?: number
          id?: string
          is_dressing?: boolean
          is_favorite?: boolean
          is_mix?: boolean
          is_processed?: boolean
          kcal?: number
          name: string
          protein_g?: number
          sodium_mg?: number
          state?: string | null
          sugar_g?: number
          unit_grams?: number | null
          unit_label?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base?: string
          brand?: string | null
          carbs_g?: number
          category?: string
          created_at?: string | null
          default_qty?: number | null
          fat_g?: number
          fiber_g?: number
          id?: string
          is_dressing?: boolean
          is_favorite?: boolean
          is_mix?: boolean
          is_processed?: boolean
          kcal?: number
          name?: string
          protein_g?: number
          sodium_mg?: number
          state?: string | null
          sugar_g?: number
          unit_grams?: number | null
          unit_label?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string
          is_favorite: boolean
          name: string
          servings: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          servings?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          servings?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          base: string
          carbs_g: number
          created_at: string | null
          fat_g: number
          food_id: string | null
          food_name: string
          id: string
          kcal: number
          protein_g: number
          quantity: number
          recipe_id: string
        }
        Insert: {
          base?: string
          carbs_g?: number
          created_at?: string | null
          fat_g?: number
          food_id?: string | null
          food_name: string
          id?: string
          kcal?: number
          protein_g?: number
          quantity: number
          recipe_id: string
        }
        Update: {
          base?: string
          carbs_g?: number
          created_at?: string | null
          fat_g?: number
          food_id?: string | null
          food_name?: string
          id?: string
          kcal?: number
          protein_g?: number
          quantity?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_entries: {
        Row: {
          created_at: string | null
          done: boolean | null
          habit_id: string
          id: string
          log_date: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          done?: boolean | null
          habit_id: string
          id?: string
          log_date?: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          done?: boolean | null
          habit_id?: string
          id?: string
          log_date?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_entries_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_schedules: {
        Row: {
          days_of_week: number[] | null
          frequency: string
          habit_id: string
          id: string
          weekly_count: number | null
        }
        Insert: {
          days_of_week?: number[] | null
          frequency?: string
          habit_id: string
          id?: string
          weekly_count?: number | null
        }
        Update: {
          days_of_week?: number[] | null
          frequency?: string
          habit_id?: string
          id?: string
          weekly_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_schedules_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          display_order: number | null
          emoji: string | null
          group_key: string | null
          id: string
          is_key: boolean | null
          kind: string
          name: string
          slug: string | null
          target_value: number | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          display_order?: number | null
          emoji?: string | null
          group_key?: string | null
          id?: string
          is_key?: boolean | null
          kind: string
          name: string
          slug?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          display_order?: number | null
          emoji?: string | null
          group_key?: string | null
          id?: string
          is_key?: boolean | null
          kind?: string
          name?: string
          slug?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_items: {
        Row: {
          base: string
          carbs_g: number
          created_at: string | null
          fat_g: number
          fiber_g: number
          food_id: string | null
          food_name: string
          id: string
          kcal: number
          meal_id: string
          protein_g: number
          quantity: number
        }
        Insert: {
          base?: string
          carbs_g?: number
          created_at?: string | null
          fat_g?: number
          fiber_g?: number
          food_id?: string | null
          food_name: string
          id?: string
          kcal?: number
          meal_id: string
          protein_g?: number
          quantity: number
        }
        Update: {
          base?: string
          carbs_g?: number
          created_at?: string | null
          fat_g?: number
          fiber_g?: number
          food_id?: string | null
          food_name?: string
          id?: string
          kcal?: number
          meal_id?: string
          protein_g?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string | null
          eaten_at: string | null
          hunger_before: number | null
          id: string
          log_date: string
          meal_type: string
          note: string | null
          photo_path: string | null
          planned: boolean | null
          satiety_after: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          eaten_at?: string | null
          hunger_before?: number | null
          id?: string
          log_date?: string
          meal_type: string
          note?: string | null
          photo_path?: string | null
          planned?: boolean | null
          satiety_after?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          eaten_at?: string | null
          hunger_before?: number | null
          id?: string
          log_date?: string
          meal_type?: string
          note?: string | null
          photo_path?: string | null
          planned?: boolean | null
          satiety_after?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          calc_inputs: Json | null
          carbs_g: number
          created_at: string | null
          effective_from: string
          fat_g: number
          id: string
          kcal: number
          mode: string | null
          protein_g: number
          source: string | null
          updated_at: string | null
          user_id: string
          water_ml: number
        }
        Insert: {
          calc_inputs?: Json | null
          carbs_g: number
          created_at?: string | null
          effective_from?: string
          fat_g: number
          id?: string
          kcal: number
          mode?: string | null
          protein_g: number
          source?: string | null
          updated_at?: string | null
          user_id: string
          water_ml?: number
        }
        Update: {
          calc_inputs?: Json | null
          carbs_g?: number
          created_at?: string | null
          effective_from?: string
          fat_g?: number
          id?: string
          kcal?: number
          mode?: string | null
          protein_g?: number
          source?: string | null
          updated_at?: string | null
          user_id?: string
          water_ml?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_year: number | null
          created_at: string | null
          display_name: string | null
          height_cm: number | null
          id: string
          sex: string | null
          target_weight_kg: number | null
          timezone: string | null
          updated_at: string | null
          weight_unit: string | null
        }
        Insert: {
          activity_level?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          created_at?: string | null
          display_name?: string | null
          height_cm?: number | null
          id: string
          sex?: string | null
          target_weight_kg?: number | null
          timezone?: string | null
          updated_at?: string | null
          weight_unit?: string | null
        }
        Update: {
          activity_level?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          created_at?: string | null
          display_name?: string | null
          height_cm?: number | null
          id?: string
          sex?: string | null
          target_weight_kg?: number | null
          timezone?: string | null
          updated_at?: string | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          streak_threshold: number | null
          theme: string | null
          updated_at: string | null
          user_id: string
          w_activity: number | null
          w_habits: number | null
          w_nutrition: number | null
          w_sleep: number | null
          w_study: number | null
          w_tasks: number | null
        }
        Insert: {
          created_at?: string | null
          streak_threshold?: number | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
          w_activity?: number | null
          w_habits?: number | null
          w_nutrition?: number | null
          w_sleep?: number | null
          w_study?: number | null
          w_tasks?: number | null
        }
        Update: {
          created_at?: string | null
          streak_threshold?: number | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          w_activity?: number | null
          w_habits?: number | null
          w_nutrition?: number | null
          w_sleep?: number | null
          w_study?: number | null
          w_tasks?: number | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string | null
          distance_km: number | null
          id: string
          intensity: string
          kcal: number
          kind: string
          log_date: string
          minutes: number
          note: string | null
          steps: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          id?: string
          intensity?: string
          kcal?: number
          kind: string
          log_date: string
          minutes: number
          note?: string | null
          steps?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          id?: string
          intensity?: string
          kcal?: number
          kind?: string
          log_date?: string
          minutes?: number
          note?: string | null
          steps?: number | null
          updated_at?: string | null
          user_id?: string
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
