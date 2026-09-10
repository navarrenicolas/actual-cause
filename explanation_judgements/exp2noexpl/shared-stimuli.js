/**
 * Communal stimuli/text/logic for exp2inf (explanation) and exp2noexpl
 * (no-explanation) — the two experiments are structurally identical
 * except for wording in the observation-related text (present/explained
 * vs. shown-only) and how each sources its 4-urn map/rule/scenarios
 * (exp2inf fetches a real experiment_1 record; exp2noexpl generates one
 * client-side). Everything here is either fully identical between the
 * two, or differs only in wording depending on a `showExplanation` flag
 * — so wording only ever needs to change in one place, in one file,
 * instead of needing the same edit made twice and kept in sync by hand.
 * Loaded via its own <script> tag in both main.html files, after
 * jspsych-urn-utils.js and rules.js (buildRuleSentence below uses both)
 * and before each experiment's own main.js.
 *
 * Deliberately does NOT reference jsPsych, subject_id, or useMockData:
 * those are declared with let/const inside each main.js, which (unlike
 * var or an explicit window.x assignment) does not become a global
 * window property, so a same-page script loaded before or after main.js
 * still can't see them. saveDataToServerAsCSV below is the one function
 * that needs jsPsych et al., so it takes them as explicit parameters
 * instead of assuming they're in scope.
 */

// ===== Shuffle / urn-rendering helpers =====
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Red, centered "Practice N/2" banner, prepended to the plain
// html-button-response blurbs during the 2-urn training block (steps 2-4)
// — the jsExplanationExample/jsPredictionColumns trials themselves show a
// "PRACTICE RULE N/2" rule box instead (see practiceRuleBoxHTML).
function practiceLabelHTML(n, total) {
  return `<div class="practice-task-label">Practice ${n}/${total}</div>`;
}

function buildUrnLabels(urnMap) {
  const labels = {};
  Object.keys(urnMap).forEach((key) => {
    const displayColor = urnMap[key].color === "hotpink" ? "pink" : urnMap[key].color;
    labels[key] = `${key} (${displayColor})`;
  });
  return labels;
}

function generateUrnBallsData(urnMap, urnKey, total = 20) {
  const { color, prob } = urnMap[urnKey];
  const nColored = Math.round(prob * total);
  const rawColors = shuffleArray(Array(nColored).fill(color).concat(Array(total - nColored).fill("lightgrey")));
  return rawColors.map((col, idx) => ({ id: `ball-${urnKey}-${idx}`, color: col }));
}

function getOrCreateUrnsData(urnMap) {
  const urnsData = {};
  Object.keys(urnMap).forEach((urnKey) => { urnsData[urnKey] = generateUrnBallsData(urnMap, urnKey); });
  return urnsData;
}

function renderUrnsHTML(urnMap, urnLabels, urnsData, interactive = false, showControls = true) {
  const columns = Object.keys(urnMap).map((urnKey) => {
    const ballsData = urnsData[urnKey] || [];
    const ballsHTML = ballsData.map((b) => {
      const isGrey = ["lightgrey", "grey", "#d3d3d3"].includes(b.color);
      return `<div class="ball" id="${b.id}" data-color="${b.color}" style="background-color:${isGrey ? "#c0c0c0" : b.color};"></div>`;
    }).join("");

    return `
      <div class="urn-column" data-urn="${urnKey}">
        <div class="urn-label" style="color: ${urnMap[urnKey].color};">${urnLabels[urnKey]}</div>
        <div class="urn" id="urn-container-${urnKey}">${ballsHTML}</div>
        ${showControls ? `
        <div class="urn-controls-compact">
          <button class="push-draw-btn" data-urn="${urnKey}" ${interactive ? "" : "disabled"}>DRAW</button>
          <div class="urn-slot" id="slot-${urnKey}"></div>
        </div>` : ""}
      </div>`;
  }).join("");

  return `<div class="urn-display">${columns}</div>`;
}

