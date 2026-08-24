/**
 * jsPsych plugin for Comprehension Ball Selection
 * Features rule_text, full draw description with probabilities, win/loss outcome feedback,
 * and interactive urn slot ball selection. Strictly relies on window.UrnUtils.
 */
var jsComprehensionSelection = (function (jspsych) {
  "use strict";

  const info = {
    name: "comprehension-selection",
    parameters: {
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
      draw: {
        type: jspsych.ParameterType.COMPLEX,
        default: {}
      },
      urn_keys: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: ["A", "B", "C", "D"]
      },
      correct_keys: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: []
      },
      allow_multiple: {
        type: jspsych.ParameterType.BOOL,
        default: false
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
        default: "comprehension_selection"
      },
      prompt: {
        type: jspsych.ParameterType.STRING,
        default: "Select the required ball(s)."
      },
      submit_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Submit"
      },
      retry_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Try again"
      },
      incorrect_feedback_text: {
        type: jspsych.ParameterType.STRING,
        default: "Incorrect selection. Please try again."
      }
    }
  };

  class ComprehensionSelectionPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const draw = trial.draw || {};
      const correctKeys = (trial.correct_keys || []).sort();
      const questionId = trial.question_id || "comprehension_selection";
      const allowMultiple = trial.allow_multiple;
      const showRule = trial.show_rule !== false;
      const agentName = trial.agent_name || "John";
      const ruleFn = trial.rule_fn || (() => false);

      const actualWin = !!ruleFn(draw);
      const selectedUrns = new Set();
      let attemptCount = 0;
      let lastAttemptTime = performance.now();

      // Render 2-paragraph outcome text (probabilities + draw description with win/loss)
      const fullFeedbackText = utils.renderSampleDescription(
        draw,
        urnKeys,
        agentName,
        actualWin,
        trial.urn_map,
        true
      );

      display_element.innerHTML = `
        <div id="draw-plugin-container" class="draw-plugin-container comprehension-selection-container">
          
          <!-- TOP SEGMENT: Urns & Rule Text -->
          <div id="top-segment" class="draw-top-segment">
            ${showRule && trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}
            <div id="urns-wrapper">${trial.urn_html || ""}</div>
          </div>

          <!-- OUTCOME DISPLAY & SELECTION PANEL -->
          <div id="outcome-segment" class="draw-outcome-segment">
            <div class="draw-panel-wrapper">
              
              <!-- Draw Summary Text, Probabilities & Result Outcome -->
              <div id="feedback-box" class="draw-feedback-text">
                ${fullFeedbackText}
              </div>
              
              <!-- Prompt Text -->
              ${trial.prompt ? `<div class="explanation-prompt-heading">${trial.prompt}</div>` : ""}
              
              <!-- Dynamic Incorrect Feedback Display -->
              <div id="validation-feedback" style="min-height: 1.5em; text-align: center; margin-top: 8px;"></div>
            </div>
          </div>

          <!-- ACTION CONTROL SEGMENT -->
          <div id="action-segment" class="draw-action-segment">
            <button id="submit-btn" class="jspsych-btn">${trial.submit_button_label || "Submit"}</button>
          </div>
        </div>
      `;

      const submitBtn = display_element.querySelector("#submit-btn");
      const validationFeedback = display_element.querySelector("#validation-feedback");

      // Populate target slot balls and visually hide matching balls inside urns
      urnKeys.forEach((urnKey) => {
        const drawnColor = draw[urnKey];
        const slotEl = display_element.querySelector(`#slot-${urnKey}`);

        if (slotEl && drawnColor) {
          const cleanColor = utils.normalizeColor(drawnColor);
          const isGrey = cleanColor === "grey";
          const displayColor = isGrey ? "#c0c0c0" : drawnColor;

          slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
          slotEl.classList.add("is-selectable");
          slotEl.onclick = () => toggleSelection(urnKey);
        }

        // Hide corresponding ball inside urn grid
        let urnContainer = display_element.querySelector(`#urn-${urnKey}`) || 
                           display_element.querySelector(`[data-urn="${urnKey}"]`) ||
                           display_element.querySelectorAll(".urn")[urnKeys.indexOf(urnKey)];

        if (urnContainer && drawnColor) {
          const candidateBalls = Array.from(urnContainer.querySelectorAll(".ball")).filter(b => 
            utils.matchesColor(b, drawnColor) && 
            !b.classList.contains("drawn-hidden") &&
            !b.closest(".urn-slot")
          );

          if (candidateBalls.length > 0) {
            const randomIndex = Math.floor(Math.random() * candidateBalls.length);
            candidateBalls[randomIndex].classList.add("drawn-hidden");
          }
        }
      });

      // Toggle slot visual selection state
      const toggleSelection = (urnKey) => {
        validationFeedback.innerHTML = "";
        submitBtn.textContent = trial.submit_button_label || "Submit";

        if (allowMultiple) {
          if (selectedUrns.has(urnKey)) {
            selectedUrns.delete(urnKey);
          } else {
            selectedUrns.add(urnKey);
          }
        } else {
          selectedUrns.clear();
          selectedUrns.add(urnKey);
        }

        // Update CSS classes on all target slots
        urnKeys.forEach(k => {
          const slot = display_element.querySelector(`#slot-${k}`);
          if (slot) {
            slot.classList.toggle("is-selected", selectedUrns.has(k));
          }
        });
      };

      // Submit Button Click Event
      submitBtn.addEventListener("click", () => {
        attemptCount += 1;
        const now = performance.now();
        const rt = Math.round(now - lastAttemptTime);
        lastAttemptTime = now;

        const selectedKeys = Array.from(selectedUrns).sort();

        const isCorrect =
          correctKeys.length === selectedKeys.length &&
          correctKeys.every((key, i) => key === selectedKeys[i]);

        if (typeof this.jsPsych.increaseTrialIndex === "function") {
          this.jsPsych.increaseTrialIndex();
        }

        this.jsPsych.data.write({
          questionID: questionId,
          attempt_number: attemptCount,
          selected_urns: selectedKeys,
          correct_urns: correctKeys,
          is_correct: isCorrect,
          allow_multiple: allowMultiple,
          rt: rt
        });

        if (isCorrect) {
          display_element.innerHTML = "";
          this.jsPsych.finishTrial({
            questionID: questionId,
            total_attempts: attemptCount,
            final_selected_urns: selectedKeys,
            passed: true
          });
        } else {
          validationFeedback.innerHTML = `<p class="lose" style="margin: 4px 0 !important;">${
            trial.incorrect_feedback_text || "Incorrect selection. Please try again."
          }</p>`;
          submitBtn.textContent = trial.retry_button_label || "Try again";
        }
      });
    }
  }

  ComprehensionSelectionPlugin.info = info;

  return ComprehensionSelectionPlugin;
})(jsPsychModule);