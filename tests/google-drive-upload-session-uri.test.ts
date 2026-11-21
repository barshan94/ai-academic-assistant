import { describe, expect, it } from "vitest";

vi.mock("server-only", () => ({}));

import { isGoogleDriveUploadSessionUri } from "@/lib/drive/google";

describe("Google Drive resumable upload session URL validation", () => {
  it("accepts the canonical HTTPS upload endpoint, including Google's default port", () => {
    expect(isGoogleDriveUploadSessionUri(
      "https://www.googleapis.com/upload/drive/v3/files?upload_id=opaque",
    )).toBe(true);
    expect(isGoogleDriveUploadSessionUri(
      "https://www.googleapis.com:443/upload/drive/v3/files?upload_id=opaque",
    )).toBe(true);
  });

  it.each([
    "http://www.googleapis.com/upload/drive/v3/files?upload_id=opaque",
    "https://www.googleapis.com.evil.example/upload/drive/v3/files?upload_id=opaque",
    "https://www.googleapis.com:8443/upload/drive/v3/files?upload_id=opaque",
    "https://user@www.googleapis.com/upload/drive/v3/files?upload_id=opaque",
    "https://www.googleapis.com/upload/drive/v3/files/extra?upload_id=opaque",
    "https://www.googleapis.com/upload/drive/v3/other?upload_id=opaque",
    "https://www.googleapis.com/upload/drive/v3/files?upload_id=opaque#fragment",
    "not-a-url",
    "",
  ])("rejects an untrusted or non-canonical URL: %s", (value) => {
    expect(isGoogleDriveUploadSessionUri(value)).toBe(false);
  });
});
