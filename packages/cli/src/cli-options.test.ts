import { describe, expect, it } from "vitest";
import { parseIntegerOption } from "./cli-options.js";

describe("parseIntegerOption", () => {
	it("parses a valid integer string", () => {
		expect(parseIntegerOption("42", "--width")).toBe(42);
	});

	it("parses a negative integer string", () => {
		expect(parseIntegerOption("-3", "--width")).toBe(-3);
	});

	it.each(["abc", "", "3.5", "12abc"])(
		"rejects a non-integer value %j with a clear message",
		(value) => {
			expect(() => parseIntegerOption(value, "--width")).toThrow(/--width/);
		},
	);
});
