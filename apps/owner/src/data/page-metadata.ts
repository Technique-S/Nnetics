import type {Metadata} from "next";
import {getSiteOrigin} from "./product";
export function privateMetadata(title:string,description:string):Metadata {
 const origin=getSiteOrigin();
 return {title,description,robots:{index:false,follow:false},openGraph:{title,description,type:"website",...(origin?{url:origin}:{})},twitter:{card:"summary",title,description}};
}
