/** Visual preference only. Never reads or modifies auth, wallet or organization state. */
export type Appearance='light'|'dark';
export const APPEARANCE_KEY='nnetics-appearance';
export const APPEARANCE_EVENT='nnetics-appearance-change';
export function preferredAppearance(value:unknown,systemDark:boolean):Appearance{return value==='light'||value==='dark'?value:systemDark?'dark':'light';}
export const appearanceBootstrap=`(()=>{const r=document.documentElement;let p;try{p=localStorage.getItem('nnetics-appearance')}catch{}const d=typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches;const theme=p==='light'||p==='dark'?p:d?'dark':'light';r.dataset.theme=theme;r.style.colorScheme=theme;const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=getComputedStyle(r).getPropertyValue('--color-bg').trim();})();`;
