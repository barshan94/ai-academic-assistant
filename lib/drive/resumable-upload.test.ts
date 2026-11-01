import { describe, expect, it } from "vitest";
import { isValidDriveChunk, parseDriveUploadOffset, readDriveUploadChunk } from "./resumable-upload";

describe("resumable Drive upload protocol", () => {
  it("parses the next byte offset from a confirmed Drive range", () => {
    expect(parseDriveUploadOffset(null)).toBe(0);
    expect(parseDriveUploadOffset("bytes=0-1048575", 2097152)).toBe(1048576);
    expect(parseDriveUploadOffset("bytes=0-262143")).toBe(262144);
  });

  it("rejects malformed or non-zero-based server ranges", () => {
    expect(() => parseDriveUploadOffset("bytes=10-100")).toThrow("invalid upload range");
    expect(() => parseDriveUploadOffset("0-100")).toThrow("invalid upload range");
    expect(() => parseDriveUploadOffset("bytes=0-200", 100)).toThrow("out-of-bounds");
  });

  it("accepts a 1 MB aligned chunk and a final short chunk", () => {
    expect(isValidDriveChunk({
      contentRange: "bytes 0-1048575/2097152",
      byteLength: 1048576,
      totalBytes: 2097152,
    })).toBe(true);
    expect(isValidDriveChunk({
      contentRange: "bytes 1048576-1500000/1500001",
      byteLength: 451425,
      totalBytes: 1500001,
    })).toBe(true);
  });

  it("rejects invalid chunk size, alignment, range and total", () => {
    expect(isValidDriveChunk({
      contentRange: "bytes 0-100/1000",
      byteLength: 101,
      totalBytes: 1000,
    })).toBe(false);
    expect(isValidDriveChunk({
      contentRange: "bytes 1-262144/524288",
      byteLength: 262144,
      totalBytes: 524288,
    })).toBe(false);
    expect(isValidDriveChunk({
      contentRange: "bytes 0-262143/524289",
      byteLength: 262144,
      totalBytes: 524288,
    })).toBe(false);
    expect(isValidDriveChunk({
      contentRange: "bytes 0-524287/262144",
      byteLength: 524288,
      totalBytes: 262144,
    })).toBe(false);
    expect(isValidDriveChunk({
      contentRange: "bytes 0-262143/9007199254740992",
      byteLength: 262144,
      totalBytes: 9007199254740992,
    })).toBe(false);
  });
});

describe("bounded upload body reader", () => {
  it("reads a chunk without changing its bytes", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });
    expect(Array.from(await readDriveUploadChunk(body))).toEqual([1, 2, 3]);
  });

  it("rejects a body larger than the configured chunk limit", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024));
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    await expect(readDriveUploadChunk(body)).rejects.toThrow("1 MB server limit");
  });
});
