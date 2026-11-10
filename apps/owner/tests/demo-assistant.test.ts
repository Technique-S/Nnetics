import {test} from "node:test";
import assert from "node:assert/strict";
import {scriptReply, demoAssistantReply, DemoAssistantBuckets, type DemoAssistantContext, type DemoAssistantAction, type DemoAssistantResult} from "../src/server/demo-assistant.ts";

// Narrows the expected draft action so property access is type-safe.
function draft(r: DemoAssistantResult): Extract<DemoAssistantAction, { kind: "prepare-payment-draft" }> {
    return r.actions[0] as Extract<DemoAssistantAction, { kind: "prepare-payment-draft" }>;
}

function context(over: Partial<DemoAssistantContext> = {}): DemoAssistantContext {
    return {
        profileName: "Kazi",
        available: "899000000000000000000000", // 0.899 NEAR
        pendingTotal: "101000000000000000000000", // 0.101 NEAR pending settlement
        pendingCount: 1,
        outstanding: [{contractor: "Mia", amount: "400000000000000000000000", reference: "CTR-0001-INV-0002"}], // 0.4 NEAR
        receipts: [{reference: "SIM-0001", contractor: "Mia", amount: "100000000000000000000000", summary: "Mia · 0.1 NEAR · SIM-0001 · Article · Demo receipt: simulated funds, no live transfer."}],
        contractors: ["Mia", "Noah"],
        scenario: "success",
        ...over
    };
}

test("scripted mode reads a create-contractor intent with a validated name", () => {
    const r = scriptReply("Add contractor named Elena Reyes", context());
    assert.deepEqual(r.actions, [{kind: "create-contractor", name: "Elena Reyes"}]);
    assert.equal(r.mode, "scripted");
    // Long or nonsense names never become actions.
    assert.deepEqual(scriptReply("Add contractor n " + "x".repeat(90), context()).actions, []);
});

test("scripted summarize-outstanding computes exact figures from the demo context", () => {
    const r = scriptReply("How much is outstanding?", context());
    assert.deepEqual(r.actions, [{kind: "summarize-outstanding"}]);
    assert.match(r.reply, /Kazi/);
    assert.match(r.reply, /0\.4/); // one unpaid approved bill, 0.4 NEAR
    assert.match(r.reply, /0\.101/); // pending settlement total
    assert.match(r.reply, /0\.899/); // available demo funds
    assert.match(r.reply, /simulated/i);
});

test("scripted mode prepares a payment draft for an exact known contractor", () => {
    const a = scriptReply("Pay 1.2 NEAR to Mia", context());
    assert.deepEqual(a.actions, [{kind: "prepare-payment-draft", contractor: "Mia", amount: "1.2", description: ""}]);
    const b = scriptReply("Please pay Mia 1.2 for the logo", context());
    assert.equal(b.actions[0].kind, "prepare-payment-draft");
    assert.equal(draft(b).contractor, "Mia");
    assert.equal(draft(b).amount, "1.2");
    assert.match(draft(b).description, /logo/);
    // Case-insensitive name matching.
    assert.equal(draft(scriptReply("send 0.5 to mia", context())).contractor, "Mia");
    // The scripted reply keeps approval in the review screen.
    assert.match(a.reply, /review/i);
});

test("scripted mode asks a clarifying question when a request is ambiguous", () => {
    const c = context();
    for (const message of ["Pay 1.2", "pay 1.2 NEAR", "Send something to Mia", "pay 2 to Otto"]) {
        const r = scriptReply(message, c);
        assert.deepEqual(r.actions, [], message);
        assert.match(r.reply, /Mia|contractor/i, message);
    }
    // A prefix matching several contractors is never silently resolved.
    const two = scriptReply("pay 1 to mi", context({contractors: ["Mia", "Mira"]}));
    assert.deepEqual(two.actions, []);
    assert.match(two.reply, /Mia/); assert.match(two.reply, /Mira/);
});

test("scripted find-receipt grounds the answer in the demo context", () => {
    const c = context();
    const byRef = scriptReply("Where is receipt SIM-0001?", c);
    assert.deepEqual(byRef.actions, [{kind: "find-receipt", reference: "SIM-0001", contractor: ""}]);
    assert.match(byRef.reply, /simulated funds/i);
    const unknownRef = scriptReply("Where is receipt SIM-0009?", c);
    assert.deepEqual(unknownRef.actions, [{kind: "find-receipt", reference: "SIM-0009", contractor: ""}]);
    assert.match(unknownRef.reply, /Receipts/i);
    const byName = scriptReply("Find the receipt for Noah", c);
    assert.deepEqual(byName.actions, [{kind: "find-receipt", reference: "", contractor: "Noah"}]);
    assert.match(byName.reply, /Noah/);
});

test("anything unmatched gets a labeled clarification, never an action", () => {
    const r = scriptReply("hello there", context());
    assert.deepEqual(r.actions, []);
    assert.match(r.reply, /add contractor|summarize|pay|receipt/i);
    assert.match(r.reply, /simulated/i);
});

