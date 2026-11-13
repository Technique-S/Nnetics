import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../src/server/agent-runtime.ts';
import type {AgentToolExecutor} from '../src/server/agent-tools.ts';

// Controlled-adapter regression tests for the validator gap found by the real
// configured model. These are separate from the live acceptance evidence.
const cases=[
 ['create_work_order','createWorkOrder',{contractorId:'contractor-1',reference:'WO-1',title:'Article',amount:'0.003'}],
 ['list_work_orders','listWorkOrders',{contractorId:'contractor-1',status:'active'}],
 ['get_work_order','getWorkOrder',{id:'order-1'}],
 ['update_work_order','updateWorkOrder',{id:'order-1',amount:'0.004'}],
 ['cancel_work_order','cancelWorkOrder',{id:'order-1'}],
 ['review_invoice','reviewInvoice',{id:'invoice-1',decision:'approve'}],
 ['get_invoice_payment_readiness','getInvoicePaymentReadiness',{id:'invoice-1'}],
] as const;
async function invoke(name:string,args:unknown,mode:'demo'|'live'='demo'){
 const calls:string[]=[];let turn=0;
 const executor=new Proxy({},{get:(_target,method)=>async()=>{calls.push(String(method));return {success:true,data:{id:'fixture',workOrders:[],kind:'review-invoice',eligible:true}};}}) as AgentToolExecutor;
 const result=await runAgent({mode,message:'Validator regression fixture',history:[],executor,adapter:{provider:'controlled',model:'controlled',async complete(){return turn++===0?{content:null,toolCalls:[{id:'fixture-call',type:'function',function:{name,arguments:JSON.stringify(args)}}],finishReason:'tool_calls'}:{content:'Tool result reviewed.',toolCalls:[],finishReason:'stop'};}}});
 return {calls,result:result.executions[0].result};
}
for(const [name,method,args]of cases){
 test(`${name} dispatches valid catalog arguments to ${method}`,async()=>{const r=await invoke(name,args);assert.equal(r.result.success,true);assert.deepEqual(r.calls,[method]);});
 test(`${name} rejects protected extra fields before executor dispatch`,async()=>{const r=await invoke(name,{...args,recipient:'foreign.testnet'});assert.equal(r.result.success,false);assert.deepEqual(r.calls,[]);});
 test(`${name} remains unavailable to the live-mode model`,async()=>{const r=await invoke(name,args,'live');assert.equal(r.result.success,false);assert.deepEqual(r.calls,[]);});
}
for(const [name,args]of [
 ['create_work_order',{contractorId:'c',reference:'R',title:'T',amount:'0'}],
 ['create_work_order',{contractorId:'c',reference:'R',title:'T',amount:1}],
 ['update_work_order',{id:'o'}],['update_work_order',{id:'o',amount:'1e3'}],
 ['review_invoice',{id:'i',decision:'execute'}],['review_invoice',{id:'i',decision:'reject'}],
 ['review_invoice',{id:'i',decision:'clarify',note:' '}],['list_work_orders',{status:'paid'}],
 ['review_invoice',{id:'i',decision:['approve']}],['list_work_orders',{status:['active']}],
 ['get_invoice_payment_readiness',{id:''}],
] as const)test(`${name} rejects malformed arguments ${JSON.stringify(args)}`,async()=>{const r=await invoke(name,args);assert.equal(r.result.success,false);assert.deepEqual(r.calls,[]);});
