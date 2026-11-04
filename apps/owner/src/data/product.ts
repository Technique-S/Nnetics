export const BRAND_NAME = "Nnetics";
export const TAGLINE = "Pay approved contractor work within limits you set.";
/** Metadata origin only. Never substitutes the wallet-signing origin or a local host. */
export function getSiteOrigin(value = process.env.NEXT_PUBLIC_SITE_URL):string|undefined {
 if(!value)return undefined;
 const url=new URL(value);
 if(!["http:","https:"].includes(url.protocol)||url.origin!==value||url.username||url.password||["localhost","127.0.0.1","0.0.0.0","[::1]"].includes(url.hostname))throw new Error("Set NEXT_PUBLIC_SITE_URL to an assigned production origin without a trailing slash.");
 return url.origin;
}
