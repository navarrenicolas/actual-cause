/**
 * jsPsych plugin for a multi-page instructions walkthrough with Back/Next
 * navigation (like the standard jsPsych instructions plugin), but where the
 * later pages contain a live, interactive draw-from-the-boxes demo that
 * stays intact as the participant moves back and forth.
 *
 * Content never reflows to make room for a highlight: a single floating
 * annotation tooltip is repositioned next to whatever is highlighted, and
 * only one element is spotlighted at a time.
 */
var jsWalkthroughInstructions = (function (jspsych) {
  "use strict";

  const info = {
    name: "walkthrough-instructions",
    parameters: {
      intro_html: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
      },
      outro_html: {
        type: jspsych.ParameterType.HTML_STRING,
        default: ""
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
      draw: {
        type: jspsych.ParameterType.COMPLEX,
        default: {}
      },
      urn_keys: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: ["A", "B", "C", "D"]
      },
      rule_fn: {
        type: jspsych.ParameterType.FUNCTION,
        default: null
      },
      question_id: {
        type: jspsych.ParameterType.STRING,
        default: "walkthrough"
      },
      finish_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Continue to Practice Rounds"
      }
    }
  };

  // ===== Page descriptors =====
  // Each page is a pure function of which blocks/highlight should be visible.
  // Re-rendering a page never inserts/removes layout content beyond simple
  // show/hide toggles, so navigating Back/Next never loses state.
  const PROB_TOOLTIP = "This is how likely it would be to draw these balls from the boxes at random.";
  const FEEDBACK_TOOLTIP = "This text describes which balls were drawn in this trial.";

  function makePage(overrides) {
    return Object.assign({
      intro: false,
      outro: false,
      interactive: false,
      title: "",
      promptDraw: false,
      feedback: false,
      rule: false,
      result: false,
      highlight: null,
      tooltip: null
    }, overrides);
  }

  const PAGES = [
    makePage({ intro: true }),
    makePage({ interactive: true, title: "Drawing from the boxes", promptDraw: true }),
    makePage({ interactive: true, title: "What you drew", feedback: true }),
    makePage({ interactive: true, title: "What you drew", feedback: true, highlight: "prob", tooltip: PROB_TOOLTIP }),
    makePage({ interactive: true, title: "What you drew", feedback: true, highlight: "feedback", tooltip: FEEDBACK_TOOLTIP }),
    makePage({ interactive: true, title: "The rule", feedback: true, rule: true }),
    makePage({ interactive: true, title: "The result", feedback: true, rule: true, result: true }),
    makePage({ outro: true })
  ];

  class WalkthroughInstructionsPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const utils = window.UrnUtils;
      const urnKeys = trial.urn_keys || ["A", "B", "C", "D"];
      const targetDraw = trial.draw || {};
      const questionId = trial.question_id || "walkthrough";

      const drawnSoFar = {};

      display_element.innerHTML = `
        <div class="draw-plugin-container wt-container">

          <div id="wt-intro-block"></div>

          <div id="wt-interactive-block" class="is-hidden">
            <h2 id="wt-block-title" class="wt-block-title"></h2>

            <div id="wt-rule-slot" class="is-hidden">${trial.rule_text || ""}</div>
            <p id="wt-rule-explain" class="instruction-callout wt-static-callout is-hidden">In this game, a rule determines whether a sample of drawn balls results in a <span class="win">win</span> or a <span class="lose">loss</span>. If the conditions of the rule are satisfied, the game results in a win. Otherwise, it results in a loss.</p>

            <div class="urns-card-wrapper" id="wt-urns-wrapper">
              <div class="urns-display-container">${trial.urn_html || ""}</div>
              <div class="urns-card-footer">
                <span id="wt-prob-text" class="card-probability-text"></span>
              </div>
            </div>

            <p id="wt-draw-status" class="draw-status-text"></p>
            <p id="wt-prompt" class="walkthrough-prompt"><b>Click the DRAW button under any box to draw a ball from it.</b></p>

            <div id="wt-feedback-box" class="draw-feedback-text is-hidden"></div>
            <div id="wt-result-box" class="draw-feedback-text is-hidden"></div>
          </div>

          <div id="wt-annotation-tooltip" class="instruction-callout wt-tooltip is-hidden"></div>

          <div class="draw-action-segment wt-nav">
            <button id="wt-back-btn" class="jspsych-btn is-hidden">&lang; Back</button>
            <span id="wt-page-indicator" class="wt-page-indicator"></span>
            <button id="wt-next-btn" class="jspsych-btn is-hidden">Next &rang;</button>
            <button id="wt-finish-btn" class="jspsych-btn is-hidden">${trial.finish_button_label || "Continue to Next Section"}</button>
          </div>
        </div>
      `;

      const introBlock = display_element.querySelector("#wt-intro-block");
      const interactiveBlock = display_element.querySelector("#wt-interactive-block");
      const blockTitle = display_element.querySelector("#wt-block-title");
      const ruleSlot = display_element.querySelector("#wt-rule-slot");
      const ruleExplain = display_element.querySelector("#wt-rule-explain");
      const probText = display_element.querySelector("#wt-prob-text");
      const drawStatus = display_element.querySelector("#wt-draw-status");
      const promptText = display_element.querySelector("#wt-prompt");
      const feedbackBox = display_element.querySelector("#wt-feedback-box");
      const resultBox = display_element.querySelector("#wt-result-box");
      const urnsCardWrapper = display_element.querySelector("#wt-urns-wrapper");
      const tooltip = display_element.querySelector("#wt-annotation-tooltip");
      const backBtn = display_element.querySelector("#wt-back-btn");
      const nextBtn = display_element.querySelector("#wt-next-btn");
      const finishBtn = display_element.querySelector("#wt-finish-btn");
      const pageIndicator = display_element.querySelector("#wt-page-indicator");

      const highlightTargets = {
        prob: probText,
        feedback: feedbackBox,
        rule: ruleSlot,
        result: resultBox
      };

      const finishTrial = () => {
        window.removeEventListener("resize", repositionTooltipIfVisible);
        window.removeEventListener("resize", remeasureContentWidth);
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({ questionID: questionId });
      };

      const allDrawn = () => urnKeys.every((k) => drawnSoFar[k] !== undefined);

      const hideTooltip = () => {
        tooltip.classList.add("is-hidden");
      };

      const positionTooltip = (targetEl) => {
        const rect = targetEl.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        tooltip.style.top = `${Math.max(8, rect.top - tooltipRect.height - 8)}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
      };

      let lastTooltipTarget = null;
      const showTooltip = (targetEl, text) => {
        tooltip.textContent = text;
        tooltip.classList.remove("is-hidden");
        lastTooltipTarget = targetEl;
        positionTooltip(targetEl);
      };

      function repositionTooltipIfVisible() {
        if (lastTooltipTarget && !tooltip.classList.contains("is-hidden")) {
          positionTooltip(lastTooltipTarget);
        }
      }

      // ===== Shared content column =====
      // Every page (the static intro included) binds its header/rule/feedback/
      // result boxes to the same width as the urns row itself (see
      // UrnUtils.bindContentWidthToUrns), so nothing extends past the urns'
      // edges and pages don't shift width as the participant moves back and
      // forth. The urns row is hidden on the intro page, so it's briefly
      // made measurable (invisible, out of flow) rather than skipped.
      let contentWidth = null;

      const measureUrnsWidth = () => {
        const wasHidden = interactiveBlock.classList.contains("is-hidden");
        if (wasHidden) {
          interactiveBlock.style.visibility = "hidden";
          interactiveBlock.style.position = "absolute";
          interactiveBlock.classList.remove("is-hidden");
        }
        const width = utils.measureUrnDisplayWidth(display_element);
        if (wasHidden) {
          interactiveBlock.classList.add("is-hidden");
          interactiveBlock.style.visibility = "";
          interactiveBlock.style.position = "";
        }
        if (width) contentWidth = width;
      };

      const applyContentWidth = () => {
        const introInner = introBlock.querySelector(".instructions-container");
        utils.applyBoundWidth(contentWidth, [blockTitle, ruleSlot, ruleExplain, urnsCardWrapper, feedbackBox, resultBox, introInner]);
      };

      function remeasureContentWidth() {
        measureUrnsWidth();
        applyContentWidth();
      }

      window.addEventListener("resize", repositionTooltipIfVisible);
      window.addEventListener("resize", remeasureContentWidth);

      const renderFeedbackContent = () => {
        const probPct = utils.computeDrawProbability(drawnSoFar, trial.urn_map);
        probText.textContent = probPct !== null ? `Scenario Probability ${probPct}%` : "";
        feedbackBox.innerHTML = utils.renderSampleDescription(drawnSoFar, urnKeys, "You", null, null, false);
      };

      const renderResultContent = () => {
        const isWin = trial.rule_fn ? trial.rule_fn(drawnSoFar) : false;
        const outcomeMarkup = isWin ? `<span class="win">WON!</span>` : `<span class="lose">LOST!</span>`;
        resultBox.innerHTML = `<p><b>With this draw, you ${outcomeMarkup}</b></p>`;
      };

      let pageIndex = 0;

      const renderPage = () => {
        const page = PAGES[pageIndex];

        // The intro's static urn display shares element ids with the
        // interactive urns below (ball/urn/slot ids come from the same
        // shared urn data). Only ever have one of the two in the DOM at a
        // time, or querySelector(`#urn-container-${key}`) during a draw can
        // resolve to the wrong (hidden) copy and the draw animation breaks.
        if (page.intro) {
          introBlock.innerHTML = trial.intro_html || "";
        } else if (page.outro) {
          introBlock.innerHTML = trial.outro_html || "";
        } else {
          introBlock.innerHTML = "";
        }
        introBlock.classList.toggle("is-hidden", !(page.intro || page.outro));
        interactiveBlock.classList.toggle("is-hidden", !page.interactive);
        blockTitle.textContent = page.title;

        promptText.classList.toggle("is-hidden", !page.promptDraw);
        drawStatus.classList.toggle("is-hidden", !page.promptDraw);

        if (page.feedback) renderFeedbackContent();
        feedbackBox.classList.toggle("is-hidden", !page.feedback);

        ruleSlot.classList.toggle("is-hidden", !page.rule);
        ruleExplain.classList.toggle("is-hidden", !page.rule);

        if (page.result) renderResultContent();
        resultBox.classList.toggle("is-hidden", !page.result);

        // Single spotlight: clear every highlight, then apply this page's one.
        Object.values(highlightTargets).forEach((el) => el.classList.remove("walkthrough-highlight"));
        hideTooltip();
        if (page.highlight) {
          const targetEl = highlightTargets[page.highlight];
          targetEl.classList.add("walkthrough-highlight");
          if (page.tooltip) showTooltip(targetEl, page.tooltip);
        }

        pageIndicator.textContent = `Page ${pageIndex + 1} of ${PAGES.length}`;
        backBtn.classList.toggle("is-hidden", pageIndex === 0);
        const atLastPage = pageIndex === PAGES.length - 1;
        const drawPageIncomplete = pageIndex === 1 && !allDrawn();
        nextBtn.classList.toggle("is-hidden", atLastPage || drawPageIncomplete);
        finishBtn.classList.toggle("is-hidden", !atLastPage);

        applyContentWidth();
      };

      const goTo = (newIndex) => {
        pageIndex = Math.max(0, Math.min(PAGES.length - 1, newIndex));
        renderPage();
      };

      backBtn.addEventListener("click", () => goTo(pageIndex - 1));
      nextBtn.addEventListener("click", () => goTo(pageIndex + 1));
      finishBtn.addEventListener("click", finishTrial);

      // ===== Draw interaction (ball-to-slot animation) =====
      const handleUrnDraw = (urnKey, buttonEl) => {
        if (drawnSoFar[urnKey] !== undefined) return;
        buttonEl.disabled = true;

        const drawnColor = targetDraw[urnKey];
        drawnSoFar[urnKey] = drawnColor;

        const urnContainer = display_element.querySelector(`#urn-container-${urnKey}`);
        const slotEl = display_element.querySelector(`#slot-${urnKey}`);

        const completeDrawVisual = () => {
          const cleanColor = utils.normalizeColor(drawnColor);
          const displayColor = cleanColor === "grey" ? "#c0c0c0" : cleanColor;

          if (slotEl) {
            slotEl.innerHTML = `<div class="ball" style="background-color:${displayColor};" data-urn="${urnKey}" data-color="${drawnColor}"></div>`;
          }

          drawStatus.innerHTML = `A <span class="urn-ball-text" style="color:${utils.getDisplayColor(drawnColor)};">${cleanColor}</span> ball has been taken from box ${urnKey} and placed in the slot below it.`;

          const remaining = urnKeys.filter((k) => drawnSoFar[k] === undefined);
          promptText.innerHTML = remaining.length > 0
            ? `<b>Now draw the rest of the balls from the other boxes.</b>`
            : `<b>All balls drawn. Click Next to continue.</b>`;

          // Stay on the draw page; just reveal the Next button once ready.
          renderPage();
        };

        if (urnContainer && slotEl) {
          const balls = Array.from(urnContainer.querySelectorAll(".ball"));
          const matchingBalls = balls.filter((b) => {
            if (b.classList.contains("drawn-hidden") || b.closest(".urn-slot")) return false;
            return utils.matchesColor(b, drawnColor);
          });

          const targetBall = matchingBalls.length > 0
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
              completeDrawVisual();
            }, 450);
            return;
          }
        }

        completeDrawVisual();
      };

      display_element.querySelectorAll(".push-draw-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const urnKey = e.currentTarget.getAttribute("data-urn");
          handleUrnDraw(urnKey, e.currentTarget);
        });
      });

      measureUrnsWidth();
      renderPage();
    }
  }

  WalkthroughInstructionsPlugin.info = info;

  return WalkthroughInstructionsPlugin;
})(jsPsychModule);
