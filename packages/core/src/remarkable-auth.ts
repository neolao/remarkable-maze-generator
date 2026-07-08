import {
	type RemarkableApi,
	type RemarkableOptions,
	ResponseError,
	register,
	remarkable,
} from "rmapi-js";
import type { CredentialStore } from "./remarkable-credential-store.js";

export type RemarkableSession = RemarkableApi;

export type RemarkableAuthOptions = RemarkableOptions;

const PAIRING_INSTRUCTIONS_URL =
	"https://my.remarkable.com/device/browser/connect";

export async function authenticate(
	store: CredentialStore,
	pairingCode: string,
	options: RemarkableAuthOptions = {},
): Promise<RemarkableSession> {
	const existing = await store.load();
	let deviceToken: string;

	if (existing) {
		deviceToken = existing.deviceToken;
	} else {
		try {
			deviceToken = await register(pairingCode, { authHost: options.authHost });
		} catch (cause) {
			if (
				cause instanceof ResponseError &&
				(cause.status === 400 || cause.status === 401)
			) {
				throw new Error(
					`Invalid or expired pairing code. Get a new one at ${PAIRING_INSTRUCTIONS_URL} and try again.`,
					{ cause },
				);
			}
			throw new Error(
				"Failed to reach reMarkable Cloud while pairing the device",
				{ cause },
			);
		}
		await store.save({ deviceToken });
	}

	try {
		return await remarkable(deviceToken, options);
	} catch (cause) {
		throw new Error("Failed to authenticate with reMarkable Cloud", { cause });
	}
}
