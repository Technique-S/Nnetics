/** Application safety gate; does not replace validator/proof verification. */
export const CHECKPOINT_MAX_AGE_NS = 24n * 60n * 60n * 1_000_000_000n;
export function assertFreshCheckpoint(checkpoint: unknown, finalizedTimeNs: string): void {
  const timestamp = (checkpoint as {head?: {inner_lite?: {timestamp?: unknown}}} | null)?.head?.inner_lite?.timestamp;
  if (typeof timestamp !== "string" || !/^[0-9]+$/.test(timestamp) || !/^[0-9]+$/.test(finalizedTimeNs))
    throw new Error("A valid reviewed recovery checkpoint is required before payment execution.");
  const age = BigInt(finalizedTimeNs) - BigInt(timestamp);
  if (age < 0n || age >= CHECKPOINT_MAX_AGE_NS)
    throw new Error("The recovery checkpoint is expired or ahead of the finalized network time. Refresh and review it before payment execution.");
}
