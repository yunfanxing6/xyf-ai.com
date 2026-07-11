/* ═══════════ Build 终端:流式打字 + 编译进度条 ═══════════ */
(() => {
  const root = document.querySelector("[data-build]");
  if (!root) return;

  const codeEl = root.querySelector("[data-typed]");
  const label  = root.querySelector("[data-compile-label]");
  const bar    = root.querySelector("[data-progress-bar]");
  const num    = root.querySelector("[data-progress-num]");
  const measure = document.querySelector("[data-progress-measure]");
  const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  const LINES = [
    "$ xyf build --in-public",
    "10:12:01  checking workspace",
    "10:12:02  loading modules",
    "10:12:03  resolving dependencies",
    "10:12:05  generating bundles",
    "10:12:07  optimizing assets",
    "10:12:08  writing artifacts",
    "10:12:09  linking ideas",
  ];
  const FULL = LINES.join("\n");
  const RUN_MS = 7200;
  const HOLD_MS = 700;

  let active = false;
  let startedAt = 0;
  let raf = 0;

  const setProgress = (p) => {
    const v = Math.round(Math.max(0, Math.min(100, p)));
    if (bar) bar.style.width = v + "%";
    if (num) num.textContent = v + "%";
    if (measure) measure.textContent = v + "%";
  };

  const setLabel = (p) => {
    if (!label) return;
    if (p < 16) label.textContent = "booting...";
    else if (p < 68) label.textContent = "compiling...";
    else if (p < 92) label.textContent = "linking...";
    else if (p < 100) label.textContent = "finalizing...";
    else label.textContent = "compiled";
  };

  const render = (now) => {
    if (!active) return;
    if (!startedAt) startedAt = now;

    const elapsed = (now - startedAt) % (RUN_MS + HOLD_MS);
    const running = elapsed < RUN_MS;
    const progress = running ? (elapsed / RUN_MS) * 100 : 100;
    const textProgress = Math.min(1, progress / 92);
    const typedChars = running ? Math.floor(FULL.length * textProgress) : FULL.length;

    codeEl.textContent = FULL.slice(0, typedChars);
    setProgress(progress);
    setLabel(progress);

    raf = requestAnimationFrame(render);
  };

  const run = () => {
    if (active) return;
    if (reduce) {
      codeEl.textContent = FULL;
      setProgress(100);
      setLabel(100);
      return;
    }
    active = true;
    startedAt = 0;
    codeEl.textContent = "";
    setProgress(0);
    setLabel(0);
    raf = requestAnimationFrame(render);
  };

  const pause = () => {
    active = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.isIntersecting ? run() : pause(); });
    }, { rootMargin: "-18% 0px -18% 0px" });
    io.observe(root);
  } else {
    run();
  }
})();
