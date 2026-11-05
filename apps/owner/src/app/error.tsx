"use client";
export default function Recovery({reset}:{error:Error & {digest?:string};reset:()=>void}){
 const content=<main className="loading-screen signin-surface"><h1>Your workspace needs another moment</h1><p>Something went wrong on our side. Please try again in a moment.</p><p>If you were checking a payment, check its existing record before requesting another payment.</p><button type="button" className="button primary" onClick={reset}>Reload this view</button><a href="/">Return to workspace</a></main>;
 return content;
}
