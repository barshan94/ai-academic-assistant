import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractTextFromDrivePdf } from "@/lib/drive/google";

const original = new TextEncoder().encode("%PDF-1.7\nsource\n%%EOF");
const sha256 = createHash("sha256").update(original).digest("hex");
const input = {
  accessToken: "access-token",
  driveFileId: "original-file",
  expectedSizeBytes: original.byteLength,
  expectedSha256: sha256,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OCR source integrity", () => {
  it("converts only the exact archived PDF after metadata, size and checksum checks", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: input.driveFileId,
        mimeType: "application/pdf",
        size: String(original.byteLength),
        trashed: false,
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(new Uint8Array(original), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "temporary-doc" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response("Extracted physics text", { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(extractTextFromDrivePdf(input)).resolves.toBe("Extracted physics text");
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const [convertUrl, convertInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(convertUrl).toContain("uploadType=multipart");
    expect(Buffer.from(convertInit.body as Uint8Array).includes(Buffer.from(original))).toBe(true);
    const [deleteUrl, deleteInit] = fetchMock.mock.calls[4] as [string, RequestInit];
    expect(deleteUrl).toContain("/files/temporary-doc");
    expect(deleteInit.method).toBe("DELETE");
  });

  it("does not submit altered Drive bytes to OCR conversion", async () => {
    const altered = new TextEncoder().encode("%PDF-1.7\nsourcx\n%%EOF");
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: input.driveFileId,
        mimeType: "application/pdf",
        size: String(original.byteLength),
        trashed: false,
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(new Uint8Array(altered), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(extractTextFromDrivePdf(input)).rejects.toThrow("checksum does not match");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("returns extracted text when temporary OCR cleanup fails and logs only a safe event", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: input.driveFileId,
        mimeType: "application/pdf",
        size: String(original.byteLength),
        trashed: false,
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(new Uint8Array(original), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "temporary-doc" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response("Extracted physics text", { status: 200 }))
      .mockResolvedValueOnce(new Response("private Google Drive delete failure", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(extractTextFromDrivePdf(input)).resolves.toBe("Extracted physics text");
    expect(logSpy).toHaveBeenCalledOnce();
    const logged = String(logSpy.mock.calls[0][0]);
    expect(logged).toContain('"event":"google_drive_ocr_temp_cleanup_failed"');
    expect(logged).toContain('"errorCode":"GOOGLE_OCR_TEMP_CLEANUP_FAILED"');
    expect(logged).not.toContain("private Google Drive");
  });

});
