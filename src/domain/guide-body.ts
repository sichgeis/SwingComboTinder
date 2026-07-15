export interface GuideBodyIssue {
  readonly line: number;
  readonly message: string;
}

export interface GuideSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface ParsedGuideBody {
  readonly sections: readonly GuideSection[];
  readonly issues: readonly GuideBodyIssue[];
}

export const parseGuideBody = (body: string): ParsedGuideBody => {
  const lines = body.replaceAll("\r\n", "\n").split("\n");
  const sections: Array<{ heading: string; paragraphs: string[] }> = [];
  const issues: GuideBodyIssue[] = [];
  let section: { heading: string; paragraphs: string[] } | undefined;
  let paragraphLines: string[] = [];

  const finishParagraph = (): void => {
    if (!section || paragraphLines.length === 0) return;
    section.paragraphs.push(paragraphLines.join("\n").trim());
    paragraphLines = [];
  };

  const finishSection = (line: number): void => {
    if (!section) return;
    finishParagraph();
    if (section.paragraphs.length === 0) {
      issues.push({ line, message: `Section “${section.heading}” needs at least one paragraph.` });
    }
    sections.push(section);
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.startsWith("## ")) {
      finishSection(lineNumber);
      const heading = line.slice(3).trim();
      if (!heading) issues.push({ line: lineNumber, message: "Section heading cannot be empty." });
      section = { heading, paragraphs: [] };
      return;
    }
    if (!section) {
      if (line.trim()) issues.push({ line: lineNumber, message: "Guide body must begin with a ## section heading." });
      return;
    }
    if (!line.trim()) {
      finishParagraph();
      return;
    }
    paragraphLines.push(line.trim());
  });
  finishSection(lines.length);

  if (sections.length === 0 && issues.length === 0) {
    issues.push({ line: 1, message: "Guide body must contain at least one ## section." });
  }
  return { sections, issues };
};
