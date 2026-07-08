export function parseIntegerOption(value: string, flagName: string): number {
	if (!/^-?\d+$/.test(value)) {
		throw new Error(
			`Invalid value for ${flagName}: "${value}" is not an integer`,
		);
	}
	return Number.parseInt(value, 10);
}
