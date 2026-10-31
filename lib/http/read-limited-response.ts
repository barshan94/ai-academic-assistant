export async function readLimitedResponseText(response: Response, maxBytes: number): Promise<string> {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 5_000_000) {
    throw new Error("INVALID_RESPONSE_LIMIT");
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("RESPONSE_TOO_LARGE");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
    return body;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // Preserve the original bounded-read failure.
    }
    throw error;
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}
