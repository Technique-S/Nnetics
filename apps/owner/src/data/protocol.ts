// These runtime versions passed the Linux payment/proof/resource suites and a
// bounded author comparison. This is not independent security approval and does
// not grant transaction permission. Keep future versions fail-closed.
export const TESTED_PROTOCOL_VERSIONS = Object.freeze([86, 88] as const);
export function assertTestedProtocol(version: number | undefined): void {
  if (!TESTED_PROTOCOL_VERSIONS.some((v) => v === version))
    throw new Error(
      `Protocol ${version} requires compatibility verification before signing.`,
    );
}
