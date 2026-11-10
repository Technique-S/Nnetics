const DEFAULT_APP_ORIGIN = "http://127.0.0.1:3100";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

function exactOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.origin === value ? url : null;
  } catch {
    return null;
  }
}

// Production keeps the configured origin as the single source of truth. During
// local development, localhost and 127.0.0.1 are interchangeable only when the
// configured origin is loopback and the protocol and port still match.
export function isAllowedAppOrigin(
  origin: string | null,
  configured = process.env.NNETICS_APP_ORIGIN || DEFAULT_APP_ORIGIN,
  production = process.env.NODE_ENV === "production",
) {
  if (!origin) return false;
  const expected = exactOrigin(configured);
  const received = exactOrigin(origin);
  if (!expected || !received) return false;
  if (received.origin === expected.origin) return true;
  if (production) return false;
  return (
    received.protocol === expected.protocol &&
    received.port === expected.port &&
    LOOPBACK_HOSTS.has(expected.hostname) &&
    LOOPBACK_HOSTS.has(received.hostname)
  );
}
