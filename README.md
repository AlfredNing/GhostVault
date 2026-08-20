# GhostVault

> Your private digital identity vault.

GhostVault 是一个 **Local-first Private Password Vault** 跨浏览器扩展。

即使用户处于 Chrome Incognito、Edge InPrivate、Brave Private、Firefox
Private Browsing 等隐私环境，也可以安全管理自己的登录凭据。

- 不依赖浏览器密码管理器
- 不上传任何数据到服务器
- 主密码永不落盘、永不进入日志 / URL / localStorage

```
Credential → Encryption (PBKDF2 + AES-256-GCM) → Encrypted Vault → Browser Storage
```

---

## 开发环境

- Node.js >= 20
- pnpm（仓库使用 corepack：`corepack pnpm ...`，或全局安装 pnpm 后直接 `pnpm ...`）

```bash
pnpm install        # 安装依赖
pnpm build          # 构建 Chrome 版本 → dist/chrome
pnpm build:edge     # 构建 Edge 版本   → dist/edge
pnpm build:brave    # 构建 Brave 版本  → dist/brave
pnpm build:firefox  # 构建 Firefox 版本 → dist/firefox
pnpm build:all      # 全部目标
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest
node scripts/generate-icons.mjs   # 重新生成扩展图标
```

## 加载扩展（Chromium：Chrome / Edge / Brave）

1. `pnpm build`
2. 打开 `chrome://extensions`（Edge: `edge://extensions`，Brave: `brave://extensions`）
3. 打开「开发者模式 / Developer mode」
4. 「加载已解压的扩展程序 / Load unpacked」→ 选择 `dist/chrome`（或对应目录）
5. 工具栏点击幽灵图标即可打开 Popup

## 加载扩展（Firefox，第二阶段）

1. `pnpm build:firefox`
2. 打开 `about:debugging#/runtime/this-firefox`
3. 「临时载入附加组件」→ 选择 `dist/firefox/manifest.json`

---

## 项目结构

```
ghostvault/
├── manifests/            # 每个浏览器一份 Manifest V3
│   ├── chrome.json
│   ├── edge.json
│   ├── brave.json
│   └── firefox.json
├── scripts/
│   ├── build.mjs         # 多入口构建编排（popup / background / content）
│   └── generate-icons.mjs
├── src/
│   ├── background/       # Service Worker（vault 状态机、自动锁定）
│   ├── content/          # 登录表单检测、填充/保存 UI
│   ├── popup/            # React 弹窗（Locked / Unlock / Vault）
│   ├── vault/            # Vault CRUD（Phase 4）
│   ├── crypto/           # PBKDF2 + AES-256-GCM（Phase 3）
│   ├── storage/          # 持久化封装（Phase 3/4）
│   ├── browser/          # Browser Adapter —— 唯一允许接触 chrome.*/browser.* 的地方
│   ├── shared/           # 跨上下文类型与消息契约
│   └── components/       # shadcn/ui 组件
└── tests/
```

业务代码 **禁止** 直接调用 `chrome.*` / `browser.*`，统一经由
[`src/browser/api.ts`](src/browser/api.ts)（Browser Adapter）访问，以抹平
Chrome / Firefox 的 API 差异（回调 vs Promise、`browser` vs `chrome` 全局）。

---

## 权限说明（Least Privilege）

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存加密后的 Vault blob（`chrome.storage.local`）。明文凭据与密钥从不写入。 |
| `alarms` | 驱动自动锁定计时（5 / 15 / 30 分钟 / Never），在 Service Worker 休眠后依然可靠。 |
| `content_scripts`（`http://*/*`、`https://*/*`） | 登录表单检测与用户显式触发的填充/保存 UI 所需。只匹配 http/https _scheme_，不使用 `<all_urls>`；不匹配 file/ftp 等本地资源。 |
| 未申请 | `activeTab`、`scripting`、`tabs`、`history`、`cookies` 均不需要，V1 不申请任何 host permissions 之外的宽泛权限。 |

V1 **不实现**：Cloud Sync、账号系统、后端、支付、团队共享、AI 助手、
泄露检测、Passkey、浏览器历史、Cookie 管理。

---

## 安全模型

- 主密码 → PBKDF2（random salt）→ AES-256-GCM 密钥
- 每次加密使用 random IV；密文 + GCM tag 一起持久化
- 解锁后密钥仅存在于内存；锁定 / 自动锁定时清零敏感内存
- 代码中禁止 `console.log` 任何密码 / Vault 内容
- 完全 Local-first，无任何网络请求

## 路线图

- [x] Phase 1 — 工程初始化（Vite / React / TS / Tailwind / shadcn / MV3 / Adapter）
- [x] Phase 2 — UI（Logo / Locked / Unlock / Popup）
- [x] Phase 3 — Crypto Layer
- [x] Phase 4 — Vault CRUD
- [x] Phase 5 — Content Script（登录页检测，MutationObserver，SPA 支持）
- [x] Phase 6 — Auto Fill（用户显式点击 Fill）
- [x] Phase 7 — Save Password（用户确认后保存）
- [x] Phase 8 — Auto Lock
- [x] Phase 9 — 四目标构建 + Popup E2E 验证（Chrome/Edge/Brave 同源 MV3 产物）
