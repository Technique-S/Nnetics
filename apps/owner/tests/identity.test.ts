import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KeyPair, KeyPairSigner } from "near-api-js";
import { IdentityAuth, IdentityVerificationUnavailable, IDENTITY_SESSION_MS } from "../src/server/identity.ts";
import { OrganizationIdentityAuth } from "../src/server/service.ts";
import { Queue } from "../src/server/queue.ts";
import { NearRpc } from "../src/server/chain.ts";
import { liveConfig } from "../src/server/config.ts";
import { withRpcScope } from "../src/server/rpc-request.ts";

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-identity-"));
  const auth = new IdentityAuth({
    network: "testnet",
    rpc: "https://test.rpc.fastnear.com",
    origin: "http://127.0.0.1:3100",
    database: path.join(directory, "identities.db"),
  });
  const keys = new Map<string, ReturnType<typeof KeyPair.fromRandom>>();
  let permission: unknown = "FullAccess",
    network = "testnet";
  auth.rpc = async <T>(method: string, params: unknown) => {
    if (method === "status") return { chain_id: network } as T;
    if (method === "block") return { header: { hash: "final-block" } } as T;
    const p = params as {
      account_id: string;
      public_key: string;
      block_id: string;
    };
    assert.equal(p.block_id, "final-block");
    if (keys.get(p.account_id)?.getPublicKey().toString() !== p.public_key)
      throw Error("Account key missing on testnet");
    return { permission, block_hash: "final-block" } as T;
  };
  function signed(account = "new.testnet", browser = auth.browser("").cookie) {
    let key = keys.get(account);
    if (!key) {
      key = KeyPair.fromRandom("ed25519");
      keys.set(account, key);
    }
    const challenge = auth.challenge(account, browser);
    return {
      browser,
      challenge,
      input: async () => {
        const signature = await new KeyPairSigner(key!).signNep413Message(
          account,
          { ...challenge, nonce: Buffer.from(challenge.nonce, "base64") },
        );
        return {
          accountId: account,
          nonce: challenge.nonce,
          publicKey: key!.getPublicKey().toString(),
          signature: Buffer.from(signature.signature).toString("base64"),
        };
      },
    };
  }
  async function login(account = "new.testnet", browser?: string) {
    const request = signed(account, browser);
    return {
      ...request,
      token: await auth.login(await request.input(), request.browser),
    };
  }
  return {
    auth,
    keys,
    signed,
    login,
    setPermission: (value: unknown) => {
      permission = value;
    },
    setNetwork: (value: string) => {
      network = value;
    },
    close: () => {
      auth.db.close();
      fs.rmSync(directory, { recursive: true, force: true });
    },
    directory,
  };
}
test('real transport classification preserves a valid session on provider denial and cancellation',async()=>{
  const f=fixture(),original=globalThis.fetch;
  try {
    const session=await f.login('transport.testnet');
    f.auth.rpc=IdentityAuth.prototype.rpc;
    globalThis.fetch=async()=>new Response('',{status:403});
    await assert.rejects(withRpcScope(new AbortController().signal,15000,()=>f.auth.authenticate(session.token)),IdentityVerificationUnavailable);
    assert.equal(f.auth.verify(session.token).account_id,'transport.testnet');
    const cancelled=new AbortController();cancelled.abort();
    await assert.rejects(withRpcScope(cancelled.signal,15000,()=>f.auth.authenticate(session.token)),IdentityVerificationUnavailable);
    assert.equal(f.auth.verify(session.token).account_id,'transport.testnet');
    const disconnected=new AbortController();disconnected.abort(new Error('The client disconnected'));
    await assert.rejects(withRpcScope(disconnected.signal,15000,()=>f.auth.authenticate(session.token)),IdentityVerificationUnavailable);
    assert.equal(f.auth.verify(session.token).account_id,'transport.testnet');
  }finally{globalThis.fetch=original;f.close();}
});
test("unseen wallets authenticate without any org or vault and create only their own empty organization", async () => {
  const f = fixture();
  try {
    const a = await f.login("first.testnet"),
      b = await f.login("second.testnet");
    const first = await f.auth.authenticate(a.token),
      second = await f.auth.authenticate(b.token);
    assert.deepEqual(f.auth.organizations(first), []);
    assert.deepEqual(f.auth.organizations(second), []);
    const org = await f.auth.createOrganization(a.token, "First studio");
    assert.equal(org.role, "creator");
    assert.equal(org.status, "unprovisioned");
    assert.deepEqual(f.auth.organization(first, org.id).invoices, []);
    assert.deepEqual(f.auth.organization(first, org.id).contractors, []);
    assert.deepEqual(f.auth.organization(first, org.id).payments, []);
    assert.throws(() => f.auth.organization(second, org.id), /access denied/);
    const other = await f.auth.createOrganization(b.token, "Second studio");
    assert.deepEqual(
      f.auth.organizations(first).map((o) => o.id),
      [org.id],
    );
    assert.deepEqual(
      f.auth.organizations(second).map((o) => o.id),
      [other.id],
    );
    const returned = await f.login("first.testnet");
    assert.deepEqual(
      f.auth
        .organizations(await f.auth.authenticate(returned.token))
        .map((o) => o.id),
      [org.id],
    );
    assert.throws(() => f.auth.organization(first, other.id), /access denied/);
  } finally {
    f.close();
  }
});
test("identity rejects replay, expiry, wrong browser/origin/network and restricted or removed signing keys", async () => {
  const f = fixture();
  try {
    const request = f.signed(),
      input = await request.input();
    await assert.rejects(
      () => f.auth.login(input, f.auth.browser("").cookie),
      /Expired|mismatched/,
    );
    const token = await f.auth.login(input, request.browser);
    await assert.rejects(
      () => f.auth.login(input, request.browser),
      /Expired|replayed/,
    );
    const originRequest = f.signed("origin.testnet");
    const originInput = await originRequest.input();
    f.auth.config.origin = "http://other.example";
    await assert.rejects(
      () => f.auth.login(originInput, originRequest.browser),
      /Expired|mismatched/,
    );
    assert.throws(() => f.auth.verify(token), /verification required/);
    f.auth.config.origin = "http://127.0.0.1:3100";
    f.setPermission({ FunctionCall: {} });
    await assert.rejects(() => f.auth.authenticate(token), /restricted/);
    f.setPermission("FullAccess");
    assert.throws(() => f.auth.verify(token), /verification required/);
    const removed = await f.login("removed.testnet");
    const removedKey = f.keys.get("removed.testnet")!;
    f.keys.delete("removed.testnet");
    await assert.rejects(
      () => f.auth.authenticate(removed.token),
      /key missing/,
    );
    f.keys.set("removed.testnet", removedKey);
    assert.throws(() => f.auth.verify(removed.token), /verification required/);
    const session = await f.login("expired-session.testnet");
    f.auth.db.prepare("UPDATE identity_sessions SET expires=0").run();
    assert.throws(() => f.auth.verify(session.token), /verification required/);
    const expired = f.signed();
    f.auth.db
      .prepare("UPDATE identity_challenges SET expires=0 WHERE nonce=?")
      .run(expired.challenge.nonce);
    const expiredInput = await expired.input();
    await assert.rejects(
      () => f.auth.login(expiredInput, expired.browser),
      /Expired|replayed/,
    );
    const wrong = f.signed();
    const wrongInput = await wrong.input();
    wrongInput.signature = Buffer.alloc(64).toString("base64");
    await assert.rejects(
      () => f.auth.login(wrongInput, wrong.browser),
      /Invalid wallet signature/,
    );
    f.setNetwork("mainnet");
    const network = f.signed();
    const networkInput = await network.input();
    await assert.rejects(
      () => f.auth.login(networkInput, network.browser),
      /Wrong RPC network/,
    );
  } finally {
    f.close();
  }
});
test("starting a switch revokes the old session even if the new login fails; stale asynchronous proofs cannot revive it", async () => {
  const f = fixture();
  try {
    const a = await f.login("first.testnet"),
      pending = f.signed("second.testnet", a.browser);
    assert.throws(() => f.auth.verify(a.token), /verification required/);
    const input = await pending.input();
    const original = f.auth.keyBlock.bind(f.auth);
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    f.auth.keyBlock = async (who) => {
      await original(who);
      await wait;
      return "final-block";
    };
    const old = f.auth.login(input, a.browser);
    f.auth.logout(a.browser);
    release();
    await assert.rejects(() => old, /superseded|replayed/);
    f.auth.keyBlock = original;
    const b = await f.login("second.testnet", a.browser);
    assert.equal(
      (await f.auth.authenticate(b.token)).account_id,
      "second.testnet",
    );
    assert.throws(() => f.auth.verify(a.token), /verification required/);
    f.auth.logout(a.browser);
    assert.throws(() => f.auth.verify(b.token), /verification required/);
  } finally {
    f.close();
  }
});
test("global wallet identity never bypasses the existing vault owner/viewer boundary or adopts a legacy org session", async () => {
  const f = fixture();
  const queue = new Queue(
    path.join(f.directory, "vault.db"),
    "testnet:vault:code",
  );
  const chain = new NearRpc({
    ...liveConfig(),
    organization: "studio",
    contract: "vault.owner.testnet" as ReturnType<
      typeof liveConfig
    >["contract"],
    worker: "worker.owner.testnet" as ReturnType<typeof liveConfig>["worker"],
  });
  let owner = "owner.testnet";
  chain.finalized = async () => ({
    hash: "final-block",
    timestamp: "1" as Awaited<ReturnType<NearRpc["finalized"]>>["timestamp"],
    protocolVersion: 88,
  });
  chain.rpc = f.auth.rpc.bind(f.auth);
  chain.view = async <T>() => ({ owner }) as T;
  const guard = new OrganizationIdentityAuth(queue, chain, f.auth);
  try {
    const a = await f.login(owner),
      b = await f.login("new.testnet");
    await assert.rejects(() => guard.authorize(b.token), /access denied/);
    assert.equal(
      (await guard.authorize(a.token, "owner")).access.role,
      "owner",
    );
    await guard.setViewer(a.token, "new.testnet", true);
    assert.equal((await guard.authorize(b.token)).access.role, "viewer");
    await assert.rejects(
      () => guard.authorize(b.token, "owner"),
      /access denied/,
    );
    owner = "changed.testnet";
    await assert.rejects(() => guard.authorize(a.token), /access denied/);
    await assert.rejects(() => guard.authorize(b.token), /access denied/);
    assert.equal(f.auth.verify(a.token).account_id, "owner.testnet");
    assert.throws(() => guard.verify("a".repeat(64)), /verification required/);
  } finally {
    queue.close();
    f.close();
  }
});

