import {NextRequest,NextResponse} from "next/server";
import {contractorService} from "../../../../../server/contractor-service";
import {identityConfig} from "../../../../../server/identity";
import type {ContractorCommand,OwnerPortalCommand} from "../../../../../data/contractor-adapter";
export const runtime="nodejs",dynamic="force-dynamic";
type Context={params:Promise<{path:string[]}>};
const sessionCookie="nnetics_contractor";
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
function cookie(response:NextResponse,value:string){response.cookies.set(sessionCookie,value,{httpOnly:true,sameSite:"strict",path:"/api/live/contractors",secure:identityConfig().origin.startsWith("https:"),maxAge:value?3600:0});return response;}
async function bytes(req:NextRequest,max:number){const reader=req.body?.getReader();if(!reader)throw Error("Missing request body.");const chunks:Uint8Array[]=[];let size=0;for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>max){await reader.cancel();throw Error("Request too large.");}chunks.push(p.value);}return Buffer.concat(chunks,size);}
export async function GET(req:NextRequest,context:Context){
 try{
  const path=(await context.params).path,backend=contractorService(),session=req.cookies.get(sessionCookie)?.value||"";
  if(path.join("/")==="owner") return json(await backend.ownerRead(req.cookies.get("nnetics_identity")?.value||"",req.nextUrl.searchParams.get("organization")||""));
  if(path.join("/")==="contractor")return json(await backend.read(session));
  if(path[0]==="attachment"&&path.length===2){
   let org:string,profile:string|undefined;
   if(req.nextUrl.searchParams.has("organization")) {org=req.nextUrl.searchParams.get("organization")!;await backend.authorizeOwner(req.cookies.get("nnetics_identity")?.value||"",org,false);}
   else {const who=await backend.contractorAccess(session);org=who.org;profile=who.profile.id;}
   const file=backend.attachment(path[1],org,profile);
   return new NextResponse(new Uint8Array(file.bytes),{headers:{"Content-Type":file.mime,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox","Referrer-Policy":"no-referrer"}});
  }
  return json({error:"Unknown contractor endpoint."},404);
 }catch(e){return json({error:e instanceof Error?e.message:"Private access denied."},403);}
}
export async function POST(req:NextRequest,context:Context){
 let entering=false;
 try{
  if(req.headers.get("origin")!==identityConfig().origin) throw Error("Use the configured Nnetics origin for private requests.");
  const path=(await context.params).path.join("/"),backend=contractorService(),session=req.cookies.get(sessionCookie)?.value||"";
  if(path==="upload"){
   await backend.contractorAccess(session);
   if(!req.headers.get("content-type")?.startsWith("multipart/form-data;"))throw Error("Use a file upload.");
   const raw=await bytes(req,1114112),form=await new Request(req.url,{method:"POST",headers:{"Content-Type":req.headers.get("content-type")!},body:new Uint8Array(raw)}).formData(),file=form.get("file");
   if(!(file instanceof File))throw Error("Choose an invoice file.");
   const content=new Uint8Array(await file.arrayBuffer());
   backend.db.exec("BEGIN IMMEDIATE");
   try{const saved=backend.upload(session,file.name,file.type||(/\.txt$/i.test(file.name)?"text/plain":""),content);backend.db.exec("COMMIT");return json(saved);}catch(e){backend.db.exec("ROLLBACK");throw e;}
  }
  if(!req.headers.get("content-type")?.startsWith("application/json"))throw Error("Use JSON.");
  const input=JSON.parse(new TextDecoder("utf8",{fatal:true}).decode(await bytes(req,65536)));
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid contractor request.");
  if(path==="enter"){entering=true;backend.logoutContractor(session);return cookie(json({mode:"persistent"}),await backend.enterVerifiedLink(input.token));}
  if(path==="owner") return json(await backend.ownerWrite(req.cookies.get("nnetics_identity")?.value||"",String(input.organization||""),input as OwnerPortalCommand));
  if(path==="contractor")return json(await backend.write(session,input as ContractorCommand));
  if(path==="extract")return json(await backend.extraction(session,input));
  if(path==="wallet/challenge")return json(await backend.walletChallenge(session,input.account));
  if(path==="wallet/proof")return json(await backend.walletProof(session,input));
  if(path==="logout"){backend.logoutContractor(session);return cookie(json({ok:true}),"");}
  return json({error:"Unknown contractor endpoint."},404);
 }catch(e){const r=json({error:e instanceof Error?e.message:"Private request failed."},400);return entering?cookie(r,""):r;}
}
