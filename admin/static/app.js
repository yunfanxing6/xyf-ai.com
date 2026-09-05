/* xyf admin UI */
const $ = (sel) => document.querySelector(sel);

const els = {
  statusDot: $("#status-dot"),
  statusText: $("#status-text"),
  xUrl: $("#x-url"),
  formImport: $("#form-import"),
  btnImport: $("#btn-import"),
  btnSyncAll: $("#btn-sync-all"),
  xResult: $("#x-result"),
  btnDeploy: $("#btn-deploy"),
  btnBuildPosts: $("#btn-build-posts"),
  deployTarget: $("#deploy-target"),
  deployResult: $("#deploy-result"),
  logView: $("#log-view"),
  logPath: $("#log-path"),
  btnRefreshLog: $("#btn-refresh-log"),
  writingList: $("#writing-list"),
  writingMeta: $("#writing-meta"),
  writingCount: $("#writing-count"),
  seedsList: $("#seeds-list"),
  seedsCount: $("#seeds-count"),
  postsList: $("#posts-list"),
  btnNewPost: $("#btn-new-post"),
  editorCard: $("#editor-card"),
  editorTitle: $("#editor-title"),
  btnCloseEditor: $("#btn-close-editor"),
  formPost: $("#form-post"),
  btnDeletePost: $("#btn-delete-post"),
  postResult: $("#post-result"),
  toast: $("#toast"),
  p: {
    slug: $("#p-slug"),
    date: $("#p-date"),
    title: $("#p-title"),
    dek: $("#p-dek"),
    tag: $("#p-tag"),
    pin: $("#p-pin"),
    draft: $("#p-draft"),
    cover: $("#p-cover"),
    feature: $("#p-feature"),
    body: $("#p-body"),
  },
};

let busy = false;
let editingSlug = null;

function toast(msg, ms = 2600) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    els.toast.hidden = true;
  }, ms);
}

function setBusy(on, label) {
  busy = on;
  els.statusDot.classList.toggle("busy", on);
  if (on) {
    els.statusDot.classList.remove("ok", "bad");
    if (label) els.statusText.textContent = label;
  }
  document.querySelectorAll("button, input, textarea").forEach((el) => {
    if (el.id === "btn-refresh-log" || el.id === "btn-close-editor") return;
    if (el.closest("#editor-card") && !on) return;
    // don't disable editor fields permanently — only action buttons during global ops
  });
  [
    els.btnImport,
    els.btnSyncAll,
    els.btnDeploy,
    els.btnBuildPosts,
  ].forEach((b) => {
    if (b) b.disabled = on;
  });
}

function showResult(el, ok, text) {
  el.hidden = false;
  el.classList.toggle("ok", !!ok);
  el.classList.toggle("bad", !ok);
  el.textContent = text;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    cache: "no-store",
    ...opts,
  });
  const data = await res.json().catch(() => ({ ok: false, error: "invalid json" }));
  if (!res.ok && data.error == null) data.error = `HTTP ${res.status}`;
  return data;
}

function fmtTitle(it) {
  return (it.titleDisplay || it.title || it.id || "—").trim();
}

function renderWriting(items) {
  if (!items?.length) {
    els.writingList.innerHTML = `<li class="empty">暂无 X 文章 — 粘贴链接导入</li>`;
    return;
  }
  els.writingList.innerHTML = items
    .map((it) => {
      const pin = it.pin ? `<span class="tag tag--pin">PIN</span>` : "";
      const cover = it.cover ? "有封面" : "无封面";
      return `<li>
        <div class="item__title">${escapeHtml(fmtTitle(it))}</div>
        <div class="item__meta">
          ${pin}
          <span class="tag">${escapeHtml(it.tag || "AI 实践")}</span>
          <span>${escapeHtml(it.date || "")}</span>
          <span>${cover}</span>
          <a href="${escapeAttr(it.url || "#")}" target="_blank" rel="noopener">打开</a>
          <span class="mono">${escapeHtml(String(it.id || ""))}</span>
        </div>
      </li>`;
    })
    .join("");
}

function renderSeeds(seeds) {
  els.seedsCount.textContent = String(seeds?.length || 0);
  if (!seeds?.length) {
    els.seedsList.innerHTML = `<li class="empty">无 seed</li>`;
    return;
  }
  els.seedsList.innerHTML = seeds
    .map(
      (id) => `<li>
        <span>${escapeHtml(id)}</span>
        <button type="button" class="btn btn--sm" data-remove-seed="${escapeAttr(id)}">移除</button>
      </li>`,
    )
    .join("");
  els.seedsList.querySelectorAll("[data-remove-seed]").forEach((btn) => {
    btn.addEventListener("click", () => removeSeed(btn.getAttribute("data-remove-seed")));
  });
}