// ===== Rule-role helpers: shared by the fixed familiarisation set and
// the debrief's rule-reveal sentence — both need to map the 4 urns'
// relative draw probability to the "high"/"medHigh"/"medLow"/"low" roles
// the real task's 5 rules (rule1..rule5) are defined over, exactly as
// exp1cs/rules.js does. =====
function rankUrnKeysByProb(urnMap) {
  return Object.keys(urnMap).sort((a, b) => urnMap[b].prob - urnMap[a].prob);
}

// One fixed set of 10 familiarization draws, NOT tied to any specific
// rule — rules.js's own fixedFamiliarisation is keyed per-rule and was
// hand-picked there for each rule's *logical* feature coverage, not to
// match the urns' actual probabilities, so for several rules the
// high-probability box shows far more (or fewer) grey balls than its
// real 90% hit rate implies. This set's per-role counts match the fixed
// probabilities exactly instead: 9/10 colored in the high-probability
// box, 6/10 in medHigh, 4/10 in medLow, 1/10 in low — the same 10 draws
// (shuffled per session) regardless of which rule is assigned.
const FIXED_FAMILIARISATION_DRAWS = [
  { high: 1, medHigh: 1, medLow: 1, low: 0 },
  { high: 1, medHigh: 1, medLow: 1, low: 0 },
  { high: 1, medHigh: 1, medLow: 0, low: 0 },
  { high: 1, medHigh: 1, medLow: 0, low: 0 },
  { high: 1, medHigh: 1, medLow: 0, low: 0 },
  { high: 1, medHigh: 0, medLow: 1, low: 0 },
  { high: 1, medHigh: 0, medLow: 1, low: 0 },
  { high: 1, medHigh: 0, medLow: 0, low: 0 },
  { high: 1, medHigh: 0, medLow: 0, low: 0 },
  { high: 0, medHigh: 1, medLow: 0, low: 1 }
];

// Converts the fixed high/medHigh/medLow/low patterns above into actual
// {A,B,C,D}-keyed draws for a specific urnMap: each role's boolean flag
// becomes that role's own color when present, lightgrey when absent.
function buildFamiliarisationDraws(urnMap) {
  const [highKey, medHighKey, medLowKey, lowKey] = rankUrnKeysByProb(urnMap);
  return FIXED_FAMILIARISATION_DRAWS.map((draw) => ({
    [highKey]: draw.high ? urnMap[highKey].color : "lightgrey",
    [medHighKey]: draw.medHigh ? urnMap[medHighKey].color : "lightgrey",
    [medLowKey]: draw.medLow ? urnMap[medLowKey].color : "lightgrey",
    [lowKey]: draw.low ? urnMap[lowKey].color : "lightgrey"
  }));
}

// ===== 2-urn training config =====
// Purely instructional — teaches what a rule/explanation/prediction looks
// like before the real 4-urn task, whose urns come from each experiment's
// own (differently-sourced) 4-urn map instead.
const twoUrnMap = {
  A: { color: "orange", prob: 0.7 },
  B: { color: "blue", prob: 0.5 }
};
const twoUrnLabels = buildUrnLabels(twoUrnMap);
const twoUrnBallsData = getOrCreateUrnsData(twoUrnMap);
const twoUrnHtmlInteractive = renderUrnsHTML(twoUrnMap, twoUrnLabels, twoUrnBallsData, true);
const twoUrnHtmlStatic = renderUrnsHTML(twoUrnMap, twoUrnLabels, twoUrnBallsData, false);

const disjunctiveRuleText = `<div class="highlight-box"><h2 style="color: red;">EXAMPLE RULE</h2><p><strong>To win, you must draw an <span style="color:orange">orange</span> ball, a <span style="color:blue">blue</span> ball, or both.</strong></p></div>`;

