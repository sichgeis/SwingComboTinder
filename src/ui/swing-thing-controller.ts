import { figureFor } from "../../figures/catalog";
import { youtubeUrl, type VideoKind } from "../../figures/define-figure";
import { moves } from "../domain/catalog";
import { generateCombos, type Combo } from "../domain/combos";
import { guideFor } from "../domain/localize";
import type { Choice, Language, Move, MoveStyle, MoveTranslation } from "../domain/move";
import {
  createSession,
  incrementComboSeed,
  movesForStyles,
  reconcileSession,
  recordDecision,
  undoDecision,
  type Session
} from "../domain/session";
import type { LocalSessionStore } from "../infrastructure/local-session-store";
import { classifyCardGesture } from "./card-gesture";
import { isIntentionalCardGesture, isIntentionalHorizontalGesture, type TouchPoint } from "./horizontal-gesture";
import { defaultLanguage, translate, type TranslationKey } from "./translations";

const styleMeta: Record<MoveStyle, { label: string; short: string }> = {
  lindy: { label: "Lindy Hop", short: "Lindy" },
  charleston: { label: "Charleston", short: "Charleston" },
  shag: { label: "Collegiate Shag", short: "Shag" }
};

const germanMeta: Readonly<Record<string, string>> = {
  Circular: "Kreisförmig", Linear: "Linear", Turn: "Drehung", Position: "Position", Rhythm: "Rhythmus",
  Transition: "Übergang", Travel: "Reise", Rotational: "Rotierend", "Charleston Turn": "Charleston-Drehung",
  Charleston: "Charleston", Tandem: "Tandem", "Shag Rhythm": "Shag-Rhythmus", "Shag Turn": "Shag-Drehung",
  Open: "Open", Closed: "Closed", "Closed / Open": "Closed / Open", "Side-by-side": "Side-by-Side",
  "6 count": "6 Counts", "8 count": "8 Counts", "6 or 8 count": "6 oder 8 Counts", "6 or 12 count": "6 oder 12 Counts",
  "8 or 16 count": "8 oder 16 Counts", Any: "Beliebig", "As musical": "Musikalisch", Vertical: "Vertikal",
  "Closed / Side-by-side": "Closed / Side-by-Side", "Open / Closed": "Open / Closed", "Open / Side-by-side": "Open / Side-by-Side",
  "Tandem / Open": "Tandem / Open", Wrapped: "Gewickelt",
  "Comfort move": "Sichere Figur", "Almost there": "Fast geschafft", "Tonight's goal": "Ziel für heute",
  "Practice pick": "Übungsfigur", Curious: "Neugierig", Rusty: "Eingerostet", "Maybe I know it": "Vielleicht bekannt",
  "New territory": "Neuland", "Stretch goal": "Herausforderung"
};

const germanComboCopy = [
  { label: "01 · WARM-UP", title: "Findet den gemeinsamen Rhythmus", note: "Beginnt mit Puls und einem einfachen Weg. Lasst den gewählten Stil ankommen, bevor eine größere Drehung dazukommt." },
  { label: "02 · FLOW-SCHLEIFE", title: "Reisen, drehen, neu verbinden", note: "Haltet jeden Übergang lesbar. Der Wechsel des Bewegungswegs ist wichtiger, als jede Figur unterzubringen." },
  { label: "03 · KLEINES ABENTEUER", title: "Eine mutige kleine Entscheidung", note: "Probiert den Spotlight-Move einmal mit gutem Platz. Wird die Verbindung unklar, kehrt zu Puls und vertrautem Weg zurück." }
] as const;

interface PointerStart {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  lastX: number;
  lastY: number;
}

