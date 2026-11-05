import {account,uint} from './owner-adapter.ts';
export const OWNER_GAS='100000000000000';
export interface OwnerTransactionReview {
  id:string; network:'testnet'; organization:string; owner:string; contract:string;
  method:string; args:Record<string,unknown>; deposit:string; gas:string;
  maxFee:string; expires:number; hash:string; unsigned:string;
  paymentRecipient?:string; paymentAmount?:string;
}
// Frozen contract methods only. Display wording never becomes a method name.
export function validateOwnerCall(method:string,args:Record<string,unknown>,deposit:string) {
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Unsupported owner transaction arguments.');
  const fields:Record<string,string[]>={advance_repair_head:['update'],deposit:[],fund_storage:[],set_budget:['budget'],set_payment_cap:['payment_cap'],set_paused:['paused'],revoke_agent:[],authorize_agent:['account_id','public_key'],register_vendor:['vendor_id','recipient'],disable_vendor:['vendor_id'],approve_work_order:['order_id','vendor_id','amount','expires_at_ns'],revoke_work_order:['order_id'],reconcile_payment:['attempt_id']};
  const keys=fields[method];if(!keys||Object.keys(args).sort().join()!==[...keys].sort().join())throw Error('Unsupported owner transaction arguments.');
  uint(deposit);
  const expected=['deposit','fund_storage'].includes(method)?deposit:['reconcile_payment','advance_repair_head'].includes(method)?'0':'1';
  if(deposit!==expected||(['deposit','fund_storage'].includes(method)&&BigInt(deposit)===0n))throw Error('Invalid owner transaction deposit.');
  for(const key of keys){const value=args[key];
    if(key==='update'){if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(args).length>65536)throw Error('Invalid security update.');}
    else if(key==='paused'){if(typeof value!=='boolean')throw Error('Invalid pause setting.');}
    else if(['budget','payment_cap','amount','expires_at_ns','attempt_id'].includes(key)){if(typeof value!=='string')throw Error('Invalid exact amount.');uint(value,['expires_at_ns','attempt_id'].includes(key)?(1n<<64n)-1n:undefined);}
    else if(['account_id','recipient'].includes(key)){if(typeof value!=='string')throw Error('Invalid account.');account(value);}
    else if(typeof value!=='string'||(key==='public_key'?!/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value):! /^[A-Za-z0-9_-]{1,64}$/.test(value)))throw Error('Invalid owner transaction field.');
  }
}
