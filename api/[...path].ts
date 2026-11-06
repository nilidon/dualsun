import type { IncomingMessage, ServerResponse } from "node:http";
import { apiError, handleApi } from "../server/api";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const handled = await handleApi(req, res);
    if (!handled && !res.headersSent) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Not found." }));
    }
  } catch (error) {
    console.error(error);
    if (res.headersSent) return;
    const body = apiError(error);
    res.statusCode = body.status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: body.message }));
  }
}
