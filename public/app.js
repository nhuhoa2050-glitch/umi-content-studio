// Umi Content Studio — frontend logic
const $ = (id) => document.getElementById(id);

const els = {
  productInfo: $("productInfo"),
  dropzone: $("dropzone"),
  dropzoneInner: $("dropzoneInner"),
  imageInput: $("imageInput"),
  previewWrap: $("previewWrap"),
  previewImg: $("previewImg"),
  removeImg: $("removeImg"),
  generateBtn: $("generateBtn"),
  errorBox: $("errorBox"),
  output: $("output"),
  loadingState: $("loadingState"),
  summaryCard: $("summaryCard"),
  panelScripts: $("panel-scripts"),
  panelAudience: $("panel-audience"),
  panelChannels: $("panel-channels"),
  copyJsonBtn: $("copyJsonBtn"),
  downloadBtn: $("downloadBtn"),
  // settings
  settingsCard: document.querySelector(".settings-card"),
  settingsToggle: $("settingsToggle"),
  keyStatus: $("keyStatus"),
  apiKey: $("apiKey"),
  modelInput: $("modelInput"),
  saveKeyBtn: $("saveKeyBtn"),
};

let imageDataUrl = null;
let lastPlan = null;

// ---------- API key (lưu localStorage) ----------
const KEY_STORE = "umi_apiKey";
const MODEL_STORE = "umi_model";

function loadKey() {
  els.apiKey.value = localStorage.getItem(KEY_STORE) || "";
  els.modelInput.value = localStorage.getItem(MODEL_STORE) || "";
  updateKeyStatus();
  // mở sẵn panel nếu chưa có key
  if (!els.apiKey.value) els.settingsCard.classList.add("open");
}
function updateKeyStatus() {
  const has = !!els.apiKey.value.trim();
  els.keyStatus.textContent = has ? "✓ đã có key" : "⚠ chưa có key";
  els.keyStatus.classList.toggle("ok", has);
}
els.settingsToggle.addEventListener("click", () => els.settingsCard.classList.toggle("open"));
els.saveKeyBtn.addEventListener("click", () => {
  localStorage.setItem(KEY_STORE, els.apiKey.value.trim());
  localStorage.setItem(MODEL_STORE, els.modelInput.value.trim());
  updateKeyStatus();
  els.settingsCard.classList.remove("open");
  flash(els.saveKeyBtn, "✓ Đã lưu");
});
els.apiKey.addEventListener("input", updateKeyStatus);
loadKey();

// ---------- Image upload ----------
els.dropzone.addEventListener("click", (e) => {
  if (e.target === els.removeImg) return;
  els.imageInput.click();
});
els.imageInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
["dragover", "dragenter"].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
  })
);
els.dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
els.removeImg.addEventListener("click", (e) => {
  e.stopPropagation();
  imageDataUrl = null;
  els.imageInput.value = "";
  els.previewWrap.hidden = true;
  els.dropzoneInner.hidden = false;
});

function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    imageDataUrl = reader.result;
    els.previewImg.src = imageDataUrl;
    els.previewWrap.hidden = false;
    els.dropzoneInner.hidden = true;
  };
  reader.readAsDataURL(file);
}

// ---------- Generate ----------
els.generateBtn.addEventListener("click", generate);

async function generate() {
  const productInfo = els.productInfo.value.trim();
  if (!productInfo && !imageDataUrl) {
    showError("Hãy nhập thông tin sản phẩm hoặc tải lên một ảnh.");
    return;
  }
  const apiKey = els.apiKey.value.trim();
  const model = els.modelInput.value.trim();
  if (!apiKey) {
    showError("Chưa có API key. Mở '⚙️ Cấu hình API' phía trên, dán key Groq miễn phí rồi Lưu.");
    els.settingsCard.classList.add("open");
    els.settingsCard.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  hideError();
  setLoading(true);
  els.output.hidden = true;

  try {
    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productInfo, imageDataUrl, apiKey, model }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `Lỗi ${resp.status}`);
    lastPlan = data;
    render(data);
    els.output.hidden = false;
    els.output.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(err.message || "Có lỗi xảy ra.");
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  els.generateBtn.disabled = on;
  els.generateBtn.querySelector(".btn-text").hidden = on;
  els.generateBtn.querySelector(".spinner").hidden = !on;
  els.loadingState.hidden = !on;
}
function showError(msg) {
  els.errorBox.textContent = "⚠ " + msg;
  els.errorBox.hidden = false;
}
function hideError() {
  els.errorBox.hidden = true;
}

