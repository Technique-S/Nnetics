/** Translate failures for display only. Never changes retry, authorization or payment state. */
export type MessageContext = "general" | "payment";
export const GENERIC_MESSAGE = "Something went wrong on our side. Please try again in a moment.";
export function getUserMessage(error:unknown,context:MessageContext="general"):string{
 const text=error instanceof Error?error.message:typeof error==="string"?error:"";
 const matches=(pattern:RegExp)=>pattern.test(text);
 if(matches(/acceptance.*already submitted/i))return "This one-use acceptance was already submitted. Check its recorded owner transaction; another signature is not allowed.";
 if(matches(/outside the reviewed acceptance scope/i))return "This action is outside the approved storage funding acceptance. No other owner transaction is allowed.";
 if(matches(/Owner transactions require a valid hash-verified/i))return "Owner signing needs a valid reviewed acceptance plan. Check owner transaction configuration; payment execution remains separate.";
 if(matches(/Meteor rejected or closed/))return "Meteor rejected or closed the request. Submission is not confirmed; check the recorded owner transaction before signing again.";
 if(matches(/Meteor transaction approval timed out/))return "Meteor approval timed out. Submission is not confirmed; check the recorded owner transaction before signing again.";
 if(matches(/Conflicting wallet transaction evidence|(?:Owner transaction|Transaction differs from).*manual review required/i))return "This owner transaction needs manual review. Keep all recorded transaction IDs; do not sign a replacement.";
 if(matches(/Wallet returned a different transaction/))return "Meteor reported a different transaction. Both transaction IDs need manual review; do not sign a replacement.";
 if(matches(/Owner transaction outcome is unknown|recorded owner request|prepared owner request/))return "This owner transaction is not confirmed. Check its recorded transaction status before requesting another signature.";
 if(matches(/unsubmitted review|owner transaction review expired|prepared transaction expired/))return "This review was not submitted. Cancel the unsubmitted review, then check the account and transaction details again.";
 if(matches(/review cancelled/))return "Review cancelled. No wallet transaction was requested.";
 if(matches(/fee allowance|balance does not cover/))return "The account must cover the exact deposit and displayed fee allowance. Check its balance and current fees before proceeding.";
 if(matches(/Conflicting amount/i))return "Your bill contains more than one amount. Confirm one amount before submitting.";
  // Demo workspace failures. These are checked before the generic amount,
  // limit and pause rules so a simulated failure never reads as a live one.
  if(matches(/demo vault (?:is|was) paused/i))return "The demo vault is paused. Resume it in Vault & Controls before preparing a payment.";
  if(matches(/canonical unsigned integer|exact whole number of yoctoNEAR/i))return "Enter one exact positive amount in NEAR, with no more than 24 decimal places.";
  if(matches(/already been prepared or paid/i))return "This invoice has already been prepared or paid. Open Activity for the existing record.";
  if(matches(/does not match the prepared payment/i))return "This confirmation no longer matches the prepared payment. Prepare it again and confirm it once.";
  if(matches(/no longer awaiting confirmation/i))return "This payment is no longer awaiting confirmation. Open Activity for its record.";
  if(matches(/Insufficient demo funds/i))return "There isn't enough simulated NEAR for this payment and its demo fee. Fund the demo vault and try again.";
  if(matches(/exceeds the demo spending limit/i))return "This amount is above the demo spending limit. Raise the limit in Settings or use a smaller amount.";
  if(matches(/reserved demo funds/i))return "The reserved demo funds for this payment were released. Prepare the payment again.";
 if(matches(/configuration changed|workspace configuration changed/i))return "The workspace configuration changed. Previous records were cleared; reopen your authorized workspace.";
 if(matches(/Wallet switched/i))return "Choose your wallet account in Meteor, then connect again.";

 if(matches(/unknown[ _-]outcome|ambiguous outcome|unresolved.*(?:payment|transfer)|awaiting.chain|transaction.*timed out|outcome.*unknown|(?:payment|transfer|transaction).*(?:not|couldn't).*confirm|(?:not|couldn't).*confirm.*(?:payment|transfer|transaction)/i))return "The payment result isn't confirmed. Check payment history before trying again.";
 if(matches(/Your message was accepted/i))return "Your wallet is verified. We couldn't load your workspace. Retry verification without signing again.";
 if(matches(/contract.*(?:reject|panic)|CONTRACT_EXECUTION_ERROR/i))return "The contract rejected this operation. Review the recorded details before requesting another transaction.";

 if(matches(/owner transactions are disabled|signing is disabled|transactions?.*(?:disabled|not authorized)/i))return "Owner transactions are disabled. No wallet request was made.";
 if(matches(/checkpoint.*(?:expired|future|ahead|valid|reviewed)|recovery.*checkpoint/i))return "Payments are blocked until the owner refreshes and reviews the recovery security check. No payment was sent.";
 if(matches(/rate.limit|HTTP 429/i))return "The network provider is limiting requests. Wait before retrying verification; your session is retained.";
 if(matches(/network request timed out|verification timed out/i))return "The network request timed out. Retry verification; your session is retained.";
 if(matches(/private (?:link|access|contractor session).*(?:revoked|expired|invalid)|invalid private link/i))return "This private link has expired or was revoked. Ask the owner for a new link.";
 if(matches(/five.hour.*expir/i))return "Your five-hour session has expired. Sign in again to continue.";

 if(text==='We couldn’t confirm this transaction yet. Check its status before trying again.')return "This owner transaction is not confirmed. Check its recorded transaction status before requesting another signature.";
 if(matches(/verification could not finish within the waiting limit/i))return "Verification could not finish within the waiting limit. Retry verification.";
 if(matches(/provider.*denied access|providers denied access/i))return "The network provider denied access. Check provider configuration before retrying.";
 if(matches(/provider TLS/i))return "The provider connection could not be verified. Check provider configuration.";
 if(matches(/contract rejected the recorded transaction/i))return "The contract rejected this transaction. Review its details before trying again.";
 if(matches(/Meteor supports message login only/i))return "Meteor transaction signing is not supported by this connector. No transaction was requested.";
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
 if(matches(/mainnet|wrong network|different network|testnet account/i))return "Switch your wallet to the network shown on this page, then connect again.";
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
 if(/^(Checking vault balance|Preparing funding request|Checking transaction status|Preparing wallet transaction|Checking the approved transaction on the network|Loading contractor records|Loading your billing records|Loading verified workspace records|Checking your saved session)…$/.test(value))return value;
 if(/wallet|approval|sign/i.test(value))return "Waiting for your wallet approval…";
 if(/confirm|receipt|chain|final/i.test(value))return "Checking the result…";
 if(/workspace|organization|record|snapshot/i.test(value))return "Loading your workspace…";
 if(/verify|verification|proof|key/i.test(value))return "Checking your account…";
 return "Working on your request…";
}
