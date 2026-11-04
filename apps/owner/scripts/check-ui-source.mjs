import ts from 'typescript';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const failures=[];
async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='api')await visit(file);continue;}
 if(!/\.tsx?$/.test(file))continue;
 const source=await readFile(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 for(const error of tree.parseDiagnostics)failures.push(`${file}: ${ts.flattenDiagnosticMessageText(error.messageText,' ')}`);
 function scan(node){
  if(ts.isCallExpression(node)&&node.expression.getText(tree)==='console.log')failures.push(`${file}: remove console.log from the UI`);
  if(ts.isJsxText(node)&&/\bTODO\b|\blorem\b/i.test(node.getText(tree)))failures.push(`${file}: unfinished visible copy`);
  ts.forEachChild(node,scan);
 }scan(tree);
}}
await visit('src/app');
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('UI source lint passed (syntax, logging and unfinished visible copy).');
