import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("../scripts/backup-supabase.sh", import.meta.url));
const script = readFileSync(scriptPath, "utf8");

describe("encrypted Supabase backup script", () => {
  it("has valid Bash syntax", () => {
    expect(() => execFileSync("bash", ["-n", scriptPath])).not.toThrow();
  });

  it("runs Auth export SQL through a psql script so project-ref variables are substituted", () => {
    expect(script).toContain('> "$workdir/auth-export.sql"');
    expect(script).toContain('-v backup_project_ref="$BACKUP_PROJECT_REF" -f "$workdir/auth-export.sql"');
    expect(script).not.toContain('-v backup_project_ref="$BACKUP_PROJECT_REF" -c "$auth_export_sql"');
  });
});
