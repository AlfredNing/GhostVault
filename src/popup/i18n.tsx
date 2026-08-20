/**
 * Popup-side i18n wiring.
 *
 * The effective language is derived from the persisted preference; `auto`
 * resolves against the browser UI language reported by the Browser Adapter.
 * Switching the language re-renders the whole popup through context.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { locale } from "@/browser/api";
import {
  DEFAULT_LANGUAGE,
  createTranslator,
  resolveLang,
} from "@/shared/i18n";
import type { Lang, LanguageSetting, Translator } from "@/shared/i18n";
import type { VaultApi } from "@/shared/vaultApi";

/** Constant for the lifetime of the popup. */
const UI_LANGUAGE = locale.getUILanguage();

interface I18nValue {
  t: Translator;
  lang: Lang;
  /** The stored preference, which may be `auto`. */
  setting: LanguageSetting;
  setLanguage(setting: LanguageSetting): Promise<void>;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  api,
  children,
}: {
  api: VaultApi | null;
  children: ReactNode;
}) {
  const [setting, setSetting] = useState<LanguageSetting>(DEFAULT_LANGUAGE);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    void api.getSettings().then((settings) => {
      if (!cancelled) setSetting(settings.language);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const value = useMemo<I18nValue>(() => {
    const lang = resolveLang(setting, UI_LANGUAGE);
    return {
      lang,
      setting,
      t: createTranslator(lang),
      async setLanguage(next) {
        setSetting(next);
        if (!api) return;
        // Re-read before writing: `setSettings` replaces the whole record, so
        // using stale state here would clobber other preferences.
        const current = await api.getSettings();
        await api.setSettings({ ...current, language: next });
      },
    };
  }, [api, setting]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}

/** Convenience for components that only need the translate function. */
export function useT(): Translator {
  return useI18n().t;
}
