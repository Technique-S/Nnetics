import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server.js";
import type { AgentModelRequest, AgentModelResponse } from "../src/server/agent-model.ts";
const temp = fs.mkdtempSync(path.join(os.tmpdir(),"nnetics-v31-"));
process.env.NNETICS_DEMO_WORKSPACE_DB = path.join(temp,"workspace.db");
process.env.NNETICS_DEMO_PORTAL_DB = path.join(temp,"portal.db");
process.env.NNETICS_AGENT_TRACE = "0";
const { POST } = await import("../src/app/api/agent/route.ts");
const { POST: portalPOST } = await import("../src/app/api/demo/contractors/[...path]/route.ts");
const { demoWorkspace } = await import("../src/server/demo-workspace.ts");
const { demoContractors, DemoContractorStore } = await import("../src/server/demo-contractors.ts");
const { setAgentModelAdapterForTests, AgentModelError } = await import("../src/server/agent-model.ts");
const origin = "http://127.0.0.1:3100";
function session() {
  const workspace = demoWorkspace().start("");
  demoWorkspace().createWorkspace(workspace.token,{profileName:"Owner",vaultName:"Demo"});
  const owner = demoContractors().ownerStart("");
  return {owner,cookie:`nnetics_demo_workspace=${workspace.token}; nnetics_demo_portal_owner=${owner}`};
}
function request(url:string,body:unknown,cookie:string) {return new NextRequest(origin+url,{method:"POST",headers:{origin,"content-type":"application/json",cookie},body:JSON.stringify(body)});}
async function run(s:ReturnType<typeof session>, message:string, calls:Array<{name:string;args:Record<string,unknown>}>, inspect?:(request:AgentModelRequest)=>void,key=crypto.randomUUID()) {
  let step=0;
  setAgentModelAdapterForTests({provider:"controlled",model:"lifecycle-test",async complete(req):Promise<AgentModelResponse> {
    inspect?.(req);
    const call=calls[step++];
    return call ? {content:null,toolCalls:[{id:`call-${step}`,type:"function",function:{name:call.name,arguments:JSON.stringify(call.args)}}]} : {content:"Verified tool results.",toolCalls:[]};
  }});
  const response=await POST(request("/api/agent",{message,idempotencyKey:key},s.cookie));
  return {response,body:await response.json()};
}
test("A: actual agent updates allowed fields, keeps ID, reads wallet and rejects protected/cross-org edits",async()=>{
  const s=session(),store=demoContractors();
  const id=store.ownerCommand(s.owner,{action:"create-profile",name:"Marcus Johnson"}).profileId!;
  const result=await run(s,"Rename Marcus Johnson to Marcus Williams.",[{name:"get_contractor",args:{name:"Marcus Johnson"}},{name:"update_contractor",args:{id,name:"Marcus Williams",email:"marcus@example.com",company:"Studio"}},{name:"get_contractor_wallet_status",args:{id}}]);
  assert.equal(result.response.status,200);
  const p=store.ownerSnapshot(s.owner).profiles[0];
  assert.equal(p.id,id);assert.equal(p.name,"Marcus Williams");assert.equal(p.email,"marcus@example.com");
  assert.equal(result.body.executions[2].result.data.status,"not_configured");
  const reopened=new DemoContractorStore(process.env.NNETICS_DEMO_PORTAL_DB!);
  assert.equal(reopened.ownerSnapshot(s.owner).profiles[0].name,p.name);reopened.db.close();
  for (const args of [{id,wallet:"attacker.testnet"},{id,email:"invalid"}]) {
    const result=await run(s,"edit",[{name:"update_contractor",args}]);assert.equal(result.body.executions[0].result.success,false);
  }
  const foreign=await run(session(),"edit",[{name:"update_contractor",args:{id,name:"Other"}}]);
  assert.equal(foreign.body.executions[0].result.success,false);
  assert.equal(store.ownerSnapshot(s.owner).profiles[0].wallet,null);
});

