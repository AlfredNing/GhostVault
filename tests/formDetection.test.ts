// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { scanLoginForms } from "@/content/detect";
import { fillLoginForm } from "@/content/fill";

beforeAll(() => {
  // jsdom has no layout engine; pretend every element has a box.
  Element.prototype.getBoundingClientRect = () =>
    ({
      width: 120,
      height: 24,
      top: 0,
      left: 0,
      right: 120,
      bottom: 24,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
});

function makeForm(html: string): void {
  document.body.innerHTML = html;
}

describe("login form detection", () => {
  it("detects username + password forms", () => {
    makeForm(`
      <form>
        <input type="text" name="username" />
        <input type="password" name="password" />
      </form>`);
    const forms = scanLoginForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0].usernameField?.name).toBe("username");
    expect(forms[0].passwordField.name).toBe("password");
    expect(forms[0].form).toBeInstanceOf(HTMLFormElement);
  });

  it("detects email + password forms", () => {
    makeForm(`
      <form>
        <input type="email" name="email" autocomplete="email" />
        <input type="password" name="pwd" />
      </form>`);
    const forms = scanLoginForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0].usernameField?.type).toBe("email");
  });

  it("detects forms without type=password via autocomplete hints", () => {
    makeForm(`
      <form>
        <input type="text" autocomplete="username" />
        <input type="text" autocomplete="current-password" aria-label="Password" />
      </form>`);
    const forms = scanLoginForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0].passwordField.getAttribute("autocomplete")).toBe(
      "current-password",
    );
  });

  it("detects forms built only from id/placeholder hints", () => {
    makeForm(`
      <form>
        <input type="text" id="login-email" placeholder="Email address" />
        <input type="text" id="login-passwd" placeholder="Your password" />
      </form>`);
    const forms = scanLoginForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0].usernameField?.id).toBe("login-email");
  });

  it("ignores non-login forms (search boxes, comments)", () => {
    makeForm(`
      <form><input type="search" name="q" /></form>
      <form><input type="text" name="comment" /></form>`);
    expect(scanLoginForms(document)).toHaveLength(0);
  });

  it("detects dynamically injected forms (SPA login)", () => {
    makeForm(`<div id="app"></div>`);
    expect(scanLoginForms(document)).toHaveLength(0);

    // Simulate a SPA router mounting a login view later.
    document.getElementById("app")!.innerHTML = `
      <form>
        <input type="email" name="email" />
        <input type="password" name="password" />
      </form>`;
    expect(scanLoginForms(document)).toHaveLength(1);
  });

  it("fills fields in a framework-friendly way", () => {
    makeForm(`
      <form id="f">
        <input type="text" name="user" />
        <input type="password" name="pass" />
      </form>`);
    const [form] = scanLoginForms(document);
    const events: string[] = [];
    form.usernameField!.addEventListener("input", () => events.push("user-input"));
    form.passwordField.addEventListener("input", () => events.push("pass-input"));

    fillLoginForm(form, {
      id: "x",
      title: "t",
      domain: "d",
      username: "abc@gmail.com",
      password: "pw",
      createdAt: 0,
      updatedAt: 0,
    });

    expect(form.usernameField!.value).toBe("abc@gmail.com");
    expect(form.passwordField.value).toBe("pw");
    expect(events).toEqual(["user-input", "pass-input"]);
  });
});
