/**
 * Vault service — owns the key lifecycle and credential CRUD.
 *
 * Lifecycle rules:
 *  - The derived AES key and the decrypted credential list live ONLY in this
 *    module's memory while unlocked.
 *  - `lock()` drops both references; the service worker being killed by the
 *    browser has the same effect (state is never persisted plaintext).
 *  - Every mutation re-encrypts the full credential list with a fresh IV.
 */
import {
  KDF_ITERATIONS,
  SALT_BYTES,
  decryptJson,
  deriveKey,
  encryptJson,
  fromBase64,
  randomBytes,
  toBase64,
} from "../crypto";
import { matchesDomain } from "../shared/matching";
import type {
  Credential,
  CredentialInput,
  EncryptedVault,
  VaultStatus,
} from "../shared/types";
import { VaultError } from "../shared/vaultApi";
import { vaultStore } from "../storage/vaultStore";

class VaultService {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private credentials: Credential[] = [];

  async getStatus(): Promise<VaultStatus> {
    if (this.key) return "unlocked";
    const vault = await vaultStore.loadVault();
    return vault ? "locked" : "uninitialized";
  }

  /** First-run: create an empty vault protected by the master password. */
  async createVault(masterPassword: string): Promise<void> {
    this.salt = randomBytes(SALT_BYTES);
    this.key = await deriveKey(masterPassword, this.salt);
    this.credentials = [];
    await this.persist();
  }

  /** @throws VaultError WRONG_PASSWORD when decryption fails. */
  async unlock(masterPassword: string): Promise<void> {
    const vault = await vaultStore.loadVault();
    if (!vault) throw new VaultError("NO_VAULT");

    const salt = fromBase64(vault.salt);
    const key = await deriveKey(masterPassword, salt);
    try {
      this.credentials = await decryptJson<Credential[]>(
        key,
        vault.iv,
        vault.ciphertext,
      );
    } catch {
      // GCM auth failed → wrong master password. Drop everything.
      throw new VaultError("WRONG_PASSWORD");
    }
    this.key = key;
    this.salt = salt;
  }

  /** Clears key material and plaintext credentials from memory. */
  lock(): void {
    this.key = null;
    this.salt = null;
    this.credentials = [];
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async list(): Promise<Credential[]> {
    this.requireUnlocked();
    return [...this.credentials];
  }

  async search(query: string): Promise<Credential[]> {
    const all = await this.list();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((credential) =>
      [credential.title, credential.username, credential.domain, credential.url ?? "", credential.notes ?? ""]
        .some((field) => field.toLowerCase().includes(q)),
    );
  }

  async add(input: CredentialInput): Promise<Credential> {
    this.requireUnlocked();
    const now = Date.now();
    const credential: Credential = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.credentials = [credential, ...this.credentials];
    await this.persist();
    return credential;
  }

  async update(
    id: string,
    patch: Partial<CredentialInput>,
  ): Promise<Credential> {
    this.requireUnlocked();
    const existing = this.credentials.find((c) => c.id === id);
    if (!existing) throw new VaultError("NOT_FOUND");
    const updated: Credential = {
      ...existing,
      ...patch,
      id,
      updatedAt: Date.now(),
    };
    this.credentials = this.credentials.map((c) => (c.id === id ? updated : c));
    await this.persist();
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.requireUnlocked();
    if (!this.credentials.some((c) => c.id === id)) {
      throw new VaultError("NOT_FOUND");
    }
    this.credentials = this.credentials.filter((c) => c.id !== id);
    await this.persist();
  }

  /** Credentials eligible for autofill on the given page domain. */
  async forDomain(domain: string): Promise<Credential[]> {
    const all = await this.list();
    return all.filter((c) => matchesDomain(c.domain, domain));
  }

  // -------------------------------------------------------------------------
  // internals
  // -------------------------------------------------------------------------

  private requireUnlocked(): CryptoKey {
    if (!this.key) throw new VaultError("LOCKED");
    return this.key;
  }

  /** Re-encrypt the in-memory list with a fresh IV and persist. */
  private async persist(): Promise<void> {
    const key = this.requireUnlocked();
    const salt = this.salt;
    if (!salt) throw new VaultError("LOCKED");

    const previous = await vaultStore.loadVault();
    const { iv, ciphertext } = await encryptJson(key, this.credentials);
    const now = Date.now();
    const vault: EncryptedVault = {
      version: 1,
      kdf: "PBKDF2",
      kdfIterations: KDF_ITERATIONS,
      salt: toBase64(salt),
      iv,
      ciphertext,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    await vaultStore.saveVault(vault);
  }
}

export const vaultService = new VaultService();