async function decide(s:ReturnType<typeof session>,chip:any,cancel=false) {
  return portalPOST(request(`/api/demo/contractors/owner/${cancel ? "cancel" : "confirm"}-lifecycle`,chip.action,s.cookie),{params:Promise.resolve({path:["owner",`${cancel ? "cancel" : "confirm"}-lifecycle`]})});
}
function confirmation(body:any) { return body.actions.find((chip:any)=>chip.action.kind==="confirm-contractor-lifecycle"); }
test("B: delete cancellation, exact single-use confirmation, archive/restore and linked financial retention",async()=>{
  const s=session(),store=demoContractors();
  const id=store.ownerCommand(s.owner,{action:"create-profile",name:"Tia"}).profileId!;
  const prepare=()=>run(s,"Delete Tia.",[{name:"prepare_delete_contractor",args:{id}}]);
  let prepared=await prepare();assert.ok(confirmation(prepared.body));
  assert.equal((await decide(s,confirmation(prepared.body),true)).status,200);
  assert.equal((await decide(s,confirmation(prepared.body))).status,400);
  assert.equal(store.ownerSnapshot(s.owner).profiles.length,1);
  prepared=await prepare();
  assert.equal((await decide(session(),confirmation(prepared.body))).status,400);
  assert.equal((await decide(s,confirmation(prepared.body))).status,200);
  assert.equal((await decide(s,confirmation(prepared.body))).status,400);
  assert.equal(store.ownerSnapshot(s.owner).profiles.length,0);
  assert.ok(store.ownerSnapshot(s.owner).events!.some(e=>e.action==="deleted"));
  const marcus=store.ownerCommand(s.owner,{action:"create-profile",name:"Marcus"}).profileId!;
  const link=store.ownerCommand(s.owner,{action:"issue-link",profileId:marcus}).token!;
  const contractor=store.enter(link);
  const bill=store.command(contractor,{action:"submit-invoice",submissionId:crypto.randomUUID(),fields:{orderId:"",amount:"1",asset:"NEAR"},text:"Writing delivered for 1 NEAR",description:"Writing"}).invoice!;
  store.db.prepare("UPDATE demo_bills SET payload=? WHERE id=?").run(JSON.stringify({...bill,status:"Paid"}),bill.id);
  const blocked=await run(s,"Delete Marcus.",[{name:"prepare_delete_contractor",args:{id:marcus}}]);
  assert.equal(blocked.body.executions[0].result.success,false);assert.match(blocked.body.executions[0].result.error,/archive/i);
  for(const name of ["archive_contractor","restore_contractor"]) {
    const prepared=await run(s,name,[{name,args:{id:marcus}}]);
    assert.equal((await decide(s,confirmation(prepared.body))).status,200);
  }
  const profile=store.ownerSnapshot(s.owner).profiles[0];
  assert.equal(profile.archived,false);assert.equal(profile.linkActive,false);
  assert.throws(()=>store.enter(link),/revoked|expired/);
  assert.equal(store.ownerSnapshot(s.owner).invoices[0].status,"Paid");
});

test("C: portal invitation stays out of provider history; authenticated reveal, confirmed revoke/reissue",async()=>{
  const s=session(),store=demoContractors();
  const id=store.ownerCommand(s.owner,{action:"create-profile",name:"Sarah"}).profileId!;
  const providerRequests:string[]=[];
  const issued=await run(s,"Generate a contractor portal link for Sarah.",[{name:"create_contractor_portal_invitation",args:{id}}],req=>providerRequests.push(JSON.stringify(req)));
  const delivery=issued.body.actions.find((chip:any)=>chip.action.kind==="reveal-contractor-invitation");assert.ok(delivery);
  const reveal=(who=s)=>portalPOST(request("/api/demo/contractors/owner/reveal-invitation",{reference:delivery.action.reference},who.cookie),{params:Promise.resolve({path:["owner","reveal-invitation"]})});
  assert.equal((await reveal(session())).status,400);
  const response=await reveal();assert.equal(response.status,200);
  const data=await response.json();const token=data.path.split("#")[1];assert.match(token,/^[a-f0-9]{64}$/);
  assert.ok(providerRequests.every(text=>!text.includes(token)));assert.ok(!JSON.stringify(issued.body).includes(token));
  const contractor=store.enter(token);
  const prepared=await run(s,"Revoke Sarah's portal link.",[{name:"revoke_contractor_portal_invitation",args:{id}}]);
  assert.doesNotThrow(()=>store.snapshot(contractor));
  assert.equal((await decide(s,confirmation(prepared.body))).status,200);
  assert.throws(()=>store.snapshot(contractor),/revoked/);assert.equal((await reveal()).status,400);
  const replacement=await run(s,"Generate Sarah's invitation.",[{name:"create_contractor_portal_invitation",args:{id}}]);
  assert.ok(confirmation(replacement.body));assert.equal(store.ownerSnapshot(s.owner).profiles[0].linkActive,false);
  const replaced=await decide(s,confirmation(replacement.body));assert.equal(replaced.status,200);assert.ok((await replaced.json()).invitation.invitationReference);
  store.db.prepare("UPDATE demo_links SET expires=? WHERE profile=?").run(Date.now()-1,id);
  assert.equal(store.portalStatus(s.owner,id).status,"expired");
});

