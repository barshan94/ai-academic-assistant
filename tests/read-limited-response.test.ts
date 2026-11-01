import { describe, expect, it } from "vitest";
import { readLimitedResponseText } from "@/lib/http/read-limited-response";

function streamedResponse(chunks: Uint8Array[], headers?: HeadersInit) {
  let index = 0;
  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index++]);
    },
  }), { headers });
}

describe("readLimitedResponseText", () => {
  it("reads a body at the exact declared byte limit", async () => {
    await expect(readLimitedResponseText(
      new Response("abc", { headers: { "content-length": "3" } }),
      3,
    )).resolves.toBe("abc");
  });

  it("accepts a missing Content-Length and enforces the streamed byte limit", async () => {
    await expect(readLimitedResponseText(new Response("abc"), 3)).resolves.toBe("abc");
    await expect(readLimitedResponseText(new Response("abcd"), 3)).rejects.toThrow("RESPONSE_TOO_LARGE");
  });

  it.each(["", "+3", "-1", "1.5", "3x", "1e2"])(
    "rejects malformed Content-Length %j",
    async (contentLength) => {
      const response = new Response("a", { headers: { "content-length": contentLength } });
      await expect(readLimitedResponseText(response, 3)).rejects.toThrow("INVALID_RESPONSE_LENGTH");
    },
  );

  it("accepts optional HTTP whitespace normalized by the Headers implementation", async () => {
    const headers = new Headers();
    headers.set("content-length", " 3 ");
    expect(headers.get("content-length")).toBe("3");
    await expect(readLimitedResponseText(new Response("abc", { headers }), 3)).resolves.toBe("abc");
  });

  it("rejects a declared body larger than the configured limit before reading it", async () => {
    const response = new Response("abcd", { headers: { "content-length": "4" } });
    await expect(readLimitedResponseText(response, 3)).rejects.toThrow("RESPONSE_TOO_LARGE");
  });

  it("rejects a streamed body that exceeds the limit even when its declared length does not", async () => {
    const response = streamedResponse([
      new TextEncoder().encode("ab"),
      new TextEncoder().encode("cd"),
    ], { "content-length": "2" });
    await expect(readLimitedResponseText(response, 3)).rejects.toThrow("RESPONSE_TOO_LARGE");
  });

  it("decodes a multibyte UTF-8 character split across chunks", async () => {
    const encoded = new TextEncoder().encode("বাংলা");
    const response = streamedResponse([
      encoded.slice(0, 2),
      encoded.slice(2, 5),
      encoded.slice(5),
    ]);
    await expect(readLimitedResponseText(response, encoded.byteLength)).resolves.toBe("বাংলা");
  });

  it("rejects invalid UTF-8 rather than silently replacing invalid bytes", async () => {
    const response = streamedResponse([new Uint8Array([0xff, 0xfe])]);
    await expect(readLimitedResponseText(response, 2)).rejects.toThrow("RESPONSE_INVALID_UTF8");
  });

  it("returns an empty string for a response without a body", async () => {
    await expect(readLimitedResponseText(new Response(null), 10)).resolves.toBe("");
  });

  it.each([0, -1, 1.5, 5_000_001, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid byte limits %s",
    async (limit) => {
      await expect(readLimitedResponseText(new Response("x"), limit)).rejects.toThrow("INVALID_RESPONSE_LIMIT");
    },
  );
});
