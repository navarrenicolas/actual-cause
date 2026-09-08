/**
 * jsPsych plugin for the main inference task's feedback interludes: a
 * read-only single-page reveal of exactly one batch (4 scenarios), shown
 * right after a prediction round for the 4 scenarios the participant just
 * predicted. Deliberately lightweight — just a correct/incorrect flag per
 * scenario, comparing the participant's own submitted prediction
 * (read straight out of jsPsych's data table, the `prediction_navigator_attempt`
 * rows prediction-navigator-plugin.js wrote at that round's Submit) against
 * the actual outcome. No ball highlight, no explanation sentence — that
 * full reveal happens naturally next round instead, when these same 4
 * scenarios appear pre-filled as "given" cards in the prediction nav.
 * Pure display — no buttons, no click, single Continue button.
 */
var jsBatchFeedback = (function (jspsych) {
  "use strict";

  const info = {
    name: "batch-feedback",
    parameters: {
      /** Exactly the batch to flag (typically 4): { id, urns/draw, outcome/result } */
      scenarios: {
        type: jspsych.ParameterType.ARRAY,
        default: []
      },
      /** question_id of the prediction-navigator round to pull this batch's predictions from. */
      review_question_id: {
        type: jspsych.ParameterType.STRING,
        default: ""
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
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "batch_feedback"
      },
      continue_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue"
      }
    }
  };

  class BatchFeedbackPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const scenarios = trial.scenarios || [];
      const questionId = trial.question_id || "batch_feedback";
      const agentName = trial.agent_name || "John";

      const attemptsByScenarioId = {};
      this.jsPsych.data.get()
        .filter({ question_id: trial.review_question_id })
        .values()
        .filter((row) => row.event_type === "prediction_navigator_attempt")
        .forEach((row) => { attemptsByScenarioId[row.scenario_id] = row; });

      display_element.innerHTML = `
        <div class="explanation-2x2-container">
          <div id="bf-instruction-hint" class="explanation-instruction-hint">
            Here are 4 of your predictions from the last round.<br>The correct outcome will also be provided to you in the following round.
          </div>

          <div id="bf-grid-wrapper" class="explanation-2x2-grid">
            ${scenarios.map((sc, idx) => {
              const draw = sc.urns || sc.draw || sc;
              let probText = "";
              if (sc.prob !== undefined) {
                probText = String(sc.prob).includes("%") ? sc.prob : `${sc.prob}%`;
              } else if (utils && trial.urn_map) {
                const calculatedProb = utils.computeDrawProbability(draw, trial.urn_map);
                probText = calculatedProb ? `${calculatedProb}%` : "";
              }
              return `
                <div class="explanation-card-item" data-idx="${idx}">
                  <div class="grid-card-scaling-wrapper">
                    <div class="urns-card-wrapper" id="bf-urns-card-${idx}">
                      <div class="urns-display-container">${trial.urn_html}</div>
                      <div class="urns-card-footer">
                        <span class="card-probability-text">${probText ? `Scenario Probability ${probText}` : ""}</span>
                      </div>
                    </div>
                    <div class="prediction-feedback-block">
                      <div class="prediction-text-col">
                        <div class="validation-feedback-text" id="bf-feedback-${idx}"></div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <div class="explanation-action-segment">
            <button id="bf-continue-btn" class="jspsych-btn grid-submit-btn">${trial.continue_button_label}</button>
          </div>
        </div>
      `;

      const gridBallFit = utils.bindGridBallFit(display_element);

      scenarios.forEach((sc, idx) => {
        const draw = sc.urns || sc.draw || sc;
        const cardEl = display_element.querySelector(`[data-idx="${idx}"]`);
        const feedbackEl = cardEl.querySelector(`#bf-feedback-${idx}`);

        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = cardEl.querySelector(`#slot-${urnKey}`);
          if (slotEl && drawnColor) {
            const cleanColor = utils.normalizeColor(drawnColor);
            const displayColor = utils.getDisplayColor(cleanColor);
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
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

        const attempt = attemptsByScenarioId[sc.id];
        if (feedbackEl) {
          if (attempt) {
            const predictedWin = attempt.predicted_outcome === "win";
            const actualWin = attempt.actual_outcome === "win";
            feedbackEl.innerHTML = `
              <div class="card-sentence-text">Your prediction: ${utils.renderPredictionSentence(agentName, predictedWin)}</div>
              <div class="card-sentence-text">Actual: ${utils.renderPredictionSentence(agentName, actualWin)}</div>
              <div>${attempt.is_correct ? `<span class="win">✓ Correct</span>` : `<span class="lose">✗ Incorrect</span>`}</div>
            `;
          } else {
            feedbackEl.innerHTML = `<span class="lose">No prediction was recorded for this draw.</span>`;
          }
        }

        this.jsPsych.data.write({
          event_type: "batch_feedback_shown",
          question_id: questionId,
          scenario_id: sc.id || `scenario_${idx + 1}`,
          is_correct: attempt ? attempt.is_correct : null
        });
      });

      gridBallFit.apply();

      display_element.querySelector("#bf-continue-btn").addEventListener("click", () => {
        gridBallFit.cleanup();
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({ event_type: "batch_feedback_complete", question_id: questionId });
      });
    }
  }

  BatchFeedbackPlugin.info = info;
  return BatchFeedbackPlugin;
})(jsPsychModule);
