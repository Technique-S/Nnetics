import {NextRequest,NextResponse} from "next/server";
import {demoIntents} from "../../../../server/demo-intents.ts";
import {isAllowedAppOrigin} from "../../../../server/origin.ts";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
function tokens(req:NextRequest){return [req.cookies.get("nnetics_demo_workspace")?.value||"",req.cookies.get("nnetics_demo_portal_owner")?.value||""] as const;}
export async function GET(req:NextRequest){try{return json({mode:"simulation",attempts:demoIntents().list(...tokens(req))});}catch(e){return json({error:e instanceof Error?e.message:"Demo access denied."},403);}}
export async function POST(req:NextRequest){try{
    if(!isAllowedAppOrigin(req.headers.get("origin")))throw Error("Use the same-origin demo form.");
    if(!req.headers.get("content-type")?.startsWith("application/json"))throw Error("JSON required.");
    const reader=req.body?.getReader();if(!reader)throw Error("Missing body.");
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192){await reader.cancel();throw Error("Request too large.");}chunks.push(part.value);}
    const input=JSON.parse(Buffer.concat(chunks,size).toString("utf8"));
    if(!input || typeof input!=="object" || Array.isArray(input))throw Error("Invalid demo action.");
    const [workspace,owner]=tokens(req),sim=demoIntents();
    // This allowlist has no live executor. Owner cookies and server guards apply
    // equally to manual UI requests and assistant-proposed requests.
    if(input.action==="quote")return json(sim.quote(workspace,owner,{billId:input.billId,sourceAsset:input.sourceAsset,key:input.key,scenario:input.scenario}));
    if(input.action==="authorize")return json(sim.authorize(workspace,owner,String(input.id)));
    if(input.action==="execute")return json(sim.execute(workspace,owner,String(input.id)));
    throw Error("Unsupported simulated payment action.");
}catch(e){return json({error:e instanceof Error?e.message:"Simulation failed."},400);}}
