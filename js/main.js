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
    xiaohongshu: null,
    douyin: null,
    bilibili: null,
    youtube: null,
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
});
