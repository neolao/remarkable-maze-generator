import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyHelmet from "@fastify/helmet";
import fastifyStatic from "@fastify/static";
import { CORE_VERSION } from "@remarkable-maze-generator/core";
import Fastify from "fastify";
import { registerMazeRoutes } from "./maze-routes.js";
import { registerProcessLifecycleHandlers } from "./process-lifecycle.js";
import {
	DEFAULT_CREDENTIALS_PATH,
	createFileCredentialStore,
} from "./remarkable-credential-store.js";
import { registerRemarkableRoutes } from "./remarkable-routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface BuildServerOptions {
	credentialsPath?: string;
}

const DEFAULT_PORT = 4367;
const DEFAULT_HOST = "0.0.0.0";

export function resolvePort(env: NodeJS.ProcessEnv = process.env): number {
	const raw = env.PORT;
	if (!raw) {
		return DEFAULT_PORT;
	}

	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

export function resolveHost(env: NodeJS.ProcessEnv = process.env): string {
	return env.HOST || DEFAULT_HOST;
}

export function buildServer(options: BuildServerOptions = {}) {
	const app = Fastify({ logger: true });
	const store = createFileCredentialStore(
		options.credentialsPath ?? DEFAULT_CREDENTIALS_PATH,
	);

	app.register(fastifyHelmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", "data:"],
				upgradeInsecureRequests: null,
			},
		},
	});

	app.register(fastifyStatic, {
		root: path.join(__dirname, "../public"),
	});

	app.get("/api/version", async () => ({ core: CORE_VERSION }));
	registerMazeRoutes(app);
	registerRemarkableRoutes(app, store);

	return app;
}

if (process.env.NODE_ENV !== "test") {
	const app = buildServer();
	registerProcessLifecycleHandlers(app);
	app.listen({ port: resolvePort(), host: resolveHost() });
}
