import { getRemainingRequestTimeoutMs } from "@/lib/http/request-deadline";

export type SupabaseFetchOptions = {
  deadlineAt?: number;
  requestTimeoutMs?: number;
};

export function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: SupabaseFetchOptions = {},
) {
  const requestInit: RequestInit = { ...init, redirect: "error" };

  if (options.deadlineAt !== undefined) {
    const timeoutMs = getRemainingRequestTimeoutMs(
      options.requestTimeoutMs ?? 10_000,
      options.deadlineAt,
    );
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const requestSignal = typeof Request !== "undefined" && input instanceof Request
      ? input.signal
      : undefined;
    const callerSignal = init?.signal === undefined ? requestSignal : init.signal;
    requestInit.signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;
  }

  return fetch(input, requestInit);
}
