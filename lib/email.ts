type SendArgs = { to: string; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "onboarding@example.com";

  if (!key) {
    console.log("[email:dev]", { to, subject, html });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] failed", res.status, body);
  }
}

export function appUrl(path = "/"): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
