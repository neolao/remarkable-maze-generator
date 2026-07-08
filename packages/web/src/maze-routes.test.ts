import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("POST /api/mazes/generate", () => {
	it("returns a valid PDF for valid parameters", async () => {
		const app = buildServer();

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/generate",
			payload: { width: 5, height: 5, seed: 42, difficulty: 3 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.headers["content-type"]).toBe("application/pdf");

		const document = await PDFDocument.load(response.rawPayload);
		expect(document.getPageCount()).toBe(1);
	});

	it("generates a random maze when no seed is provided", async () => {
		const app = buildServer();

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/generate",
			payload: { width: 4, height: 4 },
		});

		expect(response.statusCode).toBe(200);
		const document = await PDFDocument.load(response.rawPayload);
		expect(document.getPageCount()).toBe(1);
	});

	it.each([1, 5])(
		"accepts difficulty at the boundary value %i",
		async (difficulty) => {
			const app = buildServer();

			const response = await app.inject({
				method: "POST",
				url: "/api/mazes/generate",
				payload: { width: 4, height: 4, seed: 1, difficulty },
			});

			expect(response.statusCode).toBe(200);
		},
	);

	it("includes the solution as an extra page when solution mode is extra-page", async () => {
		const app = buildServer();

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/generate",
			payload: { width: 4, height: 4, seed: 1, solution: "extra-page" },
		});

		expect(response.statusCode).toBe(200);
		const document = await PDFDocument.load(response.rawPayload);
		expect(document.getPageCount()).toBe(2);
	});

	it("returns 400 with a clear message when width is missing", async () => {
		const app = buildServer();

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/generate",
			payload: { height: 5 },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toEqual({ error: expect.any(String) });
	});

	it("returns 400 when dimensions are negative", async () => {
		const app = buildServer();

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/generate",
			payload: { width: -1, height: 5 },
		});

		expect(response.statusCode).toBe(400);
	});

	it("returns 400 when difficulty is out of bounds", async () => {
		const app = buildServer();

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/generate",
			payload: { width: 5, height: 5, difficulty: 6 },
		});

		expect(response.statusCode).toBe(400);
	});

	it("returns 400 when the solution mode is invalid", async () => {
		const app = buildServer();

		const response = await app.inject({
			method: "POST",
			url: "/api/mazes/generate",
			payload: { width: 5, height: 5, solution: "invalid-mode" },
		});

		expect(response.statusCode).toBe(400);
	});
});
