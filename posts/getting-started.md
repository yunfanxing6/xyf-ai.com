---
title: 国内从零用上 Claude Code 与 ChatGPT 完全指南
dek: 两条路任选，点标签切换。\n方法一：本站直链装 Claude / Codex + CC Switch。\n方法二：先开代理，官网装客户端 + CC Switch。
date: 2026.07.21
tag: 教程
cover: assets/writing-covers/getting-started-thumb.jpg
featureImage: assets/writing-covers/getting-started-feature.jpg
pin: true
---

写给国内完全零基础的朋友。Claude Code、ChatGPT / Codex 很好用，但网络、安装、配 API 经常卡人。

**别想一次搞懂全部。** 下面用 **浏览器标签** 分成两条路——点一下只看一条：

1. **方法一（推荐）**：本站直连下载安装包 → 装 **CC Switch** 接中转站 / 国产 API  
2. **方法二**：先开代理 → 官网下载安装 → 同样用 **CC Switch** 接入  

两条路的接入方式一样，都是 **CC Switch**（图形界面加供应商，不用手改配置文件、也不靠 AI 代配）。差别只在于：**安装包从哪下、要不要先有代理**。

本站 `/dl/` 为官方安装包镜像，约 **2026-07-21**（v2rayN **7.23.4**、CC Switch **v3.17.0**）；过旧可到官网更新。

---

## 方法一：本站下载安装 + CC Switch {#method-1}

思路：**不先翻墙也能下安装包**（本站 Cloudflare 直连）→ 装好 Claude / Codex → 用 **CC Switch** 填 Base URL + API Key。

适合：不想先搞机场、只想尽快用上客户端，并用中转站 / DeepSeek 等。

### 第 1 步：下载安装 Claude / Codex（本站直链）

#### Claude 桌面端（内含 Claude Code）

应用内有 **Code** 标签 = 图形版 Claude Code，不必先装 Node。

- [macOS（Intel + Apple）](/dl/Claude-macOS.dmg)（208 MB）
- [Windows 64 位](/dl/Claude-Setup-x64.exe)（126 MB）
- [Windows ARM64](/dl/Claude-Setup-arm64.exe)（126 MB）

