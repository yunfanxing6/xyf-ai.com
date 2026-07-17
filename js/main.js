/* ═══════════ xyf 编辑大刊站 — 交互与动效 ═══════════ */

const LINKS = {
  articles: {
    "01": "https://x.com/xfengbro/status/2076200076528288134",
    "02": "https://x.com/xfengbro/status/2075534333180621182",
  },
  social: {
    x: "https://x.com/xfengbro",
    telegram: "https://t.me/yunfanxing",
    telegramGroup: "https://t.me/+TXvJqNLp8_9iNGNl",
    github: "https://github.com/yunfanxing6",
    // 小红书：web 端 profile 需 24 位 userId；目前用小红书号搜索入口，拿到主页分享链后可替换
    xiaohongshu: "https://www.xiaohongshu.com/search_result?keyword=26963854120&source=web_user_page",
    // 抖音号 52563790709 对应 sec_uid（网页主页必须用 sec_uid，不能用抖音号）
    douyin: "https://www.douyin.com/user/MS4wLjABAAAAt2IYDh3RCyOTeeG1pjnfnSfQTT3RPobH2nW8Vh3w4F-p7pafrCtKTrrC1JrtK_ny",
    bilibili: null,
    youtube: "https://www.youtube.com/@xyf-ai",
  },
  email: "yunfanxing6@gmail.com",
  wechatQr: "assets/wechat-group-qr.jpg",
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
const hasGSAP = typeof window.gsap !== "undefined";

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-ready");

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  if (hasGSAP && !reduceMotion) {
    const heroItems = gsap.utils.toArray("#hero [data-reveal]");
    gsap.set(heroItems, { opacity: 0, y: 20 });
    gsap.to(heroItems, {
      opacity: 1, y: 0, duration: 1, ease: "power3.out",
      stagger: 0.14, delay: 0.25,
    });

    ["#about", "#writing", "#shoot", "#build", "#contact"].forEach((sel) => {
      const section = document.querySelector(sel);
      const items = gsap.utils.toArray(sel + " [data-reveal]");
      if (!section || !items.length) return;
      gsap.set(items, { opacity: 0, y: 30 });
      gsap.to(items, {
        opacity: 1, y: 0, duration: 1.4, ease: "power3.out", stagger: 0.2,
        scrollTrigger: { trigger: section, start: "top 76%" },
      });
    });
  }

  const navMap = {
    hero: null, about: "ABOUT", writing: "WRITING",
    shoot: "VIDEO", build: "BUILD", contact: "CONTACT",
  };
  const links = [...document.querySelectorAll(".nav__links a")];
  const setActive = (label) => {
    links.forEach((a) =>
      a.classList.toggle("is-active", !!label && a.textContent.trim() === label));
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(navMap[e.target.id]); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    ["hero", "about", "writing", "shoot", "build", "contact"].forEach((id) => {
      const el = document.getElementById(id); if (el) io.observe(el);
    });
  }

  const shootEl = document.getElementById("shoot");
  if (shootEl) {
    const NAV_LINE = 36;
    let raf = 0;
    const syncDark = () => {
      raf = 0;
      const r = shootEl.getBoundingClientRect();
      const overDark = r.top <= NAV_LINE && r.bottom >= NAV_LINE;
      document.body.classList.toggle("theme-shoot", overDark);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(syncDark); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    syncDark();
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });

  // Writing：JSON 驱动列表 + X 浏览量 + 站内文章浏览量
  hydrateWriting().finally(() => { hydrateXViews(); hydrateLocalViews(); });

  // Video marquee：把源卡片复制到足够宽，再克隆整组做无缝循环
  initVideoMarquee();
});

/* ── Writing：data/writing.json（X 同步）+ data/posts.json（站内博客）── */
const WRITING_JSON = "data/writing.json";
const POSTS_JSON = "data/posts.json";
const VIEW_SVG =
  '<svg class="viewico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';

function displayTitle(item) {
  return (item && (item.titleDisplay || item.title) || "").trim();
}

function formatViewsFallback(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return formatViews(n);
}

function dekToHtml(dek) {
  const raw = (dek || "").replace(/\r/g, "").trim();
  if (!raw) return "";
  return raw
    .split("\n")
    .map((line) =>
      line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"),
    )
    .join("<br />");
}

function nbspTag(tag) {
  return String(tag || "AI 实践").replace(/ /g, "\u00a0");
}

