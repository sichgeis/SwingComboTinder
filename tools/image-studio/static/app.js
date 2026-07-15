const NEW_CANDIDATES_STORAGE_KEY = "dance-card-image-studio:new-candidates";

const readNewCandidates = () => {
  try {
    const entries = Object.entries(JSON.parse(sessionStorage.getItem(NEW_CANDIDATES_STORAGE_KEY) || "{}"));
    return new Map(entries.filter(([, count]) => Number.isInteger(count) && count > 0));
  } catch {
    return new Map();
  }
};

const state = {
  figures: [],
  selected: new Set(),
  jobs: new Map(),
  newCandidates: readNewCandidates(),
  runActive: false,
  workspace: "content",
  activeContentId: null,
  content: null,
  originalContent: "",
  contentRevision: "",
  contentIssues: [],
  previewLanguage: "de",
  previewFace: "front",
  previewMarkup: "",
  previewRequest: 0,
  previewTimer: null,
  openSections: new Set(["Basics"])
};

const persistNewCandidates = () => {
  try {
    sessionStorage.setItem(
      NEW_CANDIDATES_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(state.newCandidates))
    );
  } catch {
    // The in-memory marker set still works when browser storage is unavailable.
  }
};

const clearNewCandidates = () => {
  state.newCandidates.clear();
  persistNewCandidates();
};

const grid = document.querySelector("#figure-grid");
const summary = document.querySelector("#summary");
const runStatus = document.querySelector("#run-status");
const connection = document.querySelector("#connection");
const form = document.querySelector("#run-form");
const runButton = document.querySelector("#run-button");
const promptDialog = document.querySelector("#prompt-dialog");
const promptContent = document.querySelector("#prompt-content");
const imageDialog = document.querySelector("#image-dialog");
const imageDialogTitle = document.querySelector("#image-dialog-title");
const imageDialogMeta = document.querySelector("#image-dialog-meta");
const imageDialogContent = document.querySelector("#image-dialog-content");
const imageDialogClose = document.querySelector("#image-dialog-close");
const contentWorkspace = document.querySelector("#content-workspace");
const imageWorkspace = document.querySelector("#image-workspace");
const contentSearch = document.querySelector("#content-search");
const contentStyle = document.querySelector("#content-style");
const contentList = document.querySelector("#content-list");
const contentCount = document.querySelector("#content-count");
const contentEmpty = document.querySelector("#content-empty");
const contentForm = document.querySelector("#content-form");
const contentIdentity = document.querySelector("#content-identity");
const contentTitle = document.querySelector("#content-title");
const contentDirty = document.querySelector("#content-dirty");
const contentSave = document.querySelector("#content-save");
const contentMessage = document.querySelector("#content-message");
const contentFields = document.querySelector("#content-fields");
const previewPanel = document.querySelector("#preview-panel");
const previewPaneButton = document.querySelector("#preview-pane-button");
const previewStatus = document.querySelector("#preview-status");
const cardPreview = document.querySelector("#card-preview");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const request = async (url, options) => {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    error.issues = payload.issues || [];
    throw error;
  }
  return payload;
};

const contentIsDirty = () => Boolean(state.content) && JSON.stringify(state.content) !== state.originalContent;

const contentField = (label, path, value, options = {}) => {
  const tag = options.textarea ? "textarea" : "input";
  const attributes = [
    `data-content-path="${escapeHtml(path)}"`,
    options.readonly ? "readonly" : "",
    options.required === false ? "" : "required",
    options.type ? `type="${escapeHtml(options.type)}"` : "",
    options.valueType ? `data-value-type="${escapeHtml(options.valueType)}"` : ""
  ].filter(Boolean).join(" ");
  const control = tag === "textarea"
    ? `<textarea ${attributes} rows="${options.rows || 4}">${escapeHtml(value ?? "")}</textarea>`
    : `<input ${attributes} value="${escapeHtml(value ?? "")}">`;
  return `<label class="content-field ${options.full ? "full" : ""}" data-field-path="${escapeHtml(path)}"><span>${escapeHtml(label)}</span>${control}<small class="field-error"></small></label>`;
};

