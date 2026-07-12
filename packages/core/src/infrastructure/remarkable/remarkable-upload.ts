import type { RemarkableSession } from "./remarkable-auth.js";

export interface UploadPdfOptions {
	readFile: (path: string) => Promise<Uint8Array>;
	folder?: string;
}

// Looking up a folder by name requires fetching metadata for every entry in the
// account. rmapi-js's own listItems() does this with unbounded concurrency
// (one to three requests per entry, all fired at once), which reliably causes
// connection timeouts on accounts with hundreds of entries. Walking entries
// with a small, fixed concurrency avoids that without needing a heavier fix
// upstream. See ADR 013.
const FOLDER_LOOKUP_CONCURRENCY = 15;

async function resolveFolderId(
	session: RemarkableSession,
	folderName: string,
): Promise<string> {
	const ids = await session.listIds();
	let cursor = 0;
	let foundId: string | undefined;

	async function worker(): Promise<void> {
		while (cursor < ids.length && !foundId) {
			const entry = ids[cursor];
			cursor++;
			const metadata = await session.getMetadata(entry.id, entry.hash);
			if (
				metadata.type === "CollectionType" &&
				metadata.visibleName === folderName &&
				!metadata.parent
			) {
				foundId = entry.id;
			}
		}
	}

	await Promise.all(
		Array.from(
			{ length: Math.min(FOLDER_LOOKUP_CONCURRENCY, ids.length) },
			() => worker(),
		),
	);

	if (!foundId) {
		throw new Error(
			`Folder "${folderName}" was not found on reMarkable Cloud. Create it first, then try again.`,
		);
	}
	return foundId;
}

export async function uploadPdf(
	session: RemarkableSession | undefined,
	filePath: string,
	visibleName: string,
	options: UploadPdfOptions,
): Promise<void> {
	if (!session) {
		throw new Error(
			"Cannot upload to reMarkable Cloud without a valid authenticated session",
		);
	}

	let pdfBytes: Uint8Array;
	try {
		pdfBytes = await options.readFile(filePath);
	} catch (cause) {
		throw new Error(`Local file not found: ${filePath}`, { cause });
	}

	try {
		if (options.folder) {
			const folderId = await resolveFolderId(session, options.folder);
			await session.putPdf(visibleName, pdfBytes, { parent: folderId });
		} else {
			await session.uploadPdf(visibleName, pdfBytes);
		}
	} catch (cause) {
		throw new Error(
			`Failed to upload the PDF to reMarkable Cloud: ${(cause as Error).message}`,
			{ cause },
		);
	}
}
