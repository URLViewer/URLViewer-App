import { describe, expect, it } from "vitest";
import { appSettingsSchema } from "@shared/schemas";

describe("settings schema", () => {
  it("accepts default-like values", () => {
    const parsed = appSettingsSchema.safeParse({
      restoreTabsOnLaunch: true,
      validationMode: "on-register",
      validationConcurrency: 2,
      validationTimeoutMs: 5000,
    });

    expect(parsed.success).toBe(true);
  });
});
