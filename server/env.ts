import { loadEnv } from "vite";

export function loadServerEnv(mode: string, envDir: string | false) {
  const env = loadEnv(mode, envDir || process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
