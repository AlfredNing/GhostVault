/**
 * Login form detection — pure DOM heuristics, no extension APIs, so it is
 * unit-testable under jsdom.
 *
 * Detection does NOT rely on `input[type=password]` alone; it also honours
 * autocomplete / name / id / placeholder / aria-label hints and works for
 * React / Vue / Angular / SPA-rendered forms (the caller re-runs `scan`
 * from a MutationObserver).
 */

export interface LoginForm {
  form: HTMLFormElement | null;
  usernameField: HTMLInputElement | null;
  passwordField: HTMLInputElement;
}

const PASSWORD_HINT =
  /password|passwd|pwd|passwort|contrase|mot de passe|current-?password|new-?password/i;
const USERNAME_HINT =
  /user|email|e-?mail|login|account|accountname|username|sign-in|signin|phone|mobile|identifier/i;
const USERNAME_AUTOCOMPLETE = new Set([
  "username",
  "email",
  "nickname",
  "tel",
  "organization",
]);

function attr(el: HTMLInputElement, name: string): string {
  return el.getAttribute(name) ?? "";
}

function hints(el: HTMLInputElement, re: RegExp): boolean {
  return (
    re.test(attr(el, "name")) ||
    re.test(attr(el, "id")) ||
    re.test(attr(el, "placeholder")) ||
    re.test(attr(el, "aria-label"))
  );
}

export function isPasswordInput(el: Element): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) return false;
  const type = (el.type || "text").toLowerCase();
  if (type === "hidden" || type === "checkbox" || type === "radio") return false;
  if (type === "password") return true;
  const autocomplete = attr(el, "autocomplete").toLowerCase();
  if (autocomplete === "current-password" || autocomplete === "new-password") {
    return true;
  }
  return hints(el, PASSWORD_HINT) && type !== "email";
}

export function isUsernameInput(el: Element): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) return false;
  const type = (el.type || "text").toLowerCase();
  if (!["text", "email", "tel", "search", "url", ""].includes(type)) return false;
  if (isPasswordInput(el)) return false;
  const autocomplete = attr(el, "autocomplete").toLowerCase();
  if (USERNAME_AUTOCOMPLETE.has(autocomplete)) return true;
  return hints(el, USERNAME_HINT);
}

export function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

function findUsernameNear(passwordField: HTMLInputElement): HTMLInputElement | null {
  const scope: ParentNode | null =
    passwordField.form ??
    passwordField.closest("form") ??
    passwordField.closest("div,section,fieldset,main,body");
  if (!scope) return null;

  // Prefer inputs that appear before the password field in DOM order.
  const candidates = Array.from(
    scope.querySelectorAll<HTMLInputElement>("input"),
  ).filter((input) => input !== passwordField && isUsernameInput(input));
  if (candidates.length === 0) return null;

  // Closest in document order right before the password field wins.
  const position = passwordField.compareDocumentPosition.bind(passwordField);
  const before = candidates.filter(
    (c) => position(c) & Node.DOCUMENT_POSITION_PRECEDING,
  );
  return (before.length > 0 ? before : candidates)[
    before.length > 0 ? before.length - 1 : 0
  ];
}

/** Scan a root for visible login forms. */
export function scanLoginForms(root: ParentNode = document): LoginForm[] {
  const passwordInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("input"),
  ).filter((input) => isPasswordInput(input) && isVisible(input));

  const found: LoginForm[] = [];
  const seen = new Set<HTMLInputElement>();

  for (const passwordField of passwordInputs) {
    if (seen.has(passwordField)) continue;
    seen.add(passwordField);
    found.push({
      form:
        passwordField.form ??
        (passwordField.closest("form") as HTMLFormElement | null),
      usernameField: findUsernameNear(passwordField),
      passwordField,
    });
  }
  return found;
}

/** True when the page looks like a login/signup page (at least one form). */
export function hasLoginForm(root: ParentNode = document): boolean {
  return scanLoginForms(root).length > 0;
}
