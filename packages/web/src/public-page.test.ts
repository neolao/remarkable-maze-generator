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
	"maze-type",
	"maze-algorithm",
	"solution-mode",
	"path-length",
	"show-solution",
	"form-error",
	"maze-preview",
	"maze-seed",
	"solution-branch-count",
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

	it("exposes the show-solution option as a checkbox input", () => {
		expect(html).toMatch(
			/<input[^>]+id="show-solution"[^>]+type="checkbox"|<input[^>]+type="checkbox"[^>]+id="show-solution"/,
		);
	});

	it("exposes the maze type as a select with all three types", () => {
		const match = html.match(
			/<select[^>]+id="maze-type"[^>]*>([\s\S]*?)<\/select>/,
		);
		expect(match).not.toBeNull();

		const optionsMarkup = match?.[1] ?? "";
		expect(optionsMarkup).toContain('value="rectangle"');
		expect(optionsMarkup).toContain('value="rectangle-crossing"');
		expect(optionsMarkup).toContain('value="circle"');
	});

	it("exposes the solution display mode as a select with all three modes", () => {
		const match = html.match(
			/<select[^>]+id="solution-mode"[^>]*>([\s\S]*?)<\/select>/,
		);
		expect(match).not.toBeNull();

		const optionsMarkup = match?.[1] ?? "";
		expect(optionsMarkup).toContain('value="none"');
		expect(optionsMarkup).toContain('value="extra-page"');
		expect(optionsMarkup).toContain('value="overlay"');
	});

	it("exposes the generation algorithm as a select with all four algorithms", () => {
		const match = html.match(
			/<select[^>]+id="maze-algorithm"[^>]*>([\s\S]*?)<\/select>/,
		);
		expect(match).not.toBeNull();

		const optionsMarkup = match?.[1] ?? "";
		expect(optionsMarkup).toContain('value="growing-tree"');
		expect(optionsMarkup).toContain('value="kruskal"');
		expect(optionsMarkup).toContain('value="wilson"');
		expect(optionsMarkup).toContain('value="aldous-broder"');
	});

	it("exposes the path length target as a select defaulting to no filtering", () => {
		const match = html.match(
			/<select[^>]+id="path-length"[^>]*>([\s\S]*?)<\/select>/,
		);
		expect(match).not.toBeNull();

		const optionsMarkup = match?.[1] ?? "";
		expect(optionsMarkup).toContain('value=""');
		expect(optionsMarkup).toContain('value="short"');
		expect(optionsMarkup).toContain('value="medium"');
		expect(optionsMarkup).toContain('value="long"');
	});

	describe("responsive layout", () => {
		const stylesheetPath = (() => {
			const match = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/);
			return join(publicDir, match?.[1] ?? "");
		})();
		const css = readFileSync(stylesheetPath, "utf-8");

		it("turns the page into a multi-column layout on wide desktop viewports instead of a fixed narrow column", () => {
			const wideQuery = css.match(/@media[^{]*\(min-width:\s*(\d+)px\)/);
			expect(wideQuery).not.toBeNull();
			expect(Number(wideQuery?.[1])).toBeGreaterThanOrEqual(900);

			const pageBlocks = [...css.matchAll(/\.page\s*\{([^}]*)\}/g)];
			const hasMultiColumnPageBlock = pageBlocks.some((block) =>
				/grid-template-columns:\s*[^;]+\s+[^;]+;/.test(block[1]),
			);
			expect(hasMultiColumnPageBlock).toBe(true);
		});

		it("adds an intermediate tablet-range breakpoint distinct from the mobile and wide breakpoints", () => {
			const maxWidthBreakpoints = [
				...css.matchAll(/@media[^{]*\(max-width:\s*(\d+)px\)/g),
			].map((match) => Number(match[1]));

			expect(maxWidthBreakpoints).toContain(600);

			const intermediateBreakpoints = maxWidthBreakpoints.filter(
				(width) => width > 600 && width < 1000,
			);
			expect(intermediateBreakpoints.length).toBeGreaterThan(0);
		});

		it("gives buttons, inputs, and selects a comfortable minimum tap-target size", () => {
			const controlBlocks = [
				...css.matchAll(
					/(?:^|\n)((?:[^{]*(?:button|\.field input|\.field select)[^{]*,?\s*)+)\{([^}]*)\}/g,
				),
			];

			const hasComfortableTapTarget = controlBlocks.some((block) => {
				const minHeightMatch = block[2].match(/min-height:\s*(\d+)px/);
				return minHeightMatch !== null && Number(minHeightMatch[1]) >= 44;
			});

			expect(hasComfortableTapTarget).toBe(true);
		});
	});
});
