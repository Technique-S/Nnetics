"use client";
import {useEffect} from "react";
const labels:Record<string,string>={Receipts:"Activity and receipts",History:"Activity and receipts",Activity:"Activity and receipts",Invoices:"Invoice review",Payments:"Payment queue",Settings:"Account and workspace settings",Overview:"Payment overview","Vault & Controls":"Balance and payment limits",Contractors:"Contractor billing",Vendors:"Payment recipients","Work orders":"Approved agreements","Invoice review":"Invoice review","Payment history":"Payment history",Vault:"Balance and payment limits",Access:"Workspace permissions",Recovery:"Payment status checks","Submit a bill":"Submit a contractor bill","My payments":"Contractor payment history","Wallet details":"Contractor wallet details"};
export function ViewMetadata({name}:{name:string}){
 useEffect(()=>{
  const label=labels[name]||"Organization workspace";
  document.title=`${label} workspace | Nnetics`;
  const meta=document.querySelector('meta[name="description"]');
  meta?.setAttribute("content",`Review ${label.toLowerCase()} for your authorized workspace. Check saved records, permissions and payment details before making changes.`);
  return()=>{document.title="Sign in to your workspace | Nnetics";};
 },[name]);
 return null;
}
