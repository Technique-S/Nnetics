import crypto from "node:crypto";
import { SignedTransaction, baseEncode } from "near-api-js";
import type { Transaction } from "near-api-js";

// Keychain/CLI output is untrusted until it matches the approved unsigned bytes.
export function verifySetupSignature(expected: Transaction, encoded: string) {
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.toString("base64") !== encoded)
    throw new Error("Noncanonical setup signature encoding.");
  const signed = SignedTransaction.decode(bytes);
  if (
    !Buffer.from(signed.encode()).equals(bytes) ||
    !Buffer.from(signed.transaction.encode()).equals(
      Buffer.from(expected.encode()),
    )
  )
    throw new Error("Signer changed the approved setup transaction.");
  const digest = crypto.createHash("sha256").update(expected.encode()).digest();
  // SDK 7.4.0's Borsh decoder returns the variant's plain data object, not
  // Signature's constructor getters. Inspect the decoded Ed25519 variant.
  const signature = signed.signature.ed25519Signature?.data;
  if (
    !expected.publicKey.toString().startsWith("ed25519:") ||
    !signature ||
    signature.length !== 64 ||
    !expected.publicKey.verify(digest, Uint8Array.from(signature))
  )
    throw new Error("Invalid approved-owner setup signature.");
  return { signed: encoded, hash: baseEncode(digest) };
}