async function fetchJson(url) {
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, {
      headers: { Accept: "application/json" },
      cache: "no-cache",
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function hydrateWriting() {
  const root = document.querySelector("[data-writing-root]");
  if (!root) return;

  const [data, posts] = await Promise.all([fetchJson(WRITING_JSON), fetchJson(POSTS_JSON)]);

  const xItems = Array.isArray(data?.items) ? data.items : [];
  const localItems = Array.isArray(posts?.items) ? posts.items : [];
  const items = [...localItems, ...xItems].sort(
    (a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0),
  );
  if (!items.length) return;

  const listSlots = Math.max(1, Math.min(6, Number(data?.listSlots) || 3));
  const feature = items.find((it) => it.pin) || items[0];
  const rest = items.filter((it) => it !== feature);

  // Feature card
  const feat = root.querySelector("[data-writing-feat]");
  if (feat && feature) {
    const url = feature.url || `https://x.com/xfengbro/status/${feature.id}`;
    feat.setAttribute("href", url);
    if (feature.local) {
      feat.removeAttribute("target");
      feat.removeAttribute("rel");
    } else {
      feat.setAttribute("target", "_blank");
      feat.setAttribute("rel", "noopener");
    }
    const title = displayTitle(feature);
    const titleEl = feat.querySelector("[data-writing-feat-title]");
    if (titleEl) titleEl.textContent = title;
    const dekEl = feat.querySelector("[data-writing-feat-dek]");
    if (dekEl) dekEl.innerHTML = dekToHtml(feature.dek);
    const tagEl = feat.querySelector("[data-writing-feat-tag]");
    if (tagEl) tagEl.innerHTML = nbspTag(feature.tag || "AI 实践");
    const dateEl = feat.querySelector("[data-writing-feat-date]");
    if (dateEl) dateEl.textContent = feature.date || "";
    const frame = feat.querySelector("[data-writing-feat-frame]");
    const img = feat.querySelector("[data-writing-feat-img]");
    const featureImg = feature.featureImage;
    const cover = feature.cover;
    frame?.classList.toggle("feat__frame--paper", !!feature.local);
    if (img) {
      if (featureImg) {
        img.src = featureImg;
        frame?.classList.remove("feat__frame--cover");
      } else if (cover) {
        img.src = cover;
        frame?.classList.add("feat__frame--cover");
      }
    }
    const viewsWrap = feat.querySelector("[data-writing-feat-views]");
    if (viewsWrap && feature.id) {
      if (feature.local) {
        viewsWrap.removeAttribute("data-x-status");
        viewsWrap.setAttribute("data-local-slug", String(feature.id));
        viewsWrap.setAttribute("title", "浏览量（站内）");
      } else {
        viewsWrap.removeAttribute("data-local-slug");
        viewsWrap.setAttribute("data-x-status", String(feature.id));
      }
      const n = viewsWrap.querySelector(".views-n");
      const fb = formatViewsFallback(feature.viewsFallback);
      if (n) {
        n.textContent = fb || "—";
        if (fb) n.dataset.viewsFallback = String(feature.viewsFallback);
      }
    }
  }

  // List rows
  const list = root.querySelector("[data-writing-list]");
  if (list) {
    list.innerHTML = "";
    for (let i = 0; i < listSlots; i++) {
      const item = rest[i];
      const idx = String(i + 2).padStart(2, "0");
      if (!item) {
        const soon = document.createElement("div");
        soon.className = "wpost wpost--soon";
        soon.setAttribute("data-reveal", "");
        soon.innerHTML =
          `<span class="wpost__idx">${idx}</span>` +
          `<div class="wpost__body"><h3 class="wpost__title">敬请期待</h3>` +
          `<div class="wpost__meta"><span class="wpost__tag">SOON</span></div></div>` +
          `<span class="wpost__thumb wpost__thumb--cover"><img src="assets/soon-0${(i % 3) + 2}.png" alt="" loading="lazy" /></span>`;
        list.appendChild(soon);
        continue;
      }
      const a = document.createElement("a");
      a.className = "wpost";
      a.href = item.url || `https://x.com/xfengbro/status/${item.id}`;
      if (!item.local) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      a.setAttribute("data-reveal", "");
      const fb = formatViewsFallback(item.viewsFallback) || "—";
      const thumb = item.cover || "assets/writing-thumb.png";
      const viewsAttr = item.local
        ? `data-local-slug="${String(item.id || "")}" title="浏览量（站内）"`
        : `data-x-status="${String(item.id || "")}" title="浏览量（来自 X，实时）"`;
      a.innerHTML =
        `<span class="wpost__idx">${idx}</span>` +
        `<div class="wpost__body">` +
        `<h3 class="wpost__title"></h3>` +
        `<div class="wpost__meta">` +
        `<span class="wpost__tag"></span><span class="dotsep"></span>` +
        `<span class="wpost__date"></span>` +
        `<span class="wpost__views" ${viewsAttr}>` +
        VIEW_SVG +
        `<span class="views-n" data-views-fallback="${item.viewsFallback ?? ""}">${fb}</span>` +
        `</span></div></div>` +
        `<span class="wpost__thumb wpost__thumb--cover"><img src="${thumb}" alt="" loading="lazy" /></span>`;
      a.querySelector(".wpost__title").textContent = displayTitle(item);
      a.querySelector(".wpost__tag").innerHTML = nbspTag(item.tag || "AI 实践");
      a.querySelector(".wpost__date").textContent = item.date || "";
      list.appendChild(a);
    }
  }

  const all = document.querySelector("[data-writing-all]");
  if (all && data.profileUrl) all.setAttribute("href", data.profileUrl);
}

/* ── Video marquee（Contact 同款无限向左）─────────────────── */
function initVideoMarquee() {
  const root = document.querySelector("[data-vmarquee]");
  if (!root) return;
  const track = root.querySelector(".vmarquee__track");
  const set = root.querySelector("[data-vmarquee-set]");
  if (!track || !set) return;

  // 组内至少铺满约 1.2 屏，避免宽屏空档
  const minWidth = Math.max(window.innerWidth * 1.25, 1200);
  let guard = 0;
  while (set.scrollWidth < minWidth && guard < 12) {
    [...set.children].forEach((child) => {
      const clone = child.cloneNode(true);
      if (clone instanceof HTMLElement) {
        clone.setAttribute("tabindex", "-1");
        clone.setAttribute("aria-hidden", "true");
      }
      set.appendChild(clone);
    });
    guard += 1;
  }

  // 第二组：无缝循环（translateX -50%）
  const twin = set.cloneNode(true);
  if (twin instanceof HTMLElement) {
    twin.setAttribute("aria-hidden", "true");
    twin.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
    track.appendChild(twin);
  }
}

/* ── 站内文章浏览量（/api/views，VPS SQLite 计数） ───────── */
async function hydrateLocalViews() {
  const nodes = document.querySelectorAll("[data-local-slug]");
  if (!nodes.length) return;
  let counts;
  try {
    const res = await fetch("/api/views/all", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });
    if (!res.ok) return;
    counts = await res.json();
  } catch {
    return;
  }
  nodes.forEach((el) => {
    const slug = el.getAttribute("data-local-slug");
    const n = counts?.[slug];
    if (typeof n !== "number") return;
    const label = formatViews(n) || "0";
    const num = el.querySelector(".views-n");
    if (num) num.textContent = label;
    el.setAttribute("title", `浏览量 ${label}（站内）`);
  });
}

/* ── Live X view counts ─────────────────────────────────── */
const VIEWS_CACHE_KEY = "xyf:x-views:v1";
const VIEWS_CACHE_TTL_MS = 2 * 60 * 1000; // 前端缓存 2 分钟，避免重复打接口

function formatViews(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n) || n < 0) return null;
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    const s = (k < 10 ? k.toFixed(1) : String(Math.round(k))).replace(/\.0$/, "");
    return s + "K";
  }
  const m = n / 1_000_000;
  const s = (m < 10 ? m.toFixed(1) : String(Math.round(m))).replace(/\.0$/, "");
  return s + "M";
}

