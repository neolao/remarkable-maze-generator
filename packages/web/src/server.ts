import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import { CORE_VERSION } from "@remarkable-maze-generator/core";
import Fastify from "fastify";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildServer() {
	const app = Fastify({ logger: true });

	app.register(fastifyStatic, {
		root: path.join(__dirname, "../public"),
	});

	app.get("/api/version", async () => ({ core: CORE_VERSION }));

	return app;
}

if (process.env.NODE_ENV !== "test") {
	const app = buildServer();
	app.listen({ port: 3000, host: "0.0.0.0" });
}