function walletRequest(s:ReturnType<typeof session>,id:string,account:string) {
  const store=demoContractors();
  const token=store.ownerCommand(s.owner,{action:"issue-link",profileId:id}).token!;
  const contractor=store.enter(token);
  const challenge=store.command(contractor,{action:"wallet-challenge",account}).challenge!;
  store.command(contractor,{action:"wallet-proof",challenge});
  return store.ownerSnapshot(s.owner).profiles.find(p=>p.id===id)!.pendingWallet!;
}
test("D: wallet decisions require exact explicit confirmation, reject with reason, keep audit and resist stale requests",async()=>{
  const s=session(),store=demoContractors();
  const id=store.ownerCommand(s.owner,{action:"create-profile",name:"Marcus"}).profileId!;
  let pending=walletRequest(s,id,"marcus.testnet");
  const prepare=(decision:string,requestId=pending.id,reason?:string)=>run(s,`${decision} Marcus's pending wallet change.`,[{name:"list_pending_wallet_changes",args:{}},{name:"get_wallet_change_request",args:{id,requestId}},{name:"prepare_wallet_change_decision",args:{id,requestId,decision,...(reason ? {reason} : {})}}]);
  const proposed=await prepare("approve");
  const card=confirmation(proposed.body);assert.equal(card.action.details.newWallet,"marcus.testnet");assert.equal(card.action.details.oldWallet,null);
  assert.equal(store.ownerSnapshot(s.owner).profiles[0].wallet,null);
  assert.equal((await decide(s,card)).status,200);
  assert.equal((await decide(s,card)).status,400);
  assert.equal(store.ownerSnapshot(s.owner).profiles[0].wallet,"marcus.testnet");
  pending=walletRequest(s,id,"new-marcus.testnet");
  const noReason=await prepare("reject");assert.equal(noReason.body.executions[2].result.success,false);
  const rejection=await prepare("reject",pending.id,"Please verify the recipient with our contact first.");
  assert.equal((await decide(s,confirmation(rejection.body))).status,200);
  const status=await run(s,"wallet status",[{name:"get_contractor_wallet_status",args:{id}}]);
  const wallet=status.body.executions[0].result.data;
  assert.equal(wallet.wallet,"marcus.testnet");assert.equal(wallet.lastDecision.decision,"rejected");
  assert.match(wallet.lastDecision.reason,/verify/);
  pending=walletRequest(s,id,"third-marcus.testnet");
  const stale=await prepare("approve");
  store.ownerCommand(s.owner,{action:"revoke-link",profileId:id});
  assert.equal((await decide(s,confirmation(stale.body))).status,400);
  assert.equal(store.ownerSnapshot(s.owner).profiles[0].wallet,"marcus.testnet");
  assert.equal(store.ownerSnapshot(s.owner).events!.filter(e=>e.action.startsWith("wallet-")).length,2);
});