// Red "PRACTICE RULE N/2" rule boxes shown on the practice-task trials
// themselves (jsExplanationExample/jsPredictionColumns's own rule_text).
function practiceRuleBoxHTML(n, total, ruleBodyHTML) {
  return `<div class="highlight-box"><h2 style="color: red;">PRACTICE RULE ${n}/${total}</h2><p><strong>${ruleBodyHTML}</strong></p></div>`;
}
const disjunctivePracticeRuleText = practiceRuleBoxHTML(1, 2, `To win, you must draw an <span style="color:orange">orange</span> ball OR a <span style="color:blue">blue</span> ball, or both.`);
const conjunctivePracticeRuleText = practiceRuleBoxHTML(2, 2, `To win, you must draw BOTH an <span style="color:orange">orange</span> ball AND a <span style="color:blue">blue</span> ball.`);

const disjunctiveRuleFn = (draw) => draw.A !== "lightgrey" || draw.B !== "lightgrey";
const conjunctiveRuleFn = (draw) => draw.A !== "lightgrey" && draw.B !== "lightgrey";

// Always carries cause_urn/cause_color, even though the no-explanation
// condition never displays them — every plugin that would read those
// fields already gates on its own show_explanation param first, so one
// shared definition covering both conditions is safe, instead of two
// near-identical arrays that differ only by omitting two fields.
const disjunctiveExamples = [
  { id: 1, draw: { A: twoUrnMap.A.color, B: "lightgrey" }, outcome: "win", cause_urn: "A", cause_color: twoUrnMap.A.color },
  { id: 2, draw: { A: "lightgrey", B: twoUrnMap.B.color }, outcome: "win", cause_urn: "B", cause_color: twoUrnMap.B.color }
];
const conjunctiveExamples = [
  { id: 1, draw: { A: twoUrnMap.A.color, B: "lightgrey" }, outcome: "lose", cause_urn: "B", cause_color: "lightgrey" },
  { id: 2, draw: { A: "lightgrey", B: twoUrnMap.B.color }, outcome: "lose", cause_urn: "A", cause_color: "lightgrey" }
];

function generateTwoUrnCombos(urnMap) {
  const keys = Object.keys(urnMap);
  const combos = [];
  function helper(depth, current) {
    if (depth === keys.length) { combos.push({ ...current }); return; }
    const key = keys[depth];
    current[key] = urnMap[key].color;
    helper(depth + 1, current);
    current[key] = "lightgrey";
    helper(depth + 1, current);
  }
  helper(0, {});
  return combos;
}

// Builds the 2-urn training grid's scenarios, marking whichever combos
// match the examples just shown as `given` (with their explained ball
// carried over — unused by the plugins when show_explanation is false)
// so prediction-columns-plugin.js can render them inline as
// already-explained instead of a separate history view.
// Given cards always come first (top row) — not randomized in with the
// predict cards — so the layout is consistent while participants are
// still learning what "given" means; only the order *within* each group
// is shuffled for variety.
function buildTwoUrnScenarios(urnMap, givenExamples) {
  const scenarios = generateTwoUrnCombos(urnMap).map((draw, idx) => {
    const match = givenExamples.find((ex) => ex.draw.A === draw.A && ex.draw.B === draw.B);
    return {
      id: idx + 1,
      draw: draw,
      given: !!match,
      selected_urn: match ? match.cause_urn : undefined,
      selected_color: match ? match.cause_color : undefined
    };
  });
  const given = shuffleArray(scenarios.filter((sc) => sc.given));
  const predict = shuffleArray(scenarios.filter((sc) => !sc.given));
  return given.concat(predict);
}

// Returns a copy of `scenarios` with `given: true` on the first
// `givenCount` (the main task's fixed shuffled order, so which ones are
// given only grows round to round) — used instead of mutating the shared
// array so each round's prediction-columns-plugin.js call gets its own
// independent given/predict split.
function withGivenFlags(scenarios, givenCount) {
  return scenarios.map((sc, idx) => ({ ...sc, given: idx < givenCount }));
}

