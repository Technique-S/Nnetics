"use client";
import {useEffect,useState} from 'react';
export function OperationFeedback({active,message}:{active:boolean;message:string}) {
  const [slow,setSlow]=useState(false);
  useEffect(()=>{setSlow(false);if(!active)return;const timer=setTimeout(()=>setSlow(true),10_000);return()=>clearTimeout(timer);},[active]);
  return <p role="status" aria-live="polite" aria-atomic="true">{active ? slow && !message.includes('wallet approval') ? 'This process is taking longer than expected. We’re still trying.' : message : ''}</p>;
}
