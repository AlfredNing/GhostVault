# GhostVault

> Your private digital identity vault.

GhostVault 是一个 **Local-first Private Password Vault** 跨浏览器扩展。

即使用户处于 Chrome Incognito、Edge InPrivate、Brave Private、Firefox
Private Browsing 等隐私环境，也可以安全管理自己的登录凭据
（需先手动授权，见[隐私窗口访问](#隐私窗口访问)）。

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

## 隐私窗口访问

浏览器默认在隐私窗口中**禁用**所有扩展，GhostVault 也不例外。这个开关只能由
用户手动打开：浏览器刻意不提供任何让扩展给自己授予隐私访问的 API（
`extension.isAllowedIncognitoAccess()` 是**只读**的），否则任意扩展都能默默
观察隐私浏览，隐私模式将失去意义。因此扩展侧能做的上限是**检测 + 引导**。

### 开关位置

| 浏览器 | 入口 | 开关名称 |
| --- | --- | --- |
| Chrome | `chrome://extensions` → 详情 | 在无痕模式下启用 |
| Edge | `edge://extensions` → 详细信息 | 允许 InPrivate 浏览 |
| Brave | `brave://extensions` → 详情 | 在私人窗口中启用 |
| Firefox | `about:addons` → 扩展 | 在隐私窗口中运行 → 允许 |

### 扩展内置的引导

未授权时，Popup 会给出两个入口（见
[`src/popup/views/IncognitoNotice.tsx`](src/popup/views/IncognitoNotice.tsx)）：

- 凭据列表顶部的提示横幅，可点 ✕ 永久关闭
- 设置弹窗底部常驻的 `Private windows` 状态行

Chromium 上按钮会直接打开本扩展的详情页（`chrome://extensions/?id=<ID>`）；
Firefox 禁止扩展打开特权页 `about:addons`，因此只显示文字指引，不给按钮。

### 开启后的注意事项

- **切换开关会重载扩展**，Service Worker 内存被清空 → Vault 回到锁定态，需
  重新输入主密码。
- **授权前已打开的隐私窗口不会生效**：内容脚本此前从未注入，需重开隐私窗口
  或刷新页面。
- 隐私窗口的浏览器内置页（`edge://newtab` 等）不注入内容脚本，需访问真实的
  http/https 登录页才会出现幽灵按钮。

### 数据语义（`incognito: spanning`）

四份 Manifest 均显式声明 `"incognito": "spanning"`，即隐私窗口与普通窗口
**共用同一个后台实例、同一份加密存储、同一个解锁状态**。这是密码管理器唯一
正确的选择 —— 若改为 `split`，隐私窗口会得到独立实例与独立存储，Vault 被拆成
两套并需分别解锁。

> ⚠️ 由此带来一个与「隐身」直觉相反的行为：**在隐私窗口中点击「Save」保存的
> 凭据会永久写入磁盘**，关闭隐私窗口后依然存在。当前版本未对此做额外提示。

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
| `incognito: spanning` | 非权限声明，仅声明「若用户授权隐私访问，则与普通窗口共用同一实例与存储」。授权与否完全由用户决定，扩展无法自我授予。 |
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
