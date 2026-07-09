import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
	CredentialStore,
	RemarkableCredentials,
} from "@remarkable-maze-generator/core";

const CREDENTIALS_FILE_MODE = 0o600;

export const DEFAULT_CREDENTIALS_PATH = join(
	homedir(),
	".config",
	"remarkable-maze-generator",
	"credentials.json",
);

export function createFileCredentialStore(filePath: string): CredentialStore {
	return {
		async load(): Promise<RemarkableCredentials | null> {
			try {
				const raw = await readFile(filePath, "utf8");
				return JSON.parse(raw) as RemarkableCredentials;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
				throw error;
			}
		},

		async save(credentials: RemarkableCredentials): Promise<void> {
			await mkdir(dirname(filePath), { recursive: true });
			await writeFile(filePath, JSON.stringify(credentials), {
				mode: CREDENTIALS_FILE_MODE,
			});
		},
	};
}
