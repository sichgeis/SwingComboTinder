import { youtubeUrl, type FigureDefinition, type VideoKind, type WebResourceKind } from "../../figures/define-figure";
import type { BuildChoice, Language, MoveStyle, MoveTranslation } from "../domain/move";
import { translate, type TranslationKey } from "./translations";

export const styleMeta: Record<MoveStyle, { label: string; short: string }> = {
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

export const localizedMeta = (language: Language, value: string): string => language === "de" ? (germanMeta[value] ?? value) : value;

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
  const meta = (value: string): string => escapeHtml(localizedMeta(language, value));
  const t = (key: TranslationKey): string => escapeHtml(translate(language, key));
  const translated = language === "de" ? guide as MoveTranslation : undefined;
  const sections = translated ? [
    { heading: translated.headings.steps, copy: translated.steps },
    { heading: translated.headings.body, copy: translated.body },
    { heading: translated.headings.lead, copy: translated.lead },
    { heading: translated.headings.follow, copy: translated.follow },
    { heading: translated.headings.connection, copy: translated.connection },
    { heading: translated.headings.practice, copy: translated.practice }
  ] : [
    { heading: translate(language, "rhythmHeading"), copy: guide.steps },
    { heading: translate(language, "bodyHeading"), copy: guide.body },
    { heading: translate(language, "leadHeading"), copy: guide.lead },
    { heading: translate(language, "connectionHeading"), copy: guide.connection }
  ];
  const videos = figure.youtube.cardLinks;
  const webResources = (figure.resources?.cardLinks ?? []).filter((resource) => !resource.language || resource.language === language);
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
          <div class="card-top"><span class="family-pill">${meta(move.family)}</span><span class="choice-pill">${escapeHtml(choice)}</span></div>
          <div class="card-bottom">
            <span class="move-number">MOVE ${number}</span>
            <h2>${escapeHtml(move.name)}</h2><p class="move-description">${escapeHtml(guide.description)}</p>
            <div class="move-meta"><span>${escapeHtml(styleMeta[move.style].short)}</span><span>${meta(move.count)}</span><span>${meta(move.motion)}</span><span>${t("ends")} ${meta(move.end)}</span></div>
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
            ${sections.map(({ heading, copy }) => `<section class="card-guide-section"><h3>${escapeHtml(heading)}</h3><p>${escapeHtml(copy)}</p></section>`).join("")}
          </div>
          <div class="card-memory"><span>${t("remember")}</span><strong>${escapeHtml(guide.cue)}</strong></div>
          ${videos.length === 0 ? "" : `<section class="card-videos"><h3>${t("videosHeading")}</h3>${videos.map((video) => `<a href="${escapeHtml(youtubeUrl(video.videoId))}" target="_blank" rel="noopener noreferrer" ${inert ? 'tabindex="-1"' : ""}><span aria-hidden="true">▶</span><span><small>${escapeHtml(videoKindLabel(language, video.kind))}</small><strong>${escapeHtml(video.title)}</strong></span><b aria-hidden="true">↗</b></a>`).join("")}</section>`}
          ${webResources.length === 0 ? "" : `<section class="card-videos card-resources"><h3>${t("resourcesHeading")}</h3>${webResources.map((resource) => `<a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" ${inert ? 'tabindex="-1"' : ""}><span aria-hidden="true">↗</span><span><small>${escapeHtml(webResourceKindLabel(language, resource.kind))}</small><strong>${escapeHtml(resource.title)}</strong></span><b aria-hidden="true">↗</b></a>`).join("")}</section>`}
          <p class="card-guide-note">${t("guideNote")}</p>
        </div>
      </section>
    </div>`;
};
