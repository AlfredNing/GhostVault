/**
 * Popup-side VaultApi client.
 *
 * Inside the extension the popup talks to the background service worker
 * (authoritative vault host). Outside an extension context (standalone
 * preview / dev server) it falls back to an in-process implementation so the
 * whole UI remains usable.
 */
import { inExtensionContext, runtime } from "@/browser/api";
import type { MessageEnvelope } from "@/shared/messages";
import { vaultService } from "@/vault/vaultService";
import { vaultStore } from "@/storage/vaultStore";
import type { VaultApi } from "@/shared/vaultApi";
import { VaultError } from "@/shared/vaultApi";

async function remote<T>(message: unknown): Promise<T> {
  const envelope = await runtime.sendMessage<MessageEnvelope<T>>(message);
  if (!envelope.ok) throw new VaultError(envelope.error as VaultError["code"]);
  return envelope.data;
}

const remoteApi: VaultApi = {
  getStatus: () => remote({ type: "gv:vault-status:get" }),
  createVault: (password) =>
    remote({ type: "gv:vault:create", password }).then(() => undefined),
  unlock: (password) =>
    remote({ type: "gv:vault:unlock", password }).then(() => undefined),
  lock: () => remote({ type: "gv:vault:lock" }).then(() => undefined),
  list: () => remote({ type: "gv:credentials:list" }),
  search: (query) => remote({ type: "gv:credentials:search", query }),
  add: (input) => remote({ type: "gv:credentials:add", input }),
  update: (id, patch) => remote({ type: "gv:credentials:update", id, patch }),
  remove: (id) => remote({ type: "gv:credentials:delete", id }).then(() => undefined),
  forDomain: (domain) => remote({ type: "gv:credentials:for-domain", domain }),
  getSettings: () => remote({ type: "gv:settings:get" }),
  setSettings: (settings) =>
    remote({ type: "gv:settings:set", settings }).then(() => undefined),
};

const localApi: VaultApi = {
  getStatus: () => vaultService.getStatus(),
  createVault: (password) => vaultService.createVault(password),
  unlock: (password) => vaultService.unlock(password),
  lock: async () => vaultService.lock(),
  list: () => vaultService.list(),
  search: (query) => vaultService.search(query),
  add: (input) => vaultService.add(input),
  update: (id, patch) => vaultService.update(id, patch),
  remove: (id) => vaultService.remove(id),
  forDomain: (domain) => vaultService.forDomain(domain),
  getSettings: () => vaultStore.loadSettings(),
  setSettings: (settings) => vaultStore.saveSettings(settings),
};

let cached: Promise<VaultApi> | null = null;

export function getVaultApi(): Promise<VaultApi> {
  cached ??= detect();
  return cached;
}

async function detect(): Promise<VaultApi> {
  if (inExtensionContext) {
    try {
      await remote({ type: "gv:ping" });
      return remoteApi;
    } catch {
      // Background not reachable — fall through to local mode.
    }
  }
  return localApi;
}
