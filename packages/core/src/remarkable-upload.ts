import { zipSync } from "fflate";
import type { RemarkableSession } from "./remarkable-auth.js";

export interface UploadPdfOptions {
	readFile: (path: string) => Promise<Uint8Array>;
	fetch?: typeof fetch;
	baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://document-storage.cloud.remarkable.com";
const DOCUMENT_TYPE = "DocumentType";

function resolveFetch(options?: UploadPdfOptions): typeof fetch {
	return options?.fetch ?? globalThis.fetch;
}

function resolveBaseUrl(options?: UploadPdfOptions): string {
	return options?.baseUrl ?? DEFAULT_BASE_URL;
}

function buildDocumentZip(
	documentId: string,
	pdfBytes: Uint8Array,
): Uint8Array {
	const contentDescriptor = JSON.stringify({
		extraMetadata: {},
		fileType: "pdf",
		fontName: "",
		lastOpenedPage: 0,
		lineHeight: -1,
		margins: 100,
		orientation: "portrait",
		pageCount: 0,
		textScale: 1,
		transform: {},
	});

	return zipSync({
		[`${documentId}.pdf`]: pdfBytes,
		[`${documentId}.content`]: new TextEncoder().encode(contentDescriptor),
		[`${documentId}.pagedata`]: new TextEncoder().encode(""),
	});
}

export async function uploadPdf(
	session: RemarkableSession | undefined,
	filePath: string,
	visibleName: string,
	options: UploadPdfOptions,
): Promise<void> {
	if (!session?.userToken) {
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

	const doFetch = resolveFetch(options);
	const baseUrl = resolveBaseUrl(options);
	const documentId = crypto.randomUUID();
	const authHeaders = { Authorization: `Bearer ${session.userToken}` };

	const requestResponse = await doFetch(
		`${baseUrl}/document-storage/json/2/upload/request`,
		{
			method: "POST",
			headers: { ...authHeaders, "Content-Type": "application/json" },
			body: JSON.stringify([
				{ ID: documentId, Type: DOCUMENT_TYPE, Version: 1 },
			]),
		},
	);
	if (!requestResponse.ok) {
		throw new Error(
			`reMarkable Cloud upload request failed with status ${requestResponse.status}`,
		);
	}
	const [requestResult] = await requestResponse.json();
	if (!requestResult?.Success || !requestResult?.BlobURLPut) {
		throw new Error(
			"reMarkable Cloud upload request did not return a valid upload URL",
		);
	}

	const zipBytes = buildDocumentZip(documentId, pdfBytes);
	const putResponse = await doFetch(requestResult.BlobURLPut, {
		method: "PUT",
		body: zipBytes,
	});
	if (!putResponse.ok) {
		throw new Error(
			`reMarkable Cloud upload of the document content failed with status ${putResponse.status}`,
		);
	}

	const statusResponse = await doFetch(
		`${baseUrl}/document-storage/json/2/upload/update-status`,
		{
			method: "POST",
			headers: { ...authHeaders, "Content-Type": "application/json" },
			body: JSON.stringify([
				{
					ID: documentId,
					Parent: "",
					VissibleName: visibleName,
					Type: DOCUMENT_TYPE,
					Version: 1,
					ModifiedClient: new Date().toISOString(),
				},
			]),
		},
	);
	if (!statusResponse.ok) {
		throw new Error(
			`reMarkable Cloud upload finalization failed with status ${statusResponse.status}`,
		);
	}
	const [statusResult] = await statusResponse.json();
	if (!statusResult?.Success) {
		throw new Error("reMarkable Cloud upload finalization was not successful");
	}
}
