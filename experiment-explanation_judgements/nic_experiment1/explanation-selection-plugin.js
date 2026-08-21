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
      urn_map: {
        type: jspsych.ParameterType.OBJECT,
        default: null // e.g. { A: { color: "yellow", prob: 0.8 }, B: { color: "blue", prob: 0.5 }, ... }
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
      let clean = color.replace("light", "").replace("hot", "").toLowerCase().trim();
      if (clean === "grey" || clean === "#d3d3d3") return "grey";
      return clean;
    }

    getArticle(word) {
      return /^[aeiou]/i.test(word) ? "an" : "a";
    }

    // Compute joint probability percentage for the current draw combination
    computeDrawProbability(draw, urnMap) {
      if (!urnMap) return null;
      let jointProb = 1.0;
      for (const urnKey in urnMap) {
        const urnColor = this.normalizeColor(urnMap[urnKey].color);
        const urnProb = urnMap[urnKey].prob;
        const drawColor = this.normalizeColor(draw[urnKey]);
        const isColored = drawColor === urnColor;
        jointProb *= isColored ? urnProb : (1 - urnProb);
      }
      return Math.round(jointProb * 100);
    }

    // Dynamic selection explanation text placed directly below the urns
    renderExplanationSentence(isWin, color, urnKey, agentName) {
      const readableColor = this.normalizeColor(color);
      const article = this.getArticle(readableColor);
      const isGrey = readableColor === "grey";
      const displayColor = isGrey ? "#888888" : color;
      const outcomeText = isWin ? "won" : "lost";
      const outcomeClass = isWin ? "win" : "lose";

      return `${agentName} <span class="${outcomeClass}">${outcomeText}</span> because of the <span style="color: ${displayColor}; font-weight: bold;">${readableColor}</span> ball from box ${urnKey}.`;
    }

    // Sample summary formatted as a single sentence string
    renderSampleDescription(drawObj, urnKeys, agentName, isWin, urnMap) {
      const items = urnKeys.map(k => {
        const rawColor = drawObj[k];
        const cleanColor = this.normalizeColor(rawColor);
        const article = this.getArticle(cleanColor);
        const isGrey = cleanColor === "grey";
        const displayColor = isGrey ? "#888888" : rawColor;

        return `${article} <span style="color: ${displayColor}; font-weight: bold;">${cleanColor}</span> ball from box ${k}`;
      });

      // Join items with commas and "and"
      let drawListSentence = "";
      if (items.length === 1) {
        drawListSentence = items[0];
      } else if (items.length === 2) {
        drawListSentence = items.join(" and ");
      } else {
        drawListSentence = items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
      }

      let text = ``;
      
      
      
      text += `<p>In this trial, ${agentName} drew ${drawListSentence}. 
        With this draw ${agentName} ${isWin ? '<span class="win">won</span>' : '<span class="lose">lost</span>'}.
        </p>`;

        // Append probability calculation if urnMap parameter is provided
        const probPct = this.computeDrawProbability(drawObj, urnMap);
        if (probPct !== null) {
            text += `<p style= "text-align: center;"> The probability of drawing these balls from the boxes is <b>${probPct}</b>%. <p>`;
        }
        

      return text;
    }

    // Utility to match drawn color values against element styles/attributes
    matchesColor(element, targetColor) {
      const cleanTarget = this.normalizeColor(targetColor);
      
      const inlineStyle = (element.style.backgroundColor || "").toLowerCase();
      const dataColor = (element.getAttribute("data-color") || "").toLowerCase();
      const className = (element.className || "").toLowerCase();

      if (inlineStyle.includes(cleanTarget) || dataColor.includes(cleanTarget) || className.includes(cleanTarget)) {
        return true;
      }

      if (cleanTarget === "grey") {
        if (inlineStyle.includes("rgb(211, 211, 211)") || inlineStyle.includes("d3d3d3") || inlineStyle.includes("c0c0c0")) {
          return true;
        }
      }

      return false;
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
          
          <!-- TOP SEGMENT: Urns & Dynamic Large Explanation -->
          <div id="top-segment" class="draw-top-segment">
            ${showRule && trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}
            <div id="urns-wrapper">${trial.urn_html || ""}</div>
            
          </div>

          <!-- OUTCOME DISPLAY & EXPLANATION PANEL -->
          <div id="outcome-segment" class="draw-outcome-segment">
            <div class="draw-panel-wrapper">
              
              <!-- Sample Summary Text -->
              <div id="feedback-box" class="draw-feedback-text"></div>
              
              <!-- Dynamic Large Win/Loss Prompt Heading -->
              <div id="prompt-heading" class="explanation-prompt-heading"></div>
              
              <!-- SMALL ITALIC SELECTION PROMPT -->
              <div id="prompt-italic-hint" class="explanation-hint-small">
                Click one of the drawn balls above to select it as the explanation
              </div>
              <!-- LARGE EXPLANATION SENTENCE (Appears directly below Urns upon selection) -->
            <div id="explanation-sentence" class="explanation-sentence" is-hidden"></div>
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
      const promptHeadingEl = display_element.querySelector("#prompt-heading");
      const hintEl = display_element.querySelector("#prompt-italic-hint");
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

        // Restore hidden balls from previous samples
        display_element.querySelectorAll(".drawn-hidden").forEach(el => {
          el.classList.remove("drawn-hidden");
        });

        // Reset visual selection states on target slots
        urnKeys.forEach(k => {
          const slotEl = display_element.querySelector(`#slot-${k}`);
          if (slotEl) {
            slotEl.innerHTML = "";
            slotEl.classList.remove("is-selectable", "is-selected", "is-selected-win", "is-selected-loss");
          }
        });

        // Inject sample outcome sentence & probability
        feedbackBox.innerHTML = this.renderSampleDescription(currentTrialDraw, urnKeys, agentName, isWin, trial.urn_map);
        
        // Dynamically format prompt heading in large text matching explanation font size
        promptHeadingEl.innerHTML = isWin 
          ? `Why did ${agentName} <span class="win">win</span>?`
          : `Why did ${agentName} <span class="lose">lose</span>?`;

        // Reset explanation sentence & show initial bottom hint
        sentenceEl.innerHTML = "";
        sentenceEl.classList.add("is-hidden");
        hintEl.innerHTML = "Click one of the drawn balls above to select it as the explanation";
        hintEl.classList.remove("is-hidden");

        nextSampleBtn.disabled = true;
        currentSelection = null;
        sampleStartTime = performance.now();

        // Populate drawn balls into slots & visually remove matching ball from urn
        urnKeys.forEach((urnKey) => {
          const drawnColor = currentTrialDraw[urnKey];
          const slotEl = display_element.querySelector(`#slot-${urnKey}`);

          if (slotEl) {
            const cleanColor = this.normalizeColor(drawnColor);
            const isGrey = cleanColor === "grey";
            const displayColor = isGrey ? "#c0c0c0" : drawnColor;
            
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
            slotEl.classList.add("is-selectable");
            slotEl.onclick = () => handleExplanationSelection(urnKey, drawnColor, isWin);
          }

          // Search urn container scope for matching balls inside the urn grid
          let urnContainer = display_element.querySelector(`#urn-${urnKey}`) || 
                             display_element.querySelector(`[data-urn="${urnKey}"]`) ||
                             display_element.querySelectorAll(".urn")[urnKeys.indexOf(urnKey)];

          if (urnContainer) {
            const candidateBalls = Array.from(urnContainer.querySelectorAll(".ball")).filter(b => 
              this.matchesColor(b, drawnColor) && 
              !b.classList.contains("drawn-hidden") &&
              !b.closest(".urn-slot")
            );

            if (candidateBalls.length > 0) {
              const randomIndex = Math.floor(Math.random() * candidateBalls.length);
              candidateBalls[randomIndex].classList.add("drawn-hidden");
            }
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

        // Render explanation sentence in large text below urns & hide bottom hint
        sentenceEl.innerHTML = this.renderExplanationSentence(isWin, color, urnKey, agentName);
        sentenceEl.classList.remove("is-hidden");
        hintEl.innerHTML = "";
        hintEl.classList.add("is-hidden");

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