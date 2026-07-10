import corePkg from "@remarkable-maze-generator/core/package.json" with {
	type: "json",
};
import { describe, expect, it } from "vitest";
import { buildServer, resolvePort } from "./server.js";

describe("web server", () => {
	it("responds with the core version on /api/version", async () => {
		const app = buildServer();
		const response = await app.inject({ method: "GET", url: "/api/version" });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ core: corePkg.version });
	});
});

describe("resolvePort", () => {
	it("returns 3001 when PORT is not set", () => {
		expect(resolvePort({})).toBe(3001);
	});

	it("returns the PORT env variable as a number when set to a valid value", () => {
		expect(resolvePort({ PORT: "8080" })).toBe(8080);
	});

	it("falls back to 3001 when PORT is not a valid integer", () => {
		expect(resolvePort({ PORT: "not-a-number" })).toBe(3001);
	});

	it("falls back to 3001 when PORT is zero or negative", () => {
		expect(resolvePort({ PORT: "0" })).toBe(3001);
		expect(resolvePort({ PORT: "-1" })).toBe(3001);
	});
});
