/**
 * Framework-friendly autofill.
 *
 * React / Vue / Angular track `value` internally; assigning `.value`
 * directly bypasses their setters and the UI state stays stale. We invoke
 * the native HTMLInputElement value setter and then dispatch `input` /
 * `change` so every framework notices the update.
 */
import type { Credential } from "../shared/types";
import type { LoginForm } from "./detect";

function setNativeValue(input: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  if (descriptor?.set) {
    descriptor.set.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function fillLoginForm(form: LoginForm, credential: Credential): void {
  if (form.usernameField) {
    setNativeValue(form.usernameField, credential.username);
    form.usernameField.focus();
  }
  setNativeValue(form.passwordField, credential.password);
  form.passwordField.focus();
}