test("RPC outage suspends verification without revoking or extending an existing session", async () => {
 const f=fixture();try {
  const session=await f.login();const row=f.auth.db.prepare('SELECT expires FROM identity_sessions').get() as {expires:number};
  assert.ok(row.expires<=Date.now()+IDENTITY_SESSION_MS);assert.ok(row.expires>Date.now()+IDENTITY_SESSION_MS-10000);
  const original=f.auth.keyBlock.bind(f.auth);f.auth.keyBlock=async()=>{throw new IdentityVerificationUnavailable('RPC 429')};
  await assert.rejects(()=>f.auth.authenticate(session.token),/RPC 429/);
  assert.equal(f.auth.verify(session.token).account_id,'new.testnet');
  assert.equal((f.auth.db.prepare('SELECT expires FROM identity_sessions').get() as {expires:number}).expires,row.expires);
  f.auth.keyBlock=original;assert.equal((await f.auth.authenticate(session.token)).account_id,'new.testnet');
  f.keys.delete('new.testnet');await assert.rejects(()=>f.auth.authenticate(session.token),/missing/);assert.throws(()=>f.auth.verify(session.token),/verification required/);
 }finally{f.close();}
});
test("a declared verification outage leaves a signed challenge unused for bounded same-proof recovery",async()=>{
 const f=fixture();try{const request=f.signed(),input=await request.input(),original=f.auth.keyBlock.bind(f.auth);
 f.auth.keyBlock=async()=>{throw new IdentityVerificationUnavailable('RPC unavailable')};await assert.rejects(()=>f.auth.login(input,request.browser),/unavailable/);
 f.auth.keyBlock=original;const token=await f.auth.login(input,request.browser);assert.equal((await f.auth.authenticate(token)).account_id,'new.testnet');await assert.rejects(()=>f.auth.login(input,request.browser),/replayed/);
 }finally{f.close();}
});

