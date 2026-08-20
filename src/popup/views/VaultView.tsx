import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Globe,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { GhostLogo } from "@/components/GhostLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Credential } from "@/shared/types";
import type { VaultApi } from "@/shared/vaultApi";
import { CredentialDialog } from "./CredentialDialog";
import { IncognitoNotice } from "./IncognitoNotice";
import { SettingsDialog } from "./SettingsDialog";

export function VaultView({
  api,
  onLocked,
}: {
  api: VaultApi;
  onLocked: () => void;
}) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    setCredentials(await api.list());
  }

  useEffect(() => {
    void refresh();
  }, [api]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return credentials;
    return credentials.filter((c) =>
      [c.title, c.username, c.domain, c.url ?? ""].some((f) =>
        f.toLowerCase().includes(q),
      ),
    );
  }, [credentials, query]);

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((v) => (v === id ? null : v)), 1200);
  }

  async function remove(credential: Credential) {
    if (!window.confirm(`Delete "${credential.title}" from the vault?`)) return;
    await api.remove(credential.id);
    await refresh();
  }

  return (
    <div className="flex min-h-[480px] flex-col">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <GhostLogo size={24} />
        <span className="text-sm font-semibold tracking-tight">GhostVault</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Lock vault"
            aria-label="Lock vault"
            onClick={() => {
              void api.lock().then(onLocked);
            }}
          >
            <LockKeyhole />
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search vault"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          size="icon"
          title="Add credential"
          aria-label="Add credential"
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <IncognitoNotice api={api} />
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <Globe className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {credentials.length === 0
                ? "No credentials yet. Add your first one."
                : "Nothing matches your search."}
            </p>
          </div>
        ) : (
          visible.map((credential) => (
            <div
              key={credential.id}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {credential.title || credential.domain}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {credential.username} · {credential.domain}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Copy username"
                  aria-label="Copy username"
                  onClick={() => void copy(credential.username, `u${credential.id}`)}
                >
                  {copiedId === `u${credential.id}` ? <Check /> : <Copy />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Copy password"
                  aria-label="Copy password"
                  onClick={() => void copy(credential.password, `p${credential.id}`)}
                >
                  {copiedId === `p${credential.id}` ? <Check /> : <LockKeyhole />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit"
                  aria-label="Edit"
                  onClick={() => {
                    setEditing(credential);
                    setEditorOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => void remove(credential)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <CredentialDialog
        api={api}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editing}
        onSaved={refresh}
      />
      <SettingsDialog api={api} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
