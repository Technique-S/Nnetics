// Offline collection guard, mirroring the deployed verifier's bounded input rules.
// Validating a supplied set does not authenticate its initial trust anchor.
export function validateBootstrapAge(timestamp:string,nowNs:bigint){
 if(!/^[0-9]+$/.test(timestamp))throw Error("Invalid bootstrap timestamp");
 const age=nowNs-BigInt(timestamp);
 if(age<0n||age>24n*3600n*1000000000n)throw Error("Bootstrap is future or older than the 24-hour acceptance window; refresh and review a new plan");
}
export function validateBootstrapSets(current:unknown,next:unknown,approvals:unknown){
 for(const input of [current,next]){
  if(!Array.isArray(input)||input.length===0||input.length>128)throw Error("Validator limit");
  const accounts=new Set<string>();let total=0n;
  for(const v of input){
   if(v.validator_stake_struct_version!=="V1"||typeof v.account_id!=="string"||v.account_id.length<2||v.account_id.length>64||!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(v.account_id)||accounts.has(v.account_id))throw Error("Invalid or duplicate validator account");
   accounts.add(v.account_id);
   if(typeof v.stake!=="string"||!/^[1-9][0-9]*$/.test(v.stake)||BigInt(v.stake)>=(1n<<128n))throw Error("Invalid validator stake");
   total+=BigInt(v.stake);if(total>=(1n<<128n))throw Error("Stake overflow");
   if(typeof v.public_key!=="string"||!v.public_key.startsWith("ed25519:"))throw Error("Unsupported validator key");
  }
 }
 if(!Array.isArray(approvals)||approvals.length>256||approvals.some(s=>s!==null&&(typeof s!=="string"||!s.startsWith("ed25519:"))))throw Error("Invalid approval slots");
}
