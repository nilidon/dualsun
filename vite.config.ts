import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { shopServer } from "./server/plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), shopServer()],
});
