import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "webhooks/index": "src/webhooks/index.ts",
    "oauth/index": "src/oauth/index.ts",
    "admin/index": "src/admin/index.ts",
    "next/index": "src/next/index.ts",
    "test/index": "src/test/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  splitting: false,
  outDir: "dist",
});
