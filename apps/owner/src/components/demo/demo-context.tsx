"use client";

import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';

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
  return <DemoContext value={demo}>{children}</DemoContext>;
}
