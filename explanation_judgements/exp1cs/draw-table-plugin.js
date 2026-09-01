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
                default: "History"
            },
            history_empty_message: {
                type: jspsych.ParameterType.STRING,
                default: "No samples yet."
            },
            rule_fn: {
                type: jspsych.ParameterType.FUNCTION,
                default: null
            }
        }
    };

    // Helper renderers
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
                ${showResult ? `<div class="draw-cell"><b><span class="${result ? 'win' : 'lose'}">${result ? 'WIN' : 'LOSE'}</span></b></div>`  : ""}
            </div>
        `;
    }

    function renderCurrentSample(draw, urnKeys, result, title, showResult) {
        if (!draw) return "";
        return `
            <div class="draw-panel-wrapper">
                ${title ? `<div class="draw-panel-title">${title}</div>` : ""}
                <div class="draw-table">
                    ${renderHeader(urnKeys, showResult)}
                    ${renderRow(draw, urnKeys, result, "current", showResult)}
                </div>
            </div>
        `;
    }

    function renderHistoryList(entries, urnKeys, title, showResult, emptyMsg) {
        return `
            <div class="draw-panel-wrapper">
                ${title ? `<div class="draw-panel-title">${title}</div>` : ""}
                ${entries.length === 0 ? `<div class="draw-history-empty">${emptyMsg}</div>` : `
                    <div class="draw-table">
                        ${renderHeader(urnKeys, showResult)}
                        ${entries.map((entry, idx) => renderRow(entry.draw, urnKeys, entry.result, `history-${idx}`, showResult)).join("")}
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
            const showRule = trial.show_rule !== false;
            const showResult = trial.show_result !== false;

            let sampleIndex = 0;
            let currentDraw = null;
            let currentResult = false;
            const historyEntries = [];
            let lastDrawStartTime = performance.now();

            display_element.innerHTML = `
                <div id="draw-plugin-container" class="draw-plugin-container">
                    
                    <!-- TOP SEGMENT: Urns, Rules, Draw Control -->
                    <div id="top-segment" class="draw-top-segment">
                        ${trial.urn_html || ""}
                        ${showRule && trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}
                        
                        <div class="center-button">
                            <button id="draw-btn" class="jspsych-btn">${trial.draw_button_label || "Draw sample"}</button>  
                            <p id="remaining-samples">${trial.remaining_label || "Remaining samples:"} ${totalSamples}</p>
                        </div>
                    </div>

                    <!-- BOTTOM SEGMENT: Split Planes -->
                    <div id="bottom-segment" class="draw-bottom-segment is-hidden">
                        
                        <!-- BOTTOM-LEFT: Current Sample & Feedback -->
                        <div id="bottom-left-plane" class="draw-bottom-left">
                            <div id="current-draw-container" class="draw-panel-wrapper"></div>
                            <div id="feedback-box" class="draw-feedback-text"></div>
                        </div>

                        <!-- BOTTOM-RIGHT: Previous Sample History -->
                        <div id="bottom-right-plane" class="draw-bottom-right">
                            <div id="history-container" class="draw-panel-wrapper"></div>
                        </div>

                    </div>

                    <!-- ACTION SEGMENT: Finish/Continue Control -->
                    <div id="action-segment" class="draw-action-segment">
                        <button id="continue-btn" class="jspsych-btn" style="display: none;">${trial.continue_button_label || "Continue"}</button>  
                    </div>
                </div>
            `;

            const drawBtn = display_element.querySelector("#draw-btn");
            const continueBtn = display_element.querySelector("#continue-btn");
            const bottomSegment = display_element.querySelector("#bottom-segment");
            
            const currentDrawContainer = display_element.querySelector("#current-draw-container");
            const feedbackBox = display_element.querySelector("#feedback-box");
            const historyContainer = display_element.querySelector("#history-container");
            const remainingSamples = display_element.querySelector("#remaining-samples");

            const finishTrial = () => {
                display_element.innerHTML = "";
                this.jsPsych.finishTrial({
                    questionID: questionId,
                    completed_samples: sampleIndex,
                    total_samples: totalSamples
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

                
                currentDraw = draw;
                currentResult = result;
                historyEntries.unshift({ draw: currentDraw, result: currentResult });
            
                
                if (sampleIndex === 1) {
                    bottomSegment.classList.remove("is-hidden");
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

                let feedbackText = `<br><p>You drew:</p><ul class="draw-feedback-list">` +
                    urnKeys.map(k => `<li>a <span style="color: ${currentDraw[k]}; font-weight: bold;">${currentDraw[k].replace('light', '')}</span> ball from box ${k}</li>`).join("") +
                    `</ul>`;

                if (showResult) {
                    feedbackText += (result
                        ? `<p>With this draw <span class="win">YOU WIN!</span></p>`
                        : `<p>With this draw <span class="lose">YOU LOSE!</span></p>`);
                }
                
                feedbackBox.innerHTML = feedbackText;
                remainingSamples.textContent = `${trial.remaining_label || "Remaining samples:"} ${Math.max(totalSamples - sampleIndex, 0)}`;

                currentDrawContainer.innerHTML = renderCurrentSample(currentDraw, urnKeys, currentResult, trial.current_title, showResult);
                historyContainer.innerHTML = renderHistoryList(historyEntries, urnKeys, trial.history_title, showResult, trial.history_empty_message);

                if (sampleIndex >= totalSamples) {
                    drawBtn.style.display = "none";
                    continueBtn.style.display = "inline-block";
                    continueBtn.onclick = finishTrial;
                }
            });
        }
    }

    DrawTablePlugin.info = info;

    return DrawTablePlugin;
})(jsPsychModule);