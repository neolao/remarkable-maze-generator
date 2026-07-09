const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;

const MAZE_TYPES = ["rectangle", "rectangle-crossing"];
const DEFAULT_MAZE_TYPE = "rectangle";

// Mirrors the rules tested in packages/web/src/maze-form-validation.ts;
// duplicated here because this static page runs unmodified in the browser,
// with no build step available to import the compiled/tested module.
function validateMazeFormInput({ width, height, difficulty, type }) {
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

	return {
		valid: true,
		value: {
			width: widthResult.value,
			height: heightResult.value,
			difficulty: difficultyResult.value,
			type: resolvedType,
		},
	};
}

function initMazeForm() {
	const form = document.getElementById("maze-form");
	const errorElement = document.getElementById("form-error");
	const previewElement = document.getElementById("maze-preview");
	const downloadLink = document.getElementById("download-link");
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

	const hidePreview = () => {
		previewElement.style.display = "none";
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

		const folder = remarkableFolderInput.value.trim();
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

		sendStatus.textContent = body.error ?? "Failed to send maze to reMarkable";
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
	});

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		errorElement.textContent = "";

		const result = validateMazeFormInput({
			width: form.width.value,
			height: form.height.value,
			difficulty: form.difficulty.value,
			type: form["maze-type"].value,
		});

		if (!result.valid) {
			errorElement.textContent = result.error;
			hidePreview();
			return;
		}

		const requestBody = JSON.stringify(result.value);
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

		lastMazeRequestBody = requestBody;
		remarkableFolderField.style.display = "block";
		sendButton.style.display = "inline";
		sendStatus.textContent = "";
		pairingSection.style.display = "none";

		const pdfResponse = await fetch("/api/mazes/generate", requestInit);

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
