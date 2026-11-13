import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

// Synthetic evidence fixtures test the report validator, never Rust contracts.
const script=path.resolve('scripts/release-contract-report.mjs');
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-report-validator-'));
 assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'nnetics-report-validator-'));
 const write=(file:string,value:string)=>{const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);};
 write('.gitignore','artifacts/\n');
 write('rust-toolchain.toml','# synthetic validator fixture\n');
 for(const file of ['vault-provisioning.wasm','factory.wasm','SHA256SUMS'])write('artifacts/provisioning/'+file,'synthetic validator fixture');
 write('artifacts/provisioning/factory-unit.log','test result: ok. 1 passed; 0 failed;');
 write('artifacts/provisioning/sandbox.log','test result: ok. 2 passed; 0 failed;');
 const core=path.join(directory,'artifacts/runs/synthetic');
 write('artifacts/runs/synthetic/logs/run.json',JSON.stringify({status:'passed',rust_unit_tests_passed:true,sandbox_tests_passed:true}));
 write('artifacts/release-contracts/fixture/verification.log','Verification evidence: '+core+'\n');
 for(const args of [['init','--quiet'],['add','.'],['-c','user.name=Validator fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Synthetic fixture']])execFileSync('git',args,{cwd:directory,stdio:'ignore',windowsHide:true});
 const run=()=>{const result=spawnSync(process.execPath,[script,'artifacts/release-contracts/fixture','0'],{cwd:directory,encoding:'utf8',windowsHide:true});return {exit:result.status,report:JSON.parse(fs.readFileSync(path.join(directory,'artifacts/release-contracts/fixture/acceptance.json'),'utf8'))};};
 return {directory,write,run,cleanup:()=>fs.rmSync(directory,{recursive:true,force:true})};
}
test('report validator accepts a complete clean synthetic evidence fixture',()=>{const f=fixture();try{const r=f.run();assert.equal(r.exit,0);assert.equal(r.report.status,'PASS');assert.equal(r.report.sourceClean,true);}finally{f.cleanup();}});
test('report validator rejects a zero-test factory result even when command exit is zero',()=>{const f=fixture();try{f.write('artifacts/provisioning/factory-unit.log','test result: ok. 0 passed; 0 failed;');const r=f.run();assert.equal(r.exit,80);assert.equal(r.report.status,'FAIL');assert.ok(r.report.failures.includes('factory unit tests missing or zero'));}finally{f.cleanup();}});
test('report validator rejects incomplete core evidence and dirty source',()=>{const f=fixture();try{f.write('artifacts/runs/synthetic/logs/run.json','{}');f.write('rust-toolchain.toml','# changed');const r=f.run();assert.equal(r.exit,80);assert.ok(r.report.failures.includes('complete passing core evidence missing'));assert.ok(r.report.failures.includes('source is dirty or Git provenance unavailable'));}finally{f.cleanup();}});
