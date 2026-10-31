import { Buffer } from "buffer";
export interface VaultTransactionReview {
  unsigned?: string;
  hash?: string;
  owner?: string;
  factory?: string;
  requiredFunding: string;
  transaction?: { gas: string; args: { request_id: string } };
}
// Check the exact one-action transaction again in the browser before Meteor sees it.
export async function verifyVaultTransaction(p: VaultTransactionReview) {
  const { Transaction, baseEncode } = await import("near-api-js");
  if (!p.unsigned || !p.hash || !p.transaction)
    throw Error("Missing prepared transaction.");
  const raw = Buffer.from(p.unsigned, "base64"),
    tx = Transaction.decode(raw),
    call = tx.actions[0]?.functionCall;
  const digest = baseEncode(
    new Uint8Array(await crypto.subtle.digest("SHA-256", raw)),
  );
  if (
    digest !== p.hash ||
    tx.signerId !== p.owner ||
    tx.receiverId !== p.factory ||
    tx.actions.length !== 1 ||
    !call ||
    call.methodName !== "create_vault" ||
    String(call.deposit) !== p.requiredFunding ||
    String(call.gas) !== p.transaction.gas ||
    Buffer.from(call.args).toString() !== JSON.stringify(p.transaction.args)
  )
    throw Error(
      "Prepared transaction differs from the reviewed vault plan. No wallet request sent.",
    );
  return p.unsigned;
}
