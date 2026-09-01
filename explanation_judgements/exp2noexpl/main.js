// ===== Shuffle / chunk helpers =====
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ===== Generalized urn rendering (parameterized by urn_map) — this file
// needs both a 2-urn training map and a 4-urn real map. =====
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

function sampleDraw(urnMap) {
  const draw = {};
  for (const urnKey in urnMap) {
    draw[urnKey] = Math.random() < urnMap[urnKey].prob ? urnMap[urnKey].color : "lightgrey";
  }
  return draw;
}

// ===== 2-urn training config =====
// Purely instructional — teaches what a rule/prediction task looks like
// before the real 4-urn task, whose rule/urns are generated fresh below
// (see buildRandomFourUrnAssignment) rather than tied to any experiment_1
// participant, since this condition never shows an explanation to begin
// with.
const twoUrnMap = {
  A: { color: "orange", prob: 0.7 },
  B: { color: "blue", prob: 0.5 }
};
const twoUrnLabels = buildUrnLabels(twoUrnMap);
const twoUrnBallsData = getOrCreateUrnsData(twoUrnMap);
const twoUrnHtmlInteractive = renderUrnsHTML(twoUrnMap, twoUrnLabels, twoUrnBallsData, true);
const twoUrnHtmlStatic = renderUrnsHTML(twoUrnMap, twoUrnLabels, twoUrnBallsData, false);

const disjunctiveRuleText = `<div class="highlight-box"><h2>RULE</h2><p><strong>To win, you need an <span style="color:orange">orange</span> ball, a <span style="color:blue">blue</span> ball, or both.</strong></p></div>`;
const conjunctiveRuleText = `<div class="highlight-box"><h2>RULE</h2><p><strong>To win, you need both an <span style="color:orange">orange</span> ball AND a <span style="color:blue">blue</span> ball.</strong></p></div>`;

const disjunctiveRuleFn = (draw) => draw.A !== "lightgrey" || draw.B !== "lightgrey";
const conjunctiveRuleFn = (draw) => draw.A !== "lightgrey" && draw.B !== "lightgrey";

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
// match the examples just shown as `given` so prediction-grid-plugin.js
// can render them inline as already-shown instead of a separate history
// view. No selected_urn/selected_color here — with show_explanation:false
// the plugins never look at those fields.
function buildTwoUrnScenarios(urnMap, givenExamples) {
  const scenarios = generateTwoUrnCombos(urnMap).map((draw, idx) => {
    const match = givenExamples.find((ex) => ex.draw.A === draw.A && ex.draw.B === draw.B);
    return { id: idx + 1, draw: draw, given: !!match };
  });
  return shuffleArray(scenarios);
}

// Returns a copy of `scenarios` with `given: true` on the first
// `givenCount` (the main task's fixed shuffled order, so which ones are
// given only grows round to round) — used instead of mutating the shared
// array so each round's prediction-navigator-plugin.js call gets its own
// independent given/predict split.
function withGivenFlags(scenarios, givenCount) {
  return scenarios.map((sc, idx) => ({ ...sc, given: idx < givenCount }));
}

// ===== 4-urn rule + config: generated fresh for every session, exactly
// like nic_experiment1's own setup (same fixed colors, same shuffled
// probability set, same 5 rules over probability-rank roles) — this
// condition never claims experiment_1 data, since there's no explanation
// to show and so nothing about a specific past participant's selections
// is needed. A rule is just picked at random from the same 5. =====
const FIXED_URN_COLORS = { A: "orange", B: "blue", C: "purple", D: "hotpink" };

const RULES = {
  rule1: (draw, k) => (draw[k.highKey] !== "lightgrey" && draw[k.lowKey] !== "lightgrey") || draw[k.medLowKey] !== "lightgrey",
  rule2: (draw, k) => (draw[k.highKey] !== "lightgrey" || draw[k.lowKey] !== "lightgrey") && draw[k.medLowKey] !== "lightgrey",
  rule3: (draw, k) => draw[k.highKey] !== "lightgrey" && draw[k.medHighKey] !== "lightgrey" && draw[k.lowKey] !== "lightgrey",
  rule4: (draw, k) => draw[k.highKey] !== "lightgrey" || draw[k.medHighKey] !== "lightgrey" || draw[k.lowKey] !== "lightgrey",
  rule5: (draw, k) => (draw[k.highKey] !== "lightgrey") !== (draw[k.medLowKey] !== "lightgrey")
};

