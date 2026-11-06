"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <main
          role="alert"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeContent: "center",
            gap: "1rem",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            color: "#172033",
            background: "#f7f8fb",
          }}
        >
          <h1>Academic Assistant is temporarily unavailable.</h1>
          <p>
            Sensitive error details are hidden. Your last action may not have been saved;
            check before submitting it again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              justifySelf: "start",
              border: 0,
              borderRadius: "0.6rem",
              padding: "0.75rem 1rem",
              color: "#fff",
              background: "#243b67",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