// ---------- Render ----------
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const funnelClass = (f) => `badge-${String(f || "").toLowerCase().slice(0, 4)}`;

function render(p) {
  // Summary
  els.summaryCard.innerHTML = `
    <h3>${esc(p.product_summary || "Kế hoạch content")}</h3>
    ${p.positioning ? `<p class="positioning">“${esc(p.positioning)}”</p>` : ""}
  `;

  // Scripts
  els.panelScripts.innerHTML = (p.content_scripts || []).map(renderScript).join("") ||
    `<p class="hint">Không có kịch bản.</p>`;

  // Audience
  els.panelAudience.innerHTML = (p.target_audiences || []).map(renderAudience).join("") ||
    `<p class="hint">Không có đối tượng.</p>`;

  // Channels
  els.panelChannels.innerHTML = renderChannels(p.channels || []);

  bindCopyButtons();
}

function renderScript(s) {
  const hooks = (s.hooks || [])
    .map((h) => `<div class="hook-item"><span class="hook-type">${esc(h.type)}:</span>${esc(h.text)}</div>`)
    .join("");
  const body = (s.body || []).map((b) => `<li>${esc(b)}</li>`).join("");
  const ib = s.image_brief || {};
  return `
  <article class="script-card">
    <div class="script-head">
      <h3>${esc(s.title || "Kịch bản")}</h3>
      <span class="badge ${funnelClass(s.funnel)}">${esc(s.funnel || "")}</span>
    </div>
    <div class="script-meta">${esc(s.channel || "")} · ${esc(s.format || "")}</div>

    ${s.key_message ? `<div class="block"><div class="block-label">Key message</div><div class="key-message">${esc(s.key_message)}</div></div>` : ""}

    <div class="block hooks">
      <div class="block-label">Hook — 3 phương án</div>
      ${hooks}
      ${s.recommended_hook ? `<div class="recommended">👉 Gợi ý: ${esc(s.recommended_hook)}</div>` : ""}
    </div>

    ${body ? `<div class="block"><div class="block-label">Body</div><ul class="body-list">${body}</ul></div>` : ""}

    ${s.cta ? `<div class="block"><div class="block-label">CTA</div><span class="cta-box">${esc(s.cta)}</span></div>` : ""}

    <div class="img-brief">
      <div class="block-label">🖼️ Image brief đi kèm</div>
      <dl class="brief-grid">
        ${ib.concept ? `<dt>Concept</dt><dd>${esc(ib.concept)}</dd>` : ""}
        ${ib.emotion ? `<dt>Cảm xúc</dt><dd>${esc(ib.emotion)}</dd>` : ""}
        ${ib.composition ? `<dt>Bố cục</dt><dd>${esc(ib.composition)}</dd>` : ""}
        ${ib.colors ? `<dt>Màu</dt><dd>${esc(ib.colors)}</dd>` : ""}
        ${ib.text_overlay ? `<dt>Text overlay</dt><dd>${esc(ib.text_overlay)}</dd>` : ""}
      </dl>
      ${
        ib.image_prompt
          ? `<div class="prompt-row">
               <div class="prompt-text">${esc(ib.image_prompt)}</div>
               <button class="copy-prompt" data-copy="${esc(ib.image_prompt)}">Copy prompt</button>
             </div>`
          : ""
      }
    </div>
  </article>`;
}

function renderAudience(a) {
  const tier = esc(a.tier || "");
  return `
  <article class="aud-card">
    <div class="script-head">
      <h3>${esc(a.name || "Nhóm KH")}</h3>
      <span class="badge tier-${tier}">${tier}</span>
    </div>
    <dl class="aud-grid">
      ${a.demographic ? `<dt>Nhân khẩu</dt><dd>${esc(a.demographic)}</dd>` : ""}
      ${a.pain ? `<dt>Nỗi đau</dt><dd>${esc(a.pain)}</dd>` : ""}
      ${a.inner_voice ? `<dt>Câu nội tâm</dt><dd class="inner-voice">“${esc(a.inner_voice)}”</dd>` : ""}
      ${a.where_to_reach ? `<dt>Tiếp cận ở</dt><dd>${esc(a.where_to_reach)}</dd>` : ""}
    </dl>
  </article>`;
}

