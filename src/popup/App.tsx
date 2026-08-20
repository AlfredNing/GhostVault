import { useEffect, useState } from "react";
import type { VaultStatus } from "@/shared/types";
import type { VaultApi } from "@/shared/vaultApi";
import { getVaultApi } from "./api";
import { I18nProvider, useT } from "./i18n";
import { UnlockView } from "./views/UnlockView";
import { VaultView } from "./views/VaultView";
import { WelcomeView } from "./views/WelcomeView";

/**
 * Popup state machine:
 *   uninitialized → Welcome (create master password)
 *   locked        → Unlock
 *   unlocked      → Vault
 */
export default function App() {
  const [api, setApi] = useState<VaultApi | null>(null);
  const [status, setStatus] = useState<VaultStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getVaultApi().then(async (resolved) => {
      if (cancelled) return;
      setApi(resolved);
      setStatus(await resolved.getStatus());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The provider wraps the loading state too, so every string — including
  // "Loading…" — is translated from the very first paint.
  return (
    <I18nProvider api={api}>
      <Routes api={api} status={status} onChange={setStatus} />
    </I18nProvider>
  );
}

function Routes({
  api,
  status,
  onChange,
}: {
  api: VaultApi | null;
  status: VaultStatus | null;
  onChange: (status: VaultStatus) => void;
}) {
  const t = useT();

  if (!api || !status) {
    return (
      <div className="flex min-h-[480px] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("app.loading")}</p>
      </div>
    );
  }

  const refresh = async () => onChange(await api.getStatus());

  if (status === "uninitialized") {
    return <WelcomeView api={api} onCreated={() => void refresh()} />;
  }
  if (status === "locked") {
    return <UnlockView api={api} onUnlocked={() => void refresh()} />;
  }
  return <VaultView api={api} onLocked={() => void refresh()} />;
}
