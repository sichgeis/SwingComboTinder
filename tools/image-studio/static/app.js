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
  runActive: false
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

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const request = async (url, options) => {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
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
