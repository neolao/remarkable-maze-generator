import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["packages/*/src/**/*.test.ts"],
		environment: "node",
		server: {
			deps: {
				inline: [/rmapi-js/, /crc-32/],
			},
		},
	},
});
