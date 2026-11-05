"use client";
import "./globals.css";
import "./workspace.css";
import "./tokens.css";
import {appearanceBootstrap} from "../data/appearance";
import {AppearanceControl} from "./appearance-control";
export default function Recovery({reset}:{error:Error & {digest?:string};reset:()=>void}){
 const content=<main className="loading-screen signin-surface"><h1>Nnetics needs another moment</h1><p>Something went wrong on our side. Please try again in a moment.</p><p>If you were checking a payment, check its existing record before requesting another payment.</p><button type="button" className="button primary" onClick={reset}>Reload this view</button><a href="/">Return to workspace</a></main>;
 return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:appearanceBootstrap}}/></head><body>{content}<AppearanceControl/></body></html>;
}
