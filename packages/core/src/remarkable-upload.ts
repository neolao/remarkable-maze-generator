import type { RemarkableSession } from "./remarkable-auth.js";

export interface UploadPdfOptions {
	readFile: (path: string) => Promise<Uint8Array>;
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
		await session.uploadPdf(visibleName, pdfBytes);
	} catch (cause) {
		throw new Error(
			`Failed to upload the PDF to reMarkable Cloud: ${(cause as Error).message}`,
			{ cause },
		);
	}
}