// ===== Debrief rule sentence =====
// Uses rules.js's own ruleTemplates ("{low} and {high} ball, or ..."),
// loaded as a global via rules.js's <script> tag (before this file) in
// main.html — but fills them in with UrnUtils.getArticle/getDisplayColor/
// normalizeColor on the raw color instead of rules.js's own
// fillRuleTemplate + colorizeWithSpans. Those only recognize the literal
// words "pink/orange/blue/purple" via regex, so a color like "hotpink"
// (this app's actual palette) silently comes out unarticled and
// uncolored; substituting the already-safe "a/an <span>...</span>" text
// directly avoids that. Which of the 4 urns plays the "high"/"medHigh"/
// "medLow"/"low" role is determined by relative draw probability
// (rankUrnKeysByProb), not a fixed urn key.
function buildRuleSentence(ruleKey, urnMap) {
  const utils = window.UrnUtils;
  const [highKey, medHighKey, medLowKey, lowKey] = rankUrnKeysByProb(urnMap);
  const coloredWord = (urnKey) => {
    const color = urnMap[urnKey].color;
    return `${utils.getArticle(color)} <span class="urn-ball-text" style="color:${utils.getDisplayColor(color)};">${utils.normalizeColor(color)}</span>`;
  };
  const template = ruleTemplates[ruleKey];
  if (!template) return null;
  const labels = {
    high: coloredWord(highKey),
    medHigh: coloredWord(medHighKey),
    medLow: coloredWord(medLowKey),
    low: coloredWord(lowKey)
  };
  const description = template.replace(/\{(high|medHigh|medLow|low)\}/g, (_, role) => labels[role]);
  return `To win, you must draw ${description}.`;
}

// ===== Save-data helper =====
// Takes jsPsych/subject_id/useMockData explicitly rather than assuming
// they're in scope — see the file header for why they can't just be
// referenced as bare identifiers from here.
// condition is optional (exp2noexpl's single-condition safe_save.php
// ignores the field entirely) — exp2inf passes "explanation" or
// "no_explanation" so its own safe_save.php can route to the right save
// location and only run the dataset-ledger promotion step for
// "explanation" sessions.
function saveDataToServerAsCSV(jsPsychInstance, subjectId, filenamePrefix, useMockData, done = null, condition = null) {
  const csv = jsPsychInstance.data.get().csv();
  const filename = `${filenamePrefix}_${subjectId}.csv`;

  if (useMockData) {
    console.log(`[mock] Skipping safe_save.php — would have saved ${filename}:`, csv);
    if (done) done(true);
    return;
  }

  const body = { filename: filename, filedata: csv, exp2_subject_id: subjectId };
  if (condition) body.condition = condition;

  fetch("safe_save.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
    .then((res) => res.json().then((result) => ({ ok: res.ok, result })))
    .then(({ ok, result }) => {
      if (ok && result.status === "saved") {
        if (done) done(true);
      } else {
        console.error("safe_save.php error:", result && result.error);
        if (done) done(false);
      }
    })
    .catch((err) => {
      console.error("Network error saving data:", err);
      if (done) done(false);
    });
}

// ===== Condition-parameterized instructional text =====
// Identical in both conditions (no urns are ever drawn differently, and
// nothing about the walkthrough mechanics depends on show_explanation).
function mechanicsIntroHTML() {
  return `
    <div class="instructions-container">
      <h2>Instructions</h2>
      <p>In this study, you will be interacting with a game involving several boxes of colored and uncolored balls, which can be drawn from the boxes at random.
      Below is an example of two boxes with different colored balls:</p>
      ${renderUrnsHTML(twoUrnMap, twoUrnLabels, twoUrnBallsData, false, false)}
      <p>Note that some boxes have more colored balls than others, so the chances of drawing a colored ball differ from box to box.</p>
    </div>
  `;
}

function taskDescriptionHTML(showExplanation) {
  const explainedClause = showExplanation ? " and explained" : "";
  return `
    <h2>Task: predict the outcomes</h2>
    <p>Here, you will be shown a few draws from another player, John, which will be revealed${explainedClause} according to a rule which determines whether John won or lost in each draw.
    This rule will be shown for your reference.</p>
    <p>
    Next, you'll see a grid of 4 scenarios, including the two draws you just saw.
    You must predict the other two scenarios by selecting the <b>WON</b> or <b>LOST</b> buttons.</p>
  `;
}

function aDifferentRuleHTML(showExplanation) {
  const revealedClause = showExplanation ? "outcomes revealed and explained" : "outcomes revealed";
  return `
    <h2>A different rule</h2>
    <p>Now you will try a different rule.
    Again, you will observe two draws with their ${revealedClause}. Then, just like before, you'll predict the remaining two scenarios in a grid using the <b>WON</b> or <b>LOST</b> buttons.</p>
  `;
}

// Identical in both conditions — no rule or explanation is shown here
// either way, just free practice draws to get a feel for the boxes.
function theFullGameHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData) {
  return `
    <h2>The full game</h2>
    <p>Now you will be interacting with a game with four boxes instead of two, the same as the ones used in the main study.</p>
    ${renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, false, false)}
    <p>Try drawing from all four boxes to get familiar with them. There's no rule to worry about yet, just get a feel for the boxes.</p>
  `;
}

