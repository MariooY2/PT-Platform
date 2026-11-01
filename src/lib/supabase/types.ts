
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "checkin_schedules": {
                  Row: {
                    "active": boolean,"client_id": string,"created_at": string,"form_id": string,"id": string,"trainer_id": string,"updated_at": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"client_id": string,"created_at"?: string,"form_id": string,"id"?: string,"trainer_id": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "active"?: boolean,"client_id"?: string,"created_at"?: string,"form_id"?: string,"id"?: string,"trainer_id"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkin_schedules_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkin_schedules_form_id_fkey"
      columns: ["form_id"]
isOneToOne: false
      referencedRelation: "forms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkin_schedules_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"client_files": {
                  Row: {
                    "client_id": string,"created_at": string,"file_name": string,"id": string,"storage_path": string,"trainer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"file_name": string,"id"?: string,"storage_path": string,"trainer_id": string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"file_name"?: string,"id"?: string,"storage_path"?: string,"trainer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_files_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_files_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"client_notes": {
                  Row: {
                    "body": string,"client_id": string,"created_at": string,"id": string,"trainer_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"client_id": string,"created_at"?: string,"id"?: string,"trainer_id": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"client_id"?: string,"created_at"?: string,"id"?: string,"trainer_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_notes_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_notes_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "category": Database["public"]['Enums']["exercise_category"],"created_at": string,"equipment": string | null,"id": string,"instructions": string | null,"is_archived": boolean,"name": string,"primary_muscle": string,"secondary_muscles": (string)[],"trainer_id": string | null,"updated_at": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["exercise_category"],"created_at"?: string,"equipment"?: string | null,"id"?: string,"instructions"?: string | null,"is_archived"?: boolean,"name": string,"primary_muscle": string,"secondary_muscles"?: (string)[],"trainer_id"?: string | null,"updated_at"?: string,"video_url"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["exercise_category"],"created_at"?: string,"equipment"?: string | null,"id"?: string,"instructions"?: string | null,"is_archived"?: boolean,"name"?: string,"primary_muscle"?: string,"secondary_muscles"?: (string)[],"trainer_id"?: string | null,"updated_at"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"form_responses": {
                  Row: {
                    "answers": NonNullable<Json>,"client_id": string,"coach_reply": string | null,"created_at": string,"due_date": string | null,"form_id": string,"id": string,"reviewed_at": string | null,"submitted_at": string | null,"trainer_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"client_id": string,"coach_reply"?: string | null,"created_at"?: string,"due_date"?: string | null,"form_id": string,"id"?: string,"reviewed_at"?: string | null,"submitted_at"?: string | null,"trainer_id": string,"updated_at"?: string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"client_id"?: string,"coach_reply"?: string | null,"created_at"?: string,"due_date"?: string | null,"form_id"?: string,"id"?: string,"reviewed_at"?: string | null,"submitted_at"?: string | null,"trainer_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "form_responses_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "form_responses_form_id_fkey"
      columns: ["form_id"]
isOneToOne: false
      referencedRelation: "forms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "form_responses_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"forms": {
                  Row: {
                    "created_at": string,"id": string,"is_default": boolean,"kind": Database["public"]['Enums']["form_kind"],"questions": NonNullable<Json>,"title": string,"trainer_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_default"?: boolean,"kind": Database["public"]['Enums']["form_kind"],"questions"?: NonNullable<Json>,"title": string,"trainer_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_default"?: boolean,"kind"?: Database["public"]['Enums']["form_kind"],"questions"?: NonNullable<Json>,"title"?: string,"trainer_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "forms_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"habit_logs": {
                  Row: {
                    "client_id": string,"created_at": string,"habit_id": string,"id": string,"log_date": string,"value": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"habit_id": string,"id"?: string,"log_date": string,"value"?: number | null
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"habit_id"?: string,"id"?: string,"log_date"?: string,"value"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_logs_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "habit_logs_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    }
                  ]
                },"habits": {
                  Row: {
                    "active": boolean,"client_id": string,"created_at": string,"id": string,"name": string,"target_value": number | null,"trainer_id": string,"unit": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"client_id": string,"created_at"?: string,"id"?: string,"name": string,"target_value"?: number | null,"trainer_id": string,"unit"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"client_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"target_value"?: number | null,"trainer_id"?: string,"unit"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "habits_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "habits_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"full_name": string | null,"id": string,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"timezone": string,"unit_system": Database["public"]['Enums']["unit_system"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"full_name"?: string | null,"id": string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"timezone"?: string,"unit_system"?: Database["public"]['Enums']["unit_system"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"timezone"?: string,"unit_system"?: Database["public"]['Enums']["unit_system"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"trainer_clients": {
                  Row: {
                    "client_id": string | null,"created_at": string,"goals": string | null,"id": string,"injuries_notes": string | null,"invite_email": string | null,"invite_expires_at": string | null,"invite_token": string | null,"source": Database["public"]['Enums']["client_source"],"start_date": string | null,"status": Database["public"]['Enums']["client_status"],"tags": (string)[] | null,"trainer_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"goals"?: string | null,"id"?: string,"injuries_notes"?: string | null,"invite_email"?: string | null,"invite_expires_at"?: string | null,"invite_token"?: string | null,"source"?: Database["public"]['Enums']["client_source"],"start_date"?: string | null,"status"?: Database["public"]['Enums']["client_status"],"tags"?: (string)[] | null,"trainer_id": string,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"goals"?: string | null,"id"?: string,"injuries_notes"?: string | null,"invite_email"?: string | null,"invite_expires_at"?: string | null,"invite_token"?: string | null,"source"?: Database["public"]['Enums']["client_source"],"start_date"?: string | null,"status"?: Database["public"]['Enums']["client_status"],"tags"?: (string)[] | null,"trainer_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trainer_clients_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trainer_clients_trainer_id_fkey"
      columns: ["trainer_id"]
isOneToOne: false
      referencedRelation: "trainers"
      referencedColumns: ["id"]
    }
                  ]
                },"trainers": {
                  Row: {
                    "bio": string | null,"brand_color": string | null,"business_name": string | null,"certifications": (string)[] | null,"created_at": string,"default_currency": string,"id": string,"instagram_handle": string | null,"logo_path": string | null,"payout_whish_phone": string | null,"plan": Database["public"]['Enums']["trainer_plan"],"slug": string,"storefront_published": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"brand_color"?: string | null,"business_name"?: string | null,"certifications"?: (string)[] | null,"created_at"?: string,"default_currency"?: string,"id": string,"instagram_handle"?: string | null,"logo_path"?: string | null,"payout_whish_phone"?: string | null,"plan"?: Database["public"]['Enums']["trainer_plan"],"slug": string,"storefront_published"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "bio"?: string | null,"brand_color"?: string | null,"business_name"?: string | null,"certifications"?: (string)[] | null,"created_at"?: string,"default_currency"?: string,"id"?: string,"instagram_handle"?: string | null,"logo_path"?: string | null,"payout_whish_phone"?: string | null,"plan"?: Database["public"]['Enums']["trainer_plan"],"slug"?: string,"storefront_published"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trainers_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "has_client_link":
{ Args: { "client": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_client_of":
{ Args: { "trainer": string }; Returns: boolean
                           },
"is_trainer_of":
{ Args: { "client": string }; Returns: boolean
                           },
"owns_habit":
{ Args: { "habit": string }; Returns: boolean
                           }
          }
          Enums: {
            "client_source": "invite"|"purchase"|"import","client_status": "lead"|"invited"|"active"|"paused"|"archived","exercise_category": "strength"|"cardio"|"mobility"|"plyometric"|"other","form_kind": "intake"|"checkin","trainer_plan": "free"|"pro"|"elite","unit_system": "metric"|"imperial","user_role": "admin"|"trainer"|"client"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "client_source": ["invite", "purchase", "import"],"client_status": ["lead", "invited", "active", "paused", "archived"],"exercise_category": ["strength", "cardio", "mobility", "plyometric", "other"],"form_kind": ["intake", "checkin"],"trainer_plan": ["free", "pro", "elite"],"unit_system": ["metric", "imperial"],"user_role": ["admin", "trainer", "client"]
          }
        }
} as const
