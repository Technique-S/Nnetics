/** Runtime use of the reviewed V3 verifier. This does not authorize a transaction.
 * The historical policy/attempt are immutable; only new, explicitly marked attempts
 * may enter this path. The receipt model fails closed for any unsupported shape;
 * a bounded operational plan supplies each exact action, never a wallet result.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ReferenceEvidenceReader,evaluateReferenceRefresh,bindRuntimeReferencePolicy,type ReferenceIntent,type ReferencePolicy} from './reference-block-policy.ts';
export const RUNTIME_REFERENCE_POLICY = '1ff5abb96c4633d8d6f510ec4a2ab44c1fbf0bfe45d959edc05dc7bbd6543709';
const bytes=fs.readFileSync(new URL('../../../../docs/METEOR_REFERENCE_POLICY_V3.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==RUNTIME_REFERENCE_POLICY)throw Error('Reviewed Meteor reference policy changed.');
const reviewed=JSON.parse(bytes.toString()) as ReferencePolicy;
export function runtimeReferenceEligible(a:any):boolean {
 const awaiting=a.referenceStatus==='awaiting_evidence'&&(a.reportedHashes??[]).length<=1;
 return a.referencePolicy===RUNTIME_REFERENCE_POLICY&&a.transport==='meteor'&&a.dispatched!==undefined&&((!a.manualReviewRequired&&a.state==='unknown')||(awaiting&&['unknown','manual_review'].includes(a.state)))&&a.planHash!==reviewed.baseV2Sha256;
}
export async function verifyRuntimeReference(a:any,candidate:string,reader=new ReferenceEvidenceReader()) {
 if(!runtimeReferenceEligible(a))throw Error('This attempt requires manual review; historical authorization cannot be reused.');
 const intent={...a} as ReferenceIntent;
 const policy=bindRuntimeReferencePolicy(reviewed,intent,candidate);
 const result=evaluateReferenceRefresh(intent,policy,await reader.collect(intent,policy));
 return {...result,runtimeIntentBinding:true,manualReviewRequired:result.verdict==='manual_review',requiresExplicitHistoricalDisposition:false,reviewedPolicyFileSha256:RUNTIME_REFERENCE_POLICY};
}
