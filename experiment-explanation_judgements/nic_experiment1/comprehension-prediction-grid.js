/**
 * jsPsych plugin for Comprehension Grid Prediction Task
 * Displays a batch array of prediction scenarios in a grid layout.
 * - Center-aligned card footer with vertically stacked WON/LOST buttons on the right.
 * - Compact height footprint to prevent urn-display vertical clipping.
 * - Dynamic sentence updates matching standard plugin text styling.
 */
var jsComprehensionGridPrediction = (function (jspsych) {
  "use strict";

  const info = {
    name: "comprehension-grid-prediction",
    parameters: {
      scenarios: {
        type: jspsych.ParameterType.ARRAY,
        default: []
      },
      rule_text: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      show_rule: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      urn_html: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      urn_map: {
        type: jspsych.ParameterType.OBJECT,
        default: null
      },
      urn_keys: {
        type: jspsych.ParameterType.ARRAY,
        default: ["A", "B", "C", "D"]
      },
      agent_name: {
        type: jspsych.ParameterType.STRING,
        default: "John"
      },
      rule_fn: {
        type: jspsych.ParameterType.FUNCTION,
        default: null
      },
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "comprehension_grid_prediction"
      },
      submit_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Submit All"
      },
      continue_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue"
      },
      incorrect_feedback_text: {
        type: jspsych.ParameterType.STRING,
        default: "Incorrect prediction. Please try again."
      }
    }
  };

  class ComprehensionGridPredictionPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    /** Helper to render outcome sentence using core CSS styling */
    renderOutcomeSentence(userPrediction, agentName) {
      if (userPrediction === null || userPrediction === undefined) return "";

      const statusTag = userPrediction
        ? `<span class="win">WON</span>`
        : `<span class="lose">LOST</span>`;

      return `With this draw ${agentName} ${statusTag}.`;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const scenarios = trial.scenarios || trial.draws || [];
      const questionId = trial.question_id || "comprehension_grid_prediction";
      const showRule = trial.show_rule !== false;
      const agentName = trial.agent_name || "John";
      const ruleFn = trial.rule_fn || (() => false);
      const trialStartTime = performance.now();

      // State tracking per scenario card index
      const cardStates = scenarios.map((sc) => {
        const drawData = sc.draw || sc;
        const actualOutcome = typeof sc.correct_outcome === "boolean" 
          ? sc.correct_outcome 
          : !!ruleFn(drawData);

        return {
          draw: drawData,
          userPrediction: null, // true = WON, false = LOST
          actualOutcome: actualOutcome,
          attempts: 0,
          isPassed: false,
          lastAttemptTime: trialStartTime
        };
      });

      let html = `
        <div class="draw-plugin-container explanation-2x2-container comprehension-grid-container">
          <!-- TOP PANEL: RULE HEADER -->
          <div class="grid-top-panel">
            ${showRule && trial.rule_text ? `<div id="rule-text" class="grid-rule-text">${trial.rule_text}</div>` : ""}
          </div>

          <!-- MIDDLE PANEL: GRID -->
          <div class="explanation-2x2-grid">
      `;

      scenarios.forEach((sc, idx) => {
        const draw = sc.draw || sc;

        let probText = "";
        if (sc.prob !== undefined) {
          probText = String(sc.prob).includes("%") ? sc.prob : `${sc.prob}%`;
        } else if (utils && trial.urn_map) {
          const calculatedProb = utils.computeDrawProbability(draw, trial.urn_map);
          probText = calculatedProb ? `${calculatedProb}%` : "";
        }

        const promptText = sc.prompt || `Predict outcome:`;

        html += `
          <div class="explanation-card-item comp-card-item" data-sample-idx="${idx}">
            <div class="grid-card-scaling-wrapper">
              
              <!-- Urns Container -->
              <div class="urns-card-wrapper" id="urns-card-${idx}">
                <div class="urns-display-container">
                  ${trial.urn_html}
                </div>
                <div class="urns-card-footer">
                  <span class="card-probability-text">
                    ${probText ? `Scenario Probability ${probText}` : ""}
                  </span>
                </div>
              </div>

              <!-- Side-by-Side Feedback Block -->
              <div class="card-feedback-block comp-prediction-feedback-block">
                <!-- Left/Center Column: Prompt, Dynamic Sentence & Validation -->
                <div class="comp-prediction-text-col">
                  <div class="card-question-text comp-card-prompt">${promptText}</div>
                  <div class="comp-selection-sentence is-hidden" id="card-outcome-sentence-${idx}"></div>
                  <div class="validation-feedback-text" id="card-feedback-${idx}"></div>
                </div>

                <!-- Right Column: Stacked WON / LOST Buttons -->
                <div class="comp-stacked-btn-group">
                  <button type="button" class="jspsych-btn predict-btn predict-win-btn comp-stacked-btn" data-action="win">WON</button>
                  <button type="button" class="jspsych-btn predict-btn predict-lose-btn comp-stacked-btn" data-action="lose">LOST</button>
                </div>
              </div>

            </div>
          </div>
        `;
      });

      html += `
          </div>

          <!-- BOTTOM PANEL: ACTION CONTROL -->
          <div class="draw-action-segment explanation-action-segment">
            <div id="instruction-hint" class="explanation-instruction-hint">
              Select WON or LOST for each task in the grid, then submit your answers.
            </div>
            
            <button id="grid-submit-btn" class="jspsych-btn grid-submit-btn">
              ${trial.submit_button_label}
            </button>

            <button id="grid-continue-btn" class="jspsych-btn grid-submit-btn" style="display: none;">
              ${trial.continue_button_label}
            </button>
          </div>
        </div>
      `;

      display_element.innerHTML = html;

      // Populate slots & setup listeners
      scenarios.forEach((sc, idx) => {
        const draw = sc.draw || sc;
        const cardEl = display_element.querySelector(`[data-sample-idx="${idx}"]`);
        const winBtn = cardEl.querySelector('[data-action="win"]');
        const loseBtn = cardEl.querySelector('[data-action="lose"]');
        const sentenceEl = cardEl.querySelector(`#card-outcome-sentence-${idx}`);
        const feedbackEl = cardEl.querySelector(`#card-feedback-${idx}`);

        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = cardEl.querySelector(`#slot-${urnKey}`);

          if (slotEl && drawnColor) {
            const cleanColor = utils ? utils.normalizeColor(drawnColor) : drawnColor;
            const displayColor = utils ? utils.getDisplayColor(cleanColor) : cleanColor;

            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
          }

          let urnContainer = cardEl.querySelector(`#urn-${urnKey}`) ||
                             cardEl.querySelector(`[data-urn="${urnKey}"]`) ||
                             cardEl.querySelectorAll(".urn")[urnKeys.indexOf(urnKey)];

          if (urnContainer && drawnColor) {
            const candidateBalls = Array.from(urnContainer.querySelectorAll(".ball")).filter((b) => {
              if (b.closest(".urn-slot") || b.classList.contains("drawn-hidden")) return false;
              return utils ? utils.matchesColor(b, drawnColor) : b.style.backgroundColor === drawnColor;
            });

            if (candidateBalls.length > 0) {
              const randomIndex = Math.floor(Math.random() * candidateBalls.length);
              candidateBalls[randomIndex].classList.add("drawn-hidden");
            }
          }
        });

        const handleCardPrediction = (predictedWin) => {
          const state = cardStates[idx];
          state.userPrediction = predictedWin;

          if (feedbackEl) feedbackEl.innerHTML = "";

          if (predictedWin) {
            winBtn.classList.add("is-selected");
            loseBtn.classList.remove("is-selected");
          } else {
            loseBtn.classList.add("is-selected");
            winBtn.classList.remove("is-selected");
          }

          if (sentenceEl) {
            sentenceEl.innerHTML = this.renderOutcomeSentence(predictedWin, agentName);
            sentenceEl.classList.remove("is-hidden");
          }
        };

        winBtn.onclick = () => handleCardPrediction(true);
        loseBtn.onclick = () => handleCardPrediction(false);
      });

      const submitBtn = display_element.querySelector("#grid-submit-btn");
      const continueBtn = display_element.querySelector("#grid-continue-btn");
      const hintEl = display_element.querySelector("#instruction-hint");

      submitBtn.addEventListener("click", () => {
        const now = performance.now();
        let allCorrect = true;

        scenarios.forEach((sc, idx) => {
          const state = cardStates[idx];
          const cardEl = display_element.querySelector(`[data-sample-idx="${idx}"]`);
          const feedbackEl = cardEl.querySelector(`#card-feedback-${idx}`);

          if (state.userPrediction === null) {
            allCorrect = false;
            if (feedbackEl) {
              feedbackEl.innerHTML = `<span class="lose">Please make a prediction.</span>`;
            }
            return;
          }

          state.attempts += 1;
          const rt = Math.round(now - state.lastAttemptTime);
          state.lastAttemptTime = now;

          const isCorrect = state.userPrediction === state.actualOutcome;
          state.isPassed = isCorrect;

          this.jsPsych.data.write({
            event_type: "comprehension_prediction_attempt",
            question_id: questionId,
            scenario_id: sc.id || `task_${idx + 1}`,
            attempt_number: state.attempts,
            predicted_outcome: state.userPrediction ? "win" : "lose",
            actual_outcome: state.actualOutcome ? "win" : "lose",
            is_correct: isCorrect,
            rt: rt
          });

          if (isCorrect) {
            if (feedbackEl) {
              feedbackEl.innerHTML = `<span class="win">✓ Correct</span>`;
            }
            cardEl.classList.add("card-passed");
          } else {
            allCorrect = false;
            if (feedbackEl) {
              feedbackEl.innerHTML = `<span class="lose">${
                sc.incorrect_feedback_text || trial.incorrect_feedback_text
              }</span>`;
            }
            cardEl.classList.remove("card-passed");
          }
        });

        if (allCorrect) {
          submitBtn.style.display = "none";
          continueBtn.style.display = "inline-block";
          if (hintEl) hintEl.textContent = "All predictions correct! Click Continue to proceed.";
        }
      });

      continueBtn.addEventListener("click", () => {
        const totalRt = Math.round(performance.now() - trialStartTime);
        const trialData = {
          event_type: "comprehension_prediction_complete",
          question_id: questionId,
          total_trial_rt: totalRt,
          tasks_completed: scenarios.length
        };

        display_element.innerHTML = "";
        this.jsPsych.finishTrial(trialData);
      });
    }
  }

  ComprehensionGridPredictionPlugin.info = info;
  return ComprehensionGridPredictionPlugin;
})(jsPsychModule);