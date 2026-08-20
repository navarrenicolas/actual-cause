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

  function renderHeader(urnKeys, showResult = true) {
    return `
      <div class="draw-row">
        ${urnKeys.map((urn) => `<div class="draw-cell"><b>${urn}</b></div>`).join("")}
        ${showResult ? `<div class="draw-cell"><b>Result</b></div>` : ""}
      </div>
    `;
  }

  function renderRow(draw, urnKeys, result, showResult = true) {
    return `
      <div class="draw-row" data-row-label="current">
        ${urnKeys.map((urn) => {
          const isGrey = (draw[urn] === 'lightgrey' || draw[urn] === 'grey' || draw[urn] === '#d3d3d3');
          const col = isGrey ? '#c0c0c0' : draw[urn];
          return `<div class="draw-cell"><div class="ball" style="background-color:${col}"></div></div>`;
        }).join("")}
        ${showResult ? `<div class="draw-cell"><b><span class="${result ? 'win' : 'lose'}">${result ? 'WIN' : 'LOSE'}</span></b></div>` : ""}
      </div>
    `;
  }

  class InteractiveDrawSinglePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const draws = trial.draws || [];
      const totalSamples = trial.max_samples || draws.length;
      const questionId = trial.question_id || "familiarisation";
      const showRule = trial.show_rule !== false;
      const showResult = trial.show_result !== false;

      let sampleIndex = 0;
      let currentTrialDraw = {};
      let lastDrawStartTime = performance.now();

      display_element.innerHTML = `
        <div id="draw-plugin-container" class="draw-plugin-container">
          
          <!-- TOP SEGMENT: Urns & Rules -->
          <div id="top-segment" class="draw-top-segment">
            ${showRule && trial.rule_text ? `<div id="rule-text">${trial.rule_text}</div>` : ""}
            <div id="urns-wrapper">${trial.urn_html || ""}</div>
            
            <div class="counter-display">
              <p id="remaining-samples">${trial.remaining_label} ${totalSamples - sampleIndex}</p>
            </div>
          </div>

          <!-- SINGLE OUTCOME DISPLAY PANEL -->
          <div id="outcome-segment" class="draw-outcome-segment is-hidden">
            <div class="draw-panel-wrapper">
              <div class="draw-panel-title">${trial.current_title}</div>
              <div id="current-draw-table" class="draw-table"></div>
              <div id="feedback-box" class="draw-feedback-text"></div>
            </div>
          </div>

          <!-- ACTION CONTROL SEGMENT -->
          <div id="action-segment" class="draw-action-segment">
            <button id="next-sample-btn" class="jspsych-btn is-hidden">${trial.next_trial_button_label}</button>
            <button id="continue-btn" class="jspsych-btn is-hidden">${trial.finish_button_label}</button>
          </div>
        </div>
      `;

      const outcomeSegment = display_element.querySelector("#outcome-segment");
      const currentDrawTable = display_element.querySelector("#current-draw-table");
      const feedbackBox = display_element.querySelector("#feedback-box");
      const nextSampleBtn = display_element.querySelector("#next-sample-btn");
      const continueBtn = display_element.querySelector("#continue-btn");
      const remainingSamples = display_element.querySelector("#remaining-samples");

      const finishTrial = () => {
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          questionID: questionId,
          completed_samples: sampleIndex,
          total_samples: totalSamples
        });
      };

      const resetUrnsForNextTrial = () => {
        const urnsWrapper = display_element.querySelector("#urns-wrapper");
        urnsWrapper.innerHTML = renderUrnsHTML(true);

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

        const urnContainer = display_element.querySelector(`#urn-container-${urnKey}`);
        const slotEl = display_element.querySelector(`#slot-${urnKey}`);

        if (urnContainer && slotEl) {
          const balls = Array.from(urnContainer.querySelectorAll(".ball"));
          
          // Randomly select one matching ball from all currently visible/available options
          const matchingBalls = balls.filter(b => {
            if (b.classList.contains("drawn-hidden")) return false;
            const bCol = b.getAttribute("data-color");
            return bCol === drawnColor || (drawnColor === "lightgrey" && (bCol === "grey" || bCol === "#d3d3d3"));
          });

          let targetBall = null;
          if (matchingBalls.length > 0) {
            targetBall = matchingBalls[Math.floor(Math.random() * matchingBalls.length)];
          } else {
            const remainingBalls = balls.filter(b => !b.classList.contains("drawn-hidden"));
            if (remainingBalls.length > 0) {
              targetBall = remainingBalls[Math.floor(Math.random() * remainingBalls.length)];
            }
          }

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
              const isGrey = (drawnColor === "lightgrey" || drawnColor === "grey" || drawnColor === "#d3d3d3");
              const displayColor = isGrey ? "#c0c0c0" : drawnColor;
              slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};"></div>`;

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

          currentDrawTable.innerHTML = renderHeader(urnKeys, showResult) + renderRow(completedDraw, urnKeys, result, showResult);

          let feedbackText = `<br><p>You drew:</p><ul class="draw-feedback-list">` +
            urnKeys.map(k => `<li>a <span style="color: ${completedDraw[k]}; font-weight: bold;">${completedDraw[k].replace('light', '')}</span> ball from box ${k}</li>`).join("") +
            `</ul>`;

          if (showResult) {
            feedbackText += (result
              ? `<p>With this draw <span class="win">YOU WIN!</span></p>`
              : `<p>With this draw <span class="lose">YOU LOSE!</span></p>`);
          }

          feedbackBox.innerHTML = feedbackText;
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
        display_element.querySelectorAll(".push-draw-btn").forEach(btn => {
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