macOS 拖进应用程序；Windows 双击安装。要用 Code 时，Windows 建议先装 [Git for Windows](https://git-scm.com/download/win)。

#### ChatGPT / Codex 桌面端（同一个应用）

OpenAI 已合并为**一个**官方桌面应用，装一套即可对话 + Codex。

- [macOS Apple 芯片](/dl/Codex-mac-arm64.dmg)（591 MB）
- [macOS Intel](/dl/Codex-mac-intel.dmg)（554 MB）
- [Windows 64 位（.msix）](/dl/Codex-Windows-x64.msix)（702 MB）

文件较大，建议 Wi‑Fi。Windows 若装不了 `.msix`：设置 → 隐私和安全性 → 开发者选项 → 允许侧载。

#### （可选）Claude Code 命令行

需要 Node.js 18+。国内镜像装 Node：

- [Windows 安装包](https://npmmirror.com/mirrors/node/v22.17.0/node-v22.17.0-x64.msi)
- [macOS 安装包](https://npmmirror.com/mirrors/node/v22.17.0/node-v22.17.0.pkg)

```bash
node -v
npm config set registry https://registry.npmmirror.com
npm install -g @anthropic-ai/claude-code
claude --version
```

### 第 2 步：安装 CC Switch

用 **CC Switch** 管理 Claude Code / Codex 的供应商（官方、中转站、DeepSeek 等），左侧选工具 → 添加 → 一键切换。

本站直连下载：

- [CC Switch · Windows（.msi）](/dl/CC-Switch-v3.17.0-Windows.msi)（约 13 MB）
- [CC Switch · macOS（.dmg）](/dl/CC-Switch-v3.17.0-macOS.dmg)（约 25 MB）

macOS 版一般已签名，拖进「应用程序」即可。

### 第 3 步：在 CC Switch 里接入 API

服务商给你两样东西即可：

1. **Base URL**（API 地址，常见带 `/v1`）  
2. **API Key**（如 `sk-...`）  

#### 接中转站（Claude Code / Codex）

1. 打开 CC Switch，左侧选 **Claude Code** 或 **Codex**  
2. 点「添加供应商」，选预设或手动填：  
   - **名称**：随便起，如「中转站 A」  
   - **API 地址**：中转站给的 Base URL  
   - **API Key**：中转站给的密钥  
3. 保存后点这个供应商，设为当前生效  
4. 回 Claude / ChatGPT·Codex 客户端使用（不行就重启一次客户端）  

#### 接 DeepSeek（示例）

1. 打开 [platform.deepseek.com](https://platform.deepseek.com/) 注册并创建 API Key  
2. CC Switch 左侧选 **Codex** 或 **Claude Code**  
3. 添加供应商：有 DeepSeek 预设就选预设贴 Key；否则手动填  
   - **API 地址**：`https://api.deepseek.com` 或文档写的 `/v1` 兼容地址  
   - **API Key**：刚复制的 Key  
   - **模型**（可选）：如 `deepseek-chat`、`deepseek-reasoner`  
4. 启用该供应商；若有「本地路由 / 本地代理」开关，一并打开对应工具  
5. 重启客户端试一条请求  

#### 其他 OpenAI 兼容模型

通义 / 百炼、Kimi、智谱、豆包等：控制台里的 **OpenAI 兼容 Base URL + Key**，按上面同样步骤添加。

| 方向 | 说明 |
| --- | --- |
| DeepSeek | `https://api.deepseek.com` + API Key |
| 通义 / Kimi / 智谱 / 豆包等 | 控制台「OpenAI 兼容」URL + Key |
| 各类中转站 | 商家转发地址 + Key |

> 中转站质量参差，自行甄别；本站不做担保（见[隐私政策](/privacy/)）。计费以各控制台为准。

### 方法一小结

1. 本站 `/dl/` 装 Claude / Codex（可选 CLI）  
2. 本站装 **CC Switch**  
3. 填 Base URL + Key，启用供应商  

---

## 方法二：先开代理 → 官网安装 + CC Switch {#method-2}

思路：**代理通了**之后，从官方渠道装客户端（或仍用本站包）→ 用 **CC Switch** 接入（步骤与方法一第 2～3 步相同）。

适合：要用 **官方 Claude / ChatGPT 订阅登录**，或习惯从官网下安装包。

### 第 1 步：解决网络（代理 + 机场）

官方 Claude、ChatGPT / Codex **国内直连往往不通**。需要：

1. **代理软件**（本机的壳）  
2. **机场订阅**（提供节点）  

#### 下载 v2rayN（本站直连，无需翻墙）

开源客户端 **[v2rayN](https://github.com/2dust/v2rayN)**，当前镜像 **v7.23.4**：

- [Windows 64 位（.zip）](/dl/v2rayN-7.23.4-windows-64.zip)（159 MB）
- [macOS Apple 芯片（M1/M2/M3/M4）](/dl/v2rayN-7.23.4-macos-arm64.dmg)（118 MB）
- [macOS Intel 芯片](/dl/v2rayN-7.23.4-macos-64.dmg)（124 MB）

> 不确定 Mac 芯片：左上角  → 关于本机，「芯片」写 Apple 选第一个，写 Intel 选第二个。

- **Windows**：解压后运行 `v2rayN.exe`（路径尽量别带中文空格）；杀软拦截就加白名单  
- **macOS**：`.dmg` 拖进「应用程序」；无法验证时 → 系统设置 → 隐私与安全性 →「仍要打开」  

#### 购买机场订阅

软件只是壳，还要订阅节点。我在用的（支持 Claude / ChatGPT / X）：

**👉 [点此注册（8 折）](https://58.77vy.xyz/register?code=F0VGpmAi)**，充值填优惠券 **`vyy888`**。我常用 **一年 20 元 / 每月 100G**，跑 Claude Code 够用。

#### 导入订阅并打开代理

1. 机场后台复制「订阅链接」  
2. v2rayN → 订阅 / Subscription → 添加 → 更新节点  
3. 选 **香港 / 日本 / 新加坡** 节点  
4. 打开 **系统代理**（System Proxy）  

**验证**：浏览器能打开 [claude.ai](https://claude.ai) 即可。

**终端代理端口**（仅命令行 Claude Code 需要）：本机常见 **`10808`**（以 v2rayN 设置里为准）。

macOS / Linux：

```bash
export https_proxy=http://127.0.0.1:10808 http_proxy=http://127.0.0.1:10808
```

Windows PowerShell：

```powershell
$env:HTTPS_PROXY="http://127.0.0.1:10808"; $env:HTTP_PROXY="http://127.0.0.1:10808"
```

可写入 `~/.zshrc` 或 PowerShell 配置文件。桌面端一般只靠系统代理即可。

### 第 2 步：下载安装 Claude / Codex

代理通了再装。可二选一：

**A. 官网（推荐走官方渠道时）**

- Claude 桌面 / 账号：[claude.ai](https://claude.ai)（应用商店或官网下载入口以页面为准）  
- ChatGPT / Codex 桌面：[chatgpt.com/download](https://chatgpt.com/download)  

**B. 本站直链（与方法一相同，不需要翻墙下安装包）**

- Claude：[macOS](/dl/Claude-macOS.dmg) · [Win x64](/dl/Claude-Setup-x64.exe) · [Win ARM](/dl/Claude-Setup-arm64.exe)  
- Codex：[mac arm](/dl/Codex-mac-arm64.dmg) · [mac intel](/dl/Codex-mac-intel.dmg) · [Win](/dl/Codex-Windows-x64.msix)  

#### （可选）Claude Code CLI

```bash
npm config set registry https://registry.npmmirror.com
npm install -g @anthropic-ai/claude-code
```

CLI 在终端里跑，务必先设好上面的代理环境变量。

### 第 3 步：账号 —— 官方登录 或 CC Switch

#### 有官方订阅：直接登录

- **Claude**：应用内用 [claude.ai](https://claude.ai) 账号 → 切到 **Code**  
- **CLI**：项目目录执行 `claude`，浏览器登录（Pro/Max 或 [console.anthropic.com](https://console.anthropic.com/) API Key）  
- **ChatGPT / Codex**：应用内用 OpenAI / ChatGPT 账号登录  

#### 注册时的手机验证：HeroSMS

没有 Claude / OpenAI 账号时通常要**手机号验证**，+86 往往不行。用接码平台租海外号：

**👉 [点此注册 HeroSMS](https://hero-sms.com/?ref=732020)**

1. 注册账号（可切中文）  
2. 充值（几美元够多次）  
3. 选服务（OpenAI / Claude / Google 等）和国家  
4. 买号 → 填到注册页 → 在 HeroSMS 收验证码  

> 号码约 20 分钟有效，收不到会退余额。适用于 **Claude Code** 与 **ChatGPT / Codex** 注册。

#### 用中转站 / 国产 API：CC Switch

与方法一相同：

1. 下载 [CC Switch Windows](/dl/CC-Switch-v3.17.0-Windows.msi) / [macOS](/dl/CC-Switch-v3.17.0-macOS.dmg)  
2. 左侧选 **Claude Code** 或 **Codex** → 添加供应商（Base URL + Key）  
3. 启用 → 重启客户端验证  

DeepSeek 示例：Key 在 [platform.deepseek.com](https://platform.deepseek.com/) 创建，Base URL 常见 `https://api.deepseek.com`。

### 方法二小结

1. v2rayN + 机场 → 系统代理  
2. 官网或本站装 Claude / Codex  
3. 官方订阅就登录；否则 **CC Switch** 接 API  

---

## 两种方法怎么选

| 你的情况 | 走哪条 |
| --- | --- |
| 先不想搞代理，本站下包装客户端 | **方法一** |
| 要用官方订阅、或坚持官网下载 | **方法二** |
| 接中转站 / DeepSeek 等 | 两条路都用 **CC Switch** |
| 注册要海外手机号 | 方法二里的 **HeroSMS** |

---

## 常见问题

**连不上 / 一直转圈？** 方法二先查代理：系统代理是否开着、节点是否香港/日本/新加坡。CLI 再查端口是否 `10808`。

**v2rayN 订阅更新失败？** 校对系统时间；换订阅链接；Windows 用完整解压目录运行。

**下载很慢？** Codex 包大，用 Wi‑Fi；本站 `/dl/` 不需要翻墙。

**Windows 装不了 `.msix`？** 开发者选项允许侧载，或改官方/商店渠道。

**`command not found: claude`？** `npm config get prefix`，把 `<prefix>/bin` 加进 PATH。

**提示地区不支持？** 换日本/新加坡出口节点。

**注册要手机验证？** 方法二 **HeroSMS**：[hero-sms.com/?ref=732020](https://hero-sms.com/?ref=732020)。

**CC Switch 加了供应商但客户端无响应？** 确认已启用、本地路由开关打开、重启客户端；检查 Base URL 是否漏 `/v1`、Key 是否有空格。

**不会改配置文件？** 不用改。装 CC Switch，图形界面填 URL 和 Key 即可。

---

有问题可以来 [Telegram 群](https://t.me/+TXvJqNLp8_9iNGNl) 交流，扫码加入 **微信 AI 交流群**，或 X 上私信 [@xfengbro](https://x.com/xfengbro)。

![微信 AI 交流群二维码](/assets/wechat-group-qr.jpg?v=20260828)

> 微信群二维码约 7 天有效，过期可到[首页联系区](/#contact)扫最新码，或私信更新。
