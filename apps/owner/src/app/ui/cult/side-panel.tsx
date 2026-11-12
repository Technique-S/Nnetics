"use client";
// Adapted from Cult UI side-panel. MIT; see LICENSE.cult-ui.md.
// This is an inline disclosure, never a modal, navigation or approval surface.
import {forwardRef,type ReactNode} from 'react';
import {motion,MotionConfig} from 'motion/react';
import useMeasure from 'react-use-measure';
import {cn} from './utils';
import {useCultMotion} from './motion';

interface Props {
 panelOpen:boolean;handlePanelOpen:()=>void;renderButton:(toggle:()=>void)=>ReactNode;
 children:ReactNode;id:string;labelledBy:string;className?:string;
}
export const SidePanel=forwardRef<HTMLDivElement,Props>(({panelOpen,handlePanelOpen,renderButton,children,id,labelledBy,className},ref)=>{
 const [measureRef,bounds]=useMeasure(),{calm,duration,ease}=useCultMotion();
 return <MotionConfig reducedMotion="user" transition={{duration,ease}}><div ref={ref} className={cn('cult-side-panel',className)} data-state={panelOpen?'open':'closed'}
  onKeyDown={event=>{if(event.key==='Escape'&&panelOpen){event.preventDefault();event.stopPropagation();handlePanelOpen();event.currentTarget.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus();}}}>
  <div className="cult-side-trigger">{renderButton(handlePanelOpen)}</div>
  <motion.div id={id} role="region" aria-labelledby={labelledBy} hidden={!panelOpen}
   className="cult-side-content" initial={false} animate={{height:calm?'auto':panelOpen?bounds.height||'auto':0,opacity:panelOpen?1:0}} transition={{duration,ease}}>
   <div ref={measureRef}>{children}</div>
  </motion.div>
 </div></MotionConfig>;
});
SidePanel.displayName='SidePanel';
