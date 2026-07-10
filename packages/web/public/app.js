const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;

const MAZE_TYPES = ["rectangle", "rectangle-crossing", "circle"];
const DEFAULT_MAZE_TYPE = "rectangle";

const MAZE_ALGORITHMS = ["growing-tree", "kruskal", "wilson", "aldous-broder"];
const DEFAULT_MAZE_ALGORITHM = "growing-tree";

const SOLUTION_MODES = ["none", "extra-page", "overlay"];
const DEFAULT_SOLUTION_MODE = "none";

const PATH_LENGTH_TARGETS = ["short", "medium", "long"];

const FORM_PREFERENCES_COOKIE_NAME = "maze-form-preferences";
const FORM_PREFERENCES_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function isMazeFormPreferences(value) {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	return (
		typeof value.width === "string" &&
		typeof value.height === "string" &&
		typeof value.difficulty === "string" &&
		typeof value.type === "string" &&
		typeof value.algorithm === "string" &&
		typeof value.solution === "string" &&
		typeof value.showSolution === "boolean" &&
		typeof value.folder === "string" &&
		typeof value.pathLength === "string"
	);
}

// Mirrors packages/web/src/form-preferences.ts; duplicated here because this
// static page runs unmodified in the browser, with no build step available
// to import the compiled/tested module.
function serializeFormPreferences(preferences) {
	return encodeURIComponent(JSON.stringify(preferences));
}

function parseFormPreferences(rawCookieValue) {
	if (!rawCookieValue) {
		return null;
	}

	let decoded;
	try {
		decoded = JSON.parse(decodeURIComponent(rawCookieValue));
	} catch {
		return null;
	}

	return isMazeFormPreferences(decoded) ? decoded : null;
}

function readCookie(name) {
	const match = document.cookie
		.split("; ")
		.find((entry) => entry.startsWith(`${name}=`));
	return match ? match.slice(name.length + 1) : undefined;
}

function writeCookie(name, value, maxAgeSeconds) {
	document.cookie = `${name}=${value}; max-age=${maxAgeSeconds}; path=/; samesite=lax`;
}

// Mirrors the rules tested in packages/web/src/maze-form-validation.ts;
// duplicated here because this static page runs unmodified in the browser,
// with no build step available to import the compiled/tested module.
function validateMazeFormInput({
	width,
	height,
	difficulty,
	type,
	algorithm,
	solution,
	pathLength,
}) {
	const parsePositiveInteger = (raw, fieldLabel) => {
		if (raw.trim() === "" || !/^-?\d+$/.test(raw.trim())) {
			return { error: `${fieldLabel} must be a whole number` };
		}
		const value = Number.parseInt(raw, 10);
		if (value <= 0) {
			return { error: `${fieldLabel} must be greater than zero` };
		}
		return { value };
	};

	const parseDifficulty = (raw) => {
		if (raw.trim() === "" || !/^-?\d+$/.test(raw.trim())) {
			return { error: "Difficulty must be a whole number" };
		}
		const value = Number.parseInt(raw, 10);
		if (value < MIN_DIFFICULTY || value > MAX_DIFFICULTY) {
			return {
				error: `Difficulty must be between ${MIN_DIFFICULTY} and ${MAX_DIFFICULTY}`,
			};
		}
		return { value };
	};

	const widthResult = parsePositiveInteger(width, "Width");
	if (widthResult.error) return { valid: false, error: widthResult.error };

	const heightResult = parsePositiveInteger(height, "Height");
	if (heightResult.error) return { valid: false, error: heightResult.error };

	const difficultyResult = parseDifficulty(difficulty);
	if (difficultyResult.error) {
		return { valid: false, error: difficultyResult.error };
	}

	const resolvedType = type?.trim() || DEFAULT_MAZE_TYPE;
	if (!MAZE_TYPES.includes(resolvedType)) {
		return {
			valid: false,
			error: `Maze type must be one of: ${MAZE_TYPES.join(", ")}`,
		};
	}

	const resolvedAlgorithm = algorithm?.trim() || DEFAULT_MAZE_ALGORITHM;
	if (!MAZE_ALGORITHMS.includes(resolvedAlgorithm)) {
		return {
			valid: false,
			error: `Maze algorithm must be one of: ${MAZE_ALGORITHMS.join(", ")}`,
		};
	}

	const resolvedSolution = solution?.trim() || DEFAULT_SOLUTION_MODE;
	if (!SOLUTION_MODES.includes(resolvedSolution)) {
		return {
			valid: false,
			error: `Invalid solution mode "${resolvedSolution}", expected one of: ${SOLUTION_MODES.join(", ")}`,
		};
	}

	// Unlike type/algorithm/solution, an unset pathLength has no default to
	// fall back to: it means "no path-length filtering" (see ADR 046).
	const resolvedPathLength = pathLength?.trim() || undefined;
	if (
		resolvedPathLength !== undefined &&
		!PATH_LENGTH_TARGETS.includes(resolvedPathLength)
	) {
		return {
			valid: false,
			error: `Invalid path length target "${resolvedPathLength}", expected one of: ${PATH_LENGTH_TARGETS.join(", ")}`,
		};
	}

	return {
		valid: true,
		value: {
			width: widthResult.value,
			height: heightResult.value,
			difficulty: difficultyResult.value,
			type: resolvedType,
			algorithm: resolvedAlgorithm,
			solution: resolvedSolution,
			pathLength: resolvedPathLength,
		},
	};
}

