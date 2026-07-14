const state = {
  figures: [],
  selected: new Set(),
  jobs: new Map(),
  runActive: false
};

const grid = document.querySelector("#figure-grid");
const summary = document.querySelector("#summary");
const runStatus = document.querySelector("#run-status");
const connection = document.querySelector("#connection");
const form = document.querySelector("#run-form");
const runButton = document.querySelector("#run-button");
const promptDialog = document.querySelector("#prompt-dialog");
const promptContent = document.querySelector("#prompt-content");

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

const imageCell = (label, url, emptyText) => `
  <div class="image-cell">
    <h3>${label}</h3>
    ${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" loading="lazy">` : `<div class="empty-image">${escapeHtml(emptyText)}</div>`}
  </div>`;

const tagsFor = (figure, job) => {
  const tags = [`<span class="tag">${escapeHtml(figure.style)}</span>`];
  tags.push(figure.hasPose ? '<span class="tag good">pose ready</span>' : '<span class="tag bad">no pose</span>');
  if (!figure.hasCurrent) tags.push('<span class="tag warn">missing master</span>');
  if (figure.marked) tags.push('<span class="tag warn">rework</span>');
  if (figure.candidates.length) tags.push(`<span class="tag good">${figure.candidates.length} candidate${figure.candidates.length === 1 ? "" : "s"}</span>`);
  if (job) tags.push(`<span class="tag ${job.state === "failed" ? "bad" : "warn"}">${escapeHtml(job.state)}</span>`);
  return tags.join("");
};

const render = () => {
  const style = form.elements.style.value;
  const visible = style ? state.figures.filter((figure) => figure.style === style) : state.figures;
  const missing = state.figures.filter((figure) => !figure.hasCurrent).length;
  const marked = state.figures.filter((figure) => figure.marked).length;
  const blocked = state.figures.filter((figure) => !figure.hasPose).length;
  summary.textContent = `${state.figures.length} figures · ${missing} missing masters · ${marked} marked · ${blocked} missing pose references · ${state.selected.size} selected`;
  runButton.disabled = state.runActive;

  grid.innerHTML = visible.map((figure) => {
    const latest = figure.candidates[0];
    const job = state.jobs.get(figure.id);
    const classes = ["figure-card", job?.state === "running" ? "running" : "", job?.state === "failed" ? "failed" : ""].filter(Boolean).join(" ");
    return `<article class="${classes}" data-id="${escapeHtml(figure.id)}">
      <header class="card-header">
        <label class="select-title">
          <input class="figure-select" type="checkbox" ${state.selected.has(figure.id) ? "checked" : ""}>
          <span><h2>${escapeHtml(figure.name)}</h2><span class="figure-id">${escapeHtml(figure.id)}</span></span>
        </label>
        <div class="tags">${tagsFor(figure, job)}</div>
      </header>
      <div class="comparison">
        ${imageCell("Teaching pose", figure.poseUrl, "Add teaching-frames/selected.png")}
        ${imageCell(figure.currentIsFallback ? "Fallback card" : "Current master", figure.currentUrl, "No current artwork")}
        ${imageCell("Latest candidate", latest?.url, "Generate a candidate")}
      </div>
      <div class="card-actions">
        <button type="button" data-action="generate" ${figure.hasPose && !state.runActive ? "" : "disabled"}>Generate</button>
        <button type="button" class="secondary" data-action="prompt" ${figure.hasPose ? "" : "disabled"}>Prompt</button>
        <button type="button" class="secondary" data-action="promote" ${latest ? "" : "disabled"}>Promote latest</button>
        <button type="button" class="secondary ${figure.marked ? "danger" : ""}" data-action="mark">${figure.marked ? "Clear rework" : "Mark rework"}</button>
      </div>
      <p class="job-message">${escapeHtml(job?.message || "")}</p>
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

grid.addEventListener("click", async (event) => {
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
    } else if (button.dataset.action === "promote") {
      const latest = figure.candidates[0];
      if (!latest) throw new Error("No candidate is available.");
      if (!confirm(`Promote the latest candidate for ${figure.name}? The current master will be archived.`)) return;
      await request("/api/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, path: latest.path })
      });
      await loadFigures();
    } else if (button.dataset.action === "mark") {
      await request("/api/mark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, marked: !figure.marked })
      });
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
      state.runActive = true;
      runStatus.textContent = `${update.ready} jobs ready; ${update.blocked} blocked.`;
    } else if (type.startsWith("job-") && update.id) {
      const stateName = type.replace("job-", "");
      state.jobs.set(update.id, { state: stateName, message: update.message || (stateName === "completed" ? `${update.candidates} candidate(s) ready` : "") });
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
