import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SessionUserResponse } from "@workspace/api-zod";
import { withCors, withErrorHandler, methodNotAllowed } from "../_lib/http";
import { getSession } from "../_lib/auth";

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    const session = await getSession(req);
    if (!session) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const body: SessionUserResponse = {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
      municipalityId: session.municipalityId,
    };
    res.status(200).json(body);
  }),
);