const selectField = (label, path, value, choices, options = {}) => `<label class="content-field ${options.full ? "full" : ""}" data-field-path="${escapeHtml(path)}"><span>${escapeHtml(label)}</span><select data-content-path="${escapeHtml(path)}">${choices.map(({ value: optionValue, label: optionLabel }) => `<option value="${escapeHtml(optionValue)}" ${value === optionValue ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select><small class="field-error"></small></label>`;

const section = (title, body) => `<details class="content-section" ${state.openSections.has(title) ? "open" : ""}><summary>${escapeHtml(title)}</summary><div class="content-section-body">${body}</div></details>`;

const resourceActions = (collection, index, length) => `<div class="resource-actions">
  <button type="button" data-content-action="move-resource" data-collection="${collection}" data-index="${index}" data-direction="-1" ${index === 0 ? "disabled" : ""}>↑ Up</button>
  <button type="button" data-content-action="move-resource" data-collection="${collection}" data-index="${index}" data-direction="1" ${index === length - 1 ? "disabled" : ""}>↓ Down</button>
  <button type="button" data-content-action="remove-resource" data-collection="${collection}" data-index="${index}">Remove</button>
</div>`;

const teachingSourcesEditor = () => {
  const sources = state.content.teachingSources;
  return `<div class="resource-section">
    <div class="resource-heading"><h3>Teaching-source YouTube videos</h3><button type="button" data-content-action="add-teaching-source">Add source</button></div>
    ${sources.length === 0 ? '<p class="resource-empty">No teaching sources.</p>' : sources.map((source, index) => `<div class="resource-row">
      ${contentField("YouTube video ID", `teachingSources.${index}.videoId`, source.videoId)}
      ${contentField("Title", `teachingSources.${index}.title`, source.title, { required: false })}
      ${contentField("Channel", `teachingSources.${index}.channel`, source.channel, { required: false })}
      ${contentField("Timestamp seconds", `teachingSources.${index}.timestampSeconds`, source.timestampSeconds, { required: false, type: "number", valueType: "optional-number" })}
      ${contentField("Teaching frame", `teachingSources.${index}.frame`, source.frame, { required: false })}
      ${contentField("Editorial notes", `teachingSources.${index}.notes`, source.notes, { required: false, textarea: true, full: true, rows: 3 })}
      ${resourceActions("teachingSources", index, sources.length)}
    </div>`).join("")}
  </div>`;
};

const cardResourcesEditor = () => {
  const resources = state.content.cardResources;
  const videoKinds = ["tutorial", "technique", "variation", "history"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
  const webKinds = [{ value: "article", label: "Article" }, { value: "reference", label: "Reference" }];
  return `<div class="resource-section">
    <div class="resource-heading"><h3>App-visible resources</h3><div><button type="button" data-content-action="add-youtube-resource">Add YouTube</button> <button type="button" data-content-action="add-web-resource">Add web link</button></div></div>
    ${resources.length === 0 ? '<p class="resource-empty">No app-visible resources. This is valid.</p>' : resources.map((resource, index) => `<div class="resource-row">
      ${selectField("Resource type", `cardResources.${index}.type`, resource.type, [{ value: "youtube", label: "YouTube" }, { value: "web", label: "Web resource" }])}
      ${resource.type === "youtube"
        ? `${contentField("YouTube video ID", `cardResources.${index}.videoId`, resource.videoId)}${contentField("Title", `cardResources.${index}.title`, resource.title)}${selectField("Category", `cardResources.${index}.kind`, resource.kind, videoKinds)}`
        : `${contentField("URL", `cardResources.${index}.url`, resource.url, { type: "url" })}${contentField("Title", `cardResources.${index}.title`, resource.title)}${selectField("Category", `cardResources.${index}.kind`, resource.kind, webKinds)}${selectField("Language", `cardResources.${index}.language`, resource.language || "", [{ value: "", label: "All languages" }, { value: "de", label: "German" }, { value: "en", label: "English" }])}`}
      ${resourceActions("cardResources", index, resources.length)}
    </div>`).join("")}
  </div>`;
};

const renderContentFields = () => {
  if (!state.content) return;
  const { identity, basics, guides } = state.content;
  const basicsFields = [
    contentField("Stable ID", "identity.id", identity.id, { readonly: true }),
    contentField("Dance style", "identity.style", identity.style, { readonly: true }),
    contentField("Directory slug", "identity.slug", identity.slug, { readonly: true }),
    contentField("Global order", "identity.order", identity.order, { readonly: true, type: "number" }),
    contentField("Canonical name", "basics.name", basics.name),
    contentField("Alias", "basics.alias", basics.alias),
    contentField("Family", "basics.family", basics.family),
    contentField("Count", "basics.count", basics.count),
    contentField("Motion", "basics.motion", basics.motion),
    contentField("Ending position", "basics.end", basics.end),
    contentField("Familiarity", "basics.familiarity", basics.familiarity),
    contentField("Flow suggestions", "basics.flows", basics.flows, { full: true })
  ].join("");
  const englishFields = ["description", "steps", "body", "lead", "connection", "cue"]
    .map((key) => contentField(key[0].toUpperCase() + key.slice(1), `guides.en.${key}`, guides.en[key], { textarea: true, full: true }))
    .join("");
  const germanFields = ["description", "steps", "body", "lead", "follow", "connection", "cue", "practice"]
    .map((key) => contentField(key[0].toUpperCase() + key.slice(1), `guides.de.${key}`, guides.de[key], { textarea: true, full: true }))
    .join("");
  const headingFields = ["steps", "body", "lead", "follow", "connection", "practice"]
    .map((key) => contentField(`${key[0].toUpperCase() + key.slice(1)} heading`, `guides.de.headings.${key}`, guides.de.headings[key]))
    .join("");
  contentFields.innerHTML = [
    section("Basics", basicsFields),
    section("English", englishFields),
    section("German", `${germanFields}<div class="resource-section"><div class="resource-heading"><h3>Custom section headings</h3></div><div class="resource-row">${headingFields}</div></div>`),
    section("Resources", `${teachingSourcesEditor()}${cardResourcesEditor()}`)
  ].join("");
  applyContentIssues(state.contentIssues);
};

const rememberOpenSections = () => {
  state.openSections = new Set([...contentFields.querySelectorAll("details.content-section[open] summary")].map((summary) => summary.textContent));
};

const applyContentIssues = (issues = []) => {
  state.contentIssues = issues;
  contentFields.querySelectorAll(".content-field").forEach((field) => {
    field.classList.remove("has-error");
    field.querySelector(".field-error").textContent = "";
  });
  for (const issue of issues) {
    const field = [...contentFields.querySelectorAll("[data-field-path]")].find((candidate) => candidate.dataset.fieldPath === issue.path);
    if (!field) continue;
    field.classList.add("has-error");
    field.querySelector(".field-error").textContent = issue.message;
  }
};

const updateContentHeader = () => {
  if (!state.content) return;
  const dirty = contentIsDirty();
  contentTitle.textContent = state.content.basics.name || "Untitled figure";
  contentIdentity.textContent = `${state.content.identity.style} · ${state.content.identity.id}`;
  contentDirty.textContent = dirty ? "Unsaved changes" : "Saved source";
  contentDirty.classList.toggle("dirty", dirty);
  contentSave.disabled = !dirty;
  renderContentList();
};

const renderContentList = () => {
  const query = contentSearch.value.trim().toLowerCase();
  const style = contentStyle.value;
  const visible = state.figures.filter((figure) => {
    const haystack = `${figure.name} ${figure.alias || ""} ${figure.id}`.toLowerCase();
    return (!style || figure.style === style) && (!query || haystack.includes(query));
  });
  contentCount.textContent = String(visible.length);
  contentList.innerHTML = visible.map((figure) => {
    const dirty = figure.id === state.activeContentId && contentIsDirty();
    return `<button type="button" class="content-list-item ${figure.id === state.activeContentId ? "active" : ""}" data-content-id="${escapeHtml(figure.id)}">
      <span class="content-list-title"><strong>${escapeHtml(figure.name)}</strong><span>${escapeHtml(figure.style)}</span></span>
      <span class="content-list-meta"><span class="${figure.contentValid ? "valid" : "invalid"}">${figure.contentValid ? "valid" : "invalid"}</span><span>DE ${figure.germanComplete ? "✓" : "—"}</span><span>${figure.resourceCount} resource${figure.resourceCount === 1 ? "" : "s"}</span><span>${figure.currentIsFallback ? "fallback art" : "master art"}</span>${dirty ? '<span class="invalid">unsaved</span>' : ""}</span>
    </button>`;
  }).join("") || '<p class="resource-empty">No figures match these filters.</p>';
};

const setPathValue = (root, path, value) => {
  const parts = path.split(".");
  const key = parts.pop();
  let target = root;
  for (const part of parts) target = target[Number.isInteger(Number(part)) ? Number(part) : part];
  const optionalBlank = value === "" && (/^teachingSources\.\d+\.(title|channel|frame|notes)$/.test(path) || /^cardResources\.\d+\.language$/.test(path));
  if (value === undefined || optionalBlank) delete target[key];
  else target[key] = value;
};

const previewDocument = () => {
  if (!state.previewMarkup) return;
  const flipped = state.previewFace === "back" ? "is-flipped" : "";
  cardPreview.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app-card.css"><style>html,body{width:100%;height:100%;overflow:hidden}.studio-preview-card{position:relative;inset:auto;width:100%;height:100%;border-radius:22px}.studio-preview-card .card-content{padding:20px}.studio-preview-card h2{font-size:42px}</style></head><body><article class="move-card studio-preview-card ${flipped}">${state.previewMarkup}</article></body></html>`;
};

