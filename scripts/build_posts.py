#!/usr/bin/env python3
"""
Build local blog posts: posts/*.md → writing/<slug>/index.html + data/posts.json

Frontmatter (--- ... ---, simple key: value):
  title:  必填，文章标题
  dek:    可选，摘要（列表与文章页显示，\n 换行）
  date:   必填，YYYY.MM.DD 或 YYYY-MM-DD
  tag:    可选，默认 "教程"
  cover:  可选，列表缩略图路径
  featureImage: 可选，头条竖图路径
  pin:    可选，true 置顶为头条
  draft:  可选，true 则跳过

Usage: python3 scripts/build_posts.py
"""
from __future__ import annotations

import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import markdown
except ImportError:
    sys.exit("需要 markdown 库：python3 -m pip install markdown")

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "posts"
OUT_DIR = ROOT / "writing"
TEMPLATE = ROOT / "templates" / "post.html"
POSTS_JSON = ROOT / "data" / "posts.json"

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, re.S)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, text[m.end():]


def build_one(md_path: Path, tpl: str) -> dict | None:
    slug = md_path.stem
    if not SLUG_RE.match(slug):
        print(f"[skip] 非法 slug（用小写字母/数字/连字符）: {md_path.name}")
        return None
    meta, body_md = parse_frontmatter(md_path.read_text(encoding="utf-8"))
    if str(meta.get("draft", "")).lower() in ("true", "1", "yes"):
        print(f"[skip] draft: {slug}")
        return None
    title = meta.get("title", "").strip()
    date_raw = meta.get("date", "").strip().replace("-", ".")
    if not title or not date_raw:
        print(f"[skip] 缺 title/date: {slug}")
        return None

    dek = meta.get("dek", "").replace("\\n", "\n")
    tag = meta.get("tag", "教程")
    body_html = markdown.markdown(
        body_md, extensions=["extra", "sane_lists", "toc"], output_format="html5"
    )

    page = (
        tpl.replace("{{title}}", html.escape(title))
        .replace("{{dek_attr}}", html.escape(dek.replace("\n", " ")))
        .replace("{{dek_html}}", "<br />".join(html.escape(l) for l in dek.split("\n")))
        .replace("{{tag}}", html.escape(tag))
        .replace("{{date}}", html.escape(date_raw))
        .replace("{{slug_json}}", json.dumps(slug))
        .replace("{{body}}", body_html)
    )
    out = OUT_DIR / slug / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8")

    ts = int(datetime.strptime(date_raw, "%Y.%m.%d").replace(tzinfo=timezone.utc).timestamp())
    item = {
        "id": slug,
        "local": True,
        "url": f"/writing/{slug}/",
        "title": title,
        "dek": dek,
        "date": date_raw,
        "createdTimestamp": ts,
        "tag": tag,
    }
    for k in ("cover", "featureImage"):
        if meta.get(k):
            item[k] = meta[k]
    if str(meta.get("pin", "")).lower() in ("true", "1", "yes"):
        item["pin"] = True
    return item


def main() -> int:
    if not POSTS.exists():
        print("posts/ 不存在")
        return 1
    tpl = TEMPLATE.read_text(encoding="utf-8")
    items = []
    for md_path in sorted(POSTS.glob("*.md")):
        item = build_one(md_path, tpl)
        if item:
            items.append(item)
            print(f"[ok] {item['url']}  {item['title']}")
    items.sort(key=lambda x: x["createdTimestamp"], reverse=True)
    POSTS_JSON.write_text(
        json.dumps(
            {"updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "items": items},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"[done] {len(items)} post(s) → data/posts.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
