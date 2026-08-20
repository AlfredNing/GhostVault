import { describe, expect, it } from "vitest";
import {
  LANGS,
  MESSAGE_KEYS,
  createTranslator,
  normalizeLang,
  resolveLang,
  translate,
} from "@/shared/i18n";

describe("language resolution", () => {
  it("collapses every Chinese variant to zh, everything else to en", () => {
    for (const tag of ["zh", "zh-CN", "zh-TW", "zh-Hant-HK", "ZH-cn"]) {
      expect(normalizeLang(tag)).toBe("zh");
    }
    for (const tag of ["en", "en-GB", "de", "ja", "", undefined, null]) {
      expect(normalizeLang(tag)).toBe("en");
    }
  });

  it("honours an explicit choice and only falls back to the browser on auto", () => {
    expect(resolveLang("auto", "zh-CN")).toBe("zh");
    expect(resolveLang("auto", "fr-FR")).toBe("en");
    // An explicit pick must win over the browser language.
    expect(resolveLang("en", "zh-CN")).toBe("en");
    expect(resolveLang("zh", "en-US")).toBe("zh");
  });
});

describe("message catalogue", () => {
  it("translates the same key differently per language", () => {
    expect(translate("en", "unlock.submit")).toBe("Unlock");
    expect(translate("zh", "unlock.submit")).toBe("解锁");
  });

  it("substitutes named parameters", () => {
    expect(translate("en", "welcome.tooShort", { min: 8 })).toContain("8");
    expect(translate("zh", "vault.deleteConfirm", { title: "github.com" })).toBe(
      "确定从保险库中删除「github.com」？",
    );
    // Unused placeholders must not leak into the output.
    expect(translate("zh", "welcome.tooShort", { min: 8 })).not.toContain("{");
  });

  it("resolves every key in both languages", () => {
    expect(MESSAGE_KEYS.length).toBeGreaterThan(50);

    for (const key of MESSAGE_KEYS) {
      for (const lang of LANGS) {
        const text = translate(lang, key);
        // A missing entry falls through and returns the key itself.
        expect(text, `${lang}: ${key}`).not.toBe(key);
        expect(text.trim().length, `${lang}: ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("actually differs between languages for user-facing prose", () => {
    // Guards against a catalogue accidentally copied from English.
    const identical = MESSAGE_KEYS.filter(
      (key) => translate("en", key) === translate("zh", key),
    );
    // Only brand/language names are legitimately identical.
    expect(identical).toEqual(["language.en", "language.zh"]);
  });

  it("binds a translator to one language", () => {
    const t = createTranslator("zh");
    expect(t("action.save")).toBe("保存");
    expect(t("content.fill")).toBe("填充");
  });
});
