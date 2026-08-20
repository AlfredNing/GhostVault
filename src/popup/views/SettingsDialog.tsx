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
import { LOCK_TIMEOUT_OPTIONS } from "@/shared/types";
import type { LockTimeoutMinutes, Settings } from "@/shared/types";
import type { VaultApi } from "@/shared/vaultApi";

export function SettingsDialog({
  api,
  open,
  onOpenChange,
}: {
  api: VaultApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (open) void api.getSettings().then(setSettings);
  }, [open, api]);

  async function changeTimeout(value: string) {
    const lockTimeout = Number(value) as LockTimeoutMinutes;
    const next = { lockTimeout };
    setSettings(next);
    await api.setSettings(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Auto-lock clears the decrypted vault and key material from memory.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label>Auto-lock after</Label>
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
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  );
}
