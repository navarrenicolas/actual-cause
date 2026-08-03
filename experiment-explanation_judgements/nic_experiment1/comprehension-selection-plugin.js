var jsComprehensionSelection = (function (jspsych) {
	"use strict";

	const info = {
		name: "comprehension-selection",
		parameters: {
			rule_text: {
				type: jspsych.ParameterType.HTML_STRING,
				default: ""
			},
			urn_html: {
				type: jspsych.ParameterType.HTML_STRING,
				default: ""
			},
			draw: {
				type: jspsych.ParameterType.COMPLEX,
				default: {}
			},
			urn_keys: {
				type: jspsych.ParameterType.STRING,
				array: true,
				default: ["A", "B", "C", "D"]
			},
			correct_keys: {
				type: jspsych.ParameterType.STRING,
				array: true,
				default: []
			},
			question_id: {
				type: jspsych.ParameterType.STRING,
				default: "comprehension_check"
			},
			prompt: {
				type: jspsych.ParameterType.STRING,
				default: "Select the required balls."
			},
			current_title: {
				type: jspsych.ParameterType.STRING,
				default: "Observation"
			},
			submit_button_label: {
				type: jspsych.ParameterType.STRING,
				default: "Submit"
			},
			retry_button_label: {
				type: jspsych.ParameterType.STRING,
				default: "Try again"
			},
			auto_scroll: {
				type: jspsych.ParameterType.BOOL,
				default: true
			}
		}
	};

	function renderObservationHeader(urnKeys) {
		return `
			<div class="draw-row">
				${urnKeys.map((urn) => `<div class="draw-cell"><b>${urn}</b></div>`).join("")}
			</div>
		`;
	}

	function renderObservationRow(draw, urnKeys) {
		return `
			<div class="draw-row">
				${urnKeys.map((urn) => `<div class="draw-cell"><div class="ball" style="background-color:${draw[urn]}"></div></div>`).join("")}
			</div>
		`;
	}

	class ComprehensionSelectionPlugin {
		constructor(jsPsych) {
			this.jsPsych = jsPsych;
		}

		trial(display_element, trial) {
			const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
			const draw = trial.draw || {};
			const correctKeys = (trial.correct_keys || []).sort();
			const questionId = trial.question_id || "comprehension_check";
			const autoScroll = trial.auto_scroll !== false;
			const selectedUrns = new Set();

			let attemptCount = 0;
			let lastAttemptTime = performance.now();

			display_element.innerHTML = `
				<div class="instructions-container">
					${trial.rule_text || ""}
				</div>
				${trial.urn_html || ""}
				<div id="comprehension-sample-container">
					<div class="draw-sample-box">
						<div id="comprehension-draw-table">
							<div class="draw-split-view">
								<div class="draw-current-panel">
									${trial.current_title ? `<div class="draw-panel-title">${trial.current_title}</div>` : ""}
									<div class="draw-table draw-current-table">
										${renderObservationHeader(urnKeys)}
										${renderObservationRow(draw, urnKeys)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="explanation-response-shell">
					<div class="explanation-sentence"><p>${trial.prompt}</p></div>
				</div>
				<div class="center-button">
					<button id="submit-comprehension-btn" class="jspsych-btn">${trial.submit_button_label || "Submit"}</button>
				</div>
			`;

			const sampleContainer = display_element.querySelector("#comprehension-draw-table");
			const submitBtn = display_element.querySelector("#submit-comprehension-btn");
			const ballElements = sampleContainer.querySelectorAll(".draw-current-table .ball");

			ballElements.forEach((ballElement, index) => {
				const urnKey = urnKeys[index];
				if (!urnKey) return;

				ballElement.dataset.urnKey = urnKey;
				ballElement.classList.add("explanation-selectable-ball");
				ballElement.setAttribute("role", "button");
				ballElement.setAttribute("tabindex", "0");
				ballElement.setAttribute("aria-pressed", "false");
			});

			const ballByUrn = new Map();
			ballElements.forEach((ballElement) => {
				ballByUrn.set(ballElement.dataset.urnKey, ballElement);
			});

			const toggleBall = (urnKey) => {
				const ballElement = ballByUrn.get(urnKey);
				if (!ballElement) return;

				const isSelected = selectedUrns.has(urnKey);
				if (isSelected) {
					selectedUrns.delete(urnKey);
				} else {
					selectedUrns.add(urnKey);
				}

				ballElement.classList.toggle("is-selected", !isSelected);
				ballElement.setAttribute("aria-pressed", !isSelected ? "true" : "false");
				
				// Reset button text to standard submit label when participant changes selection
				submitBtn.textContent = trial.submit_button_label || "Submit";
			};

			sampleContainer.addEventListener("click", (event) => {
				const ballElement = event.target.closest(".explanation-selectable-ball");
				if (ballElement && sampleContainer.contains(ballElement)) {
					toggleBall(ballElement.dataset.urnKey);
				}
			});

			sampleContainer.addEventListener("keydown", (event) => {
				const ballElement = event.target.closest(".explanation-selectable-ball");
				if (ballElement && sampleContainer.contains(ballElement) && (event.key === "Enter" || event.key === " ")) {
					event.preventDefault();
					toggleBall(ballElement.dataset.urnKey);
				}
			});

			submitBtn.addEventListener("click", () => {
				attemptCount += 1;
				const now = performance.now();
				const rt = Math.round(now - lastAttemptTime);
				lastAttemptTime = now;

				const selectedKeys = Array.from(selectedUrns).sort();
				
				// Validate selection against target answer
				const isCorrect = correctKeys.length === selectedKeys.length &&
					correctKeys.every((key, i) => key === selectedKeys[i]);

				// Increment global trial index for every attempt made
				if (typeof this.jsPsych.increaseTrialIndex === "function") {
					this.jsPsych.increaseTrialIndex();
				}

				// Record full attempt data in jsPsych dataset
				this.jsPsych.data.write({
					questionID: questionId,
					attempt_number: attemptCount,
					selected_urns: selectedKeys,
					correct_urns: correctKeys,
					is_correct: isCorrect,
					rt: rt
				});

				if (isCorrect) {
					display_element.innerHTML = "";
					this.jsPsych.finishTrial({
						questionID: questionId,
						total_attempts: attemptCount,
						final_selected_urns: selectedKeys,
						passed: true
					});
				} else {
					// Wrong answer: prompt participant to retry
					submitBtn.textContent = trial.retry_button_label || "Try again";
				}
			});

			if (autoScroll) {
				requestAnimationFrame(() => {
					submitBtn.scrollIntoView({ block: "center", behavior: "auto" });
				});
			}
		}
	}

	ComprehensionSelectionPlugin.info = info;
	return ComprehensionSelectionPlugin;
})(jsPsychModule);