const requiredElement = <ElementType extends Element>(selector: string): ElementType => {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Required UI element is missing: ${selector}`);
  return element;
};

export class SwingThingController {
  private session: Session;
  private language: Language;
  private pointer: PointerStart | undefined;
  private touchStart: TouchPoint | undefined;
  private animating = false;
  private cardFlipped = false;
  private toastTimer: number | undefined;
  private readonly welcomeView = requiredElement<HTMLElement>("#welcomeView");
  private readonly deckView = requiredElement<HTMLElement>("#deckView");
  private readonly resultsView = requiredElement<HTMLElement>("#resultsView");
  private readonly deckStage = requiredElement<HTMLElement>("#deckStage");
  private readonly activeCard = requiredElement<HTMLElement>("#activeCard");
  private readonly nextCard = requiredElement<HTMLElement>("#nextCard");
  private readonly cueDialog = requiredElement<HTMLDialogElement>("#cueDialog");

  public constructor(private readonly store: LocalSessionStore) {
    this.session = store.load((styles) => movesForStyles(moves, styles).length);
    this.session = reconcileSession(this.session, movesForStyles(moves, this.session.styles));
    this.language = store.loadLanguage(defaultLanguage);
  }

  public start(): void {
    this.bindEvents();
    this.applyLanguage();
    this.syncFocusControls();
    this.updateResumeButton();
  }

  private query<ElementType extends Element>(selector: string): ElementType {
    return requiredElement<ElementType>(selector);
  }

  private t(key: TranslationKey): string {
    return translate(this.language, key);
  }

  private meta(value: string): string {
    return this.language === "de" ? (germanMeta[value] ?? value) : value;
  }

  private videoKind(kind: VideoKind): string {
    const keys: Record<VideoKind, TranslationKey> = {
      tutorial: "videoTutorial", technique: "videoTechnique", variation: "videoVariation", history: "videoHistory"
    };
    return this.t(keys[kind]);
  }

  private applyLanguage(): void {
    document.documentElement.lang = this.language;
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n as TranslationKey | undefined;
      if (key) element.textContent = this.t(key);
    });
    document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((element) => {
      const key = element.dataset.i18nHtml as TranslationKey | undefined;
      if (key) element.innerHTML = this.t(key);
    });
    this.query<HTMLElement>("#languageCurrent").textContent = this.language.toUpperCase();
    this.query<HTMLElement>("#languageOther").textContent = this.language === "en" ? "DE" : "EN";
    this.query<HTMLButtonElement>("#languageButton").ariaLabel = this.t("languageAria");
    this.query<HTMLButtonElement>("#resetButton").ariaLabel = this.t("resetAria");
    this.renderFocusSelection();
    this.updateResumeButton();
    if (!this.deckView.hidden) this.renderDeck();
    else if (!this.resultsView.hidden) this.showResults();
    if (this.cueDialog.open) this.openCue();
  }

  private toggleLanguage(): void {
    this.language = this.language === "en" ? "de" : "en";
    this.store.saveLanguage(this.language);
    this.applyLanguage();
  }

  private activeMoves(): Move[] {
    return movesForStyles(moves, this.session.styles);
  }

  private selectedFocusStyles(): MoveStyle[] {
    return [...document.querySelectorAll<HTMLInputElement>("[data-focus-style]:checked")]
      .map(({ value }) => value)
      .filter((value): value is MoveStyle => value in styleMeta);
  }

  private syncFocusControls(styles = this.session.styles): void {
    document.querySelectorAll<HTMLInputElement>("[data-focus-style]").forEach((input) => {
      input.checked = styles.includes(input.value as MoveStyle);
    });
    this.renderFocusSelection();
  }

  private renderFocusSelection(): void {
    const styles = this.selectedFocusStyles();
    const count = movesForStyles(moves, styles).length;
    document.querySelectorAll<HTMLElement>("[data-style-count]").forEach((element) => {
      element.textContent = String(moves.filter(({ style }) => style === element.dataset.styleCount).length);
    });
    this.query<HTMLElement>("#selectedMoveCount").textContent = String(count);
    this.query<HTMLButtonElement>("#startButton").disabled = count === 0;
    this.query<HTMLElement>("#focusHint").textContent = count > 0
      ? `${count} ${this.t("figuresSelected")}`
      : this.t("chooseStyle");
  }

  private updateResumeButton(): void {
    const button = this.query<HTMLButtonElement>("#resumeButton");
    const deckLength = this.activeMoves().length;
    button.hidden = !(this.session.index > 0 && this.session.index <= deckLength);
    button.textContent = this.session.index === deckLength ? this.t("resumeComplete") : this.t("resume");
  }

  private saveSession(): void {
    if (!this.store.save(this.session)) this.showToast(this.t("saveFailed"));
  }

  private showView(view: HTMLElement): void {
    for (const section of [this.welcomeView, this.deckView, this.resultsView]) section.hidden = section !== view;
    document.body.classList.toggle("deck-active", view === this.deckView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  private startDeck(fresh: boolean): void {
    if (fresh) {
      const styles = this.selectedFocusStyles();
      if (styles.length === 0) { this.showToast(this.t("choiceNeeded")); return; }
      this.session = createSession(styles);
    }
    this.showView(this.deckView);
    this.renderDeck();
    this.saveSession();
  }

  private guideSections(move: Move): ReadonlyArray<{ readonly heading: string; readonly copy: string }> {
    const guide = guideFor(move, this.language);
    if (this.language === "de") {
      const translated = guide as MoveTranslation;
      return [
        { heading: translated.headings.steps, copy: translated.steps },
        { heading: translated.headings.body, copy: translated.body },
        { heading: translated.headings.lead, copy: translated.lead },
        { heading: translated.headings.follow, copy: translated.follow },
        { heading: translated.headings.connection, copy: translated.connection },
        { heading: translated.headings.practice, copy: translated.practice }
      ];
    }
    return [
      { heading: this.t("rhythmHeading"), copy: guide.steps },
      { heading: this.t("bodyHeading"), copy: guide.body },
      { heading: this.t("leadHeading"), copy: guide.lead },
      { heading: this.t("connectionHeading"), copy: guide.connection }
    ];
  }

  private cardMarkup(move: Move | undefined, index: number, inert = false): string {
    if (!move) return "";
    const guide = guideFor(move, this.language);
    const figure = figureFor(move.id);
    const image = figure.card;
    const sections = this.guideSections(move);
    const videos = figure.youtube.cardLinks;
    return `
      <div class="card-inner">
        <section class="card-face card-front" data-card-face="front">
          <div class="card-art" style="--card-art: url('${image}')"></div>
          <div class="card-grain"></div>
          <div class="card-content">
            <div class="card-top"><span class="family-pill">${this.meta(move.family)}</span><span class="familiarity-pill">${this.meta(move.familiarity)}</span></div>
            <div class="card-bottom">
              <span class="move-number">MOVE ${String(index + 1).padStart(2, "0")}</span>
              <h2>${move.name}</h2>${this.language === "en" ? `<p class="alias">${move.alias}</p>` : ""}<p class="move-description">${guide.description}</p>
              <div class="move-meta"><span>${styleMeta[move.style].short}</span><span>${this.meta(move.count)}</span><span>${this.meta(move.motion)}</span><span>${this.t("ends")} ${this.meta(move.end)}</span></div>
            </div>
          </div>
        </section>
        <section class="card-face card-back" data-card-face="back" aria-hidden="true">
          <div class="card-back-scroll" data-card-scroll>
            <div class="card-back-heading">
              <span class="move-number">MOVE ${String(index + 1).padStart(2, "0")} · ${styleMeta[move.style].short}</span>
              <h2>${move.name}</h2>
              <p class="card-back-intro">${guide.description}</p>
            </div>
            <div class="card-guide-sections">
              ${sections.map(({ heading, copy }) => `<section class="card-guide-section"><h3>${heading}</h3><p>${copy}</p></section>`).join("")}
            </div>
            <div class="card-memory"><span>${this.t("remember")}</span><strong>${guide.cue}</strong></div>
            ${videos.length === 0 ? "" : `<section class="card-videos"><h3>${this.t("videosHeading")}</h3>${videos.map((video) => `<a href="${youtubeUrl(video.videoId)}" target="_blank" rel="noopener noreferrer" ${inert ? "tabindex=\"-1\"" : ""}><span aria-hidden="true">▶</span><span><small>${this.videoKind(video.kind)}</small><strong>${video.title}</strong></span><b aria-hidden="true">↗</b></a>`).join("")}</section>`}
            <p class="card-guide-note">${this.t("guideNote")}</p>
          </div>
        </section>
      </div>`;
  }

  private renderDeck(): void {
    const deck = this.activeMoves();
    if (this.session.index >= deck.length) { this.showResults(); return; }
    const move = deck[this.session.index];
    if (!move) return;
    this.cardFlipped = false;
    this.activeCard.innerHTML = this.cardMarkup(move, this.session.index);
    this.activeCard.setAttribute("aria-label", `${move.name}. ${this.t("tapForGuide")}`);
    this.activeCard.setAttribute("aria-pressed", "false");
    this.nextCard.innerHTML = this.cardMarkup(deck[this.session.index + 1], this.session.index + 1, true);
    this.nextCard.hidden = this.session.index + 1 >= deck.length;
    this.activeCard.style.transform = "";
    this.activeCard.style.opacity = "";
    this.activeCard.classList.remove("leaving", "dragging", "is-flipped");
    this.resetStamps();
    this.query<HTMLElement>("#cardCount").textContent = `${String(this.session.index + 1).padStart(2, "0")} / ${deck.length}`;
    this.query<HTMLElement>("#deckFocus").textContent = this.session.styles.map((style) => styleMeta[style].short).join(" + ");
    this.query<HTMLElement>("#progressBar").style.width = `${(this.session.index / deck.length) * 100}%`;
    this.animating = false;
  }

  private decide(action: Choice): void {
    const move = this.activeMoves()[this.session.index];
    if (this.animating || !move) return;
    this.animating = true;
    const transforms: Record<Choice, string> = {
      pass: "translate(-145%, 18px) rotate(-18deg)", keep: "translate(145%, 18px) rotate(18deg)", star: "translate(0, -130%) rotate(-3deg)"
    };
    this.activeCard.classList.add("leaving");
    this.activeCard.style.transform = transforms[action];
    this.activeCard.style.opacity = "0";
    navigator.vibrate?.(action === "star" ? [12, 25, 12] : 12);
    window.setTimeout(() => {
      this.session = reconcileSession(recordDecision(this.session, move, action), this.activeMoves());
      this.saveSession();
      this.renderDeck();
    }, 270);
  }

  private undo(): void {
    if (this.animating || this.session.history.length === 0) return;
    this.session = undoDecision(this.session);
    this.saveSession();
    this.renderDeck();
    this.showToast(this.t("lastUndone"));
  }

  private toggleCard(): void {
    if (this.animating) return;
    this.cardFlipped = !this.cardFlipped;
    this.activeCard.classList.toggle("is-flipped", this.cardFlipped);
    this.activeCard.setAttribute("aria-pressed", String(this.cardFlipped));
    this.activeCard.setAttribute("aria-label", `${this.activeMoves()[this.session.index]?.name ?? ""}. ${this.t(this.cardFlipped ? "tapForFront" : "tapForGuide")}`);
    const front = this.activeCard.querySelector<HTMLElement>("[data-card-face=\"front\"]");
    const back = this.activeCard.querySelector<HTMLElement>("[data-card-face=\"back\"]");
    front?.setAttribute("aria-hidden", String(this.cardFlipped));
    back?.setAttribute("aria-hidden", String(!this.cardFlipped));
    if (!this.cardFlipped) back?.querySelector<HTMLElement>("[data-card-scroll]")?.scrollTo({ top: 0 });
  }

  private resetStamps(): void {
    for (const selector of ["#stampLeft", "#stampRight", "#stampUp"]) this.query<HTMLElement>(selector).style.opacity = "0";
  }

  private updateDrag(dx: number, dy: number): void {
    this.activeCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.035}deg)`;
    this.query<HTMLElement>("#stampLeft").style.opacity = String(Math.min(Math.max(-dx / 100, 0), 1));
    this.query<HTMLElement>("#stampRight").style.opacity = String(Math.min(Math.max(dx / 100, 0), 1));
    this.query<HTMLElement>("#stampUp").style.opacity = String(Math.min(Math.max(-dy / 100, 0), 1) * (1 - Math.min(Math.abs(dx) / 160, 0.7)));
  }

  private resetDrag(): void {
    this.activeCard.style.transform = "";
    this.resetStamps();
  }

  private finishPointer(event: PointerEvent, allowTap = true): void {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    this.pointer.lastX = event.clientX;
    this.pointer.lastY = event.clientY;
    this.finishPointerAt(this.pointer.lastX, this.pointer.lastY, allowTap);
  }

  private finishPointerAt(clientX: number, clientY: number, allowTap: boolean): void {
    if (!this.pointer) return;
    const dx = clientX - this.pointer.x;
    const dy = clientY - this.pointer.y;
    this.pointer = undefined;
    this.activeCard.classList.remove("dragging");
    const gesture = classifyCardGesture(dx, dy, { flipped: this.cardFlipped });
    if (gesture === "tap" && allowTap) this.toggleCard();
    else if (gesture === "star" || gesture === "keep" || gesture === "pass") this.decide(gesture);
    else this.resetDrag();
  }

  private cancelPointer(event: PointerEvent): void {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    // Mobile Safari can cancel a captured pointer as the finger leaves the
    // viewport. Preserve a clearly completed swipe, but never turn a cancel
    // into a tap.
    this.finishPointerAt(this.pointer.lastX, this.pointer.lastY, false);
  }

  private openCue(): void {
    const move = this.activeMoves()[this.session.index];
    if (!move) return;
    const guide = guideFor(move, this.language);
    this.query<HTMLElement>("#cueTitle").textContent = move.name;
    this.query<HTMLElement>("#cueStyle").textContent = `${styleMeta[move.style].label} · ${this.meta(move.family)}`;
    const headings = this.language === "de" ? (guide as MoveTranslation).headings : {
      steps: this.t("rhythmHeading"), body: this.t("bodyHeading"), lead: this.t("leadHeading"), connection: this.t("connectionHeading")
    };
    this.query<HTMLElement>("#cueStepsHeading").textContent = headings.steps;
    this.query<HTMLElement>("#cueBodyHeading").textContent = headings.body;
    this.query<HTMLElement>("#cueLeadHeading").textContent = headings.lead;
    this.query<HTMLElement>("#cueConnectionHeading").textContent = headings.connection;
    this.query<HTMLElement>("#cueSteps").textContent = guide.steps;
    this.query<HTMLElement>("#cueBody").textContent = guide.body;
    this.query<HTMLElement>("#cueLead").textContent = guide.lead;
    this.query<HTMLElement>("#cueConnection").textContent = guide.connection;
    const translatedGuide = this.language === "de" ? guide as MoveTranslation : undefined;
    const followSection = this.query<HTMLElement>("#cueFollowSection");
    const practiceSection = this.query<HTMLElement>("#cuePracticeSection");
    followSection.hidden = !translatedGuide;
    practiceSection.hidden = !translatedGuide;
    if (translatedGuide) {
      this.query<HTMLElement>("#cueFollowHeading").textContent = translatedGuide.headings.follow ?? "Als Follow";
      this.query<HTMLElement>("#cuePracticeHeading").textContent = translatedGuide.headings.practice ?? "Frage zum Üben";
      this.query<HTMLElement>("#cueFollow").textContent = translatedGuide.follow;
      this.query<HTMLElement>("#cuePractice").textContent = translatedGuide.practice;
    }
    this.query<HTMLElement>("#cueMemory").textContent = guide.cue;
    this.query<HTMLElement>("#cueFlow").textContent = move.flows;
    const videos = figureFor(move.id).youtube.cardLinks;
    const videoSection = this.query<HTMLElement>("#cueVideos");
    videoSection.hidden = videos.length === 0;
    this.query<HTMLElement>("#cueVideoList").innerHTML = videos.map((video) => `
      <a class="guide-video-link" href="${youtubeUrl(video.videoId)}" target="_blank" rel="noopener noreferrer" aria-label="${this.t("openOnYouTube")}: ${video.title}">
        <span class="video-play" aria-hidden="true">▶</span>
        <span class="video-copy"><small>${this.videoKind(video.kind)}</small><strong>${video.title}</strong></span>
        <span class="video-external" aria-hidden="true">↗</span>
      </a>`).join("");
    if (!this.cueDialog.open) this.cueDialog.showModal();
  }

  private renderCombos(): Combo[] {
    const combos = generateCombos(this.activeMoves(), this.session);
    this.query<HTMLElement>("#comboList").innerHTML = combos.map((combo, index) => `
      <article class="combo-card" data-index="${index + 1}"><span class="combo-label">${this.language === "de" ? germanComboCopy[index]?.label : combo.label}</span><h3>${this.comboTitle(combo, index)}</h3>
        <div class="combo-steps">${combo.steps.map((move, step) => `${step > 0 ? "<i>→</i>" : ""}<span>${move.name}</span>`).join("")}</div>
        <p class="combo-note">${this.language === "de" ? germanComboCopy[index]?.note : combo.note}</p></article>`).join("");
    return combos;
  }

  private comboTitle(combo: Combo, index: number): string {
    if (this.language === "en") return combo.title;
    if (index === 2 && combo.title.startsWith("Spotlight:")) return combo.title;
    return germanComboCopy[index]?.title ?? combo.title;
  }

  private showResults(): void {
    const deck = this.activeMoves();
    this.showView(this.resultsView);
    const count = (choice: Choice): number => Object.values(this.session.choices).filter((value) => value === choice).length;
    const keeps = count("keep");
    const stars = count("star");
    const passes = count("pass");
    const ready = keeps + stars;
    this.query<HTMLElement>("#resultsFocus").textContent = this.session.styles.map((style) => styleMeta[style].label).join(" · ");
    this.query<HTMLElement>("#scoreValue").textContent = String(ready);
    this.query<HTMLElement>("#resultsIntro").textContent = this.language === "de"
      ? (stars > 0
          ? `${keeps} sichere Figuren und ${stars} kleine${stars === 1 ? "s" : ""} Abenteuer. Das ist mehr als genug Vokabular für einen spielerischen Abend.`
          : `${keeps} sichere Figuren, ohne Druck, etwas beweisen zu müssen. Wähle eine Drehung als Experiment, wenn der Moment passt.`)
      : (stars > 0
          ? `${keeps} comfortable moves and ${stars} little adventure${stars === 1 ? "" : "s"}. That is more than enough vocabulary for a playful night.`
          : `${keeps} comfortable moves, zero pressure to prove anything. Pick one turn as an experiment when the moment feels right.`);
    this.query<HTMLElement>("#resultSummary").innerHTML = `
      <div class="summary-stat"><strong>${keeps}</strong><span>${this.t("comfortable")}</span></div>
      <div class="summary-stat"><strong>${stars}</strong><span>${this.t("adventure")}</span></div>
      <div class="summary-stat"><strong>${passes}</strong><span>${this.t("later")}</span></div>`;
    const ratio = deck.length > 0 ? Math.min(ready / deck.length, 1) : 0;
    requestAnimationFrame(() => { this.query<SVGElement>("#scoreCircle").style.strokeDashoffset = String(327 * (1 - ratio)); });
    this.renderCombos();
    this.saveSession();
  }

  private showToast(message: string): void {
    const toast = this.query<HTMLElement>("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  private async shareSet(): Promise<void> {
    const combos = generateCombos(this.activeMoves(), this.session);
    const focus = this.session.styles.map((style) => styleMeta[style].label).join(" + ");
    const comboText = combos.map((combo, index) => `${this.comboTitle(combo, index)}: ${combo.steps.map(({ name }) => name).join(" → ")}`).join("\n\n");
    const text = this.language === "de"
      ? `Mein Swing-Thing-Set für heute (${focus}):\n\n${comboText}\n\nReset: atmen → Puls finden → einen vertrauten Weg wählen.`
      : `My Swing Thing set for tonight (${focus}):\n\n${comboText}\n\nReset: breathe → find the pulse → choose a familiar pathway.`;
    try {
      if (navigator.share) await navigator.share({ title: "My Swing Thing pocket set", text });
      else { await navigator.clipboard.writeText(text); this.showToast(this.t("copied")); }
    } catch (error: unknown) {
      if (!(error instanceof DOMException) || error.name !== "AbortError") this.showToast(this.t("shareFailed"));
    }
  }

  private resetToWelcome(message?: string): void {
    this.session = createSession(this.session.styles);
    this.saveSession();
    this.syncFocusControls();
    this.updateResumeButton();
    this.showView(this.welcomeView);
    if (message) this.showToast(message);
  }

  private bindEvents(): void {
    this.query("#startButton").addEventListener("click", () => this.startDeck(true));
    this.query("#resumeButton").addEventListener("click", () => this.startDeck(false));
    this.query("#closeDialog").addEventListener("click", () => this.cueDialog.close());
    this.query("#gotItButton").addEventListener("click", () => this.cueDialog.close());
    this.query("#shareButton").addEventListener("click", () => void this.shareSet());
    this.query("#replayButton").addEventListener("click", () => this.resetToWelcome());
    this.query("#brandButton").addEventListener("click", () => {
      this.syncFocusControls(); this.updateResumeButton(); this.showView(this.welcomeView);
    });
    this.query("#resetButton").addEventListener("click", () => this.resetToWelcome(this.t("deckReset")));
    this.query("#languageButton").addEventListener("click", () => this.toggleLanguage());
    this.query("#shuffleButton").addEventListener("click", (event) => {
      this.session = incrementComboSeed(this.session);
      this.saveSession();
      this.renderCombos();
      const button = event.currentTarget as HTMLElement;
      button.classList.remove("spinning");
      requestAnimationFrame(() => button.classList.add("spinning"));
    });
    document.querySelectorAll("[data-focus-style]").forEach((input) => input.addEventListener("change", () => this.renderFocusSelection()));

    this.deckStage.addEventListener("pointerdown", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("#activeCard")) return;
      if (this.animating || (event.target instanceof Element && event.target.closest("a, button"))) return;
      this.pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY
      };
      if (!this.cardFlipped) {
        try {
          this.activeCard.setPointerCapture(event.pointerId);
        } catch {
          // The window-level finish handlers below remain as a Safari fallback.
        }
      }
    });
    this.deckStage.addEventListener("pointermove", (event) => {
      if (this.pointer?.id !== event.pointerId) return;
      this.pointer.lastX = event.clientX;
      this.pointer.lastY = event.clientY;
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      if (this.cardFlipped && Math.abs(dy) >= Math.abs(dx)) return;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) this.activeCard.classList.add("dragging");
      this.updateDrag(dx, dy);
    });
    this.deckStage.addEventListener("pointerup", (event) => this.finishPointer(event));
    this.deckStage.addEventListener("pointercancel", (event) => this.cancelPointer(event));
    this.activeCard.addEventListener("lostpointercapture", (event) => this.cancelPointer(event));
    window.addEventListener("pointerup", (event) => this.finishPointer(event));
    window.addEventListener("pointercancel", (event) => this.cancelPointer(event));
    document.addEventListener("keydown", (event) => {
      if (this.deckView.hidden || this.cueDialog.open) return;
      if (event.key === "ArrowLeft") this.decide("pass");
      else if (event.key === "ArrowRight") this.decide("keep");
      else if (event.key === "ArrowUp") this.decide("star");
      else if (event.key === "Backspace") this.undo();
      else if (event.key === " " || event.key === "Enter") { event.preventDefault(); this.toggleCard(); }
    });

    document.addEventListener("touchstart", (event) => {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      this.touchStart = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
    }, { passive: true });
    document.addEventListener("touchmove", (event) => {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      if (!this.touchStart || !touch) return;
      const current = { x: touch.clientX, y: touch.clientY };
      const beganOnActiveCard = event.target instanceof Node && this.activeCard.contains(event.target);
      const isFrontCardDrag = !this.cardFlipped && beganOnActiveCard && isIntentionalCardGesture(this.touchStart, current);
      if (isFrontCardDrag || isIntentionalHorizontalGesture(this.touchStart, current)) {
        event.preventDefault();
      }
    }, { passive: false });
    const finishTouch = (): void => { this.touchStart = undefined; };
    document.addEventListener("touchend", finishTouch, { passive: true });
    document.addEventListener("touchcancel", finishTouch, { passive: true });
    window.addEventListener("scroll", () => {
      if (window.scrollX !== 0) window.scrollTo({ left: 0, top: window.scrollY, behavior: "instant" });
    }, { passive: true });
  }
}
