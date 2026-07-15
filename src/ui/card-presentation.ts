import { youtubeUrl, type FigureDefinition, type VideoKind, type WebResourceKind } from "../../figures/define-figure";
import type {
  BuildChoice,
  CountPattern,
  EndPosition,
  Language,
  MotionKind,
  MoveEnding,
  MoveFamily,
  MoveStyle
} from "../domain/move";
import { parseGuideBody, type GuideSection } from "../domain/guide-body";
import { translate, type TranslationKey } from "./translations";

export const styleMeta: Record<MoveStyle, { label: string; short: string }> = {
  lindy: { label: "Lindy Hop", short: "Lindy" },
  charleston: { label: "Charleston", short: "Charleston" },
  shag: { label: "Collegiate Shag", short: "Shag" }
};

const familyLabels: Record<MoveFamily, Record<Language, string>> = {
  circular: { en: "Circular", de: "Kreisförmig" },
  linear: { en: "Linear", de: "Linear" },
  turn: { en: "Turn", de: "Drehung" },
  position: { en: "Position", de: "Position" },
  rhythm: { en: "Rhythm", de: "Rhythmus" },
  transition: { en: "Transition", de: "Übergang" },
  travel: { en: "Travel", de: "Reise" },
  charleston: { en: "Charleston", de: "Charleston" },
  "charleston-turn": { en: "Charleston Turn", de: "Charleston-Drehung" },
  tandem: { en: "Tandem", de: "Tandem" },
  "shag-rhythm": { en: "Shag Rhythm", de: "Shag-Rhythmus" },
  "shag-turn": { en: "Shag Turn", de: "Shag-Drehung" }
};

const countLabels: Record<CountPattern, Record<Language, string>> = {
  six: { en: "6 count", de: "6 Counts" },
  eight: { en: "8 count", de: "8 Counts" },
  "six-or-eight": { en: "6 or 8 count", de: "6 oder 8 Counts" },
  "six-or-twelve": { en: "6 or 12 count", de: "6 oder 12 Counts" },
  "eight-or-sixteen": { en: "8 or 16 count", de: "8 oder 16 Counts" },
  musical: { en: "As musical", de: "Musikalisch" }
};

const motionLabels: Record<MotionKind, Record<Language, string>> = {
  linear: { en: "Linear", de: "Linear" },
  rotational: { en: "Rotational", de: "Rotierend" },
  circular: { en: "Circular", de: "Kreisförmig" },
  vertical: { en: "Vertical", de: "Vertikal" },
  travel: { en: "Travel", de: "Reise" }
};

const endPositionLabels: Record<EndPosition, Record<Language, string>> = {
  open: { en: "Open", de: "Open" },
  closed: { en: "Closed", de: "Closed" },
  "side-by-side": { en: "Side-by-side", de: "Side-by-Side" },
  wrapped: { en: "Wrapped", de: "Gewickelt" },
  tandem: { en: "Tandem", de: "Tandem" }
};

export const familyLabel = (language: Language, value: MoveFamily): string => familyLabels[value][language];
export const countPatternLabel = (language: Language, value: CountPattern): string => countLabels[value][language];
export const motionKindLabel = (language: Language, value: MotionKind): string => motionLabels[value][language];
export const endingLabel = (language: Language, ending: MoveEnding): string => ending.kind === "any"
  ? language === "de" ? "Beliebig" : "Any"
  : ending.positions.map((position) => endPositionLabels[position][language]).join(" / ");

export const videoKindLabel = (language: Language, kind: VideoKind): string => {
  const keys: Record<VideoKind, TranslationKey> = {
    tutorial: "videoTutorial", technique: "videoTechnique", variation: "videoVariation", history: "videoHistory"
  };
  return translate(language, keys[kind]);
};

export const webResourceKindLabel = (language: Language, kind: WebResourceKind): string =>
  translate(language, kind === "article" ? "resourceArticle" : "resourceReference");

export const escapeHtml = (value: unknown): string => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

