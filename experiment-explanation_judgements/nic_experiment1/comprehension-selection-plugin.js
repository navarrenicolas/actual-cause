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
            allow_multiple: {
                type: jspsych.ParameterType.BOOL,
                default: false
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
            const allowMultiple = trial.allow_multiple;
            const selectedUrns = new Set();

            // Validation Check: ensure single-selection trials do not expect multi-item solutions
            if (!allowMultiple && correctKeys.length > 1) {
                console.error(
                    `[jsComprehensionSelection Error] Trial "${questionId}" has allow_multiple set to false, but correct_keys contains ${correctKeys.length} items: [${correctKeys.join(", ")}].`
                );
            }

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

            ballElements.forEach((ballElement) => {
                ballElement.classList.add("explanation-selectable-ball");
                ballElement.setAttribute("role", "button");
                ballElement.setAttribute("tabindex", "0");
                ballElement.setAttribute("aria-pressed", "false");
            });

            const toggleBall = (urnKey, ballElement) => {
                if (!urnKey || !ballElement) return;

                const isSelected = selectedUrns.has(urnKey);

                if (allowMultiple) {
                    // Multi-select enabled: toggle individual ball state
                    if (isSelected) {
                        selectedUrns.delete(urnKey);
                    } else {
                        selectedUrns.add(urnKey);
                    }
                    ballElement.classList.toggle("is-selected", !isSelected);
                    ballElement.setAttribute("aria-pressed", !isSelected ? "true" : "false");
                } else {
                    // Single-select mode: ensure only 1 ball is selected at a time
                    if (isSelected) {
                        selectedUrns.clear();
                        ballElement.classList.remove("is-selected");
                        ballElement.setAttribute("aria-pressed", "false");
                    } else {
                        selectedUrns.clear();
                        ballElements.forEach(el => {
                            el.classList.remove("is-selected");
                            el.setAttribute("aria-pressed", "false");
                        });
                        selectedUrns.add(urnKey);
                        ballElement.classList.add("is-selected");
                        ballElement.setAttribute("aria-pressed", "true");
                    }
                }

                feedbackBox.innerHTML = "";
                submitBtn.textContent = trial.submit_button_label || "Submit";
            };

            // Event Listeners
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

            // Submit Handler
            submitBtn.addEventListener("click", () => {
                attemptCount += 1;
                const now = performance.now();
                const rt = Math.round(now - lastAttemptTime);
                lastAttemptTime = now;

                const selectedKeys = Array.from(selectedUrns).sort();

                const isCorrect = correctKeys.length === selectedKeys.length &&
                    correctKeys.every((key, i) => key === selectedKeys[i]);

                if (typeof this.jsPsych.increaseTrialIndex === "function") {
                    this.jsPsych.increaseTrialIndex();
                }

                this.jsPsych.data.write({
                    questionID: questionId,
                    attempt_number: attemptCount,
                    selected_urns: selectedKeys,
                    correct_urns: correctKeys,
                    is_correct: isCorrect,
                    allow_multiple: allowMultiple,
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
                    feedbackBox.innerHTML = `<p class="lose" style="margin: 4px 0 !important;">${trial.incorrect_feedback_text || "Incorrect selection. Please try again."}</p>`;
                    submitBtn.textContent = trial.retry_button_label || "Try again";
                }
            });
        }
    }

    ComprehensionSelectionPlugin.info = info;
    return ComprehensionSelectionPlugin;
})(jsPsychModule);