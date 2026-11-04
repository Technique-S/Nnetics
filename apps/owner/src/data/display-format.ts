import {formatNear} from "./owner-adapter.ts";
/** Input remains an exact base-unit string. No rounding, floats or Intl for tokens. */
const dates=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
export function displayAmount(value:string,asset="NEAR"){
 return `${formatNear(value)} ${asset}`;
}
export function displayDate(value:string|number|Date){const date=new Date(value);return Number.isNaN(date.valueOf())?"Date unavailable":dates.format(date);}
