"use client";
import {useEffect,useRef} from "react";
import type {ButtonHTMLAttributes, ReactNode} from "react";

export type ActionState = "idle" | "loading" | "success" | "error";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  state?: ActionState;
  pending?: boolean;
  busy?: boolean;
  pendingLabel?: ReactNode;
  retryLabel?: ReactNode;
  successLabel?: ReactNode;
};

/** Presentation only: never starts, retries or replays a request on its own. */
export function ActionButton({state="idle",pending=false,busy=false,pendingLabel,retryLabel="Try again",successLabel,children,disabled,...props}:Props){
  const initiated=useRef(false);
  useEffect(()=>{if(!busy&&!pending)initiated.current=false;},[busy,pending]);
  const loading=pending||state==="loading"||(busy&&initiated.current);
  const label=loading?(pendingLabel??children):state==="error"?retryLabel:state==="success"?(successLabel??children):children;
  return <button {...props} onClick={event=>{initiated.current=true;props.onClick?.(event);}} disabled={disabled||loading} aria-busy={loading} data-action-state={loading?"loading":state}>
    {loading&&<span className="action-spinner" aria-hidden="true"/>}{label}
  </button>;
}
