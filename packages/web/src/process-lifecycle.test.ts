import { describe, expect, it, vi } from "vitest";
import {
	createFatalErrorHandler,
	createShutdownHandler,
} from "./process-lifecycle.js";

function fakeLogger() {
	return { info: vi.fn(), error: vi.fn() };
}

describe("createShutdownHandler", () => {
	it("logs an explicit message naming the signal before closing the server", async () => {
		const log = fakeLogger();
		const close = vi.fn().mockResolvedValue(undefined);
		const exit = vi.fn();
		const handleShutdown = createShutdownHandler({ log, close, exit });

		await handleShutdown("SIGTERM");

		expect(log.info).toHaveBeenCalledWith(expect.stringContaining("SIGTERM"));
		expect(close).toHaveBeenCalledOnce();
		expect(exit).toHaveBeenCalledWith(0);
	});

	it("logs an explicit message naming the signal for SIGINT", async () => {
		const log = fakeLogger();
		const close = vi.fn().mockResolvedValue(undefined);
		const exit = vi.fn();
		const handleShutdown = createShutdownHandler({ log, close, exit });

		await handleShutdown("SIGINT");

		expect(log.info).toHaveBeenCalledWith(expect.stringContaining("SIGINT"));
		expect(exit).toHaveBeenCalledWith(0);
	});

	it("logs the error and exits with a non-zero code when closing the server fails", async () => {
		const log = fakeLogger();
		const closeError = new Error("socket already destroyed");
		const close = vi.fn().mockRejectedValue(closeError);
		const exit = vi.fn();
		const handleShutdown = createShutdownHandler({ log, close, exit });

		await handleShutdown("SIGTERM");

		expect(log.error).toHaveBeenCalledWith(
			closeError,
			expect.stringContaining("shutting down"),
		);
		expect(exit).toHaveBeenCalledWith(1);
	});
});

describe("createFatalErrorHandler", () => {
	it("logs the error with an explicit message and exits with a non-zero code", () => {
		const log = fakeLogger();
		const exit = vi.fn();
		const handleFatalError = createFatalErrorHandler({ log, exit });
		const error = new Error("boom");

		handleFatalError(error);

		expect(log.error).toHaveBeenCalledWith(
			error,
			expect.stringContaining("Unexpected error"),
		);
		expect(exit).toHaveBeenCalledWith(1);
	});

	it("logs a non-Error rejection reason as-is and still exits with a non-zero code", () => {
		const log = fakeLogger();
		const exit = vi.fn();
		const handleFatalError = createFatalErrorHandler({ log, exit });

		handleFatalError("rejected with a plain string");

		expect(log.error).toHaveBeenCalledWith(
			"rejected with a plain string",
			expect.stringContaining("Unexpected error"),
		);
		expect(exit).toHaveBeenCalledWith(1);
	});
});
