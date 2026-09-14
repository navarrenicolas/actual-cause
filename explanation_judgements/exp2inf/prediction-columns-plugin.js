/**
 * jsPsych plugin for the two-column prediction layout: already-given
 * (explained/shown) scenarios stacked in a left column, remaining-to-
 * predict scenarios stacked in a right column, each scenario shown as its
 * own full urn display (all boxes, sampled ball in each slot) rather than
 * a cropped grid cell — so the "each draw is independent, drawn from the
 * boxes" intuition a dense grid loses is kept, at the cost of needing to
 * scroll to see everything. The two columns scroll independently; the
 * header and the submit footer never scroll, so the submit button (and
 * the live remaining-count next to it) is always on screen without being
 * a floating/sticky overlay.
 *
 * Replaces prediction-grid-plugin.js (practice, 2-urn) and
 * prediction-navigator-plugin.js (main task, 4-urn) — one plugin, mode
 * selected by feedback_mode:
 *   - "none"  (default): main-task behavior. No correctness feedback is
 *     shown (that's the thing being measured); Submit is always
 *     clickable, but with unanswered scenarios it just explains what's
 *     left instead of submitting, and once everything is answered it
 *     asks for a final confirmation before actually finishing the trial
 *     (submitting is irreversible — this is the "ready to submit, or
 *     keep reviewing?" check).
 *   - "retry": practice-task behavior. Wrong predictions show inline
 *     feedback and stay open to retry; once every prediction is correct,
 *     Submit is replaced by Continue.
 *
 * Data-writing keeps prediction-navigator-plugin.js's/prediction-grid-
 * plugin.js's exact event_type strings (prediction_navigator_attempt,
 * observation_shown, prediction_grid_attempt, ...) even though this is a
 * different plugin/file — batch-feedback-plugin.js and
 * prediction-review-plugin.js read the main-task ones back out by that
 * literal string, and there's no reason to disturb that contract just
 * because the UI moved.
 */
