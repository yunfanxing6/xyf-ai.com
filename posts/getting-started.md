---
title: 国内从零用上 Claude Code 与 ChatGPT 完全指南
dek: 一篇走完全程：解决网络 → 下载安装 → 账号登录。\n官方账号直接用，想接中转站或其他模型就用 CC Switch。所有安装包本站直链下载。
date: 2026.07.18
tag: 教程
cover: assets/writing-covers/getting-started-thumb.jpg
featureImage: assets/writing-covers/getting-started-feature.jpg
pin: true
---

写给国内完全零基础的朋友。对已经上过 X 的推友来说这些都不是事，但对国内很多人来说，"网络"这一关就卡死了，国内平台又不方便讲。所以我把整条路一次写全：**网络 → 安装 → 账号**，跟着做就能用上。

所有需要的安装包都放在本站直连下载，**不需要你先会翻墙**。

---

## 第一步：解决网络问题

Claude、ChatGPT 这些服务国内直连不通，第一步是准备一个能用的代理环境。分两件事：**代理软件**（本地的壳）+ **机场订阅**（提供节点）。

### 1.1 下载代理软件

推荐开源免费的 **Clash Verge**，本站直连下载（无需翻墙）：

- [Windows 64 位](/dl/Clash.Verge_2.5.1_x64-setup.exe)（47 MB）
- [macOS Apple 芯片（M1/M2/M3/M4）](/dl/Clash.Verge_2.5.1_aarch64.dmg)（62 MB）
- [macOS Intel 芯片](/dl/Clash.Verge_2.5.1_x64.dmg)（66 MB）

> 不确定 Mac 是什么芯片：点左上角  → 关于本机，"芯片"写 Apple 的选第一个，写 Intel 的选第二个。

下载后正常安装。macOS 首次打开若提示"无法验证开发者"，去 系统设置 → 隐私与安全性 → 点"仍要打开"。

### 1.2 购买机场订阅

代理软件只是个壳，还需要"订阅"提供节点。我目前在用的机场（稳定、够快，支持 Claude / ChatGPT / X）：

