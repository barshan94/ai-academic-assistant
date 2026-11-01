import { describe, expect, it } from "vitest";
import { copyResponsePolicyHeaders } from "./response-policy-headers";

describe("copyResponsePolicyHeaders", () => {
  it("preserves cache, CSP and crawler policy on a replacement response", () => {
    const source = new Headers({
      "Cache-Control": "private, no-store",
      "Expires": "0",
      "Pragma": "no-cache",
      "Content-Security-Policy": "default-src 'self'; script-src 'nonce-test'",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Request-Id": "must-not-be-copied",
    });
    const destination = new Headers();

    copyResponsePolicyHeaders(source, destination);

    expect(destination.get("Cache-Control")).toBe("private, no-store");
    expect(destination.get("Expires")).toBe("0");
    expect(destination.get("Pragma")).toBe("no-cache");
    expect(destination.get("Content-Security-Policy")).toBe("default-src 'self'; script-src 'nonce-test'");
    expect(destination.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(destination.has("X-Request-Id")).toBe(false);
  });

  it("does not overwrite destination policy when the source omits a header", () => {
    const source = new Headers({ "X-Robots-Tag": "noindex" });
    const destination = new Headers({ "Cache-Control": "private, no-store" });

    copyResponsePolicyHeaders(source, destination);

    expect(destination.get("Cache-Control")).toBe("private, no-store");
    expect(destination.get("X-Robots-Tag")).toBe("noindex");
  });
});
