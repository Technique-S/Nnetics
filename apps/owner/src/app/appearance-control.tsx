"use client";

import {useEffect, useState} from 'react';
import {AnimatedThemeToggler} from '../components/ui/animated-theme-toggler';
import {APPEARANCE_KEY, APPEARANCE_EVENT, preferredAppearance, type Appearance} from '../data/appearance';

let memoryPreference: Appearance | null = null;
function readPreference() {
  if (memoryPreference) return memoryPreference;
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch { /* Storage may be unavailable in private or embedded contexts. */ }
  return null;
}
function apply(theme: Appearance) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(root).getPropertyValue('--color-bg').trim();
}

/** Shares the existing appearance store with every controlled Magic UI button. */
export function AppearanceControl({inline = false}: {inline?: boolean}) {
  const [theme, setTheme] = useState<Appearance>('light');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const system = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const current = preferredAppearance(readPreference(), system.matches);
      setTheme(current);
      apply(current);
    };
    const changed = (event: StorageEvent) => {
      if (event.key === APPEARANCE_KEY || event.key === null) {
        memoryPreference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
        sync();
      }
    };
    sync();
    setMounted(true);
    system.addEventListener('change', sync);
    window.addEventListener('storage', changed);
    window.addEventListener(APPEARANCE_EVENT, sync);
    return () => {
      system.removeEventListener('change', sync);
      window.removeEventListener('storage', changed);
      window.removeEventListener(APPEARANCE_EVENT, sync);
    };
  }, []);
  function changeTheme(next: Appearance) {
    memoryPreference = next;
    try { localStorage.setItem(APPEARANCE_KEY, next); } catch { /* Retain the in-memory preference. */ }
    apply(next);
    setTheme(next);
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
  }
  return (
    <div className={inline ? 'appearance-inline' : 'appearance-fallback'} data-appearance-slot={inline ? 'true' : undefined}>
      <AnimatedThemeToggler
        className="theme-control"
        duration={500}
        theme={theme}
        onThemeChange={changeTheme}
        disabled={!mounted}
        data-appearance-ready={mounted}
        role="switch"
        aria-checked={theme === 'dark'}
        aria-label="Dark mode"
        title="Change appearance"
      >
        <span>Dark mode</span>
        <span className="theme-control-status" aria-hidden="true">{theme === 'dark' ? 'On' : 'Off'}</span>
      </AnimatedThemeToggler>
    </div>
  );
}
