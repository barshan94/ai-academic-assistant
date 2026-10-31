import type { Database, Json } from "./database";

export type DatabaseWithAISolutions = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      question_teacher_invites: {
        Row: { id: string; question_id: string; owner_id: string; invited_email: string; accepted_by: string | null; accepted_at: string | null; revoked_at: string | null; created_at: string };
        Insert: { question_id: string; owner_id: string; invited_email: string };
        Update: { accepted_by?: string | null; accepted_at?: string | null; revoked_at?: string | null };
        Relationships: [{
          foreignKeyName: "question_teacher_invites_question_owner_fk";
          columns: ["question_id", "owner_id"];
          isOneToOne: false;
          referencedRelation: "questions";
          referencedColumns: ["id", "owner_id"];
        }];
      };
      question_web_research_sources: {
        Row: { id: string; owner_id: string; question_id: string; query: string; provider: string; title: string; source_url: string; snippet: string; result_rank: number; published_at: string | null; retrieved_at: string };
        Insert: { id?: string; owner_id: string; question_id: string; query: string; provider: string; title: string; source_url: string; snippet: string; result_rank: number; published_at?: string | null; retrieved_at?: string };
        Update: never;
        Relationships: [{
          foreignKeyName: "question_web_research_sources_question_owner_fk";
          columns: ["question_id", "owner_id"];
          isOneToOne: false;
          referencedRelation: "questions";
          referencedColumns: ["id", "owner_id"];
        }];
      };
      question_solution_reviews: {
        Row: {
          id: string;
          solution_id: string;
          owner_id: string;
          reviewer_id: string;
          decision: "approved" | "needs_correction";
          correction_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          solution_id: string;
          owner_id: string;
          reviewer_id: string;
          decision: "approved" | "needs_correction";
          correction_notes?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [{
          foreignKeyName: "question_solution_reviews_solution_owner_fk";
          columns: ["solution_id", "owner_id"];
          isOneToOne: false;
          referencedRelation: "question_solutions";
          referencedColumns: ["id", "owner_id"];
        }];
      };
      question_solution_mark_schemes: {
        Row: { id: string; solution_id: string; owner_id: string; title: string; awarding_body: string; qualification: string; subject: string; paper_reference: string | null; source_url: string; source_locator: string | null; source_document_version: string | null; points: Json; created_at: string };
        Insert: { id?: string; solution_id: string; owner_id: string; title: string; awarding_body: string; qualification: string; subject: string; paper_reference?: string | null; source_url: string; source_locator: string; source_document_version?: string | null; points: Json; created_at?: string };
        Update: never;
        Relationships: [{
          foreignKeyName: "question_solution_mark_schemes_solution_owner_fk";
          columns: ["solution_id", "owner_id"];
          isOneToOne: false;
          referencedRelation: "question_solutions";
          referencedColumns: ["id", "owner_id"];
        }];
      };
      question_solutions: {
        Row: {
          id: string;
          owner_id: string;
          question_id: string;
          provider: string;
          model: string;
          prompt_version: string;
          answer_json: Json;
          source_context: Json | null;
          verification_status: "generated" | "machine_checked" | "teacher_verified";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          question_id: string;
          provider: string;
          model: string;
          prompt_version: string;
          answer_json: Json;
          source_context?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: never;
        Relationships: [{
          foreignKeyName: "question_solutions_question_owner_fk";
          columns: ["question_id", "owner_id"];
          isOneToOne: false;
          referencedRelation: "questions";
          referencedColumns: ["id", "owner_id"];
        }];
      };
    };
    Functions: Database["public"]["Functions"] & {
      consume_question_web_research_quota: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      record_teacher_solution_review: {
        Args: {
          p_solution_id: string;
          p_decision: "approved" | "needs_correction";
          p_correction_notes: string | null;
        };
        Returns: string;
      };
    };
  };
};
