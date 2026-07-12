import { ResponseError, register, remarkable } from "rmapi-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticate } from "./remarkable-auth.js";
import type {
	CredentialStore,
	RemarkableCredentials,
} from "./remarkable-credential-store.js";

vi.mock("rmapi-js", () => {
	class ResponseError extends Error {
		status: number;
		statusText: string;
		constructor(status: number, statusText: string, message: string) {
			super(message);
			this.status = status;
			this.statusText = statusText;
		}
	}
	return { register: vi.fn(), remarkable: vi.fn(), ResponseError };
});

class InMemoryCredentialStore implements CredentialStore {
	private credentials: RemarkableCredentials | null;

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

const registerMock = vi.mocked(register);
const remarkableMock = vi.mocked(remarkable);

beforeEach(() => {
	registerMock.mockReset();
	remarkableMock.mockReset();
});

describe("authenticate", () => {
	it("pairs a new device and stores its credentials when none exist yet", async () => {
		registerMock.mockResolvedValue("new-device-token");
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the rmapi-js session shape
		remarkableMock.mockResolvedValue(fakeSession as any);

		const store = new InMemoryCredentialStore();
		const session = await authenticate(store, "12345678");

		expect(registerMock).toHaveBeenCalledWith("12345678", expect.anything());
		expect(remarkableMock).toHaveBeenCalledWith(
			"new-device-token",
			expect.anything(),
		);
		expect(session).toBe(fakeSession);
		await expect(store.load()).resolves.toEqual({
			deviceToken: "new-device-token",
		});
	});

	it("reuses an already-paired device without registering again", async () => {
		const store = new InMemoryCredentialStore({
			deviceToken: "existing-token",
		});
		const fakeSession = { uploadPdf: vi.fn() };
		// biome-ignore lint/suspicious/noExplicitAny: partial fake of the rmapi-js session shape
		remarkableMock.mockResolvedValue(fakeSession as any);

		const session = await authenticate(store, "unused-code");

		expect(registerMock).not.toHaveBeenCalled();
		expect(remarkableMock).toHaveBeenCalledWith(
			"existing-token",
			expect.anything(),
		);
		expect(session).toBe(fakeSession);
	});

	it("throws a clear error for an invalid or expired pairing code", async () => {
		registerMock.mockRejectedValue(
			new ResponseError(400, "Bad Request", "bad code"),
		);

		const store = new InMemoryCredentialStore();
		await expect(authenticate(store, "wrong-code")).rejects.toThrow(
			/pairing code/i,
		);
	});

	it("throws a clear error when reMarkable Cloud cannot be reached while pairing", async () => {
		registerMock.mockRejectedValue(new TypeError("fetch failed"));

		const store = new InMemoryCredentialStore();
		await expect(authenticate(store, "12345678")).rejects.toThrow(
			/reMarkable Cloud/i,
		);
	});

	it("throws a clear error when the session cannot be created after registering", async () => {
		registerMock.mockResolvedValue("device-token");
		remarkableMock.mockRejectedValue(new Error("boom"));

		const store = new InMemoryCredentialStore();
		await expect(authenticate(store, "12345678")).rejects.toThrow(
			/reMarkable Cloud/i,
		);
	});
});
