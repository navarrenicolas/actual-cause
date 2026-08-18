/**
 * jsPsych plugin for Explanation Selection in a 4x4 Grid Format
 * Reveals 4 columns sequentially with 4 scenarios per column.
 * - Writes a data row immediately on every ball selection click.
 * - Writes a set-level summary row on submitting each column set.
 * - Saves all 16 selections in 'detailed_results' upon final submission.
 */
var jsPsychExplanationGrid = (function (jspsych) {
  "use strict";

  const info = {
    name: "explanation-grid",
    parameters: {
      /** Array of 16 scenario objects */
      scenarios: {
        type: jspsych.ParameterType.ARRAY,
        default: []
      },
      /** Pre-rendered HTML for the Urns display at the top */
      urn_html: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      /** Rule text HTML displayed at the top */
      rule_text: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      /** Prompt displayed above the column submit button */
      prompt: {
        type: jspsych.ParameterType.STRING,
        default: "<b>'Why did you win or lose?'</b>"
      },
      /** Color-to-HEX/CSS mapping */
      color_map: {
        type: jspsych.ParameterType.OBJECT,
        default: {
          orange: 'orange',
          blue: 'blue',
          purple: 'purple',
          hotpink: 'hotpink',
          pink: 'hotpink',
          lightgrey: '#888888',
          grey: '#888888'
        }
      }
    }
  };

  class ExplanationGridPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    // --- Explanation Text Helpers ---
    normalizeColor(color) {
      if (!color) return "";
      if (color === "hotpink") return "pink";
      if (color === "lightgrey") return "grey";
      return color.replace("light", "");
    }

    getArticle(word) {
      return /^[aeiou]/i.test(word) ? "an" : "a";
    }

    describeBall(color, urnKey) {
      const readableColor = this.normalizeColor(color);
      const displayColor = (color === "lightgrey" || color === "grey") ? "#666666" : color;
      return `${this.getArticle(readableColor)}&nbsp;<span style="color: ${displayColor}; font-weight: bold;">${readableColor}</span>&nbsp;ball from box ${urnKey}`;
    }

    joinDescriptions(descriptions) {
      if (descriptions.length === 0) return "";
      if (descriptions.length === 1) return descriptions[0];
      if (descriptions.length === 2) return `${descriptions[0]} and ${descriptions[1]}`;
      return `${descriptions.slice(0, -1).join(", ")}, and ${descriptions[descriptions.length - 1]}`;
    }

    renderSentence(isWin, descriptions) {
      if (descriptions.length === 0) {
        return `<i>Select a ball to explain outcome</i>`;
      }
      const outcomeText = isWin ? "won" : "lost";
      const outcomeClass = isWin ? "win" : "lose";
      return `You&nbsp;<span class="${outcomeClass}">${outcomeText}</span>&nbsp;because you got ${this.joinDescriptions(descriptions)}.`;
    }

    formatProbability(prob) {
      if (prob === undefined || prob === null) return "Probability: N/A";
      const probStr = String(prob).trim();
      if (probStr.endsWith('%')) {
        return `Probability: ${probStr}`;
      }
      return `Probability: ${probStr}%`;
    }

    // Auto-fit helper: dynamically shrinks font size so text sits on a single line
    fitText(el) {
      if (!el) return;
      let fontSize = 12; // Initial starting font size in px
      const minFontSize = 5;
      el.style.fontSize = fontSize + "px";
      
      // Reduce font size until content fits within box width without wrapping
      while (el.scrollWidth > el.clientWidth && fontSize > minFontSize) {
        fontSize -= 0.3;
        el.style.fontSize = fontSize + "px";
      }
    }

    fitAllSentences(display_element) {
      const sentences = display_element.querySelectorAll(".grid-card-sentence");
      sentences.forEach(s => this.fitText(s));
    }

    trial(display_element, trial) {
      let currentColumnIndex = 0; // 0 to 3
      const totalColumns = 4;
      const selections = {};

      // Time tracking
      const trialStartTime = performance.now();
      let setStartTime = performance.now();

      let html = `
        <div class="draw-plugin-container explanation-grid-container">
          <!-- TOP SEGMENT: Urn HTML and Rule Text -->
          <div class="draw-top-segment grid-top-segment">
            ${trial.urn_html}
            <div id="rule-text" class="grid-rule-text">${trial.rule_text}</div>
          </div>

          <!-- MIDDLE SEGMENT: 4x4 Grid Matrix -->
          <div class="grid-matrix-wrapper">
            <div class="grid-matrix" id="grid-matrix">
              ${this.render4x4Grid(trial.scenarios, trial.color_map)}
            </div>
          </div>

          <!-- BOTTOM ACTION SEGMENT -->
          <div class="draw-action-segment grid-action-segment">
            <div class="grid-prompt">${trial.prompt}</div>
            <div class="grid-status-tracker">
              Set <span id="col-counter">1</span> of ${totalColumns}
            </div>
            <button id="grid-submit-btn" class="jspsych-btn grid-submit-btn" disabled>
              Submit Selections
            </button>
          </div>
        </div>
      `;

      display_element.innerHTML = html;

      // Initialize Column Visibility & Event Listeners
      this.updateGridState(display_element, currentColumnIndex);
      this.attachBallClickListeners(display_element, currentColumnIndex, selections, trial, setStartTime, trialStartTime);
      
      // Auto-fit sentences on render and window resize
      setTimeout(() => this.fitAllSentences(display_element), 20);
      const resizeHandler = () => this.fitAllSentences(display_element);
      window.addEventListener("resize", resizeHandler);

      // Submit Button Event Handler
      const submitBtn = display_element.querySelector("#grid-submit-btn");
      submitBtn.addEventListener("click", () => {
        const setEndTime = performance.now();
        const setRt = Math.round(setEndTime - setStartTime);

        // 1. Extract selections for the set being submitted
        const currentSetSelections = [];
        for (let r = 0; r < 4; r++) {
          const idx = currentColumnIndex * 4 + r;
          if (selections[idx]) {
            currentSetSelections.push(selections[idx]);
          }
        }

        // 2. Save a data row for this set submission
        this.jsPsych.data.write({
          event_type: "set_submission",
          set_number: currentColumnIndex + 1,
          set_selections: currentSetSelections,
          set_rt: setRt
        });

        // 3. Advance to next set or finish trial
        if (currentColumnIndex < totalColumns - 1) {
          currentColumnIndex++;
          setStartTime = performance.now(); // Reset set timer

          display_element.querySelector("#col-counter").textContent = currentColumnIndex + 1;
          submitBtn.textContent = currentColumnIndex === totalColumns - 1 
            ? "Submit & Finish" 
            : `Submit Selections`;
          submitBtn.disabled = true;

          this.updateGridState(display_element, currentColumnIndex);
          this.attachBallClickListeners(display_element, currentColumnIndex, selections, trial, setStartTime, trialStartTime);
          setTimeout(() => this.fitAllSentences(display_element), 20);
        } else {
          window.removeEventListener("resize", resizeHandler);
          this.finishTrial(trial, selections, trialStartTime);
        }
      });
    }

    render4x4Grid(scenarios, color_map) {
      let matrixHtml = '';
      for (let c = 0; c < 4; c++) {
        matrixHtml += `<div class="grid-column" data-col="${c}">`;
        matrixHtml += `<div class="grid-col-header">Set ${c + 1}</div>`;

        for (let r = 0; r < 4; r++) {
          const index = c * 4 + r;
          const sc = scenarios[index];
          const isWin = String(sc.outcome).toLowerCase() === 'win';

          matrixHtml += `
            <div class="grid-card" data-index="${index}" data-col="${c}" data-row="${r}">
              <div class="grid-card-header">
                <span class="outcome-badge ${isWin ? 'win-badge' : 'lose-badge'}">
                  ${isWin ? 'WIN' : 'LOSS'}
                </span>
                <span class="prob-tag" title="Probability of getting this draw">
                  ${this.formatProbability(sc.prob)}
                </span>
              </div>

              <div class="grid-card-balls">
                ${['A', 'B', 'C', 'D'].map(urnKey => {
                  const rawColor = sc.urns[urnKey];
                  const bg = color_map[rawColor] || rawColor;
                  return `
                    <div class="grid-ball-slot" data-urn="${urnKey}">
                      <span class="urn-ball-label">${urnKey}</span>
                      <div class="ball grid-selectable-ball" 
                           data-urn="${urnKey}" 
                           data-color="${rawColor}" 
                           style="background-color: ${bg};" 
                           title="Urn ${urnKey}: ${rawColor}">
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="grid-card-sentence" id="sentence-${index}">
                <i>Select a ball to explain outcome</i>
              </div>
            </div>
          `;
        }
        matrixHtml += `</div>`;
      }
      return matrixHtml;
    }

    updateGridState(display_element, activeColIndex) {
      const columns = display_element.querySelectorAll(".grid-column");
      columns.forEach((colEl, cIdx) => {
        colEl.classList.remove("is-active", "is-completed", "is-hidden");
        
        if (cIdx < activeColIndex) {
          colEl.classList.add("is-completed");
        } else if (cIdx === activeColIndex) {
          colEl.classList.add("is-active");
        } else {
          colEl.classList.add("is-hidden");
        }
      });
    }

    attachBallClickListeners(display_element, activeColIndex, selections, trial, setStartTime, trialStartTime) {
      const activeCol = display_element.querySelector(`.grid-column[data-col="${activeColIndex}"]`);
      if (!activeCol) return;

      const cards = activeCol.querySelectorAll(".grid-card");
      cards.forEach(card => {
        const index = parseInt(card.getAttribute("data-index"), 10);
        const balls = card.querySelectorAll(".grid-selectable-ball");

        balls.forEach(ball => {
          ball.addEventListener("click", () => {
            const clickTime = performance.now();
            const urn = ball.getAttribute("data-urn");
            const color = ball.getAttribute("data-color");
            const sc = trial.scenarios[index];
            const isWin = String(sc.outcome).toLowerCase() === 'win';
            const rt = Math.round(clickTime - setStartTime);
            const total_rt = Math.round(clickTime - trialStartTime);

            // Clear previous visual selections for this card
            balls.forEach(b => b.classList.remove("is-selected", "is-selected-win", "is-selected-loss"));
            
            // Highlight selected ball
            ball.classList.add("is-selected");
            if (isWin) {
              ball.classList.add("is-selected-win");
            } else {
              ball.classList.add("is-selected-loss");
            }

            // Track selection object
            const selectionRecord = {
              question_id: sc.id,
              order_index: index,
              set_number: activeColIndex + 1,
              selected_urn: urn,
              selected_color: color,
              draw_A: sc.urns.A,
              draw_B: sc.urns.B,
              draw_C: sc.urns.C,
              draw_D: sc.urns.D,
              result: isWin ? "win" : "lose",
              probability: sc.prob,
              rt: rt,
              total_rt: total_rt
            };

            selections[index] = selectionRecord;

            // Write selection click directly to jsPsych.data
            this.jsPsych.data.write({
              event_type: "ball_selection",
              ...selectionRecord
            });

            // Update UI sentence
            const desc = this.describeBall(color, urn);
            const sentenceEl = card.querySelector(`#sentence-${index}`);
            if (sentenceEl) {
              sentenceEl.innerHTML = this.renderSentence(isWin, [desc]);
              this.fitText(sentenceEl);
            }

            // Enable column submit button if all 4 cards in current column have selections
            this.checkColumnCompletion(display_element, activeColIndex, selections);
          });
        });
      });
    }

    checkColumnCompletion(display_element, activeColIndex, selections) {
      let completedCount = 0;
      for (let r = 0; r < 4; r++) {
        const idx = activeColIndex * 4 + r;
        if (selections[idx]) completedCount++;
      }

      const submitBtn = display_element.querySelector("#grid-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = completedCount < 4;
      }
    }

    finishTrial(trial, selections, trialStartTime) {
      // Sort all 16 selections in order (0 through 15)
      const detailedResults = Object.keys(selections)
        .map(idx => parseInt(idx, 10))
        .sort((a, b) => a - b)
        .map(idx => selections[idx]);

      const trialData = {
        event_type: "trial_complete",
        detailed_results: detailedResults, // All 16 selections array
        total_judgments: detailedResults.length,
        total_trial_rt: Math.round(performance.now() - trialStartTime)
      };

      this.jsPsych.finishTrial(trialData);
    }
  }

  ExplanationGridPlugin.info = info;
  return ExplanationGridPlugin;

})(jsPsychModule);