test("E: 25 agent-created profiles persist, bounded search distinguishes similar and duplicate names",async()=>{
  const s=session(),store=demoContractors();
  for(let i=1;i<=25;i++) {
    const created=await run(s,`Create Writer ${i}`,[{name:"create_contractor",args:{name:`Writer ${i}`}}]);
    assert.equal(created.response.status,200);
  }
  const reopened=new DemoContractorStore(process.env.NNETICS_DEMO_PORTAL_DB!);
  assert.equal(reopened.ownerSnapshot(s.owner).profiles.length,25);reopened.db.close();
  const page=await run(s,"Find Writer 2",[{name:"list_contractors",args:{query:"Writer 2",limit:3}},{name:"get_contractor",args:{name:"Writer 2"}}]);
  assert.equal(page.body.executions[0].result.data.count,7);assert.equal(page.body.executions[0].result.data.contractors.length,3);
  assert.equal(page.body.executions[1].result.data.name,"Writer 2");
  store.ownerCommand(s.owner,{action:"create-profile",name:"Writer 2"});
  const ambiguous=await run(s,"Rename Writer 2",[{name:"get_contractor",args:{name:"Writer 2"}}]);
  assert.equal(ambiguous.body.executions[0].result.code,"ambiguous_contractor");
  const foreign=await run(session(),"Search writers",[{name:"list_contractors",args:{query:"Writer"}}]);
  assert.equal(foreign.body.executions[0].result.data.count,0);
});
test("E: multi-step create/invite/wallet conversation reuses persisted ID without duplicates or token exposure",async()=>{
  const s=session(),store=demoContractors();let step=0;let id="";
  setAgentModelAdapterForTests({provider:"controlled",model:"lifecycle-test",async complete(req):Promise<AgentModelResponse>{
    const tools=req.messages.filter(m=>m.role==="tool");
    let name:string,args:Record<string,unknown>;
    if(step===0){name="create_contractor";args={name:"Tia"};}
    else if(step===1){id=JSON.parse(tools[0].content).contractor.id;name="create_contractor_portal_invitation";args={id};}
    else if(step===2){name="get_contractor_wallet_status";args={id};}
    else return {content:"Tia created; use the secure invitation control. No wallet configured.",toolCalls:[]};
    step++;return {content:null,toolCalls:[{id:`multi-${step}`,type:"function",function:{name,arguments:JSON.stringify(args)}}]};
  }});
  const key=crypto.randomUUID(),body={message:"Create Tia, generate her portal invitation, and show her wallet status.",idempotencyKey:key};
  const response=await POST(request("/api/agent",body,s.cookie));assert.equal(response.status,200);const result=await response.json();
  const replay=await POST(request("/api/agent",body,s.cookie));assert.equal(replay.status,200);
  assert.equal(store.ownerSnapshot(s.owner).profiles.length,1);assert.equal(store.ownerSnapshot(s.owner).profiles[0].id,id);
  assert.equal(result.executions[2].result.data.status,"not_configured");
  assert.ok(result.actions.some((chip:any)=>chip.action.kind==="reveal-contractor-invitation"));
});
test("E: provider failure after prepare cannot confirm; expiry and changed eligibility fail closed",async()=>{
  const s=session(),store=demoContractors();
  const id=store.ownerCommand(s.owner,{action:"create-profile",name:"Unaffected"}).profileId!;
  let step=0;
  setAgentModelAdapterForTests({provider:"controlled",model:"failure",async complete():Promise<AgentModelResponse>{
    if(step++) throw new AgentModelError("provider_unavailable","Provider unavailable",{status:503});
    return {content:null,toolCalls:[{id:"prepare",type:"function",function:{name:"prepare_delete_contractor",arguments:JSON.stringify({id})}}]};
  }});
  const response=await POST(request("/api/agent",{message:"Delete Unaffected",idempotencyKey:crypto.randomUUID()},s.cookie));
  assert.equal(response.status,503);assert.equal(store.ownerSnapshot(s.owner).profiles.length,1);
  let prepared=await run(s,"Delete Unaffected",[{name:"prepare_delete_contractor",args:{id}}]);
  const now=Date.now;Date.now=()=>now()+11*60*1000;
  try{assert.equal((await decide(s,confirmation(prepared.body))).status,400);}finally{Date.now=now;}
  prepared=await run(s,"Delete Unaffected",[{name:"prepare_delete_contractor",args:{id}}]);
  walletRequest(s,id,"retained.testnet");
  assert.equal((await decide(s,confirmation(prepared.body))).status,400);
  assert.equal(store.ownerSnapshot(s.owner).profiles.length,1);
  for(const name of ["prepare_delete_contractor","archive_contractor","restore_contractor","create_contractor_portal_invitation","revoke_contractor_portal_invitation","get_contractor_wallet_status","get_wallet_change_request"]) {
    const foreign=await run(session(),"Access another organization",[{name,args:{id}}]);
    assert.equal(foreign.body.executions[0].result.success,false,name);
  }
});
