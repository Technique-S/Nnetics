// Optional rebuild. Kit/runtime isolated under ignored artifacts/design-runtime.
import {build} from '../../artifacts/design-runtime/node_modules/esbuild/lib/main.js';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('artifacts/design-runtime');
await build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Scene from './stage.tsx';createRoot(document.getElementById('example')).render(<Scene/>);",resolveDir:path.resolve('docs/design-review'),loader:'tsx'},bundle:true,format:'esm',jsx:'automatic',outfile:'docs/design-review/scene.js',nodePaths:[root+'/node_modules'],define:{'process.env.NODE_ENV':'"production"'},minify:true});
await writeFile('docs/design-review/scene.html','<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>Nnetics · Stageshow invoice study</title><link rel="stylesheet" href="scene.css"><body style="margin:0;background:#f6f6f2"><div id="example" style="max-width:440px"></div><script type="module" src="scene.js"></script></body></html>');
