export const createContentWorkspace = ({ request, escapeHtml, getFigures, onSaved }) => {
  const contentState = {
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

  const contentWorkspace = document.querySelector("#content-workspace");
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

  const contentIsDirty = () => Boolean(contentState.content) && JSON.stringify(contentState.content) !== contentState.originalContent;

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

  const section = (title, body) => `<details class="content-section" ${contentState.openSections.has(title) ? "open" : ""}><summary>${escapeHtml(title)}</summary><div class="content-section-body">${body}</div></details>`;

  const resourceActions = (collection, index, length) => `<div class="resource-actions">
    <button type="button" data-content-action="move-resource" data-collection="${collection}" data-index="${index}" data-direction="-1" ${index === 0 ? "disabled" : ""}>↑ Up</button>
    <button type="button" data-content-action="move-resource" data-collection="${collection}" data-index="${index}" data-direction="1" ${index === length - 1 ? "disabled" : ""}>↓ Down</button>
    <button type="button" data-content-action="remove-resource" data-collection="${collection}" data-index="${index}">Remove</button>
  </div>`;

  const teachingSourcesEditor = () => {
    const sources = contentState.content.teachingSources;
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
    const resources = contentState.content.cardResources;
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
    if (!contentState.content) return;
    const { identity, basics, guides } = contentState.content;
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
    applyContentIssues(contentState.contentIssues);
  };

  const rememberOpenSections = () => {
    contentState.openSections = new Set([...contentFields.querySelectorAll("details.content-section[open] summary")].map((summary) => summary.textContent));
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
  };

  const updateContentHeader = () => {
    if (!contentState.content) return;
    const dirty = contentIsDirty();
    contentTitle.textContent = contentState.content.basics.name || "Untitled figure";
    contentIdentity.textContent = `${contentState.content.identity.style} · ${contentState.content.identity.id}`;
    contentDirty.textContent = dirty ? "Unsaved changes" : "Saved source";
    contentDirty.classList.toggle("dirty", dirty);
    contentSave.disabled = !dirty;
    renderContentList();
  };

  const renderContentList = () => {
    const query = contentSearch.value.trim().toLowerCase();
    const style = contentStyle.value;
    const visible = getFigures().filter((figure) => {
      const haystack = `${figure.name} ${figure.alias || ""} ${figure.id}`.toLowerCase();
      return (!style || figure.style === style) && (!query || haystack.includes(query));
    });
    contentCount.textContent = String(visible.length);
    contentList.innerHTML = visible.map((figure) => {
      const dirty = figure.id === contentState.activeContentId && contentIsDirty();
      return `<button type="button" class="content-list-item ${figure.id === contentState.activeContentId ? "active" : ""}" data-content-id="${escapeHtml(figure.id)}">
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
    if (!contentState.previewMarkup) return;
    const flipped = contentState.previewFace === "back" ? "is-flipped" : "";
    cardPreview.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app-card.css"><style>html,body{width:100%;height:100%;overflow:hidden}.studio-preview-card{position:relative;inset:auto;width:100%;height:100%;border-radius:22px}.studio-preview-card .card-content{padding:20px}.studio-preview-card h2{font-size:42px}</style></head><body><article class="move-card studio-preview-card ${flipped}">${contentState.previewMarkup}</article></body></html>`;
  };

  const updatePreviewControls = () => {
    document.querySelectorAll("[data-preview-language]").forEach((button) => button.classList.toggle("active", button.dataset.previewLanguage === contentState.previewLanguage));
    document.querySelectorAll("[data-preview-face]").forEach((button) => button.classList.toggle("active", button.dataset.previewFace === contentState.previewFace));
  };

  const requestPreview = async () => {
    if (!contentState.content || !contentState.activeContentId) return;
    const requestNumber = ++contentState.previewRequest;
    previewStatus.textContent = "Updating…";
    try {
      const result = await request("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: contentState.activeContentId, language: contentState.previewLanguage, content: contentState.content })
      });
      if (requestNumber !== contentState.previewRequest) return;
      contentState.previewMarkup = result.markup;
      applyContentIssues([]);
      previewStatus.textContent = "Live";
      previewDocument();
    } catch (error) {
      if (requestNumber !== contentState.previewRequest) return;
      applyContentIssues(error.issues || []);
      previewStatus.textContent = error.issues?.length ? `${error.issues.length} issue${error.issues.length === 1 ? "" : "s"}` : "Preview unavailable";
    }
  };

  const schedulePreview = () => {
    clearTimeout(contentState.previewTimer);
    contentState.previewTimer = setTimeout(requestPreview, 180);
  };

  const loadFigureContent = async (id) => {
    if (id === contentState.activeContentId) return;
    if (contentIsDirty() && !confirm("Discard unsaved changes and open another figure?")) return;
    contentMessage.className = "content-message";
    contentMessage.textContent = "Loading figure…";
    try {
      const loaded = await request(`/api/figure-content?id=${encodeURIComponent(id)}`);
      contentState.activeContentId = id;
      contentState.content = loaded.content;
      contentState.originalContent = JSON.stringify(loaded.content);
      contentState.contentRevision = loaded.revision;
      contentState.contentIssues = [];
      contentState.openSections = new Set(["Basics"]);
      contentState.previewMarkup = "";
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

  contentSearch.addEventListener("input", renderContentList);
  contentStyle.addEventListener("change", renderContentList);
  contentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-content-id]");
    if (button) void loadFigureContent(button.dataset.contentId);
  });

  const updateContentControl = (control) => {
    if (!contentState.content || !control.dataset.contentPath || control.readOnly) return;
    const path = control.dataset.contentPath;
    const typeMatch = /^cardResources\.(\d+)\.type$/.exec(path);
    if (typeMatch) {
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
    details.open ? contentState.openSections.add(title) : contentState.openSections.delete(title);
  }, true);

  contentFields.addEventListener("click", (event) => {
    const button = event.target.closest("[data-content-action]");
    if (!button || !contentState.content) return;
    rememberOpenSections();
    const action = button.dataset.contentAction;
    if (action === "add-teaching-source") {
      contentState.content.teachingSources.push({ videoId: "" });
    } else if (action === "add-youtube-resource") {
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

  contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contentState.content || !contentState.activeContentId || !contentIsDirty()) return;
    contentSave.disabled = true;
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

    return {
      hasUnsavedChanges: contentIsDirty,
      renderFigureList: renderContentList
    };
  };
