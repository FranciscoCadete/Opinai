// Resend — transactional email notifications
// https://resend.com/docs/api-reference/emails/send-email

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface EmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM ?? "OP1NA1 <notificacoes@mulenvos.ao>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping");
    return { ok: false, error: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });

    const data = await res.json() as { id?: string; message?: string };

    if (!res.ok) {
      console.error("[email] Resend error", data.message);
      return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    }

    return { ok: true, id: data.id };
  } catch (e) {
    console.error("[email] network error", e);
    return { ok: false, error: String(e) };
  }
}

// Minimal HTML wrapper around the markdown body (stripped to safe HTML)
export function buildHtml(subject: string, body: string): string {
  const safe = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background: #f5f4f0; margin: 0; padding: 32px 16px; color: #1a2a1e; }
    .card { background: #fff; max-width: 560px; margin: 0 auto; border-radius: 12px; padding: 36px 40px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
    .logo { font-size: 24px; font-weight: 300; color: #00c49a; letter-spacing: -.02em; margin-bottom: 24px; }
    p { line-height: 1.7; margin: 0 0 12px; }
    .footer { margin-top: 32px; font-size: 11px; color: #7a8c80; border-top: 1px solid #e8e6e0; padding-top: 16px; }
    a { color: #00c49a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">OP1NA1</div>
    <p>${safe}</p>
    <div class="footer">
      Município dos Mulenvos · Angola<br>
      <a href="https://op1na1.mulenvos.ao">op1na1.mulenvos.ao</a> ·
      Para cancelar notificações, responda PARAR a qualquer SMS.
    </div>
  </div>
</body>
</html>`;
}
