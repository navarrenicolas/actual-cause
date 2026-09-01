/**
 * jsPsych plugin for a single-page grid prediction task (used in the 2-urn
 * training rounds, steps 3 and 4 of the inference task). Generalized from
 * nic_experiment1's comprehension-prediction-grid.js.
 *
 * Each scenario can be flagged `given: true` (set by the caller — main.js
 * marks whichever of the grid's scenarios match the examples just shown)
 * to render it as an already-explained observation right inside the same
 * grid instead of a separate history view: its causal ball and explanation
 * sentence get a yellow-highlighter treatment (UrnUtils.markHighlightedBall
 * / renderExplanationSentence), and instead of a free prediction it's an
 * attention check — only the objectively-correct WON/LOST click counts as
 * answered. The remaining (non-given) cards keep the original
 * submit-then-feedback, retry-until-all-correct flow.
 */
var jsPredictionGrid = (function (jspsych) {
  "use strict";

  const info = {
    name: "prediction-grid",
    parameters: {
      /** Each entry may carry `given`, and when given: `selected_urn`/`selected_color`. */
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
        default: ["A", "B"]
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
        default: "prediction_grid"
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
      },
      set_number: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      set_total: {
        type: jspsych.ParameterType.INT,
        default: null
      }
    }
  };

  class PredictionGridPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B"];
      const scenarios = trial.scenarios || trial.draws || [];
      const questionId = trial.question_id || "prediction_grid";
      const showRule = trial.show_rule !== false;
      const agentName = trial.agent_name || "John";
      const ruleFn = trial.rule_fn || (() => false);
      const trialStartTime = performance.now();

      const cardStates = scenarios.map((sc) => {
        const drawData = sc.draw || sc;
        const actualOutcome = typeof sc.correct_outcome === "boolean"
          ? sc.correct_outcome
          : !!ruleFn(drawData);

        return {
          draw: drawData,
          given: !!sc.given,
          userPrediction: null,
          actualOutcome: actualOutcome,
          attempts: 0,
          isPassed: false,
          lastAttemptTime: trialStartTime,
          lastPressTime: trialStartTime
        };
      });

      let html = `
        <div class="explanation-2x2-container">
          <div class="grid-top-panel">
            ${showRule && trial.rule_text ? `<div id="rule-text" class="grid-rule-text">${trial.rule_text}</div>` : ""}
          </div>

          <div id="instruction-hint" class="explanation-instruction-hint">
            The highlighted draws have been explained. You must predict the remaining draws. Click the outcome according to the explanation.
          </div>

          <div id="pg-grid-wrapper" class="explanation-2x2-grid">
      `;

      scenarios.forEach((sc, idx) => {
        const draw = sc.draw || sc;
        const isGiven = !!sc.given;

        let probText = "";
        if (sc.prob !== undefined) {
          probText = String(sc.prob).includes("%") ? sc.prob : `${sc.prob}%`;
        } else if (utils && trial.urn_map) {
          const calculatedProb = utils.computeDrawProbability(draw, trial.urn_map);
          probText = calculatedProb ? `${calculatedProb}%` : "";
        }

        html += `
          <div class="explanation-card-item" data-sample-idx="${idx}">
            <div class="grid-card-scaling-wrapper">
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

              <div class="prediction-feedback-block">
                <div class="prediction-text-col">
                  <div class="card-prompt-text">Did ${agentName} win or lose this draw?</div>
                  ${isGiven ? `<div class="card-sentence-text" id="card-outcome-sentence-${idx}"></div>` : `<div class="card-sentence-text is-hidden" id="card-outcome-sentence-${idx}"></div>`}
                  <div class="validation-feedback-text" id="card-feedback-${idx}"></div>
                </div>

                <div class="predict-btn-group">
                  <button type="button" class="jspsych-btn predict-win-btn" data-action="win">WON</button>
                  <button type="button" class="jspsych-btn predict-lose-btn" data-action="lose">LOST</button>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>

          <div class="explanation-action-segment">
            ${trial.set_number && trial.set_total ? `<div class="explanation-set-label">Set ${trial.set_number}/${trial.set_total}</div>` : ""}
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

      const gridBallFit = utils.bindGridBallFit(display_element);

      scenarios.forEach((sc, idx) => {
        const draw = sc.draw || sc;
        const isGiven = !!sc.given;
        const isWin = cardStates[idx].actualOutcome;
        const cardEl = display_element.querySelector(`[data-sample-idx="${idx}"]`);
        const winBtn = cardEl.querySelector('[data-action="win"]');
        const loseBtn = cardEl.querySelector('[data-action="lose"]');
        const sentenceEl = cardEl.querySelector(`#card-outcome-sentence-${idx}`);
        const feedbackEl = cardEl.querySelector(`#card-feedback-${idx}`);

        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = cardEl.querySelector(`#slot-${urnKey}`);

          if (slotEl && drawnColor) {
            const cleanColor = utils.normalizeColor(drawnColor);
            const displayColor = utils.getDisplayColor(cleanColor);
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;

            if (isGiven && sc.selected_urn === urnKey) {
              utils.markHighlightedBall(slotEl, isWin);
            }
          }

          const urnContainer = cardEl.querySelector(`#urn-${urnKey}`) ||
                             cardEl.querySelector(`[data-urn="${urnKey}"]`) ||
                             cardEl.querySelectorAll(".urn")[urnKeys.indexOf(urnKey)];

          if (urnContainer && drawnColor) {
            const candidateBalls = Array.from(urnContainer.querySelectorAll(".ball")).filter((b) => {
              if (b.closest(".urn-slot") || b.classList.contains("drawn-hidden")) return false;
              return utils.matchesColor(b, drawnColor);
            });
            if (candidateBalls.length > 0) {
              candidateBalls[Math.floor(Math.random() * candidateBalls.length)].classList.add("drawn-hidden");
            }
          }
        });

        if (isGiven && sc.selected_urn && sentenceEl) {
          sentenceEl.innerHTML = utils.renderExplanationSentence(isWin, sc.selected_color, sc.selected_urn, agentName);
        }

        const handleGivenClick = (clickedWin) => {
          const state = cardStates[idx];
          const isCorrect = clickedWin === state.actualOutcome;

          winBtn.classList.toggle("is-selected", clickedWin);
          loseBtn.classList.toggle("is-selected", !clickedWin);

          this.jsPsych.data.write({
            event_type: "attention_check_response",
            question_id: questionId,
            scenario_id: sc.id || `task_${idx + 1}`,
            stated_outcome: state.actualOutcome ? "win" : "lose",
            clicked_outcome: clickedWin ? "win" : "lose",
            is_correct: isCorrect
          });

          if (isCorrect) {
            state.isPassed = true;
            state.userPrediction = clickedWin;
            if (feedbackEl) feedbackEl.innerHTML = `<span class="win">✓</span>`;
            cardEl.classList.add("card-passed");
            winBtn.disabled = true;
            loseBtn.disabled = true;
          } else {
            state.isPassed = false;
            state.userPrediction = null;
            if (feedbackEl) feedbackEl.innerHTML = `<span class="lose">That's not what the explanation says — check again.</span>`;
          }

          gridBallFit.apply();
        };

        const handlePredictClick = (predictedWin) => {
          const state = cardStates[idx];
          if (state.isPassed) return;
          state.userPrediction = predictedWin;

          const now = performance.now();
          const rt = Math.round(now - state.lastPressTime);
          state.lastPressTime = now;

          this.jsPsych.data.write({
            event_type: "prediction_button_press",
            question_id: questionId,
            scenario_id: sc.id || `task_${idx + 1}`,
            pressed: predictedWin ? "win" : "lose",
            rt: rt
          });

          if (feedbackEl) feedbackEl.innerHTML = "";

          if (predictedWin) {
            winBtn.classList.add("is-selected");
            loseBtn.classList.remove("is-selected");
          } else {
            loseBtn.classList.add("is-selected");
            winBtn.classList.remove("is-selected");
          }

          if (sentenceEl) {
            sentenceEl.innerHTML = utils.renderPredictionSentence(agentName, predictedWin);
            sentenceEl.classList.remove("is-hidden");
          }

          gridBallFit.apply();
        };

        const handleClick = isGiven ? handleGivenClick : handlePredictClick;
        winBtn.onclick = () => handleClick(true);
        loseBtn.onclick = () => handleClick(false);
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

          if (state.isPassed) return; // already correct (given cards lock in immediately on click, same as passed predict cards)

          if (state.given) {
            // Given cards gate on their own click, not on Submit — being
            // here with isPassed still false just means it hasn't been
            // correctly clicked yet.
            allCorrect = false;
            if (feedbackEl) feedbackEl.innerHTML = `<span class="lose">Click the outcome the explanation states.</span>`;
            return;
          }

          if (state.userPrediction === null) {
            allCorrect = false;
            if (feedbackEl) feedbackEl.innerHTML = `<span class="lose">Please make a prediction.</span>`;
            return;
          }

          state.attempts += 1;
          const rt = Math.round(now - state.lastAttemptTime);
          state.lastAttemptTime = now;

          const isCorrect = state.userPrediction === state.actualOutcome;
          state.isPassed = isCorrect;

          this.jsPsych.data.write({
            event_type: "prediction_grid_attempt",
            question_id: questionId,
            scenario_id: sc.id || `task_${idx + 1}`,
            attempt_number: state.attempts,
            predicted_outcome: state.userPrediction ? "win" : "lose",
            actual_outcome: state.actualOutcome ? "win" : "lose",
            is_correct: isCorrect,
            rt: rt
          });

          if (isCorrect) {
            if (feedbackEl) feedbackEl.innerHTML = `<span class="win">✓ Correct</span>`;
            cardEl.classList.add("card-passed");
            cardEl.querySelectorAll(".predict-win-btn, .predict-lose-btn").forEach((btn) => { btn.disabled = true; });
          } else {
            allCorrect = false;
            if (feedbackEl) {
              feedbackEl.innerHTML = `<span class="lose">${sc.incorrect_feedback_text || trial.incorrect_feedback_text}</span>`;
            }
            cardEl.classList.remove("card-passed");
          }
        });

        gridBallFit.apply();

        if (allCorrect) {
          submitBtn.style.display = "none";
          continueBtn.style.display = "inline-block";
          if (hintEl) hintEl.textContent = "All correct! Click Continue to proceed.";
          display_element.querySelectorAll(".predict-win-btn, .predict-lose-btn").forEach((btn) => { btn.disabled = true; });
        }
      });

      continueBtn.addEventListener("click", () => {
        const totalRt = Math.round(performance.now() - trialStartTime);
        const trialData = {
          event_type: "prediction_grid_complete",
          question_id: questionId,
          total_trial_rt: totalRt,
          tasks_completed: scenarios.length
        };

        gridBallFit.cleanup();
        display_element.innerHTML = "";
        this.jsPsych.finishTrial(trialData);
      });
    }
  }

  PredictionGridPlugin.info = info;
  return PredictionGridPlugin;
})(jsPsychModule);
