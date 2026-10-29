import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { KeyPair } from "near-api-js";
import { account } from "../src/data/owner-adapter.ts";
const owner = account(process.env.NNETICS_OWNER_ID || "");
if (!owner.endsWith(".testnet") && !/^[0-9a-f]{64}$/.test(owner))
  throw new Error("Named testnet or implicit Ed25519 owner required.");
const directory = path.resolve(
  process.env.NNETICS_KEYSTORE ||
    path.join(
      process.env.LOCALAPPDATA || path.join(os.homedir(), ".config"),
      "Nnetics",
      "testnet",
      owner,
    ),
);
const repository = path.resolve("../..");
if (!path.relative(repository, directory).startsWith(".."))
  throw new Error("Store keys outside the source repository.");
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
if (process.platform === "win32")
  execFileSync(
    "icacls",
    [
      directory,
      "/inheritance:r",
      "/grant:r",
      `${os.userInfo().username}:(OI)(CI)F`,
    ],
    { stdio: "pipe" },
  );
else fs.chmodSync(directory, 0o700);
const publicConfiguration: Record<
  string,
  { publicKey: string; keyFile: string }
> = {};
for (const role of ["vault", "worker", "vendor"]) {
  const filename = path.join(directory, role + ".key");
  if (!fs.existsSync(filename)) {
    const key = KeyPair.fromRandom("ed25519");
    fs.writeFileSync(filename, key.toString() + "\n", {
      flag: "wx",
      mode: 0o600,
    });
  }
  const key = KeyPair.fromString(
    fs.readFileSync(filename, "utf8").trim() as Parameters<
      typeof KeyPair.fromString
    >[0],
  );
  publicConfiguration[role] = {
    publicKey: key.getPublicKey().toString(),
    keyFile: filename,
  };
}
console.log(JSON.stringify(publicConfiguration, null, 2));
