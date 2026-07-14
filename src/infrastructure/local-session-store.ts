import { isChoice, isMoveStyle, type Language } from "../domain/move";
import { createSession, type Decision, type Session } from "../domain/session";

export const SESSION_STORAGE_KEY = "swing-thing-session-v2";
export const LANGUAGE_STORAGE_KEY = "swing-thing-language";
export const BROWSE_INDEX_STORAGE_KEY = "swing-thing-browse-index";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseChoices = (value: unknown): Record<string, "pass" | "keep" | "star"> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, "pass" | "keep" | "star"] => isChoice(entry[1])));
};

const parseHistory = (value: unknown): Decision[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Decision =>
    isRecord(item)
    && Number.isInteger(item.index)
    && typeof item.index === "number"
    && item.index >= 0
    && typeof item.id === "string"
    && isChoice(item.action));
};

export class LocalSessionStore {
  public constructor(
    private readonly storage: StorageLike | undefined,
    private readonly key = SESSION_STORAGE_KEY
  ) {}

  public load(maxDeckLength: (styles: Session["styles"]) => number): Session {
    if (!this.storage) return createSession();
    try {
      const serialized = this.storage.getItem(this.key);
      if (!serialized) return createSession();
      const parsed: unknown = JSON.parse(serialized);
      if (!isRecord(parsed) || !Array.isArray(parsed.styles)) return createSession();

      const styles = parsed.styles.filter(isMoveStyle);
      if (styles.length === 0) return createSession();
      const maximum = maxDeckLength(styles);
      const index = typeof parsed.index === "number" && Number.isInteger(parsed.index)
        ? Math.min(Math.max(parsed.index, 0), maximum)
        : 0;
      return {
        styles,
        index,
        choices: parseChoices(parsed.choices),
        history: parseHistory(parsed.history).filter((decision) => decision.index < maximum),
        comboSeed: typeof parsed.comboSeed === "number" && Number.isInteger(parsed.comboSeed) && parsed.comboSeed >= 0
          ? parsed.comboSeed
          : 0
      };
    } catch {
      return createSession();
    }
  }

  public save(session: Session): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify(session));
      return true;
    } catch {
      return false;
    }
  }

  public loadLanguage(fallback: Language): Language {
    if (!this.storage) return fallback;
    try {
      const language = this.storage.getItem(LANGUAGE_STORAGE_KEY);
      return language === "de" || language === "en" ? language : fallback;
    } catch {
      return fallback;
    }
  }

  public saveLanguage(language: Language): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(LANGUAGE_STORAGE_KEY, language);
      return true;
    } catch {
      return false;
    }
  }

  public loadBrowseIndex(maximum: number): number {
    if (!this.storage) return 0;
    try {
      const value = Number(this.storage.getItem(BROWSE_INDEX_STORAGE_KEY));
      return Number.isInteger(value) ? Math.min(Math.max(value, 0), Math.max(maximum - 1, 0)) : 0;
    } catch {
      return 0;
    }
  }

  public saveBrowseIndex(index: number): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(BROWSE_INDEX_STORAGE_KEY, String(index));
      return true;
    } catch {
      return false;
    }
  }
}
