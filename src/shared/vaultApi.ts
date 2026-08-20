/**
 * The vault API surface shared by:
 *  - the background service worker (authoritative implementation),
 *  - the popup (remote client over runtime messages),
 *  - the popup in standalone/preview mode (local in-process implementation).
 */
import type { Credential, CredentialInput, Settings, VaultStatus } from "./types";

export interface VaultApi {
  getStatus(): Promise<VaultStatus>;
  createVault(password: string): Promise<void>;
  unlock(password: string): Promise<void>;
  lock(): Promise<void>;

  list(): Promise<Credential[]>;
  search(query: string): Promise<Credential[]>;
  add(input: CredentialInput): Promise<Credential>;
  update(id: string, patch: Partial<CredentialInput>): Promise<Credential>;
  remove(id: string): Promise<void>;
  /** Credentials eligible for autofill on `domain`. */
  forDomain(domain: string): Promise<Credential[]>;

  getSettings(): Promise<Settings>;
  setSettings(settings: Settings): Promise<void>;
}

export class VaultError extends Error {
  constructor(
    readonly code:
      | "WRONG_PASSWORD"
      | "LOCKED"
      | "NO_VAULT"
      | "NOT_FOUND"
      | "EXTENSION_UNAVAILABLE",
  ) {
    super(code);
    this.name = "VaultError";
  }
}