function readViewsCache() {
  try {
    const raw = sessionStorage.getItem(VIEWS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeViewsCache(map) {
  try {
    sessionStorage.setItem(VIEWS_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

function applyViews(statusId, views) {
  const label = formatViews(views);
  if (!label) return;
  document.querySelectorAll(`[data-x-status="${statusId}"]`).forEach((el) => {
    const num = el.querySelector(".views-n");
    if (num) {
      num.textContent = label;
      num.dataset.viewsLive = String(Math.floor(views));
    }
    el.setAttribute("title", `浏览量 ${label}（来自 X，实时）`);
  });
}

async function fetchViewsForStatus(statusId) {
  // 1) 同域 Cloudflare Pages Function（推荐，边缘缓存）
  try {
    const res = await fetch(`/api/x-views?id=${encodeURIComponent(statusId)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.views === "number") return data.views;
    }
  } catch {
    /* fall through */
  }

  // 2) 直连 fxtwitter（本地预览 / Function 未部署时）
  try {
    const res = await fetch(`https://api.fxtwitter.com/status/${statusId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const views = data?.tweet?.views;
    return typeof views === "number" ? views : null;
  } catch {
    return null;
  }
}

async function hydrateXViews() {
  const nodes = document.querySelectorAll("[data-x-status]");
  if (!nodes.length) return;

  const ids = [
    ...new Set(
      [...nodes]
        .map((el) => (el.getAttribute("data-x-status") || "").trim())
        .filter((id) => /^\d{5,25}$/.test(id)),
    ),
  ];
  if (!ids.length) return;

  const cache = readViewsCache();
  const now = Date.now();
  const pending = [];

  for (const id of ids) {
    const entry = cache[id];
    if (entry && typeof entry.views === "number" && now - entry.ts < VIEWS_CACHE_TTL_MS) {
      applyViews(id, entry.views);
    } else {
      pending.push(id);
    }
  }

  if (!pending.length) return;

  await Promise.all(
    pending.map(async (id) => {
      const views = await fetchViewsForStatus(id);
      if (typeof views !== "number") return;
      cache[id] = { views: Math.floor(views), ts: Date.now() };
      applyViews(id, views);
    }),
  );
  writeViewsCache(cache);
}


