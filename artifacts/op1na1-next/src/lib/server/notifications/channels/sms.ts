// Twilio Programmable SMS — outbound SMS notifications

interface SmsResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const accountSid  = process.env.TWILIO_ACCOUNT_SID;
  const authToken   = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber  = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[sms] Twilio credentials not set — skipping");
    return { ok: false, error: "not_configured" };
  }

  // SMS hard limit: 160 chars per segment. Keep under 320 (2 segments).
  const truncated = body.length > 320 ? body.slice(0, 317) + "…" : body;

  const params = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: truncated,
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = await res.json() as { sid?: string; error_message?: string; status?: string };

    if (!res.ok || data.error_message) {
      console.error("[sms] Twilio error", data.error_message);
      return { ok: false, error: data.error_message ?? `HTTP ${res.status}` };
    }

    return { ok: true, sid: data.sid };
  } catch (e) {
    console.error("[sms] network error", e);
    return { ok: false, error: String(e) };
  }
}

// Plain-text version of a template body (strip markdown)
export function toPlainText(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#+\s+/g, "")
    .trim();
}
