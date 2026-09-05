# xyf-ai.com

xyf 的个人品牌站：AI 内容实践、公开构建、社群入口。

**Live（域名上线后）：** [https://xyf-ai.com](https://xyf-ai.com)  
**GitHub：** [yunfanxing6/xyf-ai.com](https://github.com/yunfanxing6/xyf-ai.com)

纯静态 HTML / CSS / JS，独立实现与维护。

## 功能分区

| 分区 | 说明 |
| --- | --- |
| Hero | 字标、主张、冷蓝双曝光肖像 + 粒子 |
| About | 简介、蓝图档案、写/拍/创、全平台信号台 |
| Writing | X Articles 索引（`data/writing.json`，本机 cron + Grok CLI 同步） |
| Video | 横向滑动视频卡片（封面 → 抖音/YouTube 外链） |
| Build | 公开构建队列与 GitHub |
| Contact | 邮件、X、TG 私信、TG 社群、微信群二维码 |

## 技术栈

- 纯静态 HTML / CSS / JS（无构建步骤即可预览）
- GSAP + ScrollTrigger（CDN）
- 设计 token：纸感底 `#F4EFE6` + Ice 强调 `#5D9DE6`
- 可部署到 Cloudflare Pages / 任意静态托管

## 本地预览

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# 打开 http://127.0.0.1:8765/
```

或：

```bash
npm start
```

## 本机管理台（推荐）

固定地址：**http://127.0.0.1:8790/**（仅本机，不对外）

```bash
# 安装开机（登录）自启（推荐，装一次即可）
./scripts/install-admin-autostart.sh

# 前台临时启动（若 launchd 已占用 8790 会直接提示打开浏览器）
./scripts/admin.sh

# 取消自启
./scripts/uninstall-admin-autostart.sh
```

| 功能 | 说明 |
| --- | --- |
| 粘贴 X 链接 | 解析 status id → 写入 seeds → `sync_writing.py` |
| 刷新全部 X | 重跑已收录 Article |
| 站内文章 | 新建 / 编辑 `posts/*.md`，自动 `build_posts.py` |
| 发布到线上 | rsync 到 VPS（默认 `root@47.82.145.104:/opt/xyf-ai.com/`，排除 `admin/`） |

- launchd：`com.xingyunfan.xyf-admin` → `~/Library/LaunchAgents/`
- 应用日志：`~/.logs/xyf-admin.log`
- 自启 stdout/err：`~/.logs/xyf-admin.launchd.*.log`
- 部署相关环境变量（可选）：`XYF_PROXY`、`XYF_DEPLOY_HOST`、`XYF_DEPLOY_USER`、`XYF_DEPLOY_PATH`、`XYF_DEPLOY_SSH`

## Writing 同步（脚本）

- 数据：`data/writing.json`（前端读取）
- 种子 ID：`data/writing-seeds.txt`
- 人工润色/精装图：`data/writing-overrides.json`
- 确定性拉数：`python3 scripts/sync_writing.py`（fxtwitter + 本地下载封面）
- 站内博客：`posts/*.md` → `python3 scripts/build_posts.py`
- 可选 cron：`scripts/cron-sync-writing.sh`（依赖本机开机；关机会跳过）
- Grok CLI 编排（润色/生图，可选）：`scripts/sync-writing.prompt.md`

## 相关项目

| 项目 | 链接 |
| --- | --- |
| xyf-identity-skill | [yunfanxing6/xyf-identity-skill](https://github.com/yunfanxing6/xyf-identity-skill) |
| freeai-api.com | [https://freeai-api.com](https://freeai-api.com) |

## License

[MIT](LICENSE) © xyf / yunfanxing6
