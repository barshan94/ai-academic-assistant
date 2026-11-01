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

  it("validates every exported Auth record before writing an encrypted archive", () => {
    expect(script).toContain('command -v node >/dev/null 2>&1');
    expect(script).toContain('import { validateBackup } from "./scripts/restore-auth-users.mjs";');
    expect(script).toContain("validateBackup(backup);");
    expect(script.indexOf("validateBackup(backup);")).toBeLessThan(script.indexOf('tar -czf "$workdir/backup.tar.gz"'));
  });

  it("normalizes empty phone values to null for the email-only restore contract", () => {
    expect(script).toContain("'phone', nullif(u.phone, '')");
  });
});
