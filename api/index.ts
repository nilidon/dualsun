import type { IncomingMessage, ServerResponse } from "node:http";
import { apiError, handleApi } from "../server/api";

export const config = {
  api: {
    bodyParser: false,
  },
};

function restorePath(req: IncomingMessage) {
  const current = new URL(req.url ?? "/", "http://localhost");
  const route = current.searchParams.get("__path");
  if (!route || route.includes("..") || !/^[\w./-]+$/.test(route)) return;
  current.searchParams.delete("__path");
  const query = current.searchParams.toString();
  req.url = `/api/${route}${query ? `?${query}` : ""}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    restorePath(req);
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
