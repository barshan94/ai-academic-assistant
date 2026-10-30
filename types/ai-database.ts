import type { Database, Json } from "./database";

export type DatabaseWithAISolutions = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
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
