"use client";

import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {SmoothCursor} from '../ui/smooth-cursor';

const DemoContext = createContext(false);
export const useDemoUI = () => useContext(DemoContext);

/** URL-only presentation boundary. Never reads authentication or financial state. */
export function DemoPresentation({children}: {children: ReactNode}) {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    const sync = () => {
      const url = new URL(location.href);
      const enabled = url.searchParams.get('mode') === 'demo' || url.pathname.startsWith('/demo/');
      setDemo(enabled);
      if (enabled) document.documentElement.dataset.demoUi = 'true';
      else delete document.documentElement.dataset.demoUi;
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      delete document.documentElement.dataset.demoUi;
    };
  }, []);
  return <DemoContext value={demo}>{children}{demo && <SmoothCursor
    springConfig={{damping: 45, stiffness: 1000, mass: 0.2, restDelta: 0.01}}
    cursor={<svg width="20" height="25" viewBox="0 0 20 25" fill="none" aria-hidden="true"><path d="M2 2v19l5-6 4 8 3-1-4-8h8L2 2Z" fill="var(--action)" stroke="var(--surface)" strokeWidth="1.5" strokeLinejoin="round"/></svg>}
  />}</DemoContext>;
}
