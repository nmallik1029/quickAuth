type TemplateRef = { id: string; variables?: Record<string, string | number | boolean> };

type SendArgs =
  | { to: string; subject: string; html: string; text?: string; template?: never }
  | { to: string; template: TemplateRef; subject?: string };

export async function sendEmail(args: SendArgs): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "onboarding@example.com";

  if (!key) {
    console.log("[email:dev]", args);
    return;
  }

  const body: Record<string, unknown> = { from, to: args.to };

  if ("template" in args && args.template) {
    body.template = {
      id: args.template.id,
      ...(args.template.variables ? { variables: args.template.variables } : {}),
    };
    if (args.subject) body.subject = args.subject;
  } else if ("html" in args) {
    body.subject = args.subject;
    body.html = args.html;
    if (args.text) body.text = args.text;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("[email] failed", res.status, errBody);
  }
}

export function appUrl(path = "/"): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
