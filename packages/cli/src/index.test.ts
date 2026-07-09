import { CORE_VERSION } from "@remarkable-maze-generator/core";
import corePkg from "@remarkable-maze-generator/core/package.json" with {
	type: "json",
};
import { describe, expect, it } from "vitest";

describe("cli package", () => {
	it("can access the core package version", () => {
		expect(CORE_VERSION).toBe(corePkg.version);
	});
});
