import { describe, expect, it } from "vitest";
import { domainFromUrl, matchesDomain, registrableDomain } from "@/shared/matching";

describe("website matching", () => {
  it("normalizes common variants of the same site", () => {
    expect(registrableDomain("www.github.com")).toBe("github.com");
    expect(registrableDomain("GITHUB.com")).toBe("github.com");
    expect(domainFromUrl("https://github.com/login")).toBe("github.com");
    expect(domainFromUrl("github.com")).toBe("github.com");
  });

  it("accepts exact and subdomain matches", () => {
    expect(matchesDomain("github.com", "github.com")).toBe(true);
    expect(matchesDomain("github.com", "www.github.com")).toBe(true);
    expect(matchesDomain("github.com", "login.github.com")).toBe(true);
  });

  it("rejects look-alike domains", () => {
    expect(matchesDomain("github.com", "evil-github.com")).toBe(false);
    expect(matchesDomain("github.com", "github.com.evil.com")).toBe(false);
    expect(matchesDomain("github.com", "github.com.attacker.io")).toBe(false);
  });

  it("never allows a stored subdomain to fill the parent site", () => {
    expect(matchesDomain("login.github.com", "github.com")).toBe(false);
  });

  it("handles two-part public suffixes", () => {
    expect(registrableDomain("shop.example.co.uk")).toBe("example.co.uk");
    expect(matchesDomain("example.co.uk", "www.example.co.uk")).toBe(true);
  });
});
