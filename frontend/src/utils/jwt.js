/**
 * Decode the payload of a JWT without verifying the signature.
 * Only use this to read the `exp` claim for client-side expiry checks.
 */
export function decodePayload(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT is missing, malformed, or past its `exp` timestamp.
 * Does NOT verify the signature — that must happen server-side.
 */
export function isTokenExpired(token) {
  if (!token) return true;
  const payload = decodePayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 < Date.now();
}