function preExperimentHTML(showExplanation, totalRounds) {
  const givenClause = showExplanation ? ", each with an explanation of the outcome" : "";
  const revealedVerb = showExplanation ? "revealed and explained" : "shown";
  const highlightedClause = showExplanation
    ? "The given outcomes and explanations are highlighted."
    : "The given outcomes are highlighted.";
  return `
    <h2>You are now ready for the study!</h2>
    <p><b>Unlike the practice rounds, you will not be shown the rule this time. Your task is to predict whether John would win or lose based on the observations you're given.</b></p>
    <p>Here's how the task works:</p>
    <ul>
      <li>You'll be given 4 observations of John playing the game${givenClause}.</li>
      <li>Your task is to predict whether John would win or lose on the remaining scenarios.</li>
      <li>There will be ${totalRounds} prediction rounds. Each round, 4 more outcomes are ${revealedVerb}, so the number of predictions you need to make shrinks: 12, then 8, then 4.</li>
      <li>${highlightedClause} For the rest, select WON or LOST to make your prediction.</li>
      <li>After each round except the last, you'll receive feedback on your first four predictions. Those same four scenarios will then be given in the next round.</li>
    </ul>
    <p>When you are ready, click the <b>Start</b> button.</p>
  `;
}

// Identical in both conditions — ruleSentenceOrFallback is already the
// full "To win, you must draw ..." sentence (or the not-found fallback
// message) computed by the caller via buildRuleSentence.
function ruleRevealHTML(ruleSentenceOrFallback, fourUrnHtmlStatic) {
  return `
    <div class="instructions-container">
      <h2>The rule</h2>
      <p>Here's the rule that determined whether John won or lost, along with the four boxes used throughout the study.</p>
    </div>
    <div class="highlight-box">
      <h2 style="color: red;">THE RULE</h2>
      <p><strong>${ruleSentenceOrFallback}</strong></p>
    </div>
    ${fourUrnHtmlStatic}
  `;
}

const RULE_GUESS_QUESTION = {
  prompt: "Before we show you the results, please describe in your own words what you think the rule was.",
  name: "rule_guess",
  rows: 4,
  columns: 60,
  required: true
};

const THANK_YOU_HTML = `
  <h2>Thank you for participating!</h2>
  <div class="instructions-container">
    <p>Please click the <b>'Go to Prolific'</b> button below, or use the code <b>XXXXXXXX</b> to confirm your participation on Prolific.</p>
  </div>
`;
