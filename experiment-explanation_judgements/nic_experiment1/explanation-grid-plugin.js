/**
 * jsPsych plugin for Explanation Selection in a 4x4 Grid Format
 * Reveals 4 columns sequentially with 4 scenarios per column.
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
        default: "Select the ball in each active trial that best answers: <i>'Why did you win or lose?'</i>"
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
      return `${this.getArticle(readableColor)}&nbsp;<span style="color: ${displayColor}; font-weight: bold;">${readableColor}</span>&nbsp;ball from urn ${urnKey}`;
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
              Column <span id="col-counter">1</span> of ${totalColumns}
            </div>
            <button id="grid-submit-btn" class="jspsych-btn grid-submit-btn" disabled>
              Submit Column 1 Selections
            </button>
          </div>
        </div>
      `;

      display_element.innerHTML = html;

      // Initialize Column Visibility
      this.updateGridState(display_element, currentColumnIndex);
      this.attachBallClickListeners(display_element, currentColumnIndex, selections, trial);
      
      // Auto-fit sentences on render and window resize
      setTimeout(() => this.fitAllSentences(display_element), 20);
      window.addEventListener("resize", () => this.fitAllSentences(display_element));

      // Submit Button Event Handler
      const submitBtn = display_element.querySelector("#grid-submit-btn");
      submitBtn.addEventListener("click", () => {
        if (currentColumnIndex < totalColumns - 1) {
          currentColumnIndex++;
          display_element.querySelector("#col-counter").textContent = currentColumnIndex + 1;
          submitBtn.textContent = currentColumnIndex === totalColumns - 1 
            ? "Submit Final Column & Finish" 
            : `Submit Column ${currentColumnIndex + 1} Selections`;
          submitBtn.disabled = true;

          this.updateGridState(display_element, currentColumnIndex);
          this.attachBallClickListeners(display_element, currentColumnIndex, selections, trial);
          setTimeout(() => this.fitAllSentences(display_element), 20);
        } else {
          this.finishTrial(trial, selections);
        }
      });
    }

    render4x4Grid(scenarios, color_map) {
      let matrixHtml = '';
      for (let c = 0; c < 4; c++) {
        matrixHtml += `<div class="grid-column" data-col="${c}">`;
        matrixHtml += `<div class="grid-col-header">Column ${c + 1}</div>`;

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

    attachBallClickListeners(display_element, activeColIndex, selections, trial) {
      const activeCol = display_element.querySelector(`.grid-column[data-col="${activeColIndex}"]`);
      if (!activeCol) return;

      const cards = activeCol.querySelectorAll(".grid-card");
      cards.forEach(card => {
        const index = card.getAttribute("data-index");
        const balls = card.querySelectorAll(".grid-selectable-ball");

        balls.forEach(ball => {
          ball.addEventListener("click", () => {
            const urn = ball.getAttribute("data-urn");
            const color = ball.getAttribute("data-color");
            const sc = trial.scenarios[index];
            const isWin = String(sc.outcome).toLowerCase() === 'win';

            // Clear previous selection states
            balls.forEach(b => b.classList.remove("is-selected", "is-selected-win", "is-selected-loss"));
            
            // Add outcome-specific selection ring (Green for Win, Red for Loss)
            ball.classList.add("is-selected");
            if (isWin) {
              ball.classList.add("is-selected-win");
            } else {
              ball.classList.add("is-selected-loss");
            }

            selections[index] = {
              scenario_id: sc.id,
              selected_urn: urn,
              selected_color: color,
              draw: sc.urns,
              outcome: sc.outcome,
              probability: sc.prob
            };

            const desc = this.describeBall(color, urn);
            const sentenceEl = card.querySelector(`#sentence-${index}`);
            if (sentenceEl) {
              sentenceEl.innerHTML = this.renderSentence(isWin, [desc]);
              // Auto-adjust font size to keep on a single line
              this.fitText(sentenceEl);
            }

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

    finishTrial(trial, selections) {
      const formattedSelections = Object.keys(selections).map(idx => selections[idx]);

      const trialData = {
        grid_selections: formattedSelections,
        total_judgments: formattedSelections.length
      };

      this.jsPsych.finishTrial(trialData);
    }
  }

  ExplanationGridPlugin.info = info;
  return ExplanationGridPlugin;

})(jsPsychModule);