/**
 * jsPsych plugin for Pre-Sampled Urn Outcome Explanation
 * Matches the feedback text style and formatting of jsInteractiveDrawSingle.
 */
var jsPsychInteractiveDrawExplanation = (function (jspsych) {
  "use strict";

  const info = {
    name: "interactive-draw-explanation",
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
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "interactive_explanation"
      },
      max_samples: {
        type: jspsych.ParameterType.INT,
        default: null
      },
      next_trial_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Submit Selection & Next Sample"
      },
      finish_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue to Next Section"
      },
      prompt: {
        type: jspsych.ParameterType.STRING,
        default: "<b>Why did they win or lose? Select the ball that explains the outcome:</b>"
      },
      rule_fn: {
        type: jspsych.ParameterType.FUNCTION,
        default: null
      }
    }
  };

  class InteractiveDrawExplanationPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    normalizeColor(color) {
      if (!color) return "";
      return color.replace("light", "");
    }

    getArticle(word) {
      return /^[aeiou]/i.test(word) ? "an" : "a";
    }

    // Dynamic selection explanation text placed directly below the selectable slots
    renderExplanationSentence(isWin, color, urnKey, agentName) {
      if (!urnKey) {
        return `<i>Click one of the drawn balls above to select it as the explanation</i>`;
      }
      const readableColor = this.normalizeColor(color);
      const article = this.getArticle(readableColor);
      const isGrey = color === "lightgrey" || color === "grey" || color === "#d3d3d3";
      const displayColor = isGrey ? "#888888" : color;
      const outcomeText = isWin ? "won" : "lost";
      const outcomeClass = isWin ? "win" : "lose";

      return `${agentName} <span class="${outcomeClass}">${outcomeText}</span> because they got ${article} <span style="color: ${displayColor}; font-weight: bold;">${readableColor}</span> ball from box ${urnKey}.`;
    }

    // Sample summary text structured exactly like jsInteractiveDrawSingle
    renderSampleDescription(drawObj, urnKeys, agentName, isWin) {
      let text = `<p>In this trial, <b>${agentName}</b> drew:</p><ul class="draw-feedback-list">`;
      
      text += urnKeys.map(k => {
        const rawColor = drawObj[k];
        const cleanColor = this.normalizeColor(rawColor);
        const article = this.getArticle(cleanColor);
        return `<li>${article} <span style="color: ${rawColor}; font-weight: bold;">${cleanColor}</span> ball from box ${k}</li>`;
      }).join("");

      text += `</ul>`;

      text += (isWin
        ? `<p>With this draw ${agentName} <span class="win">WON!</span></p>`
        : `<p>With this draw ${agentName} <span class="lose">LOST!</span></p>`);

      return text;
    }

    trial(display_element, trial) {
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const draws = trial.draws || [];
      const totalSamples = trial.max_samples || draws.length;
      const questionId = trial.question_id || "interactive_explanation";
      const showRule = trial.show_rule !== false;
      const agentName = trial.agent_name || "John";

      let sampleIndex = 0;
      let currentTrialDraw = {};
      let currentSelection = null;
      let sampleStartTime = performance.now();
      const trialStartTime = performance.now();
      const allSampleSelections = [];

      display_element.innerHTML = `
        <div id="draw-plugin-container" class="draw-plugin-container interactive-explanation-container">
          
          <!-- TOP SEGMENT: Urns & Rules -->
          <div id="top-segment" class="draw-top-segment">
            ${showRule && trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}
            <div id="urns-wrapper">${trial.urn_html || ""}</div>
          </div>

          <!-- OUTCOME DISPLAY & EXPLANATION PANEL -->
          <div id="outcome-segment" class="draw-outcome-segment">
            <div class="draw-panel-wrapper">
            <!-- Dynamic Selection Explanation Output -->
            <div id="explanation-sentence" class="explanation-sentence-box" style="margin-top: 8px;">
            <i>Click one of the drawn balls above to select it as the explanation</i>
            </div>
            
            <!-- Sample Summary Text (Matches jsInteractiveDrawSingle) -->
              <div id="feedback-box" class="draw-feedback-text"></div>
              <div class="explanation-prompt-text" style="margin-top: 12px;">${trial.prompt}</div>
              
            </div>
          </div>

          <!-- ACTION CONTROL SEGMENT -->
          <div id="action-segment" class="draw-action-segment">
            <button id="next-sample-btn" class="jspsych-btn" disabled>${trial.next_trial_button_label}</button>
            <button id="continue-btn" class="jspsych-btn is-hidden">${trial.finish_button_label}</button>
          </div>
        </div>
      `;

      const sentenceEl = display_element.querySelector("#explanation-sentence");
      const feedbackBox = display_element.querySelector("#feedback-box");
      const nextSampleBtn = display_element.querySelector("#next-sample-btn");
      const continueBtn = display_element.querySelector("#continue-btn");

      const finishTrial = () => {
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          questionID: questionId,
          total_samples: totalSamples,
          completed_samples: sampleIndex,
          detailed_results: allSampleSelections,
          total_trial_rt: Math.round(performance.now() - trialStartTime)
        });
      };

      const loadAndPopulateSample = () => {
        currentTrialDraw = draws[sampleIndex];
        const isWin = trial.rule_fn ? trial.rule_fn(currentTrialDraw) : false;

        // Reset visual selection states on target slots
        urnKeys.forEach(k => {
          const slotEl = display_element.querySelector(`#slot-${k}`);
          if (slotEl) {
            slotEl.innerHTML = "";
            slotEl.classList.remove("is-selectable", "is-selected", "is-selected-win", "is-selected-loss");
          }
        });

        // Inject sample outcome text (Matches jsInteractiveDrawSingle)
        feedbackBox.innerHTML = this.renderSampleDescription(currentTrialDraw, urnKeys, agentName, isWin);
        sentenceEl.innerHTML = `<i>Click one of the drawn balls above to select it as the explanation</i>`;
        
        nextSampleBtn.disabled = true;
        currentSelection = null;
        sampleStartTime = performance.now();

        // Populate drawn balls into urn slots automatically
        urnKeys.forEach((urnKey) => {
          const drawnColor = currentTrialDraw[urnKey];
          const slotEl = display_element.querySelector(`#slot-${urnKey}`);

          if (slotEl) {
            const isGrey = (drawnColor === "lightgrey" || drawnColor === "grey" || drawnColor === "#d3d3d3");
            const displayColor = isGrey ? "#c0c0c0" : drawnColor;
            
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
            slotEl.classList.add("is-selectable");
            slotEl.onclick = () => handleExplanationSelection(urnKey, drawnColor, isWin);
          }
        });
      };

      const handleExplanationSelection = (urnKey, color, isWin) => {
        const clickTime = performance.now();
        const rt = Math.round(clickTime - sampleStartTime);

        // Clear target slot visual selection rings
        urnKeys.forEach(k => {
          const s = display_element.querySelector(`#slot-${k}`);
          if (s) s.classList.remove("is-selected", "is-selected-win", "is-selected-loss");
        });

        // Highlight chosen slot
        const activeSlot = display_element.querySelector(`#slot-${urnKey}`);
        if (activeSlot) {
          activeSlot.classList.add("is-selected");
          activeSlot.classList.add(isWin ? "is-selected-win" : "is-selected-loss");
        }

        currentSelection = {
          question_id: questionId,
          sample_number: sampleIndex + 1,
          agent_name: agentName,
          selected_urn: urnKey,
          selected_color: color,
          draw_A: currentTrialDraw.A,
          draw_B: currentTrialDraw.B,
          draw_C: currentTrialDraw.C,
          draw_D: currentTrialDraw.D,
          result: isWin ? "win" : "lose",
          sample_rt: rt
        };

        this.jsPsych.data.write({
          event_type: "ball_selection",
          ...currentSelection
        });

        sentenceEl.innerHTML = this.renderExplanationSentence(isWin, color, urnKey, agentName);
        nextSampleBtn.disabled = false;
      };

      const submitSampleSelection = () => {
        if (!currentSelection) return;

        allSampleSelections.push(currentSelection);
        sampleIndex += 1;

        if (typeof this.jsPsych.increaseTrialIndex === "function") {
          this.jsPsych.increaseTrialIndex();
        }

        if (sampleIndex >= totalSamples) {
          nextSampleBtn.classList.add("is-hidden");
          continueBtn.classList.remove("is-hidden");
          continueBtn.onclick = finishTrial;
        } else {
          loadAndPopulateSample();
        }
      };

      nextSampleBtn.onclick = submitSampleSelection;
      loadAndPopulateSample();
    }
  }

  InteractiveDrawExplanationPlugin.info = info;

  return InteractiveDrawExplanationPlugin;
})(jsPsychModule);