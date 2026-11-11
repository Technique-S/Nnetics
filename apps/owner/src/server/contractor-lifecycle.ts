// Server-held pending contractor lifecycle operations.
//
// The Ask Nnetics model may only *prepare* a destructive operation. The
// confirmation that completes it is bound to a single-use secret that never
// enters the model context: the tool result carries only the operation id, the
// resolved contractor, its eligibility and the consequence. The secret travels
// in the HTTP action chip, so only the owner's own browser can complete the
// operation. A model can never turn its own output into consent.
import crypto from "node:crypto";

export type LifecycleKind = "archive" | "restore" | "delete" | "revoke-portal" | "replace-portal" | "wallet-decision";

export interface LifecycleEligibility {
    eligible: boolean;
    reason: string;
    linked: { bills: number; orders: number; uploads: number; activeLinks: number };
}

export interface LifecycleOperation {
    id: string;
    kind: LifecycleKind;
    scope: string;
    contractorId: string;
    contractorName: string;
    eligible: boolean;
    reason: string;
    consequence: string;
    secret: string;
    details?: Record<string, string | number | null>;
    expiresAt: number;
    used: boolean;
}

const TTL_MS = 10 * 60 * 1000;
const MAX_OPERATIONS = 500;

const operations = new Map<string, LifecycleOperation>();

// A stable, non-secret scope for one owner session. Raw tokens are never used
// as map keys and never leave the server.
export function lifecycleScope(ownerToken: string): string {
    return crypto.createHash("sha256").update(ownerToken).digest("hex");
}

function prune(now: number) {
    for (const [id, operation] of operations) {
        if (operation.expiresAt <= now) operations.delete(id);
    }
    while (operations.size >= MAX_OPERATIONS) {
        const oldest = operations.keys().next().value as string | undefined;
        if (!oldest) break;
        operations.delete(oldest);
    }
}

export const LIFECYCLE_CONSEQUENCE: Record<LifecycleKind, string> = {
    "wallet-decision": "Apply the exact displayed wallet decision using the existing owner approval workflow. Approval changes the recipient for future work; historical work orders and receipts keep their original recipient. Rejection preserves the current approved recipient.",
    "revoke-portal": "Revoke contractor portal access and invalidate current sessions. A fresh invitation will be required. Pending wallet requests tied to this access become invalid.",
    "replace-portal": "Revoke all previous portal credentials and issue a fresh seven-day invitation. Existing sessions and pending wallet proofs become invalid.",
    archive: "The contractor leaves the active list, portal access is revoked and an audit record is kept. Invoices and payment history are preserved.",
    restore: "The contractor returns to the active list. No financial record changes.",
    delete: "The contractor profile is permanently removed, portal access is revoked and an audit record is kept. This cannot be undone.",
};

/**
 * Registers a pending operation. It performs no mutation: the contractor is
 * only resolved and its eligibility evaluated.
 */
export function prepareLifecycle(input: {
    scope: string;
    kind: LifecycleKind;
    contractorId: string;
    contractorName: string;
    eligibility: LifecycleEligibility;
    details?: Record<string, string | number | null>;
}): LifecycleOperation {
    const now = Date.now();
    prune(now);
    const operation: LifecycleOperation = {
        id: crypto.randomUUID(),
        kind: input.kind,
        scope: input.scope,
        contractorId: input.contractorId,
        contractorName: input.contractorName,
        eligible: input.eligibility.eligible,
        reason: input.eligibility.reason,
        consequence: LIFECYCLE_CONSEQUENCE[input.kind],
        details: input.details,
        secret: crypto.randomBytes(32).toString("hex"),
        expiresAt: now + TTL_MS,
        used: false,
    };
    operations.set(operation.id, operation);
    return operation;
}

// The operation as the model may see it. It never contains the secret.
export function lifecycleSummary(operation: LifecycleOperation) {
    return {
        operationId: operation.id,
        details: operation.details,
        state: "awaiting_confirmation",
        kind: operation.kind,
        contractorId: operation.contractorId,
        contractorName: operation.contractorName,
        eligible: operation.eligible,
        reason: operation.reason,
        consequence: operation.consequence,
        expiresAt: operation.expiresAt,
    };
}

// The secret for one operation, scoped to the owner session that prepared it.
// It is returned only to the server route that builds the action chip.
export function lifecycleSecret(scope: string, operationId: string): string | null {
    const operation = operations.get(operationId);
    if (!operation || operation.scope !== scope) return null;
    return operation.secret;
}

/**
 * Claims a pending operation for execution. The operation is single-use: a
 * second claim for the same operation never succeeds, so the mutation can run
 * exactly once.
 */
export function claimLifecycle(scope: string, operationId: string, secret: string): LifecycleOperation | null {
    const operation = operations.get(operationId);
    if (!operation) return null;
    if (operation.scope !== scope) return null;
    if (operation.used) return null;
    if (operation.expiresAt <= Date.now()) {
        operations.delete(operationId);
        return null;
    }
    if (!secret || secret !== operation.secret) return null;
    operation.used = true;
    return operation;
}

// Test helper: the number of operations still awaiting a confirmation.
export function pendingLifecycleCount(): number {
    return operations.size;
}
