/**
 * GhostVault in-page UI, rendered inside a closed Shadow DOM so page styles
 * never leak in and ours never leak out.
 *
 * Flow (never silent autofill):
 *   login form detected → ghost button appears → user clicks → credential
 *   panel → user clicks Fill → fields are filled.
 */
import type { Credential } from "../shared/types";

const STYLE = `
:host { all: initial; }
.gv-root, .gv-root * { box-sizing: border-box; margin: 0; padding: 0;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; }
.gv-fab { position: fixed; right: 20px; bottom: 20px; width: 46px; height: 46px;
  border-radius: 14px; border: 1px solid rgba(255,255,255,.14);
  background: rgba(17,17,23,.92); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  box-shadow: 0 8px 24px rgba(0,0,0,.35); z-index: 2147483646;
  transition: transform .12s ease; }
.gv-fab:hover { transform: translateY(-2px); }
.gv-fab svg { width: 26px; height: 26px; }
.gv-panel { position: fixed; right: 20px; bottom: 76px; width: 288px;
  border-radius: 14px; border: 1px solid rgba(255,255,255,.12);
  background: rgba(17,17,23,.96); backdrop-filter: blur(14px);
  box-shadow: 0 16px 48px rgba(0,0,0,.5); z-index: 2147483646;
  color: #f4f4f5; overflow: hidden; }
.gv-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,.08); font-size: 13px; font-weight: 600; }
.gv-head svg { width: 18px; height: 18px; }
.gv-head .gv-domain { margin-left: auto; font-weight: 400; font-size: 11px;
  color: #a1a1aa; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gv-list { max-height: 260px; overflow-y: auto; }
.gv-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,.05); }
.gv-item:last-child { border-bottom: none; }
.gv-meta { min-width: 0; flex: 1; }
.gv-title { font-size: 12.5px; font-weight: 600; }
.gv-user { font-size: 11px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gv-fill { flex: none; border: none; border-radius: 8px; padding: 6px 12px;
  background: #818cf8; color: #101014; font-size: 12px; font-weight: 600; cursor: pointer; }
.gv-fill:hover { background: #a5b4fc; }
.gv-empty { padding: 16px 14px; font-size: 12px; color: #a1a1aa; }
.gv-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 14px;
  border-top: 1px solid rgba(255,255,255,.08); }
.gv-btn { border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
  border: 1px solid rgba(255,255,255,.14); background: transparent; color: #d4d4d8; }
.gv-btn:hover { background: rgba(255,255,255,.06); }
.gv-btn.primary { background: #818cf8; border-color: #818cf8; color: #101014; }
.gv-btn.primary:hover { background: #a5b4fc; }
.gv-body { padding: 12px 14px; font-size: 12.5px; color: #d4d4d8; }
.gv-toast { position: fixed; right: 20px; bottom: 76px; border-radius: 10px;
  padding: 10px 14px; font-size: 12px; color: #f4f4f5;
  background: rgba(17,17,23,.96); border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 8px 24px rgba(0,0,0,.4); z-index: 2147483646; }
.gv-hidden { display: none; }
`;

