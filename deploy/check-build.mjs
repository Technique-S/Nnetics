// Local verification without replacing the running app's .next directory.
import path from 'node:path';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const app=path.resolve(import.meta.dirname,'../apps/owner');
const envFile=path.join(app,'next-env.d.ts'),previous=fs.readFileSync(envFile);
try{
  const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{cwd:app,env:{...process.env,NNETICS_BUILD_DIRECTORY:'.next-hosting',NNETICS_HOSTED_MAINTENANCE:'1'},stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
}finally{fs.writeFileSync(envFile,previous);}
