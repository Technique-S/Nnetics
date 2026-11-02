// Conservative text cross-check; no conversion or extraction of payment authority.
const foreignCurrencies = new RegExp(`\\b(?:${("AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BOV BRL BSD BTN BWP BYN BZD CAD CDF CHE CHF CHW CLF CLP CNY COP COU CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MXV MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD USN UYI UYU UYW UZS VED VES VND VUV WST XAF XAG XAU XBA XBB XBC XBD XCD XDR XOF XPD XPF XPT XSU XTS XUA YER ZAR ZMW ZWL ZWG USDC USDT BTC ETH SOL DAI XRP BNB TON ADA AVAX").split(" ").join("|")})\\b`);
export function currencyConflict(text: string): boolean {
  return foreignCurrencies.test(text) || /\b(?:USD|USDC|USDT|EUR|GBP|NGN|BTC|ETH|SOL|DAI|CAD|AUD|JPY|CNY|CHF|dollars?|euros?|pounds?|naira|bitcoin|ethereum)\b|[$€£₦¥]/i.test(text)
    || Array.from(text.matchAll(/^\s*(?:Currency|Asset):\s*([^\n\r]+)/gim)).some(m => m[1].trim().toUpperCase() !== "NEAR")
    || Array.from(text.matchAll(/^\s*Amount:\s*\d+(?:\.\d+)?\s+([A-Za-z]+)/gim)).some(m => m[1].toUpperCase() !== "NEAR");
}
export function requireNear(asset: string, text: string) {
  if (asset !== "NEAR" || currencyConflict(text)) throw Error("Currency conflict: only NEAR on testnet is supported. Clarify the source currency; no conversion has been made.");
}

