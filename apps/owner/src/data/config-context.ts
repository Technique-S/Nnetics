import type {PublicConfig} from "./near-adapter";
export class LiveContextChanged extends Error {}
// An authenticated snapshot must never be displayed or signed under an old
// browser target after a server restart/configuration change.
export function assertSameLiveContext(expected:PublicConfig,current:PublicConfig){
 for(const key of ["network","organization","contract","worker","publicKey","configured","transactionsEnabled","ownerTransactionsEnabled","paymentExecutionEnabled"] as const)
  if(expected[key]!==current[key])throw new LiveContextChanged("Testnet configuration changed. Close this workspace, reload configuration and verify the wallet again before viewing records or requesting actions.");
 if(expected.ownerTransactionRestriction?.id!==current.ownerTransactionRestriction?.id||expected.ownerTransactionRestriction?.planHash!==current.ownerTransactionRestriction?.planHash)throw new LiveContextChanged('Owner acceptance configuration changed. Close this workspace and reopen it before requesting actions.');
}
