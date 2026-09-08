// ===== Shuffle / chunk helpers =====
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Red, centered "Practice Task N/2" banner, prepended to the plain
// html-button-response blurbs during the 2-urn training block (steps 2-4)
// — jsExplanationExample/jsPredictionGrid take the same text via their own
// practice_label param instead, since they build their markup themselves.
function practiceLabelHTML(n, total) {
  return `<div class="practice-task-label">Practice Task ${n}/${total}</div>`;
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

const disjunctiveRuleText = `<div class="highlight-box"><h2 style="color: red;">EXAMPLE RULE</h2><p><strong>To win, you need an <span style="color:orange">orange</span> ball, a <span style="color:blue">blue</span> ball, or both.</strong></p></div>`;

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
// Given cards always come first (top row of the 2x2 grid) — not
// randomized in with the predict cards — so the layout is consistent
// while participants are still learning what "given" means; only the
// order *within* each group is shuffled for variety.
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

  // ===== Steps 2-3 setup: needed before step 1, since the walkthrough now
  // demonstrates this same example (draw, rule, outcome, AND explanation)
  // end to end, using the first of these two examples verbatim. =====
  const disjunctiveExamples = [
    { id: 1, draw: { A: twoUrnMap.A.color, B: "lightgrey" }, outcome: "win", cause_urn: "A", cause_color: twoUrnMap.A.color },
    { id: 2, draw: { A: "lightgrey", B: twoUrnMap.B.color }, outcome: "win", cause_urn: "B", cause_color: twoUrnMap.B.color }
  ];

  // ===== Step 1: 2-urn mechanics + rule + explanation walkthrough =====
  // The rule and explanation concepts are introduced right here, inside
  // the same walkthrough that teaches drawing mechanics — via the
  // plugin's own rule/result/explanation pages — rather than as separate
  // later trials. The draw is fixed (not random) so every participant
  // sees the same probability/outcome/explanation text, and so it can
  // double as the first of the two examples shown right after.
  // Repeated/free-practice draws are reserved for the four-urn stage
  // (step 5); this walkthrough has just the one guided draw.
  const mechanicsIntroHTML = `
    <div class="instructions-container">
      <h2>Instructions</h2>
      <p>In this study, you will be interacting with a game involving several boxes of colored and uncolored balls, which can be drawn from the boxes at random.
      Below is an example of two boxes with different colored balls:</p>
      ${renderUrnsHTML(twoUrnMap, twoUrnLabels, twoUrnBallsData, false, false)}
      <p>Note that some boxes have more colored balls than others, so the chances of drawing a colored ball differ from box to box.</p>
    </div>
  `;
  timeline.push({
    type: jsWalkthroughInstructions,
    intro_html: mechanicsIntroHTML,
    urn_html: twoUrnHtmlInteractive,
    urn_map: twoUrnMap,
    draw: disjunctiveExamples[0].draw,
    urn_keys: ["A", "B"],
    rule_fn: disjunctiveRuleFn,
    rule_text: disjunctiveRuleText,
    include_rule_pages: true,
    show_explanation: true,
    cause_urn: disjunctiveExamples[0].cause_urn,
    cause_color: disjunctiveExamples[0].cause_color,
    question_id: "mechanics_walkthrough",
    finish_button_label: "Continue",
    data: { question_id: "mechanics_walkthrough" }
  });

  // ===== Steps 2-3: disjunctive rule — "Practice Task 1/2": task
  // description, both examples, then predict. No rule box anywhere in this
  // block — they're playing the (practice) inference game now, same as
  // the real task, so the rule has to be inferred from the two given
  // examples rather than read off a box. (The rule box they saw inside
  // the walkthrough doesn't count against that — that was before "the
  // task" began.) =====
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      ${practiceLabelHTML(1, 2)}
      <div class="instructions-container">
        <h2>Practice Task</h2>
        <p>Your task is to observe a few draws from another player, John. A fixed but hidden rule determines whether John won or lost. Based on these observations, you will make predictions about whether John would win or lose under the fixed (but hidden) rule.</p>
      </div>`,
    choices: ["Continue"],
    data: { question_id: "task_description" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsExplanationExample,
    // Both examples, no rule_text — the rule box they saw inside the
    // walkthrough doesn't get repeated here, since from this point on
    // they're practicing the same rule-inference the real task asks for.
    examples: disjunctiveExamples,
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "John",
    show_explanation: true,
    practice_label: "Practice Task 1/2",
    question_id: "disjunctive_examples",
    finish_button_label: "Continue",
    data: { question_id: "disjunctive_examples" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      ${practiceLabelHTML(1, 2)}
      <div class="instructions-container">
        <h2>Your task: predict the outcomes</h2>
        <p>Next, you'll see a grid of 4 scenarios, including the two draws you just saw — those are highlighted in yellow. You must predict the other two scenarios by selecting the <b>WON</b> or <b>LOST</b> buttons.</p>
      </div>`,
    choices: ["Continue"],
    data: { question_id: "pre_disjunctive_prediction" }
  });

  timeline.push({
    type: jsPredictionGrid,
    scenarios: buildTwoUrnScenarios(twoUrnMap, disjunctiveExamples),
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "John",
    rule_fn: disjunctiveRuleFn,
    practice_label: "Practice Task 1/2",
    question_id: "disjunctive_prediction",
    data: { question_id: "disjunctive_prediction" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Step 4: conjunctive rule — "Practice Task 2/2": one consolidated
  // intro, then the same examples-then-predict pattern with a genuinely
  // new rule, again with no rule box shown anywhere. =====
  const conjunctiveExamples = [
    { id: 1, draw: { A: twoUrnMap.A.color, B: "lightgrey" }, outcome: "lose", cause_urn: "B", cause_color: "lightgrey" },
    { id: 2, draw: { A: "lightgrey", B: twoUrnMap.B.color }, outcome: "lose", cause_urn: "A", cause_color: "lightgrey" }
  ];

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      ${practiceLabelHTML(2, 2)}
      <div class="instructions-container">
        <h2>A different rule</h2>
        <p>Now you will try a different rule. Let's practice the same task with a new example rule: you'll see two example draws that lost, along with an explanation of why. Then, just like before, you'll predict the remaining two scenarios in a grid using the WON/LOST buttons.</p>
      </div>`,
    choices: ["Continue"],
    data: { question_id: "pre_conjunctive_examples" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsExplanationExample,
    examples: conjunctiveExamples,
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "John",
    show_explanation: true,
    practice_label: "Practice Task 2/2",
    question_id: "conjunctive_examples",
    finish_button_label: "Continue",
    data: { question_id: "conjunctive_examples" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsPredictionGrid,
    scenarios: buildTwoUrnScenarios(twoUrnMap, conjunctiveExamples),
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "John",
    rule_fn: conjunctiveRuleFn,
    practice_label: "Practice Task 2/2",
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
  // rounds. Round 1 starts with the first 4 already given (highlighted,
  // ball + explanation shown) — the participant predicts the remaining
  // 12. After Submit, a streamlined feedback slide shows just a
  // correct/incorrect flag for the *first* 4 of those 12 predictions
  // (comparing their own submitted answer against the truth, no
  // ball/explanation reveal) — then round 2 shows those same 4 pre-filled
  // as "given," predicting the remaining 8, flags the next 4, and so on.
  // The last 4 scenarios (round 3's remaining predictions) are never
  // revealed at all, and get no feedback — they're the held-out
  // generalization test.
  const shuffledScenarios = shuffleArray(record.scenarios.slice());
  const roundGivenCounts = [4, 8, 12];
  const totalRounds = roundGivenCounts.length;

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>You are now ready for the study!</h2>
        <p>You will see a set of draws that were taken by another player, John, made from these same four boxes under one fixed rule.</p>
        <p>You will be given 4 observations of John playing the game, along with an explanation of each outcome. You will be required to predict the remaining scenarios.</p>
        <p>This is round 1 of ${totalRounds}. Every round, the outcome of 4 more scenarios will be shown, so the number of predictions you need to make shrinks each round: 12 now, then 8, then 4.</p>
        <p>All 16 possible draws are shown across 4 pages (4 per page), which you can navigate freely. Draws that have already been explained are highlighted. For the rest, predict whether John would win or lose. You will not be told whether your predictions are correct, except for the first 4 of them — after you submit, we'll show you whether those specific ones were right before moving to the next round.</p>
        <p>When you are ready, click the <b>Start</b> button.</p>
      </div>`,
    choices: ["Start"],
    data: { question_id: "pre_experiment" }
  });

  roundGivenCounts.forEach((givenCount, roundIdx) => {
    const roundNumber = roundIdx + 1;

    timeline.push({
      type: jsPredictionNavigator,
      scenarios: withGivenFlags(shuffledScenarios, givenCount),
      urn_html: fourUrnHtmlStatic,
      urn_map: fourUrnMap,
      urn_keys: urnKeysFour,
      agent_name: "John",
      round_number: roundNumber,
      total_rounds: totalRounds,
      question_id: `prediction_round_${roundNumber}`,
      submit_button_label: "Submit All",
      data: { question_id: `prediction_round_${roundNumber}` },
      on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
    });

    // No feedback after the last round — it goes straight to the rule
    // guess text response instead.
    const isLastRound = roundIdx === totalRounds - 1;
    if (!isLastRound) {
      timeline.push({
        type: jsBatchFeedback,
        scenarios: shuffledScenarios.slice(givenCount, givenCount + 4),
        review_question_id: `prediction_round_${roundNumber}`,
        urn_html: fourUrnHtmlStatic,
        urn_map: fourUrnMap,
        urn_keys: urnKeysFour,
        agent_name: "John",
        question_id: `batch_feedback_${roundNumber}`,
        data: { question_id: `batch_feedback_${roundNumber}` },
        on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
      });
    }
  });

  // ----- Rule guess, then a plain-text reveal of the actual rule (not a
  // grid auditing every prediction against the truth — the point here is
  // learning what the rule was) -----
  // record.rule_key is one of "rule1".."rule5" (see the experiment_1
  // ledger schema / exp1cs/rules.js's original definitions); which of the
  // 4 urns plays the "high"/"medHigh"/"medLow"/"low" role in that rule's
  // template is determined by relative draw probability (urn_probs), not
  // a fixed urn key.
  const RULE_SENTENCE_TEMPLATES = {
    rule1: (c) => `Either both ${c.low} and ${c.high}, or ${c.medLow} (or all three).`,
    rule2: (c) => `Either ${c.high} and ${c.medLow} together, or ${c.low} and ${c.medLow} together (or all three).`,
    rule3: (c) => `${c.high}, ${c.medHigh}, and ${c.low}, all together.`,
    rule4: (c) => `At least one of: ${c.high}, ${c.medHigh}, or ${c.low}.`,
    rule5: (c) => `Either ${c.high} or ${c.medLow}, but not both.`
  };

  function buildRuleSentence(rec) {
    const utils = window.UrnUtils;
    const rankedKeys = Object.keys(rec.urn_probs).sort((a, b) => rec.urn_probs[b] - rec.urn_probs[a]);
    const [highKey, medHighKey, medLowKey, lowKey] = rankedKeys;
    const coloredBall = (urnKey) => {
      const color = rec.urn_colors[urnKey];
      return `${utils.getArticle(color)} <span class="urn-ball-text" style="color:${utils.getDisplayColor(color)};">${color}</span> ball`;
    };
    const template = RULE_SENTENCE_TEMPLATES[rec.rule_key];
    if (!template) return null;
    return template({
      high: coloredBall(highKey),
      medHigh: coloredBall(medHighKey),
      medLow: coloredBall(medLowKey),
      low: coloredBall(lowKey)
    });
  }

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
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>The rule</h2>
        <p>Here's the rule that determined whether John won or lost, along with the four boxes used throughout the study.</p>
      </div>
      <div class="highlight-box">
        <h2 style="color: red;">THE RULE</h2>
        <p><strong>The rule was: ${buildRuleSentence(record) || "we couldn't determine the exact rule for this session — sorry about that!"}</strong></p>
      </div>
      ${fourUrnHtmlStatic}`,
    choices: ["Continue"],
    data: { question_id: "rule_reveal" },
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
