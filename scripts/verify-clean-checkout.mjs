import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';

const root=process.cwd(),directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-clean-checkout-'));
if(!path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'nnetics-clean-checkout-'))throw Error('Unexpected checkout destination.');
const evidence=path.join(root,'artifacts/final-clean-checkout',new Date().toISOString().replaceAll(':','-'));
fs.mkdirSync(evidence,{recursive:true});
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const hash=crypto.createHash('sha256'),application=crypto.createHash('sha256');
for(const file of files){
 const source=path.resolve(root,file);if(!source.startsWith(root+path.sep)||!fs.lstatSync(source).isFile())throw Error('Unsupported source path.');
 if(/(^|\/)\.env(\.|$)/.test(file)&&!file.endsWith('.env.example'))throw Error('Private environment cannot enter a clean checkout.');
 const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
 const digest=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');hash.update(file+'\0'+digest+'\n');
 if(file.startsWith('apps/owner/src/')||['apps/owner/package.json','apps/owner/package-lock.json','apps/owner/next.config.ts','apps/owner/tsconfig.json'].includes(file))application.update(file+'\0'+digest+'\n');
}
const report={status:'RUNNING',scope:'Tracked/staged source copied into a fresh temporary checkout without environments, databases, build outputs or dependencies. No source file deleted.',baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:files.length,sourceSnapshotSha256:hash.digest('hex'),applicationSha256:application.digest('hex'),node:process.version,steps:[]};
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^NNETICS_|^NEXT_PUBLIC_NNETICS_|^OPENROUTER_/.test(key)));
const npm=process.platform==='win32'?path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'):process.env.npm_execpath;
if(!npm)throw Error('Run this script through npm on Linux so npm_execpath is available.');
for(const [name,cwd,args]of [['root-install',directory,['ci']],['owner-install',path.join(directory,'apps/owner'),['ci']],['lint',directory,['run','lint']],['build',path.join(directory,'apps/owner'),['run','build']]]){
 const fd=fs.openSync(path.join(evidence,name+'.log'),'w');const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[npm,...args],{cwd,env,stdio:['ignore',fd,fd],windowsHide:true});child.once('error',reject);child.once('exit',resolve);});fs.closeSync(fd);report.steps.push({name,exitCode:code});console.log(`${name}: ${code}`);if(code!==0){report.status='FAIL';break;}
}
if(report.status==='RUNNING')report.status='PASS';
fs.writeFileSync(path.join(evidence,'acceptance.json'),JSON.stringify(report,null,2)+'\n');console.log('Evidence: '+path.join(evidence,'acceptance.json'));process.exitCode=report.status==='PASS'?0:1;
