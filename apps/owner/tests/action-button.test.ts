import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {transpileModule, ModuleKind, JsxEmit} from "typescript";

// Node's native TS runner does not parse TSX. Compile this presentation component
// with the repository's existing compiler; no test dependency or request is added.
const source = await readFile(new URL("../src/app/action-button.tsx", import.meta.url), "utf8");
const compiled = transpileModule(source, {
  compilerOptions: {module: ModuleKind.ESNext, jsx: JsxEmit.ReactJSX},
}).outputText.replace(/from ["'](react(?:\/jsx-runtime)?)["']/g,
  (_, name: string) => `from ${JSON.stringify(import.meta.resolve(name))}`);
const {ActionButton} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const render = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(ActionButton, {children: "Request payment", ...props}));

test("an error retains the specific payment action unless a caller explicitly supplies retry copy", () => {
  const html = render({state: "error"});
  assert.match(html, /Request payment/);
  assert.doesNotMatch(html, /Try again/);
  assert.match(render({state: "error", retryLabel: "Continue to workspace"}), /Continue to workspace/);
});

test("pending work is disabled and announced without rendering a second action", () => {
  const html = render({pending: true, pendingLabel: "Checking payment history…"});
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Checking payment history…/);
  assert.equal((html.match(/<button/g) || []).length, 1);
});

test("native submit, cancellation and owner-disabled semantics are preserved", () => {
  assert.doesNotMatch(render(), /type=/); // The browser's form-submit default.
  assert.match(render({type: "button", children: "Cancel"}), /type="button"/);
  assert.match(render({disabled: true}), /disabled=""/);
});

test("rendering every action state cannot sign, broadcast or retry a request", () => {
  let calls = 0;
  for (const state of ["idle", "loading", "success", "error"])
    render({state, onClick: () => { calls++; }});
  assert.equal(calls, 0);
});
