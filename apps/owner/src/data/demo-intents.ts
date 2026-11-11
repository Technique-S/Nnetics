// Simulation DTOs, deliberately unrelated to 1Click wire responses.
import {BILLING_ASSETS} from "./billing-assets.ts";
export type IntentState = "CREATED" | "AWAITING_APPROVAL" | "APPROVED" | "QUOTE_READY" | "EXECUTING" | "COMPLETED" | "FAILED" | "EXPIRED" | "REFUNDED";
export type IntentScenario = "success" | "failure" | "refund" | "quote-failure";
export const DEMO_ASSETS = [
    {id:"near", chain:"NEAR", symbol:"NEAR", decimals:24, nearPerUnit:"1"},
    {id:"usdc-ethereum", chain:"Ethereum", symbol:"USDC", decimals:6, nearPerUnit:"0.25"},
    {id:"eth", chain:"Ethereum", symbol:"ETH", decimals:18, nearPerUnit:"750"},
    ...BILLING_ASSETS.filter(a=>a.symbol==="USDT"||a.id==="nep141:usdc.near"),
] as const;
export interface SimulatedIntent {
    id:string; reference:string; billId:string; organization:string; workspace:string;
    state:IntentState; sourceAsset:string; sourceChain:string; sourceSymbol:string;
    sourceAmount:string; destinationAmount:string; destinationAsset:string; destinationChain:string;
    destinationSymbol?:string;sourceAssetId?:string;destinationAssetId?:string;invoiceAmount?:string;invoiceCurrency?:string;
    deliveredAmount?:string;deliveredAssetId?:string;quoteType?:"EXACT_OUTPUT";
    recipient:string; walletVersion:number; amount:string; fee:string; total:string;
    rate:string; solver:string; expiresAt:number; authorizationExpiresAt:number;
    scenario:IntentScenario; settleAt:number; reason:string; createdAt:number;
}
export interface IntentEvent {sequence:number; state:IntentState; at:number; detail:string;}
export interface IntentView {intent:SimulatedIntent; audit:IntentEvent[];}
export interface DemoIntentsAdapter {
    quote(workspaceToken:string,ownerToken:string,input:{billId:string;sourceAsset:string;key:string;scenario:IntentScenario}):IntentView;
    authorize(workspaceToken:string,ownerToken:string,id:string):IntentView;
    execute(workspaceToken:string,ownerToken:string,id:string):IntentView;
    list(workspaceToken:string,ownerToken:string):IntentView[];
}
