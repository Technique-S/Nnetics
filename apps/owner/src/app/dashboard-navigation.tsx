"use client";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
const destinations = ["Overview", "Contractors", "Vendors", "Work orders", "Invoice review", "Payment history", "Vault", "Access", "Recovery"];
const paths = ["M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z", "M4 21v-4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8", "M3 7h18v14H3z M7 7V3h10v4 M8 12h8", "M5 4h14v17H5z M8 9h8 M8 13h8 M8 17h5", "M5 3h14v18l-4-2-3 2-3-2-4 2z M8 8h8 M8 12h6", "M3 12a9 9 0 1 0 3-6 M3 3v6h6 M12 7v5l3 2", "M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z", "M8 10V7a4 4 0 0 1 8 0v3 M5 10h14v11H5z", "M20 7a9 9 0 1 0 1 8 M20 2v6h-6"];

export function DashboardNavigation({view,onNavigate,live,organization,invoiceCount}:{view:string;onNavigate:(name:string)=>void;live:boolean;organization:string;invoiceCount:number}) {
 const [collapsed,setCollapsed]=useState(false),[open,setOpen]=useState(false),[mobile,setMobile]=useState(false);
 const velocity=useRef(0);
 const trigger=useRef<HTMLButtonElement>(null),side=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{let value=innerWidth>=761&&innerWidth<1100;try{const saved=localStorage.getItem("nnetics-sidebar");if(saved)value=saved==="collapsed";}catch{}setCollapsed(value);document.documentElement.style.setProperty("--shell-nav",value?"72px":"248px");const sync=()=>setMobile(matchMedia("(max-width:760px)").matches);sync();window.addEventListener("resize",sync);return()=>window.removeEventListener("resize",sync);},[]);
 useEffect(()=>{if(mobile)return;const root=document.documentElement,target=collapsed?72:248;let frame=0,last=performance.now(),position=parseFloat(getComputedStyle(root).getPropertyValue("--shell-nav"))||248;
 if(matchMedia("(prefers-reduced-motion:reduce)").matches){root.style.setProperty("--shell-nav",`${target}px`);return;}
 const step=(now:number)=>{const dt=Math.min((now-last)/1000,.032);last=now;velocity.current+=(300*(target-position)-34*velocity.current)*dt;position+=velocity.current*dt;root.style.setProperty("--shell-nav",`${position}px`);if(Math.abs(target-position)>.2||Math.abs(velocity.current)>.5)frame=requestAnimationFrame(step);else{root.style.setProperty("--shell-nav",`${target}px`);velocity.current=0;}};frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame);
 },[collapsed,mobile]);
 useEffect(()=>()=>{document.documentElement.style.removeProperty("--shell-nav");},[]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow; document.body.style.overflow="hidden";
  const siblings=[...document.querySelectorAll<HTMLElement>(".workspace-main, .identity-bar, .wallet-session-notice")];
  siblings.forEach(e=>e.inert=true);side.current?.querySelector<HTMLButtonElement>("button")?.focus();
  function keys(e:KeyboardEvent){if(e.key==="Escape"){e.preventDefault();setOpen(false);}if(e.key==="Tab"){const all=side.current?.querySelectorAll<HTMLElement>('button,a[href]');if(!all?.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  const resize=()=>{if(innerWidth>760)setOpen(false);};
  window.addEventListener("keydown",keys);window.addEventListener("resize",resize);
  return()=>{document.body.style.overflow=previous;siblings.forEach(e=>e.inert=false);window.removeEventListener("keydown",keys);window.removeEventListener("resize",resize);trigger.current?.focus();};
 },[open]);
 useEffect(()=>{document.documentElement.dataset.navCollapsed=String(collapsed);return()=>{delete document.documentElement.dataset.navCollapsed;};},[collapsed]);
 useLayoutEffect(()=>{const nav=side.current?.querySelector("nav"),active=nav?.querySelector<HTMLElement>('a[aria-current="page"]');if(nav&&active){nav.style.setProperty("--selection-y",`${active.offsetTop}px`);nav.style.setProperty("--selection-height",`${active.offsetHeight}px`);}},[view,collapsed,mobile,open]);
 function toggle(){if(innerWidth<=760)setOpen(true);else setCollapsed(value=>{try{localStorage.setItem("nnetics-sidebar",value?"expanded":"collapsed");}catch{}return !value;});}
 return <><button ref={trigger} className="navigation-toggle" aria-label="Toggle navigation" aria-expanded={mobile?open:!collapsed} aria-controls="owner-navigation" onClick={toggle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6h16 M4 12h16 M4 18h16"/></svg></button>{open&&<div className="navigation-backdrop" onClick={()=>setOpen(false)}/>}
 <aside id="owner-navigation" ref={side} className={`sidebar redesigned-sidebar ${open?"drawer-open":""}`} role={open?"dialog":undefined} aria-modal={open?true:undefined} aria-label="Workspace navigation">
 <button className="drawer-close" onClick={()=>setOpen(false)}>Close navigation</button>
 <a className="brand" href="#Overview" onClick={()=>{onNavigate("Overview");setOpen(false);}}>Nnetics<span className="brand-period">.</span></a>
 <div className="workspace"><strong title={organization}>{organization.length>40?`Workspace · ${organization.slice(0,8)}`:organization}</strong></div>
 <nav aria-label="Owner dashboard"><span className="nav-active-indicator" aria-hidden="true"/>{destinations.map((name,i)=><a data-first-control={i===6?"true":undefined} data-group={i>=6?"controls":"work"} key={name} href={`#${encodeURIComponent(name)}`} aria-label={name} title={name} aria-current={view===name?"page":undefined} onClick={e=>{e.preventDefault();onNavigate(name);setOpen(false);}}><span aria-hidden="true" className="navigation-symbol"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[i]}/></svg></span><span className="nav-label">{name === "Vendors" ? "On-chain vendors" : name}</span>{name==="Invoice review"&&<span className="nav-count">{invoiceCount}</span>}</a>)}</nav>
 <div className="sidebar-bottom"><span className="nav-label">{live?"NEAR testnet":"Simulated demo"}</span><p className="nav-label">Approval and payment are separate.</p></div>
 </aside></>;
}
