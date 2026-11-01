export function createPersistedWorkerFailureResponse(jobId: string) {
  return Response.json(
    {
      processed: false,
      job_id: jobId,
      failed: true,
      error: "Document processing failed. Reconnect Google Drive if the problem persists.",
    },
    { status: 500 },
  );
}