const updatePreviewControls = () => {
  document.querySelectorAll("[data-preview-language]").forEach((button) => button.classList.toggle("active", button.dataset.previewLanguage === state.previewLanguage));
  document.querySelectorAll("[data-preview-face]").forEach((button) => button.classList.toggle("active", button.dataset.previewFace === state.previewFace));
};

const requestPreview = async () => {
  if (!state.content || !state.activeContentId) return;
  const requestNumber = ++state.previewRequest;
  previewStatus.textContent = "Updating…";
  try {
    const result = await request("/api/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: state.activeContentId, language: state.previewLanguage, content: state.content })
    });
    if (requestNumber !== state.previewRequest) return;
    state.previewMarkup = result.markup;
    applyContentIssues([]);
    previewStatus.textContent = "Live";
    previewDocument();
  } catch (error) {
    if (requestNumber !== state.previewRequest) return;
    applyContentIssues(error.issues || []);
    previewStatus.textContent = error.issues?.length ? `${error.issues.length} issue${error.issues.length === 1 ? "" : "s"}` : "Preview unavailable";
  }
};

const schedulePreview = () => {
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(requestPreview, 180);
};

const loadFigureContent = async (id) => {
  if (id === state.activeContentId) return;
  if (contentIsDirty() && !confirm("Discard unsaved changes and open another figure?")) return;
  contentMessage.className = "content-message";
  contentMessage.textContent = "Loading figure…";
  try {
    const loaded = await request(`/api/figure-content?id=${encodeURIComponent(id)}`);
    state.activeContentId = id;
    state.content = loaded.content;
    state.originalContent = JSON.stringify(loaded.content);
    state.contentRevision = loaded.revision;
    state.contentIssues = [];
    state.openSections = new Set(["Basics"]);
    state.previewMarkup = "";
    contentEmpty.hidden = true;
    contentForm.hidden = false;
    previewPanel.hidden = false;
    previewPaneButton.disabled = false;
    contentMessage.textContent = "";
    renderContentFields();
    updateContentHeader();
    await requestPreview();
  } catch (error) {
    contentMessage.className = "content-message error";
    contentMessage.textContent = error.message;
  }
};

