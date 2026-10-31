import type { DatabaseWithRevision } from "./revision-database";

export type DatabaseWithPractice = Omit<DatabaseWithRevision, "public"> & {
  public: Omit<DatabaseWithRevision["public"], "Tables" | "Functions"> & {
    Tables: DatabaseWithRevision["public"]["Tables"] & {
      practice_sets: {
        Row: { id: string; owner_id: string; title: string; subject: string | null; chapter: string | null; topic: string | null; question_count: number; status: "in_progress" | "completed"; created_at: string; completed_at: string | null };
        Insert: { id?: string; owner_id: string; title: string; subject?: string | null; chapter?: string | null; topic?: string | null; question_count: number; status?: "in_progress" | "completed"; created_at?: string; completed_at?: string | null };
        Update: never;
        Relationships: [];
      };
      practice_set_items: {
        Row: { id: string; owner_id: string; practice_set_id: string; question_id: string | null; position: number; question_text: string; question_number: string | null; subject: string | null; chapter: string | null; topic: string | null; outcome: "correct" | "partial" | "incorrect" | "skipped" | null; response_notes: string | null; answered_at: string | null; created_at: string };
        Insert: { id?: string; owner_id: string; practice_set_id: string; question_id?: string | null; position: number; question_text: string; question_number?: string | null; subject?: string | null; chapter?: string | null; topic?: string | null; outcome?: "correct" | "partial" | "incorrect" | "skipped" | null; response_notes?: string | null; answered_at?: string | null; created_at?: string };
        Update: never;
        Relationships: [{ foreignKeyName: "practice_set_items_practice_set_id_owner_id_fkey"; columns: ["practice_set_id", "owner_id"]; isOneToOne: false; referencedRelation: "practice_sets"; referencedColumns: ["id", "owner_id"] }];
      };
    };
    Functions: DatabaseWithRevision["public"]["Functions"] & {
      create_practice_set: { Args: { p_title: string; p_question_ids: string[]; p_subject?: string | null; p_chapter?: string | null; p_topic?: string | null }; Returns: string };
      record_practice_answer: { Args: { p_item_id: string; p_outcome: string; p_response_notes?: string | null }; Returns: undefined };
    };
  };
};
