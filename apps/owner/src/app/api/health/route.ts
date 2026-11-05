import {transactionCapabilities} from '../../../server/transaction-gates';
export const dynamic='force-dynamic';
export function GET(){
  // Liveness only. Chain/RPC outages must not trigger destructive restart loops.
  const gates=transactionCapabilities();
  return Response.json({status:'web',paymentsEnabled:gates.paymentExecutionEnabled,ownerTransactionsEnabled:gates.ownerTransactionsEnabled},{headers:{'Cache-Control':'no-store'}});
}