async function resumeProof(f:ReturnType<typeof fixture>,token:string,browser:string,account:string) {
 const challenge=f.auth.resumeChallenge(token,browser),key=f.keys.get(account)!;
 const signed=await new KeyPairSigner(key).signNep413Message(account,{...challenge,nonce:Buffer.from(challenge.nonce,'base64')});
 return {accountId:account,nonce:challenge.nonce,publicKey:key.getPublicKey().toString(),signature:Buffer.from(signed.signature).toString('base64')};
}
test('optional selected-wallet proof preserves the deadline; a changed account revokes access without transferring permissions',async()=>{
 const f=fixture();try {
  const first=await f.login('first.testnet');f.keys.set('second.testnet',KeyPair.fromRandom('ed25519'));
  const info=f.auth.sessionInfo(first.token),generation=(f.auth.db.prepare('SELECT generation FROM identity_browsers WHERE id=?').get(f.auth.hash(first.browser)) as {generation:number}).generation;
  const proof=await resumeProof(f,first.token,first.browser,'first.testnet');
  const resumed=await f.auth.login(proof,first.browser,first.token);assert.equal(resumed,first.token);assert.equal(f.auth.sessionInfo(resumed).absoluteExpires,info.absoluteExpires);
  assert.equal((f.auth.db.prepare('SELECT generation FROM identity_browsers WHERE id=?').get(f.auth.hash(first.browser)) as {generation:number}).generation,generation);
  await assert.rejects(()=>f.auth.login(proof,first.browser,first.token),/Expired|replayed/);
  const changed=await resumeProof(f,resumed,first.browser,'second.testnet'),fresh=await f.auth.login(changed,first.browser,resumed);
  assert.equal(fresh,'');assert.throws(()=>f.auth.verify(resumed),/verification required/);assert.equal((f.auth.db.prepare('SELECT count(*) n FROM identity_sessions').get() as {n:number}).n,0);const next=await f.login('second.testnet',first.browser);assert.equal((await f.auth.authenticate(next.token)).account_id,'second.testnet');assert.deepEqual(f.auth.organizations(f.auth.verify(next.token)),[]);
 }finally{f.close();}
});
test('resume proof rejects another session, browser, tampering and logout during verification',async()=>{
 const f=fixture();try {
  const a=await f.login(),b=await f.login('other.testnet');const proof=await resumeProof(f,a.token,a.browser,'new.testnet');
  await assert.rejects(()=>f.auth.login(proof,a.browser,b.token),/session/);await assert.rejects(()=>f.auth.login(proof,b.browser,a.token),/Expired|mismatched/);
  await assert.rejects(()=>f.auth.login({...proof,signature:Buffer.alloc(64).toString('base64')},a.browser,a.token),/Invalid wallet signature/);
  const original=f.auth.keyBlock.bind(f.auth);let release!:()=>void;const held=new Promise<void>(r=>{release=r});f.auth.keyBlock=async who=>{await original(who);await held;return 'final-block'};
  const pending=f.auth.login(proof,a.browser,a.token);f.auth.logout(a.browser);release();await assert.rejects(()=>pending,/superseded|expired|verification required/);assert.throws(()=>f.auth.verify(a.token),/verification required/);
 }finally{f.close();}
});
test('five-hour lifetime survives the former failure interval; activity, outages and background reads cannot extend or revive it',async()=>{
 const f=fixture();let now=100000000;f.auth.now=()=>now;
 try {
  const session=await f.login();const original=f.auth.sessionInfo(session.token);assert.equal(original.idleExpires,now+5*3600000);assert.equal(original.absoluteExpires,now+5*3600000);
  now+=16*60000;await f.auth.authenticate(session.token);assert.equal(f.auth.sessionInfo(session.token).idleExpires,original.idleExpires); // former 15-minute interval
  now=original.idleExpires-2000;const extended=await f.auth.renew(session.token,session.browser);assert.equal(extended.idleExpires,original.absoluteExpires);assert.equal(extended.absoluteExpires,original.absoluteExpires);
  const keyBlock=f.auth.keyBlock.bind(f.auth);f.auth.keyBlock=async()=>{throw new IdentityVerificationUnavailable('RPC unavailable')};now+=1000;await assert.rejects(()=>f.auth.renew(session.token,session.browser),/unavailable/);assert.equal(f.auth.sessionInfo(session.token).idleExpires,extended.idleExpires);f.auth.keyBlock=keyBlock;
  now=extended.idleExpires;assert.throws(()=>f.auth.verify(session.token),/verification required/);await assert.rejects(()=>f.auth.renew(session.token,session.browser),/verification required/);
  const active=await f.login();const deadline=f.auth.sessionInfo(active.token).absoluteExpires;
  while(now+29*60000<deadline){now+=29*60000;await f.auth.renew(active.token,active.browser);}
  now=deadline-1;assert.equal((await f.auth.renew(active.token,active.browser)).idleExpires,deadline);
  now=deadline;assert.throws(()=>f.auth.verify(active.token),/verification required/);
 }finally{f.close();}
});

