var jsDrawTable = (function (jspsych) {
	"use strict";

	// jsPsych metadata for the custom draw-table trial.
	const info = {
		name: "draw-table",
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
			mode: {
				type: jspsych.ParameterType.STRING,
				default: "sequential"
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

	// Shared table renderers so the same markup can be reused outside the plugin.
	function renderDrawTableHeader(urnKeys) {
		return `
			<div class="draw-row">
				${urnKeys.map((urn) => `<div class="draw-cell"><b>${urn}</b></div>`).join("")}
				<div class="draw-cell"><b>Result</b></div>
			</div>
		`;
	}

	function renderDrawTableRow(draw, urnKeys, result, rowLabel = "") {
		return `
			<div class="draw-row"${rowLabel ? ` data-row-label="${rowLabel}"` : ""}>
				${urnKeys.map((urn) => `<div class="draw-cell"><div class="ball" style="background-color:${draw[urn]}"></div></div>`).join("")}
				<div class="draw-cell"><div class="result-box" style="background-color:${result ? "green" : "red"}"></div></div>
			</div>
		`;
	}

	function renderDrawTable(draw, urnKeys, result) {
		return `
			<div class="draw-table">
				${renderDrawTableHeader(urnKeys)}
				${renderDrawTableRow(draw, urnKeys, result)}
			</div>
		`;
	}

	function renderSamplePanel(draw, urnKeys, result, title) {
		return `
			<div class="draw-current-panel">
				${title ? `<div class="draw-panel-title">${title}</div>` : ""}
				<div class="draw-table draw-current-table">
					${renderDrawTableHeader(urnKeys)}
					${renderDrawTableRow(draw, urnKeys, result)}
				</div>
			</div>
		`;
	}

	function renderHistoryPanel(historyEntries, urnKeys, title, emptyMessage) {
		const entries = historyEntries || [];
		return `
			<div class="draw-history-panel">
				${title ? `<div class="draw-panel-title">${title}</div>` : ""}
				${entries.length === 0 ? `<div class="draw-history-empty">${emptyMessage || ""}</div>` : `
					<div class="draw-history-list">
                        ${renderDrawTableHeader(urnKeys)}
						${entries.map((entry, idx) => `
							<div class="draw-history-item">
								<div class="draw-table draw-history-table">
									${renderDrawTableRow(entry.draw, urnKeys, entry.result, `history-${idx}`)}
								</div>
							</div>
						`).join("")}
					</div>
				`}
			</div>
		`;
	}

	function renderSplitObservationView(currentDraw, historyEntries, urnKeys, currentResult, options = {}) {
		return `
			<div class="draw-split-view">
				${renderSamplePanel(currentDraw, urnKeys, currentResult, options.current_title)}
				${options.show_history === false ? "" : renderHistoryPanel(historyEntries, urnKeys, options.history_title, options.history_empty_message)}
			</div>
		`;
	}

	// Custom plugin that handles the familiarisation draw table and trial flow.
	class DrawTablePlugin {
		constructor(jsPsych) {
			// Store the jsPsych instance so the plugin can write data and finish the trial.
			this.jsPsych = jsPsych;
		}

		trial(display_element, trial) {
			// Trial state: track how many samples have been shown and which urn labels to display.
			const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
			const draws = trial.draws || [];
			const totalSamples = trial.max_samples || draws.length;
			const questionId = trial.question_id || "familiarisation";
			const mode = trial.mode || "sequential";
			const autoScroll = trial.auto_scroll !== false;
			let sampleIndex = 0;
			let currentDraw = null;
			let currentResult = false;
			const historyEntries = [];

			// Render the instruction text, draw controls, feedback area, and static urn display.
            display_element.innerHTML = `
				<div class="instructions-container">
					${trial.rule_text || ""}
				</div>
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
					<button id="continue-btn" class="jspsych-btn" style="display: none;">Continue</button>	
				</div>
			`;

			// Cache the interactive elements so the button can update the table incrementally.
			const drawTable = display_element.querySelector("#draw-table");
			const drawBtn = display_element.querySelector("#draw-btn");
			const continueBtn = display_element.querySelector("#continue-btn");
			const feedbackBox = display_element.querySelector("#feedback-box");
			const remainingSamples = display_element.querySelector("#remaining-samples");
			const sampleContainer = display_element.querySelector("#draw-sample-container");

			// Seed the split view with the first sample placeholder and an empty history area.
			drawTable.innerHTML = renderSplitObservationView(
				{ A: "lightgrey", B: "lightgrey", C: "lightgrey", D: "lightgrey" },
				[],
				urnKeys,
				false,
				{
					current_title: trial.current_title || "Current sample",
					history_title: trial.history_title || "Previous samples",
					history_empty_message: trial.history_empty_message || "No previous samples yet.",
					show_history: trial.show_history !== false
				}
			);

			// Finalize the trial and return a compact summary once the last sample has been shown.
			const finishTrial = () => {
				this.jsPsych.finishTrial({
					questionID: questionId,
					completed_samples: sampleIndex,
					total_samples: totalSamples
				});
			};
			const scrollToLatestContent = () => {
				if (!autoScroll) {
					return;
				}

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

			// Reveal the next draw, record it in jsPsych data, and update the visible table.
			drawBtn.addEventListener("click", () => {
				if (sampleIndex >= totalSamples) {
					finishTrial();
					return;
				}

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

				// Keep the per-click data in the trial record so analysis can recover the displayed sequence.
				this.jsPsych.data.write({
					questionID: questionId,
					trial_number: sampleIndex,
					draw_A: draw.A,
					draw_B: draw.B,
					draw_C: draw.C,
					draw_D: draw.D,
					result: result ? "win" : "lose"
				});

				feedbackBox.innerHTML = `You drew:<ul style="list-style: none; padding-left: 0; margin-left: 0;"><li>a <span style="color: ${currentDraw.A}; font-weight: bold;">${currentDraw.A.replace('light', '')}</span> ball from urn A</li>
					 <li>a <span style="color: ${currentDraw.B}; font-weight: bold;">${(currentDraw.B.replace('light', ''))}</span> ball from urn B</li>
					 <li>a <span style="color: ${currentDraw.C}; font-weight: bold;">${(currentDraw.C.replace('light', ''))}</span> ball from urn C</li>
					 <li>a <span style="color: ${currentDraw.D}; font-weight: bold;">${(currentDraw.D.replace('light', ''))}</span> ball from urn D</li></ul>` + 
                    (result
					? `<p>With this draw <span style="color: green; font-weight: bold;">YOU WIN!</span></p>`
					: `<p>With this draw <span style="color: red; font-weight: bold;">YOU LOSE!</span></p>`);
				remainingSamples.textContent = `${trial.remaining_label || "Remaining samples:"} ${Math.max(totalSamples - sampleIndex, 0)}`;

				// Replace the split view so the current sample stays prominent and earlier samples move into history.
				drawTable.innerHTML = renderSplitObservationView(
					currentDraw,
					historyEntries,
					urnKeys,
					currentResult,
					{
						current_title: trial.current_title || "Current sample",
						history_title: trial.history_title || "Previous samples",
						history_empty_message: trial.history_empty_message || "No previous samples yet.",
						show_history: trial.show_history !== false
					}
				);

				
				scrollToLatestContent();

				// Once the configured number of samples has been reached, convert the button into trial completion.
				if (sampleIndex >= totalSamples) {
					drawBtn.style.display = "none";
                    continueBtn.style.display = "";
					continueBtn.onclick = finishTrial;
				}
			});
		}
	}

	// Expose the shared render helpers so other trials can reuse the same table markup.
	DrawTablePlugin.renderDrawTableHeader = renderDrawTableHeader;
	DrawTablePlugin.renderDrawTableRow = renderDrawTableRow;
	DrawTablePlugin.renderDrawTable = renderDrawTable;
	DrawTablePlugin.renderSamplePanel = renderSamplePanel;
	DrawTablePlugin.renderHistoryPanel = renderHistoryPanel;
	DrawTablePlugin.renderSplitObservationView = renderSplitObservationView;

	// Expose the plugin to jsPsych.
	DrawTablePlugin.info = info;
	return DrawTablePlugin;
})(jsPsychModule);