var jsPredictionColumns = (function (jspsych) {
  "use strict";

  const info = {
    name: "prediction-columns",
    parameters: {
      /** { id, urns/draw, outcome/result/correct_outcome, given?, selected_urn?, selected_color? } */
      scenarios: {
        type: jspsych.ParameterType.ARRAY,
        default: []
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
      /** Practice-task fallback when a scenario has no correct_outcome/result of its own. */
      rule_fn: {
        type: jspsych.ParameterType.FUNCTION,
        default: null
      },
      /** false for the no-explanation condition: given cards still get the
       * yellow-highlighter sentence, but stating only the outcome, and
       * their ball is never ring-highlighted (there's no causal ball to
       * point to). */
      show_explanation: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      /** Default true: one full urn display is shown once, above both
       * columns, as a size/probability reference; each card then shows
       * only a compact single row of drawn balls in their slots (one per
       * urn) instead of repeating the full urn stack — this is what lets
       * several draws fit on screen at once without scrolling. Set false
       * to revert to the old per-card full urn display. */
      shared_urns_display: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      /** Default false (unchanged main-task look: each given sentence gets
       * its own yellow <mark> highlighter). Set true for the practice
       * trials, where the "already observed" column is short enough that
       * a whole column of individually-marked sentences reads as
       * visually heavy — instead the whole "already observed" column
       * gets a light yellow tint and its sentences render as plain text. */
      given_column_highlight: {
        type: jspsych.ParameterType.BOOL,
        default: false
      },
      /** Practice-task rule box (PRACTICE RULE N/2, EXAMPLE RULE, ...); empty shows nothing. */
      rule_text: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      /** Main-task "Round X of Y" header; omit (leave falsy) to hide it entirely. */
      round_number: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      total_rounds: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "prediction_columns"
      },
      submit_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Submit All"
      },
      continue_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue"
      },
      /** "none" (main task, no feedback) or "retry" (practice, retry-until-correct). */
      feedback_mode: {
        type: jspsych.ParameterType.STRING,
        default: "none"
      },
      incorrect_feedback_text: {
        type: jspsych.ParameterType.STRING,
        default: "Incorrect prediction. Please try again."
      },
      incomplete_message: {
        type: jspsych.ParameterType.STRING,
        default: "Please make a prediction for all the remaining draws before submitting."
      },
      confirm_submit_message: {
        type: jspsych.ParameterType.STRING,
        default: "Are you ready to submit your answers? You won't be able to change them afterward. Click Cancel to keep reviewing your predictions."
      }
    }
  };

  class PredictionColumnsPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const scenarios = trial.scenarios || [];
      const showExplanation = trial.show_explanation !== false;
      const sharedUrnsDisplay = trial.shared_urns_display !== false;
      const givenColumnHighlight = !!trial.given_column_highlight;
      const agentName = trial.agent_name || "John";
      const questionId = trial.question_id || "prediction_columns";
      const retryMode = trial.feedback_mode === "retry";
      const trialStartTime = performance.now();

      const givenEntries = [];
      const predictEntries = [];
      scenarios.forEach((sc, idx) => {
        (sc.given ? givenEntries : predictEntries).push({ sc, idx });
      });

      // Resolves one scenario's actual win/lose — covers every convention
      // used across the app's data sources: prediction-grid's own
      // correct_outcome boolean (practice, computed once up front there),
      // the main ledger record's result string ("win"/"lose"), or (as a
      // last resort) evaluating rule_fn against the draw directly.
      const actualOutcomeFor = (sc) => {
        if (typeof sc.correct_outcome === "boolean") return sc.correct_outcome;
        if (sc.result !== undefined || sc.outcome !== undefined) {
          return String(sc.outcome !== undefined ? sc.outcome : sc.result).toLowerCase() === "win";
        }
        const draw = sc.urns || sc.draw || sc;
        return trial.rule_fn ? !!trial.rule_fn(draw) : false;
      };

      // true = win, false = lose, null = unanswered.
      const answers = scenarios.map(() => null);
      // retry mode only: locked once correct (given scenarios start "passed"
      // since there's nothing to answer on them either way).
      const passed = scenarios.map((sc) => !!sc.given);
      const attempts = scenarios.map(() => 0);

      const headerHTML = `
        ${trial.rule_text ? `<div class="pcol-rule-text">${trial.rule_text}</div>` : ""}
        ${trial.round_number ? `
          <h2 class="pcol-round-title">Round ${trial.round_number} of ${trial.total_rounds}</h2>
          <p class="pcol-round-sub">${givenEntries.length} of ${agentName}'s draws have now been ${showExplanation ? "explained" : "shown"}.</p>
        ` : ""}
        <p class="pcol-instructions">
          ${showExplanation
            ? "The draws on the left have already been explained."
            : "The draws on the left show the outcome."}
          Predict the draws on the right by selecting <b>WON</b> or <b>LOST</b>.
        </p>
      `;

      // Compact per-urn "ball in its slot" row (shared_urns_display:true,
      // the default) — reuses .urn-slot's id convention (slot-${urnKey}),
      // so the exact same populate/highlight code below works unchanged
      // whether it's targeting this or the old full urn display.
      // badgeHTML: renderOutcomeBadge() output for given cards (the outcome
      // is already known), "" for predict cards (nothing to show — that's
      // the thing being predicted). Rendered as its own flex item in the
      // same row as the drawn balls, so it reads as a tag "next to" them
      // rather than a separate line.
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

      const renderCard = (sc, idx, isGiven) => {
        const draw = sc.urns || sc.draw || sc;
        let probText = "";
        if (sc.prob !== undefined) {
          probText = String(sc.prob).includes("%") ? sc.prob : `${sc.prob}%`;
        } else if (utils && trial.urn_map) {
          const calculatedProb = utils.computeDrawProbability(draw, trial.urn_map);
          probText = calculatedProb ? `${calculatedProb}%` : "";
        }

        const badgeHTML = isGiven && utils ? utils.renderOutcomeBadge(actualOutcomeFor(sc)) : "";

        const drawBlockHTML = sharedUrnsDisplay
          ? `
            ${renderCompactDraw(badgeHTML)}
            <div class="pcol-prob-text">${probText ? `Scenario Probability ${probText}` : ""}</div>
          `
          : `
            <div class="pcol-urns-wrapper" id="pcol-urns-${idx}">
              <div class="urns-display-container">${trial.urn_html}</div>
              ${badgeHTML ? `<div class="pcol-outcome-badge-slot">${badgeHTML}</div>` : ""}
              <div class="pcol-prob-text">${probText ? `Scenario Probability ${probText}` : ""}</div>
            </div>
          `;

        return `
          <div class="pcol-card" data-idx="${idx}">
            <div class="pcol-card-index">#${idx + 1}</div>
            ${drawBlockHTML}
            ${isGiven ? `
              <div class="prediction-feedback-block pcol-given-feedback-block">
                <div class="prediction-text-col">
                  <div class="card-sentence-text" id="pcol-sentence-${idx}"></div>
                </div>
              </div>
            ` : `
              <div class="prediction-feedback-block">
                <div class="prediction-text-col">
                  <div class="card-prompt-text" id="pcol-prompt-${idx}">Did ${agentName} win or lose this draw?</div>
                  <div class="card-sentence-text is-hidden" id="pcol-sentence-${idx}"></div>
                  ${retryMode ? `<div class="validation-feedback-text" id="pcol-feedback-${idx}"></div>` : ""}
                </div>
                <div class="predict-btn-group">
                  <button type="button" class="jspsych-btn predict-win-btn" data-action="win">WON</button>
                  <button type="button" class="jspsych-btn predict-lose-btn" data-action="lose">LOST</button>
                </div>
              </div>
            `}
          </div>
        `;
      };

      const sharedUrnsBlockHTML = sharedUrnsDisplay
        ? `<div class="pcol-shared-urns"><div class="urns-display-container">${trial.urn_html}</div></div>`
        : "";

      display_element.innerHTML = `
        <div class="pcol-container${urnKeys.length <= 2 ? " pcol-two-urns" : ""}">
          <div class="pcol-header">${headerHTML}</div>
          ${sharedUrnsBlockHTML}
          <div class="pcol-columns">
            <div class="pcol-column${givenColumnHighlight ? " pcol-column-given-highlight" : ""}">
              <div class="pcol-column-header">Already observed (${givenEntries.length})</div>
              <div class="pcol-column-scroll" id="pcol-given-scroll">
                ${givenEntries.map(({ sc, idx }) => renderCard(sc, idx, true)).join("")}
              </div>
            </div>
            <div class="pcol-column">
              <div class="pcol-column-header">Your predictions (${predictEntries.length})</div>
              <div class="pcol-column-scroll" id="pcol-predict-scroll">
                ${predictEntries.map(({ sc, idx }) => renderCard(sc, idx, false)).join("")}
              </div>
            </div>
          </div>
          <div class="pcol-footer">
            <span class="pcol-remaining-text" id="pcol-remaining-text"></span>
            <button id="pcol-submit-btn" class="jspsych-btn grid-submit-btn">${trial.submit_button_label}</button>
            <button id="pcol-continue-btn" class="jspsych-btn grid-submit-btn" style="display:none;">${trial.continue_button_label}</button>
          </div>
        </div>
        <div class="pcol-modal-overlay is-hidden" id="pcol-modal-overlay">
          <div class="pcol-modal-box">
            <p class="pcol-modal-message" id="pcol-modal-message"></p>
            <div class="pcol-modal-actions">
              <button type="button" class="jspsych-btn" id="pcol-modal-cancel-btn">Cancel</button>
              <button type="button" class="jspsych-btn grid-submit-btn" id="pcol-modal-confirm-btn">OK</button>
            </div>
          </div>
        </div>
      `;

      // ----- Populate every card's urns (ball placement, drawn-hidden
      // marking, given ball-ring + explanation sentence) — identical
      // mechanism to prediction-grid/navigator, just against this
      // plugin's own DOM. -----
      scenarios.forEach((sc, idx) => {
        const draw = sc.urns || sc.draw || sc;
        const isGiven = !!sc.given;
        const isWin = actualOutcomeFor(sc);
        const cardEl = display_element.querySelector(`.pcol-card[data-idx="${idx}"]`);
        if (!cardEl) return;
        const sentenceEl = cardEl.querySelector(`#pcol-sentence-${idx}`);

        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = cardEl.querySelector(`#slot-${urnKey}`);
          if (slotEl && drawnColor) {
            const displayColor = utils.getDisplayColor(drawnColor);
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
            if (isGiven && showExplanation && sc.selected_urn === urnKey) {
              utils.markHighlightedBall(slotEl, isWin);
            }
          }

          // Only the old full-per-card urn display has an actual ball
          // stack to hide one back into — the compact draw row's slot IS
          // the only ball, nothing to mark "drawn-hidden" alongside it.
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

        if (isGiven) {
          if (sentenceEl) {
            // Explanation cards: always keep the causal clause highlighted
            // (wrapInMark forced true, ignoring given_column_highlight)
            // and prepend a standalone outcome line above it — per
            // explicit request, the explanation itself must stay visually
            // marked even in the column-tinted (practice/main-task)
            // layout. No-explanation cards are unaffected: there's no
            // separate causal clause to highlight, so they keep
            // respecting given_column_highlight as before.
            sentenceEl.innerHTML = (showExplanation && sc.selected_urn)
              ? utils.renderExplanationSentence(isWin, sc.selected_color, sc.selected_urn, agentName, true, true)
              : utils.renderOutcomeOnlySentence(isWin, agentName, !givenColumnHighlight);
          }
          return; // no interaction on given cards
        }

        const winBtn = cardEl.querySelector('[data-action="win"]');
        const loseBtn = cardEl.querySelector('[data-action="lose"]');
        const feedbackEl = cardEl.querySelector(`#pcol-feedback-${idx}`);

        const handlePredictClick = (predictedWin) => {
          if (passed[idx]) return;
          answers[idx] = predictedWin;

          this.jsPsych.data.write({
            event_type: retryMode ? "prediction_button_press" : "prediction_navigator_button_press",
            question_id: questionId,
            scenario_id: sc.id || `scenario_${idx + 1}`,
            pressed: predictedWin ? "win" : "lose"
          });

          winBtn.classList.toggle("is-selected", predictedWin);
          loseBtn.classList.toggle("is-selected", !predictedWin);

          if (sentenceEl) {
            sentenceEl.innerHTML = utils.renderPredictionSentence(agentName, predictedWin);
            sentenceEl.classList.remove("is-hidden");
          }
          if (feedbackEl) feedbackEl.innerHTML = "";

          updateRemainingText();
        };

        winBtn.onclick = () => handlePredictClick(true);
        loseBtn.onclick = () => handlePredictClick(false);
      });

      // In-page replacement for window.alert()/window.confirm(): those
      // native browser dialogs force the browser out of fullscreen mode
      // (a browser-level side effect no amount of CSS/JS can prevent),
      // which is disruptive now that the study puts participants into
      // fullscreen right after consent. This renders entirely inside the
      // page instead, so fullscreen is never interrupted. Resolves true
      // if the confirm/OK button was clicked, false if Cancel was
      // clicked; an informational alert (showCancel:false) always
      // resolves true once dismissed.
      const modalOverlay = display_element.querySelector("#pcol-modal-overlay");
      const modalMessageEl = display_element.querySelector("#pcol-modal-message");
      const modalCancelBtn = display_element.querySelector("#pcol-modal-cancel-btn");
      const modalConfirmBtn = display_element.querySelector("#pcol-modal-confirm-btn");

      const showModalDialog = ({ message, showCancel = false, confirmLabel = "OK", cancelLabel = "Cancel" }) => {
        return new Promise((resolve) => {
          modalMessageEl.textContent = message;
          modalConfirmBtn.textContent = confirmLabel;
          modalCancelBtn.textContent = cancelLabel;
          modalCancelBtn.classList.toggle("is-hidden", !showCancel);
          modalOverlay.classList.remove("is-hidden");

          const cleanup = (result) => {
            modalOverlay.classList.add("is-hidden");
            modalConfirmBtn.removeEventListener("click", onConfirm);
            modalCancelBtn.removeEventListener("click", onCancel);
            resolve(result);
          };
          const onConfirm = () => cleanup(true);
          const onCancel = () => cleanup(false);

          modalConfirmBtn.addEventListener("click", onConfirm);
          modalCancelBtn.addEventListener("click", onCancel);
        });
      };

      // Start the "already observed" column scrolled to its bottom, so the
      // most-recently-added batch (the last cards in the list, still
      // numbered in ascending order — this only changes the initial
      // scroll position, not the cards' own order/numbering) is what's
      // in view without the participant having to scroll down for it.
      // rAF so this runs after the browser has laid the column out (its
      // real scrollHeight isn't reliable in the same tick the innerHTML
      // was set).
      const givenScrollEl = display_element.querySelector("#pcol-given-scroll");
      if (givenScrollEl) {
        requestAnimationFrame(() => {
          givenScrollEl.scrollTop = givenScrollEl.scrollHeight;
        });
      }

      const remainingTextEl = display_element.querySelector("#pcol-remaining-text");
      const submitBtn = display_element.querySelector("#pcol-submit-btn");
      const continueBtn = display_element.querySelector("#pcol-continue-btn");

      const countRemaining = () => scenarios.filter((sc, idx) => !sc.given && !passed[idx] && answers[idx] === null).length;

      function updateRemainingText() {
        const remaining = countRemaining();
        remainingTextEl.textContent = remaining > 0
          ? `${remaining} prediction${remaining === 1 ? "" : "s"} remaining`
          : "All predictions made.";
      }
      updateRemainingText();

      // ----- Retry-mode submit (practice tasks): mirrors
      // prediction-grid-plugin.js's own submit handler exactly. -----
      const handleRetrySubmit = () => {
        const now = performance.now();
        let allCorrect = true;

        scenarios.forEach((sc, idx) => {
          if (sc.given || passed[idx]) return;

          const cardEl = display_element.querySelector(`.pcol-card[data-idx="${idx}"]`);
          const feedbackEl = cardEl.querySelector(`#pcol-feedback-${idx}`);

          if (answers[idx] === null) {
            allCorrect = false;
            if (feedbackEl) feedbackEl.innerHTML = `<span class="lose">Please make a prediction.</span>`;
            return;
          }

          attempts[idx] += 1;
          const actualOutcome = actualOutcomeFor(sc);
          const isCorrect = answers[idx] === actualOutcome;
          passed[idx] = isCorrect;

          this.jsPsych.data.write({
            event_type: "prediction_grid_attempt",
            question_id: questionId,
            scenario_id: sc.id || `scenario_${idx + 1}`,
            attempt_number: attempts[idx],
            predicted_outcome: answers[idx] ? "win" : "lose",
            actual_outcome: actualOutcome ? "win" : "lose",
            is_correct: isCorrect
          });

          if (isCorrect) {
            if (feedbackEl) feedbackEl.innerHTML = `<span class="win">✓ Correct</span>`;
            cardEl.classList.add("card-passed");
            cardEl.querySelectorAll(".predict-win-btn, .predict-lose-btn").forEach((btn) => { btn.disabled = true; });
          } else {
            allCorrect = false;
            if (feedbackEl) feedbackEl.innerHTML = `<span class="lose">${sc.incorrect_feedback_text || trial.incorrect_feedback_text}</span>`;
            cardEl.classList.remove("card-passed");
          }
        });

        updateRemainingText();

        if (allCorrect) {
          submitBtn.style.display = "none";
          continueBtn.style.display = "inline-block";
        }
      };

      // ----- Main-task submit (feedback_mode:"none"): incomplete -> just
      // explain what's left; complete -> confirm before actually
      // finishing, since submitting can't be undone. -----
      const finalizeSubmit = () => {
        scenarios.forEach((sc, idx) => {
          const draw = sc.urns || sc.draw || sc;
          const isGiven = !!sc.given;
          const actualOutcome = actualOutcomeFor(sc);

          if (isGiven) {
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
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          event_type: "prediction_navigator_complete",
          question_id: questionId,
          given_count: givenEntries.length,
          total_trial_rt: totalRt,
          tasks_completed: scenarios.length
        });
      };

      submitBtn.addEventListener("click", async () => {
        if (retryMode) {
          handleRetrySubmit();
          return;
        }
        if (countRemaining() > 0) {
          await showModalDialog({ message: trial.incomplete_message, showCancel: false });
          return;
        }
        const confirmed = await showModalDialog({
          message: trial.confirm_submit_message,
          showCancel: true,
          confirmLabel: "Submit"
        });
        if (confirmed) {
          finalizeSubmit();
        }
      });

      continueBtn.addEventListener("click", () => {
        const totalRt = Math.round(performance.now() - trialStartTime);
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          event_type: "prediction_grid_complete",
          question_id: questionId,
          total_trial_rt: totalRt,
          tasks_completed: scenarios.length
        });
      });
    }
  }

  PredictionColumnsPlugin.info = info;
  return PredictionColumnsPlugin;
})(jsPsychModule);
