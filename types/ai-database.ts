import type { Database, Json } from "./database";

export type DatabaseWithAISolutions = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
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
      question_solutions: {
        Row: {
          id: string;
          owner_id: string;
          question_id: string;
          provider: string;
          model: string;
          prompt_version: string;
          answer_json: Json;
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
          verification_status?: "generated" | "machine_checked" | "teacher_verified";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          question_id?: string;
          provider?: string;
          model?: string;
          prompt_version?: string;
          answer_json?: Json;
          verification_status?: "generated" | "machine_checked" | "teacher_verified";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [{
          foreignKeyName: "question_solutions_question_owner_fk";
          columns: ["question_id", "owner_id"];
          isOneToOne: false;
          referencedRelation: "questions";
          referencedColumns: ["id", "owner_id"];
        }];
      };
    };
  };
};
