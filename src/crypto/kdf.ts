/**
 * Key derivation: Master Password → PBKDF2-SHA256 → AES-256-GCM key.
 *
 * The master password itself is never stored; only a random salt lives in
 * the vault blob. Iteration count follows current OWASP guidance for
 * PBKDF2-HMAC-SHA256.
 */

export const KDF_ITERATIONS = 600_000;

export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    // non-extractable: the raw key can never leave the WebCrypto boundary.
    false,
    ["encrypt", "decrypt"],
  );
}
