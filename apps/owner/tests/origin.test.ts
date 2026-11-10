import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedAppOrigin } from "../src/server/origin.ts";

function allowed(
  origin: string | null,
  configured: string,
  production = false,
) {
  return isAllowedAppOrigin(origin, configured, production);
}

test("development treats localhost and 127.0.0.1 as the same loopback origin", () => {
  const configured = "http://127.0.0.1:3100";
  assert.equal(allowed("http://127.0.0.1:3100", configured), true);
  assert.equal(allowed("http://localhost:3100", configured), true);
  for (const rejected of [
    "http://localhost:3101",
    "https://localhost:3100",
    "http://localhost:3100/",
    "http://127.0.0.1.evil.example:3100",
    "http://evil.example:3100",
    null,
  ] as const)
    assert.equal(allowed(rejected, configured), false, String(rejected));
});

test("development accepts 127.0.0.1 when localhost is configured", () => {
  const configured = "http://localhost:3100";
  assert.equal(allowed("http://localhost:3100", configured), true);
  assert.equal(allowed("http://127.0.0.1:3100", configured), true);
});

test("development keeps non-loopback configured origins exact", () => {
  const configured = "https://nnetics.example.com";
  assert.equal(allowed("https://nnetics.example.com", configured), true);
  assert.equal(allowed("http://localhost:443", configured), false);
  assert.equal(allowed("https://localhost:443", configured), false);
});

test("production rejects loopback aliases", () => {
  const configured = "http://127.0.0.1:3100";
  assert.equal(allowed("http://127.0.0.1:3100", configured, true), true);
  assert.equal(allowed("http://localhost:3100", configured, true), false);
});
