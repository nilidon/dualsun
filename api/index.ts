import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";

function restorePath(req: IncomingMessage) {
  const current = new URL(req.url ?? "/", "http://localhost");
  const route = current.searchParams.get("__path");
  if (!route || route.includes("..") || !/^[\w./-]+$/.test(route)) return;
  current.searchParams.delete("__path");
  const query = current.searchParams.toString();
  req.url = `/api/${route}${query ? `?${query}` : ""}`;
}

export default {
  async fetch(request: Request) {
    try {
      const { handleApi } = await import("../server/api");
      const url = new URL(request.url);
      const req = Readable.from([new Uint8Array(await request.arrayBuffer())]) as IncomingMessage;
      req.method = request.method;
      req.url = `${url.pathname}${url.search}`;
      req.headers = {};
      request.headers.forEach((value, key) => {
        req.headers[key] = value;
      });
      restorePath(req);

      const headers = new Headers();
      let status = 200;
      let payload = "";
      let headersSent = false;
      const res = {
        get headersSent() {
          return headersSent;
        },
        statusCode: 200,
        setHeader(name: string, value: string) {
          headers.set(name, value);
        },
        end(chunk?: string) {
          headersSent = true;
          status = res.statusCode;
          payload = chunk ?? "";
        },
      } as ServerResponse;

      const handled = await handleApi(req, res);
      if (!handled) {
        return Response.json({ error: "Not found." }, { status: 404 });
      }
      return new Response(payload, { status, headers });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Something went wrong.";
      const status = message.startsWith("Add TURSO_") ? 503 : 500;
      return Response.json({ error: message }, { status });
    }
  },
};
