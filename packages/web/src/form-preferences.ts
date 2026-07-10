export interface MazeFormPreferences {
	width: string;
	height: string;
	difficulty: string;
	type: string;
	algorithm: string;
	solution: string;
	showSolution: boolean;
	folder: string;
	pathLength: string;
}

export const FORM_PREFERENCES_COOKIE_NAME = "maze-form-preferences";

function isMazeFormPreferences(value: unknown): value is MazeFormPreferences {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.width === "string" &&
		typeof candidate.height === "string" &&
		typeof candidate.difficulty === "string" &&
		typeof candidate.type === "string" &&
		typeof candidate.algorithm === "string" &&
		typeof candidate.solution === "string" &&
		typeof candidate.showSolution === "boolean" &&
		typeof candidate.folder === "string" &&
		typeof candidate.pathLength === "string"
	);
}

export function serializeFormPreferences(
	preferences: MazeFormPreferences,
): string {
	return encodeURIComponent(JSON.stringify(preferences));
}

export function parseFormPreferences(
	rawCookieValue: string | undefined | null,
): MazeFormPreferences | null {
	if (!rawCookieValue) {
		return null;
	}

	let decoded: unknown;
	try {
		decoded = JSON.parse(decodeURIComponent(rawCookieValue));
	} catch {
		return null;
	}

	return isMazeFormPreferences(decoded) ? decoded : null;
}
