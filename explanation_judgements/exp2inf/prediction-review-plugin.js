/**
 * jsPsych plugin for the post-task debrief: a read-only paginated review of
 * all 16 scenarios, showing what the participant actually answered in the
 * final prediction round (`review_question_id`, e.g. "prediction_round_3")
 * against the true outcome. Nothing is looked up from trial parameters —
 * it reads its own answers straight out of jsPsych's data table (the rows
 * prediction-navigator-plugin.js already wrote at that round's Submit:
 * `observation_shown` for cards that were given/explained by then (purely
 * informational — nothing was answered, so no correctness to report),
 * `prediction_navigator_attempt` for cards the participant actually
 * predicted (these get real correct/incorrect feedback — by round 3
 * that's only the last 4, since the other 12 were already given), joined
 * back to `scenarios` by scenario_id.
 */
var jsPredictionReview = (function (jspsych) {
  "use strict";

  const info = {
    name: "prediction-review",
    parameters: {
      /** The same 16 scenarios used throughout the main task (order-independent — joined by id). */
      scenarios: {
        type: jspsych.ParameterType.ARRAY,
        default: []
      },
      /** question_id of the prediction-navigator round to pull answers from. */
      review_question_id: {
        type: jspsych.ParameterType.STRING,
        default: "prediction_round_3"
      },
      per_page: {
        type: jspsych.ParameterType.INT,
        default: 4
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
        default: "prediction_review"
      },
      continue_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue"
      },
      /** false for the no-explanation condition: given cards' review text
       * states only the outcome, and their ball is never ring-highlighted. */
      show_explanation: {
        type: jspsych.ParameterType.BOOL,
        default: true
      }
    }
  };

  class PredictionReviewPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const scenarios = trial.scenarios || [];
      const perPage = trial.per_page || 4;
      const agentName = trial.agent_name || "John";
      const showExplanation = trial.show_explanation !== false;
      const pageCount = Math.ceil(scenarios.length / perPage);

      const answerRows = this.jsPsych.data.get()
        .filter({ question_id: trial.review_question_id })
        .values()
        .filter((row) => row.event_type === "observation_shown" || row.event_type === "prediction_navigator_attempt");

      const answersByScenarioId = {};
      answerRows.forEach((row) => { answersByScenarioId[row.scenario_id] = row; });

      display_element.innerHTML = `
        <div class="explanation-2x2-container">
          <div id="pr-instruction-hint" class="explanation-instruction-hint">
            Here's how your predictions compared to what actually happened, for all 16 draws.
          </div>

          <div id="pr-grid-wrapper" class="explanation-2x2-grid"></div>

          <div class="explanation-action-segment wt-nav">
            <button id="pr-back-btn" class="jspsych-btn is-hidden">&lang; Back</button>
            <span id="pr-page-indicator" class="wt-page-indicator"></span>
            <button id="pr-next-btn" class="jspsych-btn is-hidden">Next &rang;</button>
            <button id="pr-continue-btn" class="jspsych-btn grid-submit-btn">${trial.continue_button_label}</button>
          </div>
        </div>
      `;

      const gridWrapper = display_element.querySelector("#pr-grid-wrapper");
      const backBtn = display_element.querySelector("#pr-back-btn");
      const nextBtn = display_element.querySelector("#pr-next-btn");
      const pageIndicator = display_element.querySelector("#pr-page-indicator");
      const continueBtn = display_element.querySelector("#pr-continue-btn");

      const gridBallFit = utils.bindGridBallFit(display_element);

      let pageIndex = 0;

      const renderPage = () => {
        const start = pageIndex * perPage;
        const pageScenarios = scenarios.slice(start, start + perPage);

        gridWrapper.innerHTML = pageScenarios.map((sc, i) => {
          const globalIdx = start + i;
          const draw = sc.urns || sc.draw || sc;

          let probText = "";
          if (sc.prob !== undefined) {
            probText = String(sc.prob).includes("%") ? sc.prob : `${sc.prob}%`;
          } else if (utils && trial.urn_map) {
            const calculatedProb = utils.computeDrawProbability(draw, trial.urn_map);
            probText = calculatedProb ? `${calculatedProb}%` : "";
          }

          return `
            <div class="explanation-card-item" data-global-idx="${globalIdx}">
              <div class="grid-card-scaling-wrapper">
                <div class="urns-card-wrapper" id="pr-urns-card-${globalIdx}">
                  <div class="urns-display-container">${trial.urn_html}</div>
                  <div class="urns-card-footer">
                    <span class="card-probability-text">${probText ? `Scenario Probability ${probText}` : ""}</span>
                  </div>
                </div>
                <div class="prediction-feedback-block">
                  <div class="prediction-text-col" id="pr-text-${globalIdx}"></div>
                </div>
              </div>
            </div>
          `;
        }).join("");

        pageScenarios.forEach((sc, i) => {
          const globalIdx = start + i;
          const draw = sc.urns || sc.draw || sc;
          const isWin = String(sc.outcome || sc.result).toLowerCase() === "win";
          const cardEl = gridWrapper.querySelector(`[data-global-idx="${globalIdx}"]`);
          const answer = answersByScenarioId[sc.id];

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

          const textEl = cardEl.querySelector(`#pr-text-${globalIdx}`);
          if (!textEl) return;

          if (!answer) {
            textEl.innerHTML = `<div class="card-sentence-text">No answer was recorded for this draw.</div>`;
            return;
          }

          if (answer.event_type === "observation_shown") {
            // The recorded answer type already tells us this scenario was
            // given/explained by round 3 — selected_urn is always present
            // on the underlying ledger record regardless, so it's the
            // right (and only) thing to gate the re-highlight on here.
            if (showExplanation && sc.selected_urn) {
              const slotEl = cardEl.querySelector(`#slot-${sc.selected_urn}`);
              utils.markHighlightedBall(slotEl, isWin);
              textEl.innerHTML = `<div class="card-sentence-text">${utils.renderExplanationSentence(isWin, sc.selected_color, sc.selected_urn, agentName)}</div>`;
            } else if (!showExplanation) {
              textEl.innerHTML = `<div class="card-sentence-text">${utils.renderOutcomeOnlySentence(isWin, agentName)}</div>`;
            } else {
              textEl.innerHTML = `<div class="card-sentence-text">This draw had already been explained to you.</div>`;
            }
            return;
          }

          const predictedWin = answer.predicted_outcome === "win";
          const isCorrect = answer.is_correct;
          textEl.innerHTML = `
            <div class="card-sentence-text">Your prediction: ${utils.renderPredictionSentence(agentName, predictedWin)}</div>
            <div class="card-sentence-text">Actual: ${utils.renderPredictionSentence(agentName, isWin)}</div>
            <div class="validation-feedback-text">${isCorrect ? `<span class="win">✓ Correct</span>` : `<span class="lose">✗ Incorrect</span>`}</div>
          `;
        });

        gridBallFit.apply();

        pageIndicator.textContent = `Page ${pageIndex + 1} of ${pageCount}`;
        backBtn.classList.toggle("is-hidden", pageIndex === 0);
        nextBtn.classList.toggle("is-hidden", pageIndex === pageCount - 1);
      };

      const goTo = (newIndex) => {
        pageIndex = Math.max(0, Math.min(pageCount - 1, newIndex));
        renderPage();
      };

      backBtn.addEventListener("click", () => goTo(pageIndex - 1));
      nextBtn.addEventListener("click", () => goTo(pageIndex + 1));

      continueBtn.addEventListener("click", () => {
        gridBallFit.cleanup();
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({ event_type: "prediction_review_complete", question_id: trial.question_id });
      });

      renderPage();
    }
  }

  PredictionReviewPlugin.info = info;
  return PredictionReviewPlugin;
})(jsPsychModule);
