# xyf-ai.com · Writing 同步任务（Grok CLI headless / cron）

你在本机仓库 `~/projects/xyf-ai.com` 执行。目标：把 X 账号 **@xfengbro** 的 **X Articles（长文）** 同步到站内 Writing，必要时生图，再部署。

当前登录的 Grok 账号是会员号即可；不要要求用户交互登录。

## 硬性规则

1. **先跑确定性脚本**（不要手写爬虫重做一遍）：
   ```bash
   cd ~/projects/xyf-ai.com
   export http_proxy=http://127.0.0.1:10808 https_proxy=http://127.0.0.1:10808
   export HTTP_PROXY=$http_proxy HTTPS_PROXY=$https_proxy ALL_PROXY=$https_proxy
   python3 scripts/sync_writing.py
   ```
2. 脚本会：读 `data/writing-seeds.txt` + 已有 `data/writing.json` → fxtwitter 拉 Article → 下载封面到 `assets/writing-covers/{id}.jpg` → 合并 `data/writing-overrides.json` → 写 `data/writing.json`。
3. **只收录 X Article**（有 `article` 字段的帖）。普通推文不要进 Writing。
4. **列表封面**：用脚本下载的宽图（约 1280×512），前端会裁成 16:9 风格小图。**不要**为列表位生图。
5. **头条精装竖图**：仅当 `writing.json` 里 pin / 第一篇 **没有** `featureImage`（或文件不存在）时，才用 Grok **生图**，保存到：
   `assets/writing-feature-{id}.jpg`（或 `.png`）
   并写入 `data/writing-overrides.json` 该 id 的 `featureImage` 字段，再重跑一次 `python3 scripts/sync_writing.py`。
6. 已有 `featureImage`（例如 `assets/writing-ai-site-feature.png`）**禁止覆盖**。
7. 润色（可选）：若某篇只有原始 `title`/`dek` 且 overrides 里没有 `titleDisplay`/`dek`，可为中文读者写一版更干净的展示标题与 1–2 行摘要，写入 overrides，**不要改 X 原文事实**。
8. 发现新 Article：
   - 若你通过工具确认了新的 status id，执行：
     `python3 scripts/sync_writing.py --add-id <STATUS_ID>`
   - 并把 id 留在 `data/writing-seeds.txt`（脚本会 append）。
   - 找不到新帖就跳过，**不要编造 id**。
9. 完成后若有文件变更，部署到 VPS（已配置 ssh_manager 服务器 `vps_47_82_145_104`，目录 `/opt/xyf-ai.com`）。若当前环境没有 ssh MCP，用：
   ```bash
   # 仅当本机有可用 rsync/ssh 配置时
   rsync -az --delete \
     --exclude .git --exclude node_modules --exclude .wrangler \
     --exclude 'assets/writing-ai-site-feature-src.png' \
     ~/projects/xyf-ai.com/ root@47.82.145.104:/opt/xyf-ai.com/
   ```
   若 rsync 无密钥失败，记录「需手动部署」，不要死循环。
10. 最后用 3–6 行中文汇报：同步了几篇、是否生图、是否部署、有无错误。

## 不要做

- 不要改 Video marquee / Contact 等无关区块（除非部署整站同步）。
- 不要提交 git，除非用户明确要求（cron 默认同步文件 + 部署即可）。
- 不要在未确认新帖时清空 seeds。
