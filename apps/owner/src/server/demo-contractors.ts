import path from "node:path";
import {ContractorRecordStore} from "./contractor-records.ts";
export class DemoContractorStore extends ContractorRecordStore {constructor(file:string){super(file,"simulation");}}
let singleton:DemoContractorStore|undefined;
export function demoContractors(){return singleton??=new DemoContractorStore(path.resolve(/* turbopackIgnore: true */process.env.NNETICS_DEMO_PORTAL_DB||"../../artifacts/demo/contractors.db"));}
