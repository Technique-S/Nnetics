import {NextRequest,NextResponse} from "next/server";
import path from "node:path";
import {demoContractors} from "../../../../server/demo-contractors";
import {Queue,structuredInvoice} from "../../../../server/queue";
import {isAllowedAppOrigin} from "../../../../server/origin";
export const runtime="nodejs", dynamic="force-dynamic";
const cookie="nnetics_demo_portal_owner";
function queue(token:string) {
 const org=demoContractors().owner(token);
 return new Queue(path.resolve(/* turbopackIgnore: true */ process.cwd(),"../../artifacts/demo",`owner-invoices-${org}.db`),`demo:${org}`);
}
export async function GET(req:NextRequest) {
 let q:Queue|undefined;
 try {q=queue(req.cookies.get(cookie)?.value||"");return NextResponse.json(q.all().map(j=>j.invoice),{headers:{"Cache-Control":"no-store"}});}
 catch {return NextResponse.json([],{headers:{"Cache-Control":"no-store"}});}
 finally {q?.close();}
}
export async function POST(req:NextRequest) {
 let q:Queue|undefined;
 try {
  if(!isAllowedAppOrigin(req.headers.get("origin"))) throw Error("Use the same-origin demo form.");
  if(!req.headers.get("content-type")?.startsWith("application/json")) throw Error("Use JSON.");
  const reader=req.body?.getReader();if(!reader) throw Error("Missing invoice.");
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>65536){await reader.cancel();throw Error("Invoice too large.");}chunks.push(part.value);}
  const invoice=structuredInvoice(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  const token=demoContractors().ownerStart(req.cookies.get(cookie)?.value||"");q=queue(token);
  const saved=q.submitGenerated(invoice,["Simulated owner review only. Payment execution disabled."]);
  const response=NextResponse.json(saved,{headers:{"Cache-Control":"no-store"}});
  response.cookies.set(cookie,token,{httpOnly:true,sameSite:"strict",path:"/",maxAge:30*86400,secure:process.env.NNETICS_APP_ORIGIN?.startsWith("https:")===true});
  return response;
 } catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invoice submission failed."},{status:400});}
 finally {q?.close();}
}
