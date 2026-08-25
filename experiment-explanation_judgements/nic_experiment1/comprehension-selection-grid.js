/**
 * jsPsych plugin for Comprehension Ball Selection Grid
 * Displays a batch array of comprehension tasks in a grid layout.
 * - Dynamic selection description sentence below each question (colored text per ball).
 * - Supports single or multiple acceptable correct options/sets per scenario.
 * - Zero-overlap layout with dedicated card footers.
 * - Two-phase completion: validates cards on Submit, then reveals a "Continue" button once all are correct.
 */
var jsComprehensionGridSelection = (function (jspsych) {
  "use strict";

  const info = {
    name: "comprehension-grid-selection",
    parameters: {
      /** Array of comprehension task objects */
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
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "comprehension_grid_batch"
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
        default: "Incorrect selection. Please try again."
      }
    }
  };

  class ComprehensionGridSelectionPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    /** Helper to render colorful selection sentence */
    renderSelectionSentence(selectedKeys, draw) {
      const utils = window.UrnUtils;
      if (!selectedKeys || selectedKeys.length === 0) return "";

      const descriptions = selectedKeys.map((urnKey) => {
        const drawnColor = draw[urnKey];
        const cleanColor = utils ? utils.normalizeColor(drawnColor) : drawnColor;
        const displayColor = utils ? utils.getDisplayColor(cleanColor) : cleanColor;

        return `the <span class="urn-ball-text" style="color: ${displayColor}; font-weight: 600;">${cleanColor}</span> ball from box ${urnKey}`;
      });

      if (descriptions.length === 1) {
        return `You've selected ${descriptions[0]}.`;
      } else if (descriptions.length === 2) {
        return `You've selected ${descriptions[0]} and ${descriptions[1]}.`;
      } else {
        const last = descriptions.pop();
        return `You've selected ${descriptions.join(", ")}, and ${last}.`;
      }
    }

    /** Helper to normalize correct answer specs into an array of sorted arrays */
    parseCorrectOptions(correctProp) {
      if (!correctProp) return [];
      
      if (typeof correctProp === "string") {
        return [[correctProp]];
      }

      if (Array.isArray(correctProp)) {
        if (correctProp.length > 0 && Array.isArray(correctProp[0])) {
          return correctProp.map(opt => opt.slice().sort());
        } else {
          return correctProp.map(item => Array.isArray(item) ? item.slice().sort() : [item]);
        }
      }
      return [];
    }

    /** Checks if user selection matches any valid option set */
    checkIsCorrect(selectedKeys, validOptionSets) {
      const sortedSelection = selectedKeys.slice().sort();
      
      return validOptionSets.some((validOption) => {
        if (validOption.length !== sortedSelection.length) return false;
        return validOption.every((key, i) => key === sortedSelection[i]);
      });
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const scenarios = trial.scenarios || [];
      const questionId = trial.question_id || "comprehension_grid_batch";
      const showRule = trial.show_rule !== false;
      const trialStartTime = performance.now();

      // State tracking per scenario card index
      const cardStates = scenarios.map((sc) => ({
        selectedUrns: new Set(),
        attempts: 0,
        isPassed: false,
        lastAttemptTime: trialStartTime,
        validOptions: this.parseCorrectOptions(sc.correct)
      }));

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
        const draw = sc.draw || {};

        // Compute or fetch scenario probability
        let probText = "";
        if (sc.prob !== undefined) {
          probText = String(sc.prob).includes("%") ? sc.prob : `${sc.prob}%`;
        } else if (utils && trial.urn_map) {
          const calculatedProb = utils.computeDrawProbability(draw, trial.urn_map);
          probText = calculatedProb ? `${calculatedProb}%` : "";
        }

        html += `
          <div class="explanation-card-item comp-card-item" data-sample-idx="${idx}">
            <div class="grid-card-scaling-wrapper">
              
              <!-- Urns Container with Zero-Overlap Layout -->
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

              <!-- Card Prompt, Selection Sentence & Dynamic Feedback -->
                <div class="card-feedback-block">
                ${sc.prompt ? `<div class="card-question-text comp-card-prompt">${sc.prompt}</div>` : ""}
                
                <!-- Dynamic Selection Sentence (is-hidden uses visibility:hidden) -->
                <div class="card-explanation-sentence comp-selection-sentence is-hidden" id="card-selection-sentence-${idx}">&nbsp;</div>

                <!-- Validation Feedback Container -->
                <div class="validation-feedback-text" id="card-feedback-${idx}">&nbsp;</div>
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
              Select the correct ball for each task in the grid.
            </div>
            
            <!-- Phase 1 Button: Submit All -->
            <button id="grid-submit-btn" class="jspsych-btn grid-submit-btn">
              ${trial.submit_button_label}
            </button>

            <!-- Phase 2 Button: Continue (Initially Hidden) -->
            <button id="grid-continue-btn" class="jspsych-btn grid-submit-btn" style="display: none;">
              ${trial.continue_button_label}
            </button>
          </div>
        </div>
      `;

      display_element.innerHTML = html;

      // Attach Urn Balls & Click Handlers
      scenarios.forEach((sc, idx) => {
        const draw = sc.draw || {};
        const cardEl = display_element.querySelector(`[data-sample-idx="${idx}"]`);
        const allowMultiple = !!sc.allow_multiple;

        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = cardEl.querySelector(`#slot-${urnKey}`);

          if (slotEl && drawnColor) {
            const cleanColor = utils ? utils.normalizeColor(drawnColor) : drawnColor;
            const displayColor = utils ? utils.getDisplayColor(cleanColor) : cleanColor;

            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
            slotEl.classList.add("is-selectable");

            slotEl.onclick = () => {
              const state = cardStates[idx];
              
              // Clear card error/pass feedback on selection change
              const feedbackEl = cardEl.querySelector(`#card-feedback-${idx}`);
              if (feedbackEl) feedbackEl.innerHTML = "&nbsp;"; // Maintain line height on clear

              if (allowMultiple) {
                if (state.selectedUrns.has(urnKey)) {
                  state.selectedUrns.delete(urnKey);
                } else {
                  state.selectedUrns.add(urnKey);
                }
              } else {
                state.selectedUrns.clear();
                state.selectedUrns.add(urnKey);
              }

              // Update slot visual selection highlight
              urnKeys.forEach((k) => {
                const s = cardEl.querySelector(`#slot-${k}`);
                if (s) {
                  s.classList.toggle("is-selected", state.selectedUrns.has(k));
                }
              });

              // Render & Display Selection Description Sentence
              const sentenceEl = cardEl.querySelector(`#card-selection-sentence-${idx}`);
              const selectedArray = Array.from(state.selectedUrns).sort();

              if (sentenceEl) {
                if (selectedArray.length > 0) {
                  sentenceEl.innerHTML = this.renderSelectionSentence(selectedArray, draw);
                  sentenceEl.classList.remove("is-hidden");
                } else {
                  sentenceEl.innerHTML = "&nbsp;";
                  sentenceEl.classList.add("is-hidden");
                }
              }
            };
          }

          // Hide extracted balls inside urn bodies
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
      });

      const submitBtn = display_element.querySelector("#grid-submit-btn");
      const continueBtn = display_element.querySelector("#grid-continue-btn");
      const hintEl = display_element.querySelector("#instruction-hint");

      // Handler 1: Submit and Validate
      submitBtn.addEventListener("click", () => {
        const now = performance.now();
        let allCorrect = true;

        scenarios.forEach((sc, idx) => {
          const state = cardStates[idx];
          const cardEl = display_element.querySelector(`[data-sample-idx="${idx}"]`);
          const feedbackEl = cardEl.querySelector(`#card-feedback-${idx}`);

          state.attempts += 1;
          const rt = Math.round(now - state.lastAttemptTime);
          state.lastAttemptTime = now;

          const selectedKeys = Array.from(state.selectedUrns).sort();
          const isCorrect = this.checkIsCorrect(selectedKeys, state.validOptions);

          state.isPassed = isCorrect;

          // Record per-card submission attempt
          this.jsPsych.data.write({
            event_type: "comprehension_grid_attempt",
            question_id: questionId,
            scenario_id: sc.id || `task_${idx + 1}`,
            attempt_number: state.attempts,
            selected_urns: selectedKeys,
            valid_options: state.validOptions,
            is_correct: isCorrect,
            rt: rt
          });

          if (isCorrect) {
            if (feedbackEl) {
              feedbackEl.innerHTML = `<span style="color: #2e7d32; font-weight: 600;">✓ Correct</span>`;
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

        // If all cards passed, swap Submit with Continue
        if (allCorrect) {
          submitBtn.style.display = "none";
          continueBtn.style.display = "inline-block";
          if (hintEl) hintEl.textContent = "All answers correct! Click Continue to proceed.";
        }
      });

      // Handler 2: Finish Trial on Continue
      continueBtn.addEventListener("click", () => {
        const totalRt = Math.round(performance.now() - trialStartTime);
        const trialData = {
          event_type: "comprehension_grid_complete",
          question_id: questionId,
          total_trial_rt: totalRt,
          tasks_completed: scenarios.length
        };

        display_element.innerHTML = "";
        this.jsPsych.finishTrial(trialData);
      });
    }
  }

  ComprehensionGridSelectionPlugin.info = info;
  return ComprehensionGridSelectionPlugin;
})(jsPsychModule);