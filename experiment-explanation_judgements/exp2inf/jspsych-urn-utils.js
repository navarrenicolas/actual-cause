window.UrnUtils = (function () {
  "use strict";

  function normalizeColor(color) {
    if (!color) return "";
    const clean = color.replace(/light|hot/gi, "").toLowerCase().trim();
    return clean === "#d3d3d3" ? "grey" : clean;
  }

  function getDisplayColor(color) {
    const clean = normalizeColor(color);
    return clean === "grey" ? "#888888" : clean;
  }

  function getArticle(word) {
    if (!word) return "a";
    return /^[aeiou]/i.test(normalizeColor(word)) ? "an" : "a";
  }

  function matchesColor(element, targetColor) {
    if (!element || !targetColor) return false;
    const target = normalizeColor(targetColor);
    const dataColor = element.getAttribute("data-color");

    if (dataColor && normalizeColor(dataColor) === target) return true;
    if (element.style.backgroundColor && normalizeColor(element.style.backgroundColor).includes(target)) return true;
    if (element.style.color && normalizeColor(element.style.color).includes(target)) return true;
    return element.classList.contains(target);
  }

  function computeDrawProbability(drawObj, urnMap) {
    if (!urnMap || !drawObj) return null;
    let jointProb = 1.0;
    let validKeys = 0;

    Object.keys(drawObj).forEach((key) => {
      const drawnColor = normalizeColor(drawObj[key]);
      const urnInfo = urnMap[key];
      if (urnInfo) {
        const primaryColor = normalizeColor(urnInfo.color);
        const primaryProb = typeof urnInfo.prob === "number" ? urnInfo.prob : parseFloat(urnInfo.prob);
        if (!isNaN(primaryProb)) {
          jointProb *= (drawnColor === primaryColor) ? primaryProb : (1 - primaryProb);
          validKeys++;
        }
      }
    });

    return validKeys > 0 ? (jointProb * 100).toFixed(2) : null;
  }

  function formatGrammarList(items) {
    if (!items || items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }

  function renderOutcomeBadge(isWin) {
    return `<span class="outcome-badge ${isWin ? 'win-badge' : 'lose-badge'}">${isWin ? 'WIN' : 'LOSS'}</span>`;
  }

  // Shared "fixed content column" helper: binds a set of elements (headers,
  // rule box, feedback text, etc.) to the same width as the urns row so a
  // trial's content lines up consistently instead of stretching edge to edge.
  // The urns row must be able to size to its own natural width (not
  // width:100%) for the measurement to mean anything — see the
  // `.urn-display { width: fit-content; }` overrides in style.css.
  function measureUrnDisplayWidth(rootEl, selector) {
    const el = rootEl.querySelector(selector || ".urn-display");
    if (!el) return null;
    const width = el.getBoundingClientRect().width;
    return width > 0 ? Math.ceil(width) : null;
  }

  function applyBoundWidth(width, elements) {
    if (!width) return;
    const px = `${width}px`;
    elements.forEach((el) => {
      if (!el) return;
      el.style.maxWidth = px;
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
    });
  }

  function bindContentWidthToUrns(rootEl, getBoundEls, selector) {
    const apply = () => {
      const width = measureUrnDisplayWidth(rootEl, selector);
      if (width) applyBoundWidth(width, getBoundEls());
    };
    apply();
    window.addEventListener("resize", apply);
    return { apply, cleanup: () => window.removeEventListener("resize", apply) };
  }

  // Grid-card ball sizing: rather than approximating with viewport units
  // (which have no idea how tall/wide a given card actually rendered),
  // measure the card's real available space and solve for the largest
  // ball size that fits it exactly, so the urns + probability footer are
  // guaranteed visible in full at any screen size.
  //
  // Every quantity below is either independent of the current ball size
  // (wrapper height, display width, label height — all governed by fixed
  // CSS or the card's own grid-row sizing) or derived algebraically from
  // the ball size using the same ratios the CSS uses (ball grid gap/
  // padding, the urn-slot, and the draw button), rather than measured —
  // measuring the controls row would bake in whatever font-size/padding
  // the *previous* ball size left the button at, which is exactly the
  // circular dependency that made the button not track the adjustment.
  // That keeps this a single, exact pass with no iteration needed.
  function fitGridBallsToCard(rootEl) {
    const wrappers = Array.from(rootEl.querySelectorAll(".urns-card-wrapper"));
    if (wrappers.length === 0) return;

    // Each card's own feedback block is now content-sized (see
    // .card-feedback-block), and different cards can have different
    // content — a longer/wrapped selection sentence on one card, an
    // unanswered (shorter) one on another — so each card's own internal
    // split between its urns row and its feedback row can differ even
    // though every card gets the same *total* height from the outer 2x2
    // grid. Sizing off just one card's wrapper could miss a more
    // constrained card entirely; use whichever card currently has the
    // *least* room for its urns row as the shared ball size, so nothing
    // on any card ever overflows.
    let wrapper = wrappers[0];
    let wrapperHeight = wrapper.getBoundingClientRect().height;
    for (let i = 1; i < wrappers.length; i++) {
      const h = wrappers[i].getBoundingClientRect().height;
      if (h > 0 && h < wrapperHeight) {
        wrapper = wrappers[i];
        wrapperHeight = h;
      }
    }

    const displayContainerEl = wrapper.querySelector(".urns-display-container");
    const urnDisplayEl = wrapper.querySelector(".urn-display");
    const labelEl = wrapper.querySelector(".urn-label");
    const urnEl = wrapper.querySelector(".urn");
    if (!displayContainerEl || !urnDisplayEl || !urnEl) return;

    const displayWidth = displayContainerEl.getBoundingClientRect().width;
    if (wrapperHeight <= 0 || displayWidth <= 0) return;

    // Probability text length (and so how many lines it wraps to) varies
    // per scenario/card, so measure every card's footer and use the
    // tallest — sizing off just one card could under-count how much room
    // a longer probability string needs on another.
    const footerHeight = Array.from(rootEl.querySelectorAll(".urns-card-footer"))
      .reduce((max, el) => Math.max(max, el.getBoundingClientRect().height), 0);
    const labelHeight = labelEl ? labelEl.getBoundingClientRect().height : 0;

    const nUrns = urnDisplayEl.querySelectorAll(".urn-column").length || 4;
    const urnDisplayGap = parseFloat(window.getComputedStyle(urnDisplayEl).columnGap) || 0;
    const perUrnWidth = (displayWidth - (nUrns - 1) * urnDisplayGap) / nUrns;

    const nCols = 5;
    const nBalls = urnEl.querySelectorAll(".ball").length || 20;
    const nRows = Math.ceil(nBalls / nCols);

    // Ball grid: nRows/nCols balls, plus a gap proportional to ball size
    // (0.2x) between them, plus padding on both sides (0.3x each) —
    // matches .urns-card-wrapper .urn's padding/grid-gap rules.
    const heightFactor = nRows + 0.2 * (nRows - 1) + 0.6;
    const widthFactor = nCols + 0.2 * (nCols - 1) + 0.6;

    // Controls row: matches .urn-controls-compact (margin-top:10px, fixed)
    // plus its tallest child. The slot (1.5x ball size) is taller than the
    // scaled button (~0.9x ball size + ~2px, from its 0.5x font-size and
    // 0.15x top/bottom padding) at any ball size this ever reaches, so the
    // slot is what actually determines the row's height.
    const controlsMarginTop = 10;
    const controlsHeightFactor = 1.5;

    // Small fixed safety margin: the algebra above is exact for the ball
    // grid itself, but real layout has a few extra sub-pixel contributors
    // (font metrics, the row-gap between the urns row and the feedback
    // row, rounding from the grid engine's own track sizing) that aren't
    // worth individually modeling. Reserving a few px up front means the
    // probability text never ends up flush against the feedback block
    // below it even when those small effects stack up, instead of solving
    // for a razor-thin fit that any of them could tip into an overlap.
    const safetyMargin = 6;

    const availableHeight = wrapperHeight - footerHeight - labelHeight - controlsMarginTop - safetyMargin;

    const ballSizeByHeight = availableHeight / (heightFactor + controlsHeightFactor);
    const ballSizeByWidth = perUrnWidth / widthFactor;

    const ballSize = Math.max(6, Math.floor(Math.min(ballSizeByHeight, ballSizeByWidth, 24)));

    rootEl.style.setProperty("--grid-ball-size", `${ballSize}px`);
    rootEl.style.setProperty("--grid-urn-padding", `${Math.max(2, Math.round(ballSize * 0.3))}px`);
    rootEl.style.setProperty("--grid-urn-gap", `${Math.max(1, Math.round(ballSize * 0.2))}px`);
  }

  function bindGridBallFit(rootEl) {
    const apply = () => fitGridBallsToCard(rootEl);
    apply();
    window.addEventListener("resize", apply);
    return { apply, cleanup: () => window.removeEventListener("resize", apply) };
  }

  function renderSampleDescription(drawObj, urnKeys, agentName, isWin, urnMap, showResult = true) {
    const keys = urnKeys || Object.keys(drawObj);
    const items = keys.map((k) => {
      const cleanColor = normalizeColor(drawObj[k]);
      return `${getArticle(cleanColor)} <span class="urn-ball-text" style="color: ${getDisplayColor(cleanColor)};">${cleanColor}</span> ball from box ${k}`;
    });

    const probPct = computeDrawProbability(drawObj, urnMap);
    const probHTML = probPct !== null ? `<p class="draw-prob-text">The probability of drawing these balls from the boxes is <b>${probPct}%</b>.</p>` : "";
    const outcomeMarkup = isWin 
      ? `<span class="win">${agentName === "You" ? "WON!" : "won."}</span>` 
      : `<span class="lose">${agentName === "You" ? "LOST!" : "lost."}</span>`;

    const resultHTML = showResult ? ` <b>With this draw ${agentName} ${outcomeMarkup}</b>` : "";

    return `${probHTML}<p>In this trial, ${agentName} drew ${formatGrammarList(items)}.${resultHTML}</p>`;
  }

  // Shared by explanation-example-plugin.js, prediction-grid-plugin.js, and
  // prediction-navigator-plugin.js: renders the sentence explaining a past
  // observation's outcome, with the *entire* sentence wrapped in a yellow
  // highlighter <mark> — the visual cue that this card is a past
  // observation, not something to predict. Pair with markHighlightedBall()
  // to ring the ball itself in the same green/red used for active
  // selection feedback elsewhere.
  function renderExplanationSentence(isWin, color, urnKey, agentName) {
    const cleanColor = normalizeColor(color);
    const displayColor = getDisplayColor(cleanColor);
    const outcomeText = isWin ? "won" : "lost";
    const outcomeClass = isWin ? "win" : "lose";
    const sentence = `${agentName} <span class="${outcomeClass}">${outcomeText}</span> because of the <span class="urn-ball-text" style="color: ${displayColor};">${cleanColor}</span> ball from box ${urnKey}.`;
    return `<mark class="hi-lite">${sentence}</mark>`;
  }

  // Renders the live "With this draw, {agent} Won/Lost." sentence shown
  // under a prediction card once the participant has clicked WON or LOST —
  // shared by prediction-grid-plugin.js and prediction-navigator-plugin.js.
  function renderPredictionSentence(agentName, predictedWin) {
    if (predictedWin === null || predictedWin === undefined) return "";
    const statusTag = predictedWin ? `<span class="win">Won</span>` : `<span class="lose">Lost</span>`;
    return `With this draw, ${agentName} ${statusTag}.`;
  }

  // Rings the ball in its urn-slot with the same green/red used for active
  // selection feedback elsewhere (.is-selected/-win/-loss), marking it as
  // the explained/causal ball for a past observation.
  function markHighlightedBall(slotEl, isWin) {
    if (!slotEl) return;
    slotEl.classList.add("is-selected", isWin ? "is-selected-win" : "is-selected-loss");
  }

  return { normalizeColor, getDisplayColor, getArticle, matchesColor, computeDrawProbability, formatGrammarList, renderOutcomeBadge, renderSampleDescription, measureUrnDisplayWidth, applyBoundWidth, bindContentWidthToUrns, fitGridBallsToCard, bindGridBallFit, renderExplanationSentence, renderPredictionSentence, markHighlightedBall };
})();