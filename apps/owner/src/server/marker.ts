import crypto from "node:crypto";
import { uint } from "../data/owner-adapter.ts";
import type { Payment } from "../data/owner-adapter.ts";
const str = (s: string) => {
  const bytes = Buffer.from(s),
    size = Buffer.alloc(4);
  size.writeUInt32LE(bytes.length);
  return Buffer.concat([size, bytes]);
};
const le = (s: string, length: number) => {
  let n = BigInt(uint(s, (1n << BigInt(length * 8)) - 1n));
  const bytes = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(n & 255n);
    n >>= 8n;
  }
  return bytes;
};
// The frozen Rust transfer_marker tuple: account, U64, strings, account, U128, U64.
export function transferMarker(vault: string, p: Payment) {
  return (
    "NNETICS_TRANSFER_V1:" +
    crypto
      .createHash("sha256")
      .update(
        Buffer.concat([
          str(vault),
          le(p.attempt_id, 8),
          str(p.order_id),
          str(p.invoice_id),
          str(p.recipient),
          le(p.amount, 16),
          le(p.initiated_at_ns, 8),
        ]),
      )
      .digest("hex")
  );
}
