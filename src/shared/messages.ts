/** Typed message contracts between popup / content script / background. */
import type { CredentialInput, Settings } from "./types";

export type ExtensionMessage =
  | { type: "gv:ping" }
  | { type: "gv:vault-status:get" }
  | { type: "gv:vault:create"; password: string }
  | { type: "gv:vault:unlock"; password: string }
  | { type: "gv:vault:lock" }
  | { type: "gv:credentials:list" }
  | { type: "gv:credentials:search"; query: string }
  | { type: "gv:credentials:add"; input: CredentialInput }
  | { type: "gv:credentials:update"; id: string; patch: Partial<CredentialInput> }
  | { type: "gv:credentials:delete"; id: string }
  | { type: "gv:credentials:for-domain"; domain: string }
  | { type: "gv:settings:get" }
  | { type: "gv:settings:set"; settings: Settings }
  | { type: "gv:page-detected"; payload: { url: string; domain: string } };

/** Every gv:* request resolves to this envelope. */
export type MessageEnvelope<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function isMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string" &&
    ((value as { type: string }).type as string).startsWith("gv:")
  );
}
