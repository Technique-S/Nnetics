// Policy revision only: preserve every transaction byte/amount/cap. No RPC/signing.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root='../..',old=JSON.parse(fs.readFileSync(root+'/docs/PAYMENT_ACCEPTANCE_TRANSACTIONS.json','utf8'));
const hash=p=>crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
if(old.digest!=='b4b70ad2cfee6722a0fe74e02f549b6cb124b54ab3ab282575d14c17f0f2b63b'||hash(old.plan)!==old.digest)throw Error('Original plan changed');
const plan=structuredClone(old.plan);
plan.version=2;
plan.status='AWAITING_EXPLICIT_TESTNET_ONLY_APPROVAL_NOT_AUTHORIZED';
plan.revises_digest=old.digest;
plan.checkpoint.requires_independent_review=false;
plan.checkpoint.independent_review_status='NONE: all Nnetics implementation and evidence checks were performed by Codex as implementation author; no third-party security verdict exists';
plan.checkpoint.exception_scope='Owner may expressly accept absence of independent review ONLY for this single 0.001-NEAR testnet acceptance, not production or another payment';
plan.checkpoint.operator_correction='Fastnear maintains the legacy near.org archival endpoint; those original two URLs are not independent operators';
plan.checkpoint.corroboration={intear:{endpoint:'https://testnet-rpc.intea.rs',canonical_hash:true,ordered_current_validators:true},drpc:{endpoint:'https://near-testnet.drpc.org',canonical_hash:true,ordered_current_validators:false,limitation:'method unavailable'},limitation:'Separately listed service operators corroborate responses, not disjoint infrastructure, genesis-to-head trust or independent security review'};
plan.testnet_risk_acceptance={independent_review_absent:true,initial_root_trusted_by_owner:true,initial_current_set_not_authenticated_on_chain:true,quorum_is_conditional_on_supplied_set:true,weak_subjectivity_not_solved:true,exact_input_vm_not_executed:true,gas_storage_failure_may_consume_bounded_fees:true,unknown_transfer_requires_proof_reconciliation:true,residual_worker_balance_may_be_locked:true,mainnet_and_production_excluded:true};
plan.pre_execution_requirements=[
 'Explicit approval must name this revised digest and accept the testnet-only independent-review exception AND exact trusted checkpoint/ordered sets. Preparation is not authorization.',
 'Before any initial setup signature, re-read finalized testnet/protocol-88 canonical head and ordered set for this exact pinned checkpoint from Fastnear and separately listed Intear; recheck header hash, current-prefix signatures >2/3, next-set commitment, epoch encoding and normalization. Corroboration does not replace owner trust.',
 'Before checkpoint signature, its timestamp must be nonfuture and at most 24 hours old relative to fresh finalized chain time. If unavailable, inconsistent, stale, unsupported or changed, STOP; no checkpoint substitution under this digest.',
 'Before any transaction signature refresh code/no-key ownership, signer nonce/key permission, approved target/args/deposit/gas and fees. Do not exceed any existing per-step cap or funding ceiling; preserve owner storage and cleanup fee allowance.',
 'Checkpoint initialization only while paused, agent absent, last_attempt=0 and checkpoint absent. A previously FINAL completed identical step is reconciled/skipped, never signed again. Verify installed checkpoint exactly before funding/activation.',
 'Owner must still authorize the organization and INV-0002 must still be Approved with original-text hash, immutable billing order, 0.001 NEAR and Babygoat recipient unchanged.',
 'Before agent/unpause, require exactly one held durable job mapped to the matching FINAL approved ACCEPTANCE-001 chain order; active Babygoat vendor; enabled unexpired order; exactly 0.001 funded/budget/cap; exact restricted worker key and no FullAccess key.',
 'Before unpause/payment verify the stored recovery checkpoint equals the approved head, remains within the 24-hour window, and a supported current/next-epoch signed-update path can be obtained and checked off chain. No epoch skipping or post-attempt root reset. If an on-chain advance is required before this payment, STOP for an amendment; no advance_repair_head transaction is authorized here.',
 'Record fresh recipient pre-balance immediately before execution; isolate unrelated balance changes. The preparation snapshot is not acceptance evidence.',
 'Run only this one scoped durable worker job using its process lock and exact persisted signed outbox. Unknown or interrupted outcome is reconciled before any retry; never sign a replacement while unknown.'
];
plan.gates=[
 'Testnet-only owner decision may accept documented absence of independent review; no independent review is claimed. Initial trusted root approval and all contract checks remain mandatory.',
 'No signing/broadcast until explicit revised-digest approval; all current preparation is unauthorized for transactions.',
 'Fresh checkpoint validity and all pre_execution_requirements must pass; any change to action/amount/permission/checkpoint/gas ceiling/expiry requires a revised plan and approval.',
 'Exactly one held job before activation. Exactly one FINAL native 0.001 transfer, expected recipient balance delta, correct Paid attempt/order/invoice accounting and transaction linkage are required before both screens show Paid.',
 'Immediately after verified payment use the listed pause and revoke transactions, verify paused=true/agent=null/reserved=0/spent=0.001, then repeat linkage/restart app and worker to prove the same terminal job remains without a new signed attempt.',
 'On any fault halt worker/signing, retain original evidence and reservation. The same listed pause/revoke operations are permitted early for containment, at most once each; no extra retry transaction is authorized even on failure. Unknown outcomes reconcile the same hash; a fresh failed-step retry requires separate approval.',
 'Unknown outcome is not success/failure. No balance-only or owner assertion may finalize accounting. If recovery needs proof updates/repair transactions not in this plan, stop for a separately approved recovery plan.'
];
plan.stop_conditions=['Wrong network/protocol/code/owner/key or unverified organization binding','Checkpoint stale/future/disagreement/quorum/encoding/commitment failure','Initial checkpoint already differs; any prior attempt or payment; nonce conflict','Invoice/order/recipient/amount/status/original-text drift or duplicate queue claim','Balance/storage/fee allowance insufficient or any cap exceeded','Expired order, missing vendor or recovery head cannot sync within authorized actions','Wallet or CLI changes exact prepared bytes; unexplained transaction hash or ambiguous broadcast','Callback/receipt/transfer failure or unknown; conflicting balance evidence; missing matching transaction link','Approval window/required trust consent absent; attempted production or AI path'];
plan.closure={after_verified_payment:['pause-after-payment','revoke_agent'],early_containment_permitted:true,each_step_maximum_executions:1,verify:{paused:true,agent:null,spent:'1000000000000000000000',reserved:'0'},retry_test:'Local repeated queue/link requests and process restarts only, with no deliberately broadcast duplicate payment'};
plan.exclusions.push('Independent-security-review completion claim','Another invoice/vault/recipient/payment','Automatic checkpoint replacement or additional recovery transactions');
for(const field of ['transactions','invoice','worker','preflight','storage_funding','organization','network'])assert.deepEqual(plan[field],old.plan[field],`${field} changed`);
const result={plan,digest:hash(plan)};
fs.writeFileSync(root+'/docs/PAYMENT_ACCEPTANCE_TESTNET_V2.json',JSON.stringify(result,null,2),{flag:'wx'});
const comparison={original_digest:old.digest,revised_digest:result.digest,transaction_count:plan.transactions.length,transactions_exactly_unchanged:true,invoice_worker_accounts_funding_fees_gas_expiry_checkpoint_payload_unchanged:true,policy_changes:['One testnet-only independent-review exception, explicitly unapproved','Owner-trusted initial checkpoint consent retained','Fresh 24-hour validity, corroboration and preflight conditions','Immediate pause/revoke and same-terminal-job restart checks','Bounded containment and stop conditions; no additional recovery transaction permission'],authorization_granted:false};
fs.writeFileSync(root+'/docs/PAYMENT_ACCEPTANCE_V2_COMPARISON.json',JSON.stringify(comparison,null,2),{flag:'wx'});
const checkpoint=plan.transactions.find(t=>t.id==='initialize_repair_checkpoint').actions[0].args.checkpoint;
console.log(JSON.stringify({...comparison,checkpoint_valid_until:new Date(Number(BigInt(checkpoint.head.inner_lite.timestamp)/1000000n)+24*3600000).toISOString(),order_expiry:new Date(Number(BigInt(plan.preflight.order_expiry_ns)/1000000n)).toISOString()},null,2));
