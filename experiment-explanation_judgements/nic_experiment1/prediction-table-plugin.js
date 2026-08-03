var jsPredictionTable = (function (jspsych) {
	"use strict";

	const info = {
		name: "prediction-table",
		parameters: {
			rule_text: {
				type: jspsych.ParameterType.HTML_STRING,
				default: ""
			},
			urn_html: {
				type: jspsych.ParameterType.HTML_STRING,
				default: ""
			},
			draws: {
				type: jspsych.ParameterType.COMPLEX,
				array: true,
				default: []
			},
			urn_keys: {
				type: jspsych.ParameterType.STRING,
				array: true,
				default: ["A", "B", "C", "D"]
			},
			rule_fn: {
				type: jspsych.ParameterType.FUNCTION,
				default: null
			},
			question_id: {
				type: jspsych.ParameterType.STRING,
				default: "rule_prediction_task"
			},
			prompt: {
				type: jspsych.ParameterType.STRING,
				default: "Click the prediction boxes below to toggle between WIN (green) and LOSE (red) for each possible draw."
			},
			submit_button_label: {
				type: jspsych.ParameterType.STRING,
				default: "Check Predictions"
			},
			continue_button_label: {
				type: jspsych.ParameterType.STRING,
				default: "Continue"
			},
			auto_scroll: {
				type: jspsych.ParameterType.BOOL,
				default: true
			}
		}
	};

	class PredictionTablePlugin {
		constructor(jsPsych) {
			this.jsPsych = jsPsych;
		}

		trial(display_element, trial) {
			const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
			const draws = trial.draws || [];
			const questionId = trial.question_id || "rule_prediction_task";
			const autoScroll = trial.auto_scroll !== false;
			const ruleFn = trial.rule_fn || (() => false);

			// Track predictions state: Map row index to true (win), false (lose), or null (unselected)
			const predictions = new Map();
			draws.forEach((_, index) => predictions.set(index, null));

			let attemptCount = 0;
			let startTime = performance.now();

			// Header matching your 6-column structure
			const renderHeader = () => `
				<div class="draw-row">
					${urnKeys.map((urn) => `<div class="draw-cell"><b>${urn}</b></div>`).join("")}
					<div class="draw-cell"><b>Result</b></div>
					<div class="draw-cell prediction-status-cell"></div>
				</div>
			`;

			const renderRows = () => {
				return draws.map((draw, idx) => {
					const state = predictions.get(idx);
					let bgStyle = "background-color: #f8f9fa; border: 2px dashed #a0a0a0; color: #666;";
					let textLabel = "Click";
					
					if (state === true) {
						bgStyle = "background-color: #28a745; border: 2px solid darkgreen; color: white;";
						textLabel = "WIN";
					} else if (state === false) {
						bgStyle = "background-color: #dc3545; border: 2px solid darkred; color: white;";
						textLabel = "LOSE";
					}

					return `
						<div class="draw-history-item">
							<div class="draw-table draw-history-table">
								<div class="draw-row" data-row-index="${idx}">
									${urnKeys.map((urn) => `<div class="draw-cell"><div class="ball" style="background-color:${draw[urn]}"></div></div>`).join("")}
									<div class="draw-cell">
										<div class="result-box prediction-box" data-index="${idx}" style="${bgStyle}">
											${textLabel}
										</div>
									</div>
									<div class="draw-cell prediction-status-cell" id="status-cell-${idx}">
									</div>
								</div>
							</div>
						</div>
					`;
				}).join("");
			};

			display_element.innerHTML = `
				${trial.rule_text ? `<div class="instructions-container">${trial.rule_text}</div>` : ""}
				${trial.urn_html || ""}
				
				<div class="explanation-response-shell" style="margin-top: 15px;">
					<p>${trial.prompt}</p>
				</div>

				<div class="prediction-table-wrapper" style="display:flex; justify-content:center; margin:15px 0;">
					<div class="draw-history-panel prediction-history-panel">
						<div class="draw-history-list">
							${renderHeader()}
							<div id="prediction-rows-body">
								${renderRows()}
							</div>
						</div>
					</div>
				</div>

				<div class="draw-feedback-shell">
					<div id="feedback-message" style="font-weight: bold; margin: 10px 0;"></div>
				</div>

				<div class="center-button" style="margin-bottom: 20px;">
					<button id="submit-predictions-btn" class="jspsych-btn">${trial.submit_button_label || "Check Predictions"}</button>
					<button id="continue-predictions-btn" class="jspsych-btn" style="display: none; background-color: #28a745; color: white;">${trial.continue_button_label || "Continue"}</button>
				</div>
			`;

			const rowsBody = display_element.querySelector("#prediction-rows-body");
			const submitBtn = display_element.querySelector("#submit-predictions-btn");
			const continueBtn = display_element.querySelector("#continue-predictions-btn");
			const feedbackMsg = display_element.querySelector("#feedback-message");

			// Toggle prediction state: null -> true (WIN) -> false (LOSE) -> true (WIN)
			rowsBody.addEventListener("click", (event) => {
				const box = event.target.closest(".prediction-box");
				if (!box) return;

				const idx = parseInt(box.dataset.index, 10);
				const currentState = predictions.get(idx);

				let newState = true; // default to win on first click
				if (currentState === true) newState = false; // toggle to lose
				else if (currentState === false) newState = true; // toggle back to win

				predictions.set(idx, newState);

				// Reset status icons on edit
				const statusCell = display_element.querySelector(`#status-cell-${idx}`);
				if (statusCell) statusCell.innerHTML = "";
				feedbackMsg.innerHTML = "";

				// Re-render prediction table UI
				rowsBody.innerHTML = renderRows();
			});

			submitBtn.addEventListener("click", () => {
				attemptCount += 1;
				const now = performance.now();
				const rt = Math.round(now - startTime);

				let allSelected = true;
				let allCorrect = true;
				const detailedResults = [];

				draws.forEach((draw, idx) => {
					const predicted = predictions.get(idx);
					const actual = !!ruleFn(draw);
					const statusCell = display_element.querySelector(`#status-cell-${idx}`);

					if (predicted === null) {
						allSelected = false;
						allCorrect = false;
						if (statusCell) statusCell.innerHTML = "";
						return;
					}

					const isCorrect = (predicted === actual);
					if (!isCorrect) allCorrect = false;

					// Render Green Checkmark or Red X
					if (statusCell) {
						statusCell.innerHTML = isCorrect
							? `<span class="status-check" title="Correct">✔</span>`
							: `<span class="status-cross" title="Incorrect">✘</span>`;
					}

					detailedResults.push({
						draw_index: idx,
						draw: draw,
						predicted: predicted ? "win" : "lose",
						actual: actual ? "win" : "lose",
						is_correct: isCorrect
					});
				});

				// Increment global trial index for attempt history
				if (typeof this.jsPsych.increaseTrialIndex === "function") {
					this.jsPsych.increaseTrialIndex();
				}

				// Log attempt to jsPsych data
				this.jsPsych.data.write({
					questionID: questionId,
					attempt_number: attemptCount,
					all_selected: allSelected,
					all_correct: allCorrect,
					detailed_results: detailedResults,
					rt: rt
				});

				if (!allSelected) {
					feedbackMsg.style.color = "#d9534f";
					feedbackMsg.textContent = "Please make a prediction for every single draw before checking.";
					return;
				}

				if (allCorrect) {
					feedbackMsg.style.color = "#28a745";
					feedbackMsg.textContent = "All predictions are correct! Click Continue to proceed.";
					submitBtn.style.display = "none";
					continueBtn.style.display = "";

					if (autoScroll) {
						requestAnimationFrame(() => {
							continueBtn.scrollIntoView({ block: "center", behavior: "auto" });
						});
					}
				} else {
					feedbackMsg.style.color = "#d9534f";
					feedbackMsg.textContent = "Some predictions are incorrect (marked with ✘). Please adjust your selections and try again.";
				}
			});

			continueBtn.addEventListener("click", () => {
				display_element.innerHTML = "";
				this.jsPsych.finishTrial({
					questionID: questionId,
					total_attempts: attemptCount,
					passed: true
				});
			});
		}
	}

	PredictionTablePlugin.info = info;
	return PredictionTablePlugin;
})(jsPsychModule);