function renderPosts(items) {
  if (!items?.length) {
    els.postsList.innerHTML = `<li class="empty">还没有本地文章 — 点「新建」</li>`;
    return;
  }
  els.postsList.innerHTML = items
    .map((it) => {
      const flags = [
        it.pin ? `<span class="tag tag--pin">PIN</span>` : "",
        it.draft ? `<span class="tag tag--draft">DRAFT</span>` : "",
        `<span class="tag tag--local">LOCAL</span>`,
      ]
        .filter(Boolean)
        .join(" ");
      return `<li style="cursor:pointer" data-edit-slug="${escapeAttr(it.slug)}">
        <div class="item__title">${escapeHtml(it.title)}</div>
        <div class="item__meta">
          ${flags}
          <span class="tag">${escapeHtml(it.tag || "")}</span>
          <span>${escapeHtml(it.date || "")}</span>
          <span class="mono">${escapeHtml(it.slug)}</span>
        </div>
      </li>`;
    })
    .join("");
  els.postsList.querySelectorAll("[data-edit-slug]").forEach((li) => {
    li.addEventListener("click", () => openEditor(li.getAttribute("data-edit-slug")));
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

async function refreshStatus() {
  try {
    const st = await api("/api/status");
    els.statusDot.classList.add("ok");
    els.statusDot.classList.remove("bad", "busy");
    els.statusText.textContent = `就绪 · proxy ${st.proxy || "—"}`;
    els.writingMeta.textContent = st.writing?.updatedAt
      ? `上次同步 ${st.writing.updatedAt}`
      : "尚未同步";
    els.writingCount.textContent = String(st.writing?.count || 0);
    renderWriting(st.writing?.items || []);
    renderSeeds(st.seeds || []);
    els.deployTarget.textContent = `目标 ${st.deploy?.user}@${st.deploy?.host}:${st.deploy?.path}`;
    els.logPath.textContent = st.logPath || "—";

    const posts = await api("/api/posts");
    renderPosts(posts.items || []);
  } catch (e) {
    els.statusDot.classList.add("bad");
    els.statusDot.classList.remove("ok", "busy");
    els.statusText.textContent = `连接失败：${e.message || e}`;
  }
}

async function refreshLog() {
  const data = await api("/api/logs?n=100");
  if (data.lines?.length) {
    els.logView.textContent = data.lines.join("\n");
    els.logView.scrollTop = els.logView.scrollHeight;
  } else {
    els.logView.textContent = "（暂无日志）";
  }
}

async function importX(ev) {
  ev?.preventDefault();
  const url = els.xUrl.value.trim();
  if (!url) {
    toast("请粘贴链接或 id");
    return;
  }
  setBusy(true, "正在导入 X Article…");
  try {
    const data = await api("/api/x/import", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    if (data.ok) {
      showResult(
        els.xResult,
        true,
        `已同步 id=${data.id}\n${fmtTitle(data.item || {})}\n记得点「发布到线上」部署。`,
      );
      els.xUrl.value = "";
      toast("导入成功");
    } else {
      showResult(els.xResult, false, data.error || "导入失败");
      toast("导入失败");
    }
    await refreshStatus();
    await refreshLog();
  } catch (e) {
    showResult(els.xResult, false, String(e));
  } finally {
    setBusy(false);
    els.statusDot.classList.add("ok");
  }
}

async function syncAll() {
  setBusy(true, "正在刷新全部 X…");
  try {
    const data = await api("/api/x/sync", { method: "POST", body: "{}" });
    if (data.ok) {
      showResult(els.xResult, true, `已刷新 ${data.count} 篇 · ${data.updatedAt || ""}`);
      toast(`已刷新 ${data.count} 篇`);
    } else {
      showResult(els.xResult, false, data.error || "同步失败");
      toast("同步失败");
    }
    await refreshStatus();
    await refreshLog();
  } finally {
    setBusy(false);
    els.statusDot.classList.add("ok");
  }
}

async function removeSeed(id) {
  if (!confirm(`从 seeds 移除 ${id} 并重新同步？`)) return;
  setBusy(true, "移除 seed…");
  try {
    const data = await api("/api/x/remove-seed", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    toast(data.ok ? "已移除" : data.error || "失败");
    await refreshStatus();
    await refreshLog();
  } finally {
    setBusy(false);
    els.statusDot.classList.add("ok");
  }
}

async function deploy() {
  if (!confirm("确认 rsync 部署到 VPS？")) return;
  setBusy(true, "正在部署…");
  try {
    const data = await api("/api/deploy", { method: "POST", body: "{}" });
    if (data.ok) {
      showResult(els.deployResult, true, `部署成功 → ${data.target}`);
      toast("部署成功");
    } else {
      showResult(
        els.deployResult,
        false,
        (data.error || "部署失败") +
          (data.deploy?.stderr ? "\n\n" + data.deploy.stderr.slice(-600) : ""),
      );
      toast("部署失败（检查 SSH / 网络）");
    }
    await refreshLog();
  } finally {
    setBusy(false);
    els.statusDot.classList.add("ok");
  }
}

async function buildPostsOnly() {
  setBusy(true, "构建本地文章…");
  try {
    const data = await api("/api/posts/build", { method: "POST", body: "{}" });
    showResult(
      els.deployResult,
      !!data.ok,
      data.ok
        ? `构建完成 ${data.count} 篇 · ${data.updatedAt || ""}`
        : data.error || "构建失败",
    );
    toast(data.ok ? "构建完成" : "构建失败");
    await refreshStatus();
    await refreshLog();
  } finally {
    setBusy(false);
    els.statusDot.classList.add("ok");
  }
}

function todayDot() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function openEditor(slug) {
  els.editorCard.hidden = false;
  els.postResult.hidden = true;
  if (!slug) {
    editingSlug = null;
    els.editorTitle.textContent = "新建文章";
    els.p.slug.value = "";
    els.p.slug.readOnly = false;
    els.p.date.value = todayDot();
    els.p.title.value = "";
    els.p.dek.value = "";
    els.p.tag.value = "教程";
    els.p.pin.checked = false;
    els.p.draft.checked = false;
    els.p.cover.value = "";
    els.p.feature.value = "";
    els.p.body.value = "\n在这里写正文…\n";
    els.p.slug.focus();
    return;
  }
  editingSlug = slug;
  els.editorTitle.textContent = `编辑 · ${slug}`;
  api(`/api/posts/${encodeURIComponent(slug)}`).then((data) => {
    if (!data.ok) {
      toast(data.error || "加载失败");
      return;
    }
    els.p.slug.value = data.slug;
    els.p.slug.readOnly = true;
    els.p.date.value = data.date || "";
    els.p.title.value = data.title || "";
    els.p.dek.value = data.dek || "";
    els.p.tag.value = data.tag || "教程";
    els.p.pin.checked = !!data.pin;
    els.p.draft.checked = !!data.draft;
    els.p.cover.value = data.cover || "";
    els.p.feature.value = data.featureImage || "";
    els.p.body.value = data.body || "";
  });
}

function closeEditor() {
  els.editorCard.hidden = true;
  editingSlug = null;
}

async function savePost(ev) {
  ev?.preventDefault();
  const payload = {
    slug: els.p.slug.value.trim(),
    date: els.p.date.value.trim(),
    title: els.p.title.value.trim(),
    dek: els.p.dek.value,
    tag: els.p.tag.value.trim() || "教程",
    pin: els.p.pin.checked,
    draft: els.p.draft.checked,
    cover: els.p.cover.value.trim(),
    featureImage: els.p.feature.value.trim(),
    body: els.p.body.value,
  };
  setBusy(true, "保存文章…");
  try {
    const data = await api("/api/posts/save", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (data.ok) {
      showResult(els.postResult, true, `已保存 ${data.path}\n构建：${data.build?.ok ? "ok" : data.build?.error || "—"}`);
      toast("已保存并构建");
      editingSlug = payload.slug;
      els.p.slug.readOnly = true;
      await refreshStatus();
      await refreshLog();
    } else {
      showResult(els.postResult, false, data.error || "保存失败");
      toast("保存失败");
    }
  } finally {
    setBusy(false);
    els.statusDot.classList.add("ok");
  }
}

async function deletePost() {
  const slug = els.p.slug.value.trim() || editingSlug;
  if (!slug) return;
  if (!confirm(`删除 posts/${slug}.md ？不可恢复`)) return;
  setBusy(true, "删除中…");
  try {
    const data = await api("/api/posts/delete", {
      method: "POST",
      body: JSON.stringify({ slug }),
    });
    if (data.ok) {
      toast("已删除");
      closeEditor();
      await refreshStatus();
    } else {
      toast(data.error || "删除失败");
    }
  } finally {
    setBusy(false);
    els.statusDot.classList.add("ok");
  }
}

// bind
els.formImport.addEventListener("submit", importX);
els.btnSyncAll.addEventListener("click", syncAll);
els.btnDeploy.addEventListener("click", deploy);
els.btnBuildPosts.addEventListener("click", buildPostsOnly);
els.btnRefreshLog.addEventListener("click", refreshLog);
els.btnNewPost.addEventListener("click", () => openEditor(null));
els.btnCloseEditor.addEventListener("click", closeEditor);
els.formPost.addEventListener("submit", savePost);
els.btnDeletePost.addEventListener("click", deletePost);

// boot
refreshStatus();
refreshLog();
