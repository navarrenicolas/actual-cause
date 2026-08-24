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

    const resultHTML = showResult ? ` With this draw ${agentName} ${outcomeMarkup}` : "";

    return `${probHTML}<p>In this trial, ${agentName} drew ${formatGrammarList(items)}.${resultHTML}</p>`;
  }

  return { normalizeColor, getDisplayColor, getArticle, matchesColor, computeDrawProbability, formatGrammarList, renderOutcomeBadge, renderSampleDescription };
})();