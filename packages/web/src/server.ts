import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import { CORE_VERSION } from "@remarkable-maze-generator/core";
import Fastify from "fastify";
import { registerMazeRoutes } from "./maze-routes.js";
import {
	DEFAULT_CREDENTIALS_PATH,
	createFileCredentialStore,
} from "./remarkable-credential-store.js";
import { registerRemarkableRoutes } from "./remarkable-routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface BuildServerOptions {
	credentialsPath?: string;
}

export function buildServer(options: BuildServerOptions = {}) {
	const app = Fastify({ logger: true });
	const store = createFileCredentialStore(
		options.credentialsPath ?? DEFAULT_CREDENTIALS_PATH,
	);

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
	app.listen({ port: 3000, host: "0.0.0.0" });
}
