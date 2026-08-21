/**
 * UrnUtils - Shared utility functions for Urn Draw trials
 */
window.UrnUtils = (function () {
  "use strict";

  /**
   * Normalizes color names to standard strings (e.g., handles spelling variants)
   * @param {string} color 
   * @returns {string}
   */
    function normalizeColor(color) {
        if (!color) return "";
        let clean = color.replace("light", "").replace("hot", "").toLowerCase().trim();
        if (clean === "grey" || clean === "#d3d3d3") return "grey";
        return clean;}

  /**
   * Returns the appropriate indefinite article ("a" or "an") for a given word
   * @param {string} word 
   * @returns {string}
   */
  function getArticle(word) {
    if (!word) return "a";
    const clean = normalizeColor(word);
    return /^[aeiou]/i.test(clean) ? "an" : "a";
  }

  /**
   * Checks whether a DOM element matches a target draw color.
   * Checks data attributes, inline style background colors, and class names.
   * @param {HTMLElement} element - The ball DOM element
   * @param {string} targetColor - The target color string
   * @returns {boolean}
   */
  function matchesColor(element, targetColor) {
    if (!element || !targetColor) return false;

    const target = normalizeColor(targetColor);

    // 1. Check data-color attribute
    const dataColor = element.getAttribute("data-color");
    if (dataColor && normalizeColor(dataColor) === target) {
      return true;
    }

    // 2. Check inline style rules
    const styleBg = element.style.backgroundColor;
    const styleColor = element.style.color;
    if (styleBg && normalizeColor(styleBg).includes(target)) return true;
    if (styleColor && normalizeColor(styleColor).includes(target)) return true;

    // 3. Check CSS class names
    if (element.classList.contains(target)) return true;

    return false;
  }

  /**
   * Computes the joint probability percentage for a multi-urn draw.
   * Format: Returns a string rounded to 2 decimal places (e.g., "40.00").
   * @param {Object} drawObj - Map of urn keys to drawn colors, e.g. { A: "yellow", B: "blue" }
   * @param {Object} urnMap - Map of urn specifications with probabilities
   * @returns {string|null} - Formatted percentage string or null if map is missing
   */
  function computeDrawProbability(drawObj, urnMap) {
    if (!urnMap || !drawObj) return null;

    let jointProb = 1.0;
    let validKeysCount = 0;

    Object.keys(drawObj).forEach((key) => {
      const drawnColor = normalizeColor(drawObj[key]);
      const urnInfo = urnMap[key];

      if (urnInfo) {
        const primaryColor = normalizeColor(urnInfo.color);
        const primaryProb = typeof urnInfo.prob === "number" ? urnInfo.prob : parseFloat(urnInfo.prob);

        if (!isNaN(primaryProb)) {
          // If drawn color matches primary color, use primaryProb; otherwise use complement
          const prob = drawnColor === primaryColor ? primaryProb : (1 - primaryProb);
          jointProb *= prob;
          validKeysCount++;
        }
      }
    });

    if (validKeysCount === 0) return null;

    const percentage = jointProb * 100;
    return percentage.toFixed(2);
  }

  /**
   * Formats a draw summary text description matching the ExplanationSelection format.
   * Normalizes color string first so inline styles handle gray/grey variants properly.
   * @param {Object} drawObj - E.g. { A: "yellow", B: "blue" }
   * @param {Array<string>} urnKeys - E.g. ["A", "B"]
   * @param {string} agentName - E.g. "You" or "Participant"
   * @param {boolean} isWin - Outcome result
   * @param {Object} urnMap - Map of urn probability configs
   * @param {boolean} showResult - Whether to show the win/loss verdict
   * @returns {string} HTML string summary
   */
  function renderSampleDescription(drawObj, urnKeys, agentName, isWin, urnMap, showResult) {
    const keys = urnKeys || Object.keys(drawObj);

    const items = keys.map((k) => {
      const rawColor = drawObj[k];
      const cleanColor = normalizeColor(rawColor);
      const article = getArticle(cleanColor);
      const isGrey = cleanColor === "grey";
      const displayColor = isGrey ? "#888888" : cleanColor;

      return `${article} <span style="color: ${displayColor}; font-weight: bold;">${cleanColor}</span> ball from box ${k}`;
    });

    let drawListSentence = "";
    if (items.length === 1) {
      drawListSentence = items[0];
    } else if (items.length === 2) {
      drawListSentence = items.join(" and ");
    } else {
      drawListSentence = items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
    }

    let text = ``;

    const probPct = computeDrawProbability(drawObj, urnMap);
    if (probPct !== null) {
      text += `<p style="text-align: center;">The probability of drawing these balls from the boxes is <b>${probPct}</b>%.</p>`;
    }

    text += `<p>In this trial, ${agentName} drew ${drawListSentence}.`;
    if (showResult !== false) {
      const outcomeMarkup = isWin
        ? `<span class="win">${agentName === "You" ? "WON!" : "won."}</span>`
        : `<span class="lose">${agentName === "You" ? "LOST!" : "lost."}</span>`;
      text += ` With this draw ${agentName} ${outcomeMarkup}`;
    }
    text += `</p>`;

    return text;
  }

  // Publicly exposed methods
  return {
    normalizeColor: normalizeColor,
    getArticle: getArticle,
    matchesColor: matchesColor,
    computeDrawProbability: computeDrawProbability,
    renderSampleDescription: renderSampleDescription
  };
})();