import type { Database } from "./database";

export type DatabaseWithRevision = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      question_revision_progress: {
        Row: {
          id: string;
          owner_id: string;
          question_id: string;
          confidence: number;
          status: "learning" | "review" | "confident";
          next_review_at: string;
          last_reviewed_at: string;
          review_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          question_id: string;
          confidence: number;
          status: "learning" | "review" | "confident";
          next_review_at: string;
          last_reviewed_at?: string;
          review_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: never;
        Relationships: [{
          foreignKeyName: "question_revision_progress_question_id_owner_id_fkey";
          columns: ["question_id", "owner_id"];
          isOneToOne: true;
          referencedRelation: "questions";
          referencedColumns: ["id", "owner_id"];
        }];
      };
    };
    Functions: Database["public"]["Functions"] & {
      record_question_revision: {
        Args: { p_question_id: string; p_confidence: number };
        Returns: undefined;
      };
    };
  };
};
