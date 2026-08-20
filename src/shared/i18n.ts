/**
 * Bilingual (English / Chinese) message catalogue.
 *
 * A self-contained dictionary is used instead of the native `chrome.i18n`
 * (`_locales` + `getMessage`) for the in-app UI because:
 *  - `chrome.i18n` cannot be overridden at runtime, so the user could never
 *    pick a language independently of the browser UI language (this is exactly
 *    why Bitwarden's extension has no language switch),
 *  - it returns empty strings outside an extension context, which would blank
 *    out the standalone popup preview that this project deliberately supports,
 *  - and a plain object gives compile-time key checking.
 *
 * `_locales/` is still used, but only to localise the manifest `description`.
 */

export type Lang = "en" | "zh";

/** What the user picks in Settings; `auto` follows the browser UI language. */
export type LanguageSetting = "auto" | Lang;

export const DEFAULT_LANGUAGE: LanguageSetting = "auto";

const en = {
  // -- shared ---------------------------------------------------------------
  "app.loading": "Loading…",
  "action.cancel": "Cancel",
  "action.save": "Save",

  // -- welcome (first run) --------------------------------------------------
  "welcome.title": "Welcome to GhostVault",
  "welcome.subtitle":
    "Your private digital identity vault. Encrypted locally, never uploaded.",
  "welcome.passwordLabel": "Create Master Password",
  "welcome.passwordPlaceholder": "At least {min} characters",
  "welcome.confirmLabel": "Confirm Password",
  "welcome.confirmPlaceholder": "Repeat master password",
  "welcome.tooShort": "Master password must be at least {min} characters.",
  "welcome.mismatch": "Passwords do not match.",
  "welcome.failed": "Could not create the vault.",
  "welcome.submit": "Create Vault",
  "welcome.submitting": "Creating vault…",
  "welcome.hint":
    "The master password is never stored. If you forget it, the vault cannot be recovered.",

  // -- unlock ---------------------------------------------------------------
  "unlock.title": "GhostVault Locked",
  "unlock.subtitle": "Enter your master password to unlock.",
  "unlock.label": "Master Password",
  "unlock.placeholder": "Master password",
  "unlock.wrongPassword": "Incorrect master password.",
  "unlock.failed": "Could not unlock the vault.",
  "unlock.submit": "Unlock",
  "unlock.submitting": "Unlocking…",

  // -- vault list -----------------------------------------------------------
  "vault.settings": "Settings",
  "vault.lock": "Lock vault",
  "vault.search": "Search vault",
  "vault.add": "Add credential",
  "vault.empty": "No credentials yet. Add your first one.",
  "vault.noMatch": "Nothing matches your search.",
  "vault.copyUsername": "Copy username",
  "vault.copyPassword": "Copy password",
  "vault.edit": "Edit",
  "vault.delete": "Delete",
  "vault.deleteConfirm": "Delete “{title}” from the vault?",

  // -- credential editor ----------------------------------------------------
  "credential.addTitle": "Add credential",
  "credential.editTitle": "Edit credential",
  "credential.website": "Website",
  "credential.username": "Username",
  "credential.password": "Password",
  "credential.invalidWebsite": "Enter a website address, e.g. https://github.com",
  "credential.required": "Username and password are required.",
  "credential.failed": "Could not save the credential.",
  "credential.generate": "Generate strong password",
  "credential.saving": "Saving…",

  // -- settings -------------------------------------------------------------
  "settings.title": "Settings",
  "settings.description":
    "Auto-lock clears the decrypted vault and key material from memory.",
  "settings.autoLock": "Auto-lock after",
  "settings.language": "Language",
  "lockTimeout.5": "5 minutes",
  "lockTimeout.15": "15 minutes",
  "lockTimeout.30": "30 minutes",
  "lockTimeout.0": "Never",
  "language.auto": "Follow browser",
  "language.en": "English",
  "language.zh": "中文",

  // -- donate (buy me a coffee) ----------------------------------------------
  "vault.donate": "Buy me an Americano",
  "donate.title": "Buy me an Americano",
  "donate.description": "If GhostVault helps you, consider fueling its developer.",
  "donate.caption": "“You’ve worked hard — have an Americano.”",
  "donate.hint": "Open WeChat and scan the reward code to tip.",
  "donate.fabLabel": "I love Americano",

  // -- private windows ------------------------------------------------------
  "incognito.title": "Enable in private windows",
  "incognito.instructionsChromium":
    "Open this extension’s details page and allow it in private windows.",
  "incognito.instructionsFirefox":
    "In the Add-ons Manager, set “Run in Private Windows” to Allow.",
  "incognito.open": "Open settings",
  "incognito.enable": "Enable",
  "incognito.dismiss": "Don’t show again",
  "incognito.rowTitle": "Private windows",
  "incognito.allowed": "Allowed by the browser.",

  // -- in-page content script UI -------------------------------------------
  "content.locked":
    "Vault is locked. Open GhostVault from the toolbar to unlock.",
  "content.noCredentials": "No saved credentials for this site.",
  "content.fill": "Fill",
  "content.savePrompt": "Save password?",
  "content.filled": "Filled by GhostVault",
  "content.saved": "Saved to GhostVault",
  "content.saveFailed": "Could not save credential",
} as const;

export type MessageKey = keyof typeof en;

