import { useEffect, useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { domainFromUrl } from "@/shared/matching";
import type { Credential } from "@/shared/types";
import type { VaultApi } from "@/shared/vaultApi";
import { useT } from "../i18n";

function generatePassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function CredentialDialog({
  api,
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  api: VaultApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Credential | null;
  onSaved: () => Promise<void>;
}) {
  const t = useT();
  const [website, setWebsite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setWebsite(editing?.url ?? editing?.domain ?? "");
    setUsername(editing?.username ?? "");
    setPassword(editing?.password ?? "");
  }, [open, editing]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const domain = domainFromUrl(website.trim());
    if (!domain) {
      setError(t("credential.invalidWebsite"));
      return;
    }
    if (!username.trim() || !password) {
      setError(t("credential.required"));
      return;
    }
    const input = {
      title: domain,
      domain,
      url: website.trim(),
      username: username.trim(),
      password,
    };
    setBusy(true);
    try {
      if (editing) {
        await api.update(editing.id, input);
      } else {
        await api.add(input);
      }
      onOpenChange(false);
      await onSaved();
    } catch {
      setError(t("credential.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("credential.editTitle") : t("credential.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="gv-website">{t("credential.website")}</Label>
            <Input
              id="gv-website"
              placeholder="https://github.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gv-username">{t("credential.username")}</Label>
            <Input
              id="gv-username"
              placeholder="you@example.com"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gv-password">{t("credential.password")}</Label>
            <div className="flex gap-2">
              <Input
                id="gv-password"
                type="text"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={t("credential.generate")}
                aria-label={t("credential.generate")}
                onClick={() => setPassword(generatePassword())}
              >
                <Dices />
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t("credential.saving") : t("action.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
