// Extension transport from @meteorwallet/sdk 1.0.24's published protocol.
// Message login never installs keys. The separate provisioning bridge below can
// submit only a server-prepared, locally checked factory transaction; no payments.
export interface MeteorExtension {
  addMessageDataListener(listener: (data: unknown) => void): void;
  sendMessageData(data: unknown): void;
}
export interface MeteorSignedMessage {
  accountId: string;
  publicKey: string;
  signature: string;
}
export interface MeteorMessage {
  accountId?: string;
  message: string;
  recipient: string;
  nonce: Uint8Array;
}
export function testnetWalletAccount(value: string): string {
  if (
    value.length > 64 ||
    !/^(?:[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*\.testnet|[0-9a-f]{64})$/.test(
      value,
    )
  )
    throw new Error("Enter a NEAR testnet account ID or implicit address.");
  return value;
}

// One dispatcher per injected object: the public interface has no remove-listener
// method. Finished requests are removed from this map, including on timeout.
const dispatchers = new WeakMap<
  MeteorExtension,
  Map<string, (data: Record<string, unknown>) => void>
>();
function dispatcher(extension: MeteorExtension) {
  let pending = dispatchers.get(extension);
  if (!pending) {
    pending = new Map();
    const listeners = pending;
    extension.addMessageDataListener((data) => {
      if (
        data &&
        typeof data === "object" &&
        "uid" in data &&
        typeof data.uid === "string"
      )
        listeners.get(data.uid)?.(data as Record<string, unknown>);
    });
    dispatchers.set(extension, pending);
  }
  return pending;
}

export function signMeteorMessage(
  extension: MeteorExtension,
  input: MeteorMessage,
  timeoutMs = 120_000,
  signal?: AbortSignal,
): Promise<MeteorSignedMessage> {
  if (signal?.aborted)
    throw new Error("Wallet account changed. Request a new login message.");
  if(input.accountId!==undefined)testnetWalletAccount(input.accountId);
  if (input.nonce.length !== 32 || !input.message || !input.recipient)
    throw new Error("Invalid wallet login challenge.");
  const pending = dispatcher(extension);
  if (pending.size)
    throw new Error("A Meteor message request is already pending.");
  const uid = crypto.randomUUID();
  // Numeric keys match Buffer's extension transport shape without a Node Buffer
  // dependency or JSON's special Buffer.toJSON representation.
  const nonce = Object.fromEntries(
    Array.from(input.nonce, (byte, i) => [i, byte]),
  );
  return new Promise((resolve, reject) => {
    let status = "initializing";
    let settled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const send = () =>
      extension.sendMessageData({
        uid,
        status,
        network: "testnet",
        actionType: "sign_message",
        endTags: [],
        ...(status === "initializing" ? { inputs: { ...input, nonce } } : {}),
      });
    const finish = (error?: Error, result?: MeteorSignedMessage) => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      clearTimeout(timeout);
      pending.delete(uid);
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve(result!);
    };
    const stop = (message: string) => {
      status = "disconnected";
      finish(new Error(message));
      try {
        send();
      } catch {
        /* Fail closed even if the extension disappeared. */
      }
    };
    const onAbort = () =>
      stop("Wallet account changed. Verify the selected account again.");
    pending.set(uid, (data) => {
      if (settled) return;
      // Response metadata is optional in the pinned extension protocol. Reject
      // conflicting metadata if supplied; account/key authority is checked by server.
      if (
        (data.network !== undefined && data.network !== "testnet") ||
        (data.actionType !== undefined && data.actionType !== "sign_message")
      ) {
        stop("Meteor returned a different network or action.");
        return;
      }
      if (data.status === "connected") status = "connected";
      else if (data.status === "attempting_reconnect") status = "initializing";
      else if (data.status === "closed_success") {
        const payload = data.payload as
          | Partial<MeteorSignedMessage>
          | undefined;
        if (
          !payload ||
          typeof payload.accountId!=="string" ||
          (input.accountId!==undefined && payload.accountId !== input.accountId) ||
          typeof payload.publicKey !== "string" ||
          !/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(payload.publicKey) ||
          typeof payload.signature !== "string" ||
          !/^[A-Za-z0-9+/]{86}==$/.test(payload.signature)
        ) {
          stop("Meteor returned an invalid or different wallet identity.");
          return;
        }
        try { testnetWalletAccount(payload.accountId); } catch {
          stop("Meteor selected an unsupported or mainnet account. Select NEAR testnet and retry."); return;
        }
        status = "closed_success";
        finish(undefined, {
          accountId: payload.accountId,
          publicKey: payload.publicKey,
          signature: payload.signature,
        });
        try {
          send();
        } catch {
          /* Server must still verify the returned signature. */
        }
      } else if (
        ["closed_fail", "closed_window", "disconnected"].includes(
          String(data.status),
        )
      ) {
        stop(
          "Meteor login was declined or disconnected. No session was granted.",
        );
      }
    });
    timeout = setTimeout(
      () => stop("Meteor login timed out. Request a new challenge."),
      timeoutMs,
    );
    interval = setInterval(() => {
      try {
        send();
      } catch {
        stop("Meteor extension is unavailable.");
      }
    }, 450);
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      send();
    } catch {
      stop("Meteor extension is unavailable.");
    }
  });
}