function fakeFetch(status: number, content: string, delay = 0) {
    const calls: {url: string; headers: Record<string, string>; body: string}[] = [];
    const fn = (async (url: string | URL | Request, init?: RequestInit) => {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        const init_body = typeof init?.body === "string" ? init.body : "";
        calls.push({url: String(url), headers, body: init_body});
        if (delay) await new Promise(r => setTimeout(r, delay));
        const sized = Buffer.byteLength(content, "utf8");
        const big = new Uint8Array(Math.max(sized, 40 * 1024));
        big.set(Buffer.from(content), 0);
        let readCount = 0;
        return {
            ok: status >= 200 && status < 300, status,
            body: {
                getReader() {
                    return {
                        read: async () => (readCount++ === 0
                            ? {done: false, value: big.subarray(0, sized)}
                            : {done: true, value: undefined})
                    };
                }
            }
        };
    }) as typeof fetch;
    return {fn, calls};
}

const modelResult = {reply: "Draft ready", actions: [{kind: "prepare-payment-draft", contractor: "Mia", amount: "1.2", description: "logo"}]};

test("model path validates a strict-schema answer and never leaks the key", async () => {
    const {fn, calls} = fakeFetch(200, JSON.stringify({choices: [{finish_reason: "stop", message: {content: JSON.stringify(modelResult)}}]}));
    const r = await demoAssistantReply({
        message: "Pay 1.2 to Mia", context: context(), useModel: true,
        key: "sk-test-KEY", model: "fixture-model", request: fn
    });
    assert.equal(r.mode, "model");
    assert.deepEqual(r.actions, modelResult.actions);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].headers.Authorization, "Bearer sk-test-KEY");
    assert.match(calls[0].body, /prepare-payment-draft/);
    assert.match(calls[0].body, /Mia/);
    assert.ok(!calls[0].body.includes("sk-test-KEY"));
    assert.ok(!r.reply.includes("sk-test-KEY"));
});

test("model failures fall back to the scripted assistant without throwing", async () => {
    for (const [status, content] of [[500, "boom"], [200, "not json"], [200, JSON.stringify({choices: [{finish_reason: "length", message: {content: "{}"}}]})]] as const) {
        const {fn, calls} = fakeFetch(status, content);
        const r = await demoAssistantReply({
            message: "Pay 1.2 NEAR to Mia", context: context(), useModel: true,
            key: "k", model: "fixture-model", request: fn
        });
        assert.equal(r.mode, "scripted");
        assert.deepEqual(r.actions, [{kind: "prepare-payment-draft", contractor: "Mia", amount: "1.2", description: ""}]);
        assert.match(r.reply, /review/i);
    }
    // Model output outside the action allowlist is dropped, not executed.
    const {fn} = fakeFetch(200, JSON.stringify({choices: [{finish_reason: "stop", message: {content: JSON.stringify({
        reply: "Done", actions: [
            {kind: "prepare-payment-draft", contractor: "Ghost", amount: "1", description: null, name: null, reference: null},
            {kind: "prepare-payment-draft", contractor: "Mia", amount: "abc", description: null, name: null, reference: null},
            {kind: "drain-vault", contractor: "Mia", amount: "1000", description: null, name: null, reference: null},
            {kind: "summarize-outstanding", contractor: null, amount: null, description: null, name: null, reference: null}
        ]
    })}}]}));
    const r = await demoAssistantReply({message: "x", context: context(), useModel: true, key: "k", model: "m", request: fn});
    assert.equal(r.mode, "model");
    assert.deepEqual(r.actions, [{kind: "summarize-outstanding"}]);
});

test("model path needs configuration and respects the per-session rate limit", async () => {
    // No key or model configured: scripted answer, no fetch at all.
    const off = fakeFetch(200, "{}");
    const rOff = await demoAssistantReply({message: "hi", context: context(), useModel: true, request: off.fn});
    assert.equal(rOff.mode, "scripted");
    assert.equal(off.calls.length, 0);
    // The demo toggle stays in control.
    const offToggled = fakeFetch(200, "{}");
    assert.equal((await demoAssistantReply({message: "hi", context: context(), useModel: false, key: "k", model: "m", request: offToggled.fn})).mode, "scripted");
    assert.equal(offToggled.calls.length, 0);
    // Rate limit: bounded model calls per session; the excess uses the scripted path.
    const bucket = new DemoAssistantBuckets(2, 60_000);
    const limited = fakeFetch(200, JSON.stringify({choices: [{finish_reason: "stop", message: {content: JSON.stringify(modelResult)}}]}));
    const opts = {message: "Pay 1.2 to Mia", context: context(), useModel: true, key: "k", model: "m", request: limited.fn, bucket: bucket.scope("session-a")};
    for (let i = 0; i < 2; i++) assert.equal((await demoAssistantReply(opts)).mode, "model");
    assert.equal(limited.calls.length, 2);
    const rLimited = await demoAssistantReply(opts);
    assert.equal(rLimited.mode, "scripted");
    assert.equal(limited.calls.length, 2); // no provider call past the limit
    // A different session keeps its own allowance.
    assert.equal((await demoAssistantReply({...opts, bucket: bucket.scope("session-b")})).mode, "model");
});
