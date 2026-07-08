import { describe, expect, it, vi } from "vitest";
import {
	authenticate,
	refreshUserToken,
	registerDevice,
} from "./remarkable-auth.js";
import type {
	CredentialStore,
	RemarkableCredentials,
} from "./remarkable-credential-store.js";

class InMemoryCredentialStore implements CredentialStore {
	private credentials: RemarkableCredentials | null = null;

	constructor(initial: RemarkableCredentials | null = null) {
		this.credentials = initial;
	}

	async load(): Promise<RemarkableCredentials | null> {
		return this.credentials;
	}

	async save(credentials: RemarkableCredentials): Promise<void> {
		this.credentials = credentials;
	}
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(typeof body === "string" ? body : JSON.stringify(body), {
		status,
	});
}

describe("registerDevice", () => {
	it("exchanges a valid pairing code for a device token", async () => {
		const fetchMock = vi.fn(async () => jsonResponse("device-token-abc"));

		const credentials = await registerDevice("12345678", { fetch: fetchMock });

		expect(credentials).toEqual({ deviceToken: "device-token-abc" });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toContain("/token/json/2/device/new");
		expect(JSON.parse(init.body as string)).toMatchObject({ code: "12345678" });
	});

	it("throws a clear error for an invalid or expired pairing code", async () => {
		const fetchMock = vi.fn(async () => jsonResponse("bad code", 400));

		await expect(registerDevice("wrong", { fetch: fetchMock })).rejects.toThrow(
			/pairing code/i,
		);
	});

	it("throws a clear error when the network call fails unexpectedly", async () => {
		const fetchMock = vi.fn(async () => {
			throw new Error("network down");
		});

		await expect(
			registerDevice("12345678", { fetch: fetchMock }),
		).rejects.toThrow();
	});
});

describe("refreshUserToken", () => {
	it("exchanges a device token for a user token", async () => {
		const fetchMock = vi.fn(async () => jsonResponse("user-token-xyz"));

		const result = await refreshUserToken("device-token-abc", {
			fetch: fetchMock,
		});

		expect(result).toEqual({ userToken: "user-token-xyz" });
		const [, init] = fetchMock.mock.calls[0];
		expect((init.headers as Record<string, string>).Authorization).toBe(
			"Bearer device-token-abc",
		);
	});

	it("throws a clear error when the device token is rejected", async () => {
		const fetchMock = vi.fn(async () => jsonResponse("unauthorized", 401));

		await expect(
			refreshUserToken("stale-token", { fetch: fetchMock }),
		).rejects.toThrow();
	});
});

describe("authenticate", () => {
	it("pairs a new device and stores its credentials when none exist yet", async () => {
		const store = new InMemoryCredentialStore();
		const fetchMock = vi.fn(async (url: string | URL) => {
			return String(url).includes("device/new")
				? jsonResponse("device-token-abc")
				: jsonResponse("user-token-xyz");
		});

		const session = await authenticate(store, "12345678", { fetch: fetchMock });

		expect(session).toEqual({
			deviceToken: "device-token-abc",
			userToken: "user-token-xyz",
		});
		await expect(store.load()).resolves.toEqual({
			deviceToken: "device-token-abc",
		});
	});

	it("reuses an already-paired device without calling the pairing endpoint again", async () => {
		const store = new InMemoryCredentialStore({
			deviceToken: "existing-device-token",
		});
		const fetchMock = vi.fn(async () => jsonResponse("fresh-user-token"));

		const session = await authenticate(store, "unused-code", {
			fetch: fetchMock,
		});

		expect(session).toEqual({
			deviceToken: "existing-device-token",
			userToken: "fresh-user-token",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url] = fetchMock.mock.calls[0];
		expect(String(url)).toContain("user/new");
	});

	it("rejects with a clear error for an invalid pairing code and does not save partial credentials", async () => {
		const store = new InMemoryCredentialStore();
		const fetchMock = vi.fn(async () => jsonResponse("bad code", 400));

		await expect(
			authenticate(store, "wrong-code", { fetch: fetchMock }),
		).rejects.toThrow(/pairing code/i);
		await expect(store.load()).resolves.toBeNull();
	});
});