export const renderGuideSections = (sections: readonly GuideSection[], className: string): string =>
  sections.map(({ heading, paragraphs }) => `<section class="${className}"><h3>${escapeHtml(heading)}</h3>${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("");

export interface CardPresentationOptions {
  readonly figure: FigureDefinition;
  readonly language: Language;
  readonly index: number;
  readonly inert?: boolean;
  readonly deckChoice?: BuildChoice;
  readonly imageUrl?: string;
}

export const renderCardMarkup = ({
  figure,
  language,
  index,
  inert = false,
  deckChoice,
  imageUrl
}: CardPresentationOptions): string => {
  const move = figure.move;
  const guide = figure.guides[language];
  const t = (key: TranslationKey): string => escapeHtml(translate(language, key));
  const sections = parseGuideBody(guide.body).sections;
  const resources = figure.resources.filter((resource) => resource.type === "youtube" || !resource.language || resource.language === language);
  const number = String(index + 1).padStart(2, "0");
  const choice = translate(language, deckChoice === "pass"
    ? "notTonight"
    : deckChoice === "keep"
      ? "gotIt"
      : deckChoice === "star"
        ? "tryTonight"
        : "curious");
  const image = escapeHtml(imageUrl ?? figure.card);
  return `
    <div class="card-inner">
      <section class="card-face card-front" data-card-face="front">
        <div class="card-art" style="--card-art: url('${image}')"></div>
        <div class="card-grain"></div>
        <div class="card-content">
          <div class="card-top"><span class="family-pill">${escapeHtml(familyLabel(language, move.family))}</span><span class="choice-pill">${escapeHtml(choice)}</span></div>
          <div class="card-bottom">
            <span class="move-number">MOVE ${number}</span>
            <h2>${escapeHtml(move.name)}</h2><p class="move-description">${escapeHtml(guide.description)}</p>
            <div class="move-meta"><span>${escapeHtml(styleMeta[move.style].short)}</span><span>${escapeHtml(countPatternLabel(language, move.count))}</span><span>${escapeHtml(motionKindLabel(language, move.motion))}</span><span>${t("ends")} ${escapeHtml(endingLabel(language, move.end))}</span></div>
          </div>
        </div>
      </section>
      <section class="card-face card-back" data-card-face="back" aria-hidden="true">
        <div class="card-back-scroll" data-card-scroll>
          <div class="card-back-heading">
            <span class="move-number">MOVE ${number} · ${escapeHtml(styleMeta[move.style].short)}</span>
            <h2>${escapeHtml(move.name)}</h2>
            <p class="card-back-intro">${escapeHtml(guide.description)}</p>
          </div>
          <div class="card-guide-sections">
            ${renderGuideSections(sections, "card-guide-section")}
          </div>
          <div class="card-memory"><span>${t("remember")}</span><strong>${escapeHtml(guide.remember)}</strong></div>
          ${resources.length === 0 ? "" : `<section class="card-videos${resources.some((resource) => resource.type === "web") ? " card-resources" : ""}"><h3>${t(resources.every((resource) => resource.type === "youtube") ? "videosHeading" : "resourcesHeading")}</h3>${resources.map((resource) => resource.type === "youtube"
            ? `<a href="${escapeHtml(youtubeUrl(resource.videoId))}" target="_blank" rel="noopener noreferrer" ${inert ? 'tabindex="-1"' : ""}><span aria-hidden="true">▶</span><span><small>${escapeHtml(videoKindLabel(language, resource.kind))}</small><strong>${escapeHtml(resource.title)}</strong></span><b aria-hidden="true">↗</b></a>`
            : `<a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" ${inert ? 'tabindex="-1"' : ""}><span aria-hidden="true">↗</span><span><small>${escapeHtml(webResourceKindLabel(language, resource.kind))}</small><strong>${escapeHtml(resource.title)}</strong></span><b aria-hidden="true">↗</b></a>`).join("")}</section>`}
          <p class="card-guide-note">${t("guideNote")}</p>
        </div>
      </section>
    </div>`;
};
