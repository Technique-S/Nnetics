"use client";

import {Children, useEffect, useState, type ComponentPropsWithoutRef, type ReactNode} from 'react';
import {useReducedMotion} from 'motion/react';
import {BentoGrid} from '../ui/bento-grid';
import {MagicCard} from '../ui/magic-card';
import {AnimatedList} from '../ui/animated-list';
import {NumberTicker} from '../ui/number-ticker';
import {TypingAnimation} from '../ui/typing-animation';
import {useDemoUI} from './demo-context';

export function DemoGrid(props: ComponentPropsWithoutRef<'div'> & {children: ReactNode}) {
  return useDemoUI() ? <BentoGrid {...props} data-magic-bento="true"/> : <div {...props}/>;
}

export function DemoCard({children, ...props}: ComponentPropsWithoutRef<'section'>) {
  const demo = useDemoUI();
  return <section {...props}>{demo ? <MagicCard className="demo-magic-card" gradientColor="var(--selection)"
    gradientFrom="var(--action)" gradientTo="var(--border)" gradientOpacity={0.18} gradientSize={220}>
    {children}
  </MagicCard> : children}</section>;
}

export function DemoActivity(props: ComponentPropsWithoutRef<'div'> & {children: ReactNode}) {
  return useDemoUI() ? <AnimatedList {...props} data-magic-list="true"/> : <div {...props}/>;
}

export function DemoRecordFeed({children}: {children: ReactNode}) {
  const demo = useDemoUI();
  return demo && Children.count(children) <= 50
    ? <AnimatedList className="demo-record-feed">{children}</AnimatedList>
    : children;
}

/** Integers only: no monetary string is ever passed through floating point. */
export function DemoCount({value}: {value: number}) {
  const demo = useDemoUI();
  if (!demo || !Number.isSafeInteger(value) || value < 0) return <>{value}</>;
  return <output aria-label={String(value)} className="demo-count" data-count={value}>
    <NumberTicker value={value} aria-hidden="true"/>
  </output>;
}

/** Full copy is present immediately for AT, selection, layout and reduced motion. */
export function DemoTyping({children, animate = true}: {children: string; animate?: boolean}) {
  const demo = useDemoUI();
  const reduced = useReducedMotion();
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    if (!demo || !animate) return;
    const timer = setTimeout(() => setComplete(true), 650);
    const finish = () => setComplete(true);
    window.addEventListener('hashchange', finish);
    window.addEventListener('keydown', finish, {once: true});
    return () => {clearTimeout(timer); window.removeEventListener('hashchange', finish); window.removeEventListener('keydown', finish);};
  }, [demo, animate]);
  if (!demo || reduced || !animate || complete) return <>{children}</>;
  return <span className="demo-typing" onPointerDown={() => setComplete(true)} data-magic-typing="true">
    <span className="demo-typing-full">{children}</span>
    <span className="demo-typing-presentation" aria-hidden="true"><TypingAnimation duration={Math.min(12, 500 / Math.max(1, children.length))}
      startOnView={false} showCursor={false} className="demo-typing-text">{children}</TypingAnimation></span>
  </span>;
}
