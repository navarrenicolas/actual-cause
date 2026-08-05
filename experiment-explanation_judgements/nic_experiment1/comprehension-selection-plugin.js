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
                default: "comprehension_selection"
            },
            prompt: {
                type: jspsych.ParameterType.STRING,
                default: "Select the required balls."
            },
            current_title: {
                type: jspsych.ParameterType.STRING,
                default: "Sample"
            },
            submit_button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Submit"
            },
            retry_button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Try again"
            },
            incorrect_feedback_text: {
                type: jspsych.ParameterType.STRING,
                default: "Incorrect selection. Please try again."
            }
        }
    };

    // Helper renderers matching jsDrawTable style
    function renderHeader(urnKeys) {
        return `
            <div class="draw-row">
                ${urnKeys.map((urn) => `<div class="draw-cell"><b>${urn}</b></div>`).join("")}
            </div>
        `;
    }

    function renderRow(draw, urnKeys) {
        return `
            <div class="draw-row">
                ${urnKeys.map((urn) => `<div class="draw-cell"><div class="ball" data-urn-key="${urn}" style="background-color:${draw[urn] || 'transparent'}"></div></div>`).join("")}
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
            const questionId = trial.question_id || "comprehension_selection";
            const selectedUrns = new Set();

            let attemptCount = 0;
            let lastAttemptTime = performance.now();

            display_element.innerHTML = `
                <div id="comprehension-plugin-container" class="draw-plugin-container">
                    
                    <!-- TOP SEGMENT: Urns and optional Rule Text -->
                    <div id="top-segment" class="draw-top-segment">
                        ${trial.urn_html || ""}
                        ${trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}
					</div>

                    <!-- BOTTOM SEGMENT: Sample Display, Prompt & Feedback -->
                    <div id="bottom-segment" class="draw-bottom-segment" style="flex-direction: column; align-items: center; justify-content: flex-start; gap: 12px;">
                        
                        <div class="draw-panel-wrapper">
                            ${trial.current_title ? `<div class="draw-panel-title">${trial.current_title}</div>` : ""}
                            <div id="comprehension-draw-table" class="draw-table">
                                ${renderHeader(urnKeys)}
                                ${renderRow(draw, urnKeys)}
                            </div>
                        </div>
                        <div class="draw-feedback-text" style="text-align: center; max-width: 600px;">
                            <p>${trial.prompt}</p>
                            <div id="feedback-box"></div>
                        </div>
						<div id="action-segment" class="draw-action-segment">
							<button id="submit-btn" class="jspsych-btn">${trial.submit_button_label || "Submit"}</button>
						</div>
                    </div>

                </div>
            `;

            const sampleContainer = display_element.querySelector("#comprehension-draw-table");
            const submitBtn = display_element.querySelector("#submit-btn");
            const feedbackBox = display_element.querySelector("#feedback-box");
            const ballElements = sampleContainer.querySelectorAll(".ball");

            // Make ball elements interactive
            ballElements.forEach((ballElement) => {
                ballElement.classList.add("explanation-selectable-ball");
                ballElement.setAttribute("role", "button");
                ballElement.setAttribute("tabindex", "0");
                ballElement.setAttribute("aria-pressed", "false");
            });

            const toggleBall = (urnKey, ballElement) => {
                if (!urnKey || !ballElement) return;

                const isSelected = selectedUrns.has(urnKey);
                if (isSelected) {
                    selectedUrns.delete(urnKey);
                } else {
                    selectedUrns.add(urnKey);
                }

                ballElement.classList.toggle("is-selected", !isSelected);
                ballElement.setAttribute("aria-pressed", !isSelected ? "true" : "false");

                // Clear feedback and restore submit button label when selection changes
                feedbackBox.innerHTML = "";
                submitBtn.textContent = trial.submit_button_label || "Submit";
            };

            // Event Listeners for ball selection
            sampleContainer.addEventListener("click", (event) => {
                const ballElement = event.target.closest(".explanation-selectable-ball");
                if (ballElement && sampleContainer.contains(ballElement)) {
                    toggleBall(ballElement.dataset.urnKey, ballElement);
                }
            });

            sampleContainer.addEventListener("keydown", (event) => {
                const ballElement = event.target.closest(".explanation-selectable-ball");
                if (ballElement && sampleContainer.contains(ballElement) && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    toggleBall(ballElement.dataset.urnKey, ballElement);
                }
            });

            // Submit / Validation Handler
            submitBtn.addEventListener("click", () => {
                attemptCount += 1;
                const now = performance.now();
                const rt = Math.round(now - lastAttemptTime);
                lastAttemptTime = now;

                const selectedKeys = Array.from(selectedUrns).sort();

                // Check selection accuracy
                const isCorrect = correctKeys.length === selectedKeys.length &&
                    correctKeys.every((key, i) => key === selectedKeys[i]);

                if (typeof this.jsPsych.increaseTrialIndex === "function") {
                    this.jsPsych.increaseTrialIndex();
                }

                // Log every attempt
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
                    // Display compact failure feedback and prevent progression
                    feedbackBox.innerHTML = `<p class="lose" style="margin: 4px 0 !important;">${trial.incorrect_feedback_text || "Incorrect selection. Please try again."}</p>`;
                    submitBtn.textContent = trial.retry_button_label || "Try again";
                }
            });
        }
    }

    ComprehensionSelectionPlugin.info = info;
    return ComprehensionSelectionPlugin;
})(jsPsychModule);