"use client";
import {useEffect,useState} from 'react';
import {APPEARANCE_KEY,APPEARANCE_EVENT,preferredAppearance,type Appearance} from '../data/appearance';
let memoryPreference:Appearance|null=null;
function readPreference(){if(memoryPreference)return memoryPreference;try{const stored=localStorage.getItem(APPEARANCE_KEY);if(stored==='dark'||stored==='light')return stored;}catch{}return memoryPreference;}
function apply(theme:Appearance){const root=document.documentElement;root.dataset.theme=theme;root.style.colorScheme=theme;const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');if(meta)meta.content=getComputedStyle(root).getPropertyValue('--color-bg').trim();}
export function AppearanceControl({inline=false}:{inline?:boolean}){
 const [theme,setTheme]=useState<Appearance>('light');
 useEffect(()=>{const system=matchMedia('(prefers-color-scheme: dark)');const sync=()=>{const current=preferredAppearance(readPreference(),system.matches);setTheme(current);apply(current);};sync();const changed=(event:StorageEvent)=>{if(event.key===APPEARANCE_KEY||event.key===null){memoryPreference=event.newValue==='light'||event.newValue==='dark'?event.newValue:null;sync();}};system.addEventListener('change',sync);window.addEventListener('storage',changed);window.addEventListener(APPEARANCE_EVENT,sync);return()=>{system.removeEventListener('change',sync);window.removeEventListener('storage',changed);window.removeEventListener(APPEARANCE_EVENT,sync);};},[]);
 function toggle(){const next=theme==='light'?'dark':'light';memoryPreference=next;try{localStorage.setItem(APPEARANCE_KEY,next)}catch{}apply(next);setTheme(next);window.dispatchEvent(new Event(APPEARANCE_EVENT));}
 return <div className={inline?'appearance-inline':'appearance-fallback'} data-appearance-slot={inline?'true':undefined}><button type="button" className="theme-control" onClick={toggle} role="switch" aria-checked={theme==='dark'} aria-label="Dark mode" title="Change appearance"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.6A8.8 8.8 0 0 1 8.4 4a8.8 8.8 0 1 0 11.6 11.6Z"/></svg><span>Dark mode</span><span aria-hidden="true">{theme==='dark'?'On':'Off'}</span></button></div>;
}
