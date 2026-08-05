var jsExplanationSelection = (function (jspsych) {
    "use strict";

    const info = {
        name: "explanation-selection",
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
            history: {
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
                default: "explanation_selection"
            },
            rule_fn: {
                type: jspsych.ParameterType.FUNCTION,
                default: null
            },
            selection_prompt: {
                type: jspsych.ParameterType.STRING,
                default: "Select the ball(s) that explain the result."
            },
            draw_button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Draw sample"
            },
            submit_button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Submit Explanation"
            },
            continue_button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Continue"
            },
            remaining_label: {
                type: jspsych.ParameterType.STRING,
                default: "Remaining samples:"
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
                default: "No samples committed yet."
            },
            max_samples: {
                type: jspsych.ParameterType.INT,
                default: null
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
        if (!color) return "";
        if (color === "hotpink") return "pink";
        if (color === "lightgrey") return "grey";
        return color.replace("light", "");
    }

    function getArticle(word) {
        return /^[aeiou]/i.test(word) ? "an" : "a";
    }

    function describeBall(color, urnKey) {
        const readableColor = normalizeColor(color);
        return `${getArticle(readableColor)} <span style="color: ${color}; font-weight: bold;">${readableColor}</span> ball from urn ${urnKey}`;
    }

    function joinDescriptions(descriptions) {
        if (descriptions.length === 0) return "";
        if (descriptions.length === 1) return descriptions[0];
        if (descriptions.length === 2) return `${descriptions[0]} and ${descriptions[1]}`;
        return `${descriptions.slice(0, -1).join(", ")}, and ${descriptions[descriptions.length - 1]}`;
    }

    function renderSentence(isWin, descriptions, promptText, showResult = true) {
        if (descriptions.length === 0) return `<p>${promptText}</p>`;
        if (!showResult) {
            return `<p>I selected ${joinDescriptions(descriptions)}.</p>`;
        }
        const outcomeText = isWin ? "won" : "lost";
        return `<p>I <span class="${isWin ? 'win' : 'lose'}">${outcomeText}</span> because I got ${joinDescriptions(descriptions)}.</p>`;
    }

    function renderHeader(urnKeys, showResult = true) {
        return `
            <div class="draw-row header-row">
                ${urnKeys.map((urn) => `<div class="draw-cell"><b>${urn}</b></div>`).join("")}
                ${showResult ? `<div class="draw-cell"><b>Result</b></div>` : ""}
            </div>
        `;
    }

    // Current Interactive Row Renderer (Box container stripped, ball rendered directly)
    function renderCurrentSampleRow(draw, urnKeys, selectedUrns, result, showResult = true) {
        const isWin = typeof result === "boolean" ? result : result === "win";
        const selectedSet = new Set(selectedUrns);

        const slotsHTML = urnKeys.map(key => {
            const color = draw[key] || "";
            const isSelected = selectedSet.has(key);
            const selectClass = isSelected ? "is-selected" : "";
            const bgStyle = color ? `background-color: ${color};` : "";

            return `
                <div class="draw-cell">
                    <div class="ball explanation-selectable-ball ${selectClass}" 
                         data-urn-key="${key}" 
                         data-color="${color}" 
                         role="button" 
                         tabindex="0" 
                         aria-pressed="${isSelected}"
                         title="Click to select or deselect ball ${key}"
                         style="${bgStyle}"></div>
                </div>
            `;
        }).join("");

        const outcomeHTML = showResult 
            ? `<div class="draw-cell"><b><span class="${isWin ? 'win' : 'lose'}">${isWin ? 'WIN' : 'LOSE'}</span></b></div>` 
            : "";

        return `
            <div class="draw-table">
                ${renderHeader(urnKeys, showResult)}
                <div class="draw-row current-row">
                    ${slotsHTML}
                    ${outcomeHTML}
                </div>
            </div>
        `;
    }

    // History List Renderer with Sticky Header & Scrollable Body
    function renderHistoryList(historyEntries, urnKeys, title, showResult, emptyMsg) {
    if (!historyEntries || historyEntries.length === 0) {
        return `
            <div class="draw-panel-wrapper draw-history-panel">
                ${title ? `<div class="draw-panel-title">${title}</div>` : ""}
                <div class="draw-history-empty">${emptyMsg}</div>
            </div>
        `;
    }

    const rowsHTML = historyEntries.map((entry, idx) => {
        const isWin = typeof entry.result === "boolean" ? entry.result : entry.result === "win";
        const selectedSet = new Set(entry.selected_urns || []);

        const slotsHTML = urnKeys.map(key => {
            const color = entry.draw[key] || "";
            const isSelected = selectedSet.has(key);
            const selectClass = isSelected ? "is-selected" : "";
            const bgStyle = color ? `background-color: ${color};` : "";

            return `
                <div class="draw-cell">
                    <div class="ball ${selectClass}" style="${bgStyle}"></div>
                </div>
            `;
        }).join("");

        const outcomeHTML = showResult 
            ? `<div class="draw-cell"><b><span class="${isWin ? 'win' : 'lose'}">${isWin ? 'WIN' : 'LOSE'}</span></b></div>` 
            : "";

        return `
            <div class="draw-row history-row" data-row-label="history-${idx}">
                ${slotsHTML}
                ${outcomeHTML}
            </div>
        `;
    }).join("");

    return `
        <div class="draw-panel-wrapper draw-history-panel">
            ${title ? `<div class="draw-panel-title">${title} (${historyEntries.length})</div>` : ""}
            <div class="draw-table">
                ${renderHeader(urnKeys, showResult)}
                <div class="draw-history-scroll-body">
                    ${rowsHTML}
                </div>
            </div>
        </div>
    `;
}

    class ExplanationSelectionPlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
        }

        trial(display_element, trial) {
            const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
            const draws = trial.draws || [];
            const historyEntries = [...(trial.history || [])];
            const questionId = trial.question_id || "explanation_selection";
            const autoScroll = trial.auto_scroll !== false;
            const autoDraw = trial.auto_draw === true;
            const showRule = trial.show_rule !== false;
            const showResult = trial.show_result !== false;
            const totalSamples = trial.max_samples || draws.length;

            let sampleIndex = 0;
            let currentDraw = null;
            let currentResult = false;
            let sampleStartTime = performance.now();
            const selectedUrns = new Set();

            display_element.innerHTML = `
                <div id="draw-plugin-container" class="draw-plugin-container">
                    <div id="top-segment" class="draw-top-segment">
                        ${trial.urn_html || ""}
                        ${showRule && trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}
                        
                        <div class="center-button" id="draw-sample-btn-container" style="${autoDraw ? 'display:none;' : 'display:block;'}">
                            <button id="draw-btn" class="jspsych-btn">${trial.draw_button_label || "Draw sample"}</button>  
                            <p id="remaining-samples">${trial.remaining_label || "Remaining samples:"} ${totalSamples}</p>
                        </div>
                    </div>

                    <div id="bottom-segment" class="draw-bottom-segment is-hidden">
                        <div id="bottom-left-plane" class="draw-bottom-left">
                            <div id="current-draw-container" class="draw-panel-wrapper"></div>
                            <div id="feedback-box" class="draw-feedback-text"></div>
                            <div id="explanation-sentence" class="explanation-sentence"></div>
                            <div id="submit-explanation-container" class="draw-action-segment" style="margin-top: 15px;">
                                <button id="submit-explanation-btn" class="jspsych-btn" disabled>${trial.submit_button_label || "Submit Explanation"}</button>  
                            </div>
                        </div>

                        <div id="bottom-right-plane" class="draw-bottom-right">
                            <div id="history-container" class="draw-panel-wrapper"></div>
                        </div>
                    </div>

                    <div id="action-segment" class="draw-action-segment">
                        <button id="continue-btn" class="jspsych-btn" style="display: none;">${trial.continue_button_label || "Continue"}</button>  
                    </div>
                </div>
            `;

            const drawBtn = display_element.querySelector("#draw-btn");
            const drawBtnContainer = display_element.querySelector("#draw-sample-btn-container");
            const submitExplanationBtn = display_element.querySelector("#submit-explanation-btn");
            const continueBtn = display_element.querySelector("#continue-btn");
            const bottomSegment = display_element.querySelector("#bottom-segment");
            const currentDrawContainer = display_element.querySelector("#current-draw-container");
            const feedbackBox = display_element.querySelector("#feedback-box");
            const sentenceBox = display_element.querySelector("#explanation-sentence");
            const historyContainer = display_element.querySelector("#history-container");
            const remainingSamples = display_element.querySelector("#remaining-samples");

            historyContainer.innerHTML = renderHistoryList(
                historyEntries, 
                urnKeys, 
                trial.history_title, 
                showResult, 
                trial.history_empty_message
            );

            const updateSelectionSentence = () => {
                if (!currentDraw) return;

                const descriptions = urnKeys
                    .filter((urnKey) => selectedUrns.has(urnKey))
                    .map((urnKey) => describeBall(currentDraw[urnKey], urnKey));

                let feedbackText = `<p>You drew:</p><ul class="draw-feedback-list">` +
                    urnKeys.map(k => `<li>a <span style="color: ${currentDraw[k]}; font-weight: bold;">${normalizeColor(currentDraw[k])}</span> ball from urn ${k}</li>`).join("") +
                    `</ul>`;

                if (showResult) {
                    feedbackText += (currentResult
                        ? `<p>With this draw <span class="win">YOU WIN!</span></p>`
                        : `<p>With this draw <span class="lose">YOU LOSE!</span></p>`);
                    feedbackText += `<p><strong>Why did you ${currentResult ? '<span class="win">win</span>' : '<span class="lose">lose</span>'}?</strong></p>`;
                } else {
                    feedbackText += `<p><strong>Which balls explain this draw?</strong></p>`;
                }

                feedbackBox.innerHTML = feedbackText;
                sentenceBox.innerHTML = renderSentence(
                    currentResult,
                    descriptions,
                    trial.selection_prompt,
                    showResult
                );

                submitExplanationBtn.disabled = selectedUrns.size === 0;
            };

            const loadSample = () => {
                if (sampleIndex >= totalSamples) {
                    finishTrial();
                    return;
                }

                currentDraw = draws[sampleIndex];
                currentResult = trial.rule_fn ? trial.rule_fn(currentDraw) : false;
                selectedUrns.clear();
                sampleStartTime = performance.now();

                bottomSegment.classList.remove("is-hidden");
                if (drawBtnContainer) drawBtnContainer.style.display = "none";

                currentDrawContainer.innerHTML = `
                    ${trial.current_title ? `<div class="draw-panel-title">${trial.current_title}</div>` : ""}
                    ${renderCurrentSampleRow(currentDraw, urnKeys, selectedUrns, currentResult, showResult)}
                `;

                updateSelectionSentence();

                if (autoScroll) {
                    requestAnimationFrame(() => {
                        sentenceBox.scrollIntoView({ block: "center", behavior: "smooth" });
                    });
                }
            };

            currentDrawContainer.addEventListener("click", (event) => {
                const ballElement = event.target.closest(".explanation-selectable-ball");
                if (!ballElement) return;

                const urnKey = ballElement.dataset.urnKey;
                if (!urnKey) return;

                if (selectedUrns.has(urnKey)) {
                    selectedUrns.delete(urnKey);
                } else {
                    selectedUrns.add(urnKey);
                }

                currentDrawContainer.innerHTML = `
                    ${trial.current_title ? `<div class="draw-panel-title">${trial.current_title}</div>` : ""}
                    ${renderCurrentSampleRow(currentDraw, urnKeys, selectedUrns, currentResult, showResult)}
                `;

                updateSelectionSentence();
            });

            currentDrawContainer.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    const ballElement = event.target.closest(".explanation-selectable-ball");
                    if (ballElement) {
                        event.preventDefault();
                        ballElement.click();
                    }
                }
            });

            if (!autoDraw && drawBtn) {
                drawBtn.addEventListener("click", loadSample);
            }

            submitExplanationBtn.addEventListener("click", () => {
                if (selectedUrns.size === 0) return;

                const drawTime = performance.now();
                const rt = Math.round(drawTime - sampleStartTime);
                const selectedKeys = urnKeys.filter((k) => selectedUrns.has(k));
                const selectedDescriptions = selectedKeys.map((k) => describeBall(currentDraw[k], k));

                this.jsPsych.data.write({
                    questionID: questionId,
                    sample_index: sampleIndex + 1,
                    draw: currentDraw,
                    result: showResult ? (currentResult ? "win" : "lose") : undefined,
                    selected_urns: selectedKeys,
                    selected_explanation: renderSentence(currentResult, selectedDescriptions, trial.selection_prompt, showResult),
                    rt: rt
                });

                historyEntries.unshift({
                    draw: currentDraw,
                    result: currentResult,
                    selected_urns: selectedKeys
                });

                historyContainer.innerHTML = renderHistoryList(
                    historyEntries, 
                    urnKeys, 
                    trial.history_title, 
                    showResult, 
                    trial.history_empty_message
                );

                sampleIndex += 1;

                if (sampleIndex >= totalSamples) {
                    currentDrawContainer.innerHTML = "";
                    feedbackBox.innerHTML = "<p>All samples completed.</p>";
                    sentenceBox.innerHTML = "";
                    submitExplanationBtn.style.display = "none";
                    if (drawBtnContainer) drawBtnContainer.style.display = "none";
                    continueBtn.style.display = "inline-block";
                } else {
                    if (autoDraw) {
                        loadSample();
                    } else {
                        currentDrawContainer.innerHTML = "";
                        feedbackBox.innerHTML = "";
                        sentenceBox.innerHTML = "";
                        submitExplanationBtn.disabled = true;
                        if (drawBtnContainer) drawBtnContainer.style.display = "block";
                        if (remainingSamples) {
                            remainingSamples.textContent = `${trial.remaining_label || "Remaining samples:"} ${totalSamples - sampleIndex}`;
                        }
                    }
                }
            });

            const finishTrial = () => {
                display_element.innerHTML = "";
                this.jsPsych.finishTrial({
                    questionID: questionId,
                    completed_samples: sampleIndex,
                    total_samples: totalSamples,
                    history: historyEntries
                });
            };

            continueBtn.addEventListener("click", finishTrial);

            if (autoDraw) {
                loadSample();
            }
        }
    }

    ExplanationSelectionPlugin.info = info;
    return ExplanationSelectionPlugin;
})(jsPsychModule);