#!/usr/bin/env python3
"""
Sync X Articles → data/writing.json + local covers.

Deterministic core used by Grok CLI cron / manual runs.
Does not call Grok for text or images — only fxtwitter + disk I/O.

Usage:
  python3 scripts/sync_writing.py
  python3 scripts/sync_writing.py --add-id 1234567890
  python3 scripts/sync_writing.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SEEDS = DATA / "writing-seeds.txt"
OVERRIDES = DATA / "writing-overrides.json"
OUT = DATA / "writing.json"
COVER_DIR = ROOT / "assets" / "writing-covers"

SCREEN = "xfengbro"
FXT = "https://api.fxtwitter.com/status/{id}"
UA = "xyf-ai.com-writing-sync/1.0 (+https://xyf-ai.com)"
ID_RE = re.compile(r"^\d{5,25}$")
MAX_ITEMS = 12
LIST_SLOTS = 3  # UI list rows under the feature card


def proxy_opener() -> urllib.request.OpenerDirector:
    proxy = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY") or os.environ.get(
        "http_proxy"
    ) or os.environ.get("HTTP_PROXY")
    if proxy:
        handler = urllib.request.ProxyHandler({"http": proxy, "https": proxy})
        return urllib.request.build_opener(handler)
    return urllib.request.build_opener()


OPENER = proxy_opener()


# urllib hits IncompleteRead through the local Shadowrocket proxy; curl handles it fine.
def _curl(url: str, accept: str, timeout: float) -> bytes:
    import subprocess

    proc = subprocess.run(
        ["curl", "-sSfL", "--max-time", str(int(timeout)),
         "-A", UA, "-H", f"Accept: {accept}", url],
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed ({proc.returncode}) for {url}: {proc.stderr.decode(errors='replace')[:200]}")
    return proc.stdout


def http_json(url: str, timeout: float = 25.0) -> dict[str, Any]:
    return json.loads(_curl(url, "application/json", timeout).decode("utf-8", errors="replace"))


def http_bytes(url: str, timeout: float = 40.0) -> bytes:
    return _curl(url, "*/*", timeout)


def load_seeds() -> list[str]:
    ids: list[str] = []
    if SEEDS.exists():
        for line in SEEDS.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if ID_RE.match(line):
                ids.append(line)
    if OUT.exists():
        try:
            prev = json.loads(OUT.read_text(encoding="utf-8"))
            for it in prev.get("items") or []:
                i = str(it.get("id") or "").strip()
                if ID_RE.match(i):
                    ids.append(i)
        except (json.JSONDecodeError, OSError):
            pass
    # stable unique, preserve order
    seen: set[str] = set()
    out: list[str] = []
    for i in ids:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out


def append_seed(status_id: str) -> None:
    SEEDS.parent.mkdir(parents=True, exist_ok=True)
    existing = set(load_seeds())
    if status_id in existing:
        return
    with SEEDS.open("a", encoding="utf-8") as f:
        f.write(f"{status_id}\n")


def load_overrides() -> dict[str, dict[str, Any]]:
    if not OVERRIDES.exists():
        return {}
    try:
        raw = json.loads(OVERRIDES.read_text(encoding="utf-8"))
        return {str(k): v for k, v in raw.items() if isinstance(v, dict)}
    except (json.JSONDecodeError, OSError):
        return {}


def fmt_date(ts: int | None, created_at: str | None) -> str:
    if ts:
        try:
            return datetime.fromtimestamp(int(ts), tz=timezone.utc).strftime("%Y.%m.%d")
        except (ValueError, OSError, OverflowError):
            pass
    if created_at:
        # Sun Jul 12 07:00:46 +0000 2026
        try:
            dt = datetime.strptime(created_at, "%a %b %d %H:%M:%S %z %Y")
            return dt.strftime("%Y.%m.%d")
        except ValueError:
            pass
    return ""


def first_line(text: str, max_len: int = 120) -> str:
    text = (text or "").replace("\r", "").strip()
    if not text:
        return ""
    line = text.split("\n", 1)[0].strip()
    if len(line) > max_len:
        return line[: max_len - 1].rstrip() + "…"
    return line


def cover_url_from_article(article: dict[str, Any]) -> str | None:
    cm = article.get("cover_media") or {}
    info = cm.get("media_info") or {}
    url = info.get("original_img_url")
    return url if isinstance(url, str) and url.startswith("http") else None


def download_cover(status_id: str, url: str) -> str | None:
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    dest = COVER_DIR / f"{status_id}.jpg"
    # Skip re-download if fresh enough (< 3 days) and non-trivial size
    if dest.exists() and dest.stat().st_size > 2000:
        age = time.time() - dest.stat().st_mtime
        if age < 3 * 24 * 3600:
            return f"assets/writing-covers/{status_id}.jpg"
    try:
        # prefer large variant when twimg
        fetch = url
        if "pbs.twimg.com" in url and "name=" not in url:
            fetch = url + ("&" if "?" in url else "?") + "name=large"
        data = http_bytes(fetch)
        if len(data) < 500:
            return None
        dest.write_bytes(data)
        return f"assets/writing-covers/{status_id}.jpg"
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        print(f"[warn] cover {status_id}: {e}", file=sys.stderr)
        if dest.exists() and dest.stat().st_size > 500:
            return f"assets/writing-covers/{status_id}.jpg"
        return None


def fetch_article(status_id: str) -> dict[str, Any] | None:
    try:
        data = http_json(FXT.format(id=status_id))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, RuntimeError, OSError) as e:
        print(f"[warn] status {status_id}: {e}", file=sys.stderr)
        return None
    tweet = data.get("tweet") if isinstance(data, dict) else None
    if not isinstance(tweet, dict):
        return None
    article = tweet.get("article")
    if not isinstance(article, dict):
        # Not an X Article — skip for Writing index
        print(f"[skip] {status_id}: not an X Article", file=sys.stderr)
        return None

    title = (article.get("title") or "").strip() or first_line(tweet.get("text") or "")
    preview = (article.get("preview_text") or "").strip()
    remote_cover = cover_url_from_article(article)
    local_cover = download_cover(status_id, remote_cover) if remote_cover else None

    views = tweet.get("views")
    try:
        views_n = int(views) if views is not None else None
    except (TypeError, ValueError):
        views_n = None

    return {
        "id": str(tweet.get("id") or status_id),
        "url": tweet.get("url") or f"https://x.com/{SCREEN}/status/{status_id}",
        "title": title,
        "dek": first_line(preview, 160),
        "date": fmt_date(tweet.get("created_timestamp"), tweet.get("created_at")),
        "createdTimestamp": tweet.get("created_timestamp") or 0,
        "cover": local_cover,
        "coverRemote": remote_cover,
        "viewsFallback": views_n,
        "tag": "AI 实践",
    }


def apply_overrides(item: dict[str, Any], ovr: dict[str, Any]) -> dict[str, Any]:
    out = dict(item)
    if ovr.get("titleDisplay"):
        out["titleDisplay"] = ovr["titleDisplay"]
    if ovr.get("dek"):
        out["dek"] = ovr["dek"]
    if ovr.get("tag"):
        out["tag"] = ovr["tag"]
    if ovr.get("featureImage"):
        out["featureImage"] = ovr["featureImage"]
    if "pin" in ovr:
        out["pin"] = bool(ovr["pin"])
    if ovr.get("cover"):
        out["cover"] = ovr["cover"]
    return out


def load_previous_items() -> dict[str, dict[str, Any]]:
    """Keep last-good items when fxtwitter 404s / flakes."""
    if not OUT.exists():
        return {}
    try:
        prev = json.loads(OUT.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for it in prev.get("items") or []:
        sid = str(it.get("id") or "").strip()
        if ID_RE.match(sid) and isinstance(it, dict):
            out[sid] = it
    return out


def build(ids: list[str], overrides: dict[str, dict[str, Any]]) -> dict[str, Any]:
    previous = load_previous_items()
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    for sid in ids:
        raw = fetch_article(sid)
        if not raw:
            cached = previous.get(sid)
            if cached:
                print(f"[cache] reuse previous item for {sid}", file=sys.stderr)
                raw = dict(cached)
                # Drop fields that overrides will re-apply cleanly
            else:
                continue
        ovr = overrides.get(sid) or {}
        items.append(apply_overrides(raw, ovr))
        seen.add(sid)

    # pin first, then by time desc
    def sort_key(it: dict[str, Any]) -> tuple:
        pin = 0 if it.get("pin") else 1
        ts = -(int(it.get("createdTimestamp") or 0))
        return (pin, ts)

    items.sort(key=sort_key)
    items = items[:MAX_ITEMS]

    return {
        "screenName": SCREEN,
        "profileUrl": f"https://x.com/{SCREEN}",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "listSlots": LIST_SLOTS,
        "items": items,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Sync X Articles into writing.json")
    ap.add_argument("--add-id", action="append", default=[], help="Append status ID to seeds and sync")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    for sid in args.add_id:
        sid = sid.strip()
        if not ID_RE.match(sid):
            print(f"invalid id: {sid}", file=sys.stderr)
            return 2
        append_seed(sid)

    ids = load_seeds()
    if not ids:
        print("no seed IDs — add data/writing-seeds.txt", file=sys.stderr)
        return 1

    print(f"[sync] {len(ids)} candidate id(s)", file=sys.stderr)
    payload = build(ids, load_overrides())
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"

    if args.dry_run:
        sys.stdout.write(text)
        return 0

    DATA.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"[sync] wrote {OUT.relative_to(ROOT)} with {len(payload['items'])} item(s)", file=sys.stderr)
    for i, it in enumerate(payload["items"], 1):
        print(
            f"  {i:02d} {it['id']}  {it.get('titleDisplay') or it.get('title')}  cover={it.get('cover')}",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
