import { describe, expect, it } from "vitest";
import pkg from "../package.json" with { type: "json" };
import { CORE_VERSION } from "./index.js";

describe("core package", () => {
	it("exposes the version declared in package.json", () => {
		expect(CORE_VERSION).toBe(pkg.version);
	});
});
