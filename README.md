# xyf-ai.com

xyf 的个人品牌站：AI 内容实践、公开构建、社群入口。

**Live（域名上线后）：** [https://xyf-ai.com](https://xyf-ai.com)  
**GitHub：** [yunfanxing6/xyf-ai.com](https://github.com/yunfanxing6/xyf-ai.com)

> 结构灵感来自编辑式个人站（如 [sac-ai.com](https://sac-ai.com) 的开源形态），**代码与内容为独立实现**，非 fork。

## 功能分区

| 分区 | 说明 |
| --- | --- |
| Hero | 字标、主张、冷蓝双曝光肖像 + 粒子 |
| About | 简介、蓝图档案、写/拍/创、全平台信号台 |
| Writing | 文章索引（真实 X 帖 + SOON） |
| Video | 影像占位 / 准备中 |
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

## 相关项目

| 项目 | 链接 |
| --- | --- |
| xyf-identity-skill | [yunfanxing6/xyf-identity-skill](https://github.com/yunfanxing6/xyf-identity-skill) |
| freeai-api.com | [https://freeai-api.com](https://freeai-api.com) |

## License

[MIT](LICENSE) © xyf / yunfanxing6