test('selected-wallet discovery authenticates a real on-chain key without an account-name input or organization grant',async()=>{
 const f=fixture();try{
  const browser=f.auth.browser('').cookie,key=KeyPair.fromRandom('ed25519'),account='discovered.testnet';f.keys.set(account,key);
  const challenge=f.auth.discoveryChallenge(browser),signed=await new KeyPairSigner(key).signNep413Message(account,{...challenge,nonce:Buffer.from(challenge.nonce,'base64')});
  const proof={accountId:account,nonce:challenge.nonce,publicKey:key.getPublicKey().toString(),signature:Buffer.from(signed.signature).toString('base64')};
  await assert.rejects(()=>f.auth.login({...proof,accountId:'other.testnet'},browser),/key missing/);
  await assert.rejects(()=>f.auth.login(proof,browser,'wrong-endpoint'),/purpose/);
  const token=await f.auth.login(proof,browser);assert.equal((await f.auth.authenticate(token)).account_id,account);assert.deepEqual(f.auth.organizations(f.auth.verify(token)),[]);assert.equal(f.auth.sessionInfo(token).absoluteExpires-f.auth.now()>5*3600000-10000,true);
  await assert.rejects(()=>f.auth.login(proof,browser),/Expired|replayed/);
 }finally{f.close();}
});


