/**
 * GET /api/x-views?id=<statusId>
 * Proxy X post view counts (via fxtwitter) with short edge cache.
 * Keeps the static site free of CORS / CN reachability issues for the upstream API.
 */
const ID_RE = /^\d{5,25}$/;
const CACHE_TTL_S = 120;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = (url.searchParams.get("id") || "").trim();

  if (!ID_RE.test(id)) {
    return json({ error: "invalid id" }, 400);
  }

  const cache = caches.default;
  const cacheKey = new Request(
    new URL(`/api/x-views?id=${id}`, url.origin).toString(),
    { method: "GET" },
  );

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const upstream = await fetch(`https://api.fxtwitter.com/status/${id}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "xyf-ai.com/1.0 (+https://xyf-ai.com)",
      },
    });

    if (!upstream.ok) {
      return json({ error: "upstream", status: upstream.status }, 502);
    }

    const data = await upstream.json();
    const views = data?.tweet?.views;
    if (typeof views !== "number" || !Number.isFinite(views)) {
      return json({ error: "no views" }, 404);
    }

    const body = {
      id,
      views: Math.floor(views),
      updatedAt: Date.now(),
    };
    const response = json(body, 200, {
      "cache-control": `public, max-age=60, s-maxage=${CACHE_TTL_S}, stale-while-revalidate=600`,
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    return json({ error: "fetch failed" }, 502);
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      ...extraHeaders,
    },
  });
}
