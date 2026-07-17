#!/usr/bin/env python3
"""
xyf-ai.com view counter — stdlib only, SQLite storage.

Routes (behind Caddy at /api/views/*):
  POST /api/views/hit?slug=<slug>   → increment & return {"slug","views"}
  GET  /api/views/get?slug=<slug>   → return without increment
  GET  /api/views/all               → {"<slug>": n, ...}
"""
import json
import re
import sqlite3
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

DB_PATH = "/opt/xyf-views/views.db"
LISTEN = ("127.0.0.1", 8787)
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")

_lock = threading.Lock()
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.execute("CREATE TABLE IF NOT EXISTS views (slug TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)")
_conn.commit()


def bump(slug: str) -> int:
    with _lock:
        _conn.execute(
            "INSERT INTO views(slug, n) VALUES(?,1) ON CONFLICT(slug) DO UPDATE SET n = n + 1",
            (slug,),
        )
        _conn.commit()
        return _conn.execute("SELECT n FROM views WHERE slug=?", (slug,)).fetchone()[0]


def get(slug: str) -> int:
    with _lock:
        row = _conn.execute("SELECT n FROM views WHERE slug=?", (slug,)).fetchone()
        return row[0] if row else 0


def all_counts() -> dict:
    with _lock:
        return dict(_conn.execute("SELECT slug, n FROM views").fetchall())


class Handler(BaseHTTPRequestHandler):
    server_version = "xyf-views/1.0"

    def _send(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _slug(self) -> str | None:
        q = parse_qs(urlparse(self.path).query)
        slug = (q.get("slug") or [""])[0]
        return slug if SLUG_RE.match(slug) else None

    def do_POST(self) -> None:
        if urlparse(self.path).path == "/api/views/hit":
            slug = self._slug()
            if not slug:
                return self._send(400, {"error": "bad slug"})
            return self._send(200, {"slug": slug, "views": bump(slug)})
        self._send(404, {"error": "not found"})

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/views/get":
            slug = self._slug()
            if not slug:
                return self._send(400, {"error": "bad slug"})
            return self._send(200, {"slug": slug, "views": get(slug)})
        if path == "/api/views/all":
            return self._send(200, all_counts())
        self._send(404, {"error": "not found"})

    def log_message(self, *args) -> None:
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(LISTEN, Handler).serve_forever()
