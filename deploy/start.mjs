// One web process only. This launcher never starts a worker or loads signing keys.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {checkEnvironment,verifyPaid,files,maintenanceServer} from './hosting.mjs';
import {verifyChain} from './preflight.mjs';
process.umask(0o077);
const config=checkEnvironment(process.env),port=Number(process.env.PORT||10000);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
if(process.platform!=='linux'||!fs.readFileSync('/proc/self/mountinfo','utf8').split('\n').some(line=>line.split(' ')[4]==='/var/data'))
  throw Error('Hosted launcher requires a mounted persistent /var/data disk on Linux');
fs.mkdirSync(config.root,{recursive:true,mode:0o700});
if(config.maintenance) {
  // Gives operators SSH access to import a private snapshot before opening the app.
  const server=maintenanceServer();
  server.listen(port,'0.0.0.0',()=>console.log('Nnetics maintenance; no wallet or payment actions available.'));
  process.on('SIGTERM',()=>server.close());
}else{
  for(const file of files)if(!fs.statSync(path.join(config.live,file)).isFile())throw Error('Import the complete database snapshot first');
  if(!fs.existsSync(path.join(config.live,'manifest.json')))throw Error('Missing snapshot provenance');
  verifyPaid(path.join(config.live,'invoices.db'));
  await verifyChain(process.env.NNETICS_RPC_URL);
  const cwd=path.resolve(import.meta.dirname,'../apps/owner');
  const child=spawn(process.execPath,['--dns-result-order=ipv4first','node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port',String(port)],{cwd,env:process.env,stdio:'inherit',windowsHide:true});
  child.on('error',()=>{console.error('Web server failed to start');process.exitCode=1;});
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
  child.on('exit',code=>{process.exitCode=code??1;});
}
