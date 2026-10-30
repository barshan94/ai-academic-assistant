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
      question_solution_reviews: {
        Row: {
          correction_notes: string | null
          created_at: string
          decision: string
          id: string
          owner_id: string
          reviewer_id: string
          solution_id: string
        }
        Insert: {
          correction_notes?: string | null
          created_at?: string
          decision: string
          id?: string
          owner_id: string
          reviewer_id: string
          solution_id: string
        }
        Update: {
          correction_notes?: string | null
          created_at?: string
          decision?: string
          id?: string
          owner_id?: string
          reviewer_id?: string
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_solution_reviews_solution_owner_fk"
            columns: ["solution_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "question_solutions"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      question_solutions: {
        Row: {
          answer_json: Json
          created_at: string
          id: string
          model: string
          owner_id: string
          prompt_version: string
          provider: string
          question_id: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          answer_json: Json
          created_at?: string
          id?: string
          model: string
          owner_id: string
          prompt_version: string
          provider: string
          question_id: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          answer_json?: Json
          created_at?: string
          id?: string
          model?: string
          owner_id?: string
          prompt_version?: string
          provider?: string
          question_id?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_solutions_question_owner_fk"
            columns: ["question_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      question_teacher_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          id: string
          invited_email: string
          owner_id: string
          question_id: string
          revoked_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          id?: string
          invited_email: string
          owner_id: string
          question_id: string
          revoked_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          id?: string
          invited_email?: string
          owner_id?: string
          question_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_teacher_invites_question_owner_fk"
            columns: ["question_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      questions: {
        Row: {
          board: string | null
          chapter: string | null
          classification_confidence: number | null
          classification_status: string
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
          syllabus_catalog_id: string | null
          syllabus_chapter_id: string | null
          syllabus_topic_id: string | null
          syllabus_version: string | null
          topic: string | null
        }
        Insert: {
          board?: string | null
          chapter?: string | null
          classification_confidence?: number | null
          classification_status?: string
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
          syllabus_catalog_id?: string | null
          syllabus_chapter_id?: string | null
          syllabus_topic_id?: string | null
          syllabus_version?: string | null
          topic?: string | null
        }
        Update: {
          board?: string | null
          chapter?: string | null
          classification_confidence?: number | null
          classification_status?: string
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
          syllabus_catalog_id?: string | null
          syllabus_chapter_id?: string | null
          syllabus_topic_id?: string | null
          syllabus_version?: string | null
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
          {
            foreignKeyName: "questions_syllabus_catalog_owner_fk"
            columns: ["syllabus_catalog_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "syllabus_catalogs"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "questions_syllabus_chapter_catalog_fk"
            columns: ["syllabus_chapter_id", "syllabus_catalog_id"]
            isOneToOne: false
            referencedRelation: "syllabus_chapters"
            referencedColumns: ["id", "catalog_id"]
          },
          {
            foreignKeyName: "questions_syllabus_topic_chapter_fk"
            columns: ["syllabus_topic_id", "syllabus_chapter_id"]
            isOneToOne: false
            referencedRelation: "syllabus_topics"
            referencedColumns: ["id", "chapter_id"]
          },
        ]
      }
      question_classification_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          event_type: string
          id: string
          new_state: Json
          owner_id: string
          previous_state: Json | null
          question_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          event_type: string
          id?: string
          new_state: Json
          owner_id: string
          previous_state?: Json | null
          question_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          event_type?: string
          id?: string
          new_state?: Json
          owner_id?: string
          previous_state?: Json | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_classification_history_question_owner_fk"
            columns: ["question_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      syllabus_catalogs: {
        Row: {
          board: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          owner_id: string
          qualification: string
          source_checked_at: string | null
          source_title: string | null
          source_url: string | null
          status: string
          subject: string
          version: string
        }
        Insert: {
          board: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          owner_id: string
          qualification: string
          source_checked_at?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: string
          subject: string
          version: string
        }
        Update: {
          board?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          owner_id?: string
          qualification?: string
          source_checked_at?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: string
          subject?: string
          version?: string
        }
        Relationships: []
      }
      syllabus_chapters: {
        Row: {
          catalog_id: string
          chapter_code: string | null
          created_at: string
          id: string
          owner_id: string
          sort_order: number
          title: string
        }
        Insert: {
          catalog_id: string
          chapter_code?: string | null
          created_at?: string
          id?: string
          owner_id: string
          sort_order?: number
          title: string
        }
        Update: {
          catalog_id?: string
          chapter_code?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_chapters_catalog_id_owner_id_fkey"
            columns: ["catalog_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "syllabus_catalogs"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      syllabus_topics: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          owner_id: string
          sort_order: number
          title: string
          topic_code: string | null
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          owner_id: string
          sort_order?: number
          title: string
          topic_code?: string | null
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          sort_order?: number
          title?: string
          topic_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_topics_chapter_owner_fk"
            columns: ["chapter_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "syllabus_chapters"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      import_syllabus_catalog: {
        Args: { payload: Json }
        Returns: Json
      }
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
