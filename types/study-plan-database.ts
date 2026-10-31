import type { DatabaseWithPractice } from "./practice-database";

export type StudyQueuePage = {
  revision_total: number;
  revision_items: Array<{
    question_id: string;
    confidence: number;
    status: "learning" | "review" | "confident";
    next_review_at: string;
    review_count: number;
    question_text: string;
    question_number: string | null;
    subject: string | null;
    chapter: string | null;
    topic: string | null;
  }>;
  practice_total: number;
  practice_items: Array<{
    id: string;
    practice_set_id: string;
    position: number;
    question_text: string;
    question_number: string | null;
    subject: string | null;
    chapter: string | null;
    topic: string | null;
    created_at: string;
    set_title: string;
  }>;
};


export type DatabaseWithStudyPlan = Omit<DatabaseWithPractice, "public"> & {
  public: Omit<DatabaseWithPractice["public"], "Tables" | "Functions"> & {
    Tables: DatabaseWithPractice["public"]["Tables"] & {
      weekly_study_sessions: {
        Row: {
          id: string;
          owner_id: string;
          session_date: string;
          title: string;
          planned_minutes: number;
          notes: string | null;
          status: "planned" | "completed";
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          session_date: string;
          title: string;
          planned_minutes: number;
          notes?: string | null;
          status?: "planned" | "completed";
          completed_at?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Functions: DatabaseWithPractice["public"]["Functions"] & {
      create_weekly_study_session: {
        Args: { p_session_date: string; p_title: string; p_planned_minutes: number; p_notes?: string | null };
        Returns: string;
      };
      get_study_queue_page: {
        Args: { p_revision_page?: number; p_practice_page?: number; p_page_size?: number };
        Returns: StudyQueuePage;
      };
      complete_weekly_study_session: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
    };
  };
};
