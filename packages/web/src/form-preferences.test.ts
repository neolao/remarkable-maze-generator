import { describe, expect, it } from "vitest";
import {
	FORM_PREFERENCES_COOKIE_NAME,
	parseFormPreferences,
	serializeFormPreferences,
} from "./form-preferences.js";

const SAMPLE_PREFERENCES = {
	width: "15",
	height: "12",
	difficulty: "4",
	type: "circle",
	algorithm: "kruskal",
	solution: "overlay",
	showSolution: true,
};

describe("form preferences cookie name", () => {
	it("uses a stable, descriptive cookie name", () => {
		expect(FORM_PREFERENCES_COOKIE_NAME).toBe("maze-form-preferences");
	});
});

describe("serializeFormPreferences / parseFormPreferences round trip", () => {
	it("parses back the exact preferences that were serialized", () => {
		const serialized = serializeFormPreferences(SAMPLE_PREFERENCES);
		expect(parseFormPreferences(serialized)).toEqual(SAMPLE_PREFERENCES);
	});

	it("round-trips a falsy showSolution value correctly", () => {
		const preferences = { ...SAMPLE_PREFERENCES, showSolution: false };
		const serialized = serializeFormPreferences(preferences);
		expect(parseFormPreferences(serialized)).toEqual(preferences);
	});

	it("produces a value safe to store as a single cookie (no raw separators)", () => {
		const serialized = serializeFormPreferences(SAMPLE_PREFERENCES);
		expect(serialized).not.toMatch(/[;, \n]/);
	});
});

describe("parseFormPreferences edge cases", () => {
	it("returns null when there is no cookie value (first-time visitor)", () => {
		expect(parseFormPreferences(undefined)).toBeNull();
	});

	it("returns null for an empty string", () => {
		expect(parseFormPreferences("")).toBeNull();
	});

	it("returns null for a corrupted, non-JSON cookie value", () => {
		expect(parseFormPreferences("not-valid-json%")).toBeNull();
	});

	it("returns null when a required field is missing from an otherwise valid object", () => {
		const { showSolution, ...rest } = SAMPLE_PREFERENCES;
		const serialized = encodeURIComponent(JSON.stringify(rest));
		expect(parseFormPreferences(serialized)).toBeNull();
	});

	it("returns null when a field has the wrong type", () => {
		const invalid = { ...SAMPLE_PREFERENCES, showSolution: "true" };
		const serialized = encodeURIComponent(JSON.stringify(invalid));
		expect(parseFormPreferences(serialized)).toBeNull();
	});

	it("returns null when the decoded value is not an object", () => {
		const serialized = encodeURIComponent(JSON.stringify("just a string"));
		expect(parseFormPreferences(serialized)).toBeNull();
	});
});