function generateAllFourUrnCombos(urnMap) {
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

function buildRandomFourUrnAssignment() {
  const shuffledProbs = shuffleArray([0.9, 0.6, 0.4, 0.1]);
  const urnMap = {};
  Object.keys(FIXED_URN_COLORS).forEach((key, idx) => {
    urnMap[key] = { color: FIXED_URN_COLORS[key], prob: shuffledProbs[idx] };
  });

  const positionByProb = {};
  Object.entries(urnMap).forEach(([key, urn]) => { positionByProb[urn.prob] = key; });
  const roleKeys = {
    highKey: positionByProb[0.9],
    medHighKey: positionByProb[0.6],
    medLowKey: positionByProb[0.4],
    lowKey: positionByProb[0.1]
  };

  const ruleKeys = Object.keys(RULES);
  const ruleKey = ruleKeys[Math.floor(Math.random() * ruleKeys.length)];
  const ruleFn = (draw) => RULES[ruleKey](draw, roleKeys);

  const scenarios = shuffleArray(generateAllFourUrnCombos(urnMap).map((draw, idx) => ({
    id: idx + 1,
    draw: draw,
    result: ruleFn(draw) ? "win" : "lose"
  })));

  return { urnMap, ruleKey, scenarios };
}

// ===== Bootstrap =====
// Unlike exp2inf, nothing here needs to be fetched from a server before
// building the timeline — the rule/urn config is generated entirely
// client-side (buildRandomFourUrnAssignment above) — so this can run
// synchronously. jsPsych doesn't create its display element until
// jsPsych.run() actually starts, so nothing before that call may touch
// jsPsych.getDisplayElement().
let jsPsych;
const subject_id = "subj_" + Math.random().toString(36).substring(2, 10);

// Dev-only preview path: open main.html?mock=1 to skip the final
// safe_save.php POST (so the whole timeline can be run from a plain
// file:// page with no server at all) — everything else already runs
// with no server dependency.
const useMockData = new URLSearchParams(window.location.search).get("mock") === "1";

// ===== Save Data Helper =====
function saveDataToServerAsCSV(done = null) {
  const csv = jsPsych.data.get().csv();
  const filename = `causal_inf_exp2_noexpl_${subject_id}.csv`;

  if (useMockData) {
    console.log(`[mock] Skipping safe_save.php — would have saved ${filename}:`, csv);
    if (done) done(true);
    return;
  }

  fetch("safe_save.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: filename, filedata: csv, exp2_subject_id: subject_id })
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

function bootstrap() {
  const { urnMap: fourUrnMap, ruleKey, scenarios: shuffledScenarios } = buildRandomFourUrnAssignment();
  const fourUrnLabels = buildUrnLabels(fourUrnMap);
  const fourUrnBallsData = getOrCreateUrnsData(fourUrnMap);
  const fourUrnHtmlInteractive = renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, true);
  const fourUrnHtmlStatic = renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, false);
  const urnKeysFour = Object.keys(fourUrnMap);

  jsPsych = initJsPsych();

  jsPsych.data.addProperties({
    subject_id: subject_id,
    condition: "no_explanation",
    rule_key: ruleKey,
    urn_colors: JSON.stringify(urnKeysFour.map((k) => fourUrnMap[k].color)),
    urn_probs: JSON.stringify(urnKeysFour.map((k) => parseFloat(fourUrnMap[k].prob.toFixed(2))))
  });

  const timeline = [];

  // ----- Consent & Prolific ID -----
  timeline.push(consentTrial);
  timeline.push({
    type: jsPsychSurveyText,
    questions: [{ prompt: "Please enter your Prolific ID:", name: "prolific_id", required: true }],
    data: { question_id: "prolific_entry" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Step 1: 2-urn mechanics walkthrough (no rule yet) =====
  const mechanicsIntroHTML = `
    <div class="instructions-container">
      <h2>Instructions</h2>
      <p>In this study, you will watch draws made from boxes containing a mix of grey balls and balls in a color unique to that box. To start, here are two of these boxes:</p>
      ${renderUrnsHTML(twoUrnMap, twoUrnLabels, twoUrnBallsData, false, false)}
      <p style="font-style: italic;">Some boxes have more colored balls than others, so the chances of drawing a colored ball differ from box to box.</p>
    </div>
  `;
  const mechanicsOutroHTML = `
    <div class="instructions-container">
      <h2>Your turn</h2>
      <p>Now try drawing from the boxes yourself a few times, so you can get a feel for how it works.</p>
    </div>
  `;
  timeline.push({
    type: jsWalkthroughInstructions,
    intro_html: mechanicsIntroHTML,
    outro_html: mechanicsOutroHTML,
    urn_html: twoUrnHtmlInteractive,
    urn_map: twoUrnMap,
    draw: sampleDraw(twoUrnMap),
    urn_keys: ["A", "B"],
    rule_fn: null,
    include_rule_pages: false,
    question_id: "mechanics_walkthrough",
    finish_button_label: "Continue",
    data: { question_id: "mechanics_walkthrough" }
  });

  timeline.push({
    type: jsInteractiveDrawSingle,
    show_rule: false,
    show_result: false,
    urn_html: twoUrnHtmlInteractive,
    urn_map: twoUrnMap,
    draws: shuffleArray(Array.from({ length: 4 }, () => sampleDraw(twoUrnMap))),
    urn_keys: ["A", "B"],
    agent_name: "you",
    question_id: "mechanics_familiarisation",
    max_samples: 4,
    finish_button_label: "Continue",
    data: { question_id: "mechanics_familiarisation" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Steps 2-3: disjunctive rule — outcome examples, then predict =====
  const disjunctiveExamples = [
    { id: 1, draw: { A: twoUrnMap.A.color, B: "lightgrey" }, outcome: "win" },
    { id: 2, draw: { A: "lightgrey", B: twoUrnMap.B.color }, outcome: "win" }
  ];

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>The rule</h2>
        <p>Each set of boxes has a <b>rule</b> that determines whether a draw results in a <span class="win">win</span> or a <span class="lose">loss</span>.</p>
        <p>We'll show you two example draws, along with their outcome.</p>
      </div>`,
    choices: ["Continue"],
    data: { question_id: "pre_disjunctive_examples" }
  });

  timeline.push({
    type: jsExplanationExample,
    examples: disjunctiveExamples,
    rule_text: disjunctiveRuleText,
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "You",
    show_explanation: false,
    question_id: "disjunctive_examples",
    finish_button_label: "Continue",
    data: { question_id: "disjunctive_examples" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>Now you try</h2>
        <p>Here are all 4 possible draws from these two boxes. Two of them are the examples you just saw — highlighted in yellow — so just confirm the outcome shown. Predict the outcome for the other two. You'll need to get everything correct to continue.</p>
      </div>`,
    choices: ["Continue"],
    data: { question_id: "pre_disjunctive_prediction" }
  });

  timeline.push({
    type: jsPredictionGrid,
    scenarios: buildTwoUrnScenarios(twoUrnMap, disjunctiveExamples),
    rule_text: disjunctiveRuleText,
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "You",
    rule_fn: disjunctiveRuleFn,
    show_explanation: false,
    question_id: "disjunctive_prediction",
    data: { question_id: "disjunctive_prediction" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Step 4: conjunctive rule — same two-step pattern, loss examples =====
  const conjunctiveExamples = [
    { id: 1, draw: { A: twoUrnMap.A.color, B: "lightgrey" }, outcome: "lose" },
    { id: 2, draw: { A: "lightgrey", B: twoUrnMap.B.color }, outcome: "lose" }
  ];

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>A different rule</h2>
        <p>Boxes can have different rules. Here's another example.</p>
        <p>This time we'll show you two example draws that lost, along with their outcome.</p>
      </div>`,
    choices: ["Continue"],
    data: { question_id: "pre_conjunctive_examples" }
  });

  timeline.push({
    type: jsExplanationExample,
    examples: conjunctiveExamples,
    rule_text: conjunctiveRuleText,
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "You",
    show_explanation: false,
    question_id: "conjunctive_examples",
    finish_button_label: "Continue",
    data: { question_id: "conjunctive_examples" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>Now you try</h2>
        <p>Here are all 4 possible draws under this new rule. Two are the examples you just saw — highlighted in yellow — so just confirm the outcome shown. Predict the outcome for the other two.</p>
      </div>`,
    choices: ["Continue"],
    data: { question_id: "pre_conjunctive_prediction" }
  });

  timeline.push({
    type: jsPredictionGrid,
    scenarios: buildTwoUrnScenarios(twoUrnMap, conjunctiveExamples),
    rule_text: conjunctiveRuleText,
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "You",
    rule_fn: conjunctiveRuleFn,
    show_explanation: false,
    question_id: "conjunctive_prediction",
    data: { question_id: "conjunctive_prediction" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Step 5: introduce the 4-urn setup, no rule shown =====
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>The full game</h2>
        <p>Now you will be interacting with a game with four boxes instead of two, the same as the ones used in the main study.</p>
        ${renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, false, false)}
        <p>Try drawing from all four a few times to get familiar with them. There's no rule to worry about yet — just get a feel for the boxes.</p>
      </div>`,
    choices: ["Continue"],
    data: { question_id: "pre_four_urn_familiarisation" }
  });

  timeline.push({
    type: jsInteractiveDrawSingle,
    show_rule: false,
    show_result: false,
    urn_html: fourUrnHtmlInteractive,
    urn_map: fourUrnMap,
    draws: shuffleArray(Array.from({ length: 5 }, () => sampleDraw(fourUrnMap))),
    urn_keys: urnKeysFour,
    agent_name: "you",
    question_id: "four_urn_familiarisation",
    max_samples: 5,
    finish_button_label: "Continue to the study",
    data: { question_id: "four_urn_familiarisation" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Steps 6-8: the main inference task =====
  // One fixed shuffled order for all 16 scenarios (generated above, no
  // experiment_1 record involved), used across all 3 rounds. Each round
  // widens the "given" prefix (4, then 8, then 12) — those scenarios are
  // shown with just their outcome highlighted (no explanation, since there
  // is none) right inside the same 4-page nav as the still-to-predict
  // ones. The last 4 scenarios are never shown, in any round — they're the
  // held-out generalization test.
  const roundGivenCounts = [4, 8, 12];

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>You are now ready for the study!</h2>
        <p>You will see a set of draws that were taken by another player, John, made from these same four boxes under one fixed rule. The outcome of some of John's draws will be shown to you.</p>
        <p>All 16 possible draws are shown across 4 pages (4 per page), which you can navigate freely. Draws whose outcome has already been shown are highlighted — for those, click the outcome shown. For the rest, predict whether John would win or lose. You will not be told whether your predictions are correct.</p>
        <p class="instruction-callout">If you have trouble seeing the balls and boxes clearly, please set your browser zoom to <b>100%</b> (Ctrl+0, or Cmd+0 on Mac).</p>
        <p>When you are ready, click the <b>Start</b> button.</p>
      </div>`,
    choices: ["Start"],
    data: { question_id: "pre_experiment" }
  });

  roundGivenCounts.forEach((givenCount, roundIdx) => {
    if (roundIdx > 0) {
      timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: `
          <div class="instructions-container">
            <h2>More outcomes shown</h2>
            <p>The outcome has now been shown for ${givenCount} of the 16 draws — those are highlighted below. Confirm the outcome shown for those, and predict the rest.</p>
          </div>`,
        choices: ["Continue"],
        data: { question_id: `pre_round_${roundIdx + 1}` }
      });
    }

    timeline.push({
      type: jsPredictionNavigator,
      scenarios: withGivenFlags(shuffledScenarios, givenCount),
      urn_html: fourUrnHtmlStatic,
      urn_map: fourUrnMap,
      urn_keys: urnKeysFour,
      agent_name: "John",
      show_explanation: false,
      question_id: `prediction_round_${roundIdx + 1}`,
      submit_button_label: "Submit All",
      data: { question_id: `prediction_round_${roundIdx + 1}` },
      on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
    });
  });

  const finalRoundQuestionId = `prediction_round_${roundGivenCounts.length}`;

  // ----- Rule guess, then a debrief showing how the final round's answers compared to the truth -----
  timeline.push({
    type: jsPsychSurveyText,
    questions: [
      {
        prompt: "Before we show you the results, please describe in your own words what you think the rule was.",
        name: "rule_guess",
        rows: 4,
        columns: 60,
        required: true
      }
    ],
    data: { question_id: "rule_guess" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsPredictionReview,
    scenarios: shuffledScenarios,
    review_question_id: finalRoundQuestionId,
    urn_html: fourUrnHtmlStatic,
    urn_map: fourUrnMap,
    urn_keys: urnKeysFour,
    agent_name: "John",
    show_explanation: false,
    question_id: "prediction_review",
    data: { question_id: "prediction_review" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ----- Demographics, feedback, save -----
  timeline.push(demographicTrial);
  timeline.push(feedbackTrial);

  timeline.push({
    type: jsPsychCallFunction,
    async: true,
    func: (done) => {
      jsPsych.data.get().values().forEach((trial) => { delete trial.stimulus; });

      saveDataToServerAsCSV((success) => {
        if (success) {
          jsPsych.getDisplayElement().innerHTML = "";
          jsPsych.run([
            {
              type: jsPsychHtmlButtonResponse,
              stimulus: `
                <h2>Thank you for participating!</h2>
                <div class="instructions-container">
                  <p>Please click the <b>'Go to Prolific'</b> button below, or use the code <b>XXXXXXXX</b> to confirm your participation on Prolific.</p>
                </div>`,
              choices: ["Go to Prolific"],
              on_finish: () => {
                // TODO: replace XXXXXXXX / this URL with the real Prolific completion code once this study exists on Prolific.
                window.location.href = "https://app.prolific.com/submissions/complete?cc=XXXXXXXX";
              }
            }
          ]);
        } else {
          alert("There was a problem saving your data. Please check your connection and try again.");
        }
      });
    }
  });

  jsPsych.run(timeline);
}

bootstrap();
