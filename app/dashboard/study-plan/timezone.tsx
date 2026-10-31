"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const COOKIE_NAME = "study-plan-timezone";

export default function StudyPlanTimezone({ timeZone }: { timeZone: string }) {
  const router = useRouter();

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === timeZone) return;
    const current = document.cookie.split("; ").find((item) => item.startsWith(COOKIE_NAME + "="))?.slice(COOKIE_NAME.length + 1);
    if (current === encodeURIComponent(detected)) return;
    document.cookie = COOKIE_NAME + "=" + encodeURIComponent(detected) + "; Path=/dashboard; Max-Age=31536000; SameSite=Lax";
    router.refresh();
  }, [router, timeZone]);

  return <p className="question-card-meta">Calendar dates use your device timezone: {timeZone}.</p>;
}
