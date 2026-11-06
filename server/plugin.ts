import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import { apiError, handleApi } from "./api";
import { loadServerEnv } from "./env";

function attach(middlewares: Connect.Server, mode: string, envDir: string | false) {
  loadServerEnv(mode, envDir);
  middlewares.use((req, res, next) => {
    void handleApi(req as IncomingMessage, res as ServerResponse)
      .then((handled) => {
        if (!handled) next();
      })
      .catch((error: unknown) => {
        console.error(error);
        if (res.headersSent) return;
        const body = apiError(error);
        res.statusCode = body.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: body.message }));
      });
  });
}

export function shopServer(): Plugin {
  return {
    name: "dualsun-shop",
    configureServer(server) {
      attach(server.middlewares, server.config.mode, server.config.envDir);
    },
    configurePreviewServer(server) {
      attach(server.middlewares, "production", server.config.envDir);
    },
  };
}
