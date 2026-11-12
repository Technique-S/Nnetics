"use client";
import {useEffect,useState} from 'react';

// One Motion engine; small screens and reduced-motion users get immediate changes.
export function useCultMotion() {
 const [settings,setSettings]=useState({small:true,reduced:true,seconds:0});
 useEffect(()=>{
  const media=window.matchMedia('(max-width:760px)');
  const motion=window.matchMedia('(prefers-reduced-motion:reduce)');
  const update=()=>{
   const token=getComputedStyle(document.documentElement).getPropertyValue('--motion-panel');
   setSettings({small:media.matches,reduced:motion.matches,seconds:(parseFloat(token)||220)/1000});
  };
  update();media.addEventListener('change',update);motion.addEventListener('change',update);
  return()=>{media.removeEventListener('change',update);motion.removeEventListener('change',update);};
 },[]);
 const calm=settings.reduced||settings.small;
 return {calm,duration:calm?0:settings.seconds,ease:[.22,.72,.24,1] as const};
}
