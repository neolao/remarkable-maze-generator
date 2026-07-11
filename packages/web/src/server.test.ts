import corePkg from "@remarkable-maze-generator/core/package.json" with {
	type: "json",
};
import { describe, expect, it } from "vitest";
import { buildServer, resolveHost, resolvePort } from "./server.js";

describe("web server", () => {
	it("responds with the core version on /api/version", async () => {
		const app = buildServer();
		const response = await app.inject({ method: "GET", url: "/api/version" });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ core: corePkg.version });
	});

	it("does not instruct browsers to upgrade http subresource requests to https, since the server has no TLS listener", async () => {
		const app = buildServer();
		const response = await app.inject({ method: "GET", url: "/" });

		expect(response.headers["content-security-policy"]).not.toContain(
			"upgrade-insecure-requests",
		);
	});
});

describe("resolvePort", () => {
	it("returns 4367 when PORT is not set", () => {
		expect(resolvePort({})).toBe(4367);
	});

	it("returns the PORT env variable as a number when set to a valid value", () => {
		expect(resolvePort({ PORT: "8080" })).toBe(8080);
	});

	it("falls back to 4367 when PORT is not a valid integer", () => {
		expect(resolvePort({ PORT: "not-a-number" })).toBe(4367);
	});

	it("falls back to 4367 when PORT is zero or negative", () => {
		expect(resolvePort({ PORT: "0" })).toBe(4367);
		expect(resolvePort({ PORT: "-1" })).toBe(4367);
	});
});

describe("resolveHost", () => {
	it("returns 0.0.0.0 when HOST is not set", () => {
		expect(resolveHost({})).toBe("0.0.0.0");
	});

	it("returns the HOST env variable when set", () => {
		expect(resolveHost({ HOST: "127.0.0.1" })).toBe("127.0.0.1");
	});
});
