/**
 * AES-256-GCM authenticated encryption of JSON payloads.
 *
 * Every call uses a fresh random 96-bit IV; the GCM auth tag is appended to
 * the ciphertext by WebCrypto and travels with it.
 */
import { IV_BYTES, fromBase64, randomBytes, toBase64 } from "./random";

export interface EncryptedPayload {
  /** Base64 random IV. */
  iv: string;
  /** Base64 ciphertext (+ GCM tag). */
  ciphertext: string;
}

export async function encryptJson(
  key: CryptoKey,
  value: unknown,
): Promise<EncryptedPayload> {
  const iv = randomBytes(IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const buffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plaintext,
  );
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(buffer)) };
}

/** @throws DOMException OperationError when the key/tag do not match. */
export async function decryptJson<T>(
  key: CryptoKey,
  iv: string,
  ciphertext: string,
): Promise<T> {
  const buffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) as BufferSource },
    key,
    fromBase64(ciphertext) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(buffer)) as T;
}
