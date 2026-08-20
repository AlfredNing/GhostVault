import { useState } from "react";
import { GhostLogo } from "@/components/GhostLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VaultApi } from "@/shared/vaultApi";

const MIN_LENGTH = 8;

export function WelcomeView({
  api,
  onCreated,
}: {
  api: VaultApi;
  onCreated: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Master password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.createVault(password);
      onCreated();
    } catch {
      setError("Could not create the vault.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[480px] flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <GhostLogo size={56} />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Welcome to GhostVault
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Your private digital identity vault. Encrypted locally, never
            uploaded.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gv-new-password">Create Master Password</Label>
          <Input
            id="gv-new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gv-confirm-password">Confirm Password</Label>
          <Input
            id="gv-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat master password"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating vault…" : "Create Vault"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          The master password is never stored. If you forget it, the vault
          cannot be recovered.
        </p>
      </form>
    </div>
  );
}
