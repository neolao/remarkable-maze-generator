const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;

// Mirrors the rules tested in packages/web/src/maze-form-validation.ts;
// duplicated here because this static page runs unmodified in the browser,
// with no build step available to import the compiled/tested module.
function validateMazeFormInput({ width, height, difficulty }) {
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

	return {
		valid: true,
		value: {
			width: widthResult.value,
			height: heightResult.value,
			difficulty: difficultyResult.value,
		},
	};
}

function initMazeForm() {
	const form = document.getElementById("maze-form");
	const errorElement = document.getElementById("form-error");
	const previewElement = document.getElementById("maze-preview");

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		errorElement.textContent = "";

		const result = validateMazeFormInput({
			width: form.width.value,
			height: form.height.value,
			difficulty: form.difficulty.value,
		});

		if (!result.valid) {
			errorElement.textContent = result.error;
			previewElement.style.display = "none";
			return;
		}

		const response = await fetch("/api/mazes/generate", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(result.value),
		});

		if (!response.ok) {
			const body = await response.json();
			errorElement.textContent = body.error ?? "Maze generation failed";
			previewElement.style.display = "none";
			return;
		}

		const pdfBlob = await response.blob();
		previewElement.src = URL.createObjectURL(pdfBlob);
		previewElement.style.display = "block";
	});
}

initMazeForm();
