import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "./logger";

const originalLogLevel = process.env.IMAGE_STUDIO_LOG_LEVEL;

afterEach(() => {
  if (originalLogLevel === undefined) delete process.env.IMAGE_STUDIO_LOG_LEVEL;
  else process.env.IMAGE_STUDIO_LOG_LEVEL = originalLogLevel;
  vi.restoreAllMocks();
});

describe("image studio logger", () => {
  it("redacts secrets and omits debug messages at the default level", () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const logger = createLogger("test", { figureId: "lindy/test" });

    logger.debug("hidden", { attempt: 1 });
    logger.info("request", { apiKey: "secret-value", model: "image-model" });

    expect(write).toHaveBeenCalledTimes(1);
    const output = String(write.mock.calls[0]?.[0]);
    expect(output).toContain("INFO test.request");
    expect(output).toContain('"figureId":"lindy/test"');
    expect(output).toContain('"apiKey":"[REDACTED]"');
    expect(output).not.toContain("secret-value");
  });

  it("includes nested error causes and stacks in debug mode", () => {
    process.env.IMAGE_STUDIO_LOG_LEVEL = "debug";
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const logger = createLogger("test");
    const cause = new Error("socket closed");

    logger.error("failed", { error: new Error("proxy failed", { cause }) });

    const output = String(write.mock.calls[0]?.[0]);
    expect(output).toContain("proxy failed");
    expect(output).toContain("socket closed");
    expect(output).toContain('"stack"');
  });
});