test('incomplete or inconsistent RPC evidence blocks access without deleting a valid session',async()=>{
 const f=fixture();try{const session=await f.login(),original=f.auth.rpc.bind(f.auth);
 for(const mode of ['status','block','key']){f.auth.rpc=async <T>(method:string,params:unknown)=>{if((mode==='status'&&method==='status')||(mode==='block'&&method==='block'))return {} as T;if(mode==='key'&&method==='query')return {block_hash:'different-block',permission:'FullAccess'} as T;return original<T>(method,params);};await assert.rejects(()=>f.auth.authenticate(session.token),IdentityVerificationUnavailable);assert.equal(f.auth.verify(session.token).account_id,'new.testnet');}
 f.auth.rpc=original;assert.equal((await f.auth.authenticate(session.token)).account_id,'new.testnet');
 }finally{f.close();}
});

test('reopening the identity store preserves the signed session, organization and original five-hour deadline',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-identity-restart-'));
 const config={network:'testnet' as const,rpc:'https://test.rpc.fastnear.com',origin:'https://restart.example',database:path.join(directory,'identity.db')};
 let auth=new IdentityAuth(config);const key=KeyPair.fromRandom('ed25519'),account='restart.testnet';
 const attach=()=>{auth.keyBlock=async who=>{assert.equal(who.account_id,account);assert.equal(who.public_key,key.getPublicKey().toString());return 'fixture-final-block';};};attach();
 try{
  const browser=auth.browser('').cookie,c=auth.challenge(account,browser),proof=await new KeyPairSigner(key).signNep413Message(account,{...c,nonce:Buffer.from(c.nonce,'base64')});
  const token=await auth.login({accountId:account,nonce:c.nonce,publicKey:key.getPublicKey().toString(),signature:Buffer.from(proof.signature).toString('base64')},browser),before=auth.sessionInfo(token),org=await auth.createOrganization(token,'Restart fixture');
  auth.db.close();auth=new IdentityAuth(config);attach();
  assert.equal((await auth.authenticate(token)).account_id,account);assert.equal(auth.sessionInfo(token).absoluteExpires,before.absoluteExpires);assert.equal(auth.sessionInfo(token).idleExpires,before.idleExpires);assert.equal(auth.organizations(auth.verify(token))[0].id,org.id);
  auth.logout(browser);assert.throws(()=>auth.verify(token),/verification required/);
 }finally{auth.db.close();fs.rmSync(directory,{recursive:true,force:true});}
});
