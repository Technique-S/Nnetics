// Explicit local simulation registry. These are identifiers, never live quotes.
export const BILLING_ASSETS = [
    {id:"nep141:wrap.near",chain:"NEAR",symbol:"NEAR",decimals:24,nearPerUnit:"1"},
    {id:"nep141:usdc.near",chain:"NEAR",symbol:"USDC",decimals:6,nearPerUnit:"0.25"},
    {id:"nep141:usdt.tether-token.near",chain:"NEAR",symbol:"USDT",decimals:6,nearPerUnit:"0.25"},
    {id:"eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",chain:"Ethereum",symbol:"USDC",decimals:6,nearPerUnit:"0.25"},
    {id:"eip155:1/slip44:60",chain:"Ethereum",symbol:"ETH",decimals:18,nearPerUnit:"750"},
] as const;
export const NEAR_ASSET=BILLING_ASSETS[0].id;
export const INVOICE_DENOMINATIONS=["NEAR","USDC","USDT","ETH","USD","EUR","GBP","NGN"] as const;
const aliases:Record<string,string>={near:NEAR_ASSET,"usdc-ethereum":BILLING_ASSETS[3].id,eth:BILLING_ASSETS[4].id};
export function billingAsset(id:string){return BILLING_ASSETS.find(a=>a.id===(aliases[id]??id));}
export function decimalUnits(value:string,decimals:number):bigint {
    if(typeof value!=="string"||!/^\d+(?:\.\d+)?$/.test(value)||value.length>80)throw Error("Enter a positive exact decimal amount.");
    const [whole,fraction=""]=value.split(".");
    if(fraction.length>decimals)throw Error(`This asset supports at most ${decimals} decimal places.`);
    const units=BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,"0"));
    if(units<=0n)throw Error("Enter a positive exact decimal amount.");
    return units;
}
export function unitsDecimal(units:bigint,decimals:number):string {
    const text=units.toString().padStart(decimals+1,"0");
    return decimals?`${text.slice(0,-decimals)}.${text.slice(-decimals)}`.replace(/\.?0+$/,""):text;
}
export function normalizeInvoiceAmount(amount:string,currency:string){
    if(!INVOICE_DENOMINATIONS.includes(currency as typeof INVOICE_DENOMINATIONS[number]))throw Error("Select a supported invoice denomination.");
    const precision=BILLING_ASSETS.find(a=>a.symbol===currency)?.decimals??2;
    return unitsDecimal(decimalUnits(amount,precision),precision);
}
export function parseNaturalBill(text:string):{amount?:string;asset?:string;ambiguousDollar:boolean} {
    const explicit=Array.from(text.matchAll(/\b(\d+(?:\.\d+)?)\s*(NEAR|USDC|USDT|USD|ETH|EUR|GBP|NGN)\b/gi));
    const dollar=/\$\s*(\d+(?:\.\d+)?)/.exec(text);
    return {amount:explicit.length===1?explicit[0][1]:dollar?.[1],asset:explicit.length===1?explicit[0][2].toUpperCase():undefined,ambiguousDollar:!!dollar};
}
export function validateInvoiceClaim(text:string,amount:string,currency:string,confirmed:boolean){
    normalizeInvoiceAmount(amount,currency);
    if(/\d(?:\.\d+)?\s*(?:or|to|[-–])\s*\d+(?:\.\d+)?\s*(?:NEAR|USDC|USDT|USD|ETH|EUR|GBP|NGN)\b/i.test(text))throw Error("Clarify one exact invoice amount; a range cannot be approved.");
    const money=parseNaturalBill(text);
    if(money.ambiguousDollar&&!confirmed)throw Error("Currency conflict: confirm the invoice denomination and preferred payout cryptocurrency for the $ amount.");
    const claims=Array.from(text.matchAll(/(?:\$\s*(\d+(?:\.\d+)?))|\b(\d+(?:\.\d+)?)\s*(NEAR|USDC|USDT|USD|ETH|EUR|GBP|NGN)\b/gi));
    for(const match of claims){
        if(decimalUnits(match[1]??match[2],24)!==decimalUnits(amount,24))throw Error("Confirmed invoice amount conflicts with the original text. Clarify the source amount.");
        if(match[3]&&match[3].toUpperCase()!==currency)throw Error("Currency conflict: confirmed denomination conflicts with the original text.");
    }
}
