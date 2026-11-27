import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseFetch } from "./fetch";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Supabase fetch deadlines", () => {
  it("preserves the caller signal and blocks redirects when no deadline is supplied", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
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
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
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

  it("does not start a request after the shared deadline has expired", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(() => supabaseFetch(
      "https://academic.example/rest/v1/documents",
      undefined,
      { deadlineAt: Date.now() - 1 },
    )).toThrow("REQUEST_DEADLINE_EXCEEDED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
