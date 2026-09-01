// ===== Shuffle / chunk helpers =====
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ===== Generalized urn rendering (parameterized by urn_map, unlike
// nic_experiment1's copy which closes over a single module-level 4-urn
// map) — this file needs both a 2-urn training map and a 4-urn real map. =====
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
// Purely instructional — teaches what a rule/explanation/prediction looks
// like before the real 4-urn task, whose urns come from the assigned
// experiment_1 record instead (see bootstrap()).
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
// match the examples just shown as `given` (with their explained ball
// carried over) so prediction-grid-plugin.js can render them inline as
// already-explained instead of a separate history view.
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

// ===== Bootstrap: fetch the assigned experiment_1 dataset before building
// anything else, since the main task's urns/scenarios come from it.
//
// This is the explanation-condition build of the study — a separate
// no-explanation build is its own deployment rather than a runtime branch
// here, so there's no condition dispatcher to call.
//
// jsPsych doesn't create its display element until jsPsych.run() actually
// starts, so getDisplayElement() is unusable for the loading/error states
// shown *before* that — write to document.body directly instead, and
// clear it right before run() so nothing is left over alongside jsPsych's
// own container. =====
let jsPsych;
const subject_id = "subj_" + Math.random().toString(36).substring(2, 10);

// Dev-only preview path: open main.html?mock=1 (even as a plain file://
// page, or via any static server) to run the whole timeline against a
// bundled sample record with no PHP involved at all — useful for eyeballing
// the design. Real runs (no query param) always go through
// assign_dataset.php. See test-harness/ for the equivalent fixture used
// when testing assign_dataset.php itself via `php -S`.
const useMockData = new URLSearchParams(window.location.search).get("mock") === "1";

const MOCK_DATASET = {
  subject_id: "subj_mockpreview",
  rule_key: "rule4",
  urn_colors: { A: "orange", B: "blue", C: "purple", D: "hotpink" },
  urn_probs: { A: 0.9, B: 0.6, C: 0.4, D: 0.1 },
  scenarios: [
    { id: 1, draw: { A: "orange", B: "blue", C: "purple", D: "hotpink" }, result: "win", selected_urn: "B", selected_color: "blue" },
    { id: 2, draw: { A: "orange", B: "blue", C: "purple", D: "lightgrey" }, result: "win", selected_urn: "B", selected_color: "blue" },
    { id: 3, draw: { A: "orange", B: "blue", C: "lightgrey", D: "hotpink" }, result: "win", selected_urn: "A", selected_color: "orange" },
    { id: 4, draw: { A: "orange", B: "blue", C: "lightgrey", D: "lightgrey" }, result: "win", selected_urn: "A", selected_color: "orange" },
    { id: 5, draw: { A: "orange", B: "lightgrey", C: "purple", D: "hotpink" }, result: "win", selected_urn: "A", selected_color: "orange" },
    { id: 6, draw: { A: "orange", B: "lightgrey", C: "purple", D: "lightgrey" }, result: "win", selected_urn: "A", selected_color: "orange" },
    { id: 7, draw: { A: "orange", B: "lightgrey", C: "lightgrey", D: "hotpink" }, result: "win", selected_urn: "A", selected_color: "orange" },
    { id: 8, draw: { A: "orange", B: "lightgrey", C: "lightgrey", D: "lightgrey" }, result: "win", selected_urn: "A", selected_color: "orange" },
    { id: 9, draw: { A: "lightgrey", B: "blue", C: "purple", D: "hotpink" }, result: "win", selected_urn: "B", selected_color: "blue" },
    { id: 10, draw: { A: "lightgrey", B: "blue", C: "purple", D: "lightgrey" }, result: "win", selected_urn: "B", selected_color: "blue" },
    { id: 11, draw: { A: "lightgrey", B: "blue", C: "lightgrey", D: "hotpink" }, result: "win", selected_urn: "D", selected_color: "hotpink" },
    { id: 12, draw: { A: "lightgrey", B: "blue", C: "lightgrey", D: "lightgrey" }, result: "win", selected_urn: "B", selected_color: "blue" },
    { id: 13, draw: { A: "lightgrey", B: "lightgrey", C: "purple", D: "hotpink" }, result: "win", selected_urn: "D", selected_color: "hotpink" },
    { id: 14, draw: { A: "lightgrey", B: "lightgrey", C: "purple", D: "lightgrey" }, result: "lose", selected_urn: "B", selected_color: "lightgrey" },
    { id: 15, draw: { A: "lightgrey", B: "lightgrey", C: "lightgrey", D: "hotpink" }, result: "win", selected_urn: "D", selected_color: "hotpink" },
    { id: 16, draw: { A: "lightgrey", B: "lightgrey", C: "lightgrey", D: "lightgrey" }, result: "lose", selected_urn: "A", selected_color: "lightgrey" }
  ]
};

async function fetchDataset() {
  if (useMockData) return MOCK_DATASET;
  const res = await fetch(`assign_dataset.php?exp2_subject_id=${encodeURIComponent(subject_id)}`);
  const body = await res.json();
  if (!res.ok || !body.dataset) throw new Error(body.code || body.error || "Failed to assign dataset");
  return body.dataset;
}

function showLoadingMessage() {
  document.body.innerHTML = `
    <div class="instructions-container">
      <p>Loading study...</p>
    </div>
  `;
}

function showFatalError(message) {
  document.body.innerHTML = `
    <div class="instructions-container">
      <h2>Unable to start the study</h2>
      <p>${message}</p>
      <p>Please try again later, or return this study on Prolific if it's no longer available.</p>
    </div>
  `;
}

// When there's no unclaimed experiment_1 data left, route the participant
// to the no-explanation sibling study instead of a dead end — it never
// needs experiment_1 data (its rule/urns are generated fresh client-side),
// so it can always accept them. Sibling folder, so a relative path; any
// query string (e.g. ?mock=1 while testing) carries over.
function redirectToNoExplanationStudy() {
  const search = window.location.search || "";
  window.location.href = `../exp2noexpl/main.html${search}`;
}

// ===== Save Data Helper =====
function saveDataToServerAsCSV(done = null) {
  const csv = jsPsych.data.get().csv();
  const filename = `causal_inf_exp2_${subject_id}.csv`;

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

async function bootstrap() {
  showLoadingMessage();

  let record;
  try {
    record = await fetchDataset();
  } catch (err) {
    if (err && err.message === "no_data_available") {
      redirectToNoExplanationStudy();
      return;
    }
    console.error(err);
    showFatalError("There was a problem starting the study.");
    return;
  }

  // ===== 4-urn config, taken from the assigned experiment_1 record so the
  // urns on screen match what its explanations refer to. =====
  const fourUrnMap = {};
  Object.keys(record.urn_colors).forEach((key) => {
    fourUrnMap[key] = { color: record.urn_colors[key], prob: record.urn_probs[key] };
  });
  const fourUrnLabels = buildUrnLabels(fourUrnMap);
  const fourUrnBallsData = getOrCreateUrnsData(fourUrnMap);
  const fourUrnHtmlInteractive = renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, true);
  const fourUrnHtmlStatic = renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, false);
  const urnKeysFour = Object.keys(fourUrnMap);

  document.body.innerHTML = ""; // clear the loading message before jsPsych attaches its own container
  jsPsych = initJsPsych();

  jsPsych.data.addProperties({
    subject_id: subject_id,
    condition: "explanation",
    exp1_subject_id: record.subject_id,
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

  // ===== Steps 2-3: disjunctive rule — explanation examples, then predict + history =====
  const disjunctiveExamples = [
    { id: 1, draw: { A: twoUrnMap.A.color, B: "lightgrey" }, outcome: "win", cause_urn: "A", cause_color: twoUrnMap.A.color },
    { id: 2, draw: { A: "lightgrey", B: twoUrnMap.B.color }, outcome: "win", cause_urn: "B", cause_color: twoUrnMap.B.color }
  ];

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>The rule</h2>
        <p>Each set of boxes has a <b>rule</b> that determines whether a draw results in a <span class="win">win</span> or a <span class="lose">loss</span>.</p>
        <p>We'll show you two example draws, along with an explanation of why each one won.</p>
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
    show_explanation: true,
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
        <p>Here are all 4 possible draws from these two boxes. Two of them are the examples you just saw — highlighted in yellow — so just confirm the outcome they state. Predict the outcome for the other two. You'll need to get everything correct to continue.</p>
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
    question_id: "disjunctive_prediction",
    data: { question_id: "disjunctive_prediction" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Step 4: conjunctive rule — same two-step pattern, loss examples =====
  const conjunctiveExamples = [
    { id: 1, draw: { A: twoUrnMap.A.color, B: "lightgrey" }, outcome: "lose", cause_urn: "B", cause_color: "lightgrey" },
    { id: 2, draw: { A: "lightgrey", B: twoUrnMap.B.color }, outcome: "lose", cause_urn: "A", cause_color: "lightgrey" }
  ];

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>A different rule</h2>
        <p>Boxes can have different rules. Here's another example.</p>
        <p>This time we'll show you two example draws that lost, along with an explanation of why.</p>
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
    show_explanation: true,
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
        <p>Here are all 4 possible draws under this new rule. Two are the examples you just saw — highlighted in yellow — so just confirm the outcome they state. Predict the outcome for the other two.</p>
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
  // One fixed shuffled order for all 16 scenarios, used across all 3
  // rounds. Each round widens the "given" prefix (4, then 8, then 12) —
  // those scenarios are shown already explained (ball highlighted,
  // explanation sentence, and an attention check on the stated outcome)
  // right inside the same 4-page nav as the still-to-predict ones, so the
  // observation history is part of the judgment task itself rather than a
  // separate panel. The last 4 scenarios are never explained, in any
  // round — they're the held-out generalization test.
  const shuffledScenarios = shuffleArray(record.scenarios.slice());
  const roundGivenCounts = [4, 8, 12];

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>You are now ready for the study!</h2>
        <p>You will see a set of draws that were taken by another player, John, made from these same four boxes under one fixed rule. Some of John's draws have already been explained by the game master, who knows the rule.</p>
        <p>All 16 possible draws are shown across 4 pages (4 per page), which you can navigate freely. Draws the game master has already explained are highlighted — for those, click the outcome the explanation states. For the rest, predict whether John would win or lose. You will not be told whether your predictions are correct.</p>
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
            <h2>More draws explained</h2>
            <p>The game master has now explained ${givenCount} of the 16 draws — those are highlighted below. Confirm the stated outcome for those, and predict the rest.</p>
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
