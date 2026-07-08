import { CORE_VERSION } from "@remarkable-maze-generator/core";
import { describe, expect, it } from "vitest";

describe("cli package", () => {
	it("can access the core package version", () => {
		expect(CORE_VERSION).toBe("0.3.0");
	});
});
