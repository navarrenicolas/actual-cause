/**
 * jsPsych plugin for a small Back/Next paged walkthrough of fixed example
 * draws, used to teach what a rule/explanation looks like before the
 * participant has to predict anything themselves (steps 2 and 4 of the
 * inference task: one draw per page, already labelled with its outcome and
 * — in the explanation condition — which ball caused it).
 * Nothing is clickable; this is a reveal, not a task. Page toggling follows
 * the same show/hide-persistent-blocks pattern as walkthrough-instructions-plugin.js.
 */
var jsExplanationExample = (function (jspsych) {
  "use strict";

  const info = {
    name: "explanation-example",
    parameters: {
      intro_html: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      /** Array of { draw, outcome: 'win'|'lose', cause_urn, cause_color } */
      examples: {
        type: jspsych.ParameterType.ARRAY,
        default: []
      },
      rule_text: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
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
        type: jspsych.ParameterType.STRING,
        array: true,
        default: ["A", "B"]
      },
      agent_name: {
        type: jspsych.ParameterType.STRING,
        default: "You"
      },
      /** Condition flag: false hides the highlighted ball + explanation sentence. */
      show_explanation: {
        type: jspsych.ParameterType.BOOL,
        default: true
      },
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "explanation_example"
      },
      finish_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue"
      }
    }
  };

  class ExplanationExamplePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B"];
      const examples = trial.examples || [];
      const agentName = trial.agent_name || "You";
      const questionId = trial.question_id || "explanation_example";
      const showExplanation = trial.show_explanation !== false;
      const hasIntro = !!trial.intro_html;
      const pageCount = examples.length + (hasIntro ? 1 : 0);

      display_element.innerHTML = `
        <div class="draw-plugin-container wt-container">
          <div id="ee-intro-block" class="is-hidden"></div>

          <div id="ee-example-block" class="is-hidden">
            ${trial.rule_text ? `<div id="ee-rule-slot">${trial.rule_text}</div>` : ""}

            <div class="urns-card-wrapper" id="ee-urns-wrapper">
              <div class="urns-display-container">${trial.urn_html || ""}</div>
              <div class="urns-card-footer">
                <span id="ee-prob-text" class="card-probability-text"></span>
              </div>
            </div>

            <div id="ee-sentence-box" class="draw-feedback-text"></div>
          </div>

          <div class="draw-action-segment wt-nav">
            <button id="ee-back-btn" class="jspsych-btn is-hidden">&lang; Back</button>
            <span id="ee-page-indicator" class="wt-page-indicator"></span>
            <button id="ee-next-btn" class="jspsych-btn is-hidden">Next &rang;</button>
            <button id="ee-finish-btn" class="jspsych-btn is-hidden">${trial.finish_button_label || "Continue"}</button>
          </div>
        </div>
      `;

      const introBlock = display_element.querySelector("#ee-intro-block");
      const exampleBlock = display_element.querySelector("#ee-example-block");
      const ruleSlot = display_element.querySelector("#ee-rule-slot");
      const probText = display_element.querySelector("#ee-prob-text");
      const sentenceBox = display_element.querySelector("#ee-sentence-box");
      const urnsWrapper = display_element.querySelector("#ee-urns-wrapper");
      const backBtn = display_element.querySelector("#ee-back-btn");
      const nextBtn = display_element.querySelector("#ee-next-btn");
      const finishBtn = display_element.querySelector("#ee-finish-btn");
      const pageIndicator = display_element.querySelector("#ee-page-indicator");

      let contentWidth = null;
      const measureWidth = () => {
        const wasHidden = exampleBlock.classList.contains("is-hidden");
        if (wasHidden) {
          exampleBlock.style.visibility = "hidden";
          exampleBlock.style.position = "absolute";
          exampleBlock.classList.remove("is-hidden");
        }
        const width = utils.measureUrnDisplayWidth(display_element);
        if (wasHidden) {
          exampleBlock.classList.add("is-hidden");
          exampleBlock.style.visibility = "";
          exampleBlock.style.position = "";
        }
        if (width) contentWidth = width;
      };
      const applyWidth = () => {
        // Intro text, the rule box, and the sentence box aren't included
        // here — same reasoning as walkthrough-instructions-plugin.js's
        // applyContentWidth: they get a standard fixed width from CSS
        // instead of matching the (2-urn) display's narrower width.
        utils.applyBoundWidth(contentWidth, [urnsWrapper]);
      };

      const renderExample = (ex) => {
        const draw = ex.draw || {};
        const isWin = String(ex.outcome).toLowerCase() === "win";

        const probPct = utils.computeDrawProbability(draw, trial.urn_map);
        probText.textContent = probPct !== null ? `Scenario Probability ${probPct}%` : "";

        urnsWrapper.querySelector(".urns-display-container").innerHTML = trial.urn_html || "";

        urnKeys.forEach((urnKey) => {
          const drawnColor = draw[urnKey];
          const slotEl = display_element.querySelector(`#slot-${urnKey}`);
          if (!slotEl) return;

          const cleanColor = utils.normalizeColor(drawnColor);
          const displayColor = utils.getDisplayColor(cleanColor);
          slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;

          if (showExplanation && ex.cause_urn === urnKey) {
            utils.markHighlightedBall(slotEl, isWin);
          }

          const urnContainer = display_element.querySelector(`#urn-container-${urnKey}`);
          if (urnContainer) {
            const candidateBalls = Array.from(urnContainer.querySelectorAll(".ball")).filter((b) => {
              if (b.closest(".urn-slot") || b.classList.contains("drawn-hidden")) return false;
              return utils.matchesColor(b, drawnColor);
            });
            if (candidateBalls.length > 0) {
              candidateBalls[Math.floor(Math.random() * candidateBalls.length)].classList.add("drawn-hidden");
            }
          }
        });

        if (showExplanation && ex.cause_urn) {
          sentenceBox.innerHTML = `<p>${utils.renderExplanationSentence(isWin, ex.cause_color, ex.cause_urn, agentName)}</p>`;
        } else {
          const outcomeMarkup = isWin ? `<span class="win">won</span>` : `<span class="lose">lost</span>`;
          sentenceBox.innerHTML = `<p>${agentName} ${outcomeMarkup}.</p>`;
        }

        this.jsPsych.data.write({
          event_type: "explanation_example_shown",
          question_id: questionId,
          example_id: ex.id || null,
          draw_A: draw.A,
          draw_B: draw.B,
          cause_urn: showExplanation ? (ex.cause_urn || null) : null,
          result: isWin ? "win" : "lose"
        });
      };

      let pageIndex = 0;

      const renderPage = () => {
        const isIntroPage = hasIntro && pageIndex === 0;
        const exampleIdx = pageIndex - (hasIntro ? 1 : 0);

        introBlock.classList.toggle("is-hidden", !isIntroPage);
        if (isIntroPage) introBlock.innerHTML = trial.intro_html;

        exampleBlock.classList.toggle("is-hidden", isIntroPage);
        if (!isIntroPage) renderExample(examples[exampleIdx]);

        pageIndicator.textContent = `Page ${pageIndex + 1} of ${pageCount}`;
        backBtn.classList.toggle("is-hidden", pageIndex === 0);
        const atLastPage = pageIndex === pageCount - 1;
        nextBtn.classList.toggle("is-hidden", atLastPage);
        finishBtn.classList.toggle("is-hidden", !atLastPage);

        applyWidth();
      };

      const goTo = (newIndex) => {
        pageIndex = Math.max(0, Math.min(pageCount - 1, newIndex));
        renderPage();
      };

      backBtn.addEventListener("click", () => goTo(pageIndex - 1));
      nextBtn.addEventListener("click", () => goTo(pageIndex + 1));
      finishBtn.addEventListener("click", () => {
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          event_type: "explanation_example_complete",
          question_id: questionId,
          examples_shown: examples.length
        });
      });

      measureWidth();
      renderPage();
    }
  }

  ExplanationExamplePlugin.info = info;
  return ExplanationExamplePlugin;
})(jsPsychModule);
