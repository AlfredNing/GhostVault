/**
 * Persistence layer over the Browser Adapter.
 *
 * Only two keys are ever written:
 *  - `gv:vault`     → EncryptedVault (ciphertext only, never plaintext)
 *  - `gv:settings`  → Settings (no secrets)
 */
import { storage } from "../browser/api";
import { DEFAULT_SETTINGS } from "../shared/types";
import type { EncryptedVault, Settings } from "../shared/types";

const VAULT_KEY = "gv:vault";
const SETTINGS_KEY = "gv:settings";

export const vaultStore = {
  async loadVault(): Promise<EncryptedVault | null> {
    const result = await storage.get<{ [VAULT_KEY]?: EncryptedVault }>(VAULT_KEY);
    return result[VAULT_KEY] ?? null;
  },

  async saveVault(vault: EncryptedVault): Promise<void> {
    await storage.set({ [VAULT_KEY]: vault });
  },

  async loadSettings(): Promise<Settings> {
    const result = await storage.get<{ [SETTINGS_KEY]?: Partial<Settings> }>(
      SETTINGS_KEY,
    );
    return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
  },

  async saveSettings(settings: Settings): Promise<void> {
    await storage.set({ [SETTINGS_KEY]: settings });
  },
};
