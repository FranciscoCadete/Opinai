import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withErrorHandler, methodNotAllowed } from "./_lib/http";

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
    res.status(200).json({ status: "ok", ts: new Date().toISOString() });
  }),
);
