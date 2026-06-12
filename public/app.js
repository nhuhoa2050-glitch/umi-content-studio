// Umi Content Studio — frontend logic (multi-skill)
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
  loadingCycle: $("loadingCycle"),
  skillGroups: $("skillGroups"),
  selectedSkill: $("selectedSkill"),
  ssName: $("ssName"),
  ssHint: $("ssHint"),
  resultsContainer: $("resultsContainer"),
  copyAllBtn: $("copyAllBtn"),
  downloadAllBtn: $("downloadAllBtn"),
  againBtn: $("againBtn"),
  settingsCard: document.querySelector(".settings-card"),
  settingsToggle: $("settingsToggle"),
  keyStatus: $("keyStatus"),
  apiKey: $("apiKey"),
  modelInput: $("modelInput"),
  saveKeyBtn: $("saveKeyBtn"),
};

let imageDataUrl = null;
let SKILLS = [];
const selectedIds = new Set(["chot-don"]);
let lastResults = []; // [{skill, markdown}]

// ---------- API key ----------
const KEY_STORE = "umi_apiKey";
const MODEL_STORE = "umi_model";
function loadKey() {
  els.apiKey.value = localStorage.getItem(KEY_STORE) || "";
  els.modelInput.value = localStorage.getItem(MODEL_STORE) || "";
  updateKeyStatus();
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
  flash(els.saveKeyBtn, "✓");
});
els.apiKey.addEventListener("input", updateKeyStatus);
loadKey();

// ---------- Skill picker (multi-select) ----------
const STAGE_ORDER = ["Chốt đơn ⭐", "Nền tảng", "Lập kế hoạch", "Sản xuất", "Brief visual", "Đo lường"];

async function loadSkills() {
  try {
    const resp = await fetch("/api/skills");
    const data = await resp.json();
    SKILLS = data.skills || [];
    renderSkillPicker();
    syncSelection();
  } catch {
    els.skillGroups.innerHTML = `<p class="hint" style="text-align:left">Không tải được danh sách skill. Tải lại trang.</p>`;
  }
}

function renderSkillPicker() {
  const groups = {};
  SKILLS.forEach((s) => (groups[s.stage] = groups[s.stage] || []).push(s));
  const stages = Object.keys(groups).sort(
    (a, b) => (STAGE_ORDER.indexOf(a) + 1 || 99) - (STAGE_ORDER.indexOf(b) + 1 || 99)
  );
  els.skillGroups.innerHTML = stages
    .map(
      (stage) => `
    <div class="skill-group">
      <div class="skill-group-row">
        <div class="skill-group-title">${esc(stage)}</div>
        <button class="group-toggle" type="button" data-stage="${esc(stage)}">Chọn cả nhóm</button>
      </div>
      <div class="skill-chips">
        ${groups[stage]
          .map(
            (s) => `<button class="skill-chip" type="button" data-id="${esc(s.id)}" title="${esc(s.hint || "")}">
              <span class="sc-check">✓</span><span class="sc-icon">${esc(s.icon || "📄")}</span><span>${esc(s.name)}</span>
            </button>`
          )
          .join("")}
      </div>
    </div>`
    )
    .join("");

  els.skillGroups.querySelectorAll(".skill-chip").forEach((btn) => {
    btn.addEventListener("click", () => toggleSkill(btn.dataset.id));
  });
  els.skillGroups.querySelectorAll(".group-toggle").forEach((btn) => {
    btn.addEventListener("click", () => toggleGroup(btn.dataset.stage));
  });
}

function toggleSkill(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  syncSelection();
}
function toggleGroup(stage) {
  const ids = SKILLS.filter((s) => s.stage === stage).map((s) => s.id);
  const allOn = ids.every((id) => selectedIds.has(id));
  ids.forEach((id) => (allOn ? selectedIds.delete(id) : selectedIds.add(id)));
  syncSelection();
}

function syncSelection() {
  els.skillGroups.querySelectorAll(".skill-chip").forEach((b) => {
    b.classList.toggle("selected", selectedIds.has(b.dataset.id));
  });
  els.skillGroups.querySelectorAll(".group-toggle").forEach((btn) => {
    const ids = SKILLS.filter((s) => s.stage === btn.dataset.stage).map((s) => s.id);
    const allOn = ids.length && ids.every((id) => selectedIds.has(id));
    btn.textContent = allOn ? "Bỏ chọn nhóm" : "Chọn cả nhóm";
    btn.classList.toggle("on", allOn);
  });
  const chosen = SKILLS.filter((s) => selectedIds.has(s.id));
  const n = chosen.length;
  els.selectedSkill.hidden = false;
  els.ssName.textContent = `Đã chọn ${n} skill`;
  els.ssHint.textContent = n
    ? chosen.map((s) => `${s.icon} ${s.name}`).join("  ·  ")
    : "Tích ít nhất 1 skill ở bước 1.";
  els.generateBtn.querySelector(".btn-text").textContent = n > 1 ? `✨ Chạy ${n} skill` : "✨ Chạy skill";
}

loadSkills();

// ---------- Example chips ----------
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    els.productInfo.value = chip.dataset.ex;
    els.productInfo.focus();
  });
});

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

