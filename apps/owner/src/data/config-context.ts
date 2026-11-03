import type {PublicConfig} from "./near-adapter";
export class LiveContextChanged extends Error {}
// An authenticated snapshot must never be displayed or signed under an old
// browser target after a server restart/configuration change.
export function assertSameLiveContext(expected:PublicConfig,current:PublicConfig){
 for(const key of ["network","organization","contract","worker","publicKey","configured","transactionsEnabled"] as const)
  if(expected[key]!==current[key])throw new LiveContextChanged("Testnet configuration changed. Close this workspace, reload configuration and verify the wallet again before viewing records or requesting actions.");
}
