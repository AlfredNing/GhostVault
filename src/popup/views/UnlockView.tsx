import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { GhostLogo } from "@/components/GhostLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VaultApi } from "@/shared/vaultApi";
import { useT } from "../i18n";

export function UnlockView({
  api,
  onUnlocked,
}: {
  api: VaultApi;
  onUnlocked: () => void;
}) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.unlock(password);
      onUnlocked();
    } catch (err) {
      setError(
        err instanceof Error && err.message === "WRONG_PASSWORD"
          ? t("unlock.wrongPassword")
          : t("unlock.failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[480px] flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <GhostLogo size={56} />
        <div>
          <h1 className="flex items-center justify-center gap-2 text-lg font-semibold tracking-tight">
            <LockKeyhole className="size-4 text-muted-foreground" />
            {t("unlock.title")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("unlock.subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gv-master-password">{t("unlock.label")}</Label>
          <Input
            id="gv-master-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("unlock.placeholder")}
          />
        </div>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy || password.length === 0} className="w-full">
          {busy ? t("unlock.submitting") : t("unlock.submit")}
        </Button>
      </form>
    </div>
  );
}
