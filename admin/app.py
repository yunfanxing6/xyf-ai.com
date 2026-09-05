#!/usr/bin/env python3
"""
xyf-ai.com 本机管理台（仅 127.0.0.1）

  python3 admin/app.py
  # → http://127.0.0.1:8790/

功能：
  - 粘贴 X Article 链接 → 写入 seeds + sync_writing
  - 全量同步 X / 构建本地 posts
  - 站内文章 CRUD（posts/*.md）
  - 一键 rsync 部署到 VPS
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import threading
import traceback
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
ADMIN_DIR = Path(__file__).resolve().parent
STATIC_DIR = ADMIN_DIR / "static"
DATA = ROOT / "data"
POSTS_DIR = ROOT / "posts"
SEEDS = DATA / "writing-seeds.txt"
WRITING_JSON = DATA / "writing.json"
POSTS_JSON = DATA / "posts.json"
OVERRIDES = DATA / "writing-overrides.json"
LOG_DIR = Path(os.environ.get("XYF_SYNC_LOG_DIR", Path.home() / ".logs"))
ADMIN_LOG = LOG_DIR / "xyf-admin.log"

# Fixed local admin endpoint (launchd + scripts/admin.sh pin these).
# Env override only for rare debugging; default is always 127.0.0.1:8790.
HOST = os.environ.get("XYF_ADMIN_HOST", "127.0.0.1")
PORT = int(os.environ.get("XYF_ADMIN_PORT", "8790"))
FIXED_URL = f"http://127.0.0.1:{PORT}/"

# Deploy targets (override with env)
DEPLOY_HOST = os.environ.get("XYF_DEPLOY_HOST", "47.82.145.104")
DEPLOY_USER = os.environ.get("XYF_DEPLOY_USER", "root")
DEPLOY_PATH = os.environ.get("XYF_DEPLOY_PATH", "/opt/xyf-ai.com/")
DEPLOY_SSH = os.environ.get("XYF_DEPLOY_SSH", "")  # e.g. "-i ~/.ssh/id_ed25519"

DEFAULT_PROXY = os.environ.get("XYF_PROXY", "http://127.0.0.1:10808")

ID_RE = re.compile(r"^\d{5,25}$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")
# x.com / twitter.com / mobile / with query
X_URL_RE = re.compile(
    r"(?:https?://)?(?:(?:www|mobile)\.)?(?:twitter|x)\.com/"
    r"[A-Za-z0-9_]+/status/(\d{5,25})",
    re.I,
)
STATUS_ONLY_RE = re.compile(r"(?:status[/=])?(\d{5,25})")

_lock = threading.Lock()


# ── helpers ──────────────────────────────────────────────────────────

def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    line = f"[{utc_now()}] {msg}"
    print(line, flush=True)
    try:
        with ADMIN_LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return default


def run_cmd(
    args: list[str],
    *,
    timeout: float = 180.0,
    env_extra: dict[str, str] | None = None,
) -> dict[str, Any]:
    env = os.environ.copy()
    # Prefer Shadowrocket local proxy for X / fxtwitter
    proxy = env.get("https_proxy") or env.get("HTTPS_PROXY") or DEFAULT_PROXY
    if proxy:
        for k in ("http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "all_proxy"):
            env.setdefault(k, proxy)
        env.setdefault("no_proxy", "localhost,127.0.0.1,::1")
        env.setdefault("NO_PROXY", env["no_proxy"])
    if env_extra:
        env.update(env_extra)

    log(f"$ {' '.join(args)}")
    try:
        proc = subprocess.run(
            args,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
    except subprocess.TimeoutExpired as e:
        return {
            "ok": False,
            "code": -1,
            "stdout": e.stdout or "",
            "stderr": (e.stderr or "") + f"\n[timeout after {timeout}s]",
        }
    except OSError as e:
        return {"ok": False, "code": -1, "stdout": "", "stderr": str(e)}

    out = {
        "ok": proc.returncode == 0,
        "code": proc.returncode,
        "stdout": proc.stdout or "",
        "stderr": proc.stderr or "",
    }
    if not out["ok"]:
        log(f"cmd failed code={proc.returncode}: {(proc.stderr or '')[:300]}")
    return out


def extract_status_id(text: str) -> str | None:
    text = (text or "").strip()
    if not text:
        return None
    m = X_URL_RE.search(text)
    if m:
        return m.group(1)
    if ID_RE.match(text):
        return text
    # bare "status/123" or path fragments
    m2 = re.search(r"/status/(\d{5,25})", text)
    if m2:
        return m2.group(1)
    m3 = STATUS_ONLY_RE.fullmatch(text)
    if m3 and ID_RE.match(m3.group(1)):
        return m3.group(1)
    return None


def load_seeds() -> list[str]:
    ids: list[str] = []
    if SEEDS.exists():
        for line in SEEDS.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if ID_RE.match(line):
                ids.append(line)
    return ids


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        return {}, text
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, re.S)
    if not m:
        return {}, text
    meta: dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, text[m.end() :]


def dump_frontmatter(meta: dict[str, Any], body: str) -> str:
    order = ["title", "dek", "date", "tag", "cover", "featureImage", "pin", "draft"]
    lines = ["---"]
    seen: set[str] = set()
    for k in order:
        if k in meta and meta[k] is not None and str(meta[k]) != "":
            val = meta[k]
            if isinstance(val, bool):
                val = "true" if val else "false"
            lines.append(f"{k}: {val}")
            seen.add(k)
    for k, v in meta.items():
        if k in seen or v is None or str(v) == "":
            continue
        if isinstance(v, bool):
            v = "true" if v else "false"
        lines.append(f"{k}: {v}")
    lines.append("---")
    body_text = (body or "").replace("\r\n", "\n").lstrip("\n")
    if body_text and not body_text.endswith("\n"):
        body_text += "\n"
    # frontmatter block + blank line + body
    return "\n".join(lines) + "\n\n" + body_text


def list_local_posts() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if not POSTS_DIR.exists():
        return items
    for md in sorted(POSTS_DIR.glob("*.md")):
        try:
            raw = md.read_text(encoding="utf-8")
        except OSError:
            continue
        meta, body = parse_frontmatter(raw)
        items.append(
            {
                "slug": md.stem,
                "title": meta.get("title") or md.stem,
                "dek": meta.get("dek") or "",
                "date": meta.get("date") or "",
                "tag": meta.get("tag") or "教程",
                "cover": meta.get("cover") or "",
                "featureImage": meta.get("featureImage") or "",
                "pin": str(meta.get("pin", "")).lower() in ("true", "1", "yes"),
                "draft": str(meta.get("draft", "")).lower() in ("true", "1", "yes"),
                "body": body,
                "chars": len(body),
            }
        )
    items.sort(key=lambda x: x.get("date") or "", reverse=True)
    return items


def status_payload() -> dict[str, Any]:
    writing = read_json(WRITING_JSON, {}) or {}
    posts = read_json(POSTS_JSON, {}) or {}
    seeds = load_seeds()
    return {
        "ok": True,
        "root": str(ROOT),
        "host": HOST,
        "port": PORT,
        "time": utc_now(),
        "writing": {
            "updatedAt": writing.get("updatedAt"),
            "count": len(writing.get("items") or []),
            "items": writing.get("items") or [],
        },
        "posts": {
            "updatedAt": posts.get("updatedAt"),
            "count": len(posts.get("items") or []),
            "items": posts.get("items") or [],
        },
        "seeds": seeds,
        "overridesCount": len(read_json(OVERRIDES, {}) or {}),
        "deploy": {
            "host": DEPLOY_HOST,
            "user": DEPLOY_USER,
            "path": DEPLOY_PATH,
        },
        "proxy": os.environ.get("https_proxy")
        or os.environ.get("HTTPS_PROXY")
        or DEFAULT_PROXY,
        "logPath": str(ADMIN_LOG),
    }


# ── actions ──────────────────────────────────────────────────────────

def action_import_x(url: str) -> dict[str, Any]:
    sid = extract_status_id(url)
    if not sid:
        return {"ok": False, "error": "无法解析 X 链接或 status id", "input": url}
    with _lock:
        result = run_cmd(
            [sys.executable, str(ROOT / "scripts" / "sync_writing.py"), "--add-id", sid],
            timeout=120,
        )
    writing = read_json(WRITING_JSON, {}) or {}
    found = next((it for it in (writing.get("items") or []) if str(it.get("id")) == sid), None)
    return {
        "ok": result["ok"] and found is not None,
        "id": sid,
        "item": found,
        "seeds": load_seeds(),
        "sync": {
            "code": result["code"],
            "stdout": result["stdout"][-4000:],
            "stderr": result["stderr"][-4000:],
        },
        "error": None
        if (result["ok"] and found)
        else (
            "同步完成但未在 writing.json 中找到该 id（可能不是 X Article）"
            if result["ok"]
            else (result["stderr"] or "sync failed")[:500]
        ),
    }


def action_sync_x() -> dict[str, Any]:
    with _lock:
        result = run_cmd(
            [sys.executable, str(ROOT / "scripts" / "sync_writing.py")],
            timeout=180,
        )
    writing = read_json(WRITING_JSON, {}) or {}
    return {
        "ok": result["ok"],
        "count": len(writing.get("items") or []),
        "updatedAt": writing.get("updatedAt"),
        "items": writing.get("items") or [],
        "sync": {
            "code": result["code"],
            "stdout": result["stdout"][-4000:],
            "stderr": result["stderr"][-4000:],
        },
        "error": None if result["ok"] else (result["stderr"] or "sync failed")[:500],
    }


def action_build_posts() -> dict[str, Any]:
    with _lock:
        result = run_cmd(
            [sys.executable, str(ROOT / "scripts" / "build_posts.py")],
            timeout=60,
        )
    posts = read_json(POSTS_JSON, {}) or {}
    return {
        "ok": result["ok"],
        "count": len(posts.get("items") or []),
        "updatedAt": posts.get("updatedAt"),
        "items": posts.get("items") or [],
        "build": {
            "code": result["code"],
            "stdout": result["stdout"][-4000:],
            "stderr": result["stderr"][-4000:],
        },
        "error": None if result["ok"] else (result["stderr"] or result["stdout"] or "build failed")[:500],
    }


def action_save_post(payload: dict[str, Any]) -> dict[str, Any]:
    slug = str(payload.get("slug") or "").strip().lower()
    if not SLUG_RE.match(slug):
        return {"ok": False, "error": "slug 仅允许小写字母、数字、连字符，且以字母/数字开头"}
    title = str(payload.get("title") or "").strip()
    date = str(payload.get("date") or "").strip().replace("-", ".")
    if not title or not date:
        return {"ok": False, "error": "title 与 date 必填"}
    if not re.match(r"^\d{4}\.\d{2}\.\d{2}$", date):
        return {"ok": False, "error": "date 格式应为 YYYY.MM.DD 或 YYYY-MM-DD"}

    meta: dict[str, Any] = {
        "title": title,
        "dek": str(payload.get("dek") or ""),
        "date": date,
        "tag": str(payload.get("tag") or "教程"),
    }
    for k in ("cover", "featureImage"):
        v = str(payload.get(k) or "").strip()
        if v:
            meta[k] = v
    if payload.get("pin") in (True, "true", "1", "yes", 1):
        meta["pin"] = True
    if payload.get("draft") in (True, "true", "1", "yes", 1):
        meta["draft"] = True

    body = str(payload.get("body") or "")
    text = dump_frontmatter(meta, body)
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    path = POSTS_DIR / f"{slug}.md"
    path.write_text(text, encoding="utf-8")
    log(f"saved post {slug}")

    build = action_build_posts()
    return {
        "ok": True,
        "slug": slug,
        "path": str(path.relative_to(ROOT)),
        "build": build,
    }


def action_delete_post(slug: str) -> dict[str, Any]:
    slug = slug.strip().lower()
    if not SLUG_RE.match(slug):
        return {"ok": False, "error": "非法 slug"}
    path = POSTS_DIR / f"{slug}.md"
    if not path.exists():
        return {"ok": False, "error": "文章不存在"}
    path.unlink()
    # remove built page if present
    built = ROOT / "writing" / slug
    if built.is_dir():
        shutil.rmtree(built, ignore_errors=True)
    log(f"deleted post {slug}")
    build = action_build_posts()
    return {"ok": True, "slug": slug, "build": build}


def action_remove_seed(sid: str) -> dict[str, Any]:
    sid = sid.strip()
    if not ID_RE.match(sid):
        return {"ok": False, "error": "非法 id"}
    if not SEEDS.exists():
        return {"ok": False, "error": "seeds 文件不存在"}
    lines = SEEDS.read_text(encoding="utf-8").splitlines(keepends=True)
    kept = [ln for ln in lines if ln.split("#", 1)[0].strip() != sid]
    SEEDS.write_text("".join(kept), encoding="utf-8")
    # also drop from writing.json by re-sync
    sync = action_sync_x()
    return {"ok": True, "id": sid, "seeds": load_seeds(), "sync": sync}


def action_deploy() -> dict[str, Any]:
    if not shutil.which("rsync"):
        return {"ok": False, "error": "本机未找到 rsync"}
    target = f"{DEPLOY_USER}@{DEPLOY_HOST}:{DEPLOY_PATH}"
    ssh_opt = DEPLOY_SSH.strip()
    args = [
        "rsync",
        "-az",
        "--delete",
        "--exclude", ".git",
        "--exclude", "node_modules",
        "--exclude", ".wrangler",
        "--exclude", "admin",
        "--exclude", ".claude",
        "--exclude", ".env",
        "--exclude", ".env.*",
        "--exclude", "assets/writing-ai-site-feature-src.png",
        "--exclude", "*.log",
    ]
    if ssh_opt:
        args.extend(["-e", f"ssh {ssh_opt}"])
    args.extend([str(ROOT) + "/", target])
    with _lock:
        result = run_cmd(args, timeout=300)
    return {
        "ok": result["ok"],
        "target": target,
        "deploy": {
            "code": result["code"],
            "stdout": result["stdout"][-4000:],
            "stderr": result["stderr"][-4000:],
        },
        "error": None if result["ok"] else (result["stderr"] or "deploy failed")[:800],
    }


def action_tail_log(n: int = 80) -> dict[str, Any]:
    if not ADMIN_LOG.exists():
        return {"ok": True, "lines": [], "path": str(ADMIN_LOG)}
    try:
        lines = ADMIN_LOG.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError as e:
        return {"ok": False, "error": str(e), "lines": []}
    return {"ok": True, "lines": lines[-n:], "path": str(ADMIN_LOG)}


# ── HTTP ─────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    server_version = "xyf-admin/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        # quieter access log
        pass

    def _json(self, code: int, payload: Any) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _text(self, code: int, body: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
            return data if isinstance(data, dict) else {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path in ("/", "/index.html"):
            html = (ADMIN_DIR / "index.html").read_bytes()
            return self._text(200, html, "text/html; charset=utf-8")

        if path.startswith("/static/"):
            rel = path[len("/static/") :]
            if ".." in rel or rel.startswith("/"):
                return self._json(400, {"error": "bad path"})
            fp = STATIC_DIR / rel
            if not fp.is_file():
                return self._json(404, {"error": "not found"})
            ctype = "text/plain; charset=utf-8"
            if fp.suffix == ".css":
                ctype = "text/css; charset=utf-8"
            elif fp.suffix == ".js":
                ctype = "application/javascript; charset=utf-8"
            elif fp.suffix == ".svg":
                ctype = "image/svg+xml"
            return self._text(200, fp.read_bytes(), ctype)

        if path == "/api/status":
            return self._json(200, status_payload())
        if path == "/api/writing":
            return self._json(200, read_json(WRITING_JSON, {"items": []}))
        if path == "/api/posts":
            return self._json(200, {"ok": True, "items": list_local_posts()})
        if path.startswith("/api/posts/"):
            slug = path[len("/api/posts/") :].strip("/")
            if not SLUG_RE.match(slug):
                return self._json(400, {"ok": False, "error": "非法 slug"})
            md = POSTS_DIR / f"{slug}.md"
            if not md.exists():
                return self._json(404, {"ok": False, "error": "不存在"})
            raw = md.read_text(encoding="utf-8")
            meta, body = parse_frontmatter(raw)
            return self._json(
                200,
                {
                    "ok": True,
                    "slug": slug,
                    "title": meta.get("title") or "",
                    "dek": meta.get("dek") or "",
                    "date": meta.get("date") or "",
                    "tag": meta.get("tag") or "教程",
                    "cover": meta.get("cover") or "",
                    "featureImage": meta.get("featureImage") or "",
                    "pin": str(meta.get("pin", "")).lower() in ("true", "1", "yes"),
                    "draft": str(meta.get("draft", "")).lower() in ("true", "1", "yes"),
                    "body": body,
                    "raw": raw,
                },
            )
        if path == "/api/logs":
            qs = parse_qs(parsed.query)
            n = 80
            try:
                n = min(500, max(10, int((qs.get("n") or ["80"])[0])))
            except ValueError:
                pass
            return self._json(200, action_tail_log(n))

        return self._json(404, {"error": "not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        data = self._read_json()

        try:
            if path == "/api/x/import":
                url = str(data.get("url") or data.get("id") or "")
                return self._json(200, action_import_x(url))
            if path == "/api/x/sync":
                return self._json(200, action_sync_x())
            if path == "/api/x/remove-seed":
                return self._json(200, action_remove_seed(str(data.get("id") or "")))
            if path == "/api/posts/build":
                return self._json(200, action_build_posts())
            if path == "/api/posts/save":
                return self._json(200, action_save_post(data))
            if path == "/api/posts/delete":
                return self._json(200, action_delete_post(str(data.get("slug") or "")))
            if path == "/api/deploy":
                return self._json(200, action_deploy())
        except Exception as e:
            log(f"error {path}: {e}\n{traceback.format_exc()}")
            return self._json(500, {"ok": False, "error": str(e)})

        return self._json(404, {"error": "not found"})

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path.startswith("/api/posts/"):
            slug = path[len("/api/posts/") :].strip("/")
            return self._json(200, action_delete_post(slug))
        return self._json(404, {"error": "not found"})


def main() -> int:
    if HOST not in ("127.0.0.1", "localhost", "::1"):
        print(
            f"[warn] 绑定 {HOST} 会暴露管理台；建议仅用 127.0.0.1",
            file=sys.stderr,
        )
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    log(f"admin listening http://{HOST}:{PORT}/  root={ROOT}")
    print(f"\n  xyf 管理台  →  http://{HOST}:{PORT}/\n", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
