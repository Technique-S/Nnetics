// Limits waiting only. It cannot cancel, replay, or replace a wallet transaction.
export async function walletResult<T>(pending:Promise<T>,signal:AbortSignal,timeoutMs=120000):Promise<T> {
  signal.throwIfAborted();
  let timer:ReturnType<typeof setTimeout>|undefined;
  let abort:()=>void=()=>{};
  try {
    return await Promise.race([pending,new Promise<never>((_,reject)=>{
      abort=()=>reject(Error('We couldn’t confirm this transaction yet. Check its status before trying again.'));
      timer=setTimeout(abort,Math.max(1,timeoutMs));signal.addEventListener('abort',abort,{once:true});
    })]);
  } finally {clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
