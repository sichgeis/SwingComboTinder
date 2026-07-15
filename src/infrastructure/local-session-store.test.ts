import { describe, expect, it } from "vitest";
import { createSession } from "../domain/session";
import { LocalSessionStore } from "./local-session-store";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  public getItem(key: string): string | null { return this.values.get(key) ?? null; }
  public setItem(key: string, value: string): void { this.values.set(key, value); }
  public setRaw(key: string, value: string): void { this.values.set(key, value); }
}

describe("LocalSessionStore", () => {
  it("round-trips the existing v2 session schema", () => {
    const storage = new MemoryStorage();
    const store = new LocalSessionStore(storage);
    const session = { ...createSession(["lindy", "shag"]), index: 4 };
    expect(store.save(session)).toBe(true);
    expect(store.load(() => 35)).toEqual(session);
  });

  it("sanitizes legacy-compatible data and clamps the index", () => {
    const storage = new MemoryStorage();
    storage.setRaw("swing-thing-session-v2", JSON.stringify({
      styles: ["lindy", "unknown"], index: 999, choices: { okay: "keep", bad: "maybe" },
      history: [{ index: 2, id: "okay", action: "keep" }, { index: 99, id: "late", action: "star" }]
    }));
    const session = new LocalSessionStore(storage).load(() => 27);
    expect(session.styles).toEqual(["lindy"]);
    expect(session.index).toBe(27);
    expect(session.choices).toEqual({ okay: "keep" });
    expect(session.history).toHaveLength(1);
  });

  it("falls back safely for corrupt or unavailable storage", () => {
    const storage = new MemoryStorage();
    storage.setRaw("swing-thing-session-v2", "not json");
    expect(new LocalSessionStore(storage).load(() => 27)).toEqual(createSession());
    expect(new LocalSessionStore(undefined).save(createSession())).toBe(false);
  });

  it("does not throw when storage rejects writes", () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(new LocalSessionStore(storage).save(createSession())).toBe(false);
  });

  it("persists language independently and rejects unknown values", () => {
    const storage = new MemoryStorage();
    const store = new LocalSessionStore(storage);
    expect(store.loadLanguage("de")).toBe("de");
    expect(store.saveLanguage("en")).toBe(true);
    expect(store.loadLanguage("de")).toBe("en");
    storage.setRaw("swing-thing-language", "fr");
    expect(store.loadLanguage("de")).toBe("de");
  });

  it("persists and clamps the last browse position", () => {
    const storage = new MemoryStorage();
    const store = new LocalSessionStore(storage);
    expect(store.loadBrowseIndex(8)).toBe(0);
    expect(store.saveBrowseIndex(5)).toBe(true);
    expect(store.loadBrowseIndex(8)).toBe(5);
    expect(store.loadBrowseIndex(3)).toBe(2);
  });
});
