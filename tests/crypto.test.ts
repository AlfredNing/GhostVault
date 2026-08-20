import { describe, expect, it } from "vitest";
import { decryptJson, deriveKey, encryptJson, fromBase64, randomBytes, toBase64 } from "@/crypto";

describe("crypto layer", () => {
  it("encrypt → decrypt roundtrip returns the original payload", async () => {
    const salt = randomBytes(16);
    const key = await deriveKey("correct horse battery", salt);
    const payload = [{ user: "abc@gmail.com", secret: "hunter2!" }];

    const { iv, ciphertext } = await encryptJson(key, payload);
    const decrypted = await decryptJson<typeof payload>(key, iv, ciphertext);

    expect(decrypted).toEqual(payload);
  });

  it("rejects a wrong master password", async () => {
    const salt = randomBytes(16);
    const key = await deriveKey("right-password", salt);
    const wrongKey = await deriveKey("wrong-password", salt);
    const { iv, ciphertext } = await encryptJson(key, { data: "top secret" });

    await expect(decryptJson(wrongKey, iv, ciphertext)).rejects.toThrow();
  });

  it("uses a random salt on every derivation", () => {
    const a = randomBytes(16);
    const b = randomBytes(16);
    expect(a).toHaveLength(16);
    expect(toBase64(a)).not.toEqual(toBase64(b));
  });

  it("uses a random IV: same key + same plaintext → different ciphertexts", async () => {
    const key = await deriveKey("master", randomBytes(16));
    const first = await encryptJson(key, { v: 1 });
    const second = await encryptJson(key, { v: 1 });

    expect(first.iv).not.toEqual(second.iv);
    expect(first.ciphertext).not.toEqual(second.ciphertext);
  });

  it("base64 helpers are inverse functions", () => {
    const bytes = randomBytes(32);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });
});
