import type { DatabaseWithPractice } from "./practice-database";

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
      complete_weekly_study_session: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
    };
  };
};
