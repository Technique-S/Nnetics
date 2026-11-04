/** Translate failures for display only. Never changes retry, authorization or payment state. */
export type MessageContext = "general" | "payment";
export const GENERIC_MESSAGE = "Something went wrong on our side. Please try again in a moment.";
export function getUserMessage(error:unknown,context:MessageContext="general"):string{
 const text=error instanceof Error?error.message:typeof error==="string"?error:"";
 const matches=(pattern:RegExp)=>pattern.test(text);
 if(matches(/unknown[ _-]outcome|ambiguous outcome|unresolved.*(?:payment|transfer)|awaiting.chain|transaction.*timed out|outcome.*unknown|(?:payment|transfer|transaction).*(?:not|couldn't).*confirm|(?:not|couldn't).*confirm.*(?:payment|transfer|transaction)/i))return "The payment result isn't confirmed. Check payment history before trying again.";
 if(matches(/transfer[ _-]failed|transfer.*failed|payment.*failed/i))return "The transfer failed. Check the payment record before requesting another payment.";
 if(matches(/already paid|already.*confirmed payment/i))return "This work has already been paid. Open payment history to view the payment.";
 if(matches(/duplicate|already received|already submitted|already.*invoice|already.*job/i))return "This invoice was already received. Check its status before sending it again.";
 if(matches(/session.*expir|session.*ended|signed out|sign in to continue|not authenticated|session.*invalid/i))return "Your session has ended. Sign in again to continue.";
 if(matches(/challenge.*expir|message.*expir|proof.*expir/i))return "This wallet request expired. Connect again to get a new request.";
 if(matches(/cancel|reject.*wallet|wallet.*reject|user.*reject|reject.*user|declin|denied.*user/i))return "You cancelled the wallet request. You can try again when ready.";
 if(matches(/insufficient|not enough|balance.*low/i))return "There isn't enough NEAR for this request and its fees. Add funds before trying again.";
 if(matches(/currency|USDC|USD|EUR|GBP/i))return "This bill mentions another currency. Ask the owner to clarify it; no conversion has been made.";
 if(matches(/limit|cap exceeded|over.*budget|budget.*exceed/i)&&!matches(/waiting limit|rate.limit/i))return "This amount is above the approved limit. Check the agreement or ask the owner to update it.";
 if(matches(/protocol|compatibility/i))return "This network version isn't approved for payments yet. Ask the owner to complete the review.";
 if(matches(/paused|revoked.*agent|agent.*revoked|worker.*revoked/i))return "Payments are paused. The owner can review payment access in Balance.";
 if(matches(/permission|only.*owner|owner.*only|not authoriz|access denied|read.only|viewer/i))return "You don't have permission to make this change. Use an approved account or contact the owner.";
 if(matches(/invalid.*account|valid NEAR account|invalid.*address|account.*format/i))return "Enter a valid NEAR account ID and check it before continuing.";
 if(matches(/mainnet|wrong network|testnet account/i))return "Switch your wallet to the network shown on this page, then connect again.";
 if(matches(/extension|Meteor.*available|Meteor.*install|wallet.*missing/i))return "Open this page in the browser with Meteor installed. Unlock the wallet and allow access to this site.";
 if(matches(/signature|wallet.*different|account.*changed|key.*removed|key.*revoked|wallet.*control/i))return "Your wallet access couldn't be verified. Check the selected account and sign in again.";
 if(matches(/1 MB|file.*large|upload.*size/i))return "Choose a file no larger than 1 MB.";
 if(matches(/amount.*positive|exact NEAR|decimal|amount.*invalid/i))return "Enter one exact positive amount in NEAR, with no more than 24 decimal places.";
 if(matches(/transaction.*disabled|deployment.*disabled|review.*required|authorization.*required/i))return "This action needs owner review and authorization before it can continue.";
 if(matches(/rate.limit|timeout|timed out|connection|provider|RPC|unreadable|unavailable|HTTP|waiting limit/i))return context==="payment"?"We couldn't confirm the payment result. Check payment history before repeating the request.":"We couldn't check your account right now. Please try again shortly.";
 return context==="payment"?"The payment result needs checking. Open payment history before repeating the request.":GENERIC_MESSAGE;
}

/** Public action progress: provider messages and transaction internals never become UI text. */
export function getProgressMessage(value:string):string{
 if(/wallet|approval|sign/i.test(value))return "Waiting for your wallet approval…";
 if(/confirm|receipt|chain|final/i.test(value))return "Checking the result…";
 if(/workspace|organization|record|snapshot/i.test(value))return "Loading your workspace…";
 if(/verify|verification|proof|key/i.test(value))return "Checking your account…";
 return "Working on your request…";
}
