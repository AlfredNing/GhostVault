/**
 * GhostVault content script orchestration.
 *
 *  Phase 5 — detect login forms (MutationObserver, SPA-friendly)
 *  Phase 6 — explicit user-triggered autofill via Shadow DOM panel
 *  Phase 7 — post-submit "Save password?" confirmation
 *
 * The content script never sees the master password and never stores
 * anything; all vault access goes through the background service worker.
 */
import { runtime } from "../browser/api";
import type { MessageEnvelope } from "../shared/messages";
import { domainFromUrl } from "../shared/matching";
import type { Credential, CredentialInput } from "../shared/types";
import { scanLoginForms, type LoginForm } from "./detect";
import { fillLoginForm } from "./fill";
import { GhostUi } from "./ui";

(() => {
  const guardKey = "__ghostvault_content_loaded__";
  const win = window as unknown as Record<string, unknown>;
  if (win[guardKey]) return;
  win[guardKey] = true;

  if (!/^https?:$/.test(location.protocol)) return;

  const pageDomain = domainFromUrl(location.hostname);

  async function send<T>(message: unknown): Promise<T> {
    const envelope = await runtime.sendMessage<MessageEnvelope<T>>(message);
    if (!envelope.ok) throw new Error(envelope.error);
    return envelope.data;
  }

  let activeForm: LoginForm | null = null;
  let candidate: CredentialInput | null = null;
  const observedForms = new WeakSet<HTMLFormElement>();

  const ui = new GhostUi({
    onOpenPanel: () => {
      void openPanel();
    },
    onFill: (credential) => {
      if (activeForm) {
        fillLoginForm(activeForm, credential);
        ui.toast("Filled by GhostVault");
      }
    },
    onSaveCandidate: () => {
      if (!candidate) return;
      send<Credential>({ type: "gv:credentials:add", input: candidate })
        .then(() => ui.toast("Saved to GhostVault"))
        .catch(() => ui.toast("Could not save credential"));
      candidate = null;
    },
    onCancelCandidate: () => {
      candidate = null;
    },
  });

  async function openPanel(): Promise<void> {
    try {
      const credentials = await send<Credential[]>({
        type: "gv:credentials:for-domain",
        domain: pageDomain,
      });
      ui.showPanel(credentials, pageDomain);
    } catch (error) {
      // LOCKED → guide the user to the toolbar popup.
      ui.showPanel(
        error instanceof Error && error.message === "LOCKED" ? null : [],
        pageDomain,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Phase 7 — capture submitted credentials and offer to save them
  // -------------------------------------------------------------------------

  function watchFormSubmit(form: LoginForm): void {
    const element = form.form;
    if (!element || observedForms.has(element)) return;
    observedForms.add(element);

    element.addEventListener(
      "submit",
      () => {
        const username = form.usernameField?.value.trim() ?? "";
        const password = form.passwordField.value;
        if (!password) return;
        const captured = { username, password };

        window.setTimeout(() => {
          void maybePromptSave(captured);
        }, 900);
      },
      true,
    );
  }

  async function maybePromptSave(captured: {
    username: string;
    password: string;
  }): Promise<void> {
    try {
      const existing = await send<Credential[]>({
        type: "gv:credentials:for-domain",
        domain: pageDomain,
      });
      const duplicate = existing.some(
        (c) =>
          c.username === captured.username && c.password === captured.password,
      );
      if (duplicate) return;

      candidate = {
        title: pageDomain,
        domain: pageDomain,
        url: location.href,
        username: captured.username || pageDomain,
        password: captured.password,
      };
      ui.showSavePrompt(candidate.username, pageDomain);
    } catch {
      // Vault locked or background unavailable → never nag the user.
    }
  }

  // -------------------------------------------------------------------------
  // Phase 5 — detection loop (initial scan + MutationObserver for SPA forms)
  // -------------------------------------------------------------------------

  function scan(): void {
    const forms = scanLoginForms(document);
    if (forms.length === 0) return;
    activeForm = forms[0];
    for (const form of forms) watchFormSubmit(form);
    ui.showFab();
    void send({
      type: "gv:page-detected",
      payload: { url: location.href, domain: pageDomain },
    }).catch(() => undefined);
  }

  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 300);
  });

  scan();
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
