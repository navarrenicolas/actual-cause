/**
 * jsPsych plugin for Interactive Single Urn Draw Trial
 * Uses shared UrnUtils to calculate probability and render draw summary descriptions.
 * - Wraps urn display with grid-style card wrapper and card footer.
 * - Dynamically updates scenario probability matching grid trial styling.
 */
var jsInteractiveDrawSingle = (function (jspsych) {
  "use strict";

  const info = {
    name: "interactive-draw-single",
    parameters: {
      rule_text: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      show_rule: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      show_result: {
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
        default: "you"
      },
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "familiarisation"
      },
      max_samples: {
        type: jspsych.ParameterType.INT,
        default: 10
      },
      remaining_label: {
        type: jspsych.ParameterType.STRING,
        default: "Remaining trials:"
      },
      next_trial_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Next Trial"
      },
      finish_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue to Next Section"
      },
      current_title: {
        type: jspsych.ParameterType.STRING,
        default: ""
      },
      rule_fn: {
        type: jspsych.ParameterType.FUNCTION,
        default: null
      }
    }
  };

  class InteractiveDrawSinglePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const draws = trial.draws || [];
      const totalSamples = trial.max_samples || draws.length;
      const questionId = trial.question_id || "familiarisation";
      const showRule = trial.show_rule !== false;
      const showResult = trial.show_result !== false;
      const agentName = trial.agent_name || "you";

      let sampleIndex = 0;
      let currentTrialDraw = {};
      let lastDrawStartTime = performance.now();

      display_element.innerHTML = `
        <div id="draw-plugin-container" class="draw-plugin-container interactive-draw-container">
          
          <div id="top-segment" class="draw-top-segment">
            ${showRule && trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}

            <p class="walkthrough-prompt">Draw from the boxes below:</p>

            <!-- Urns Container Grid-Style Wrapper -->
            <div class="urns-card-wrapper" id="urns-card-single">
              <div class="urns-display-container" id="urns-wrapper">
                ${trial.urn_html || ""}
              </div>
              <div class="urns-card-footer">
                <span class="card-probability-text" id="scenario-prob-text"></span>
              </div>
            </div>
          </div>

          <div id="outcome-segment" class="draw-outcome-segment is-hidden">
            <div class="draw-panel-wrapper">
              ${trial.current_title ? `<div class="draw-panel-title">${trial.current_title}</div>` : ""}
              <div id="feedback-box" class="draw-feedback-text"></div>
              <div id="result-box" class="draw-feedback-text"></div>
            </div>
          </div>

          <div class="counter-display">
              <p id="remaining-samples">${trial.remaining_label} ${totalSamples - sampleIndex}</p>
          </div>
          <div id="action-segment" class="draw-action-segment">
            <button id="next-sample-btn" class="jspsych-btn is-hidden">${trial.next_trial_button_label}</button>
            <button id="continue-btn" class="jspsych-btn is-hidden">${trial.finish_button_label}</button>
          </div>
        </div>
      `;

      const outcomeSegment = display_element.querySelector("#outcome-segment");
      const feedbackBox = display_element.querySelector("#feedback-box");
      const resultBox = display_element.querySelector("#result-box");
      const nextSampleBtn = display_element.querySelector("#next-sample-btn");
      const continueBtn = display_element.querySelector("#continue-btn");
      const remainingSamples = display_element.querySelector("#remaining-samples");
      const probTextEl = display_element.querySelector("#scenario-prob-text");

      const updateScenarioProbability = (drawData) => {
        if (!probTextEl) return;
        
        const targetDraw = draws[sampleIndex] || drawData;
        let probText = "";

        if (targetDraw && targetDraw.prob !== undefined) {
          probText = String(targetDraw.prob).includes("%") ? targetDraw.prob : `${targetDraw.prob}%`;
        } else if (utils && trial.urn_map && drawData && Object.keys(drawData).length > 0) {
          const calculatedProb = utils.computeDrawProbability(drawData, trial.urn_map);
          probText = calculatedProb ? `${calculatedProb}%` : "";
        }

        probTextEl.textContent = probText ? `Scenario Probability ${probText}` : "";
      };

      // Fixed content column: bind just the urns row's own wrapper to its
      // natural width instead of stretching edge to edge. The rule box and
      // feedback/result panels get a standard fixed width from CSS
      // (.highlight-box / .draw-feedback-text) instead of this — binding
      // them to the urn display's width made them a different size in
      // every context (2 vs 4 urns, interactive vs static controls).
      const widthBinding = utils.bindContentWidthToUrns(display_element, () => [
        display_element.querySelector("#urns-card-single")
      ]);

      const finishTrial = () => {
        widthBinding.cleanup();
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          questionID: questionId,
          completed_samples: sampleIndex,
          total_samples: totalSamples
        });
      };

      const resetUrnsForNextTrial = () => {
        const urnsWrapper = display_element.querySelector("#urns-wrapper");
        urnsWrapper.innerHTML = trial.urn_html || "";
        widthBinding.apply();

        urnKeys.forEach((k) => {
          const slotEl = display_element.querySelector(`#slot-${k}`);
          if (slotEl) slotEl.innerHTML = "";
        });

        display_element.querySelectorAll(".drawn-hidden").forEach((el) => {
          el.classList.remove("drawn-hidden");
        });

        if (probTextEl) probTextEl.textContent = "";

        bindButtonHandlers();

        outcomeSegment.classList.add("is-hidden");
        nextSampleBtn.classList.add("is-hidden");
        currentTrialDraw = {};
      };

      const handleUrnDraw = (urnKey, buttonEl) => {
        if (sampleIndex >= totalSamples) return;
        if (currentTrialDraw[urnKey] !== undefined) return;

        buttonEl.disabled = true;

        const targetDraw = draws[sampleIndex];
        const drawnColor = targetDraw[urnKey];
        currentTrialDraw[urnKey] = drawnColor;

        const urnContainer = display_element.querySelector(`#urn-container-${urnKey}`) || 
                             display_element.querySelector(`#urn-${urnKey}`) ||
                             display_element.querySelector(`[data-urn="${urnKey}"]`);
        const slotEl = display_element.querySelector(`#slot-${urnKey}`);

        if (urnContainer && slotEl) {
          const balls = Array.from(urnContainer.querySelectorAll(".ball"));
          
          const matchingBalls = balls.filter((b) => {
            if (b.classList.contains("drawn-hidden") || b.closest(".urn-slot")) return false;
            return utils.matchesColor(b, drawnColor);
          });

          let targetBall = matchingBalls.length > 0 
            ? matchingBalls[Math.floor(Math.random() * matchingBalls.length)]
            : balls.find((b) => !b.classList.contains("drawn-hidden") && !b.closest(".urn-slot"));

          if (targetBall) {
            const ballRect = targetBall.getBoundingClientRect();
            const slotRect = slotEl.getBoundingClientRect();

            const clone = targetBall.cloneNode(true);
            clone.style.position = "fixed";
            clone.style.left = `${ballRect.left}px`;
            clone.style.top = `${ballRect.top}px`;
            clone.style.margin = "0";
            clone.style.zIndex = "1000";
            clone.style.transition = "transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)";
            clone.style.pointerEvents = "none";
            document.body.appendChild(clone);

            targetBall.classList.add("drawn-hidden");

            requestAnimationFrame(() => {
              const deltaX = slotRect.left - ballRect.left + (slotRect.width - ballRect.width) / 2;
              const deltaY = slotRect.top - ballRect.top + (slotRect.height - ballRect.height) / 2;
              clone.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            });

            setTimeout(() => {
              clone.remove();
              const cleanColor = utils.normalizeColor(drawnColor);
              const displayColor = cleanColor === "grey" ? "#c0c0c0" : cleanColor;

              slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;

              checkTrialCompletion();
            }, 450);
            return;
          }
        }

        checkTrialCompletion();
      };

      const checkTrialCompletion = () => {
        if (Object.keys(currentTrialDraw).length === urnKeys.length) {
          const drawTime = performance.now();
          const rt = Math.round(drawTime - lastDrawStartTime);
          lastDrawStartTime = drawTime;

          const completedDraw = { ...currentTrialDraw };
          const result = trial.rule_fn ? trial.rule_fn(completedDraw) : false;

          updateScenarioProbability(completedDraw);

          sampleIndex += 1;

          if (typeof this.jsPsych.increaseTrialIndex === "function") {
            this.jsPsych.increaseTrialIndex();
          }

          this.jsPsych.data.write({
            questionID: questionId,
            trial_number: sampleIndex,
            draw_A: completedDraw.A,
            draw_B: completedDraw.B,
            draw_C: completedDraw.C,
            draw_D: completedDraw.D,
            result: showResult ? (result ? "win" : "lose") : undefined,
            rt: rt
          });

          // Draw description and result are shown as two separate boxes
          // (feedback, then result below it), matching the instructions
          // walkthrough's presentation, rather than one merged sentence.
          feedbackBox.innerHTML = utils.renderSampleDescription(
            completedDraw,
            urnKeys,
            agentName,
            result,
            null,
            false
          );

          if (showResult) {
            const outcomeMarkup = result
              ? `<span class="win">${agentName === "You" ? "WON!" : "won."}</span>`
              : `<span class="lose">${agentName === "You" ? "LOST!" : "lost."}</span>`;
            resultBox.innerHTML = `<p><b>With this draw ${agentName} ${outcomeMarkup}</b></p>`;
          } else {
            resultBox.innerHTML = "";
          }

          remainingSamples.textContent = `${trial.remaining_label} ${Math.max(totalSamples - sampleIndex, 0)}`;
          outcomeSegment.classList.remove("is-hidden");

          if (sampleIndex >= totalSamples) {
            continueBtn.classList.remove("is-hidden");
            continueBtn.onclick = finishTrial;
          } else {
            nextSampleBtn.classList.remove("is-hidden");
            nextSampleBtn.onclick = resetUrnsForNextTrial;
          }
        }
      };

      const bindButtonHandlers = () => {
        display_element.querySelectorAll(".push-draw-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const urnKey = e.currentTarget.getAttribute("data-urn");
            handleUrnDraw(urnKey, e.currentTarget);
          });
        });
      };

      bindButtonHandlers();
    }
  }

  InteractiveDrawSinglePlugin.info = info;

  return InteractiveDrawSinglePlugin;
})(jsPsychModule);