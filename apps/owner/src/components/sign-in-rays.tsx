"use client";

import {useEffect, useState} from 'react';
import {useReducedMotion} from 'motion/react';
import {LightRays} from './ui/light-rays';

/** Decorative sign-in background; does not participate in wallet or demo state. */
export function SignInRays() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  return <div className="signin-light-rays" aria-hidden="true" data-signin-light-rays="true">
    <div className="signin-rays-base"/>
    <LightRays count={5} color="var(--action)" speed={24} blur={28} length="100vh" staticMode={!!reduced || !visible}/>
  </div>;
}
