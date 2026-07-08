import type {
	CredentialStore,
	RemarkableCredentials,
} from "./remarkable-credential-store.js";

export interface RemarkableAuthOptions {
	fetch?: typeof fetch;
	baseUrl?: string;
}

export interface RemarkableSession {
	deviceToken: string;
	userToken: string;
}

const DEFAULT_BASE_URL = "https://webapp.cloud.remarkable.com";
const DEVICE_DESC = "desktop-linux";

function resolveFetch(options?: RemarkableAuthOptions): typeof fetch {
	return options?.fetch ?? globalThis.fetch;
}

function resolveBaseUrl(options?: RemarkableAuthOptions): string {
	return options?.baseUrl ?? DEFAULT_BASE_URL;
}

export async function registerDevice(
	pairingCode: string,
	options?: RemarkableAuthOptions,
): Promise<RemarkableCredentials> {
	const doFetch = resolveFetch(options);

	let response: Response;
	try {
		response = await doFetch(
			`${resolveBaseUrl(options)}/token/json/2/device/new`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code: pairingCode,
					deviceDesc: DEVICE_DESC,
					deviceID: crypto.randomUUID(),
				}),
			},
		);
	} catch (cause) {
		throw new Error(
			"Failed to reach the reMarkable Cloud service while registering the device",
			{ cause },
		);
	}

	if (!response.ok) {
		if (response.status === 400 || response.status === 401) {
			throw new Error(
				"Invalid or expired pairing code. Get a new one at https://my.remarkable.com/device/browser/connect and try again.",
			);
		}
		throw new Error(
			`reMarkable Cloud device registration failed with status ${response.status}`,
		);
	}

	const deviceToken = (await response.text()).trim();
	return { deviceToken };
}

export async function refreshUserToken(
	deviceToken: string,
	options?: RemarkableAuthOptions,
): Promise<{ userToken: string }> {
	const doFetch = resolveFetch(options);

	let response: Response;
	try {
		response = await doFetch(
			`${resolveBaseUrl(options)}/token/json/2/user/new`,
			{
				method: "POST",
				headers: { Authorization: `Bearer ${deviceToken}` },
			},
		);
	} catch (cause) {
		throw new Error(
			"Failed to reach the reMarkable Cloud service while refreshing the session",
			{ cause },
		);
	}

	if (!response.ok) {
		throw new Error(
			`reMarkable Cloud session refresh failed with status ${response.status}`,
		);
	}

	const userToken = (await response.text()).trim();
	return { userToken };
}

export async function authenticate(
	store: CredentialStore,
	pairingCode: string,
	options?: RemarkableAuthOptions,
): Promise<RemarkableSession> {
	const existing = await store.load();

	if (existing) {
		const { userToken } = await refreshUserToken(existing.deviceToken, options);
		return { deviceToken: existing.deviceToken, userToken };
	}

	const credentials = await registerDevice(pairingCode, options);
	await store.save(credentials);

	const { userToken } = await refreshUserToken(
		credentials.deviceToken,
		options,
	);
	return { deviceToken: credentials.deviceToken, userToken };
}
