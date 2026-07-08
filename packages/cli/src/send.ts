import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { authenticate, uploadPdf } from "@remarkable-maze-generator/core";
import { createFileCredentialStore } from "./credential-store.js";

const DEFAULT_CREDENTIALS_PATH = join(
	homedir(),
	".config",
	"remarkable-maze-generator",
	"credentials.json",
);
const PAIRING_INSTRUCTIONS_URL =
	"https://my.remarkable.com/device/browser/connect";

export interface SendOptions {
	filePath: string;
	visibleName?: string;
	folder?: string;
	credentialsPath?: string;
	promptPairingCode?: () => Promise<string>;
}

export interface SendResult {
	visibleName: string;
}

async function defaultPromptPairingCode(): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	console.log(
		`Not authenticated yet. Get a one-time pairing code at ${PAIRING_INSTRUCTIONS_URL}`,
	);
	try {
		const code = await rl.question("Pairing code: ");
		return code.trim();
	} finally {
		rl.close();
	}
}

export async function runSend(options: SendOptions): Promise<SendResult> {
	try {
		await access(options.filePath);
	} catch (cause) {
		throw new Error(`Local file not found: ${options.filePath}`, { cause });
	}

	const store = createFileCredentialStore(
		options.credentialsPath ?? DEFAULT_CREDENTIALS_PATH,
	);
	const existing = await store.load();
	const promptPairingCode =
		options.promptPairingCode ?? defaultPromptPairingCode;
	const pairingCode = existing ? "" : await promptPairingCode();

	const session = await authenticate(store, pairingCode);
	const visibleName =
		options.visibleName ??
		basename(options.filePath, extname(options.filePath));

	await uploadPdf(session, options.filePath, visibleName, {
		readFile: (path) => readFile(path),
		folder: options.folder,
	});

	return { visibleName };
}
