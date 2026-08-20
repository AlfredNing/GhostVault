/**
 * Private-window access: detection + guidance.
 *
 * Browsers disable extensions in private windows until the user opts in, and
 * they expose no API for an extension to grant itself that access (see
 * `extensionInfo.isAllowedIncognitoAccess`). So the popup detects the missing
 * permission and points the user at the toggle — one click away on Chromium.
 */
import { useEffect, useState } from "react";
import { EyeOff, X } from "lucide-react";
import { browserRuntime, extensionInfo } from "@/browser/api";
import { Button } from "@/components/ui/button";
import type { VaultApi } from "@/shared/vaultApi";

const INSTRUCTIONS =
  browserRuntime === "firefox"
    ? "In the Add-ons Manager, set “Run in Private Windows” to Allow."
    : "Open this extension’s details page and allow it in private windows.";

/**
 * Whether the extension may run in private windows:
 * `true` granted, `false` not granted, `null` still loading or undeterminable.
 */
export function useIncognitoAccess(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void extensionInfo.isAllowedIncognitoAccess().then((value) => {
      if (!cancelled) setAllowed(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return allowed;
}

/** Shared "take me to the toggle" action; hidden when the engine forbids it. */
export function OpenIncognitoSettingsButton({ label }: { label: string }) {
  if (!extensionInfo.canOpenIncognitoAccessSettings) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => void extensionInfo.openIncognitoAccessSettings()}
    >
      {label}
    </Button>
  );
}

/**
 * Dismissible banner shown on the vault list. Dismissal is persisted so the
 * hint never nags; the Settings dialog keeps a permanent entry point.
 */
export function IncognitoNotice({ api }: { api: VaultApi }) {
  const allowed = useIncognitoAccess();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.getSettings().then((settings) => {
      if (!cancelled) setDismissed(settings.incognitoHintDismissed);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function dismiss() {
    setDismissed(true);
    const current = await api.getSettings();
    await api.setSettings({ ...current, incognitoHintDismissed: true });
  }

  // Only surface the hint once we know access is genuinely missing.
  if (allowed !== false || dismissed !== false) return null;

  return (
    <div className="mx-2 mb-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start gap-2">
        <EyeOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">Enable in private windows</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {INSTRUCTIONS}
          </p>
          <div className="mt-2">
            <OpenIncognitoSettingsButton label="Open settings" />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Don’t show again"
          aria-label="Don’t show again"
          onClick={() => void dismiss()}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

/** Permanent status row inside the Settings dialog. */
export function IncognitoAccessRow() {
  const allowed = useIncognitoAccess();
  if (allowed === null) return null;

  return (
    <div className="flex items-center gap-2 border-t border-white/10 pt-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm">Private windows</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {allowed ? "Allowed by the browser." : INSTRUCTIONS}
        </p>
      </div>
      {!allowed && <OpenIncognitoSettingsButton label="Enable" />}
    </div>
  );
}
