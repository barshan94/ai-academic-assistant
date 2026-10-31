"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeFilesToPdf } from "@/lib/documents/normalize-to-pdf";
import { MAX_UPLOAD_BYTES, MAX_IMAGE_COUNT, DRIVE_UPLOAD_CHUNK_BYTES } from "@/lib/documents/upload-limits";

const STORAGE_PREFIX = "academic-assistant-upload:";

async function sha256Hex(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

type StoredSession = { sessionToken: string; fileName: string; fileSizeBytes: number };

export function ResumableUploadForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const activeStorageKey = useRef<string | null>(null);

  async function readJson(response: Response) {
    const body = await response.json() as { error?: string; duplicate?: boolean; sessionToken?: string; nextOffset?: number; complete?: boolean };
    if (!response.ok) throw new Error(body.error || (response.status === 409 ? "This document is already in your library." : "Upload failed."));
    return body;
  }

  async function upload() {
    const files = Array.from(inputRef.current?.files ?? []).filter((file) => file.size > 0);
    if (!files.length) {
      setError("Choose one PDF or a batch of JPEG/PNG images.");
      return;
    }
    if (files.length > MAX_IMAGE_COUNT) {
      setError("Choose no more than 50 images at a time.");
      return;
    }

    setBusy(true);
    setProgress(0);
    setError("");
    setMessage("Preparing your document…");

    try {
      const normalized = await normalizeFilesToPdf(files);
      if (normalized.bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("The normalized PDF must be 50 MB or smaller.");
      const sha256 = await sha256Hex(normalized.bytes);
      const storageKey = STORAGE_PREFIX + sha256;
      activeStorageKey.current = storageKey;
      let stored: StoredSession | null = null;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) stored = JSON.parse(raw) as StoredSession;
      } catch {
        localStorage.removeItem(storageKey);
      }

      if (!stored) {
        setMessage("Starting secure Google Drive upload…");
        const startResponse = await fetch("/api/documents/upload/resumable/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: normalized.fileName,
            fileSizeBytes: normalized.bytes.byteLength,
            sha256,
            pageCount: normalized.pageCount,
          }),
        });
        const started = await readJson(startResponse);
        if (!started.sessionToken) throw new Error("The server did not create an upload session.");
        stored = {
          sessionToken: started.sessionToken,
          fileName: normalized.fileName,
          fileSizeBytes: normalized.bytes.byteLength,
        };
        localStorage.setItem(storageKey, JSON.stringify(stored));
      }

      let offset = 0;
      let complete = false;
      let retries = 0;
      while (!complete && offset < normalized.bytes.byteLength) {
        const end = Math.min(offset + DRIVE_UPLOAD_CHUNK_BYTES, normalized.bytes.byteLength);
        const chunk = normalized.bytes.slice(offset, end);
        const response = await fetch("/api/documents/upload/resumable/chunk", {
          method: "POST",
          headers: {
            "X-Upload-Session": stored.sessionToken,
            "Content-Range": `bytes ${offset}-${end - 1}/${normalized.bytes.byteLength}`,
            "Content-Type": "application/octet-stream",
          },
          body: chunk,
        });

        try {
          const result = await readJson(response);
          if (result.complete) {
            complete = true;
            offset = normalized.bytes.byteLength;
          } else {
            offset = typeof result.nextOffset === "number" ? result.nextOffset : end;
          }
          retries = 0;
        } catch (uploadError) {
          if (retries >= 2) throw uploadError;
          retries += 1;
          setMessage("Connection interrupted. Checking the last confirmed upload position…");
          const statusResponse = await fetch("/api/documents/upload/resumable/chunk", {
            method: "POST",
            headers: {
              "X-Upload-Session": stored.sessionToken,
              "Content-Range": `bytes */${normalized.bytes.byteLength}`,
            },
          });
          const status = await readJson(statusResponse);
          complete = status.complete === true;
          offset = typeof status.nextOffset === "number" ? status.nextOffset : 0;
        }
        setProgress(Math.min(100, Math.floor((offset / normalized.bytes.byteLength) * 100)));
        setMessage(complete ? "Document archived and queued for processing." : `Uploading… ${Math.round((offset / normalized.bytes.byteLength) * 100)}%`);
      }

      if (!complete) {
        const statusResponse = await fetch("/api/documents/upload/resumable/chunk", {
          method: "POST",
          headers: {
            "X-Upload-Session": stored.sessionToken,
            "Content-Range": `bytes */${normalized.bytes.byteLength}`,
          },
        });
        const status = await readJson(statusResponse);
        if (!status.complete) throw new Error("The upload is not complete yet. Try again to resume it.");
      }

      localStorage.removeItem(storageKey);
      setProgress(100);
      setMessage("Document archived and queued for processing.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : "Upload failed.";
      if (/session expired/i.test(errorMessage) && activeStorageKey.current) {
        localStorage.removeItem(activeStorageKey.current);
      }
      setError(errorMessage);
      setMessage(/session expired/i.test(errorMessage)
        ? "The previous session expired. Re-select the file and start a new upload."
        : "Your upload session is kept when it can be resumed. Re-select the same file to continue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload-panel">
      <label htmlFor="document-files">Choose one PDF or multiple JPEG/PNG images</label>
      <input
        ref={inputRef}
        id="document-files"
        name="files"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        multiple
        disabled={disabled || busy}
      />
      <p>PDFs up to 50 MB are uploaded in resumable 1 MB chunks. Multiple images become one multi-page PDF in selection order (up to 50 images). Re-select the same file after a connection failure to resume from the last confirmed byte.</p>
      <button className="primary-action" type="button" onClick={upload} disabled={disabled || busy}>
        {busy ? "Uploading…" : "Archive and queue for processing"} <span aria-hidden="true">→</span>
      </button>
      {busy ? <div className="upload-progress" role="status" aria-live="polite"><div className="upload-progress-track"><span style={{ width: progress + "%" }} /></div><p>{message}</p></div> : null}
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {!busy && message ? <p className="notice notice-info" role="status">{message}</p> : null}
    </div>
  );
}
