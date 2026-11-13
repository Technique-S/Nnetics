import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const [directory, code] = process.argv.slice(2);
const run = (...args) => { const r=spawnSync(args[0],args.slice(1),{encoding:'utf8'}); return r.status===0?r.stdout.trim():null; };
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const log=fs.readFileSync(path.join(directory,'verification.log'),'utf8');
const corePath=log.match(/^Verification evidence: (.+)$/m)?.[1]?.trim();
let core=null;
if(corePath && path.resolve(corePath).startsWith(path.resolve('artifacts/runs')+path.sep)) {
  const file=path.join(corePath,'logs/run.json');
  if(fs.existsSync(file))core=JSON.parse(fs.readFileSync(file,'utf8'));
}
const count=file=>fs.existsSync(file)?Number(fs.readFileSync(file,'utf8').match(/test result: ok\. (\d+) passed; 0 failed;/)?.[1]??0):0;
const unit=count('artifacts/provisioning/factory-unit.log');
const sandbox=count('artifacts/provisioning/sandbox.log');
const expected=['artifacts/provisioning/vault-provisioning.wasm','artifacts/provisioning/factory.wasm','artifacts/provisioning/SHA256SUMS'];
const inputs=['rust-toolchain.toml','.cargo/config.toml',...['vault','factory','sandbox'].map(n=>`contracts/${n}/Cargo.lock`)];
const dirty=run('git','status','--porcelain');
const failures=[];
if(Number(code)!==0)failures.push('verification command failed');
if(core?.status!=='passed'||!core.rust_unit_tests_passed||!core.sandbox_tests_passed)failures.push('complete passing core evidence missing');
if(unit===0)failures.push('factory unit tests missing or zero');
if(sandbox===0)failures.push('provisioning sandbox tests missing or zero');
if(!expected.every(fs.existsSync))failures.push('production artifacts or checksums missing');
if(dirty!=='')failures.push('source is dirty or Git provenance unavailable');
const valid=failures.length===0;
// Copy only public local-sandbox evidence, never environments, wallets or databases.
if(Number(code)===0)fs.cpSync('artifacts/provisioning',path.join(directory,'provisioning'),{recursive:true});
if(core)fs.copyFileSync(path.join(corePath,'logs/run.json'),path.join(directory,'core-run.json'));
const report={schemaVersion:1,status:valid?'PASS':'FAIL',failures,exitCode:valid?0:Number(code)||80,commit:run('git','rev-parse','HEAD'),sourceClean:dirty==='',sandboxVersion:process.env.NNETICS_SANDBOX_VERSION??'2.13.0',coreEvidence:corePath??null,corePassed:core?.status==='passed',factoryUnitTests:unit,provisioningSandboxTests:sandbox,hashes:Object.fromEntries([...inputs,...expected].filter(fs.existsSync).map(file=>[file,hash(file)])),scope:'Local Sandbox only; no public-network signing, provisioning or settlement. A missing or zero-test result is a failure.'};
fs.writeFileSync(path.join(directory,'acceptance.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
process.exitCode=report.exitCode;
