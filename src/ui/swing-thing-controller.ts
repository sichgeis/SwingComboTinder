import { figureFor } from "../../figures/catalog";
import { youtubeUrl } from "../../figures/define-figure";
import { moves } from "../domain/catalog";
import { guideFor } from "../domain/localize";
import type { BuildChoice, Language, Move, MoveStyle, MoveTranslation } from "../domain/move";
import {
  createSession,
  movesForStyles,
  reconcileSession,
  recordDecision,
  undoDecision,
  type Session
} from "../domain/session";
import type { LocalSessionStore } from "../infrastructure/local-session-store";
import { classifyCardGesture } from "./card-gesture";
import { adjacentBrowseIndex, figuresForBrowsing } from "./browse-deck";
import { escapeHtml, familyLabel, renderCardMarkup, styleMeta, videoKindLabel, webResourceKindLabel } from "./card-presentation";
import { isIntentionalCardGesture, isIntentionalHorizontalGesture, type TouchPoint } from "./horizontal-gesture";
import { defaultLanguage, translate, type TranslationKey } from "./translations";

interface PointerStart {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  lastX: number;
  lastY: number;
}

type AppMode = "build" | "browse";

const requiredElement = <ElementType extends Element>(selector: string): ElementType => {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Required UI element is missing: ${selector}`);
  return element;
};

export class SwingThingController {
  private session: Session;
  private language: Language;
  private pointer: PointerStart | undefined;
  private browsePointer: PointerStart | undefined;
  private modePointer: PointerStart | undefined;
  private touchStart: TouchPoint | undefined;
  private animating = false;
  private browseAnimating = false;
  private cardFlipped = false;
  private browseCardFlipped = false;
  private suppressModeClick = false;
  private mode: AppMode = "build";
  private browseIndex = 0;
  private toastTimer: number | undefined;
  private buildView: HTMLElement;
  private readonly welcomeView = requiredElement<HTMLElement>("#welcomeView");
  private readonly deckView = requiredElement<HTMLElement>("#deckView");
  private readonly browseView = requiredElement<HTMLElement>("#browseView");
  private readonly resultsView = requiredElement<HTMLElement>("#resultsView");
  private readonly deckStage = requiredElement<HTMLElement>("#deckStage");
  private readonly browseStage = requiredElement<HTMLElement>("#browseStage");
  private readonly activeCard = requiredElement<HTMLElement>("#activeCard");
  private readonly browseCard = requiredElement<HTMLElement>("#browseCard");
  private readonly nextCard = requiredElement<HTMLElement>("#nextCard");
  private readonly cueDialog = requiredElement<HTMLDialogElement>("#cueDialog");

  public constructor(private readonly store: LocalSessionStore) {
    this.session = store.load((styles) => movesForStyles(moves, styles).length);
    this.session = reconcileSession(this.session, movesForStyles(moves, this.session.styles));
    this.language = store.loadLanguage(defaultLanguage);
    this.buildView = this.welcomeView;
    this.browseIndex = store.loadBrowseIndex(this.browseMoves().length);
  }

  public start(): void {
    this.bindEvents();
    this.applyLanguage();
    this.syncFocusControls();
    this.updateResumeButton();
    this.updateModeControls();
  }

  private query<ElementType extends Element>(selector: string): ElementType {
    return requiredElement<ElementType>(selector);
  }

  private t(key: TranslationKey): string {
    return translate(this.language, key);
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
    if (this.mode === "browse") this.renderBrowse();
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

  private browseMoves(): Move[] {
    return figuresForBrowsing(this.activeMoves(), this.session.choices);
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
    this.updateModeControls();
  }

  private showView(view: HTMLElement): void {
    this.buildView = view;
    if (this.mode === "build") {
      for (const section of [this.welcomeView, this.deckView, this.resultsView]) section.hidden = section !== view;
    }
    document.body.classList.toggle("deck-active", this.mode === "build" && view === this.deckView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  private updateModeControls(): void {
    const buildButton = this.query<HTMLButtonElement>("#buildModeButton");
    const browseButton = this.query<HTMLButtonElement>("#browseModeButton");
    buildButton.classList.toggle("is-active", this.mode === "build");
    browseButton.classList.toggle("is-active", this.mode === "browse");
    buildButton.setAttribute("aria-pressed", String(this.mode === "build"));
    browseButton.setAttribute("aria-pressed", String(this.mode === "browse"));
  }

  private showMode(mode: AppMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.cueDialog.close();
    this.browseView.hidden = mode !== "browse";
    for (const section of [this.welcomeView, this.deckView, this.resultsView]) {
      section.hidden = mode !== "build" || section !== this.buildView;
    }
    document.body.classList.toggle("browse-active", mode === "browse");
    document.body.classList.toggle("deck-active", mode === "build" && this.buildView === this.deckView);
    this.updateModeControls();
    if (mode === "browse") this.renderBrowse();
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

  private cardMarkup(move: Move | undefined, index: number, inert = false, deckChoice?: BuildChoice): string {
    if (!move) return "";
    return renderCardMarkup({
      figure: figureFor(move.id),
      language: this.language,
      index,
      inert,
      ...(deckChoice === undefined ? {} : { deckChoice })
    });
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

  private decide(action: BuildChoice): void {
    const move = this.activeMoves()[this.session.index];
    if (this.animating || !move) return;
    this.animating = true;
    const transforms: Record<BuildChoice, string> = {
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

  private renderBrowse(entryDirection?: "left" | "right"): void {
    const preserveDetailView = entryDirection !== undefined && this.browseCardFlipped;
    const deck = this.browseMoves();
    const empty = this.query<HTMLElement>("#browseEmpty");
    const content = this.query<HTMLElement>("#browseDeck");
    empty.hidden = deck.length > 0;
    content.hidden = deck.length === 0;
    if (deck.length === 0) {
      this.browseIndex = 0;
      this.store.saveBrowseIndex(0);
      this.browseAnimating = false;
      return;
    }

    this.browseIndex = Math.min(this.browseIndex, deck.length - 1);
    const move = deck[this.browseIndex];
    if (!move) return;
    this.browseCardFlipped = preserveDetailView;
    this.browseCard.innerHTML = this.cardMarkup(move, this.browseIndex, false, this.session.choices[move.id]);
    this.browseCard.style.transform = "";
    this.browseCard.style.opacity = "";
    this.browseCard.className = `move-card browse-card${this.browseCardFlipped ? " is-flipped" : ""}${entryDirection ? ` entering-${entryDirection}` : ""}`;
    this.applyBrowseCardFace(move);
    this.query<HTMLElement>("#browseCardCount").textContent = `${String(this.browseIndex + 1).padStart(2, "0")} / ${deck.length}`;
    this.query<HTMLElement>("#browseProgressBar").style.width = `${((this.browseIndex + 1) / deck.length) * 100}%`;
    this.store.saveBrowseIndex(this.browseIndex);
    this.browseAnimating = false;
  }

  private toggleBrowseCard(): void {
    if (this.browseAnimating) return;
    const move = this.browseMoves()[this.browseIndex];
    if (!move) return;
    this.browseCardFlipped = !this.browseCardFlipped;
    this.applyBrowseCardFace(move);
  }

  private applyBrowseCardFace(move: Move): void {
    this.browseCard.classList.toggle("is-flipped", this.browseCardFlipped);
    this.browseCard.setAttribute("aria-pressed", String(this.browseCardFlipped));
    this.browseCard.setAttribute("aria-label", `${move.name}. ${this.t(this.browseCardFlipped ? "tapForFront" : "tapForGuide")}`);
    const front = this.browseCard.querySelector<HTMLElement>("[data-card-face=\"front\"]");
    const back = this.browseCard.querySelector<HTMLElement>("[data-card-face=\"back\"]");
    front?.setAttribute("aria-hidden", String(this.browseCardFlipped));
    back?.setAttribute("aria-hidden", String(!this.browseCardFlipped));
    if (!this.browseCardFlipped) back?.querySelector<HTMLElement>("[data-card-scroll]")?.scrollTo({ top: 0 });
  }

  private browse(direction: "previous" | "next"): void {
    const deck = this.browseMoves();
    if (this.browseAnimating || deck.length < 2) return;
    this.browseAnimating = true;
    const leavingDirection = direction === "next" ? "left" : "right";
    this.browseCard.classList.add(`leaving-${leavingDirection}`);
    window.setTimeout(() => {
      this.browseIndex = adjacentBrowseIndex(this.browseIndex, deck.length, direction);
      this.renderBrowse(direction === "next" ? "right" : "left");
    }, 210);
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

  private finishBrowsePointer(event: PointerEvent): void {
    if (!this.browsePointer || this.browsePointer.id !== event.pointerId) return;
    const dx = event.clientX - this.browsePointer.x;
    const dy = event.clientY - this.browsePointer.y;
    this.browsePointer = undefined;
    this.browseCard.classList.remove("dragging");
    if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy)) this.browse(dx < 0 ? "next" : "previous");
    else if (Math.max(Math.abs(dx), Math.abs(dy)) < 9) this.toggleBrowseCard();
    else this.browseCard.style.transform = "";
  }

  private finishModePointer(event: PointerEvent): void {
    if (!this.modePointer || this.modePointer.id !== event.pointerId) return;
    const dx = event.clientX - this.modePointer.x;
    const dy = event.clientY - this.modePointer.y;
    this.modePointer = undefined;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
      event.preventDefault();
      this.suppressModeClick = true;
      this.showMode(dx < 0 ? "browse" : "build");
      window.setTimeout(() => { this.suppressModeClick = false; }, 0);
    }
  }

  private openCue(): void {
    const move = this.activeMoves()[this.session.index];
    if (!move) return;
    const guide = guideFor(move, this.language);
    this.query<HTMLElement>("#cueTitle").textContent = move.name;
    this.query<HTMLElement>("#cueStyle").textContent = `${styleMeta[move.style].label} · ${familyLabel(this.language, move.family)}`;
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
    const figure = figureFor(move.id);
    const videos = figure.youtube.cardLinks;
    const resources = (figure.resources?.cardLinks ?? []).filter((resource) => !resource.language || resource.language === this.language);
    const videoSection = this.query<HTMLElement>("#cueVideos");
    videoSection.hidden = videos.length === 0 && resources.length === 0;
    this.query<HTMLElement>("#cueVideoList").innerHTML = `${videos.map((video) => `
      <a class="guide-video-link" href="${escapeHtml(youtubeUrl(video.videoId))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(this.t("openOnYouTube"))}: ${escapeHtml(video.title)}">
        <span class="video-play" aria-hidden="true">▶</span>
        <span class="video-copy"><small>${escapeHtml(videoKindLabel(this.language, video.kind))}</small><strong>${escapeHtml(video.title)}</strong></span>
        <span class="video-external" aria-hidden="true">↗</span>
      </a>`).join("")}${resources.map((resource) => `
      <a class="guide-video-link" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(resource.title)}">
        <span class="video-play" aria-hidden="true">↗</span>
        <span class="video-copy"><small>${escapeHtml(webResourceKindLabel(this.language, resource.kind))}</small><strong>${escapeHtml(resource.title)}</strong></span>
        <span class="video-external" aria-hidden="true">↗</span>
      </a>`).join("")}`;
    if (!this.cueDialog.open) this.cueDialog.showModal();
  }

  private showResults(): void {
    const deck = this.activeMoves();
    this.showView(this.resultsView);
    const count = (choice: BuildChoice): number => Object.values(this.session.choices).filter((value) => value === choice).length;
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
    const focus = this.session.styles.map((style) => styleMeta[style].label).join(" + ");
    const selected = this.activeMoves().filter(({ id }) => this.session.choices[id] !== "pass");
    const practice = selected.filter(({ id }) => this.session.choices[id] === "star");
    const comfortable = selected.filter(({ id }) => this.session.choices[id] !== "star");
    const names = (items: readonly Move[]): string => items.length > 0 ? items.map(({ name }) => name).join(", ") : "—";
    const text = this.language === "de"
      ? `Mein Swing-Thing-Deck für heute (${focus}):\n\nKann ich: ${names(comfortable)}\n\nHeute üben: ${names(practice)}`
      : `My Swing Thing deck for tonight (${focus}):\n\nGot it: ${names(comfortable)}\n\nTry tonight: ${names(practice)}`;
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
    this.query("#buildModeButton").addEventListener("click", () => {
      if (!this.suppressModeClick) this.showMode("build");
    });
    this.query("#browseModeButton").addEventListener("click", () => {
      if (!this.suppressModeClick) this.showMode("browse");
    });
    this.query("#browseSetButton").addEventListener("click", () => this.showMode("browse"));
    this.query("#emptyBuildButton").addEventListener("click", () => {
      this.showView(this.welcomeView);
      this.showMode("build");
    });
    this.query("#startButton").addEventListener("click", () => this.startDeck(true));
    this.query("#resumeButton").addEventListener("click", () => this.startDeck(false));
    this.query("#closeDialog").addEventListener("click", () => this.cueDialog.close());
    this.query("#gotItButton").addEventListener("click", () => this.cueDialog.close());
    this.query("#shareButton").addEventListener("click", () => void this.shareSet());
    this.query("#replayButton").addEventListener("click", () => this.resetToWelcome());
    this.query("#brandButton").addEventListener("click", () => {
      this.syncFocusControls(); this.updateResumeButton(); this.showView(this.welcomeView); this.showMode("build");
    });
    this.query("#resetButton").addEventListener("click", () => this.resetToWelcome(this.t("deckReset")));
    this.query("#languageButton").addEventListener("click", () => this.toggleLanguage());
    document.querySelectorAll("[data-focus-style]").forEach((input) => input.addEventListener("change", () => this.renderFocusSelection()));

    const modeSwitch = this.query<HTMLElement>("#modeSwitch");
    modeSwitch.addEventListener("pointerdown", (event) => {
      this.modePointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
    });
    modeSwitch.addEventListener("pointerup", (event) => this.finishModePointer(event));
    modeSwitch.addEventListener("pointercancel", () => { this.modePointer = undefined; });

    const main = this.query<HTMLElement>("main");
    main.addEventListener("pointerdown", (event) => {
      if (!(event.target instanceof Element) || event.target.closest("button, a, input, label, .deck-stage, .browse-stage")) return;
      this.modePointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
    });
    main.addEventListener("pointerup", (event) => this.finishModePointer(event));
    main.addEventListener("pointercancel", () => { this.modePointer = undefined; });

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

    this.browseStage.addEventListener("pointerdown", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("#browseCard")) return;
      if (this.browseAnimating || event.target.closest("a, button")) return;
      this.browsePointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
      if (!this.browseCardFlipped) {
        try { this.browseCard.setPointerCapture(event.pointerId); } catch { /* Window handlers are the fallback. */ }
      }
    });
    this.browseStage.addEventListener("pointermove", (event) => {
      if (this.browsePointer?.id !== event.pointerId) return;
      const dx = event.clientX - this.browsePointer.x;
      const dy = event.clientY - this.browsePointer.y;
      if (this.browseCardFlipped && Math.abs(dy) >= Math.abs(dx)) return;
      if (Math.abs(dx) > 8) this.browseCard.classList.add("dragging");
      this.browseCard.style.transform = `translateX(${dx}px) rotate(${dx * .025}deg)`;
    });
    this.browseStage.addEventListener("pointerup", (event) => this.finishBrowsePointer(event));
    this.browseStage.addEventListener("pointercancel", (event) => this.finishBrowsePointer(event));
    window.addEventListener("pointerup", (event) => this.finishBrowsePointer(event));
    window.addEventListener("pointercancel", (event) => this.finishBrowsePointer(event));

    document.addEventListener("keydown", (event) => {
      if (this.cueDialog.open) return;
      if (this.mode === "browse") {
        if (event.key === "ArrowLeft") this.browse("previous");
        else if (event.key === "ArrowRight") this.browse("next");
        else if (event.key === " " || event.key === "Enter") { event.preventDefault(); this.toggleBrowseCard(); }
        return;
      }
      if (this.deckView.hidden) return;
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
