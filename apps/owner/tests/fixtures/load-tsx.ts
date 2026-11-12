import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {transpileModule, ModuleKind, JsxEmit} from 'typescript';

const cache = new Map<string, string>();
/** Load real local TSX dependencies in Node's native TypeScript test runner. */
export async function compiledTsx(url: URL): Promise<string> {
  const filename = fileURLToPath(url);
  const prior = cache.get(filename);
  if (prior) return prior;
  const source = await readFile(url, 'utf8');
  let compiled = transpileModule(source, {compilerOptions: {module: ModuleKind.ESNext, jsx: JsxEmit.ReactJSX}}).outputText;
  const imports = [...compiled.matchAll(/from\s+["']([^"']+)["']/g)];
  for (const match of imports) {
    const name = match[1];
    let resolved: string;
    if (name.startsWith('.') || name.startsWith('@/')) {
      const local = name.startsWith('@/') ? path.resolve(import.meta.dirname, '../../src', name.slice(2)) : path.resolve(path.dirname(filename), name);
      let dependency: URL | undefined;
      for (const ext of ['.tsx', '.ts']) {
        try { await readFile(local + ext); dependency = pathToFileURL(local + ext); break; } catch {}
      }
      if (!dependency) throw Error(`Cannot load TSX dependency: ${name}`);
      resolved = await compiledTsx(dependency);
    } else resolved = import.meta.resolve(name);
    compiled = compiled.replace(match[0], `from ${JSON.stringify(resolved)}`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
  cache.set(filename, result);
  return result;
}
