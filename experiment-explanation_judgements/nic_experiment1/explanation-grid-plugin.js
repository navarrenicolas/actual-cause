/**
 * jsPsych plugin for 2x2 Batch Explanation Selection
 * Displays 4 pre-sampled scenarios at a time in a tight 2x2 grid format.
 * - Shows full urns with drawn balls in slots and removed from urn bodies.
 * - Generates outcome feedback & sentence transitions per sample.
 * - Forces selection on all 4 scenarios before allowing batch submission.
 * - Namespaced to `.explanation-2x2-container` to prevent CSS leakage to other plugins.
 */
var jsPsychExplanationGrid = (function (jspsych) {
  "use strict";

  const info = {
    name: "explanation-grid",
    parameters: {
      /** Array of exactly 4 scenario/draw objects */
      scenarios: {
        type: jspsych.ParameterType.ARRAY,
        default: []
      },
      /** Pre-rendered HTML for the Urns container base structure */
      urn_html: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      /** Rule text HTML displayed at the top */
      rule_text: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      /** Full Urn Configuration Map */
      urn_map: {
        type: jspsych.ParameterType.OBJECT,
        default: null
      },
      /** Urn Keys (e.g. ['A', 'B', 'C', 'D']) */
      urn_keys: {
        type: jspsych.ParameterType.ARRAY,
        default: ["A", "B", "C", "D"]
      },
      /** Subject/Agent Name */
      agent_name: {
        type: jspsych.ParameterType.STRING,
        default: "John"
      },
      /** Question or Trial identifier */
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "explanation_grid_batch"
      },
      /** Rule evaluation function */
      rule_fn: {
        type: jspsych.ParameterType.FUNCTION,
        default: null
      },
      /** Label for the submit button */
      button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Submit Selections"
      }
    }
  };

  class ExplanationGridPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    renderExplanationSentence(isWin, color, urnKey, agentName) {
      const utils = window.UrnUtils;
      const cleanColor = utils ? utils.normalizeColor(color) : color;
      const displayColor = utils ? utils.getDisplayColor(cleanColor) : cleanColor;
      const outcomeText = isWin ? "won" : "lost";
      const outcomeClass = isWin ? "win" : "lose";

      return `${agentName} <span class="${outcomeClass}">${outcomeText}</span> because of the <span class="urn-ball-text" style="color: ${displayColor};">${cleanColor}</span> ball from box ${urnKey}.`;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const scenarios = trial.scenarios || [];
      const agentName = trial.agent_name || "John";
      const questionId = trial.question_id || "explanation_grid_batch";
      const trialStartTime = performance.now();
      const selections = {};

      let html = `
        <div class="draw-plugin-container explanation-2x2-container">
          <!-- TOP PANEL: RULE HEADER -->
          <div class="grid-top-panel">
            ${trial.rule_text ? `<div id="rule-text" class="grid-rule-text">${trial.rule_text}</div>` : ""}
          </div>

          <!-- MIDDLE PANEL: 2x2 GRID -->
          <div class="explanation-2x2-grid">
      `;

      scenarios.forEach((sc, idx) => {
        const draw = sc.urns || sc;
        const isWin = trial.rule_fn ? trial.rule_fn(draw) : (String(sc.outcome).toLowerCase() === 'win');

        html += `
          <div class="explanation-card-item" data-sample-idx="${idx}">
            <div class="grid-card-scaling-wrapper">
              <!-- Urns HTML Container -->
              <div class="urns-card-wrapper" id="urns-card-${idx}">
                ${trial.urn_html}
              </div>

              <!-- Feedback & Question Block -->
              <div class="card-feedback-block">
                <div class="card-outcome-text">
                  With this sample ${agentName} <span class="${isWin ? 'win' : 'lose'}">${isWin ? 'won' : 'lost'}</span>.
                </div>
                <div class="card-question-text" id="card-question-${idx}">
                  Why did ${agentName} <span class="${isWin ? 'win' : 'lose'}">${isWin ? 'win' : 'lose'}</span>?
                </div>
                <div class="card-explanation-sentence is-hidden" id="card-explanation-${idx}"></div>
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>

          <!-- BOTTOM PANEL: ACTION & SUBMIT BUTTON -->
          <div class="draw-action-segment explanation-action-segment">
            <div class="explanation-instruction-hint">
              Click the balls to select an explanation for each of the 4 scenarios.
            </div>
            <button id="grid-submit-btn" class="jspsych-btn grid-submit-btn" disabled>
              ${trial.button_label}
            </button>
          </div>
        </div>
      `;

      display_element.innerHTML = html;

      // Populate Urn Drawn Balls and Attach Click Listeners
      scenarios.forEach((sc, idx) => {
        const draw = sc.urns || sc;
        const isWin = trial.rule_fn ? trial.rule_fn(draw) : (String(sc.outcome).toLowerCase() === 'win');
        const cardEl = display_element.querySelector(`[data-sample-idx="${idx}"]`);

        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = cardEl.querySelector(`#slot-${urnKey}`);

          if (slotEl) {
            const cleanColor = utils ? utils.normalizeColor(drawnColor) : drawnColor;
            const displayColor = utils ? utils.getDisplayColor(cleanColor) : cleanColor;

            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
            slotEl.classList.add("is-selectable");

            slotEl.onclick = () => {
              const clickTime = performance.now();
              const rt = Math.round(clickTime - trialStartTime);

              // Clear visual selection state within this card's slots
              urnKeys.forEach(k => {
                const s = cardEl.querySelector(`#slot-${k}`);
                if (s) s.classList.remove("is-selected", "is-selected-win", "is-selected-loss");
              });

              // Apply active selection highlight
              slotEl.classList.add("is-selected");
              slotEl.classList.add(isWin ? "is-selected-win" : "is-selected-loss");

              // Save selection state
              const selectionRecord = {
                question_id: questionId,
                scenario_id: sc.id || (idx + 1),
                agent_name: agentName,
                selected_urn: urnKey,
                selected_color: drawnColor,
                draw_A: draw.A,
                draw_B: draw.B,
                draw_C: draw.C,
                draw_D: draw.D,
                result: isWin ? "win" : "lose",
                rt: rt
              };

              selections[idx] = selectionRecord;

              // Write click data directly to jsPsych.data
              this.jsPsych.data.write({
                event_type: "ball_selection",
                ...selectionRecord
              });

              // Toggle UI Text from Question to Sentence
              const questionEl = cardEl.querySelector(`#card-question-${idx}`);
              const sentenceEl = cardEl.querySelector(`#card-explanation-${idx}`);

              if (questionEl && sentenceEl) {
                questionEl.classList.add("is-hidden");
                sentenceEl.innerHTML = this.renderExplanationSentence(isWin, drawnColor, urnKey, agentName);
                sentenceEl.classList.remove("is-hidden");
              }

              // Check if all cards have selections
              const submitBtn = display_element.querySelector("#grid-submit-btn");
              if (submitBtn) {
                submitBtn.disabled = Object.keys(selections).length < scenarios.length;
              }
            };
          }

          // Hide corresponding drawn ball inside urn containers
          let urnContainer = cardEl.querySelector(`#urn-${urnKey}`) || 
                             cardEl.querySelector(`[data-urn="${urnKey}"]`) ||
                             cardEl.querySelectorAll(".urn")[urnKeys.indexOf(urnKey)];

          if (urnContainer) {
            const candidateBalls = Array.from(urnContainer.querySelectorAll(".ball")).filter(b => {
              if (b.closest(".urn-slot") || b.classList.contains("drawn-hidden")) return false;
              return utils ? utils.matchesColor(b, drawnColor) : b.style.backgroundColor === drawnColor;
            });

            if (candidateBalls.length > 0) {
              const randomIndex = Math.floor(Math.random() * candidateBalls.length);
              candidateBalls[randomIndex].classList.add("drawn-hidden");
            }
          }
        });
      });

      // Submit Button Event Handler
      const submitBtn = display_element.querySelector("#grid-submit-btn");
      submitBtn.addEventListener("click", () => {
        const totalRt = Math.round(performance.now() - trialStartTime);
        const detailedResults = Object.keys(selections).map(idx => selections[idx]);

        const trialData = {
          event_type: "grid_batch_complete",
          question_id: questionId,
          detailed_results: detailedResults,
          total_trial_rt: totalRt
        };

        display_element.innerHTML = "";
        this.jsPsych.finishTrial(trialData);
      });
    }
  }

  ExplanationGridPlugin.info = info;
  return ExplanationGridPlugin;
})(jsPsychModule);