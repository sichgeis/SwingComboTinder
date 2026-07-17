export const createContentWorkspace = ({ request, escapeHtml, getFigures, onSaved }) => {
  const LAST_FIGURE_KEY = "swing-thing-studio:last-content-figure";
  const LIBRARY_WIDTH_KEY = "swing-thing-studio:library-width";
  const DEFAULT_LIBRARY_WIDTH = 320;
  const MIN_LIBRARY_WIDTH = 240;
  const MAX_LIBRARY_WIDTH = 480;
  const contentState = {
    activeContentId: null,
    content: null,
    metadataOptions: null,
    originalContent: "",
    contentRevision: "",
    contentIssues: [],
    previewLanguage: "de",
    previewFace: "front",
    previewMarkup: "",
    previewStyles: "",
    previewRequest: 0,
    previewTimer: null,
    transcripts: [],
    openSections: new Set(["Basics"]),
    restoreAttempted: false
  };

  const contentWorkspace = document.querySelector("#content-workspace");
  const figureLibrary = document.querySelector(".figure-library");
  const libraryResizer = document.querySelector("#library-resizer");
  const contentSearch = document.querySelector("#content-search");
  const contentStyle = document.querySelector("#content-style");
  const contentStatus = document.querySelector("#content-status");
  const contentList = document.querySelector("#content-list");
  const contentCount = document.querySelector("#content-count");
  const createCardButton = document.querySelector("#create-card");
  const createCardDialog = document.querySelector("#create-card-dialog");
  const createCardForm = document.querySelector("#create-card-form");
  const createCardClose = document.querySelector("#create-card-close");
  const createCardCancel = document.querySelector("#create-card-cancel");
  const createCardMessage = document.querySelector("#create-card-message");
  const contentEmpty = document.querySelector("#content-empty");
  const contentForm = document.querySelector("#content-form");
  const contentIdentity = document.querySelector("#content-identity");
  const contentTitle = document.querySelector("#content-title");
  const contentDirty = document.querySelector("#content-dirty");
  const contentSave = document.querySelector("#content-save");
  const contentSaveNext = document.querySelector("#content-save-next");
  const contentRevert = document.querySelector("#content-revert");
  const contentMessage = document.querySelector("#content-message");
  const contentFields = document.querySelector("#content-fields");
  const previewPanel = document.querySelector("#preview-panel");
  const previewStatus = document.querySelector("#preview-status");
  const cardPreview = document.querySelector("#card-preview");
  const storedLibraryWidth = Number(localStorage.getItem(LIBRARY_WIDTH_KEY));
  let preferredLibraryWidth = Number.isFinite(storedLibraryWidth) && storedLibraryWidth > 0 ? storedLibraryWidth : DEFAULT_LIBRARY_WIDTH;
  let createSlugTouched = false;

  const availableLibraryWidth = () => Math.max(
    MIN_LIBRARY_WIDTH,
    Math.min(MAX_LIBRARY_WIDTH, Math.floor(contentWorkspace.clientWidth * .4))
  );

  const applyLibraryWidth = (width, remember = false) => {
    const maximum = availableLibraryWidth();
    const applied = Math.max(MIN_LIBRARY_WIDTH, Math.min(maximum, Math.round(width)));
    contentWorkspace.style.setProperty("--library-width", `${applied}px`);
    libraryResizer.setAttribute("aria-valuemax", String(maximum));
    libraryResizer.setAttribute("aria-valuenow", String(applied));
    if (remember) {
      preferredLibraryWidth = applied;
      localStorage.setItem(LIBRARY_WIDTH_KEY, String(applied));
    }
  };

  applyLibraryWidth(preferredLibraryWidth);

  libraryResizer.addEventListener("pointerdown", (event) => {
    if (matchMedia("(max-width: 900px)").matches) return;
    event.preventDefault();
    libraryResizer.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing-library");
  });
  libraryResizer.addEventListener("pointermove", (event) => {
    if (!libraryResizer.hasPointerCapture(event.pointerId)) return;
    applyLibraryWidth(event.clientX - figureLibrary.getBoundingClientRect().left);
  });
  const finishLibraryResize = (event) => {
    if (!libraryResizer.hasPointerCapture(event.pointerId)) return;
    libraryResizer.releasePointerCapture(event.pointerId);
    document.body.classList.remove("resizing-library");
    applyLibraryWidth(Number(libraryResizer.getAttribute("aria-valuenow")), true);
  };
  libraryResizer.addEventListener("pointerup", finishLibraryResize);
  libraryResizer.addEventListener("pointercancel", finishLibraryResize);
  libraryResizer.addEventListener("dblclick", () => {
    preferredLibraryWidth = DEFAULT_LIBRARY_WIDTH;
    localStorage.removeItem(LIBRARY_WIDTH_KEY);
    applyLibraryWidth(preferredLibraryWidth);
  });
  libraryResizer.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = Number(libraryResizer.getAttribute("aria-valuenow"));
    const next = event.key === "Home"
      ? MIN_LIBRARY_WIDTH
      : event.key === "End"
        ? availableLibraryWidth()
        : current + (event.key === "ArrowLeft" ? -16 : 16);
    applyLibraryWidth(next, true);
  });
  window.addEventListener("resize", () => applyLibraryWidth(preferredLibraryWidth));
  const previewStylesPromise = fetch("/app-card.css").then(async (response) => {
    if (!response.ok) throw new Error("The app card stylesheet could not be loaded.");
    return (await response.text()).replace(/^@import[^\n]*\n/, "");
  });

  const contentIsDirty = () => Boolean(contentState.content) && JSON.stringify(contentState.content) !== contentState.originalContent;

  const setStateLabel = (element, message, stateName = "") => {
    element.className = `${element === previewStatus ? "preview-status" : "dirty-state"} ${stateName}`.trim();
    element.replaceChildren();
    const dot = document.createElement("span");
    dot.className = "state-dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = message;
    element.append(dot, label);
  };

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
    const count = options.textarea ? `<small class="field-count">${String(value ?? "").length} characters</small>` : "";
    const hint = options.hint ? `<small class="field-hint">${escapeHtml(options.hint)}</small>` : "";
    return `<label class="content-field ${options.full ? "full" : ""}" data-field-path="${escapeHtml(path)}"><span>${escapeHtml(label)}</span>${hint}${control}<span class="field-footer"><small class="field-error"></small>${count}</span></label>`;
  };

  const selectField = (label, path, value, choices, options = {}) => `<label class="content-field ${options.full ? "full" : ""}" data-field-path="${escapeHtml(path)}"><span>${escapeHtml(label)}</span><select data-content-path="${escapeHtml(path)}">${choices.map(({ value: optionValue, label: optionLabel }) => `<option value="${escapeHtml(optionValue)}" ${value === optionValue ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select><small class="field-error"></small></label>`;

  const styleLabels = {
    lindy: "Lindy Hop",
    charleston: "Charleston",
    shag: "Collegiate Shag"
  };

  const metadataChoiceLabels = {
    six: "6 count",
    eight: "8 count",
    "six-or-eight": "6 or 8 count",
    "six-or-twelve": "6 or 12 count",
    "eight-or-sixteen": "8 or 16 count",
    musical: "As musical",
    open: "Open",
    closed: "Closed",
    "side-by-side": "Side-by-side",
    wrapped: "Wrapped",
    tandem: "Tandem"
  };

  const metadataChoices = (values) => values.map((value) => ({
    value,
    label: metadataChoiceLabels[value] || value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")
  }));

  const endingEditor = () => {
    const ending = contentState.content.basics.end;
    const kind = selectField("Ending", "basics.end.kind", ending.kind, [
      { value: "positions", label: "Specific positions" },
      { value: "any", label: "Any position" }
    ]);
    if (ending.kind === "any") return kind;
    const positions = `<div class="content-field full" data-field-path="basics.end.positions"><span>Ending positions</span><div class="ending-options">
      ${contentState.metadataOptions.endPositions.map((position) => `<label><input type="checkbox" data-ending-position value="${escapeHtml(position)}" ${ending.positions.includes(position) ? "checked" : ""}>${escapeHtml(metadataChoiceLabels[position])}</label>`).join("")}
    </div><small class="field-error"></small></div>`;
    return `${kind}${positions}`;
  };

  const publicationEditor = () => `<div class="content-field full" data-field-path="publication">
    <span>Production</span>
    <label class="publication-toggle"><input type="checkbox" data-content-path="publication" ${contentState.content.publication === "published" ? "checked" : ""}> Include in production</label>
    <small class="field-hint">Draft cards remain available throughout the Studio but do not appear in the public app.</small>
    <small class="field-error"></small>
  </div>`;

  const section = (title, body, meta = "") => `<details class="content-section" ${contentState.openSections.has(title) ? "open" : ""}><summary><span>${escapeHtml(title)}</span>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</summary><div class="content-section-body">${body}</div></details>`;

  const resourceActions = (collection, index, length) => `<div class="resource-actions">
    <button type="button" data-content-action="move-resource" data-collection="${collection}" data-index="${index}" data-direction="-1" ${index === 0 ? "disabled" : ""}>↑ Up</button>
    <button type="button" data-content-action="move-resource" data-collection="${collection}" data-index="${index}" data-direction="1" ${index === length - 1 ? "disabled" : ""}>↓ Down</button>
    <button type="button" data-content-action="remove-resource" data-collection="${collection}" data-index="${index}">Remove</button>
  </div>`;

  const cardResourcesEditor = () => {
    const resources = contentState.content.cardResources;
    const videoKinds = metadataChoices(contentState.metadataOptions.videoKinds);
    const webKinds = metadataChoices(contentState.metadataOptions.webResourceKinds);
    const languages = [
      { value: "", label: "All languages" },
      ...contentState.metadataOptions.resourceLanguages.map((value) => ({ value, label: value === "de" ? "German" : "English" }))
    ];
    return `<div class="resource-section">
      <div class="resource-heading"><h3>App-visible resources</h3><div><button type="button" data-content-action="add-youtube-resource">Add YouTube</button> <button type="button" data-content-action="add-web-resource">Add web link</button></div></div>
      ${resources.length === 0 ? '<p class="resource-empty">No app-visible resources. This is valid.</p>' : resources.map((resource, index) => `<div class="resource-row">
        <div class="resource-row-heading"><strong>Resource ${String(index + 1).padStart(2, "0")}</strong><span>${resource.type === "youtube" ? "YouTube" : "Web link"}</span></div>
        ${selectField("Resource type", `cardResources.${index}.type`, resource.type, [{ value: "youtube", label: "YouTube" }, { value: "web", label: "Web resource" }])}
        ${resource.type === "youtube"
          ? `${contentField("YouTube video ID", `cardResources.${index}.videoId`, resource.videoId)}${contentField("Title", `cardResources.${index}.title`, resource.title)}${selectField("Category", `cardResources.${index}.kind`, resource.kind, videoKinds)}`
          : `${contentField("URL", `cardResources.${index}.url`, resource.url, { type: "url" })}${contentField("Title", `cardResources.${index}.title`, resource.title)}${selectField("Category", `cardResources.${index}.kind`, resource.kind, webKinds)}${selectField("Language", `cardResources.${index}.language`, resource.language || "", languages)}`}
        ${resourceActions("cardResources", index, resources.length)}
      </div>`).join("")}
    </div>`;
  };

  const transcriptResearchEditor = () => {
    const transcripts = contentState.transcripts;
    return `<div class="transcript-research">
      <div class="transcript-import-row">
        <label class="content-field full"><span>YouTube URL</span><small class="field-hint">Downloads complete available English captions through the free provider and stores them only in this figure package.</small><input type="url" data-transcript-url placeholder="https://www.youtube.com/watch?v=…" autocomplete="off"><small class="field-error"></small></label>
        <button type="button" data-content-action="download-transcript">Download transcript</button>
      </div>
      <p class="transcript-import-status" data-transcript-status role="status"></p>
      ${transcripts.length
        ? `<ul class="transcript-file-list">${transcripts.map((transcript) => `<li><strong>${escapeHtml(transcript.filename)}</strong><code>${escapeHtml(transcript.path)}</code></li>`).join("")}</ul>`
        : '<p class="resource-empty">No research transcripts saved for this figure.</p>'}
    </div>`;
  };

  const renderContentFields = () => {
    if (!contentState.content || !contentState.metadataOptions) return;
    const { identity, basics, guides } = contentState.content;
    const technicalIdentity = `<details class="technical-identity"><summary>Technical identity <small>Read-only</small></summary><div class="technical-grid">${[
      contentField("Stable ID", "identity.id", identity.id, { readonly: true }),
      contentField("Dance style", "identity.style", identity.style, { readonly: true }),
      contentField("Directory slug", "identity.slug", identity.slug, { readonly: true }),
      contentField("Global order", "identity.order", identity.order, { readonly: true, type: "number" })
    ].join("")}</div></details>`;
    const basicsFields = [
      publicationEditor(),
      contentField("Canonical name", "basics.name", basics.name),
      selectField("Family", "basics.family", basics.family, metadataChoices(contentState.metadataOptions.families)),
      selectField("Count", "basics.count", basics.count, metadataChoices(contentState.metadataOptions.countPatterns)),
      selectField("Motion", "basics.motion", basics.motion, metadataChoices(contentState.metadataOptions.motionKinds)),
      endingEditor()
    ].join("");
    const guideFields = (language, guide) => [
      contentField("Description", `guides.${language}.description`, guide.description, { textarea: true, full: true }),
      contentField("Guide body", `guides.${language}.body`, guide.body, {
        textarea: true,
        full: true,
        rows: 14,
        hint: "Start every section with ## Heading. Separate plain-text paragraphs with a blank line."
      }),
      contentField("Remember", `guides.${language}.remember`, guide.remember, { textarea: true, full: true })
    ].join("");
    contentFields.innerHTML = [
      technicalIdentity,
      section("Basics", basicsFields, "Figure facts"),
      section("English", guideFields("en", guides.en), "3 fields"),
      section("German", guideFields("de", guides.de), "3 fields"),
      section("Resources", cardResourcesEditor(), `${contentState.content.cardResources.length} link${contentState.content.cardResources.length === 1 ? "" : "s"}`),
      section("Research transcripts", transcriptResearchEditor(), `${contentState.transcripts.length} file${contentState.transcripts.length === 1 ? "" : "s"}`)
    ].join("");
    applyContentIssues(contentState.contentIssues);
  };

  const rememberOpenSections = () => {
    contentState.openSections = new Set([...contentFields.querySelectorAll("details.content-section[open] summary")].map((summary) => summary.querySelector("span")?.textContent));
  };

  const applyContentIssues = (issues = []) => {
    contentState.contentIssues = issues;
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
    const dirty = contentIsDirty();
    contentSave.disabled = !dirty || issues.length > 0;
    contentSaveNext.disabled = !dirty || issues.length > 0;
  };

  const updateContentHeader = () => {
    if (!contentState.content) return;
    const dirty = contentIsDirty();
    contentTitle.textContent = contentState.content.basics.name || "Untitled figure";
    contentIdentity.textContent = `${contentState.content.identity.style} · ${contentState.content.identity.id}`;
    const issueCount = contentState.contentIssues.length;
    const stateMessage = issueCount > 0
      ? `${issueCount} validation issue${issueCount === 1 ? "" : "s"}`
      : dirty ? "Unsaved changes" : "Saved source";
    setStateLabel(contentDirty, stateMessage, issueCount > 0 ? "invalid" : dirty ? "dirty" : "saved");
    contentSave.disabled = !dirty || issueCount > 0;
    contentSaveNext.disabled = !dirty || issueCount > 0;
    contentRevert.disabled = !dirty;
    renderContentList();
  };

  const publicationFor = (figure) => figure.id === contentState.activeContentId && contentState.content
    ? contentState.content.publication
    : figure.publication;

  const visibleFigures = () => {
    const query = contentSearch.value.trim().toLowerCase();
    const style = contentStyle.value;
    const status = contentStatus.value;
    return getFigures().filter((figure) => {
      const haystack = `${figure.name} ${figure.id}`.toLowerCase();
      const dirty = figure.id === contentState.activeContentId && contentIsDirty();
      const matchesStatus = status === "all"
        || (status === "published" && publicationFor(figure) === "published")
        || (status === "draft" && publicationFor(figure) === "draft")
        || (status === "attention" && (!figure.contentValid || figure.resourceCount === 0 || figure.currentIsFallback || dirty))
        || (status === "no-resources" && figure.resourceCount === 0)
        || (status === "fallback" && figure.currentIsFallback)
        || (status === "invalid" && !figure.contentValid);
      return (!style || figure.style === style) && (!query || haystack.includes(query)) && matchesStatus;
    });
  };

  const renderContentList = () => {
    const visible = visibleFigures();
    contentCount.textContent = String(visible.length);
    contentCount.setAttribute("aria-label", `${visible.length} visible figure${visible.length === 1 ? "" : "s"}`);
    contentList.classList.remove("is-loading");
    contentList.innerHTML = visible.map((figure) => {
      const dirty = figure.id === contentState.activeContentId && contentIsDirty();
      const publication = publicationFor(figure);
      const resourceFact = figure.resourceCount === 0
        ? '<span class="badge muted">No resources</span>'
        : `<span class="content-list-fact">${figure.resourceCount} link${figure.resourceCount === 1 ? "" : "s"}</span>`;
      return `<button type="button" class="content-list-item ${figure.id === contentState.activeContentId ? "active" : ""}" data-content-id="${escapeHtml(figure.id)}">
        <span class="content-list-title"><strong>${escapeHtml(figure.name)}</strong><span>${escapeHtml(styleLabels[figure.style] || figure.style)}</span></span>
        <span class="content-list-meta">${resourceFact}${publication === "draft" ? '<span class="badge draft">Draft</span>' : publication !== "published" ? '<span class="badge bad">Unknown state</span>' : ""}${!figure.contentValid ? '<span class="badge bad">Invalid</span>' : ""}${!figure.germanComplete ? '<span class="badge warn">German incomplete</span>' : ""}${figure.currentIsFallback ? '<span class="badge warn">Fallback art</span>' : ""}${dirty ? '<span class="badge warn">Unsaved</span>' : ""}</span>
      </button>`;
    }).join("") || '<p class="resource-empty">No dance cards match these filters.</p>';
    if (!contentState.restoreAttempted && getFigures().length > 0) {
      contentState.restoreAttempted = true;
      const remembered = sessionStorage.getItem(LAST_FIGURE_KEY);
      if (remembered && getFigures().some(({ id }) => id === remembered)) void loadFigureContent(remembered);
    }
  };

  const setPathValue = (root, path, value) => {
    const parts = path.split(".");
    const key = parts.pop();
    let target = root;
    for (const part of parts) target = target[Number.isInteger(Number(part)) ? Number(part) : part];
    const optionalBlank = value === "" && /^cardResources\.\d+\.language$/.test(path);
    if (value === undefined || optionalBlank) delete target[key];
    else target[key] = value;
  };

  const previewDocument = () => {
    if (!contentState.previewMarkup) return;
    const flipped = contentState.previewFace === "back" ? "is-flipped" : "";
    cardPreview.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${contentState.previewStyles}\nhtml,body{width:100%;height:100%;overflow:hidden}.studio-preview-card{position:relative;inset:auto;width:100%;height:100%;border-radius:22px;color:var(--paper)}.studio-preview-card .card-content{padding:20px}.studio-preview-card h2{font-size:42px}</style></head><body><article class="move-card studio-preview-card ${flipped}">${contentState.previewMarkup}</article></body></html>`;
  };

  const updatePreviewControls = () => {
    document.querySelectorAll("[data-preview-language]").forEach((button) => button.classList.toggle("active", button.dataset.previewLanguage === contentState.previewLanguage));
    document.querySelectorAll("[data-preview-face]").forEach((button) => button.classList.toggle("active", button.dataset.previewFace === contentState.previewFace));
  };

  const requestPreview = async () => {
    if (!contentState.content || !contentState.activeContentId) return;
    const requestNumber = ++contentState.previewRequest;
    setStateLabel(previewStatus, "Updating…", "updating");
    try {
      const result = await request("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: contentState.activeContentId, language: contentState.previewLanguage, content: contentState.content })
      });
      if (requestNumber !== contentState.previewRequest) return;
      contentState.previewStyles ||= await previewStylesPromise;
      if (requestNumber !== contentState.previewRequest) return;
      contentState.previewMarkup = result.markup;
      applyContentIssues([]);
      updateContentHeader();
      setStateLabel(previewStatus, "Live", "live");
      previewDocument();
    } catch (error) {
      if (requestNumber !== contentState.previewRequest) return;
      applyContentIssues(error.issues || []);
      updateContentHeader();
      setStateLabel(previewStatus, error.issues?.length ? `${error.issues.length} issue${error.issues.length === 1 ? "" : "s"}` : "Preview unavailable", "error");
    }
  };

  const schedulePreview = () => {
    clearTimeout(contentState.previewTimer);
    contentState.previewTimer = setTimeout(requestPreview, 180);
  };

  const loadFigureContent = async (id, discardConfirmed = false) => {
    if (id === contentState.activeContentId) return;
    if (!discardConfirmed && contentIsDirty() && !confirm("Discard unsaved changes and open another figure?")) return;
    contentMessage.className = "content-message";
    contentMessage.textContent = "Loading figure…";
    try {
      const loaded = await request(`/api/figure-content?id=${encodeURIComponent(id)}`);
      contentState.activeContentId = id;
      sessionStorage.setItem(LAST_FIGURE_KEY, id);
      contentState.content = loaded.content;
      contentState.metadataOptions = loaded.metadataOptions;
      contentState.originalContent = JSON.stringify(loaded.content);
      contentState.contentRevision = loaded.revision;
      contentState.contentIssues = [];
      contentState.transcripts = loaded.transcripts || [];
      contentState.openSections = new Set(["Basics"]);
      contentState.previewMarkup = "";
      contentEmpty.hidden = true;
      contentForm.hidden = false;
      previewPanel.hidden = false;
      contentWorkspace.classList.add("has-selection");
      contentMessage.textContent = "";
      renderContentFields();
      updateContentHeader();
      await requestPreview();
    } catch (error) {
      contentMessage.className = "content-message error";
      contentMessage.textContent = error.message;
    }
  };

  contentSearch.addEventListener("input", renderContentList);
  contentStyle.addEventListener("change", renderContentList);
  contentStatus.addEventListener("change", renderContentList);
  contentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-content-id]");
    if (button) void loadFigureContent(button.dataset.contentId);
  });

  const slugify = (value) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  const clearCreateIssues = () => {
    createCardForm.querySelectorAll("[data-create-field]").forEach((field) => {
      field.classList.remove("has-error");
      field.querySelector(".field-error").textContent = "";
    });
  };

  const applyCreateIssues = (issues = []) => {
    clearCreateIssues();
    for (const issue of issues) {
      const field = createCardForm.querySelector(`[data-create-field="${CSS.escape(issue.path)}"]`);
      if (!field) continue;
      field.classList.add("has-error");
      field.querySelector(".field-error").textContent = issue.message;
    }
  };

  const closeCreateDialog = () => createCardDialog.close();
  createCardButton.addEventListener("click", () => {
    createCardForm.reset();
    createSlugTouched = false;
    clearCreateIssues();
    createCardMessage.className = "content-message";
    createCardMessage.textContent = "";
    createCardDialog.showModal();
    createCardForm.elements.name.focus();
  });
  createCardClose.addEventListener("click", closeCreateDialog);
  createCardCancel.addEventListener("click", closeCreateDialog);
  createCardForm.elements.name.addEventListener("input", () => {
    if (!createSlugTouched) createCardForm.elements.slug.value = slugify(createCardForm.elements.name.value);
  });
  createCardForm.elements.slug.addEventListener("input", () => {
    createSlugTouched = true;
  });
  createCardForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (contentIsDirty() && !confirm("Discard unsaved changes and create a new card?")) return;
    const submit = event.submitter;
    submit.disabled = true;
    applyCreateIssues([]);
    createCardMessage.className = "content-message";
    createCardMessage.textContent = "Creating an atomic draft package…";
    try {
      const created = await request("/api/figures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: createCardForm.elements.name.value,
          style: createCardForm.elements.style.value,
          slug: createCardForm.elements.slug.value
        })
      });
      createCardDialog.close();
      await onSaved();
      await loadFigureContent(created.id, true);
    } catch (error) {
      createCardMessage.className = "content-message error";
      createCardMessage.textContent = error.message;
      applyCreateIssues(error.issues || []);
    } finally {
      submit.disabled = false;
    }
  });
  const updateContentControl = (control) => {
    if (!contentState.content || !control.dataset.contentPath || control.readOnly) return;
    const path = control.dataset.contentPath;
    const publication = path === "publication";
    const endingKind = path === "basics.end.kind";
    const typeMatch = /^cardResources\.(\d+)\.type$/.exec(path);
    if (publication) {
      contentState.content.publication = control.checked ? "published" : "draft";
    } else if (endingKind) {
      rememberOpenSections();
      contentState.content.basics.end = control.value === "any"
        ? { kind: "any" }
        : { kind: "positions", positions: [contentState.metadataOptions.endPositions[0]] };
      renderContentFields();
    } else if (typeMatch) {
      rememberOpenSections();
      const index = Number(typeMatch[1]);
      contentState.content.cardResources[index] = control.value === "youtube"
        ? { type: "youtube", videoId: "", title: "", kind: "tutorial" }
        : { type: "web", url: "", title: "", kind: "article" };
      renderContentFields();
    } else {
      const value = control.dataset.valueType === "optional-number"
        ? control.value === "" ? undefined : Number(control.value)
        : control.value;
      setPathValue(contentState.content, path, value);
    }
    contentMessage.textContent = "";
    updateContentHeader();
    schedulePreview();
  };

  contentForm.addEventListener("input", (event) => {
    const control = event.target.closest("[data-content-path]");
    if (control && control.tagName !== "SELECT") {
      updateContentControl(control);
      const count = control.closest(".content-field")?.querySelector(".field-count");
      if (count) count.textContent = `${control.value.length} characters`;
    }
  });
  contentForm.addEventListener("change", (event) => {
    const control = event.target.closest("select[data-content-path]");
    if (control) {
      updateContentControl(control);
      return;
    }
    const position = event.target.closest("input[data-ending-position]");
    if (!position || !contentState.content) return;
    contentState.content.basics.end = {
      kind: "positions",
      positions: [...contentForm.querySelectorAll("input[data-ending-position]:checked")].map((input) => input.value)
    };
    contentMessage.textContent = "";
    updateContentHeader();
    schedulePreview();
  });

  contentFields.addEventListener("toggle", (event) => {
    const details = event.target.closest("details.content-section");
    if (!details) return;
    const title = details.querySelector("summary span")?.textContent;
    if (!title) return;
    details.open ? contentState.openSections.add(title) : contentState.openSections.delete(title);
  }, true);

  contentFields.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-content-action]");
    if (!button || !contentState.content) return;
    const action = button.dataset.contentAction;
    if (action === "download-transcript") {
      const container = button.closest(".transcript-research");
      const input = container.querySelector("[data-transcript-url]");
      const status = container.querySelector("[data-transcript-status]");
      const url = input.value.trim();
      const figureId = contentState.activeContentId;
      if (!url) {
        status.className = "transcript-import-status error";
        status.textContent = "Paste a YouTube URL first.";
        input.focus();
        return;
      }
      button.disabled = true;
      input.disabled = true;
      status.className = "transcript-import-status";
      status.textContent = "Downloading free hosted captions…";
      try {
        const imported = await request("/api/transcripts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: figureId, url })
        });
        if (contentState.activeContentId !== figureId) return;
        contentState.transcripts = imported.transcripts;
        rememberOpenSections();
        renderContentFields();
        const refreshedStatus = contentFields.querySelector("[data-transcript-status]");
        refreshedStatus.className = "transcript-import-status success";
        refreshedStatus.textContent = imported.result.status === "written"
          ? `Saved ${imported.result.filename} in this figure's transcripts directory.`
          : `${imported.result.filename} is already available for this figure.`;
      } catch (error) {
        status.className = "transcript-import-status error";
        status.textContent = error.message;
        button.disabled = false;
        input.disabled = false;
      }
      return;
    }
    rememberOpenSections();
    if (action === "add-youtube-resource") {
      contentState.content.cardResources.push({ type: "youtube", videoId: "", title: "", kind: "tutorial" });
    } else if (action === "add-web-resource") {
      contentState.content.cardResources.push({ type: "web", url: "", title: "", kind: "article" });
    } else if (action === "remove-resource") {
      contentState.content[button.dataset.collection].splice(Number(button.dataset.index), 1);
    } else if (action === "move-resource") {
      const collection = contentState.content[button.dataset.collection];
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

  contentFields.addEventListener("keydown", (event) => {
    const input = event.target.closest("[data-transcript-url]");
    if (!input || event.key !== "Enter") return;
    event.preventDefault();
    input.closest(".transcript-research").querySelector('[data-content-action="download-transcript"]').click();
  });

  contentRevert.addEventListener("click", () => {
    if (!contentState.content || !contentIsDirty() || !confirm("Revert every unsaved change to this figure?")) return;
    contentState.content = JSON.parse(contentState.originalContent);
    contentState.contentIssues = [];
    contentMessage.className = "content-message";
    contentMessage.textContent = "Draft reverted.";
    renderContentFields();
    updateContentHeader();
    void requestPreview();
  });

  contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contentState.content || !contentState.activeContentId || !contentIsDirty()) return;
    const advance = event.submitter?.dataset.saveNext === "true";
    const visible = visibleFigures();
    const currentIndex = visible.findIndex(({ id }) => id === contentState.activeContentId);
    const nextId = currentIndex >= 0 ? visible[currentIndex + 1]?.id : undefined;
    contentSave.disabled = true;
    contentSaveNext.disabled = true;
    contentMessage.className = "content-message";
    contentMessage.textContent = "Validating and saving…";
    try {
      const saved = await request("/api/figure-content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: contentState.activeContentId, revision: contentState.contentRevision, content: contentState.content })
      });
      contentState.content = saved.content;
      contentState.contentRevision = saved.revision;
      contentState.originalContent = JSON.stringify(saved.content);
      contentState.contentIssues = [];
      contentMessage.className = "content-message success";
      contentMessage.textContent = "Figure saved atomically.";
      renderContentFields();
      updateContentHeader();
      await onSaved();
      await requestPreview();
      if (advance && nextId) await loadFigureContent(nextId);
    } catch (error) {
      contentMessage.className = "content-message error";
      contentMessage.textContent = error.status === 409 ? `${error.message} Your draft is still here.` : error.message;
      applyContentIssues(error.issues || []);
      updateContentHeader();
    }
  });

  document.querySelectorAll("[data-preview-language]").forEach((button) => {
    button.addEventListener("click", () => {
      contentState.previewLanguage = button.dataset.previewLanguage;
      updatePreviewControls();
      void requestPreview();
    });
  });
  document.querySelectorAll("[data-preview-face]").forEach((button) => {
    button.addEventListener("click", () => {
      contentState.previewFace = button.dataset.previewFace;
      updatePreviewControls();
      previewDocument();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (contentWorkspace.hidden) return;
    const target = event.target;
    const editing = target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (contentIsDirty() && !contentSave.disabled) contentForm.requestSubmit(contentSave);
      return;
    }
    if (event.key === "/" && !editing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      contentSearch.focus();
      contentSearch.select();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!contentIsDirty()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  return {
    hasUnsavedChanges: contentIsDirty,
    renderFigureList: renderContentList,
    showLoadError: (message) => {
      contentCount.textContent = "!";
      contentList.classList.remove("is-loading");
      contentList.innerHTML = `<div class="library-error"><strong>Catalog unavailable</strong><p>${escapeHtml(message)}</p><small>If the Studio was already open during a code update, restart <code>task studio</code>.</small></div>`;
    }
  };
};
