import { defineConfig } from "vitest/config";

// DELIBERATELY does NOT import `../../vitest.cache-dir` the way every other
// vitest config in this repo does. `scripts/release-sdk-mirror.ts` copies this
// file verbatim into the public AtribuCore/atribu-node repo (it is in that
// script's ALLOWED_TOP_LEVEL list), where a `../../` import resolves to nothing
// and would break the mirror's CI on the first release. The hazard the shared
// helper exists for — a warm, cross-user `node_modules` — does not exist there
// either: atribu-node runs on ephemeral ubuntu-latest, and this suite never runs
// in THIS repo's CI (no workflow invokes it; the SDK's own tests run in the
// mirror). If that ever changes, add `vitest.cache-dir.ts` to the mirror script's
// EXTRA_FILES before wiring it up here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      exclude: ["test/**", "dist/**", "src/__generated__/**"],
    },
  },
});
