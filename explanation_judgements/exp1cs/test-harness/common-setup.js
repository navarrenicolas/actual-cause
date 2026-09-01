// ===== Shared, deterministic fixture for isolated trial test pages =====
//
// This mirrors the urn/rule setup at the top of ../main.js, but with fixed
// values instead of Math.random()-based shuffling, so every test page in
// this folder renders the exact same urns/rule/balls on every run —
// screenshots stay comparable across runs and across trial types instead
// of shifting every reload. Keep this in sync with main.js's setup by hand
// if that logic changes; it's a deliberate, small duplication so each test
// page can run one trial in isolation without booting the whole timeline.

const fixedUrnColors = {
  A: 'orange',
  B: 'blue',
  C: 'purple',
  D: 'hotpink'
};

const urnLabels = {
  A: 'A (orange)',
  B: 'B (blue)',
  C: 'C (purple)',
  D: 'D (pink)'
};

// Fixed (not shuffled) so A=high, B=medHigh, C=medLow, D=low every run.
const shuffledProbs = [0.9, 0.6, 0.4, 0.1];
const urnMap = Object.fromEntries(
  Object.keys(fixedUrnColors).map((key, idx) => [
    key,
    { color: fixedUrnColors[key], prob: shuffledProbs[idx] }
  ])
);

const positionByProb = Object.fromEntries(
  Object.entries(urnMap).map(([key, urn]) => [urn.prob, key])
);

const [highKey, medHighKey, medLowKey, lowKey] = [
  0.9, 0.6, 0.4, 0.1
].map(prob => positionByProb[prob]);

const labelByRole = {
  high: urnMap[highKey].color === 'hotpink' ? 'pink' : urnMap[highKey].color,
  medHigh: urnMap[medHighKey].color === 'hotpink' ? 'pink' : urnMap[medHighKey].color,
  medLow: urnMap[medLowKey].color === 'hotpink' ? 'pink' : urnMap[medLowKey].color,
  low: urnMap[lowKey].color === 'hotpink' ? 'pink' : urnMap[lowKey].color
};

// Fixed rule (rules.js must be loaded before this file) so the rule box
// text/wording is stable across test runs. Change this to check a
// different rule's wording/layout.
const selectedRuleKey = 'rule1';
const selectedRule = rules[selectedRuleKey];

function rule(draw) {
  return selectedRule.evaluate(draw, { highKey, medHighKey, medLowKey, lowKey });
}

const rawRuleDescription = fillRuleTemplate(ruleTemplates[selectedRuleKey], labelByRole);
const ruleText = `<h2> RULE </h2>  <p> <strong>  To win, you must draw ${colorizeWithSpans(rawRuleDescription)}</strong> </p>`;
const ruleBox = `<div class="highlight-box"> ${ruleText} </div>`;

function generateUrnBallsData(urnKey, total = 20) {
  const { color, prob } = urnMap[urnKey];
  const nColored = Math.round(prob * total);
  // Fixed (not shuffled) layout so ball positions are stable across runs.
  const rawColors = Array(nColored).fill(color).concat(Array(total - nColored).fill('lightgrey'));
  return rawColors.map((col, idx) => ({ id: `ball-${urnKey}-${idx}`, color: col }));
}

const sharedUrnsData = Object.fromEntries(
  Object.keys(urnMap).map((k) => [k, generateUrnBallsData(k)])
);

// Verbatim copy of renderUrnsHTML from ../main.js.
function renderUrnsHTML(urnsData = sharedUrnsData, interactive = false, showControls = true) {
  const columns = Object.keys(urnMap).map(urnKey => {
    const ballsData = urnsData[urnKey] || [];
    const ballsHTML = ballsData.map(b => {
      const isGrey = ["lightgrey", "grey", "#d3d3d3"].includes(b.color);
      return `<div class="ball" id="${b.id}" data-color="${b.color}" style="background-color:${isGrey ? '#c0c0c0' : b.color};"></div>`;
    }).join('');

    return `
      <div class="urn-column" data-urn="${urnKey}">
        <div class="urn-label" style="color: ${urnMap[urnKey].color};">${urnLabels[urnKey]}</div>
        <div class="urn" id="urn-container-${urnKey}">${ballsHTML}</div>
        ${showControls ? `
        <div class="urn-controls-compact">
          <button class="push-draw-btn" data-urn="${urnKey}" ${interactive ? '' : 'disabled'}>DRAW</button>
          <div class="urn-slot" id="slot-${urnKey}"></div>
        </div>` : ''}
      </div>`;
  }).join('');

  return `<div class="urn-display">${columns}</div>`;
}

const staticUrns = renderUrnsHTML(sharedUrnsData, false);
const staticUrnsNoControls = renderUrnsHTML(sharedUrnsData, false, false);
const interactiveUrns = renderUrnsHTML(sharedUrnsData, true);

// A handful of fixed, hand-picked draws (by probability rank) reused across
// test pages wherever a "some balls colored, some not" example is needed.
function drawFromRanks({ high, medHigh, medLow, low }) {
  return {
    [highKey]: high ? urnMap[highKey].color : 'lightgrey',
    [medHighKey]: medHigh ? urnMap[medHighKey].color : 'lightgrey',
    [medLowKey]: medLow ? urnMap[medLowKey].color : 'lightgrey',
    [lowKey]: low ? urnMap[lowKey].color : 'lightgrey'
  };
}

const fixtureDraws = [
  drawFromRanks({ high: 1, medHigh: 1, medLow: 0, low: 1 }),
  drawFromRanks({ high: 0, medHigh: 1, medLow: 1, low: 0 }),
  drawFromRanks({ high: 1, medHigh: 0, medLow: 0, low: 0 }),
  drawFromRanks({ high: 1, medHigh: 1, medLow: 1, low: 1 })
];

function computeFixtureProb(draw) {
  return (window.UrnUtils.computeDrawProbability(draw, urnMap) || '0') + '%';
}
