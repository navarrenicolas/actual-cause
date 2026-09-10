/**
 * jsPsych plugin for the main inference task's feedback interludes: a
 * read-only, two-column reveal of exactly one batch (4 scenarios), shown
 * right after a prediction round for the 4 scenarios the participant just
 * predicted. Same layout convention as prediction-columns-plugin.js (two
 * independently-scrollable columns, one full urn display per card, index
 * badge embedded in the card) but for a different comparison: the left
 * column shows what actually happened (the real outcome, styled like a
 * "given" observation — ball ring + explanation sentence if applicable),
 * the right column shows the participant's own prediction sentence with
 * a correct/incorrect line beneath it. Both columns show all 4 scenarios,
 * index-matched (card #2 on the left is the same draw as card #2 on the
 * right) — unlike prediction-columns-plugin.js's two columns, which split
 * a single larger set into given/still-to-predict.
 * Reads predicted/actual outcome back out of jsPsych's data table (the
 * `prediction_navigator_attempt` rows prediction-columns-plugin.js wrote
 * at that round's Submit) rather than requiring them as trial params.
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
      /** question_id of the prediction round to pull this batch's predictions from. */
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
      /** false for the no-explanation condition: the left column's
       * observation cards still get the yellow-highlighter sentence, but
       * stating only the outcome, and the ball is never ring-highlighted. */
      show_explanation: {
        type: jspsych.ParameterType.BOOL,
        default: true
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
      const showExplanation = trial.show_explanation !== false;

      const attemptsByScenarioId = {};
      this.jsPsych.data.get()
        .filter({ question_id: trial.review_question_id })
        .values()
        .filter((row) => row.event_type === "prediction_navigator_attempt")
        .forEach((row) => { attemptsByScenarioId[row.scenario_id] = row; });

      const probTextFor = (draw, sc) => {
        if (sc.prob !== undefined) return String(sc.prob).includes("%") ? sc.prob : `${sc.prob}%`;
        if (utils && trial.urn_map) {
          const calculatedProb = utils.computeDrawProbability(draw, trial.urn_map);
          return calculatedProb ? `${calculatedProb}%` : "";
        }
        return "";
      };

      const renderUrnsBlock = (draw, sc) => {
        const probText = probTextFor(draw, sc);
        return `
          <div class="pcol-urns-wrapper">
            <div class="urns-display-container">${trial.urn_html}</div>
            <div class="pcol-prob-text">${probText ? `Scenario Probability ${probText}` : ""}</div>
          </div>
        `;
      };

      const renderObsCard = (sc, idx) => {
        const draw = sc.urns || sc.draw || sc;
        return `
          <div class="pcol-card" data-idx="${idx}" data-side="obs">
            <div class="pcol-card-index">#${idx + 1}</div>
            ${renderUrnsBlock(draw, sc)}
            <div class="pcol-explanation-row card-sentence-text" id="bf-obs-sentence-${idx}"></div>
          </div>
        `;
      };

      const renderPredCard = (sc, idx) => {
        const draw = sc.urns || sc.draw || sc;
        return `
          <div class="pcol-card" data-idx="${idx}" data-side="pred">
            <div class="pcol-card-index">#${idx + 1}</div>
            ${renderUrnsBlock(draw, sc)}
            <div class="pcol-explanation-row card-sentence-text" id="bf-pred-sentence-${idx}"></div>
            <div class="validation-feedback-text" id="bf-pred-correctness-${idx}"></div>
          </div>
        `;
      };

      display_element.innerHTML = `
        <div class="pcol-container${urnKeys.length <= 2 ? " pcol-two-urns" : ""}">
          <div class="pcol-header">
            <p class="pcol-instructions">Here's what actually happened on your last ${scenarios.length} draws, alongside what you predicted.</p>
          </div>
          <div class="pcol-columns">
            <div class="pcol-column">
              <div class="pcol-column-header">What actually happened</div>
              <div class="pcol-column-scroll" id="bf-obs-scroll">
                ${scenarios.map((sc, idx) => renderObsCard(sc, idx)).join("")}
              </div>
            </div>
            <div class="pcol-column">
              <div class="pcol-column-header">Your predictions</div>
              <div class="pcol-column-scroll" id="bf-pred-scroll">
                ${scenarios.map((sc, idx) => renderPredCard(sc, idx)).join("")}
              </div>
            </div>
          </div>
          <div class="pcol-footer">
            <button id="bf-continue-btn" class="jspsych-btn grid-submit-btn">${trial.continue_button_label}</button>
          </div>
        </div>
      `;

      const obsCards = Array.from(display_element.querySelectorAll('.pcol-card[data-side="obs"]'));
      const predCards = Array.from(display_element.querySelectorAll('.pcol-card[data-side="pred"]'));

      // Places the drawn ball in its slot and hides one matching ball back
      // in the urn — identical mechanism to every other draw-display
      // plugin, factored out here since it now runs twice per scenario
      // (once for the observation card, once for the prediction card).
      const populateUrns = (cardEl, draw) => {
        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = cardEl.querySelector(`#slot-${urnKey}`);
          if (slotEl && drawnColor) {
            const displayColor = utils.getDisplayColor(drawnColor);
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
          }

          const urnContainer = cardEl.querySelector(`#urn-container-${urnKey}`) ||
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
      };

      scenarios.forEach((sc, idx) => {
        const draw = sc.urns || sc.draw || sc;
        const attempt = attemptsByScenarioId[sc.id];
        const actualWin = attempt
          ? attempt.actual_outcome === "win"
          : String(sc.outcome !== undefined ? sc.outcome : sc.result).toLowerCase() === "win";

        // ----- Left: what actually happened -----
        const obsCardEl = obsCards[idx];
        populateUrns(obsCardEl, draw);
        if (showExplanation && sc.selected_urn) {
          const slotEl = obsCardEl.querySelector(`#slot-${sc.selected_urn}`);
          if (slotEl) utils.markHighlightedBall(slotEl, actualWin);
        }
        const obsSentenceEl = obsCardEl.querySelector(`#bf-obs-sentence-${idx}`);
        if (obsSentenceEl) {
          obsSentenceEl.innerHTML = (showExplanation && sc.selected_urn)
            ? utils.renderExplanationSentence(actualWin, sc.selected_color, sc.selected_urn, agentName)
            : utils.renderOutcomeOnlySentence(actualWin, agentName);
        }

        // ----- Right: the participant's own prediction -----
        const predCardEl = predCards[idx];
        populateUrns(predCardEl, draw);
        const predSentenceEl = predCardEl.querySelector(`#bf-pred-sentence-${idx}`);
        const correctnessEl = predCardEl.querySelector(`#bf-pred-correctness-${idx}`);
        if (attempt) {
          const predictedWin = attempt.predicted_outcome === "win";
          if (predSentenceEl) predSentenceEl.innerHTML = utils.renderPredictionSentence(agentName, predictedWin);
          if (correctnessEl) {
            correctnessEl.innerHTML = attempt.is_correct
              ? `<span class="win">✓ Correct</span>`
              : `<span class="lose">✗ Incorrect</span>`;
          }
        } else if (predSentenceEl) {
          predSentenceEl.innerHTML = `<span class="lose">No prediction was recorded for this draw.</span>`;
        }

        this.jsPsych.data.write({
          event_type: "batch_feedback_shown",
          question_id: questionId,
          scenario_id: sc.id || `scenario_${idx + 1}`,
          is_correct: attempt ? attempt.is_correct : null
        });
      });

      display_element.querySelector("#bf-continue-btn").addEventListener("click", () => {
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({ event_type: "batch_feedback_complete", question_id: questionId });
      });
    }
  }

  BatchFeedbackPlugin.info = info;
  return BatchFeedbackPlugin;
})(jsPsychModule);
