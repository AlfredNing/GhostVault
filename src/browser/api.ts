/**
 * Browser Adapter — the ONLY place that touches chrome.* / browser.* APIs.
 *
 * Business code must never import `chrome` or `browser` directly; always go
 * through this module so Chrome / Edge / Brave / Firefox differences are
 * normalized in one place.
 *
 * Normalization rules:
 *  - Firefox exposes promise-based `browser.*` (webextension-polyfill style).
 *  - Chromium exposes callback-based `chrome.*`; modern Chromium (>= 88)
 *    also returns promises when the callback is omitted, which we rely on.
 *  - Outside an extension context (unit tests, standalone popup preview) a
 *    deterministic in-memory fallback keeps the whole app runnable.
 */

type AnyExtensionApi = typeof chrome;

declare const browser: AnyExtensionApi | undefined;

function detectExtensionApi(): AnyExtensionApi | null {
  if (typeof browser !== "undefined" && browser?.runtime?.id) return browser;
  if (typeof chrome !== "undefined" && chrome?.runtime?.id) return chrome;
  return null;
}

const api = detectExtensionApi();

/** True when running inside a real extension context (popup/SW/content). */
export const inExtensionContext = api !== null;

/** Which engine the extension currently runs in. */
export const browserRuntime: "firefox" | "chromium" =
  typeof browser !== "undefined" && browser?.runtime?.id ? "firefox" : "chromium";

// ---------------------------------------------------------------------------
// In-memory fallback (non-extension contexts only)
// ---------------------------------------------------------------------------

const memoryData = new Map<string, unknown>();

const memoryStorage = {
  async get(
    keys: string | string[] | Record<string, unknown> | null,
  ): Promise<Record<string, unknown>> {
    if (keys == null) return Object.fromEntries(memoryData);
    if (typeof keys === "string") keys = [keys];
    if (Array.isArray(keys)) {
      const out: Record<string, unknown> = {};
      for (const key of keys) {
        if (memoryData.has(key)) out[key] = memoryData.get(key);
      }
      return out;
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(keys)) {
      out[key] = memoryData.has(key) ? memoryData.get(key) : (keys as Record<string, unknown>)[key];
    }
    return out;
  },
  async set(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) memoryData.set(key, value);
  },
  async remove(keys: string | string[]): Promise<void> {
    for (const key of Array.isArray(keys) ? keys : [keys]) memoryData.delete(key);
  },
  async clear(): Promise<void> {
    memoryData.clear();
  },
};

const memoryAlarms = new Map<string, ReturnType<typeof setTimeout>>();

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

