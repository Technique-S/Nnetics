import fs from 'node:fs';import {createHash} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';
import type {LiveConfig} from './config.ts';import {account,uint} from '../data/owner-adapter.ts';
export function workerScope(c:LiveConfig,env:Record<string,string|undefined>=process.env) {
 const file=env.NNETICS_PAYMENT_PLAN,expected=env.NNETICS_PAYMENT_PLAN_SHA256,job=env.NNETICS_PAYMENT_JOB_ID;
 if(!file||!expected||!/^[a-f0-9]{64}$/.test(expected)||!job||!/^[A-Za-z0-9_-]{1,64}$/.test(job)||fs.statSync(file).size>1048576)throw Error('A hash-verified single-job payment plan is required.');
 const bytes=fs.readFileSync(file);if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Payment plan changed.');const p=JSON.parse(bytes.toString()),w=p.worker,pay=p.payment;
 if(![4,5].includes(p.version)||p.status!=='ready-for-review'||p.network!=='testnet'||p.network!==c.network||p.organization!==c.organization||p.contract!==c.contract||p.expectedCodeHash!==c.codeHash||!Number.isSafeInteger(p.validUntil)||Date.now()>=p.validUntil||w?.account!==c.worker||w?.publicKey!==c.publicKey||w?.maximumTransactions!==1||w?.method!=='execute_payment'||w?.gas!=='250000000000000'||w?.deposit!=='0'||w?.maxFeeYoctoNEAR!=='55000000000000000000000'||!pay||!/^[A-Za-z0-9_-]{1,64}$/.test(pay.orderId))throw Error('Worker is outside the reviewed single-payment scope.');
 const binding=p.version===5?pay.binding:undefined;
 account(pay.recipient);if(typeof pay.amount!=='string'||pay.asset!=='NEAR'||pay.maximumTransfers!==1||(p.version===4&&pay.invoiceId!==job))throw Error('Invalid bounded payment or job differs from the reviewed plan.');uint(pay.amount);if(BigInt(pay.amount)===0n||!pay.recipient.endsWith('.testnet'))throw Error('Invalid bounded payment.');
 const args={order_id:pay.orderId,invoice_id:job,recipient:pay.recipient,amount:pay.amount};
 if(p.version===5&&(!binding||binding.organization!==c.organization||binding.job!==job||!(/^[a-f0-9-]{36}$/).test(binding.bill)||!(/^[a-f0-9-]{36}$/).test(binding.agreement)||job!==`acceptance-${binding.bill}`||
  !isDeepStrictEqual(binding.args,args)||binding.argsBase64!==Buffer.from(JSON.stringify(args)).toString('base64')||
  !isDeepStrictEqual(w.transaction,{signer:c.worker,receiver:c.contract,actions:[{type:'FunctionCall',method:'execute_payment',args,depositYoctoNEAR:'0',gas:w.gas}]})))throw Error('The exact durable bill, job and payment bytes must be reviewed.');
 return {args,maxFee:w.maxFeeYoctoNEAR,planHash:expected,binding};
}
export function assertWorkerArguments(scope:ReturnType<typeof workerScope>,args:unknown){if(!isDeepStrictEqual(scope.args,args))throw Error('Worker payment differs from the exact reviewed job/order/recipient/amount. No submission permitted.');}
