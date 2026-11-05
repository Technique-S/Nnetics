import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
export function configureOwnerScope(directory:string) {
 const keys=['NNETICS_OWNER_TRANSACTIONS_AUTHORIZED','NNETICS_PAYMENT_EXECUTION_AUTHORIZED','NNETICS_OWNER_TRANSACTION_PLAN','NNETICS_OWNER_TRANSACTION_PLAN_SHA256','NNETICS_TRANSACTIONS_AUTHORIZED'];
 const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const file=path.join(directory,'scope.json');
 const plan={version:2,scopePolicy:'meteor-storage-acceptance-v1',note:'fixture',network:'testnet',organization:'org',owner:'owner.testnet',contract:'vault.testnet',expectedCodeHash:'1'.repeat(32),maximumTransactionCount:1,reviewValidityMs:180000,feeAllowanceCeilingYoctoNEAR:'22000000000000000000000',maximumDepositPlusFeeAllowanceYoctoNEAR:'22001000000000000000000',transactions:[{actions:[{type:'FunctionCall',method:'fund_storage',args:{},depositYoctoNEAR:'1000000000000000000',gas:'100000000000000'}]}]};
 const save=()=>{const bytes=JSON.stringify(plan);fs.writeFileSync(file,bytes);process.env.NNETICS_OWNER_TRANSACTION_PLAN_SHA256=createHash('sha256').update(bytes).digest('hex');};
 for(const key of keys)process.env[key]='';process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='testnet-reviewed';process.env.NNETICS_OWNER_TRANSACTION_PLAN=file;save();
 return {file,plan,save,close:()=>{for(const key of keys){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}}};
}
