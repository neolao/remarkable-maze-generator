import type { RemarkableSession } from "./remarkable-auth.js";

export interface UploadPdfOptions {
	readFile: (path: string) => Promise<Uint8Array>;
	folder?: string;
}

async function resolveFolderId(
	session: RemarkableSession,
	folderName: string,
): Promise<string> {
	const items = await session.listItems();
	const existing = items.find(
		(item) =>
			item.type === "CollectionType" &&
			item.visibleName === folderName &&
			(!item.parent || item.parent === ""),
	);
	if (!existing) {
		throw new Error(
			`Folder "${folderName}" was not found on reMarkable Cloud. Create it first, then try again.`,
		);
	}
	return existing.id;
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