function renderChannels(channels) {
  if (!channels.length) return `<p class="hint">Không có kênh.</p>`;
  const rows = channels
    .map(
      (c) => `<tr>
        <td><strong>${esc(c.channel)}</strong></td>
        <td>${esc(c.format || "")}</td>
        <td><span class="badge ${funnelClass(c.funnel)}">${esc(c.funnel || "")}</span></td>
        <td>${esc(c.frequency || "")}</td>
        <td>${esc(c.reason || "")}</td>
      </tr>`
    )
    .join("");
  return `<table class="channel-table">
    <thead><tr><th>Kênh</th><th>Format</th><th>Phễu</th><th>Tần suất</th><th>Lý do</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function bindCopyButtons() {
  document.querySelectorAll(".copy-prompt").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(btn.dataset.copy);
      const old = btn.textContent;
      btn.textContent = "✓ Đã copy";
      setTimeout(() => (btn.textContent = old), 1500);
    });
  });
}

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $("panel-" + tab.dataset.tab).classList.add("active");
  });
});

// ---------- Export ----------
els.copyJsonBtn.addEventListener("click", () => {
  if (!lastPlan) return;
  navigator.clipboard.writeText(JSON.stringify(lastPlan, null, 2));
  flash(els.copyJsonBtn, "✓ Đã copy JSON");
});

els.downloadBtn.addEventListener("click", () => {
  if (!lastPlan) return;
  const md = toMarkdown(lastPlan);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ke-hoach-content.md";
  a.click();
  URL.revokeObjectURL(url);
});

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1500);
}

function toMarkdown(p) {
  let md = `# Kế hoạch Content\n\n${p.product_summary || ""}\n\n`;
  if (p.positioning) md += `> ${p.positioning}\n\n`;

  md += `## 🎯 Đối tượng mục tiêu\n\n`;
  (p.target_audiences || []).forEach((a) => {
    md += `### ${a.name} (${a.tier})\n`;
    if (a.demographic) md += `- **Nhân khẩu:** ${a.demographic}\n`;
    if (a.pain) md += `- **Nỗi đau:** ${a.pain}\n`;
    if (a.inner_voice) md += `- **Câu nội tâm:** "${a.inner_voice}"\n`;
    if (a.where_to_reach) md += `- **Tiếp cận:** ${a.where_to_reach}\n`;
    md += `\n`;
  });

  md += `## 📡 Kênh triển khai\n\n| Kênh | Format | Phễu | Tần suất | Lý do |\n|---|---|---|---|---|\n`;
  (p.channels || []).forEach((c) => {
    md += `| ${c.channel} | ${c.format || ""} | ${c.funnel || ""} | ${c.frequency || ""} | ${c.reason || ""} |\n`;
  });
  md += `\n`;

  md += `## 📝 Kịch bản content\n\n`;
  (p.content_scripts || []).forEach((s, i) => {
    md += `### ${i + 1}. ${s.title} [${s.funnel}] — ${s.channel} · ${s.format}\n\n`;
    if (s.key_message) md += `**Key message:** ${s.key_message}\n\n`;
    md += `**Hook:**\n`;
    (s.hooks || []).forEach((h) => (md += `- *${h.type}:* ${h.text}\n`));
    if (s.recommended_hook) md += `- 👉 Gợi ý: ${s.recommended_hook}\n`;
    md += `\n**Body:**\n`;
    (s.body || []).forEach((b) => (md += `- ${b}\n`));
    if (s.cta) md += `\n**CTA:** ${s.cta}\n`;
    const ib = s.image_brief || {};
    md += `\n**Image brief:**\n`;
    if (ib.concept) md += `- Concept: ${ib.concept}\n`;
    if (ib.emotion) md += `- Cảm xúc: ${ib.emotion}\n`;
    if (ib.composition) md += `- Bố cục: ${ib.composition}\n`;
    if (ib.colors) md += `- Màu: ${ib.colors}\n`;
    if (ib.text_overlay) md += `- Text overlay: ${ib.text_overlay}\n`;
    if (ib.image_prompt) md += `- Prompt (EN): \`${ib.image_prompt}\`\n`;
    md += `\n---\n\n`;
  });
  return md;
}
