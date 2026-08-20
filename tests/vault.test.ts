import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/browser/api";
import { vaultService } from "@/vault/vaultService";
import { VaultError } from "@/shared/vaultApi";

const MASTER = "test-master-password";

beforeEach(async () => {
  vaultService.lock();
  await storage.clear();
});

describe("vault CRUD", () => {
  it("starts uninitialized, becomes unlocked after create", async () => {
    expect(await vaultService.getStatus()).toBe("uninitialized");
    await vaultService.createVault(MASTER);
    expect(await vaultService.getStatus()).toBe("unlocked");
  });

  it("create → read → update → delete → search", async () => {
    await vaultService.createVault(MASTER);

    const created = await vaultService.add({
      title: "github.com",
      domain: "github.com",
      url: "https://github.com/login",
      username: "abc@gmail.com",
      password: "s3cret!",
    });
    expect(created.id).toBeTruthy();

    let list = await vaultService.list();
    expect(list).toHaveLength(1);
    expect(list[0].username).toBe("abc@gmail.com");

    const updated = await vaultService.update(created.id, {
      password: "n3w-pass!",
    });
    expect(updated.password).toBe("n3w-pass!");

    await vaultService.add({
      title: "gitlab.com",
      domain: "gitlab.com",
      username: "dev@example.com",
      password: "gl-pass",
    });
    expect(await vaultService.search("gitlab")).toHaveLength(1);
    expect(await vaultService.search("ABC@GMAIL")).toHaveLength(1);

    await vaultService.remove(created.id);
    list = await vaultService.list();
    expect(list).toHaveLength(1);
    expect(list[0].domain).toBe("gitlab.com");
  });

  it("lock clears memory; wrong password stays locked", async () => {
    await vaultService.createVault(MASTER);
    await vaultService.add({
      title: "github.com",
      domain: "github.com",
      username: "abc@gmail.com",
      password: "pw",
    });

    vaultService.lock();
    expect(await vaultService.getStatus()).toBe("locked");
    await expect(vaultService.list()).rejects.toThrow(VaultError);

    await expect(vaultService.unlock("not-the-password")).rejects.toThrow(
      "WRONG_PASSWORD",
    );
    expect(await vaultService.getStatus()).toBe("locked");

    await vaultService.unlock(MASTER);
    const list = await vaultService.list();
    expect(list).toHaveLength(1);
    expect(list[0].password).toBe("pw");
  });

  it("persists ciphertext only — no plaintext in storage", async () => {
    await vaultService.createVault(MASTER);
    await vaultService.add({
      title: "bank.example",
      domain: "bank.example",
      username: "me@bank.example",
      password: "ultra-secret-value",
    });

    const raw = JSON.stringify(await storage.get());
    expect(raw).not.toContain("ultra-secret-value");
    expect(raw).not.toContain("me@bank.example");
  });

  it("forDomain matches subdomains but rejects look-alikes", async () => {
    await vaultService.createVault(MASTER);
    await vaultService.add({
      title: "github.com",
      domain: "github.com",
      username: "u",
      password: "p",
    });

    expect(await vaultService.forDomain("www.github.com")).toHaveLength(1);
    expect(await vaultService.forDomain("login.github.com")).toHaveLength(1);
    expect(await vaultService.forDomain("evil-github.com")).toHaveLength(0);
    expect(await vaultService.forDomain("github.com.evil.com")).toHaveLength(0);
  });
});