const GHOST_SVG = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24 6c-8.284 0-15 6.716-15 15v17.5c0 1.35 1.62 2.05 2.6 1.12l2.32-2.2a2.1 2.1 0 0 1 2.9 0l2.28 2.18a2.1 2.1 0 0 0 2.9 0l2.55-2.44a2.1 2.1 0 0 1 2.9 0l2.55 2.44a2.1 2.1 0 0 0 2.9 0l2.28-2.18a2.1 2.1 0 0 1 2.9 0l2.32 2.2c.98.93 2.6.23 2.6-1.12V21c0-8.284-6.716-15-15-15Z" fill="#a5b4fc"/>
<circle cx="24" cy="22" r="4" fill="#111117"/><path d="M22.4 24.5h3.2l1.1 6.5a1.2 1.2 0 0 1-1.18 1.4h-3.04a1.2 1.2 0 0 1-1.18-1.4l1.1-6.5Z" fill="#111117"/></svg>`;

export interface GhostUiCallbacks {
  onOpenPanel(): void;
  onFill(credential: Credential): void;
  onSaveCandidate(): void;
  onCancelCandidate(): void;
}

export class GhostUi {
  private root: ShadowRoot;
  private panel: HTMLDivElement | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private callbacks: GhostUiCallbacks) {
    const host = document.createElement("div");
    host.id = "ghostvault-host";
    this.root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    this.root.appendChild(style);
    document.documentElement.appendChild(host);
  }

  showFab(): void {
    if (this.root.querySelector(".gv-fab")) return;
    const fab = document.createElement("button");
    fab.className = "gv-fab";
    fab.title = "GhostVault";
    fab.setAttribute("aria-label", "GhostVault");
    fab.innerHTML = GHOST_SVG;
    fab.addEventListener("click", () => {
      this.closePanel();
      this.callbacks.onOpenPanel();
    });
    this.root.appendChild(fab);
  }

  /** Render the credential picker; `credentials === null` means vault locked. */
  showPanel(credentials: Credential[] | null, domain: string): void {
    this.closePanel();
    const panel = document.createElement("div");
    panel.className = "gv-panel";

    const head = document.createElement("div");
    head.className = "gv-head";
    head.innerHTML = `${GHOST_SVG}<span>GhostVault</span><span class="gv-domain"></span>`;
    head.querySelector(".gv-domain")!.textContent = domain;
    panel.appendChild(head);

    if (credentials === null) {
      const body = document.createElement("div");
      body.className = "gv-body";
      body.textContent = "Vault is locked. Open GhostVault from the toolbar to unlock.";
      panel.appendChild(body);
    } else if (credentials.length === 0) {
      const body = document.createElement("div");
      body.className = "gv-empty";
      body.textContent = "No saved credentials for this site.";
      panel.appendChild(body);
    } else {
      const list = document.createElement("div");
      list.className = "gv-list";
      for (const credential of credentials) {
        const item = document.createElement("div");
        item.className = "gv-item";
        const meta = document.createElement("div");
        meta.className = "gv-meta";
        const title = document.createElement("div");
        title.className = "gv-title";
        title.textContent = credential.title || credential.domain;
        const user = document.createElement("div");
        user.className = "gv-user";
        user.textContent = credential.username;
        meta.append(title, user);
        const fill = document.createElement("button");
        fill.className = "gv-fill";
        fill.textContent = "Fill";
        fill.addEventListener("click", () => {
          this.closePanel();
          this.callbacks.onFill(credential);
        });
        item.append(meta, fill);
        list.appendChild(item);
      }
      panel.appendChild(list);
    }
    this.root.appendChild(panel);
    this.panel = panel;
  }

  /** "Save password?" confirmation card. */
  showSavePrompt(username: string, domain: string): void {
    this.closePanel();
    const panel = document.createElement("div");
    panel.className = "gv-panel";
    panel.innerHTML = `
      <div class="gv-head">${GHOST_SVG}<span>Save password?</span></div>
      <div class="gv-body"></div>
      <div class="gv-actions">
        <button class="gv-btn cancel">Cancel</button>
        <button class="gv-btn primary save">Save</button>
      </div>`;
    panel.querySelector(".gv-body")!.textContent = `${domain} — ${username}`;
    panel.querySelector(".cancel")!.addEventListener("click", () => {
      this.closePanel();
      this.callbacks.onCancelCandidate();
    });
    panel.querySelector(".save")!.addEventListener("click", () => {
      this.closePanel();
      this.callbacks.onSaveCandidate();
    });
    this.root.appendChild(panel);
    this.panel = panel;
  }

  toast(text: string): void {
    const toast = document.createElement("div");
    toast.className = "gv-toast";
    toast.textContent = text;
    this.root.appendChild(toast);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.remove(), 2400);
  }

  closePanel(): void {
    this.panel?.remove();
    this.panel = null;
  }
}