// ---------- Generate (tuần tự nhiều skill) ----------
els.generateBtn.addEventListener("click", generate);
els.againBtn.addEventListener("click", generate);

async function generate() {
  const productInfo = els.productInfo.value.trim();
  const ids = SKILLS.filter((s) => selectedIds.has(s.id)).map((s) => s.id);
  if (!ids.length) {
    showError("Hãy tích ít nhất 1 skill ở bước 1.");
    return;
  }
  if (!productInfo && !imageDataUrl) {
    showError("Hãy nhập thông tin hoặc thả một ảnh.");
    return;
  }
  const apiKey = els.apiKey.value.trim();
  const model = els.modelInput.value.trim();
  if (!apiKey) {
    showError("Chưa có API key. Mở '⚙️ Cấu hình API', dán key Groq miễn phí rồi Lưu.");
    els.settingsCard.classList.add("open");
    els.settingsCard.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  hideError();
  setLoading(true);
  lastResults = [];
  els.resultsContainer.innerHTML = "";
  els.output.hidden = false;
  els.output.scrollIntoView({ behavior: "smooth", block: "start" });

  for (let i = 0; i < ids.length; i++) {
    const skill = SKILLS.find((s) => s.id === ids[i]);
    setProgress(`(${i + 1}/${ids.length}) Đang chạy: ${skill.icon} ${skill.name}…`);
    const card = appendPendingCard(skill);
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: skill.id, productInfo, imageDataUrl, apiKey, model }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `Lỗi ${resp.status}`);
      const md = data.type === "plan" ? planToMarkdown(data.plan) : data.markdown || "";
      lastResults.push({ skill, markdown: md });
      fillCard(card, skill, md);
    } catch (err) {
      fillCardError(card, skill, err.message || "Lỗi không xác định.");
    }
  }
  setLoading(false);
}

function setLoading(on) {
  els.generateBtn.disabled = on;
  els.againBtn.disabled = on;
  els.generateBtn.querySelector(".btn-text").hidden = on;
  els.generateBtn.querySelector(".spinner").hidden = !on;
  els.loadingState.hidden = !on;
}
function setProgress(text) {
  els.loadingCycle.textContent = text;
}
function showError(msg) {
  els.errorBox.textContent = "⚠ " + msg;
  els.errorBox.hidden = false;
}
function hideError() {
  els.errorBox.hidden = true;
}

// ---------- Result cards ----------
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function appendPendingCard(skill) {
  const card = document.createElement("div");
  card.className = "card md-card pending";
  card.innerHTML = `
    <div class="md-head">
      <span>${esc(skill.icon || "📄")}</span>
      <h3>${esc(skill.name)}</h3>
      <span class="card-status">⏳ đang chạy…</span>
    </div>
    <div class="markdown-body"><div class="card-skeleton"></div></div>`;
  els.resultsContainer.appendChild(card);
  return card;
}

function fillCard(card, skill, markdown) {
  card.classList.remove("pending");
  const html = window.marked ? window.marked.parse(markdown) : `<pre>${esc(markdown)}</pre>`;
  card.innerHTML = `
    <div class="md-head">
      <span>${esc(skill.icon || "📄")}</span>
      <h3>${esc(skill.name)}</h3>
      <div class="card-actions">
        <button class="mini" data-act="copy">📋 Copy</button>
        <button class="mini" data-act="dl">⬇️</button>
      </div>
    </div>
    <div class="markdown-body">${html}</div>`;
  card.querySelector('[data-act="copy"]').addEventListener("click", (e) => {
    navigator.clipboard.writeText(markdown);
    flash(e.target, "✓ Đã copy");
  });
  card.querySelector('[data-act="dl"]').addEventListener("click", () => downloadMd(markdown, skill.id + ".md"));
}

function fillCardError(card, skill, msg) {
  card.classList.remove("pending");
  card.innerHTML = `
    <div class="md-head">
      <span>${esc(skill.icon || "📄")}</span>
      <h3>${esc(skill.name)}</h3>
      <span class="card-status err">✕ lỗi</span>
    </div>
    <div class="error-box" style="margin:0">⚠ ${esc(msg)}</div>`;
}

// ---------- Export ----------
function downloadMd(md, name) {
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function allMarkdown() {
  return lastResults.map((r) => `# ${r.skill.icon} ${r.skill.name}\n\n${r.markdown}`).join("\n\n---\n\n");
}
els.copyAllBtn.addEventListener("click", () => {
  if (!lastResults.length) return;
  navigator.clipboard.writeText(allMarkdown());
  flash(els.copyAllBtn, "✓ Đã copy tất cả");
});
els.downloadAllBtn.addEventListener("click", () => {
  if (!lastResults.length) return;
  downloadMd(allMarkdown(), "umi-content.md");
});

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1400);
}

// ---------- Plan -> Markdown ----------
function planToMarkdown(p) {
  let md = `${p.product_summary || ""}\n\n`;
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
  md += `\n## 📝 Kịch bản content\n\n`;
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
    if (ib.concept || ib.image_prompt) {
      md += `\n**Image brief:** ${ib.concept || ""}\n`;
      if (ib.image_prompt) md += `- Prompt (EN): \`${ib.image_prompt}\`\n`;
    }
    md += `\n---\n\n`;
  });
  return md;
}
