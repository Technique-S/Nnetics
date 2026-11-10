import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {liveConfig} from '../src/server/config.ts';
import {Queue} from '../src/server/queue.ts';
import {amountFromNear} from '../src/data/owner-adapter.ts';
import {sourceQuestions,sourceOrderQuestions} from '../src/server/billing-extraction.ts';

const bytes=readFileSync(new URL('../../../docs/OPERATIONAL_TESTNET_ACCEPTANCE_V4.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!=='d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5')throw Error('V4 changed.');
const plan=JSON.parse(bytes),config=liveConfig(),pay=plan.payment;
if(process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED||process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED)
  throw Error('Unset both authorization flags before staging.');
if(!config.configured||config.organization!==plan.organization||config.contract!==plan.contract||config.codeHash!==plan.expectedCodeHash||!existsSync(config.database))
  throw Error('The existing scoped payment database is required.');
const billing=new DatabaseSync(process.env.NNETICS_CONTRACTOR_DATABASE||'../../artifacts/live/contractors.db',{readOnly:true});
try {
  const row=billing.prepare(`SELECT b.payload AS bill, o.payload AS agreement, b.id AS billId, o.id AS agreementId, b.profile AS profile
    FROM demo_bills b JOIN demo_orders o ON o.id=b.order_id AND o.org=b.org AND o.profile=b.profile
    WHERE b.org=? AND o.reference=?`).get(plan.organization,pay.orderId);
  if(!row) throw Error('No submitted bill exists for the acceptance billing agreement.');
  const bill=JSON.parse(row.bill),agreement=JSON.parse(row.agreement);
  const agreements=billing.prepare('SELECT payload FROM demo_orders WHERE org=? AND profile=?').all(plan.organization,row.profile).map(r=>JSON.parse(r.payload));
  if(bill.id!==row.billId||agreement.id!==row.agreementId||bill.orderId!==agreement.id||bill.contractorId!==row.profile||agreement.contractorId!==row.profile||
      bill.status!=='Approved'||bill.reasons.length||bill.asset!==pay.asset||bill.recipient!==pay.recipient||agreement.recipient!==pay.recipient||
      amountFromNear(bill.amount)!==pay.amount||amountFromNear(agreement.amount)!==pay.amount||sourceQuestions(bill.text,bill.amount).length||
      sourceOrderQuestions(bill.text,bill.orderId,agreements).length)
    throw Error('Acceptance bill or agreement is not approved and exact. No job staged.');
  const queue=new Queue(config.database,`testnet:${config.contract}:${config.codeHash}`);
  try {
    const binding=queue.stagePayment(plan.organization,bill.id,agreement.id,{id:`acceptance-${bill.id}`,order_id:pay.orderId,
      vendor_id:plan.operations.find(op=>op.actions[0].method==='approve_work_order').actions[0].args.vendor_id,
      recipient:pay.recipient,amount:pay.amount,asset:pay.asset,text:bill.text});
    console.log(JSON.stringify({...binding,displayReference:bill.reference},null,2));
  } finally {queue.close();}
} finally {billing.close();}
