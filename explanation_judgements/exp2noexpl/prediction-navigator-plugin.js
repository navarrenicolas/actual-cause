/**
 * jsPsych plugin for the main inference task's per-round view: all 16 draw
 * combinations, paginated 4-per-page, with Back/Next page navigation.
 * Each scenario carries a `given` flag (set by main.js — the first 4/8/12
 * of the fixed shuffled order, depending on round) marking it as already
 * explained to the agent: its causal ball and explanation sentence get a
 * yellow-highlighter treatment (UrnUtils.markHighlightedBall /
 * renderExplanationSentence) right inside the grid. Given cards are pure
 * display — no buttons, no click, nothing to answer — since the
 * participant isn't being asked anything about them; only the remaining
 * (not-yet-given) scenarios get a genuine "did they win or lose?"
 * prediction.
 * No feedback is shown on predictions — that's the thing being measured —
 * but predicted vs. actual outcome is still written to jsPsych.data for
 * later analysis.
 */
var jsPredictionNavigator = (function (jspsych) {
  "use strict";

  const info = {
    name: "prediction-navigator",
    parameters: {
      /** All scenarios, in one fixed order across all rounds: { id, urns/draw, outcome/result, given?, selected_urn?, selected_color? } */
      scenarios: {
        type: jspsych.ParameterType.ARRAY,
        default: []
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
        default: "prediction_navigator"
      },
      submit_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Submit All"
      },
      /** false for the no-explanation condition: given cards still get the
       * yellow-highlighter sentence, but stating only the outcome, and
       * their ball is never ring-highlighted (there's no causal ball to
       * point to). */
      show_explanation: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      /** For the top-of-page "Round X of Y" header — the given/explained
       * count itself is derived from scenarios' own `given` flags, not a
       * separate param. */
      round_number: {
        type: jspsych.ParameterType.INT,
        default: 1
      },
      total_rounds: {
        type: jspsych.ParameterType.INT,
        default: 1
      }
    }
  };

  class PredictionNavigatorPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const scenarios = trial.scenarios || [];
      const showExplanation = trial.show_explanation !== false;
      const perPage = trial.per_page || 4;
      const questionId = trial.question_id || "prediction_navigator";
      const agentName = trial.agent_name || "John";
      const trialStartTime = performance.now();

      const pageCount = Math.ceil(scenarios.length / perPage);
      // true = win, false = lose, null = unanswered. Given cards have
      // nothing to answer, so they never appear in the "remaining" count
      // (see updateSubmitState) and their entry here is simply unused.
      const answers = scenarios.map(() => null);

      const givenCount = scenarios.filter((sc) => sc.given).length;
      const roundNumber = trial.round_number || 1;
      const totalRounds = trial.total_rounds || 1;

      display_element.innerHTML = `
        <div class="explanation-2x2-container">
          <div id="pn-instruction-hint" class="explanation-instruction-hint">
            <h2 style="margin:0 0 6px;">Round ${roundNumber} of ${totalRounds}</h2>
            <p style="margin:0;">${givenCount} of ${agentName}'s draws have now been ${showExplanation ? "explained" : "shown"}.</p>
            <p style="margin:0;">Select 'Won' or 'Lost' on the remaining draws to make a prediction.</p>
          </div>

          <div id="pn-grid-wrapper" class="explanation-2x2-grid"></div>

          <div class="explanation-action-segment wt-nav">
            <button id="pn-back-btn" class="jspsych-btn is-hidden">&lang; Back</button>
            <span id="pn-page-indicator" class="wt-page-indicator"></span>
            <button id="pn-next-btn" class="jspsych-btn is-hidden">Next &rang;</button>
            <button id="pn-submit-btn" class="jspsych-btn grid-submit-btn" disabled>
              ${trial.submit_button_label} (<span id="pn-remaining-count">${scenarios.length}</span> remaining)
            </button>
          </div>
        </div>
      `;

      const gridWrapper = display_element.querySelector("#pn-grid-wrapper");
      const backBtn = display_element.querySelector("#pn-back-btn");
      const nextBtn = display_element.querySelector("#pn-next-btn");
      const pageIndicator = display_element.querySelector("#pn-page-indicator");
      const submitBtn = display_element.querySelector("#pn-submit-btn");
      const remainingCountEl = display_element.querySelector("#pn-remaining-count");

      const gridBallFit = utils.bindGridBallFit(display_element);

      const updateSubmitState = () => {
        const remaining = scenarios.filter((sc, idx) => !sc.given && answers[idx] === null).length;
        remainingCountEl.textContent = remaining;
        submitBtn.disabled = remaining > 0;
      };

      let pageIndex = 0;
      let lastPressTime = trialStartTime;

      const renderPage = () => {
        const start = pageIndex * perPage;
        const pageScenarios = scenarios.slice(start, start + perPage);

        gridWrapper.innerHTML = pageScenarios.map((sc, i) => {
          const globalIdx = start + i;
          const isGiven = !!sc.given;
          const draw = sc.urns || sc.draw || sc;

          let probText = "";
          if (sc.prob !== undefined) {
            probText = String(sc.prob).includes("%") ? sc.prob : `${sc.prob}%`;
          } else if (utils && trial.urn_map) {
            const calculatedProb = utils.computeDrawProbability(draw, trial.urn_map);
            probText = calculatedProb ? `${calculatedProb}%` : "";
          }

          return `
            <div class="explanation-card-item ${isGiven ? "card-given" : "card-predict"}" data-global-idx="${globalIdx}">
              <div class="grid-card-scaling-wrapper">
                <div class="urns-card-wrapper" id="pn-urns-card-${globalIdx}">
                  <div class="urns-display-container">${trial.urn_html}</div>
                  <div class="urns-card-footer">
                    <span class="card-probability-text">${probText ? `Scenario Probability ${probText}` : ""}</span>
                  </div>
                </div>
                <div class="prediction-feedback-block">
                  <div class="prediction-text-col">
                    ${isGiven ? "" : `<div class="card-prompt-text">Did ${agentName} win or lose this draw?</div>`}
                    <div class="card-sentence-text${isGiven ? "" : " is-hidden"}" id="pn-sentence-${globalIdx}"></div>
                  </div>
                  ${isGiven ? "" : `
                  <div class="predict-btn-group">
                    <button type="button" class="jspsych-btn predict-win-btn" data-action="win">WON</button>
                    <button type="button" class="jspsych-btn predict-lose-btn" data-action="lose">LOST</button>
                  </div>`}
                </div>
              </div>
            </div>
          `;
        }).join("");

        pageScenarios.forEach((sc, i) => {
          const globalIdx = start + i;
          const isGiven = !!sc.given;
          const draw = sc.urns || sc.draw || sc;
          const isWin = String(sc.outcome || sc.result).toLowerCase() === "win";
          const cardEl = gridWrapper.querySelector(`[data-global-idx="${globalIdx}"]`);
          const sentenceEl = cardEl.querySelector(`#pn-sentence-${globalIdx}`);

          urnKeys.forEach((urnKey) => {
            const drawnColor = draw[urnKey];
            const slotEl = cardEl.querySelector(`#slot-${urnKey}`);
            if (slotEl && drawnColor) {
              const cleanColor = utils.normalizeColor(drawnColor);
              const displayColor = utils.getDisplayColor(cleanColor);
              slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;

              if (isGiven && showExplanation && sc.selected_urn === urnKey) {
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

          if (isGiven) {
            if (sentenceEl) {
              sentenceEl.innerHTML = (showExplanation && sc.selected_urn)
                ? utils.renderExplanationSentence(isWin, sc.selected_color, sc.selected_urn, agentName)
                : utils.renderOutcomeOnlySentence(isWin, agentName);
            }
            return; // no interaction on given cards — nothing else to wire up
          }

          const winBtn = cardEl.querySelector('[data-action="win"]');
          const loseBtn = cardEl.querySelector('[data-action="lose"]');

          // Restore any prediction already made on a previous visit to this page.
          if (answers[globalIdx] !== null) {
            winBtn.classList.toggle("is-selected", answers[globalIdx] === true);
            loseBtn.classList.toggle("is-selected", answers[globalIdx] === false);
            if (sentenceEl) {
              sentenceEl.innerHTML = utils.renderPredictionSentence(agentName, answers[globalIdx]);
              sentenceEl.classList.remove("is-hidden");
            }
          }

          const handlePredictClick = (predictedWin) => {
            answers[globalIdx] = predictedWin;

            const now = performance.now();
            const rt = Math.round(now - lastPressTime);
            lastPressTime = now;

            this.jsPsych.data.write({
              event_type: "prediction_navigator_button_press",
              question_id: questionId,
              scenario_id: sc.id || `scenario_${globalIdx + 1}`,
              pressed: predictedWin ? "win" : "lose",
              rt: rt
            });

            winBtn.classList.toggle("is-selected", predictedWin);
            loseBtn.classList.toggle("is-selected", !predictedWin);

            if (sentenceEl) {
              sentenceEl.innerHTML = utils.renderPredictionSentence(agentName, predictedWin);
              sentenceEl.classList.remove("is-hidden");
            }

            updateSubmitState();
          };

          winBtn.onclick = () => handlePredictClick(true);
          loseBtn.onclick = () => handlePredictClick(false);
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

      submitBtn.addEventListener("click", () => {
        if (scenarios.some((sc, idx) => !sc.given && answers[idx] === null)) return;

        scenarios.forEach((sc, idx) => {
          const draw = sc.urns || sc.draw || sc;
          const isGiven = !!sc.given;
          const actualOutcome = String(sc.outcome || sc.result).toLowerCase() === "win";

          if (isGiven) {
            // Purely informational — there was nothing to answer, so no
            // correctness fields here (see prediction-review-plugin.js,
            // which only shows correct/incorrect feedback for the
            // genuinely-predicted scenarios below).
            this.jsPsych.data.write({
              event_type: "observation_shown",
              question_id: questionId,
              scenario_id: sc.id || `scenario_${idx + 1}`,
              draw_A: draw.A,
              draw_B: draw.B,
              draw_C: draw.C,
              draw_D: draw.D,
              result: actualOutcome ? "win" : "lose"
            });
          } else {
            this.jsPsych.data.write({
              event_type: "prediction_navigator_attempt",
              question_id: questionId,
              scenario_id: sc.id || `scenario_${idx + 1}`,
              draw_A: draw.A,
              draw_B: draw.B,
              draw_C: draw.C,
              draw_D: draw.D,
              predicted_outcome: answers[idx] ? "win" : "lose",
              actual_outcome: actualOutcome ? "win" : "lose",
              is_correct: answers[idx] === actualOutcome
            });
          }
        });

        const totalRt = Math.round(performance.now() - trialStartTime);
        const trialData = {
          event_type: "prediction_navigator_complete",
          question_id: questionId,
          given_count: scenarios.filter((sc) => sc.given).length,
          total_trial_rt: totalRt,
          tasks_completed: scenarios.length
        };

        gridBallFit.cleanup();
        display_element.innerHTML = "";
        this.jsPsych.finishTrial(trialData);
      });

      updateSubmitState();
      renderPage();
    }
  }

  PredictionNavigatorPlugin.info = info;
  return PredictionNavigatorPlugin;
})(jsPsychModule);