export function meteorExtension(): MeteorExtension {
  const extension = (window as Window & { meteorCom?: MeteorExtension })
    .meteorCom;
  if (
    !extension ||
    typeof extension.addMessageDataListener !== "function" ||
    typeof extension.sendMessageData !== "function"
  )
    throw new Error(
      "Meteor extension is unavailable in this browser. Enable it for this site and reload.",
    );
  return extension;
}

// Local initialization only. The published extension interface has no separate
// account-connection handshake that avoids its key-installing login action.
// Register the message dispatcher now; sign_message requires a later user action.
export function initializeMeteorExtension(): MeteorExtension {
  const extension = meteorExtension();
  dispatcher(extension);
  return extension;
}

// The pinned SDK encodes one unsigned Borsh transaction as base64 for action `sign`.
// Outcome payloads are hints only; the server reconciles its pre-recorded hash.
export function requestMeteorVaultCreation(
  extension: MeteorExtension,
  unsigned: string,
  timeoutMs = 120000,
): Promise<void> {
  if (
    !unsigned ||
    unsigned.length > 20000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(unsigned)
  )
    throw Error("Invalid prepared vault transaction.");
  const pending = dispatcher(extension);
  if (pending.size) throw Error("Finish the pending Meteor request first.");
  const uid = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    let status = "initializing",
      done = false;
    const send = () =>
      extension.sendMessageData({
        uid,
        status,
        network: "testnet",
        actionType: "sign",
        endTags: [],
        ...(status === "initializing"
          ? { inputs: { transactions: unsigned } }
          : {}),
      });
    const finish = (error?: string) => {
      if (done) return;
      done = true;
      clearInterval(interval);
      clearTimeout(timeout);
      pending.delete(uid);
      status = error ? "disconnected" : "closed_success";
      try {
        send();
      } catch {
        /* The durable server hash remains authoritative. */
      }
      if (error) reject(Error(error));
      else resolve();
    };
    pending.set(uid, (data) => {
      if (
        (data.network !== undefined && data.network !== "testnet") ||
        (data.actionType !== undefined && data.actionType !== "sign")
      )
        return finish(
          "Unexpected wallet response. Reconcile the recorded hash before retrying.",
        );
      if (data.status === "connected") status = "connected";
      else if (data.status === "attempting_reconnect") status = "initializing";
      else if (data.status === "closed_success") finish();
      else if (
        ["closed_fail", "closed_window", "disconnected"].includes(
          String(data.status),
        )
      )
        finish(
          "Wallet request cancelled, failed or disconnected. Its broadcast outcome is unknown; resume and reconcile the recorded hash.",
        );
    });
    const interval = setInterval(() => {
      try {
        send();
      } catch {
        finish("Meteor disconnected. Resume and reconcile the recorded hash.");
      }
    }, 450);
    const timeout = setTimeout(
      () =>
        finish(
          "Wallet request timed out. Resume and reconcile the recorded hash.",
        ),
      timeoutMs,
    );
    try {
      send();
    } catch {
      finish(
        "Meteor is unavailable. Resume the recorded provisioning request.",
      );
    }
  });
}
