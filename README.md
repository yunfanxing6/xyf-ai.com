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

## Writing 自动同步（本机）

- 数据：`data/writing.json`（前端读取）
- 种子 ID：`data/writing-seeds.txt`
- 人工润色/精装图：`data/writing-overrides.json`
- 确定性拉数：`python3 scripts/sync_writing.py`（fxtwitter + 本地下载封面）
- Grok CLI 编排：`scripts/sync-writing.prompt.md` + `scripts/cron-sync-writing.sh`
- 定时：本机 crontab **每天 10:00 / 22:00**（`cron-sync-writing.sh` → `grok -p --yolo`）
- 日志：`~/.logs/xyf-writing-sync.log`
- 手动：在 Grok CLI 说「同步 writing」或跑 `./scripts/cron-sync-writing.sh`

鉴权跟**当前 Grok CLI 登录会员号**走；换号后仍用新号执行（均为会员即可）。

## 相关项目

| 项目 | 链接 |
| --- | --- |
| xyf-identity-skill | [yunfanxing6/xyf-identity-skill](https://github.com/yunfanxing6/xyf-identity-skill) |
| freeai-api.com | [https://freeai-api.com](https://freeai-api.com) |

## License

[MIT](LICENSE) © xyf / yunfanxing6
