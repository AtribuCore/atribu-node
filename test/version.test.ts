import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SDK_VERSION } from "../src/version";

/**
 * `SDK_VERSION` is the version every request advertises in its User-Agent, and
 * it is hand-maintained alongside package.json. It sat at 1.4.0 across nine
 * releases (through package 1.11.0) before anything noticed, because nothing
 * was checking. This is that check.
 */
describe("SDK_VERSION", () => {
  it("matches the version in package.json", () => {
    const pkg = JSON.parse(
      readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
    ) as { version: string };
    expect(SDK_VERSION).toBe(pkg.version);
  });
});
