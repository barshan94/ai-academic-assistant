import { describe, expect, it } from "vitest";
import { readLimitedResponseText } from "./read-limited-response";

describe("bounded HTTP response reader", () => {
  it("accepts a numeric Content-Length and reads the response body", async () => {
    const response = new Response("abc", {
      headers: { "Content-Length": "3" },
    });

    await expect(readLimitedResponseText(response, 3)).resolves.toBe("abc");
  });

  it("rejects a malformed Content-Length", async () => {
    const response = new Response("abc", {
      headers: { "Content-Length": "three" },
    });

    await expect(readLimitedResponseText(response, 10)).rejects.toThrow("INVALID_RESPONSE_LENGTH");
  });

  it("rejects a declared body larger than the configured limit", async () => {
    const response = new Response("abc", {
      headers: { "Content-Length": "11" },
    });

    await expect(readLimitedResponseText(response, 10)).rejects.toThrow("RESPONSE_TOO_LARGE");
  });

  it("keeps streamed byte limits when Content-Length is absent", async () => {
    const response = new Response("four");

    await expect(readLimitedResponseText(response, 3)).rejects.toThrow("RESPONSE_TOO_LARGE");
  });
});
