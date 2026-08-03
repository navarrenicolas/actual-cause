var jsExplanationSelection = (function (jspsych) {
	"use strict";

	const info = {
		name: "explanation-selection",
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
			question_id: {
				type: jspsych.ParameterType.STRING,
				default: "explanation_selection"
			},
			is_win: {
				type: jspsych.ParameterType.BOOL,
				default: false
			},
			current_title: {
				type: jspsych.ParameterType.STRING,
				default: "Observation"
			},
			selection_prompt: {
				type: jspsych.ParameterType.STRING,
				default: "Select the balls that explain the result."
			},
			draw_button_label: {
				type: jspsych.ParameterType.STRING,
				default: "Draw sample"
			},
			continue_button_label: {
				type: jspsych.ParameterType.STRING,
				default: "Continue"
			},
			auto_draw: {
				type: jspsych.ParameterType.BOOL,
				default: false
			},
			auto_scroll: {
				type: jspsych.ParameterType.BOOL,
				default: true
			}
		}
	};

	function normalizeColor(color) {
		if (color === "hotpink") return "pink";
		if (color === "lightgrey") return "grey";
		return color || "";
	}

	function getArticle(word) {
		return /^[aeiou]/i.test(word) ? "an" : "a";
	}

	function describeBall(color, urnKey) {
		const readableColor = normalizeColor(color);
		return `${getArticle(readableColor)} <span style="color: ${color}; font-weight: bold;">${readableColor}</span> ball from urn ${urnKey}`;
	}

	function joinDescriptions(descriptions) {
		if (descriptions.length === 1) return descriptions[0];
		if (descriptions.length === 2) return `${descriptions[0]} and ${descriptions[1]}`;
		return `${descriptions.slice(0, -1).join(", ")}, and ${descriptions[descriptions.length - 1]}`;
	}

	function renderSentence(isWin, descriptions, promptText) {
		if (descriptions.length === 0) return `<p>${promptText}</p>`;
		const outcomeText = isWin ? "won" : "lost";
		return `<p>I <span class="${isWin ? 'win' : 'lose'}">${outcomeText}</span> because I got ${joinDescriptions(descriptions)}.</p>`;
	}

	class ExplanationSelectionPlugin {
		constructor(jsPsych) {
			this.jsPsych = jsPsych;
		}

		trial(display_element, trial) {
			const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
			const draw = trial.draw || {};
			const isWin = !!trial.is_win;
			const questionId = trial.question_id || "explanation_selection";
			const autoScroll = trial.auto_scroll !== false;
			const autoDraw = trial.auto_draw !== false;
			const selectedUrns = new Set();
			
			let startTime = autoDraw ? performance.now() : null;

			display_element.innerHTML = `
				<div class="instructions-container">
					${trial.rule_text || ""}
				</div>
				${trial.urn_html || ""}
				${!autoDraw ? `
				<div class="center-button" id="draw-sample-btn-container">
					<button id="draw-explanation-sample-btn" class="jspsych-btn">${trial.draw_button_label || "Draw sample"}</button>
				</div>
				` : ""}
				<div id="explanation-interactive-area" style="${autoDraw ? "" : "display: none;"}">
					<div class="draw-feedback-shell">
						<div id="feedback-box"></div>
					</div>
					<div id="explanation-sample-container">
						<div class="draw-sample-box">
							<div id="explanation-draw-table"></div>
						</div>
					</div>
					<div class="explanation-response-shell">
						<div id="explanation-sentence" class="explanation-sentence"></div>
					</div>
					<div class="center-button">
						<button id="finish-explanation-btn" class="jspsych-btn" disabled>${trial.continue_button_label || "Continue"}</button>
					</div>
				</div>
			`;

			const sampleContainer = display_element.querySelector("#explanation-draw-table");
			const sentenceBox = display_element.querySelector("#explanation-sentence");
			const finishBtn = display_element.querySelector("#finish-explanation-btn");
			const feedbackBox = display_element.querySelector("#feedback-box");
			const interactiveArea = display_element.querySelector("#explanation-interactive-area");
			const drawBtn = display_element.querySelector("#draw-explanation-sample-btn");
			const drawBtnContainer = display_element.querySelector("#draw-sample-btn-container");

			// Render Observation Table View
			sampleContainer.innerHTML = jsDrawTable.renderSplitObservationView 
				? jsDrawTable.renderSplitObservationView(draw, [], urnKeys, isWin, { show_history: false, current_title: trial.current_title || "Observation" })
				: "";

			const ballElements = sampleContainer.querySelectorAll(".draw-current-table .ball");
			ballElements.forEach((ballElement, index) => {
				const urnKey = urnKeys[index];
				if (!urnKey) return;

				ballElement.dataset.urnKey = urnKey;
				ballElement.dataset.color = draw[urnKey] || "";
				ballElement.classList.add("explanation-selectable-ball");
				ballElement.setAttribute("role", "button");
				ballElement.setAttribute("tabindex", "0");
				ballElement.setAttribute("aria-pressed", "false");
				ballElement.setAttribute("title", "Click to select or deselect this ball");
			});

			const updateSelectionSentence = () => {
				const descriptions = urnKeys
					.filter((urnKey) => selectedUrns.has(urnKey))
					.map((urnKey) => describeBall(draw[urnKey], urnKey));

				
                let feedbackText = `You drew:<ul style="list-style: none; padding-left: 0; margin-left: 0;">` +
					urnKeys.map(k => `<li>a <span style="color: ${draw[k]}; font-weight: bold;">${draw[k].replace('light', '')}</span> ball from urn ${k}</li>`).join("") +
					`</ul>`;

                feedbackText += (isWin
                    ? `<p>With this draw <span style="color: green; font-weight: bold;">YOU WIN!</span></p>`
                    : `<p>With this draw <span style="color: red; font-weight: bold;">YOU LOSE!</span></p>`);
                
                feedbackText += `<p>Why did you ${isWin ? '<span class="win">win</span>' : '<span class="lose">lose</span>'}?`;
                
				feedbackBox.innerHTML = feedbackText;

				sentenceBox.innerHTML = renderSentence(
					isWin,
					descriptions,
					trial.selection_prompt || "Select the balls that explain the result."
				);
				finishBtn.disabled = descriptions.length === 0;
			};

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
				updateSelectionSentence();
			};

			// Handle manual sample draw button click
			if (!autoDraw && drawBtn) {
				drawBtn.addEventListener("click", () => {
					drawBtnContainer.style.display = "none";
					interactiveArea.style.display = "block";
					startTime = performance.now(); // Start RT clock when observation appears

					if (autoScroll) {
						requestAnimationFrame(() => {
							sentenceBox.scrollIntoView({ block: "center", behavior: "auto" });
						});
					}
				});
			}

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

			finishBtn.addEventListener("click", () => {
				if (selectedUrns.size === 0) return;

				const endTime = performance.now();
				const rt = Math.round(endTime - startTime);
				const selectedKeys = urnKeys.filter((urnKey) => selectedUrns.has(urnKey));
				const selectedDescriptions = selectedKeys.map((urnKey) => describeBall(draw[urnKey], urnKey));

				this.jsPsych.finishTrial({
					questionID: questionId,
					selected_urns: selectedKeys,
					selected_balls: selectedKeys.map((urnKey) => draw[urnKey]),
					selected_explanation: renderSentence(isWin, selectedDescriptions, trial.selection_prompt || "Select the balls that explain the result."),
					result: isWin ? "win" : "lose",
					rt: rt
				});
			});

			updateSelectionSentence();

			if (autoDraw && autoScroll) {
				requestAnimationFrame(() => {
					sentenceBox.scrollIntoView({ block: "center", behavior: "auto" });
				});
			}
		}
	}

	ExplanationSelectionPlugin.info = info;
	return ExplanationSelectionPlugin;
})(jsPsychModule);