function initMazeForm() {
	const form = document.getElementById("maze-form");
	const errorElement = document.getElementById("form-error");
	const previewElement = document.getElementById("maze-preview");
	const mazeSeedElement = document.getElementById("maze-seed");
	const solutionBranchCountElement = document.getElementById(
		"solution-branch-count",
	);
	const downloadLink = document.getElementById("download-link");
	const pathLengthSelect = document.getElementById("path-length");
	const remarkableFolderField = document.getElementById(
		"remarkable-folder-field",
	);
	const remarkableFolderInput = document.getElementById("remarkable-folder");
	const sendButton = document.getElementById("send-button");
	const sendStatus = document.getElementById("send-status");
	const pairingSection = document.getElementById("pairing-section");
	const pairingCodeInput = document.getElementById("pairing-code");
	const pairingSubmit = document.getElementById("pairing-submit");
	const pairingError = document.getElementById("pairing-error");

	let lastMazeRequestBody = null;

	const persistFormPreferences = () => {
		writeCookie(
			FORM_PREFERENCES_COOKIE_NAME,
			serializeFormPreferences({
				width: form.width.value,
				height: form.height.value,
				difficulty: form.difficulty.value,
				type: form["maze-type"].value,
				algorithm: form["maze-algorithm"].value,
				solution: form["solution-mode"].value,
				showSolution: form["show-solution"].checked,
				folder: remarkableFolderInput.value.trim(),
				pathLength: pathLengthSelect.value,
			}),
			FORM_PREFERENCES_COOKIE_MAX_AGE_SECONDS,
		);
	};

	const storedPreferences = parseFormPreferences(
		readCookie(FORM_PREFERENCES_COOKIE_NAME),
	);
	if (storedPreferences) {
		form.width.value = storedPreferences.width;
		form.height.value = storedPreferences.height;
		form.difficulty.value = storedPreferences.difficulty;
		form["maze-type"].value = storedPreferences.type;
		form["maze-algorithm"].value = storedPreferences.algorithm;
		form["solution-mode"].value = storedPreferences.solution;
		form["show-solution"].checked = storedPreferences.showSolution;
		remarkableFolderInput.value = storedPreferences.folder;
		pathLengthSelect.value = storedPreferences.pathLength;
	}

	const hidePreview = () => {
		previewElement.style.display = "none";
		mazeSeedElement.textContent = "";
		solutionBranchCountElement.textContent = "";
		downloadLink.style.display = "none";
		remarkableFolderField.style.display = "none";
		sendButton.style.display = "none";
		sendStatus.textContent = "";
		pairingSection.style.display = "none";
		lastMazeRequestBody = null;
	};

	const sendToRemarkable = async () => {
		sendStatus.textContent = "Sending to reMarkable...";
		pairingSection.style.display = "none";

		try {
			const folder = remarkableFolderInput.value.trim();
			persistFormPreferences();
			const sendRequestBody = JSON.stringify({
				...JSON.parse(lastMazeRequestBody),
				folder: folder === "" ? undefined : folder,
			});

			const response = await fetch("/api/mazes/send", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: sendRequestBody,
			});

			if (response.ok) {
				sendStatus.textContent = "Maze sent to reMarkable.";
				return;
			}

			const body = await response.json();

			if (body.error === "not_authenticated") {
				sendStatus.textContent = "";
				pairingSection.style.display = "block";
				return;
			}

			sendStatus.textContent =
				body.error ?? "Failed to send maze to reMarkable";
		} catch {
			sendStatus.textContent = "Failed to send maze to reMarkable";
		}
	};

	sendButton.addEventListener("click", () => {
		sendToRemarkable();
	});

	pairingSubmit.addEventListener("click", async () => {
		pairingError.textContent = "";
		const pairingCode = pairingCodeInput.value.trim();

		if (!pairingCode) {
			pairingError.textContent = "Pairing code is required";
			return;
		}

		try {
			const response = await fetch("/api/remarkable/pair", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ pairingCode }),
			});

			if (!response.ok) {
				const body = await response.json();
				pairingError.textContent = body.error ?? "Pairing failed";
				return;
			}

			pairingCodeInput.value = "";
			pairingError.textContent = "";
			await sendToRemarkable();
		} catch {
			pairingError.textContent = "Pairing failed";
		}
	});

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		errorElement.textContent = "";

		const result = validateMazeFormInput({
			width: form.width.value,
			height: form.height.value,
			difficulty: form.difficulty.value,
			type: form["maze-type"].value,
			algorithm: form["maze-algorithm"].value,
			solution: form["solution-mode"].value,
			pathLength: pathLengthSelect.value,
		});

		if (!result.valid) {
			errorElement.textContent = result.error;
			hidePreview();
			return;
		}

		persistFormPreferences();

		const requestBody = JSON.stringify({
			...result.value,
			showSolution: form["show-solution"].checked,
		});
		const requestInit = {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: requestBody,
		};

		const previewResponse = await fetch("/api/mazes/preview", requestInit);

		if (!previewResponse.ok) {
			const body = await previewResponse.json();
			errorElement.textContent = body.error ?? "Maze generation failed";
			hidePreview();
			return;
		}

		const svgMarkup = await previewResponse.text();
		previewElement.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
		previewElement.style.display = "block";

		// The preview may resolve a random seed server-side when none was
		// requested; reusing it below keeps the download and the send to
		// reMarkable identical to what is shown in the preview.
		const seed = Number(previewResponse.headers.get("x-maze-seed"));
		mazeSeedElement.textContent = `Seed: ${seed}`;
		// pathLength has already done its job resolving `seed` above (see
		// ADR 046) — dropping it here keeps the PDF download and the
		// reMarkable upload pinned to that exact seed instead of re-running
		// the candidate search from it as a new base.
		const seededRequestBody = JSON.stringify({
			...result.value,
			seed,
			pathLength: undefined,
			showSolution: form["show-solution"].checked,
		});
		const seededRequestInit = {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: seededRequestBody,
		};

		const branchPointCount = previewResponse.headers.get(
			"x-solution-branch-point-count",
		);
		solutionBranchCountElement.textContent =
			branchPointCount === null
				? ""
				: `Branch points on solution path: ${branchPointCount}`;

		lastMazeRequestBody = seededRequestBody;
		remarkableFolderField.style.display = "block";
		sendButton.style.display = "inline";
		sendStatus.textContent = "";
		pairingSection.style.display = "none";

		const pdfResponse = await fetch("/api/mazes/generate", seededRequestInit);

		if (!pdfResponse.ok) {
			downloadLink.style.display = "none";
			return;
		}

		const pdfBlob = await pdfResponse.blob();
		downloadLink.href = URL.createObjectURL(pdfBlob);
		downloadLink.style.display = "inline";
	});
}

initMazeForm();
