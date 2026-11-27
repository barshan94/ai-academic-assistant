import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseFetch } from "@/lib/supabase/fetch";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Supabase fetch transport", () => {
  it("rejects redirects for authenticated Supabase requests", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await supabaseFetch("https://project.supabase.co/auth/v1/user", {
      headers: { apikey: "public-test-key", Authorization: "Bearer user-session-token" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.redirect).toBe("error");
  });

  it("preserves the caller signal and blocks redirects when no deadline is supplied", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const url = "https://academic.example/rest/v1/documents";

    await supabaseFetch(url, { method: "GET", signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "error",
    });
  });

  it("caps the request timeout and composes it with caller cancellation", async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      receivedSignal = init?.signal;
      return new Response("ok");
    });
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const controller = new AbortController();

    await supabaseFetch(
      "https://academic.example/rest/v1/documents",
      { signal: controller.signal },
      { deadlineAt: Date.now() + 60_000, requestTimeoutMs: 5_000 },
    );

    expect(timeoutSpy).toHaveBeenCalledWith(5_000);
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal).not.toBe(controller.signal);
    controller.abort();
    expect(receivedSignal?.aborted).toBe(true);
    expect(fetchMock.mock.calls[0]?.[1]?.redirect).toBe("error");
  });

  it("preserves a Request object's embedded signal when adding the deadline", async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      receivedSignal = init?.signal;
      return new Response("ok");
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const request = new Request("https://academic.example/rest/v1/documents", {
      signal: controller.signal,
    });

    await supabaseFetch(request, undefined, {
      deadlineAt: Date.now() + 60_000,
      requestTimeoutMs: 5_000,
    });

    expect(receivedSignal).toBeDefined();
    expect(receivedSignal).not.toBe(controller.signal);
    controller.abort();
    expect(receivedSignal?.aborted).toBe(true);
  });

  it("does not start a request after the shared deadline has expired", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    expect(() => supabaseFetch(
      "https://academic.example/rest/v1/documents",
      undefined,
      { deadlineAt: Date.now() - 1 },
    )).toThrow("REQUEST_DEADLINE_EXCEEDED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
