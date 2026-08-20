import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_OPTIONS } from "@/shared/i18n";
import type { LanguageSetting } from "@/shared/i18n";
import { LOCK_TIMEOUT_OPTIONS } from "@/shared/types";
import type { LockTimeoutMinutes, Settings } from "@/shared/types";
import type { VaultApi } from "@/shared/vaultApi";
import { useI18n } from "../i18n";
import { IncognitoAccessRow } from "./IncognitoNotice";

export function SettingsDialog({
  api,
  open,
  onOpenChange,
}: {
  api: VaultApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, setting: language, setLanguage } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (open) void api.getSettings().then(setSettings);
  }, [open, api]);

  async function changeTimeout(value: string) {
    const lockTimeout = Number(value) as LockTimeoutMinutes;
    // Re-read before writing: `setSettings` replaces the whole record, so
    // relying on local state would drop preferences changed elsewhere (e.g.
    // the language, which is owned by the i18n provider).
    const current = await api.getSettings();
    const next: Settings = { ...current, lockTimeout };
    setSettings(next);
    await api.setSettings(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label>{t("settings.autoLock")}</Label>
          <Select
            value={String(settings?.lockTimeout ?? 5)}
            onValueChange={(value) => void changeTimeout(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCK_TIMEOUT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("settings.language")}</Label>
          <Select
            value={language}
            onValueChange={(value) =>
              void setLanguage(value as LanguageSetting)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <IncognitoAccessRow />
      </DialogContent>
    </Dialog>
  );
}
