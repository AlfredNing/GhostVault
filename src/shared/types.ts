/**
 * Shared domain types for GhostVault.
 *
 * NOTE: plaintext fields (`username`, `password`, ...) must only ever exist
 * in memory while the vault is unlocked. On disk, everything lives inside the
 * AES-256-GCM encrypted blob (see src/crypto).
 */

/** A single decrypted credential entry. */
export interface Credential {
  id: string;
  /** Human readable site name, e.g. "GitHub". */
  title: string;
  /** Registrable domain used for matching, e.g. "github.com". */
  domain: string;
  /** Full URL the credential was captured/entered on (optional). */
  url?: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/** Encrypted vault payload persisted in browser.storage.local. */
export interface EncryptedVault {
  /** Encryption format version, bumped when the scheme changes. */
  version: 1;
  /** KDF used to derive the key from the master password. */
  kdf: "PBKDF2";
  /** PBKDF2 iteration count. */
  kdfIterations: number;
  /** Base64-encoded random salt (16 bytes). */
  salt: string;
  /** Base64-encoded random IV (12 bytes) for AES-256-GCM. */
  iv: string;
  /** Base64-encoded ciphertext containing Credential[] as JSON. */
  ciphertext: string;
  /** Base64-encoded GCM auth tag is appended to ciphertext by WebCrypto. */
  createdAt: number;
  updatedAt: number;
}

/** What gets stored under `vault` in browser.storage.local. */
export interface VaultStoreShape {
  vault?: EncryptedVault;
}

/** Vault lifecycle states surfaced to the UI. */
export type VaultStatus = "uninitialized" | "locked" | "unlocked";

/** Auto-lock timeout options (minutes; 0 = never). */
export type LockTimeoutMinutes = 5 | 15 | 30 | 0;

export const LOCK_TIMEOUT_OPTIONS: ReadonlyArray<{
  value: LockTimeoutMinutes;
  label: string;
}> = [
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 0, label: "Never" },
];

export const DEFAULT_LOCK_TIMEOUT: LockTimeoutMinutes = 5;

/** User preferences persisted (unencrypted — contains no secrets). */
export interface Settings {
  lockTimeout: LockTimeoutMinutes;
}

export const DEFAULT_SETTINGS: Settings = {
  lockTimeout: DEFAULT_LOCK_TIMEOUT,
};

/** Plaintext input for creating/updating a credential. */
export interface CredentialInput {
  title: string;
  domain: string;
  url?: string;
  username: string;
  password: string;
  notes?: string;
}