export const storage = {
  async get<T extends Record<string, unknown>>(
    keys?: string | string[] | Record<string, unknown> | null,
  ): Promise<T> {
    if (!api) return (await memoryStorage.get(keys ?? null)) as T;
    // The callback-free overload returns a promise on both engines; the
    // @types/chrome signature is narrower than what we normalize to, so we
    // pin it locally.
    const local = api.storage.local as unknown as {
      get(
        keys: string | string[] | Record<string, unknown> | null,
      ): Promise<Record<string, unknown>>;
    };
    return (await local.get(keys ?? null)) as T;
  },

  async set(items: Record<string, unknown>): Promise<void> {
    if (!api) return memoryStorage.set(items);
    await api.storage.local.set(items);
  },

  async remove(keys: string | string[]): Promise<void> {
    if (!api) return memoryStorage.remove(keys);
    await api.storage.local.remove(keys);
  },

  async clear(): Promise<void> {
    if (!api) return memoryStorage.clear();
    await api.storage.local.clear();
  },

  onChanged(
    listener: (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => void,
  ): void {
    api?.storage.onChanged.addListener(listener);
  },
};

// ---------------------------------------------------------------------------
// runtime messaging
// ---------------------------------------------------------------------------

export const runtime = {
  async sendMessage<T = unknown>(message: unknown): Promise<T> {
    if (!api) {
      throw new Error("EXTENSION_UNAVAILABLE");
    }
    return (await api.runtime.sendMessage(message)) as T;
  },

  onMessage(
    listener: (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => boolean | void,
  ): void {
    api?.runtime.onMessage.addListener(listener);
  },

  getURL(path: string): string {
    return api ? api.runtime.getURL(path) : path;
  },

  get id(): string | undefined {
    return api?.runtime.id;
  },
};

// ---------------------------------------------------------------------------
// tabs
// ---------------------------------------------------------------------------

export const tabs = {
  async query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    if (!api) return [];
    return api.tabs.query(queryInfo);
  },

  async get(tabId: number): Promise<chrome.tabs.Tab> {
    if (!api) throw new Error("EXTENSION_UNAVAILABLE");
    return api.tabs.get(tabId);
  },

  async sendMessage<T = unknown>(tabId: number, message: unknown): Promise<T> {
    if (!api) throw new Error("EXTENSION_UNAVAILABLE");
    return (await api.tabs.sendMessage(tabId, message)) as T;
  },

  async create(
    createProperties: chrome.tabs.CreateProperties,
  ): Promise<chrome.tabs.Tab | null> {
    if (!api) return null;
    return api.tabs.create(createProperties);
  },

  onUpdated(
    listener: (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab,
    ) => void,
  ): void {
    api?.tabs.onUpdated.addListener(listener);
  },
};

// ---------------------------------------------------------------------------
// alarms (drives auto-lock timing; survives service-worker restarts)
// ---------------------------------------------------------------------------

export const alarms = {
  async create(name: string, info: chrome.alarms.AlarmCreateInfo): Promise<void> {
    if (!api) {
      const previous = memoryAlarms.get(name);
      if (previous) clearTimeout(previous);
      const delayMs = (info.delayInMinutes ?? 0) * 60_000;
      memoryAlarms.set(
        name,
        setTimeout(() => {
          memoryAlarms.delete(name);
          alarmListeners.forEach((listener) => listener({ name } as chrome.alarms.Alarm));
        }, delayMs),
      );
      return;
    }
    await api.alarms.create(name, info);
  },

  async clear(name: string): Promise<boolean> {
    if (!api) {
      const had = memoryAlarms.has(name);
      const timer = memoryAlarms.get(name);
      if (timer) clearTimeout(timer);
      memoryAlarms.delete(name);
      return had;
    }
    return api.alarms.clear(name);
  },

  async get(name: string): Promise<chrome.alarms.Alarm | undefined> {
    if (!api) {
      return memoryAlarms.has(name) ? ({ name } as chrome.alarms.Alarm) : undefined;
    }
    return api.alarms.get(name);
  },

  onAlarm(listener: (alarm: chrome.alarms.Alarm) => void): void {
    if (!api) {
      alarmListeners.push(listener);
      return;
    }
    api.alarms.onAlarm.addListener(listener);
  },
};

const alarmListeners: Array<(alarm: chrome.alarms.Alarm) => void> = [];

// ---------------------------------------------------------------------------
// extension metadata
// ---------------------------------------------------------------------------

export const extensionInfo = {
  getManifest(): chrome.runtime.Manifest | null {
    return api ? api.runtime.getManifest() : null;
  },

  /**
   * Whether the user has allowed this extension to run in private windows.
   *
   *   true  → granted
   *   false → not granted
   *   null  → unknown (no extension context, or the engine does not expose it)
   *
   * Read-only by design: browsers deliberately provide no way for an extension
   * to grant itself private-window access, because that would let any extension
   * silently observe private browsing. Detection + guidance is all we can do.
   */
  async isAllowedIncognitoAccess(): Promise<boolean | null> {
    // `chrome.extension` is available on extension pages (the popup); it is not
    // guaranteed inside a service worker, hence the defensive lookup.
    const ext = api?.extension as
      | { isAllowedIncognitoAccess?: () => Promise<boolean> }
      | undefined;
    if (!ext?.isAllowedIncognitoAccess) return null;
    try {
      const allowed = await ext.isAllowedIncognitoAccess();
      // Engines that only support the legacy callback form resolve to
      // undefined; treat anything non-boolean as "cannot determine" so the UI
      // stays silent rather than claiming access is missing.
      return typeof allowed === "boolean" ? allowed : null;
    } catch {
      return null;
    }
  },

  /**
   * True when {@link openIncognitoAccessSettings} can actually navigate to the
   * page holding the toggle. Firefox forbids extensions from opening the
   * privileged `about:addons`, so there we can only tell the user where to go.
   */
  get canOpenIncognitoAccessSettings(): boolean {
    return api !== null && browserRuntime === "chromium";
  },

  /** Opens this extension's details page, where the toggle lives. */
  async openIncognitoAccessSettings(): Promise<boolean> {
    if (!this.canOpenIncognitoAccessSettings) return false;
    const id = api?.runtime.id;
    if (!id) return false;
    try {
      await tabs.create({ url: `chrome://extensions/?id=${id}` });
      return true;
    } catch {
      return false;
    }
  },
};
