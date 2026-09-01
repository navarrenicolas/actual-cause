/**
 * jsPsych plugin for Pre-Sampled Sequential Rule Prediction Task
 * Maintains a strict 2-paragraph layout inside .draw-feedback-text:
 * - Paragraph 1: Probabilities
 * - Paragraph 2: Draws + Prediction slot ("___" / "WON" / "LOST")
 * Strictly relies on window.UrnUtils.
 */
var jsPredictionTask = (function (jspsych) {
  "use strict";

  const info = {
    name: "prediction-task",
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
      draws: {
        type: jspsych.ParameterType.COMPLEX,
        array: true,
        default: []
      },
      urn_keys: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: ["A", "B", "C", "D"]
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
        default: "rule_prediction_task"
      },
      max_samples: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      remaining_label: {
        type: jspsych.ParameterType.STRING,
        default: "Remaining trials:"
      },
      prompt: {
        type: jspsych.ParameterType.STRING,
        default: "Please predict the outcome of John's draw"
      },
      submit_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Check Answer"
      },
      next_trial_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Next Trial"
      },
      continue_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue to Next Section"
      }
    }
  };

  class PredictionTaskPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const draws = trial.draws || [];
      const totalSamples = trial.max_samples || draws.length;
      const questionId = trial.question_id || "rule_prediction_task";
      const showRule = trial.show_rule !== false;
      const agentName = trial.agent_name || "John";
      const ruleFn = trial.rule_fn || (() => false);

      let sampleIndex = 0;
      let currentTrialDraw = {};
      let userPrediction = null; // true = win, false = lose
      let sampleStartTime = performance.now();
      const trialStartTime = performance.now();
      const detailedResults = [];

      display_element.innerHTML = `
        <div id="draw-plugin-container" class="draw-plugin-container prediction-task-container">
          
          <!-- TOP SEGMENT: Urns & Rules -->
          <div id="top-segment" class="draw-top-segment">
            ${showRule && trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}
            <div id="urns-wrapper">${trial.urn_html || ""}</div>
            
            <div class="counter-display">
              <p id="remaining-samples">${trial.remaining_label} ${totalSamples - sampleIndex}</p>
            </div>
          </div>

          <!-- OUTCOME & PREDICTION SEGMENT -->
          <div id="outcome-segment" class="draw-outcome-segment">
            <div class="draw-panel-wrapper">
              
              <!-- Direct Feedback Container for the 2 Paragraphs -->
              <div id="feedback-box" class="draw-feedback-text"></div>
              
              <!-- Prediction Controls -->
              <div id="prediction-controls" class="prediction-controls-wrapper" style="margin-top: 15px;">
                <div id="prediction-prompt-wrapper" class="prediction-prompt-label" style="font-style: italic; margin-bottom: 10px;">
                  Please predict the outcome of ${agentName}'s draw
                </div>
                <div id="prediction-buttons-group" class="prediction-btn-group">
                  <button id="predict-win-btn" class="jspsych-btn predict-btn predict-win-btn" style="color: #28a745; font-weight: bold;">WON</button>
                  <button id="predict-lose-btn" class="jspsych-btn predict-btn predict-lose-btn" style="color: #dc3545; font-weight: bold;">LOST</button>
                </div>
              </div>

              <!-- Result Evaluation Feedback -->
              <div id="prediction-evaluation" class="prediction-evaluation-text is-hidden" style="margin-top: 10px;"></div>
            </div>
          </div>

          <!-- ACTION SEGMENT -->
          <div id="action-segment" class="draw-action-segment" style="margin-top: 15px;">
            <button id="submit-prediction-btn" class="jspsych-btn is-hidden">${trial.submit_button_label}</button>
            <button id="next-sample-btn" class="jspsych-btn is-hidden">${trial.next_trial_button_label}</button>
            <button id="continue-btn" class="jspsych-btn is-hidden">${trial.continue_button_label}</button>
          </div>
        </div>
      `;

      const feedbackBox = display_element.querySelector("#feedback-box");
      const predictionControls = display_element.querySelector("#prediction-controls");
      const promptWrapper = display_element.querySelector("#prediction-prompt-wrapper");
      const predictWinBtn = display_element.querySelector("#predict-win-btn");
      const predictLoseBtn = display_element.querySelector("#predict-lose-btn");
      const evaluationEl = display_element.querySelector("#prediction-evaluation");
      const submitPredictionBtn = display_element.querySelector("#submit-prediction-btn");
      const nextSampleBtn = display_element.querySelector("#next-sample-btn");
      const continueBtn = display_element.querySelector("#continue-btn");
      const remainingSamples = display_element.querySelector("#remaining-samples");

      const finishTrial = () => {
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          questionID: questionId,
          total_samples: totalSamples,
          completed_samples: sampleIndex,
          detailed_results: detailedResults,
          total_trial_rt: Math.round(performance.now() - trialStartTime)
        });
      };

      const loadAndPopulateSample = () => {
        currentTrialDraw = draws[sampleIndex];

        // Restore hidden balls
        display_element.querySelectorAll(".drawn-hidden").forEach(el => {
          el.classList.remove("drawn-hidden");
        });

        // Reset target slots
        urnKeys.forEach(k => {
          const slotEl = display_element.querySelector(`#slot-${k}`);
          if (slotEl) slotEl.innerHTML = "";
        });

        // Populate balls into slots and hide corresponding ball in urn
        urnKeys.forEach(urnKey => {
          const drawnColor = currentTrialDraw[urnKey];
          const slotEl = display_element.querySelector(`#slot-${urnKey}`);

          if (slotEl) {
            const cleanColor = utils.normalizeColor(drawnColor);
            const displayColor = cleanColor === "grey" ? "#c0c0c0" : cleanColor;
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
          }

          let urnContainer = display_element.querySelector(`#urn-${urnKey}`) || 
                             display_element.querySelector(`[data-urn="${urnKey}"]`) ||
                             display_element.querySelectorAll(".urn")[urnKeys.indexOf(urnKey)];

          if (urnContainer) {
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

        // Generate full description (with showResult = false so no final outcome sentence is appended by utils)
        const rawDesc = utils.renderSampleDescription(
          currentTrialDraw, 
          urnKeys, 
          agentName, 
          false, 
          trial.urn_map, 
          false
        );

        // Render into temporary element to isolate paragraphs
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = rawDesc;
        const paragraphs = tempDiv.querySelectorAll("p");

        if (paragraphs.length >= 2) {
          // Append trailing prediction sentence inside Paragraph 2
          paragraphs[1].innerHTML += ` With this draw ${agentName} <span id="prediction-outcome-slot">___</span>.`;
          feedbackBox.innerHTML = tempDiv.innerHTML;
        } else if (paragraphs.length === 1) {
          // Fallback if Utils only returns 1 paragraph
          paragraphs[0].innerHTML += ` With this draw ${agentName} <span id="prediction-outcome-slot">___</span>.`;
          feedbackBox.innerHTML = tempDiv.innerHTML;
        } else {
          // Direct HTML fallback
          feedbackBox.innerHTML = `<p>${rawDesc}</p><p>With this draw ${agentName} <span id="prediction-outcome-slot">___</span>.</p>`;
        }

        // Reset prediction UI state
        predictionControls.classList.remove("is-hidden");
        promptWrapper.classList.remove("is-hidden");
        predictWinBtn.classList.remove("is-selected");
        predictLoseBtn.classList.remove("is-selected");

        evaluationEl.classList.add("is-hidden");
        evaluationEl.innerHTML = "";

        submitPredictionBtn.classList.add("is-hidden");
        nextSampleBtn.classList.add("is-hidden");
        userPrediction = null;
        sampleStartTime = performance.now();
      };

      const handleSelection = (predictedWin) => {
        userPrediction = predictedWin;

        // Hide prompt text upon selection
        promptWrapper.classList.add("is-hidden");

        if (predictedWin) {
          predictWinBtn.classList.add("is-selected");
          predictLoseBtn.classList.remove("is-selected");
        } else {
          predictLoseBtn.classList.add("is-selected");
          predictWinBtn.classList.remove("is-selected");
        }

        // Target the span strictly inside the second paragraph
        const outcomeSlot = display_element.querySelector("#prediction-outcome-slot");
        if (outcomeSlot) {
          outcomeSlot.innerHTML = predictedWin 
            ? `<span style="color: #28a745; font-weight: bold;">WON</span>`
            : `<span style="color: #dc3545; font-weight: bold;">LOST</span>`;
        }

        submitPredictionBtn.classList.remove("is-hidden");
      };

      const handleSubmitPrediction = () => {
        if (userPrediction === null) return;

        const clickTime = performance.now();
        const rt = Math.round(clickTime - sampleStartTime);

        const actualWin = !!ruleFn(currentTrialDraw);
        const isCorrect = userPrediction === actualWin;

        // Hide prediction controls completely upon submission
        predictionControls.classList.add("is-hidden");
        submitPredictionBtn.classList.add("is-hidden");

        // Complete feedback box with true result (preserves original 2-paragraph layout)
        feedbackBox.innerHTML = utils.renderSampleDescription(
          currentTrialDraw,
          urnKeys,
          agentName,
          actualWin,
          trial.urn_map,
          true
        );

        // Display checkmark verification text
        evaluationEl.innerHTML = isCorrect
          ? `<span style="color: #28a745; font-weight: bold;">✔ Correct! ${agentName} ${actualWin ? "won" : "lost"}.</span>`
          : `<span style="color: #dc3545; font-weight: bold;">✘ Incorrect. ${agentName} ${actualWin ? "won" : "lost"}.</span>`;
        
        evaluationEl.classList.remove("is-hidden");

        const sampleResult = {
          question_id: questionId,
          sample_number: sampleIndex + 1,
          draw_A: currentTrialDraw.A,
          draw_B: currentTrialDraw.B,
          draw_C: currentTrialDraw.C,
          draw_D: currentTrialDraw.D,
          predicted_result: userPrediction ? "win" : "lose",
          actual_result: actualWin ? "win" : "lose",
          is_correct: isCorrect,
          sample_rt: rt
        };

        detailedResults.push(sampleResult);

        this.jsPsych.data.write({
          event_type: "prediction_submission",
          ...sampleResult
        });

        sampleIndex += 1;

        if (typeof this.jsPsych.increaseTrialIndex === "function") {
          this.jsPsych.increaseTrialIndex();
        }

        remainingSamples.textContent = `${trial.remaining_label} ${Math.max(totalSamples - sampleIndex, 0)}`;

        if (sampleIndex >= totalSamples) {
          nextSampleBtn.classList.add("is-hidden");
          continueBtn.classList.remove("is-hidden");
          continueBtn.onclick = finishTrial;
        } else {
          nextSampleBtn.classList.remove("is-hidden");
          nextSampleBtn.onclick = loadAndPopulateSample;
        }
      };

      predictWinBtn.onclick = () => handleSelection(true);
      predictLoseBtn.onclick = () => handleSelection(false);
      submitPredictionBtn.onclick = handleSubmitPrediction;

      loadAndPopulateSample();
    }
  }

  PredictionTaskPlugin.info = info;

  return PredictionTaskPlugin;
})(jsPsychModule);