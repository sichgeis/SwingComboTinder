import { createContentWorkspace } from "./content-workspace.js";
import { createRefreshCoordinator } from "./refresh-coordinator.js";

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
  workspace: "content"
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
const generationPlan = document.querySelector("#generation-plan");
const selectionCount = document.querySelector("#selection-count");
const selectVisibleButton = document.querySelector("#select-visible");
const clearSelectionButton = document.querySelector("#clear-selection");
const promptDialog = document.querySelector("#prompt-dialog");
const promptContent = document.querySelector("#prompt-content");
const imageDialog = document.querySelector("#image-dialog");
const imageDialogTitle = document.querySelector("#image-dialog-title");
const imageDialogMeta = document.querySelector("#image-dialog-meta");
const imageDialogContent = document.querySelector("#image-dialog-content");
const imageDialogClose = document.querySelector("#image-dialog-close");
const poseDialog = document.querySelector("#pose-dialog");
const poseDialogTitle = document.querySelector("#pose-dialog-title");
const poseDialogMeta = document.querySelector("#pose-dialog-meta");
const poseDialogContent = document.querySelector("#pose-dialog-content");
const poseDialogClose = document.querySelector("#pose-dialog-close");
const poseUploadZone = document.querySelector("#pose-upload-zone");
const poseUploadStatus = document.querySelector("#pose-upload-status");
const poseFileButton = document.querySelector("#pose-file-button");
const poseFileInput = document.querySelector("#pose-file-input");
let activePoseFigureId = null;
let poseUploadActive = false;
const contentWorkspace = document.querySelector("#content-workspace");
const imageWorkspace = document.querySelector("#image-workspace");
const styleLabels = {
  lindy: "Lindy Hop",
  charleston: "Charleston",
  shag: "Collegiate Shag"
};
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const setConnection = (message, stateName = "") => {
  connection.className = `connection ${stateName}`;
  connection.innerHTML = `<span class="status-dot" aria-hidden="true"></span><span>${escapeHtml(message)}</span>`;
};

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

const contentEditor = createContentWorkspace({
  request,
  escapeHtml,
  getFigures: () => state.figures,
  onSaved: (id) => loadFigures(id)
});

const loadFigures = createRefreshCoordinator(async (changedIds) => {
  state.figures = await request("/api/figures");
  render();
  contentEditor.renderFigureList();
  await contentEditor.synchronizeFigures(changedIds);
});

