import { ok, unauthorized } from "@/lib/server/response";
import { getSessionUser, sessionToUser } from "@/lib/server/auth";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  return ok(sessionToUser(session));
}
