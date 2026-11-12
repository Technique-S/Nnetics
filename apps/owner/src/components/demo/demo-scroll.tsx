"use client";

import {forwardRef, useEffect, useImperativeHandle, useRef, useState, type ComponentPropsWithoutRef, type ReactNode} from 'react';
import {ProgressiveBlur} from '../ui/progressive-blur';
import {useDemoUI} from './demo-context';

export function DemoSidebarScroll({children}: {children: ReactNode}) {
  return useDemoUI() ? <DemoScroll className="demo-sidebar-scroll">{children}</DemoScroll> : children;
}

export const DemoScroll = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function DemoScroll(
  {children, className, onScroll, ...props}, forwardedRef,
) {
  const demo = useDemoUI();
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({top: false, bottom: false});
  useImperativeHandle(forwardedRef, () => ref.current!);
  function update() {
    const el = ref.current;
    if (el) setEdges({top: el.scrollTop > 3, bottom: el.scrollHeight - el.clientHeight - el.scrollTop > 3});
  }
  useEffect(() => {
    if (!demo || !ref.current) return;
    const el = ref.current;
    let frame = 0;
    const schedule = () => {cancelAnimationFrame(frame); frame = requestAnimationFrame(update);};
    const resize = new ResizeObserver(schedule);
    resize.observe(el);
    const mutations = new MutationObserver(schedule);
    mutations.observe(el, {childList: true, subtree: true, characterData: true});
    update();
    return () => {cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect();};
  }, [demo, children]);
  const content = <div {...props} className={className} ref={ref} onScroll={event => {if (demo) update(); onScroll?.(event);}}>{children}</div>;
  if (!demo) return content;
  return <div className={`demo-scroll-frame ${className?.includes('sidebar') ? 'demo-sidebar-frame' : ''}`} data-demo-scroll="true">
    {content}
    <div className="demo-scroll-edges" aria-hidden="true">
      {edges.top && <ProgressiveBlur className="demo-scroll-edge" position="top" height="10px" blurLevels={[0, 0.25, 0.5, 0.75, 1, 1, 1.5, 2]}/>}
      {edges.bottom && <ProgressiveBlur className="demo-scroll-edge" position="bottom" height="10px" blurLevels={[0, 0.25, 0.5, 0.75, 1, 1, 1.5, 2]}/>}
    </div>
  </div>;
});
