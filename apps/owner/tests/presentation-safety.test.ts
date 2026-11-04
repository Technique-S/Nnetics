import {test} from "node:test";
import assert from "node:assert/strict";
import {displayAmount} from "../src/data/display-format.ts";
import {GENERIC_MESSAGE,getUserMessage} from "../src/data/user-message.ts";
import {getSiteOrigin,TAGLINE} from "../src/data/product.ts";

test("token display retains smallest units and large exact values",()=>{
 assert.equal(displayAmount("1"),"0.000000000000000000000001 NEAR");
 assert.equal(displayAmount("900719925474099312345678901234567890123456789"),"900719925474099312345.678901234567890123456789 NEAR");
 assert.equal(displayAmount("0"),"0 NEAR");
});
test("unassigned metadata origin is absent and local fallback is prohibited",()=>{
 assert.equal(getSiteOrigin(""),undefined);
 assert.throws(()=>getSiteOrigin("http://localhost:3100"));
 assert.throws(()=>getSiteOrigin("https://example.com/"));
 assert.equal(getSiteOrigin("https://example.com"),"https://example.com");
 assert.equal(TAGLINE,"Pay approved contractor work within limits you set.");
});
test("unknown transfers remain distinct from duplicate invoices and generic errors",()=>{
 assert.match(getUserMessage(new Error("unknown outcome"),"payment"),/isn't confirmed/);
 assert.match(getUserMessage(new Error("duplicate invoice")),/already received/);
 assert.equal(getUserMessage(new Error("internal detail: secret-service.example")),GENERIC_MESSAGE);
 assert.equal(GENERIC_MESSAGE,"Something went wrong on our side. Please try again in a moment.");
});
