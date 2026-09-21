import { createHash } from "node:crypto";
import type { Seal } from "./types";

export const GENESIS_SEAL = "GENESIS";

/** Canonical JSON: recursively sort object keys so hashes are stable and replayable. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function sha384Hex(input: string): string {
  return createHash("sha384").update(input, "utf8").digest("hex");
}

/**
 * Hash-chained audit seal: SHA-384(prevSeal ‖ "\n" ‖ canonicalJson(record)).
 * Anyone can verify by replaying canonicalization + hash.
 */
export function sealRecord(record: unknown, prevSeal: string = GENESIS_SEAL): Seal {
  const canonical = canonicalJson(record);
  const seal = sha384Hex(`${prevSeal}\n${canonical}`);
  return { algo: "SHA-384", prevSeal, canonical, seal };
}

/** Verify a chain of seals in order. Returns true only if every link replays. */
export function verifyChain(records: unknown[], seals: string[], genesis: string = GENESIS_SEAL): boolean {
  if (records.length !== seals.length) return false;
  let prev = genesis;
  for (let i = 0; i < records.length; i++) {
    const expected = sha384Hex(`${prev}\n${canonicalJson(records[i])}`);
    if (expected !== seals[i]) return false;
    prev = seals[i] as string;
  }
  return true;
}

/** Deterministic chain head for a feed window: lets stateless responses chain across refreshes. */
export function windowSealId(timestamps: string[]): string {
  if (timestamps.length === 0) return GENESIS_SEAL;
  return sha384Hex(`window\n${timestamps.join(",")}`).slice(0, 32);
}
