import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadOriginalPdfFromDrive } from "@/lib/drive/google";

const pdfBytes = new TextEncoder().encode("%PDF-1.7\noriginal academic source\n%%EOF");
const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
const input = {
  accessToken: "access-token",
  driveFileId: "drive-file-id",
  expectedSizeBytes: pdfBytes.byteLength,
  expectedSha256: sha256,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockDriveResponses(
  metadata: Record<string, unknown>,
  file: Uint8Array = pdfBytes,
) {
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { "content-type": "application/json" },
    }))
    .mockResolvedValueOnce(new Response(new Uint8Array(file), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("verified Google Drive original PDF retrieval", () => {
  it("checks Drive metadata and returns the exact PDF after size and SHA-256 verification", async () => {
    const fetchMock = mockDriveResponses({
      id: input.driveFileId,
      mimeType: "application/pdf",
      size: String(pdfBytes.byteLength),
      trashed: false,
    });

    const result = await downloadOriginalPdfFromDrive(input);

    expect(Buffer.from(result).equals(Buffer.from(pdfBytes))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [metadataUrl, metadataInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(metadataUrl).toContain("/files/drive-file-id?fields=id,mimeType,size,trashed");
    expect(metadataInit.headers).toEqual({ Authorization: "Bearer access-token" });
    expect(metadataInit.cache).toBe("no-store");
    expect(metadataInit.redirect).toBe("error");
    const [downloadUrl, downloadInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(downloadUrl).toContain("/files/drive-file-id?alt=media");
    expect(downloadInit.cache).toBe("no-store");
    expect(downloadInit.redirect).toBe("error");
  });

  it("refuses non-PDF, trashed, or size-mismatched Drive metadata before downloading bytes", async () => {
    for (const metadata of [
      { id: input.driveFileId, mimeType: "image/png", size: String(pdfBytes.byteLength), trashed: false },
      { id: input.driveFileId, mimeType: "application/pdf", size: String(pdfBytes.byteLength), trashed: true },
      { id: input.driveFileId, mimeType: "application/pdf", size: "999", trashed: false },
      { id: "different-file", mimeType: "application/pdf", size: String(pdfBytes.byteLength), trashed: false },
    ]) {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify(metadata), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      await expect(downloadOriginalPdfFromDrive(input)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledOnce();
    }
  });

  it("rejects content whose size or SHA-256 differs from the registered upload", async () => {
    const changed = new TextEncoder().encode("%PDF-1.7\nchanged source\n%%EOF");
    const fetchMock = mockDriveResponses({
      id: input.driveFileId,
      mimeType: "application/pdf",
      size: String(pdfBytes.byteLength),
      trashed: false,
    }, changed);

    await expect(downloadOriginalPdfFromDrive(input)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a response without a PDF signature", async () => {
    const invalidBytes = new TextEncoder().encode("not a PDF at all");
    const fetchMock = mockDriveResponses({
      id: input.driveFileId,
      mimeType: "application/pdf",
      size: String(invalidBytes.byteLength),
      trashed: false,
    }, invalidBytes);
    await expect(downloadOriginalPdfFromDrive({
      ...input,
      expectedSizeBytes: invalidBytes.byteLength,
      expectedSha256: createHash("sha256").update(invalidBytes).digest("hex"),
    })).rejects.toThrow("integrity checks");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid expected hashes and sizes without making a network request", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    await expect(downloadOriginalPdfFromDrive({ ...input, expectedSha256: "bad" })).rejects.toThrow("integrity metadata");
    await expect(downloadOriginalPdfFromDrive({ ...input, expectedSizeBytes: 0 })).rejects.toThrow("integrity metadata");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
