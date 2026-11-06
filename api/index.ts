import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";

const entry = "../server/published.js";

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
      const shop = (await import(entry)) as {
        handleApi: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
        apiError: (error: unknown) => { status: number; message: string };
      };
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

      const handled = await shop.handleApi(req, res);
      if (!handled) {
        return Response.json({ error: "Not found." }, { status: 404 });
      }
      return new Response(payload, { status, headers });
    } catch (error) {
      console.error(error);
      const body = error instanceof Error && error.message.startsWith("Cannot find module")
        ? { status: 500, message: error.message }
        : { status: 500, message: error instanceof Error && error.message.startsWith("Add TURSO_") ? error.message : "Something went wrong." };
      if (error instanceof Error && error.message.startsWith("Add TURSO_")) {
        return Response.json({ error: error.message }, { status: 503 });
      }
      return Response.json({ error: body.message }, { status: body.status });
    }
  },
};
