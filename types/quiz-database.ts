import type { DatabaseWithPractice } from "./practice-database";

export type GeneratedQuizRow = {
  id: string;
  owner_id: string;
  title: string;
  subject: string;
  chapter: string | null;
  question_count: number;
  quiz_json: import("./database").Json;
  source_question_ids: string[];
  status: "draft" | "approved" | "archived";
  created_at: string;
  reviewed_at: string | null;
};

export type DatabaseWithQuiz = Omit<DatabaseWithPractice, "public"> & {
  public: Omit<DatabaseWithPractice["public"], "Tables" | "Functions"> & {
    Tables: DatabaseWithPractice["public"]["Tables"] & {
      generated_quizzes: {
        Row: GeneratedQuizRow;
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          subject: string;
          chapter?: string | null;
          question_count: number;
          quiz_json: import("./database").Json;
          source_question_ids: string[];
          status?: "draft" | "approved" | "archived";
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: never;
        Relationships: [];
      };
    };
    Functions: DatabaseWithPractice["public"]["Functions"] & {
      save_generated_quiz_draft: {
        Args: {
          p_title: string;
          p_subject: string;
          p_chapter?: string | null;
          p_quiz_json: import("./database").Json;
          p_source_question_ids: string[];
        };
        Returns: string;
      };
      update_generated_quiz_status: {
        Args: { p_quiz_id: string; p_status: string };
        Returns: boolean;
      };
    };
  };
};
