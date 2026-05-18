import { ok } from "@/lib/server/response";
import { clearSessionCookie } from "@/lib/server/auth";

export async function POST() {
  await clearSessionCookie();
  return ok({ ok: true });
}
