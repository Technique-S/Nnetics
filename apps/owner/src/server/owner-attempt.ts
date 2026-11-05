import type { OrganizationService } from './organization-api.ts';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {createTransaction,PublicKey,baseDecode,baseEncode,actions} from 'near-api-js';
import {OWNER_GAS,validateOwnerCall} from '../data/owner-transaction.ts';
import {assertTestedProtocol} from '../data/protocol.ts';
import {assertFreshCheckpoint} from './checkpoint-validity.ts';
import {runtimeReferenceEligible,verifyRuntimeReference,RUNTIME_REFERENCE_POLICY} from './runtime-reference.ts';
import fs from 'node:fs';
import {verifyCheckpointAdvance} from './checkpoint-lifecycle.ts';
import {assertOperationalNetwork,isCleanup} from './operation-scope.ts';
import {workerLock} from './queue.ts';
const historicalBytes=fs.readFileSync(new URL('../../../../docs/METEOR_HISTORICAL_ACCEPTANCE_V3.json',import.meta.url));
const historicalRecord=JSON.parse(historicalBytes.toString());
const historicalPinned=createHash('sha256').update(historicalBytes).digest('hex')==='8e64a71240fc3292f01ae8ed3782e2c3343e34a21bd3c5e0e7b9c3cf355fcdfc';
import {ownerTransactionGate,requireOwnerTransactions,assertOwnerScope,assertOwnerScopeInput,assertScopedUnsigned} from './transaction-gates.ts';
// Durable exclusion survives lost wallet responses, refreshes, and multiple tabs.
export async function ownerAttempt(s: OrganizationService, token: string, input?: Record<string, unknown>) {
  if(input&&!['reserve','dispatch','reported','hash','rejected'].includes(String(input.action)))throw Error('Unsupported owner attempt operation.');
  const scope=input&&['reserve','dispatch'].includes(String(input.action))?requireOwnerTransactions():undefined;
  const {access,block} = await s.auth.authorize(token,'owner');
  const db=s.queue.db,baseKey=access.organization+':'+access.accountId;
  let key=scope?.operational?baseKey+':'+scope.id:baseKey;
  db.exec('CREATE TABLE IF NOT EXISTS owner_wallet_attempts (scope TEXT PRIMARY KEY, payload TEXT NOT NULL)');
  const readScope=!input?.id&&!scope?ownerTransactionGate({...process.env,NNETICS_OWNER_TRANSACTIONS_AUTHORIZED:'testnet-reviewed'}).scope:undefined;
  if(readScope?.operational)key=baseKey+':'+readScope.id;
  else if(!scope){
    const rows=(db.prepare('SELECT scope,payload FROM owner_wallet_attempts').all() as {scope:string;payload:string}[]).map(r=>({...r,a:JSON.parse(r.payload)})).filter(r=>(r.scope===baseKey||r.scope.startsWith(baseKey+':'))&&(!input?.id||r.a.id===input.id)).sort((a,b)=>(b.a.created??0)-(a.a.created??0));
    if(rows[0])key=rows[0].scope;
  }
  const read=()=>{const row=db.prepare('SELECT payload FROM owner_wallet_attempts WHERE scope=?').get(key) as {payload:string}|undefined;return row?JSON.parse(row.payload):null;};
  // All evidence merges and finalization serialize across SQLite connections/processes.
  // No network await is permitted inside this transaction.
  db.exec('CREATE TABLE IF NOT EXISTS owner_wallet_history (id TEXT PRIMARY KEY,payload TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS owner_wallet_reported_hashes (attempt TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY(attempt,hash))');
  const atomic=<T>(operation:()=>T):T=>{db.exec('BEGIN IMMEDIATE');try{const result=operation();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
  const history=(id:string)=>{const row=db.prepare('SELECT payload FROM owner_wallet_history WHERE id=?').get(id) as {payload:string}|undefined;return row?JSON.parse(row.payload):null;};
  const assertNoOtherOperationalAttempt=(exclude?:string)=>{
    for(const row of db.prepare('SELECT scope,payload FROM owner_wallet_attempts').all() as {scope:string;payload:string}[]){
      const a=JSON.parse(row.payload);if(a.id===exclude||a.owner!==access.accountId||a.organization!==access.organization)continue;
      const historical=historicalPinned&&a.id===historicalRecord.attempt&&a.hash===historicalRecord.preparedTransaction&&isDeepStrictEqual(a.reportedHashes,[historicalRecord.transaction])&&a.state==='manual_review'&&a.contract===s.chain.config.contract;
      if(!historical)throw Error('An unresolved owner attempt blocks this operation. Reconcile it; no replacement allowed.');
    }
  };
  const assertPrerequisites=()=>{for(const id of scope?.prerequisites??[]){const previous=db.prepare('SELECT state FROM owner_acceptance_uses WHERE scope=?').get(id) as {state:string}|undefined;if(previous?.state!=='confirmed')throw Error('An earlier reviewed operation is not confirmed. Reconcile it before this step.');}};
  const checkCleanupState=async()=>{
    if(!scope?.cleanupRecovery)return;
    const vault=await s.chain.view<{owner:string;paused:boolean;agent:{account_id:string;public_key:string}|null}>('get_vault',{},block.hash);
    if(vault.owner!==access.accountId||typeof vault.paused!=='boolean'||(vault.agent!==null&&(vault.agent?.account_id!==s.chain.config.worker||vault.agent?.public_key!==s.chain.config.publicKey)))
      throw Error('Finalized vault authority differs from the reviewed cleanup scope.');
    if(scope.method==='set_paused'?vault.paused:vault.agent===null)
      throw Error('This cleanup effect is already confirmed. No transaction is needed.');
  };
  const assertCleanupOrder=()=>{
    if(!scope?.operational)return;
    if(!isCleanup(scope.method,scope.args)&&db.prepare('SELECT 1 FROM metadata WHERE id=?').get('cleanup:'+scope.planHash))
      throw Error('Cleanup has begun. Payment activation is permanently closed for this plan.');
    if(scope.replaces){
      const row=db.prepare('SELECT state,payload FROM owner_acceptance_uses WHERE scope=?').get(scope.replaces) as {state:string;payload:string}|undefined;
      const prior=row&&JSON.parse(row.payload);
      if(row?.state!=='failed'||prior.planHash!==scope.planHash||prior.referenceAssessment?.verdict!=='finalized_cleanup_failure')
        throw Error('Replacement cleanup requires an explicitly scoped and verified finalized failure.');
    }
  };
  const mergeEvidence=(current:any)=>{
    for(const hash of [current.reportedHash,...(current.reportedHashes??[])].filter(Boolean))db.prepare('INSERT OR IGNORE INTO owner_wallet_reported_hashes VALUES (?,?)').run(current.id,hash);
    const hashes=(db.prepare('SELECT hash FROM owner_wallet_reported_hashes WHERE attempt=? ORDER BY hash').all(current.id) as {hash:string}[]).map(row=>row.hash);
    const conflict=hashes.find(hash=>hash!==current.hash&&hash!==current.verifiedReferenceHash);
    return {...current,...(hashes.length?{reportedHashes:hashes,reportedHash:conflict??hashes[0]}:{}),...(conflict||current.manualReviewRequired||current.state==='manual_review'?{manualReviewRequired:true,state:'manual_review'}:{})};
  };
  const saveHistory=(current:any)=>{
    db.prepare('INSERT INTO owner_wallet_history VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(current.id,JSON.stringify(current));
    if(current.scopeId)db.prepare('UPDATE owner_acceptance_uses SET state=?,payload=? WHERE scope=? AND attempt=?').run(current.state,JSON.stringify(current),current.scopeId,current.id);
  };
  const checkAdvance=async(args:any)=>{
    const header=await s.chain.rpc<{header:{height:number}}>('block',{block_id:block.hash});
    verifyCheckpointAdvance(await s.chain.view('get_repair_checkpoint',{},block.hash),args.update,{height:String(header.header.height),timestamp:block.timestamp});
  };
  const checkWorker=async(args:any)=>{
    if(args.account_id!==s.chain.config.worker||args.public_key!==s.chain.config.publicKey)throw Error('Automatic-payment identity differs from the configured restricted account.');
    const key=await s.chain.rpc<any>('query',{request_type:'view_access_key',account_id:args.account_id,public_key:args.public_key,block_id:block.hash});
    const permission=key.permission?.FunctionCall;
    if(key.block_hash!==block.hash||!permission||permission.receiver_id!==s.chain.config.contract||!isDeepStrictEqual(permission.method_names,['execute_payment'])||typeof permission.allowance!=='string'||BigInt(permission.allowance)<=0n)throw Error('Automatic payments require the exact restricted function-call key and a finite allowance.');
  };
  if(input?.action==='reported')return atomic(()=>{
    let active=read();const current=active?.id===input.id?active:history(String(input.id));
    if(!current||current.transport!=='meteor'||!['unknown','manual_review','confirmed','failed'].includes(current.state)||current.owner!==access.accountId||current.organization!==access.organization||current.contract!==s.chain.config.contract||! /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(input.hash)))throw Error('Invalid wallet-reported transaction. Reconcile the recorded request.');
    if(current.storageScope){if(current.storageScope!==baseKey&&current.storageScope!==baseKey+':'+current.scopeId)throw Error('Invalid owner attempt scope.');key=current.storageScope;active=read();}
    // Import existing payload evidence before counting candidates (also after restart/migration).
    for(const hash of [current.reportedHash,...(current.reportedHashes??[])].filter(Boolean))db.prepare('INSERT OR IGNORE INTO owner_wallet_reported_hashes VALUES (?,?)').run(current.id,hash);
    db.prepare('INSERT OR IGNORE INTO owner_wallet_reported_hashes VALUES (?,?)').run(current.id,String(input.hash));
    // A single new candidate can be assessed only for newly prepared V3 attempts.
    // Historical holds and additional conflicting reports remain manual forever.
    const candidate={...current,reportedHash:String(input.hash),reportedHashes:(db.prepare('SELECT hash FROM owner_wallet_reported_hashes WHERE attempt=? ORDER BY hash').all(current.id) as {hash:string}[]).map(r=>r.hash)};
    const merged=runtimeReferenceEligible(current)&&candidate.reportedHashes.length===1?candidate:mergeEvidence(current);
    if(merged.manualReviewRequired){
      if(['confirmed','failed'].includes(current.state))merged.expectedTransactionState=current.state;
      saveHistory(merged);
      // A late report restores a held review record, never a dispatchable review.
      if(!active||active.id===current.id)db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?) ON CONFLICT(scope) DO UPDATE SET payload=excluded.payload').run(key,JSON.stringify(merged));
    }else if(active?.id===current.id)db.prepare('UPDATE owner_wallet_attempts SET payload=? WHERE scope=?').run(JSON.stringify(merged),key);
    else saveHistory(merged);
    return merged;
  });
  let attempt=read();
  if(input?.action==='reserve') {
    assertOwnerScope(scope!,s.chain.config,access.accountId);
    assertOwnerScopeInput(scope!,input);
    if(scope!.operational)assertOperationalNetwork(await s.chain.rpc('status',[]));
    await checkCleanupState();
    if(scope!.operational)input.args=structuredClone(scope!.args);
    if(!/^[a-z_]{1,64}$/.test(String(input.method)))
      throw Error('Unsupported owner wallet operation.');
    const identity=s.auth.verify(token);
    if(scope!.publicKey&&identity.public_key!==scope!.publicKey)throw Error('Selected signing key differs from the reviewed operational plan. Authenticate with the expected wallet; no transaction prepared.');
    const accessKey=await s.chain.rpc<{nonce:number}>('query',{request_type:'view_access_key',account_id:access.accountId,public_key:identity.public_key,block_id:block.hash});
    if(!Number.isSafeInteger(accessKey.nonce)||!input.args||typeof input.args!=='object')throw Error('Invalid owner transaction preflight.');
    // Store review data only; never signatures or private keys.
    const next={operational:scope!.operational??false,storageScope:key,id:crypto.randomUUID(),method:input.method,args:input.args,publicKey:identity.public_key,nonceFloor:String(accessKey.nonce),deposit:String(input.deposit),created:Date.now(),state:'unknown',hash:''};
    if(input.transport==='meteor') {
      validateOwnerCall(String(input.method),input.args as Record<string,unknown>,String(input.deposit));
      assertTestedProtocol(block.protocolVersion);
      if(input.method==='advance_repair_head')await checkAdvance(input.args);
      if(input.method==='authorize_agent')await checkWorker(input.args);
      if(input.method==='authorize_agent'||(input.method==='set_paused'&&(input.args as {paused?:boolean}).paused===false))assertFreshCheckpoint(await s.chain.view('get_repair_checkpoint',{},block.hash),block.timestamp);
      const price=await s.chain.rpc<{gas_price:string}>('gas_price',{block_id:block.hash});
      const gas=scope!.gas;
      const maxFee=((BigInt(gas)+2_000_000_000_000n)*BigInt(price.gas_price)*2n).toString();
      if(BigInt(maxFee)>BigInt(scope!.maxFee))throw Error('Network fees exceed the reviewed fee allowance. No wallet request sent.');
      const balance=await s.chain.rpc<{amount:string;locked:string;storage_usage:number}>('query',{request_type:'view_account',account_id:access.accountId,block_id:block.hash});
      if(BigInt(balance.amount)-BigInt(balance.storage_usage)*10n**19n<BigInt(next.deposit)+BigInt(maxFee))throw Error('Owner balance does not cover the deposit and fee allowance.');
      const tx=createTransaction(access.accountId,PublicKey.fromString(identity.public_key),s.chain.config.contract,BigInt(accessKey.nonce)+1n,[actions.functionCall(String(input.method),input.args,BigInt(gas),BigInt(next.deposit))],baseDecode(block.hash));
      Object.assign(next,{cleanupRecovery:scope!.cleanupRecovery===true,referencePolicy:RUNTIME_REFERENCE_POLICY,codeHash:s.chain.config.codeHash,transport:'meteor',network:'testnet',organization:access.organization,owner:access.accountId,contract:s.chain.config.contract,gas,maxFee,expires:Date.now()+scope!.reviewValidityMs,state:'prepared',unsigned:Buffer.from(tx.encode()).toString('base64'),nonce:String(tx.nonce),referenceBlock:block.hash,hash:baseEncode(createHash('sha256').update(tx.encode()).digest()),scopeId:scope!.id,planHash:scope!.planHash});
      if(input.method==='approve_work_order') {
        const vendor=await s.chain.view<{recipient:string}|null>('get_vendor',{vendor_id:(input.args as {vendor_id:string}).vendor_id},block.hash);
        if(!vendor)throw Error('The approved contractor record was not found. No wallet request sent.');
        Object.assign(next,{paymentRecipient:vendor.recipient,paymentAmount:(input.args as {amount:string}).amount});
      }
      if(input.method==='reconcile_payment') {
        const payment=await s.chain.view<{recipient:string;amount:string}|null>('get_payment',{attempt_id:(input.args as {attempt_id:string}).attempt_id},block.hash);
        if(!payment)throw Error('The recorded payment was not found. No wallet request sent.');
        Object.assign(next,{paymentRecipient:payment.recipient,paymentAmount:payment.amount});
      }
    }
    db.exec('CREATE TABLE IF NOT EXISTS owner_acceptance_uses (scope TEXT PRIMARY KEY, attempt TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL)');
    const currentScope=requireOwnerTransactions();
    if(currentScope.id!==scope!.id||currentScope.planHash!==scope!.planHash||s.auth.verify(token).public_key!==next.publicKey)throw Error('Owner acceptance configuration changed before preparation. No wallet request allowed.');
    return atomic(()=>{
      if(db.prepare('SELECT scope FROM owner_acceptance_uses WHERE scope=?').get(scope!.id))throw Error('This acceptance was already submitted. Reconcile its recorded transaction; another submission is not allowed.');
      if(scope!.operational)assertNoOtherOperationalAttempt();
      assertPrerequisites();
      assertCleanupOrder();
      const result=db.prepare('INSERT OR IGNORE INTO owner_wallet_attempts VALUES (?,?)').run(key,JSON.stringify(next));
      if(!result.changes)throw Error('We couldn’t confirm this transaction yet. Check its status before trying again.');return next;
    });
  }
  if(!attempt){if(input)throw Error('No recorded owner transaction. No wallet request allowed.');return null;}
  if(input?.action==='dispatch') {
    if(Object.keys(input).some(k=>!['action','id'].includes(k)))throw Error('Owner transaction is outside the reviewed acceptance scope.');
    assertOwnerScope(scope!,s.chain.config,access.accountId);
    if(attempt.scopeId!==scope!.id||attempt.planHash!==scope!.planHash)throw Error('Owner acceptance configuration changed. Cancel the unsubmitted review before preparing again.');
    assertScopedUnsigned(scope!,attempt);
    if(scope!.operational)assertOperationalNetwork(await s.chain.rpc('status',[]));
    await checkCleanupState();
    if(attempt.id!==input.id||attempt.transport!=='meteor'||attempt.state!=='prepared'||attempt.expires<=Date.now()||attempt.contract!==s.chain.config.contract||attempt.owner!==access.accountId||attempt.organization!==access.organization)throw Error('Prepared transaction expired or context changed. No wallet request sent.');
    assertTestedProtocol(block.protocolVersion);
    if(attempt.method==='advance_repair_head')await checkAdvance(attempt.args);
    if(attempt.method==='authorize_agent')await checkWorker(attempt.args);
    if(s.auth.verify(token).public_key!==attempt.publicKey)throw Error('Wallet signing key changed. Cancel the unsubmitted review and authenticate again.');
    if(attempt.method==='authorize_agent'||(attempt.method==='set_paused'&&attempt.args.paused===false))assertFreshCheckpoint(await s.chain.view('get_repair_checkpoint',{},block.hash),block.timestamp);
    const current=await s.chain.rpc<{nonce:number}>('query',{request_type:'view_access_key',account_id:access.accountId,public_key:attempt.publicKey,block_id:block.hash});
    if(String(current.nonce)!==attempt.nonceFloor)throw Error('Wallet nonce changed. Cancel this unsubmitted review and prepare again.');
    const price=await s.chain.rpc<{gas_price:string}>('gas_price',{block_id:block.hash});
    if(BigInt(attempt.maxFee)>BigInt(scope!.maxFee)||(BigInt(attempt.gas)+2_000_000_000_000n)*BigInt(price.gas_price)*2n>BigInt(attempt.maxFee))throw Error('Current fees exceed the reviewed fee allowance. Cancel the unsubmitted review.');
    const previous=JSON.stringify(attempt);attempt={...attempt,state:'unknown',dispatched:Date.now()};
    const currentScope=requireOwnerTransactions();
    if(currentScope.id!==scope!.id||currentScope.planHash!==scope!.planHash||attempt.expires<=Date.now()||s.auth.verify(token).public_key!==attempt.publicKey)throw Error('Owner acceptance configuration changed or review expired before dispatch. No wallet request allowed.');
    const cleanup=scope!.operational&&isCleanup(attempt.method,attempt.args);
    const unlock=cleanup?workerLock(s.queue.filename):undefined;
    try {
      db.exec('BEGIN IMMEDIATE');
      try {
      db.exec('CREATE TABLE IF NOT EXISTS owner_acceptance_uses (scope TEXT PRIMARY KEY, attempt TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL)');
      if(scope!.operational)assertNoOtherOperationalAttempt(attempt.id);
      assertPrerequisites();
      assertCleanupOrder();
      if(cleanup)db.prepare("INSERT OR IGNORE INTO metadata VALUES (?,?)").run('cleanup:'+scope!.planHash,attempt.id);
      if(db.prepare('SELECT scope FROM owner_acceptance_uses WHERE scope=?').get(scope!.id))throw Error('This acceptance was already submitted. Another submission is not allowed.');
      db.prepare('INSERT INTO owner_acceptance_uses VALUES (?,?,?,?)').run(scope!.id,attempt.id,'dispatched',JSON.stringify(attempt));
      if(db.prepare('UPDATE owner_wallet_attempts SET payload=? WHERE scope=? AND payload=?').run(JSON.stringify(attempt),key,previous).changes!==1)throw Error('Owner transaction was already dispatched. Check its status.');
      db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
    }finally{unlock?.();}
    return attempt;
  }
  if(input?.action==='hash'||input?.action==='rejected')return atomic(()=>{
    const current=read();
    if(!current||input.id!==current.id)throw Error('Reconcile the recorded transaction.');
    if(input.action==='rejected'){
      if(current.manualReviewRequired||(current.hash&&current.state!=='prepared'))throw Error('Reconcile the recorded transaction.');
      db.prepare('DELETE FROM owner_wallet_attempts WHERE scope=?').run(key);return null;
    }
    if(! /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(input.hash)))throw Error('Enter the existing wallet transaction hash.');
    if(current.hash&&current.hash!==input.hash)throw Error('Reconcile the recorded hash.');
    const merged=mergeEvidence({...current,hash:input.hash});
    db.prepare('UPDATE owner_wallet_attempts SET payload=? WHERE scope=?').run(JSON.stringify(merged),key);return merged;
  });
  if(runtimeReferenceEligible(attempt)&&((attempt.reportedHash&&attempt.reportedHash!==attempt.hash)||attempt.operational)){
    const observed=JSON.stringify(attempt),candidate=attempt.reportedHash??attempt.hash;
    let assessment;
    try{assessment=await verifyRuntimeReference(attempt,candidate,s.referenceEvidenceReader);}catch(error){
      // Missing/unknown evidence cannot release a claim or authorize another signature.
      return atomic(()=>{const current=read();if(!current||current.id!==attempt.id)return history(attempt.id);if(JSON.stringify(current)!==observed)return current;const held=mergeEvidence({...current,referenceStatus:'awaiting_evidence',referenceFailure:error instanceof Error?error.message:'Evidence unavailable'});db.prepare('UPDATE owner_wallet_attempts SET payload=? WHERE scope=?').run(JSON.stringify(held),key);saveHistory(held);return held;});
    }
    return atomic(()=>{
      const current=read();if(!current||current.id!==attempt.id)return history(attempt.id);
      if(JSON.stringify(current)!==observed)return current; // newer evidence wins
      const consumed=db.prepare('SELECT attempt,state FROM owner_acceptance_uses WHERE scope=?').get(current.scopeId) as {attempt:string;state:string}|undefined;
      if(!consumed||consumed.attempt!==current.id||!['dispatched','unknown',...(current.referenceStatus==='awaiting_evidence'?['manual_review']:[])].includes(consumed.state))throw Error('Consumed owner authorization could not be verified. Manual review required.');
      const failed=current.cleanupRecovery===true&&assessment.verdict==='finalized_cleanup_failure';
      if(assessment.verdict!=='compatible_under_proposal'&&!failed){
        const held=mergeEvidence({...current,state:'manual_review',manualReviewRequired:true,referenceStatus:'rejected',referenceAssessment:assessment});db.prepare('UPDATE owner_wallet_attempts SET payload=? WHERE scope=?').run(JSON.stringify(held),key);saveHistory(held);return held;
      }
      const confirmed={...current,state:failed?'failed':'confirmed',manualReviewRequired:false,referenceStatus:'verified',verifiedReferenceHash:candidate,referenceAssessment:assessment};
      saveHistory(confirmed);db.prepare('DELETE FROM owner_wallet_attempts WHERE scope=? AND payload=?').run(key,observed);return confirmed;
    });
  }
  if(attempt.manualReviewRequired||attempt.state==='manual_review'||(attempt.reportedHash&&attempt.reportedHash!==attempt.hash))return atomic(()=>{
    const current=read();if(!current||current.id!==attempt.id)return history(attempt.id);
    const merged=mergeEvidence(current);db.prepare('UPDATE owner_wallet_attempts SET payload=? WHERE scope=?').run(JSON.stringify(merged),key);saveHistory(merged);return merged;
  });
  if(attempt.hash && attempt.state!=='prepared') {
    const observed=attempt;
    const tx=await s.chain.rpc<any>('tx',{tx_hash:observed.hash,sender_account_id:access.accountId,wait_until:'FINAL'});
    return atomic(()=>{
      const current=read();
      if(!current||current.id!==observed.id){const completed=history(observed.id);if(completed)return completed;throw Error('Owner transaction changed during reconciliation. Manual review required.');}
      if(current.hash!==observed.hash)throw Error('Owner transaction changed during reconciliation. Manual review required.');
      attempt=mergeEvidence(current);
      if(attempt.manualReviewRequired){
        db.prepare('UPDATE owner_wallet_attempts SET payload=? WHERE scope=?').run(JSON.stringify(attempt),key);saveHistory(attempt);return attempt;
      }
      const call=tx.transaction?.actions?.[0]?.FunctionCall;
      if(tx.transaction?.hash!==attempt.hash||tx.transaction?.signer_id!==access.accountId||tx.transaction?.receiver_id!==s.chain.config.contract||tx.transaction?.public_key!==attempt.publicKey||BigInt(tx.transaction?.nonce??0)<=BigInt(attempt.nonceFloor)||tx.transaction?.actions?.length!==1||call?.method_name!==attempt.method||call?.deposit!==attempt.deposit||!isDeepStrictEqual(JSON.parse(Buffer.from(call?.args??'', 'base64').toString()),attempt.args))throw Error('Transaction differs from the recorded owner request. Manual review required.');
      if(attempt.transport==='meteor'&&(String(tx.transaction.nonce)!==attempt.nonce||String(call.gas)!==attempt.gas))throw Error('Transaction differs from the exact prepared owner request. Manual review required.');
      if(tx.final_execution_status==='FINAL'&&(tx.status?.SuccessValue!==undefined||tx.status?.Failure!==undefined)){
        attempt={...attempt,owner:access.accountId,organization:access.organization,contract:s.chain.config.contract,state:tx.status.Failure?'failed':'confirmed'};
        saveHistory(attempt);
        db.prepare('DELETE FROM owner_wallet_attempts WHERE scope=? AND payload=?').run(key,JSON.stringify(current));
      }
      return attempt;
    });
  }
  return attempt;
}
