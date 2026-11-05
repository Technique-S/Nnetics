import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {Transaction,baseEncode} from 'near-api-js';
import {account} from '../data/owner-adapter.ts';
import {OWNER_GAS} from '../data/owner-transaction.ts';
import {operationScope} from './operation-scope.ts';

export const STORAGE_ACCEPTANCE_POLICY='meteor-storage-acceptance-v1';
export const STORAGE_ACCEPTANCE_DEPOSIT='1000000000000000000';
type Environment=Record<string,string|undefined>;
export interface OwnerScope {
  id:string;planHash:string;network:'testnet';owner:string;organization:string;
  contract:string;codeHash:string;method:string;deposit:string;gas:string;args?:Record<string,unknown>;operational?:boolean;validUntil?:number;publicKey?:string;prerequisites?:string[];
  maxFee:string;reviewValidityMs:number;
  cleanupRecovery?:boolean; replaces?:string;
}
export function paymentExecutionEnabled(env:Environment=process.env) {
  return env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED==='testnet-reviewed';
}
export function ownerTransactionGate(env:Environment=process.env):{enabled:boolean;scope?:OwnerScope;reason:string} {
  if(env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED!=='testnet-reviewed')return {enabled:false,reason:'Owner transactions are disabled. No wallet request made.'};
  try {
    const file=env.NNETICS_OWNER_TRANSACTION_PLAN,expected=env.NNETICS_OWNER_TRANSACTION_PLAN_SHA256;
    if(!file||!expected||!/^[a-f0-9]{64}$/.test(expected)||fs.statSync(file).size>1048576)throw Error();
    const bytes=fs.readFileSync(file),planHash=createHash('sha256').update(bytes).digest('hex');
    if(planHash!==expected)throw Error();
    const p=JSON.parse(bytes.toString());
    if(p.version===4||p.version===5)return {enabled:true,reason:'',scope:operationScope(p,planHash,env.NNETICS_OWNER_TRANSACTION_STEP)};
    if(bytes.length>32768)throw Error();
    const action={type:'FunctionCall',method:'fund_storage',args:{},depositYoctoNEAR:STORAGE_ACCEPTANCE_DEPOSIT,gas:OWNER_GAS};
    if(p.version!==2||p.scopePolicy!==STORAGE_ACCEPTANCE_POLICY||p.network!=='testnet'||p.maximumTransactionCount!==1||p.transactions?.length!==1||!isDeepStrictEqual(p.transactions[0].actions,[action])||p.reviewValidityMs!==180000||p.feeAllowanceCeilingYoctoNEAR!=='22000000000000000000000'||p.maximumDepositPlusFeeAllowanceYoctoNEAR!=='22001000000000000000000')throw Error();
    for(const id of [p.owner,p.contract]){account(id);if(!id.endsWith('.testnet'))throw Error();}
    if(!/^[A-Za-z0-9_-]{1,64}$/.test(p.organization)||! /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.expectedCodeHash))throw Error();
    // Stable across approval-file metadata/reformatting and gate restarts.
    const id=createHash('sha256').update(JSON.stringify([STORAGE_ACCEPTANCE_POLICY,p.network,p.organization,p.owner,p.contract,action])).digest('hex');
    return {enabled:true,reason:'',scope:{id,planHash,network:'testnet',organization:p.organization,owner:p.owner,contract:p.contract,codeHash:p.expectedCodeHash,method:'fund_storage',deposit:STORAGE_ACCEPTANCE_DEPOSIT,gas:OWNER_GAS,maxFee:p.feeAllowanceCeilingYoctoNEAR,reviewValidityMs:p.reviewValidityMs}};
  }catch{return {enabled:false,reason:'Owner transactions require a valid hash-verified acceptance plan. Check owner transaction configuration.'};}
}
export function requireOwnerTransactions(env:Environment=process.env):OwnerScope {
  const gate=ownerTransactionGate(env);if(!gate.enabled||!gate.scope)throw Error(gate.reason);return gate.scope;
}
export function transactionCapabilities(env:Environment=process.env) {
  const owner=ownerTransactionGate(env);
  return {transactionsEnabled:owner.enabled,ownerTransactionsEnabled:owner.enabled,paymentExecutionEnabled:paymentExecutionEnabled(env),ownerTransactionRestriction:owner.scope?{id:owner.scope.id,planHash:owner.scope.planHash,owner:owner.scope.owner,contract:owner.scope.contract,method:owner.scope.method,args:owner.scope.args,deposit:owner.scope.deposit,gas:owner.scope.gas,operational:owner.scope.operational}:null,ownerTransactionReason:owner.reason};
}
export function assertOwnerScope(scope:OwnerScope,config:{network:string;organization:string;contract:string;codeHash:string},owner:string) {
  if(config.network!==scope.network||config.organization!==scope.organization||config.contract!==scope.contract||config.codeHash!==scope.codeHash||owner!==scope.owner)throw Error('Owner transaction is outside the reviewed acceptance scope. No wallet request allowed.');
}
export function assertOwnerScopeInput(scope:OwnerScope,input:Record<string,unknown>) {
  if(Object.keys(input).some(k=>!['action','transport','method','args','deposit','gas'].includes(k))||input.transport!=='meteor'||input.method!==scope.method||!isDeepStrictEqual(input.args,scope.args??{})||input.deposit!==scope.deposit||(input.gas!==undefined&&input.gas!==scope.gas))throw Error('Owner transaction is outside the reviewed acceptance scope. Only its exact reviewed action is allowed.');
}
export function assertScopedUnsigned(scope:OwnerScope,attempt:{unsigned?:string;hash:string;owner?:string;contract?:string;method?:string;args?:object;deposit?:string;gas?:string;publicKey?:string;nonce?:string}) {
  if(attempt.owner!==scope.owner||attempt.contract!==scope.contract||attempt.method!==scope.method||!isDeepStrictEqual(attempt.args,scope.args??{})||attempt.deposit!==scope.deposit||attempt.gas!==scope.gas||!attempt.unsigned)throw Error('Prepared transaction is outside the reviewed acceptance scope.');
  const bytes=Buffer.from(attempt.unsigned,'base64'),tx=Transaction.decode(bytes),call=tx.actions[0]?.functionCall;
  if(!Buffer.from(tx.encode()).equals(bytes)||baseEncode(createHash('sha256').update(bytes).digest())!==attempt.hash||tx.signerId!==scope.owner||tx.receiverId!==scope.contract||tx.publicKey.toString()!==attempt.publicKey||String(tx.nonce)!==attempt.nonce||tx.actions.length!==1||!call||call.methodName!==scope.method||String(call.deposit)!==scope.deposit||String(call.gas)!==scope.gas||Buffer.from(call.args).toString()!==JSON.stringify(scope.args??{}))throw Error('Prepared transaction is outside the reviewed acceptance scope.');
}