const showWorkspace = (workspace) => {
  if (workspace === state.workspace) return;
  if (workspace !== "content" && contentEditor.hasUnsavedChanges() && !confirm("Leave Content with unsaved changes?")) return;
  state.workspace = workspace;
  contentWorkspace.hidden = workspace !== "content";
  imageWorkspace.hidden = workspace !== "images";
  document.querySelectorAll("[data-workspace]").forEach((button) => {
    const active = button.dataset.workspace === workspace;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

const imageCell = (label, url, emptyText, figureName, footer = "") => `
  <div class="image-cell">
    <h3>${label}</h3>
    ${url ? `<button class="image-zoom" type="button" data-image-url="${escapeHtml(url)}" data-image-label="${escapeHtml(`${figureName} · ${label}`)}" aria-label="Magnify ${escapeHtml(label)} for ${escapeHtml(figureName)}"><img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" loading="lazy"></button>` : `<div class="empty-image">${escapeHtml(emptyText)}</div>`}
    ${footer ? `<div class="image-cell-footer">${footer}</div>` : ""}
  </div>`;

const renderPoseDialog = (figure, message = "", tone = "") => {
  activePoseFigureId = figure.id;
  poseDialogTitle.textContent = `${figure.name} · Teaching poses`;
  poseDialogMeta.className = "";
  poseDialogMeta.textContent = figure.hasPose
    ? "The current pose is used by future image generation. New uploads become alternatives until selected."
    : "The first uploaded pose becomes the current generation reference.";
  poseUploadStatus.className = `pose-upload-status ${tone}`;
  poseUploadStatus.textContent = message;
  poseDialogContent.innerHTML = figure.poseOptions.length ? figure.poseOptions.map((pose) => `<article class="pose-option ${pose.selected ? "selected" : ""}">
    <button class="image-zoom" type="button" data-image-url="${escapeHtml(pose.url)}" data-image-label="${escapeHtml(`${figure.name} · ${pose.filename}`)}"><img src="${escapeHtml(pose.url)}" alt="${escapeHtml(pose.filename)}"></button>
    <div><strong>${escapeHtml(pose.filename)}</strong>${pose.selected ? '<span class="badge good">Current</span>' : `<button type="button" class="secondary" data-pose-path="${escapeHtml(pose.path)}">Use this pose</button>`}</div>
  </article>`).join("") : '<div class="pose-option-empty">No teaching pose yet. Add the first image above.</div>';
};

const openPoseDialog = (figure) => {
  renderPoseDialog(figure);
  poseDialog.showModal();
};

const poseAction = (figure, long = false) => {
  if (!figure.hasPose) return long ? "Add teaching pose" : "Add pose";
  const alternates = figure.poseOptions.length - 1;
  if (long) return alternates ? `Teaching poses · ${alternates} alternate${alternates === 1 ? "" : "s"}` : "Teaching poses";
  return alternates ? `Poses · ${alternates} alternate${alternates === 1 ? "" : "s"}` : "Teaching poses";
};

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
  if (!figure.hasPose) tags.push('<span class="tag bad">Missing pose</span>');
  if (!figure.hasCurrent) tags.push(`<span class="tag warn">${figure.currentIsFallback ? "Fallback art" : "Missing master"}</span>`);
  if (figure.marked) tags.push('<span class="tag warn">Rework</span>');
  if (job) tags.push(`<span class="tag ${job.state === "failed" ? "bad" : "warn"}">${escapeHtml(job.state)}</span>`);
  if (figure.imageApproved && tags.length === 0) tags.push('<span class="tag approved">Approved</span>');
  return tags.join("");
};

const queueFigures = () => {
  const style = form.elements.style.value;
  const view = form.elements.view.value;
  return state.figures.filter((figure) => {
    const hasNew = state.newCandidates.has(figure.id);
    const needsAttention = hasNew || figure.marked || !figure.hasCurrent || !figure.hasPose || !figure.imageApproved;
    const matchesView = view === "all"
      || (view === "attention" && needsAttention)
      || (view === "new" && hasNew)
      || (view === "rework" && figure.marked)
      || (view === "missing-master" && !figure.hasCurrent)
      || (view === "missing-pose" && !figure.hasPose)
      || (view === "approved" && figure.imageApproved);
    return (!style || figure.style === style) && matchesView;
  });
};

const generationTargets = () => {
  const data = new FormData(form);
  const style = data.get("style");
  const styled = style ? state.figures.filter((figure) => figure.style === style) : state.figures;
  const mode = data.get("mode");
  if (mode === "selected") return styled.filter(({ id }) => state.selected.has(id) && state.figures.find((figure) => figure.id === id)?.hasPose);
  if (mode === "missing") return styled.filter((figure) => !figure.hasCurrent && figure.hasPose);
  if (mode === "marked") return styled.filter((figure) => figure.marked && figure.hasPose);
  return styled.filter((figure) => figure.hasPose);
};

const render = () => {
  const visible = queueFigures();
  const missing = state.figures.filter((figure) => !figure.hasCurrent).length;
  const marked = state.figures.filter((figure) => figure.marked).length;
  const approved = state.figures.filter((figure) => figure.imageApproved).length;
  const blocked = state.figures.filter((figure) => !figure.hasPose).length;
  summary.innerHTML = [
    [visible.length, "shown", ""],
    [state.newCandidates.size, "new", state.newCandidates.size ? "attention" : ""],
    [marked, "rework", marked ? "attention" : ""],
    [missing, "missing masters", missing ? "bad" : ""],
    [blocked, "missing poses", blocked ? "bad" : ""],
    [approved, "approved", approved ? "good" : ""]
  ].map(([value, label, tone]) => `<span class="metric ${tone}"><strong>${value}</strong><small>${label}</small></span>`).join("");
  selectionCount.textContent = `${state.selected.size} selected`;
  const targets = generationTargets();
  const candidates = Number(form.elements.count.value);
  generationPlan.textContent = targets.length === 0
    ? form.elements.mode.value === "selected" ? "Select figures to build a run" : "No eligible figures in this run"
    : `${targets.length} figure${targets.length === 1 ? "" : "s"} × ${candidates} candidate${candidates === 1 ? "" : "s"} = ${targets.length * candidates} image request${targets.length * candidates === 1 ? "" : "s"}`;
  runButton.disabled = state.runActive || targets.length === 0;
  selectVisibleButton.disabled = visible.length === 0;
  clearSelectionButton.disabled = state.selected.size === 0;

  grid.innerHTML = visible.map((figure) => {
    const latest = figure.candidates[0];
    const job = state.jobs.get(figure.id);
    const newCandidateCount = state.newCandidates.get(figure.id) || 0;
    const classes = ["figure-card", figure.imageApproved ? "approved" : "", newCandidateCount ? "has-new-candidates" : "", job?.state === "running" ? "running" : "", job?.state === "failed" ? "failed" : ""].filter(Boolean).join(" ");
    const cardBody = figure.imageApproved && !figure.marked && newCandidateCount === 0 ? `
      <div class="approved-summary">
        <span>This move has an image you approved.</span>
        <div><button type="button" class="secondary" data-action="swap-pose">${escapeHtml(poseAction(figure, true))}</button><button type="button" class="secondary" data-action="image-approval">Reopen</button></div>
      </div>` : `
      <div class="comparison">
        ${imageCell("Teaching pose", figure.poseUrl, "Add a teaching pose", figure.name, `<button type="button" class="secondary" data-action="swap-pose">${escapeHtml(poseAction(figure))}</button>`)}
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
        <div class="action-tools">
          <button type="button" class="secondary" data-action="generate" ${figure.hasPose && !state.runActive ? "" : "disabled"}>Generate</button>
          <button type="button" class="quiet" data-action="prompt" ${figure.hasPose ? "" : "disabled"}>View prompt</button>
          <button type="button" class="quiet mark-action ${figure.marked ? "danger" : ""}" data-action="mark">${figure.marked ? "Clear rework" : "Mark rework"}</button>
        </div>
        <div class="action-decisions">
          <button type="button" class="secondary promote-action" data-action="promote" ${latest ? "" : "disabled"}>Promote latest</button>
          <button type="button" class="secondary approve-action" data-action="image-approval">Approve image</button>
        </div>
      </div>
      <p class="job-message">${escapeHtml(job?.message || "")}</p>`;
    return `<article class="${classes}" data-id="${escapeHtml(figure.id)}">
      <header class="card-header">
        <label class="select-title">
          <input class="figure-select" type="checkbox" ${state.selected.has(figure.id) ? "checked" : ""}>
          <span><h2>${escapeHtml(figure.name)}</h2><span class="figure-id">${escapeHtml(styleLabels[figure.style] || figure.style)} · ${escapeHtml(figure.id)}</span></span>
        </label>
        <div class="tags">${tagsFor(figure, job, newCandidateCount)}</div>
      </header>
      ${cardBody}
    </article>`;
  }).join("") || '<div class="queue-empty"><strong>Nothing needs attention here.</strong><p>Choose another view or style to inspect more figures.</p></div>';
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await startRun(); }
  catch (error) { runStatus.className = "error"; runStatus.textContent = error.message; }
});

for (const control of [form.elements.view, form.elements.mode, form.elements.style, form.elements.count]) {
  control.addEventListener("change", render);
  control.addEventListener("input", render);
}

selectVisibleButton.addEventListener("click", () => {
  for (const figure of queueFigures()) state.selected.add(figure.id);
  render();
});
clearSelectionButton.addEventListener("click", () => {
  state.selected.clear();
  render();
});

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
    if (button.dataset.action === "swap-pose") {
      openPoseDialog(figure);
    } else if (button.dataset.action === "generate") {
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
      await loadFigures(id);
    } else if (button.dataset.action === "mark") {
      await request("/api/mark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, marked: !figure.marked })
      });
      await loadFigures(id);
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
      await loadFigures(id);
    } else if (button.dataset.action === "save-note") {
      const note = button.closest(".generation-note-editor").querySelector("textarea[data-generation-note]").value;
      await request("/api/generation-note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, note })
      });
      runStatus.className = "success";
      runStatus.textContent = `Saved generation note for ${figure.name}.`;
      await loadFigures(id);
    }
  } catch (error) {
    runStatus.className = "error";
    runStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

const uploadTeachingPose = async (file, source = "upload") => {
  if (!activePoseFigureId || poseUploadActive) return;
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    poseUploadStatus.className = "pose-upload-status error";
    poseUploadStatus.textContent = "Choose a PNG, JPEG, or WebP image.";
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    poseUploadStatus.className = "pose-upload-status error";
    poseUploadStatus.textContent = "Teaching poses must be no larger than 20 MB.";
    return;
  }

  const id = activePoseFigureId;
  poseUploadActive = true;
  poseUploadZone.classList.add("is-uploading");
  poseFileButton.disabled = true;
  poseUploadStatus.className = "pose-upload-status";
  poseUploadStatus.textContent = source === "paste" ? "Adding pasted screenshot…" : "Adding teaching pose…";
  try {
    const result = await request(`/api/teaching-pose-upload?id=${encodeURIComponent(id)}`, {
      method: "POST",
      headers: {
        "content-type": file.type,
        "x-file-name": encodeURIComponent(source === "paste" ? "clipboard-screenshot.png" : (file.name || "uploaded-pose"))
      },
      body: file
    });
    await loadFigures(id);
    const refreshed = state.figures.find((figure) => figure.id === id);
    if (!refreshed) throw new Error("The updated figure is no longer available.");
    renderPoseDialog(
      refreshed,
      result.added.selected
        ? "Added as the current teaching pose."
        : `Added ${result.added.filename} as an alternative.`,
      "success"
    );
  } catch (error) {
    poseUploadStatus.className = "pose-upload-status error";
    poseUploadStatus.textContent = error.message;
  } finally {
    poseUploadActive = false;
    poseUploadZone.classList.remove("is-uploading", "is-dragging");
    poseFileButton.disabled = false;
    poseFileInput.value = "";
  }
};

poseDialogClose.addEventListener("click", () => poseDialog.close());
poseDialog.addEventListener("close", () => {
  activePoseFigureId = null;
  poseUploadZone.classList.remove("is-dragging");
  poseFileInput.value = "";
});
poseFileButton.addEventListener("click", () => poseFileInput.click());
poseFileInput.addEventListener("change", () => void uploadTeachingPose(poseFileInput.files?.[0]));
for (const eventName of ["dragenter", "dragover"]) {
  poseUploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (!poseUploadActive) poseUploadZone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "dragend"]) {
  poseUploadZone.addEventListener(eventName, () => poseUploadZone.classList.remove("is-dragging"));
}
poseUploadZone.addEventListener("drop", (event) => {
  event.preventDefault();
  poseUploadZone.classList.remove("is-dragging");
  void uploadTeachingPose([...event.dataTransfer.files].find((file) => file.type.startsWith("image/")));
});
document.addEventListener("paste", (event) => {
  if (!poseDialog.open || poseUploadActive) return;
  const item = [...(event.clipboardData?.items ?? [])].find((entry) => entry.type.startsWith("image/"));
  const file = item?.getAsFile();
  if (!file) return;
  event.preventDefault();
  void uploadTeachingPose(file, "paste");
});
poseDialogContent.addEventListener("click", async (event) => {
  const imageButton = event.target.closest("button[data-image-url]");
  if (imageButton) {
    openImageDialog(imageButton.dataset.imageUrl, imageButton.dataset.imageLabel);
    return;
  }
  const button = event.target.closest("button[data-pose-path]");
  if (!button || !activePoseFigureId) return;
  button.disabled = true;
  const id = activePoseFigureId;
  const figure = state.figures.find((item) => item.id === id);
  try {
    await request("/api/teaching-pose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, path: button.dataset.posePath })
    });
    poseDialog.close();
    runStatus.className = "success";
    runStatus.textContent = `Changed the teaching pose for ${figure?.name || id}.`;
    await loadFigures(id);
  } catch (error) {
    poseDialogMeta.textContent = error.message;
    poseDialogMeta.className = "error";
  } finally {
    button.disabled = false;
  }
});

const events = new EventSource("/api/events");
events.addEventListener("open", () => setConnection("Live updates connected", "ready"));
events.addEventListener("error", () => setConnection("Reconnecting live updates…", "warning"));

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
      await loadFigures("*");
    } else if (type === "figure-updated") {
      await loadFigures(update.id);
    }
    render();
  });
}

Promise.all([request("/api/config"), loadFigures()])
  .then(([config]) => {
    form.elements.quality.value = config.imageQuality;
    const provider = config.imageApiProvider === "litellm" ? "LiteLLM" : "OpenAI";
    setConnection(config.imageApiConfigured ? `${config.model} via ${provider}` : `${provider} configuration missing`, config.imageApiConfigured ? "ready" : "warning");
    state.runActive = config.runActive;
    render();
  })
  .catch((error) => {
    runStatus.className = "error";
    runStatus.textContent = error.message;
    contentEditor.showLoadError(error.message);
    grid.innerHTML = '<div class="queue-empty error"><strong>Studio data could not be loaded.</strong><p>Restart the local Studio after source updates, then reload this page.</p></div>';
  });
