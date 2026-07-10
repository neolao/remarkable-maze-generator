import type { FastifyInstance } from "fastify";

interface Logger {
	info: (message: string) => void;
	error: (error: unknown, message: string) => void;
}

interface ShutdownDependencies {
	log: Logger;
	close: () => Promise<void>;
	exit: (code: number) => void;
}

export function createShutdownHandler(deps: ShutdownDependencies) {
	return async (signal: NodeJS.Signals): Promise<void> => {
		deps.log.info(`Received ${signal}, shutting down gracefully...`);
		try {
			await deps.close();
			deps.exit(0);
		} catch (error) {
			deps.log.error(error, "Error while shutting down the server");
			deps.exit(1);
		}
	};
}

interface FatalErrorDependencies {
	log: Logger;
	exit: (code: number) => void;
}

export function createFatalErrorHandler(deps: FatalErrorDependencies) {
	return (error: unknown): void => {
		deps.log.error(error, "Unexpected error, shutting down the server");
		deps.exit(1);
	};
}

export function registerProcessLifecycleHandlers(app: FastifyInstance): void {
	const handleShutdown = createShutdownHandler({
		log: app.log,
		close: () => app.close(),
		exit: (code) => process.exit(code),
	});
	const handleFatalError = createFatalErrorHandler({
		log: app.log,
		exit: (code) => process.exit(code),
	});

	process.on("SIGTERM", () => {
		void handleShutdown("SIGTERM");
	});
	process.on("SIGINT", () => {
		void handleShutdown("SIGINT");
	});
	process.on("uncaughtException", handleFatalError);
	process.on("unhandledRejection", handleFatalError);
}