**👉 [点此注册（8 折优惠）](https://58.77vy.xyz/register?code=F0VGpmAi)**，充值时填优惠券码 **`vyy888`** 打 8 折。我平时用的就是**一年 20 元、每月 100G 流量**的套餐，日常跑 Claude Code 完全够用。

### 1.3 导入订阅并开启代理

1. 在机场官网复制你的"订阅链接"
2. 打开 Clash Verge → 左侧「订阅」→ 粘贴链接 → 点「导入」
3. 左侧「代理」→ 选一个香港或日本节点
4. 左侧「设置」→ 打开「系统代理」

**验证**：浏览器打开 [claude.ai](https://claude.ai)，能打开就说明网络通了。记住 Clash Verge 的混合端口默认是 **7897**（设置里能看到），后面配终端要用。

---

## 第二步：下载安装

网络通了，开始装工具。想用 Claude Code 就走 2.1 + 2.2；只想用 ChatGPT 桌面版可以直接跳 2.3。

### 2.1 安装 Node.js（Claude Code 的前置）

Claude Code 通过 npm 分发，需要 Node.js 18+。从国内镜像直接下载（不走代理也快）：

- [Windows 64 位安装包](https://npmmirror.com/mirrors/node/v22.17.0/node-v22.17.0-x64.msi)
- [macOS 安装包（通用双芯片）](https://npmmirror.com/mirrors/node/v22.17.0/node-v22.17.0.pkg)

一路下一步装完，打开终端（Windows 用 PowerShell，macOS 用"终端"）检查：

```bash
node -v
```

显示 `v22.x.x` 就成功了。

### 2.2 安装 Claude Code

终端里执行（先把 npm 源切国内镜像，下载快）：

```bash
npm config set registry https://registry.npmmirror.com
npm install -g @anthropic-ai/claude-code
```

装完检查：

```bash
claude --version
```

### 2.3 （可选）安装 ChatGPT 桌面客户端

比网页版更顺手：全局快捷键唤起、可对着截图提问。

- **macOS**（需 14 Sonoma+）：[官方直接下载 ChatGPT.dmg](https://persistent.oaistatic.com/sidekick/public/ChatGPT.dmg)，打开拖进"应用程序"即可
- **Windows**（需 Win 10+）：[微软应用商店安装](https://apps.microsoft.com/detail/9nt1r1c2hh7j)，或官方页 [chatgpt.com/download](https://chatgpt.com/download)

桌面客户端走系统代理，只要 Clash Verge 的「系统代理」开着就能连上，无需额外设置。

---

## 第三步：账号与登录

工具装好了，最后一步是账号。**这里分两条路，看你怎么用。**

### 先让终端走代理（用 Claude Code 必做）

Claude Code 在终端里运行，需要手动让终端走代理。端口用 Clash Verge 的 7897：

**macOS / Linux：**

```bash
export https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897
```

**Windows PowerShell：**

```powershell
$env:HTTPS_PROXY="http://127.0.0.1:7897"; $env:HTTP_PROXY="http://127.0.0.1:7897"
```

> 每次开新终端都要重新执行。嫌麻烦可以把这行加到 `~/.zshrc`（macOS）或 PowerShell 配置文件里，一劳永逸。

### 注册账号时的手机验证：用接码平台

没有 Claude / OpenAI 账号的要先注册。注册时通常要**手机号验证**，而 +86 国内手机号大概率不支持（或不想暴露自己的号）。解决办法是用"接码平台"——花几毛钱租一个海外虚拟号收验证码。

我在用的是 **HeroSMS**（老牌 SMS-Activate 同源技术架构，180+ 国家、每日 50 万+ 新号，价格低，有中文界面）：

**👉 [点此注册 HeroSMS](https://hero-sms.com/?ref=732020)**

使用流程：

1. 注册账号（右上角可切换中文）
2. 充值余额（几美元够用很多次）
3. 选择服务（如 OpenAI / Claude / Google，找不到就选 "Any Other"）和国家（美国、英国、印尼等，价格不同）
4. 购买号码，把号码填到注册页发送验证码
5. 验证码会直接出现在 HeroSMS 的个人账户里，填回去即可

> 提示：每个号码有效期 20 分钟，期间收不到码的话费用会**自动退回你的余额**，换个号码重试即可。号码用完自动释放，不影响你后续登录（登录一般不再需要收码）。

### 路线 A：用官方账号（最简单）

如果你有 Claude 官方订阅（Pro / Max）或愿意用官方 API 按量付费，直接登录即可。

在项目目录里运行：

```bash
claude
```

首次运行会弹出浏览器登录。两种方式：

1. **Claude Pro / Max 订阅**：用 claude.ai 账号登录，按订阅额度使用
2. **API Key**：在 [console.anthropic.com](https://console.anthropic.com/) 创建 Key，按量付费

登录完就能直接用了。ChatGPT 桌面版同理——打开客户端，用 OpenAI 账号登录即可。

### 路线 B：用中转站或其他模型（省钱 / 灵活）

如果你想接 **API 中转站**（第三方转发，通常更便宜、支付更方便）或切换到别的模型，手动改配置文件很麻烦。用 **CC Switch** 这个桌面工具管理，一键切换。

本站直连下载：

- [CC Switch · Windows（.msi）](/dl/CC-Switch-v3.17.0-Windows.msi)（13 MB）
- [CC Switch · macOS（.dmg）](/dl/CC-Switch-v3.17.0-macOS.dmg)（26 MB）

macOS 版已 Apple 签名公证，下载拖进"应用程序"即可。

**用法**（以给 Claude Code 加一个中转站为例）：

1. 打开 CC Switch，左侧选 **Claude Code**
2. 点「添加供应商」，从 50+ 预设里选，或手动填：
   - **名称**：随便起，如"中转站 A"
   - **API 地址**：中转站给的 Base URL
   - **API Key**：中转站给的密钥
3. 保存后点这个供应商 → 它就成为当前生效的配置
4. 回终端跑 `claude` 就用上了（Claude Code 支持热切换，不用重启）

想换回官方或另一个中转站，列表里点一下即可。CC Switch 还支持 Codex、Claude Desktop、Gemini CLI 等 7 个工具。

> 什么是中转站？就是第三方搭的转发服务，把请求转发到官方 API，通常更便宜或支付更方便。质量参差不齐，选用前注意甄别，本站不对任何第三方服务做担保（详见[隐私政策](/privacy/)）。

---

## 常见问题

**连不上 / 一直转圈？** 九成是终端没走代理，回到第三步检查环境变量；再确认 Clash Verge 的「系统代理」开着、节点可用，多换几个香港/日本/新加坡节点。

**`command not found: claude`？** npm 全局 bin 目录不在 PATH 里。执行 `npm config get prefix` 找到路径，把 `<prefix>/bin` 加进 PATH。

**ChatGPT 提示地区不支持？** 当前节点出口地区不在 OpenAI 支持范围，换日本/新加坡节点。

**账号从哪来？** 没有 Claude / OpenAI 账号的需要先注册，注册时的手机号验证用接码平台解决——用法见上文第三步「注册账号时的手机验证」一节。

---

有问题可以来 [Telegram 群](https://t.me/+TXvJqNLp8_9iNGNl) 交流，或 X 上私信 [@xfengbro](https://x.com/xfengbro)。
