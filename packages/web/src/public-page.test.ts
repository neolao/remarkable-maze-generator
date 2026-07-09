import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const html = readFileSync(join(publicDir, "index.html"), "utf-8");

const REQUIRED_ELEMENT_IDS = [
	"maze-form",
	"width",
	"height",
	"difficulty",
	"form-error",
	"maze-preview",
	"download-link",
	"send-button",
	"send-status",
	"remarkable-folder",
	"pairing-section",
	"pairing-code",
	"pairing-submit",
	"pairing-error",
];

describe("public maze configuration page", () => {
	it("links a dedicated, non-empty stylesheet", () => {
		const match = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/);
		expect(match).not.toBeNull();

		const stylesheetPath = join(publicDir, match?.[1] ?? "");
		const css = readFileSync(stylesheetPath, "utf-8");
		expect(css.trim().length).toBeGreaterThan(0);
	});

	it("keeps every element id that app.js depends on", () => {
		for (const id of REQUIRED_ELEMENT_IDS) {
			expect(html).toContain(`id="${id}"`);
		}
	});

	it("adapts layout for narrow (mobile) viewports via a media query", () => {
		const match = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/);
		const stylesheetPath = join(publicDir, match?.[1] ?? "");
		const css = readFileSync(stylesheetPath, "utf-8");

		expect(css).toMatch(/@media[^{]*\(max-width:/);
	});

	it("keeps accessibility roles on the error and status messages", () => {
		expect(html).toMatch(
			/id="form-error"[^>]*role="alert"|role="alert"[^>]*id="form-error"/,
		);
		expect(html).toMatch(
			/id="send-status"[^>]*role="status"|role="status"[^>]*id="send-status"/,
		);
	});
});
