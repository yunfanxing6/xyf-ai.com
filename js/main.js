/* ═══════════ xyf 编辑大刊站 — 交互与动效 ═══════════ */

const LINKS = {
  articles: {
    "01": "https://x.com/xfengbro/status/2075534333180621182",
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

  // Writing：从 X 实时同步文章浏览量（优先同域 /api/x-views，回退 fxtwitter）
  hydrateXViews();
});

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
