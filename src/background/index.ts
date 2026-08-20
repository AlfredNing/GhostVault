/**
 * GhostVault background service worker.
 *
 * Responsibilities:
 *  - single authoritative host of the VaultService (key material lives here),
 *  - typed message routing for popup & content scripts,
 *  - auto-lock scheduling via chrome.alarms (survives SW restarts).
 *
 * Security note: no plaintext credential or key material is ever logged.
 */
import { alarms, runtime } from "../browser/api";
import { isMessage } from "../shared/messages";
import type { ExtensionMessage, MessageEnvelope } from "../shared/messages";
import { vaultService } from "../vault/vaultService";
import { vaultStore } from "../storage/vaultStore";
import type { Settings } from "../shared/types";

const LOCK_ALARM = "gv:auto-lock";

// ---------------------------------------------------------------------------
// Auto-lock (Phase 8)
// ---------------------------------------------------------------------------

async function scheduleAutoLock(): Promise<void> {
  const settings = await vaultStore.loadSettings();
  await alarms.clear(LOCK_ALARM);
  if (settings.lockTimeout > 0) {
    await alarms.create(LOCK_ALARM, { delayInMinutes: settings.lockTimeout });
  }
}

/** Any vault activity restarts the idle countdown. */
function touchAutoLock(): void {
  void scheduleAutoLock();
}

alarms.onAlarm((alarm) => {
  if (alarm.name === LOCK_ALARM) {
    vaultService.lock();
  }
});

runtime.onMessage((message, _sender, sendResponse) => {
  if (!isMessage(message)) return false;

  handle(message)
    .then((data) => sendResponse({ ok: true, data } satisfies MessageEnvelope))
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      } satisfies MessageEnvelope),
    );
  return true; // keep the message channel open for the async response
});

async function handle(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case "gv:ping":
      return { ok: true };

    case "gv:vault-status:get":
      return vaultService.getStatus();

    case "gv:vault:create": {
      await vaultService.createVault(message.password);
      await scheduleAutoLock();
      return vaultService.getStatus();
    }

    case "gv:vault:unlock": {
      await vaultService.unlock(message.password);
      await scheduleAutoLock();
      return vaultService.getStatus();
    }

    case "gv:vault:lock": {
      vaultService.lock();
      await alarms.clear(LOCK_ALARM);
      return vaultService.getStatus();
    }

    case "gv:credentials:list": {
      const credentials = await vaultService.list();
      touchAutoLock();
      return credentials;
    }

    case "gv:credentials:search": {
      const credentials = await vaultService.search(message.query);
      touchAutoLock();
      return credentials;
    }

    case "gv:credentials:add": {
      const credential = await vaultService.add(message.input);
      touchAutoLock();
      return credential;
    }

    case "gv:credentials:update": {
      const credential = await vaultService.update(message.id, message.patch);
      touchAutoLock();
      return credential;
    }

    case "gv:credentials:delete": {
      await vaultService.remove(message.id);
      touchAutoLock();
      return { deleted: message.id };
    }

    case "gv:credentials:for-domain": {
      const credentials = await vaultService.forDomain(message.domain);
      touchAutoLock();
      return credentials;
    }

    case "gv:settings:get":
      return vaultStore.loadSettings();

    case "gv:settings:set": {
      const settings: Settings = { ...message.settings };
      await vaultStore.saveSettings(settings);
      const status = await vaultService.getStatus();
      if (status === "unlocked") await scheduleAutoLock();
      return settings;
    }

    case "gv:page-detected":
      // Phase 9 may badge the toolbar icon; V1 intentionally silent.
      return { acknowledged: true };

    default:
      throw new Error(`UNKNOWN_MESSAGE`);
  }
}
