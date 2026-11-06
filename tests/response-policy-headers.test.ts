import { describe, expect, it } from "vitest";
import { copyResponsePolicyHeaders } from "@/lib/http/response-policy-headers";

describe("copyResponsePolicyHeaders", () => {
  it("copies only the approved response policy headers", () => {
    const source = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'self'",
      "X-Robots-Tag": "noindex, nofollow",
      "Set-Cookie": "session=secret",
    });
    const destination = new Headers({ "X-Existing": "preserved" });

    copyResponsePolicyHeaders(source, destination);

    expect(destination.get("Cache-Control")).toBe("private, no-store");
    expect(destination.get("Content-Security-Policy")).toBe("default-src 'self'");
    expect(destination.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(destination.get("Set-Cookie")).toBeNull();
    expect(destination.get("X-Existing")).toBe("preserved");
  });
});
