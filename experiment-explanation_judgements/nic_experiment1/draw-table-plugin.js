var jsDrawTable = (function (jspsych) {
	"use strict";

	const info = {
		name: "draw-table",
		parameters: {
			rule_text: {
				type: jspsych.ParameterType.HTML_STRING,
				default: ""
			},
			show_rule: {
				type: jspsych.ParameterType.BOOL,
				default: true
			},
			show_result: {
				type: jspsych.ParameterType.BOOL,
				default: true
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
			question_id: {
				type: jspsych.ParameterType.STRING,
				default: "familiarisation"
			},
			max_samples: {
				type: jspsych.ParameterType.INT,
				default: 10
			},
			remaining_label: {
				type: jspsych.ParameterType.STRING,
				default: "Remaining samples:"
			},
			draw_button_label: {
				type: jspsych.ParameterType.STRING,
				default: "Draw sample"
			},
			continue_button_label: {
				type: jspsych.ParameterType.STRING,
				default: "Continue"
			},
			current_title: {
				type: jspsych.ParameterType.STRING,
				default: "Current sample"
			},
			history_title: {
				type: jspsych.ParameterType.STRING,
				default: "Previous samples"
			},
			history_empty_message: {
				type: jspsych.ParameterType.STRING,
				default: "No previous samples yet."
			},
			auto_scroll: {
				type: jspsych.ParameterType.BOOL,
				default: true
			},
			rule_fn: {
				type: jspsych.ParameterType.FUNCTION,
				default: null
			}
		}
	};

	// Helper renderers respecting showResult
	function renderHeader(urnKeys, showResult = true) {
		return `
			<div class="draw-row">
				${urnKeys.map((urn) => `<div class="draw-cell"><b>${urn}</b></div>`).join("")}
				${showResult ? `<div class="draw-cell"><b>Result</b></div>` : ""}
			</div>
		`;
	}

	function renderRow(draw, urnKeys, result, rowLabel = "", showResult = true) {
		return `
			<div class="draw-row"${rowLabel ? ` data-row-label="${rowLabel}"` : ""}>
				${urnKeys.map((urn) => `<div class="draw-cell"><div class="ball" style="background-color:${draw[urn]}"></div></div>`).join("")}
				${showResult ? `<div class="draw-cell"><div class="result-box" style="background-color:${result ? "green" : "red"}"></div></div>` : ""}
			</div>
		`;
	}

	function renderSplitObservationView(currentDraw, historyEntries, urnKeys, currentResult, options = {}) {
		const showHistory = options.show_history !== false;
		const showResult = options.show_result !== false;

		return `
			<div class="draw-split-view">
				<div class="draw-current-panel">
					${options.current_title ? `<div class="draw-panel-title">${options.current_title}</div>` : ""}
					<div class="draw-table draw-current-table">
						${renderHeader(urnKeys, showResult)}
						${renderRow(currentDraw, urnKeys, currentResult, "", showResult)}
					</div>
				</div>
				${!showHistory ? "" : `
					<div class="draw-history-panel">
						${options.history_title ? `<div class="draw-panel-title">${options.history_title}</div>` : ""}
						${historyEntries.length === 0 ? `<div class="draw-history-empty">${options.history_empty_message || ""}</div>` : `
							<div class="draw-history-list">
								${renderHeader(urnKeys, showResult)}
								${historyEntries.map((entry, idx) => `
									<div class="draw-history-item">
										<div class="draw-table draw-history-table">
											${renderRow(entry.draw, urnKeys, entry.result, `history-${idx}`, showResult)}
										</div>
									</div>
								`).join("")}
							</div>
						`}
					</div>
				`}
			</div>
		`;
	}

	class DrawTablePlugin {
		constructor(jsPsych) {
			this.jsPsych = jsPsych;
		}

		trial(display_element, trial) {
			const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
			const draws = trial.draws || [];
			const totalSamples = trial.max_samples || draws.length;
			const questionId = trial.question_id || "familiarisation";
			const autoScroll = trial.auto_scroll !== false;
			const showRule = trial.show_rule !== false;
			const showResult = trial.show_result !== false;

			let sampleIndex = 0;
			let currentDraw = null;
			let currentResult = false;
			const historyEntries = [];
			let lastDrawStartTime = performance.now();

			display_element.innerHTML = `
				${showRule && trial.rule_text ? `
				<div class="instructions-container">
					${trial.rule_text}
				</div>` : ""}
				${trial.urn_html || ""}
				<div class="center-button">
					<button id="draw-btn" class="jspsych-btn">${trial.draw_button_label || "Draw sample"}</button>	
					<p id="remaining-samples">${trial.remaining_label || "Remaining samples:"} ${totalSamples}</p>
				</div>
				<div class="draw-feedback-shell">
					<div id="feedback-box"></div>
				</div>
				<div id="draw-sample-container" style="display: none;">
					<div class="draw-sample-box">
						<div id="draw-table"></div>
					</div>
				</div>
				<br>
				<div class="center-button">
					<button id="continue-btn" class="jspsych-btn" style="display: none;">${trial.continue_button_label || "Continue"}</button>	
				</div>
			`;

			const drawTable = display_element.querySelector("#draw-table");
			const drawBtn = display_element.querySelector("#draw-btn");
			const continueBtn = display_element.querySelector("#continue-btn");
			const feedbackBox = display_element.querySelector("#feedback-box");
			const remainingSamples = display_element.querySelector("#remaining-samples");
			const sampleContainer = display_element.querySelector("#draw-sample-container");

			// Initial state view configuration
			drawTable.innerHTML = renderSplitObservationView(
				{ A: "lightgrey", B: "lightgrey", C: "lightgrey", D: "lightgrey" },
				[],
				urnKeys,
				false,
				{
					current_title: trial.current_title,
					history_title: trial.history_title,
					history_empty_message: trial.history_empty_message,
					show_result: showResult
				}
			);

			const finishTrial = () => {
				display_element.innerHTML = "";
				this.jsPsych.finishTrial({
					questionID: questionId,
					completed_samples: sampleIndex,
					total_samples: totalSamples
				});
			};

			const scrollToLatestContent = () => {
				if (!autoScroll) return;
				requestAnimationFrame(() => {
					const currentPanel = display_element.querySelector("#rule-text");
					if (currentPanel) {
						currentPanel.scrollIntoView({ block: "start", behavior: "auto" });
					} else {
						window.scrollTo({
							top: document.documentElement.scrollHeight,
							behavior: "auto"
						});
					}
				});
			};

			drawBtn.addEventListener("click", () => {
				if (sampleIndex >= totalSamples) {
					finishTrial();
					return;
				}

				const drawTime = performance.now();
				const rt = Math.round(drawTime - lastDrawStartTime);
				lastDrawStartTime = drawTime;

				const draw = draws[sampleIndex];
				const result = trial.rule_fn ? trial.rule_fn(draw) : false;
				sampleIndex += 1;

				if (currentDraw) {
					historyEntries.unshift({ draw: currentDraw, result: currentResult });
				}
				currentDraw = draw;
				currentResult = result;

				if (sampleIndex === 1) {
					sampleContainer.style.display = "block";
				}

				if (typeof this.jsPsych.increaseTrialIndex === "function") {
					this.jsPsych.increaseTrialIndex();
				}

				this.jsPsych.data.write({
					questionID: questionId,
					trial_number: sampleIndex,
					draw_A: draw.A,
					draw_B: draw.B,
					draw_C: draw.C,
					draw_D: draw.D,
					result: showResult ? (result ? "win" : "lose") : undefined,
					rt: rt
				});

				let feedbackText = `You drew:<ul style="list-style: none; padding-left: 0; margin-left: 0;">` +
					urnKeys.map(k => `<li>a <span style="color: ${currentDraw[k]}; font-weight: bold;">${currentDraw[k].replace('light', '')}</span> ball from urn ${k}</li>`).join("") +
					`</ul>`;

				if (showResult) {
					feedbackText += (result
						? `<p>With this draw <span style="color: green; font-weight: bold;">YOU WIN!</span></p>`
						: `<p>With this draw <span style="color: red; font-weight: bold;">YOU LOSE!</span></p>`);
				}

				feedbackBox.innerHTML = feedbackText;

				remainingSamples.textContent = `${trial.remaining_label || "Remaining samples:"} ${Math.max(totalSamples - sampleIndex, 0)}`;

				drawTable.innerHTML = renderSplitObservationView(
					currentDraw,
					historyEntries,
					urnKeys,
					currentResult,
					{
						current_title: trial.current_title,
						history_title: trial.history_title,
						history_empty_message: trial.history_empty_message,
						show_result: showResult
					}
				);

				scrollToLatestContent();

				if (sampleIndex >= totalSamples) {
					drawBtn.style.display = "none";
					continueBtn.style.display = "";
					continueBtn.onclick = finishTrial;
				}
			});
		}
	}

	DrawTablePlugin.renderHeader = renderHeader;
	DrawTablePlugin.renderRow = renderRow;
	DrawTablePlugin.renderSplitObservationView = renderSplitObservationView;
	DrawTablePlugin.info = info;

	return DrawTablePlugin;
})(jsPsychModule);