import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("web server", () => {
	it("responds with the core version on /api/version", async () => {
		const app = buildServer();
		const response = await app.inject({ method: "GET", url: "/api/version" });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ core: "0.1.0" });
	});
});