/** Typed as a full record so a missing Chinese entry fails the build. */
const zh: Record<MessageKey, string> = {
  "app.loading": "加载中…",
  "action.cancel": "取消",
  "action.save": "保存",

  "welcome.title": "欢迎使用 GhostVault",
  "welcome.subtitle": "你的私人数字身份保险库。本地加密，绝不上传。",
  "welcome.passwordLabel": "创建主密码",
  "welcome.passwordPlaceholder": "至少 {min} 个字符",
  "welcome.confirmLabel": "确认密码",
  "welcome.confirmPlaceholder": "再次输入主密码",
  "welcome.tooShort": "主密码至少需要 {min} 个字符。",
  "welcome.mismatch": "两次输入的密码不一致。",
  "welcome.failed": "无法创建保险库。",
  "welcome.submit": "创建保险库",
  "welcome.submitting": "正在创建保险库…",
  "welcome.hint": "主密码不会被保存。一旦忘记，保险库将无法恢复。",

  "unlock.title": "GhostVault 已锁定",
  "unlock.subtitle": "输入主密码以解锁。",
  "unlock.label": "主密码",
  "unlock.placeholder": "主密码",
  "unlock.wrongPassword": "主密码不正确。",
  "unlock.failed": "无法解锁保险库。",
  "unlock.submit": "解锁",
  "unlock.submitting": "正在解锁…",

  "vault.settings": "设置",
  "vault.lock": "锁定保险库",
  "vault.search": "搜索保险库",
  "vault.add": "添加凭据",
  "vault.empty": "还没有任何凭据，先添加第一条。",
  "vault.noMatch": "没有匹配的结果。",
  "vault.copyUsername": "复制用户名",
  "vault.copyPassword": "复制密码",
  "vault.edit": "编辑",
  "vault.delete": "删除",
  "vault.deleteConfirm": "确定从保险库中删除「{title}」？",

  "credential.addTitle": "添加凭据",
  "credential.editTitle": "编辑凭据",
  "credential.website": "网站",
  "credential.username": "用户名",
  "credential.password": "密码",
  "credential.invalidWebsite": "请输入网站地址，例如 https://github.com",
  "credential.required": "用户名和密码不能为空。",
  "credential.failed": "无法保存凭据。",
  "credential.generate": "生成强密码",
  "credential.saving": "正在保存…",

  "settings.title": "设置",
  "settings.description": "自动锁定会清除内存中已解密的保险库与密钥。",
  "settings.autoLock": "自动锁定时间",
  "settings.language": "语言",
  "lockTimeout.5": "5 分钟",
  "lockTimeout.15": "15 分钟",
  "lockTimeout.30": "30 分钟",
  "lockTimeout.0": "永不",
  "language.auto": "跟随浏览器",
  "language.en": "English",
  "language.zh": "中文",

  "vault.donate": "请我喝美式",
  "donate.title": "请我喝美式",
  "donate.description": "如果 GhostVault 帮到了你，欢迎给开发者加杯咖啡。",
  "donate.caption": "「辛苦了，来杯美式」",
  "donate.hint": "打开微信扫一扫赞赏码，打赏任意金额。",
  "donate.fabLabel": "我爱喝美式",

  "incognito.title": "在隐私窗口中启用",
  "incognito.instructionsChromium": "打开本扩展的详情页，允许它在隐私窗口中运行。",
  "incognito.instructionsFirefox":
    "在附加组件管理器中，将「在隐私窗口中运行」设为允许。",
  "incognito.open": "打开设置",
  "incognito.enable": "去开启",
  "incognito.dismiss": "不再提示",
  "incognito.rowTitle": "隐私窗口",
  "incognito.allowed": "浏览器已授权。",

  "content.locked": "保险库已锁定。请从工具栏打开 GhostVault 解锁。",
  "content.noCredentials": "该网站还没有保存的凭据。",
  "content.fill": "填充",
  "content.savePrompt": "保存密码？",
  "content.filled": "已由 GhostVault 填充",
  "content.saved": "已保存到 GhostVault",
  "content.saveFailed": "无法保存凭据",
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, zh };

export const LANGS: readonly Lang[] = ["en", "zh"];

/** Every known key, for exhaustive checks. */
export const MESSAGE_KEYS = Object.keys(en) as MessageKey[];

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  value: LanguageSetting;
  labelKey: MessageKey;
}> = [
  { value: "auto", labelKey: "language.auto" },
  { value: "en", labelKey: "language.en" },
  { value: "zh", labelKey: "language.zh" },
];

/**
 * Map a BCP-47 tag to a supported language. Every Chinese variant (zh-CN,
 * zh-TW, zh-Hant-HK …) collapses to `zh`; anything else falls back to English.
 */
export function normalizeLang(uiLanguage: string | undefined | null): Lang {
  return (uiLanguage ?? "").toLowerCase().startsWith("zh") ? "zh" : "en";
}

/** Resolve the effective language from the stored preference. */
export function resolveLang(
  setting: LanguageSetting,
  uiLanguage: string | undefined | null,
): Lang {
  return setting === "auto" ? normalizeLang(uiLanguage) : setting;
}

export type Translator = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

export function translate(
  lang: Lang,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text = MESSAGES[lang]?.[key] ?? en[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** Bind a translator to one language. */
export function createTranslator(lang: Lang): Translator {
  return (key, params) => translate(lang, key, params);
}
