/**
 * jsPsych plugin for the main inference task's feedback interludes: a
 * read-only, single-column reveal of exactly one batch (4 scenarios),
 * shown right after a prediction round for the 4 scenarios the participant
 * just predicted. Same layout convention as prediction-columns-plugin.js
 * (one scrollable column, index badge embedded in the card, and — when
 * shared_urns_display is true, the default — one full urn display shown
 * once above the column with each card showing just a compact row of
 * drawn balls in their slots) but for a different comparison: each card
 * combines what actually happened (the real outcome, styled like a
 * "given" observation — ball ring + explanation sentence if applicable)
 * with the participant's own prediction sentence and a correct/incorrect
 * line beneath it, all in the same card, rather than splitting the two
 * across separate left/right columns.
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
      /** Default true: one full urn display is shown once, above the
       * column, as a size/probability reference; each card then shows
       * only a compact single row of drawn balls in their slots instead
       * of repeating the full urn stack. Set false to revert to the old
       * per-card full urn display. */
      shared_urns_display: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      /** How far into the full main-task scenario order this batch's
       * first scenario sits — e.g. round 1's feedback batch is
       * scenarios[4..8), so start_index:4 labels its cards #5-8, matching
       * the numbers those same scenarios were shown under (as
       * still-to-predict) in the prediction round just completed, rather
       * than restarting at #1 for every batch. */
      start_index: {
        type: jspsych.ParameterType.INT,
        default: 0
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
      const sharedUrnsDisplay = trial.shared_urns_display !== false;

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

      // The actual outcome is always known here (this is feedback, shown
      // after the round is over) — factored out so both the WIN/LOSE
      // badge (rendered up front, in renderFeedbackCard) and the
      // populate loop below can resolve it the same way, matching
      // prediction-columns-plugin.js's given-card badge.
      const actualWinFor = (sc) => {
        const attempt = attemptsByScenarioId[sc.id];
        return attempt
          ? attempt.actual_outcome === "win"
          : String(sc.outcome !== undefined ? sc.outcome : sc.result).toLowerCase() === "win";
      };

      // Compact per-urn "ball in its slot" row (shared_urns_display:true,
      // the default) — see prediction-columns-plugin.js's identical
      // helper; reuses .urn-slot's id convention (slot-${urnKey}) so
      // populateDraw() below works unchanged either way. badgeHTML: see
      // prediction-columns-plugin.js's renderCompactDraw — rendered as
      // its own flex item in the same row as the slots.
      const renderCompactDraw = (badgeHTML = "") => `
        <div class="pcol-compact-draw">
          ${urnKeys.map((urnKey) => `
            <div class="pcol-compact-slot" data-urn="${urnKey}">
              <div class="pcol-compact-slot-label"${trial.urn_map && trial.urn_map[urnKey] ? ` style="color:${trial.urn_map[urnKey].color};"` : ""}>${urnKey}</div>
              <div class="urn-slot" id="slot-${urnKey}"></div>
            </div>
          `).join("")}
          ${badgeHTML ? `<div class="pcol-outcome-badge-slot">${badgeHTML}</div>` : ""}
        </div>
      `;

      const renderDrawBlock = (draw, sc) => {
        const probText = probTextFor(draw, sc);
        const badgeHTML = utils ? utils.renderOutcomeBadge(actualWinFor(sc)) : "";
        return sharedUrnsDisplay
          ? `
            ${renderCompactDraw(badgeHTML)}
            <div class="pcol-prob-text">${probText ? `Scenario Probability ${probText}` : ""}</div>
          `
          : `
            <div class="pcol-urns-wrapper">
              <div class="urns-display-container">${trial.urn_html}</div>
              ${badgeHTML ? `<div class="pcol-outcome-badge-slot">${badgeHTML}</div>` : ""}
              <div class="pcol-prob-text">${probText ? `Scenario Probability ${probText}` : ""}</div>
            </div>
          `;
      };

      const startIndex = trial.start_index || 0;

      const renderFeedbackCard = (sc, idx) => {
        const draw = sc.urns || sc.draw || sc;
        const actualLabel = showExplanation && sc.selected_urn ? "Explanation:" : "Actual outcome:";
        return `
          <div class="pcol-card" data-idx="${idx}">
            <div class="pcol-card-index">#${idx + startIndex + 1}</div>
            ${renderDrawBlock(draw, sc)}
            <div class="card-prompt-text">Your prediction:</div>
            <div class="card-sentence-text" id="bf-pred-sentence-${idx}"></div>
            <div class="validation-feedback-text" id="bf-correctness-${idx}"></div>
            <div class="card-prompt-text">${actualLabel}</div>
            <div class="pcol-explanation-row card-sentence-text" id="bf-actual-sentence-${idx}"></div>
          </div>
        `;
      };

      const sharedUrnsBlockHTML = sharedUrnsDisplay
        ? `<div class="pcol-shared-urns"><div class="urns-display-container">${trial.urn_html}</div></div>`
        : "";

      const explanationsClause = showExplanation ? " and explanations" : "";

      display_element.innerHTML = `
        <div class="pcol-container${urnKeys.length <= 2 ? " pcol-two-urns" : ""}">
          <div class="pcol-header">
            <p class="pcol-instructions"><strong>Here are your predictions with the correct outcomes${explanationsClause} in highlighted text. These will also be provided in the next round.</strong></p>
          </div>
          ${sharedUrnsBlockHTML}
          <div class="pcol-columns pcol-columns-single">
            <div class="pcol-column">
              <div class="pcol-column-header">Feedback (${scenarios.length} draws)</div>
              <div class="pcol-column-scroll" id="bf-scroll">
                ${scenarios.map((sc, idx) => renderFeedbackCard(sc, idx)).join("")}
              </div>
            </div>
          </div>
          <div class="pcol-footer">
            <button id="bf-continue-btn" class="jspsych-btn grid-submit-btn">${trial.continue_button_label}</button>
          </div>
        </div>
      `;

      const cards = Array.from(display_element.querySelectorAll(".pcol-card"));

      // Places the drawn ball in its slot and (full-urn mode only) hides
      // one matching ball back in the urn — identical mechanism to every
      // other draw-display plugin.
      const populateDraw = (cardEl, draw) => {
        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = cardEl.querySelector(`#slot-${urnKey}`);
          if (slotEl && drawnColor) {
            const displayColor = utils.getDisplayColor(drawnColor);
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
          }

          if (!sharedUrnsDisplay) {
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
          }
        });
      };

      scenarios.forEach((sc, idx) => {
        const draw = sc.urns || sc.draw || sc;
        const attempt = attemptsByScenarioId[sc.id];
        const actualWin = actualWinFor(sc);

        const cardEl = cards[idx];
        populateDraw(cardEl, draw);
        if (showExplanation && sc.selected_urn) {
          const slotEl = cardEl.querySelector(`#slot-${sc.selected_urn}`);
          if (slotEl) utils.markHighlightedBall(slotEl, actualWin);
        }

        const actualSentenceEl = cardEl.querySelector(`#bf-actual-sentence-${idx}`);
        if (actualSentenceEl) {
          actualSentenceEl.innerHTML = (showExplanation && sc.selected_urn)
            ? utils.renderExplanationSentence(actualWin, sc.selected_color, sc.selected_urn, agentName)
            : utils.renderOutcomeOnlySentence(actualWin, agentName);
        }

        const predSentenceEl = cardEl.querySelector(`#bf-pred-sentence-${idx}`);
        const correctnessEl = cardEl.querySelector(`#bf-correctness-${idx}`);
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
