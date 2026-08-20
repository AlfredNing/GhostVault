import { useState } from "react";
import { GhostLogo } from "@/components/GhostLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VaultApi } from "@/shared/vaultApi";
import { useT } from "../i18n";
import { DonateButton } from "./DonateButton";

const MIN_LENGTH = 8;

export function WelcomeView({
  api,
  onCreated,
}: {
  api: VaultApi;
  onCreated: () => void;
}) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(t("welcome.tooShort", { min: MIN_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(t("welcome.mismatch"));
      return;
    }
    setBusy(true);
    try {
      await api.createVault(password);
      onCreated();
    } catch {
      setError(t("welcome.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[480px] flex-col justify-center gap-6 p-6">
      <DonateButton className="absolute top-3 right-3" />
      <div className="flex flex-col items-center gap-3 text-center">
        <GhostLogo size={56} />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {t("welcome.title")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("welcome.subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gv-new-password">{t("welcome.passwordLabel")}</Label>
          <Input
            id="gv-new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("welcome.passwordPlaceholder", { min: MIN_LENGTH })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gv-confirm-password">
            {t("welcome.confirmLabel")}
          </Label>
          <Input
            id="gv-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("welcome.confirmPlaceholder")}
          />
        </div>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? t("welcome.submitting") : t("welcome.submit")}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          {t("welcome.hint")}
        </p>
      </form>
    </div>
  );
}
