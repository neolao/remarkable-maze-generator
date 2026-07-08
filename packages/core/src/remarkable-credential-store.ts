export interface RemarkableCredentials {
	deviceToken: string;
}

export interface CredentialStore {
	load(): Promise<RemarkableCredentials | null>;
	save(credentials: RemarkableCredentials): Promise<void>;
}
