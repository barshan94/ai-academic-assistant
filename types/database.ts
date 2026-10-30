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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      document_pages: {
        Row: {
          created_at: string
          document_id: string
          extracted_text: string | null
          extraction_method: string | null
          id: string
          ocr_confidence: number | null
          owner_id: string
          page_number: number
          status: string
        }
        Insert: {
          created_at?: string
          document_id: string
          extracted_text?: string | null
          extraction_method?: string | null
          id?: string
          ocr_confidence?: number | null
          owner_id: string
          page_number: number
          status?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          extracted_text?: string | null
          extraction_method?: string | null
          id?: string
          ocr_confidence?: number | null
          owner_id?: string
          page_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_document_owner_fk"
            columns: ["document_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          drive_file_id: string | null
          drive_web_view_link: string | null
          file_name: string
          file_size_bytes: number
          id: string
          mime_type: string
          owner_id: string
          page_count: number | null
          sha256: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          drive_web_view_link?: string | null
          file_name: string
          file_size_bytes: number
          id?: string
          mime_type: string
          owner_id: string
          page_count?: number | null
          sha256?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          drive_web_view_link?: string | null
          file_name?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          owner_id?: string
          page_count?: number | null
          sha256?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      drive_connections: {
        Row: {
          created_at: string
          encrypted_refresh_token: string
          granted_scope: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_refresh_token: string
          granted_scope: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_refresh_token?: string
          granted_scope?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          document_id: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          max_attempts: number
          owner_id: string
          progress: number
          stage: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          document_id: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          max_attempts?: number
          owner_id: string
          progress?: number
          stage: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          document_id?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          max_attempts?: number
          owner_id?: string
          progress?: number
          stage?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_document_owner_fk"
            columns: ["document_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          exam_answer_language: string
          id: string
          preferred_explanation_languages: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          exam_answer_language?: string
          id: string
          preferred_explanation_languages?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          exam_answer_language?: string
          id?: string
          preferred_explanation_languages?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          board: string | null
          chapter: string | null
          classification_confidence: number | null
          created_at: string
          document_id: string
          document_page_id: string | null
          id: string
          owner_id: string
          qualification: string | null
          question_number: string | null
          question_text: string
          review_status: string
          subject: string | null
          topic: string | null
        }
        Insert: {
          board?: string | null
          chapter?: string | null
          classification_confidence?: number | null
          created_at?: string
          document_id: string
          document_page_id?: string | null
          id?: string
          owner_id: string
          qualification?: string | null
          question_number?: string | null
          question_text: string
          review_status?: string
          subject?: string | null
          topic?: string | null
        }
        Update: {
          board?: string | null
          chapter?: string | null
          classification_confidence?: number | null
          created_at?: string
          document_id?: string
          document_page_id?: string | null
          id?: string
          owner_id?: string
          qualification?: string | null
          question_number?: string | null
          question_text?: string
          review_status?: string
          subject?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_document_owner_fk"
            columns: ["document_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "questions_page_owner_fk"
            columns: ["document_page_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "document_pages"
            referencedColumns: ["id", "owner_id"]
          },
        ]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
