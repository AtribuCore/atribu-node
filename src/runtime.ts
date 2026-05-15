export type Runtime = "node" | "bun" | "deno" | "edge" | "browser" | "unknown";

declare const Deno: unknown;
declare const Bun: unknown;
declare const EdgeRuntime: unknown;

export function detectRuntime(): Runtime {
  if (typeof Deno !== "undefined") return "deno";
  if (typeof Bun !== "undefined") return "bun";
  if (typeof EdgeRuntime !== "undefined") return "edge";
  if (
    typeof process !== "undefined" &&
    typeof (process as { versions?: { node?: string } }).versions?.node === "string"
  ) {
    return "node";
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") return "browser";
  return "unknown";
}

export function runtimeTag(): string {
  const rt = detectRuntime();
  if (rt === "node") {
    const v = (process as { versions?: { node?: string } }).versions?.node;
    return v ? `node/${v}` : "node";
  }
  return rt;
}
