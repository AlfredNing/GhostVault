/**
 * Shared domain types for GhostVault.
 *
 * NOTE: plaintext fields (`username`, `password`, ...) must only ever exist
 * in memory while the vault is unlocked. On disk, everything lives inside the
 * AES-256-GCM encrypted blob (see src/crypto).
 */
import { DEFAULT_LANGUAGE } from "./i18n";
import type { LanguageSetting, MessageKey } from "./i18n";

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
  labelKey: MessageKey;
}> = [
  { value: 5, labelKey: "lockTimeout.5" },
  { value: 15, labelKey: "lockTimeout.15" },
  { value: 30, labelKey: "lockTimeout.30" },
  { value: 0, labelKey: "lockTimeout.0" },
];

export const DEFAULT_LOCK_TIMEOUT: LockTimeoutMinutes = 5;

/** User preferences persisted (unencrypted — contains no secrets). */
export interface Settings {
  lockTimeout: LockTimeoutMinutes;
  /**
   * Set once the user dismisses the "enable in private windows" hint, so the
   * popup stops surfacing it. The toggle itself lives in browser settings and
   * can only be flipped by the user.
   */
  incognitoHintDismissed: boolean;
  /** UI language; `auto` follows the browser UI language. */
  language: LanguageSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  lockTimeout: DEFAULT_LOCK_TIMEOUT,
  incognitoHintDismissed: false,
  language: DEFAULT_LANGUAGE,
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