const showWorkspace = (workspace) => {
  if (workspace === state.workspace) return;
  if (workspace !== "content" && contentIsDirty() && !confirm("Leave Content with unsaved changes?")) return;
  state.workspace = workspace;
  contentWorkspace.hidden = workspace !== "content";
  imageWorkspace.hidden = workspace !== "images";
  document.querySelectorAll("[data-workspace]").forEach((button) => {
    const active = button.dataset.workspace === workspace;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

const imageCell = (label, url, emptyText, figureName) => `
  <div class="image-cell">
    <h3>${label}</h3>
    ${url ? `<button class="image-zoom" type="button" data-image-url="${escapeHtml(url)}" data-image-label="${escapeHtml(`${figureName} · ${label}`)}" aria-label="Magnify ${escapeHtml(label)} for ${escapeHtml(figureName)}"><img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" loading="lazy"></button>` : `<div class="empty-image">${escapeHtml(emptyText)}</div>`}
  </div>`;

const formatCandidateDate = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
}).format(new Date(value));

const candidateGallery = (figure) => {
  if (!figure.candidates.length) return "";
  return `<details class="candidate-gallery">
    <summary>All candidates <span class="candidate-count">${figure.candidates.length}</span></summary>
    <div class="candidate-grid">
      ${figure.candidates.map((candidate, index) => `
        <article class="candidate-item">
          <button class="image-zoom candidate-preview" type="button" data-image-url="${escapeHtml(candidate.url)}" data-image-label="${escapeHtml(`${figure.name} · Candidate ${index + 1}`)}" aria-label="Magnify candidate ${index + 1} for ${escapeHtml(figure.name)}">
            <img src="${escapeHtml(candidate.url)}" alt="Candidate ${index + 1}" loading="lazy">
          </button>
          <div class="candidate-info">
            <div>
              <strong>Candidate ${index + 1}</strong>
              <span>${escapeHtml(formatCandidateDate(candidate.createdAt))}</span>
            </div>
            <button type="button" class="secondary" data-action="promote-candidate" data-candidate-index="${index}">Promote</button>
          </div>
        </article>`).join("")}
    </div>
  </details>`;
};

const openImageDialog = (url, label) => {
  imageDialogTitle.textContent = label;
  imageDialogMeta.textContent = "Loading original image…";
  imageDialogContent.alt = label;
  imageDialogContent.src = url;
  imageDialog.showModal();
};

imageDialogContent.addEventListener("load", () => {
  imageDialogMeta.textContent = `${imageDialogContent.naturalWidth} × ${imageDialogContent.naturalHeight} px · shown at original size`;
});
imageDialogContent.addEventListener("error", () => {
  imageDialogMeta.textContent = "The original image could not be loaded.";
});

imageDialogClose.addEventListener("click", () => imageDialog.close());
imageDialog.addEventListener("click", (event) => {
  if (event.target === imageDialog) imageDialog.close();
});
imageDialog.addEventListener("close", () => {
  imageDialogContent.removeAttribute("src");
  imageDialogContent.alt = "";
});

const tagsFor = (figure, job, newCandidateCount) => {
  const tags = [];
  if (newCandidateCount) tags.push(`<span class="tag new">${newCandidateCount} new</span>`);
  tags.push(`<span class="tag">${escapeHtml(figure.style)}</span>`);
  tags.push(figure.hasPose ? '<span class="tag good">pose ready</span>' : '<span class="tag bad">no pose</span>');
  if (!figure.hasCurrent) tags.push('<span class="tag warn">missing master</span>');
  if (figure.marked) tags.push('<span class="tag warn">rework</span>');
  if (figure.imageApproved) tags.push('<span class="tag approved">image approved</span>');
  if (figure.candidates.length) tags.push(`<span class="tag good">${figure.candidates.length} candidate${figure.candidates.length === 1 ? "" : "s"}</span>`);
  if (job) tags.push(`<span class="tag ${job.state === "failed" ? "bad" : "warn"}">${escapeHtml(job.state)}</span>`);
  return tags.join("");
};

const render = () => {
  const style = form.elements.style.value;
  const visible = style ? state.figures.filter((figure) => figure.style === style) : state.figures;
  const missing = state.figures.filter((figure) => !figure.hasCurrent).length;
  const marked = state.figures.filter((figure) => figure.marked).length;
  const approved = state.figures.filter((figure) => figure.imageApproved).length;
  const blocked = state.figures.filter((figure) => !figure.hasPose).length;
  summary.textContent = `${state.figures.length} figures · ${state.newCandidates.size} new from latest run · ${approved} approved · ${missing} missing masters · ${marked} marked · ${blocked} missing pose references · ${state.selected.size} selected`;
  runButton.disabled = state.runActive;

  grid.innerHTML = visible.map((figure) => {
    const latest = figure.candidates[0];
    const job = state.jobs.get(figure.id);
    const newCandidateCount = state.newCandidates.get(figure.id) || 0;
    const classes = ["figure-card", figure.imageApproved ? "approved" : "", newCandidateCount ? "has-new-candidates" : "", job?.state === "running" ? "running" : "", job?.state === "failed" ? "failed" : ""].filter(Boolean).join(" ");
    const cardBody = figure.imageApproved ? `
      <div class="approved-summary">
        <span>This move has an image you approved.</span>
        <button type="button" class="secondary" data-action="image-approval">Reopen</button>
      </div>` : `
      <div class="comparison">
        ${imageCell("Teaching pose", figure.poseUrl, "Add teaching-frames/selected.png", figure.name)}
        ${imageCell(figure.currentIsFallback ? "Fallback card" : "Current master", figure.currentUrl, "No current artwork", figure.name)}
        ${imageCell("Latest candidate", latest?.url, "Generate a candidate", figure.name)}
      </div>
      ${candidateGallery(figure)}
      <details class="generation-note" ${figure.generationNote ? "open" : ""}>
        <summary>Generation note${figure.generationNote ? '<span class="note-saved">saved</span>' : ""}</summary>
        <div class="generation-note-editor">
          <label>
            <span>Small pose correction appended to this figure's prompt</span>
            <textarea data-generation-note maxlength="500" rows="3" placeholder="Example: The dancer on the left raises the right leg, while the dancer on the right raises the left leg.">${escapeHtml(figure.generationNote || "")}</textarea>
          </label>
          <div class="generation-note-footer">
            <span class="generation-note-count">${(figure.generationNote || "").length}/500</span>
            <button type="button" class="secondary" data-action="save-note">Save note</button>
          </div>
        </div>
      </details>
      <div class="card-actions">
        <button type="button" data-action="generate" ${figure.hasPose && !state.runActive ? "" : "disabled"}>Generate</button>
        <button type="button" class="secondary" data-action="prompt" ${figure.hasPose ? "" : "disabled"}>Prompt</button>
        <button type="button" class="secondary" data-action="promote" ${latest ? "" : "disabled"}>Promote latest</button>
        <button type="button" class="secondary ${figure.marked ? "danger" : ""}" data-action="mark">${figure.marked ? "Clear rework" : "Mark rework"}</button>
        <button type="button" class="secondary approve-action" data-action="image-approval">Approve image</button>
      </div>
      <p class="job-message">${escapeHtml(job?.message || "")}</p>`;
    return `<article class="${classes}" data-id="${escapeHtml(figure.id)}">
      <header class="card-header">
        <label class="select-title">
          <input class="figure-select" type="checkbox" ${state.selected.has(figure.id) ? "checked" : ""}>
          <span><h2>${escapeHtml(figure.name)}</h2><span class="figure-id">${escapeHtml(figure.id)}</span></span>
        </label>
        <div class="tags">${tagsFor(figure, job, newCandidateCount)}</div>
      </header>
      ${cardBody}
    </article>`;
  }).join("");
};

const loadFigures = async () => {
  state.figures = await request("/api/figures");
  render();
  renderContentList();
};

const startRun = async (override) => {
  const data = new FormData(form);
  const mode = override?.mode || data.get("mode");
  const ids = override?.ids || (mode === "selected" ? [...state.selected] : []);
  if (mode === "selected" && ids.length === 0) throw new Error("Select at least one figure.");
  state.jobs.clear();
  clearNewCandidates();
  state.runActive = true;
  runStatus.className = "";
  runStatus.textContent = "Submitting generation run…";
  render();
  try {
    await request("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode,
        style: override ? "" : data.get("style"),
        ids,
        quality: data.get("quality"),
        count: Number(data.get("count")),
        concurrency: Number(data.get("concurrency"))
      })
    });
  } catch (error) {
    state.runActive = false;
    throw error;
  } finally {
    render();
  }
};

document.querySelectorAll("[data-workspace]").forEach((button) => {
  button.addEventListener("click", () => showWorkspace(button.dataset.workspace));
});

contentSearch.addEventListener("input", renderContentList);
contentStyle.addEventListener("change", renderContentList);
contentList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-content-id]");
  if (button) void loadFigureContent(button.dataset.contentId);
});

const updateContentControl = (control) => {
  if (!state.content || !control.dataset.contentPath || control.readOnly) return;
  const path = control.dataset.contentPath;
  const typeMatch = /^cardResources\.(\d+)\.type$/.exec(path);
  if (typeMatch) {
    rememberOpenSections();
    const index = Number(typeMatch[1]);
    state.content.cardResources[index] = control.value === "youtube"
      ? { type: "youtube", videoId: "", title: "", kind: "tutorial" }
      : { type: "web", url: "", title: "", kind: "article" };
    renderContentFields();
  } else {
    const value = control.dataset.valueType === "optional-number"
      ? control.value === "" ? undefined : Number(control.value)
      : control.value;
    setPathValue(state.content, path, value);
  }
  contentMessage.textContent = "";
  updateContentHeader();
  schedulePreview();
};

contentForm.addEventListener("input", (event) => {
  const control = event.target.closest("[data-content-path]");
  if (control && control.tagName !== "SELECT") updateContentControl(control);
});
contentForm.addEventListener("change", (event) => {
  const control = event.target.closest("select[data-content-path]");
  if (control) updateContentControl(control);
});

contentFields.addEventListener("toggle", (event) => {
  const details = event.target.closest("details.content-section");
  if (!details) return;
  const title = details.querySelector("summary")?.textContent;
  if (!title) return;
  details.open ? state.openSections.add(title) : state.openSections.delete(title);
}, true);

contentFields.addEventListener("click", (event) => {
  const button = event.target.closest("[data-content-action]");
  if (!button || !state.content) return;
  rememberOpenSections();
  const action = button.dataset.contentAction;
  if (action === "add-teaching-source") {
    state.content.teachingSources.push({ videoId: "" });
  } else if (action === "add-youtube-resource") {
    state.content.cardResources.push({ type: "youtube", videoId: "", title: "", kind: "tutorial" });
  } else if (action === "add-web-resource") {
    state.content.cardResources.push({ type: "web", url: "", title: "", kind: "article" });
  } else if (action === "remove-resource") {
    state.content[button.dataset.collection].splice(Number(button.dataset.index), 1);
  } else if (action === "move-resource") {
    const collection = state.content[button.dataset.collection];
    const index = Number(button.dataset.index);
    const destination = index + Number(button.dataset.direction);
    if (destination >= 0 && destination < collection.length) {
      const [entry] = collection.splice(index, 1);
      collection.splice(destination, 0, entry);
    }
  }
  renderContentFields();
  updateContentHeader();
  schedulePreview();
});

contentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.content || !state.activeContentId || !contentIsDirty()) return;
  contentSave.disabled = true;
  contentMessage.className = "content-message";
  contentMessage.textContent = "Validating and saving…";
  try {
    const saved = await request("/api/figure-content", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: state.activeContentId, revision: state.contentRevision, content: state.content })
    });
    state.content = saved.content;
    state.contentRevision = saved.revision;
    state.originalContent = JSON.stringify(saved.content);
    state.contentIssues = [];
    contentMessage.className = "content-message success";
    contentMessage.textContent = "Figure saved atomically.";
    renderContentFields();
    updateContentHeader();
    await loadFigures();
    await requestPreview();
  } catch (error) {
    contentMessage.className = "content-message error";
    contentMessage.textContent = error.status === 409 ? `${error.message} Your draft is still here.` : error.message;
    applyContentIssues(error.issues || []);
    updateContentHeader();
  }
});

document.querySelectorAll("[data-preview-language]").forEach((button) => {
  button.addEventListener("click", () => {
    state.previewLanguage = button.dataset.previewLanguage;
    updatePreviewControls();
    void requestPreview();
  });
});
document.querySelectorAll("[data-preview-face]").forEach((button) => {
  button.addEventListener("click", () => {
    state.previewFace = button.dataset.previewFace;
    updatePreviewControls();
    previewDocument();
  });
});

document.querySelectorAll("[data-content-pane]").forEach((button) => {
  button.addEventListener("click", () => {
    const preview = button.dataset.contentPane === "preview";
    contentWorkspace.classList.toggle("mobile-preview", preview);
    document.querySelectorAll("[data-content-pane]").forEach((paneButton) => {
      const active = paneButton === button;
      paneButton.classList.toggle("active", active);
      paneButton.setAttribute("aria-pressed", String(active));
    });
  });
});

window.addEventListener("beforeunload", (event) => {
  if (!contentIsDirty()) return;
  event.preventDefault();
  event.returnValue = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await startRun(); }
  catch (error) { runStatus.className = "error"; runStatus.textContent = error.message; }
});

form.elements.style.addEventListener("change", render);

grid.addEventListener("change", (event) => {
  const checkbox = event.target.closest(".figure-select");
  if (!checkbox) return;
  const id = checkbox.closest("[data-id]").dataset.id;
  checkbox.checked ? state.selected.add(id) : state.selected.delete(id);
  render();
});

grid.addEventListener("input", (event) => {
  const textarea = event.target.closest("textarea[data-generation-note]");
  if (!textarea) return;
  textarea.closest(".generation-note-editor").querySelector(".generation-note-count").textContent = `${textarea.value.length}/500`;
});

grid.addEventListener("click", async (event) => {
  const imageButton = event.target.closest("button[data-image-url]");
  if (imageButton) {
    openImageDialog(imageButton.dataset.imageUrl, imageButton.dataset.imageLabel);
    return;
  }
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.closest("[data-id]").dataset.id;
  const figure = state.figures.find((item) => item.id === id);
  try {
    button.disabled = true;
    if (button.dataset.action === "generate") {
      await startRun({ mode: "selected", ids: [id] });
    } else if (button.dataset.action === "prompt") {
      promptContent.textContent = "Loading…";
      promptDialog.showModal();
      promptContent.textContent = (await request(`/api/prompt?id=${encodeURIComponent(id)}`)).prompt;
    } else if (button.dataset.action === "promote" || button.dataset.action === "promote-candidate") {
      const candidateIndex = button.dataset.action === "promote" ? 0 : Number(button.dataset.candidateIndex);
      const candidate = figure.candidates[candidateIndex];
      if (!candidate) throw new Error("The selected candidate is no longer available.");
      if (!confirm(`Promote candidate ${candidateIndex + 1} for ${figure.name}? The current master will be archived.`)) return;
      await request("/api/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, path: candidate.path })
      });
      await loadFigures();
    } else if (button.dataset.action === "mark") {
      await request("/api/mark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, marked: !figure.marked })
      });
      await loadFigures();
    } else if (button.dataset.action === "image-approval") {
      const approved = !figure.imageApproved;
      await request("/api/image-approval", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, approved })
      });
      runStatus.className = "success";
      runStatus.textContent = approved
        ? `Approved the image for ${figure.name}.`
        : `Reopened ${figure.name} for image review.`;
      await loadFigures();
    } else if (button.dataset.action === "save-note") {
      const note = button.closest(".generation-note-editor").querySelector("textarea[data-generation-note]").value;
      await request("/api/generation-note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, note })
      });
      runStatus.className = "success";
      runStatus.textContent = `Saved generation note for ${figure.name}.`;
      await loadFigures();
    }
  } catch (error) {
    runStatus.className = "error";
    runStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

const events = new EventSource("/api/events");
events.addEventListener("open", () => { connection.textContent = "Live updates connected"; connection.className = "connection ready"; });
events.addEventListener("error", () => { connection.textContent = "Reconnecting live updates…"; connection.className = "connection warning"; });

for (const type of ["run-started", "job-started", "job-blocked", "job-completed", "job-failed", "run-completed", "run-failed", "figure-updated"]) {
  events.addEventListener(type, async (rawEvent) => {
    const update = JSON.parse(rawEvent.data);
    if (type === "run-started") {
      clearNewCandidates();
      state.runActive = true;
      runStatus.textContent = `${update.ready} jobs ready; ${update.blocked} blocked.`;
    } else if (type.startsWith("job-") && update.id) {
      const stateName = type.replace("job-", "");
      state.jobs.set(update.id, { state: stateName, message: update.message || (stateName === "completed" ? `${update.candidates} candidate(s) ready` : "") });
      if (type === "job-completed" && update.candidates > 0) {
        state.newCandidates.set(update.id, update.candidates);
        persistNewCandidates();
      }
    } else if (type === "run-completed" || type === "run-failed") {
      state.runActive = false;
      runStatus.className = type === "run-failed" ? "error" : "";
      runStatus.textContent = type === "run-failed" ? update.message : "Generation run finished.";
      await loadFigures();
    } else if (type === "figure-updated") {
      await loadFigures();
    }
    render();
  });
}

Promise.all([request("/api/config"), loadFigures()])
  .then(([config]) => {
    form.elements.quality.value = config.imageQuality;
    connection.textContent = config.proxyConfigured ? `${config.model} via LiteLLM` : "LiteLLM configuration missing";
    connection.className = `connection ${config.proxyConfigured ? "ready" : "warning"}`;
    state.runActive = config.runActive;
    render();
  })
  .catch((error) => { runStatus.className = "error"; runStatus.textContent = error.message; });
