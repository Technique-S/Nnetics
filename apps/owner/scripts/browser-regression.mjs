import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin=process.env.NNETICS_BROWSER_BASE_URL||'http://127.0.0.1:3120';
const url=new URL(origin);
if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.origin!==origin)throw Error('Use an exact local 127.0.0.1 HTTP origin for isolated mutation tests.');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-browser-'));
const env={...process.env,CI:'true',NNETICS_BROWSER_BASE_URL:origin,NNETICS_APP_ORIGIN:origin,
 NNETICS_DATABASE:path.join(directory,'invoices.db'),NNETICS_IDENTITY_DATABASE:path.join(directory,'identities.db'),NNETICS_CONTRACTOR_DATABASE:path.join(directory,'contractors.db'),NNETICS_DEMO_PORTAL_DB:path.join(directory,'portal.db'),NNETICS_DEMO_WORKSPACE_DB:path.join(directory,'workspace.db'),
 NNETICS_TRANSACTIONS_AUTHORIZED:'',NNETICS_OWNER_TRANSACTIONS_AUTHORIZED:'',NNETICS_PAYMENT_EXECUTION_AUTHORIZED:'',NNETICS_PROVISIONING_ENABLED:'',OPENROUTER_API_KEY:'',NNETICS_RUN_REAL_MODEL_ACCEPTANCE:'',NNETICS_AGENT_TRACE:'0'};
const child=spawn(process.execPath,[path.join(app,'node_modules/@playwright/test/cli.js'),'test',...process.argv.slice(2)],{cwd:app,env,stdio:'inherit',windowsHide:true});
child.once('error',error=>{console.error(error.message);process.exitCode=1;});
child.once('exit',code=>{process.exitCode=code??1;});
