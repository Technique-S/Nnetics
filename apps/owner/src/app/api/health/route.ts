export const dynamic='force-dynamic';
export function GET(){
  // Liveness only. Chain/RPC outages must not trigger destructive restart loops.
  return Response.json({status:'web',paymentsEnabled:process.env.NNETICS_TRANSACTIONS_AUTHORIZED==='testnet-reviewed'},{headers:{'Cache-Control':'no-store'}});
}
