// ===== Condition allocation: this deployment runs BOTH conditions from one
// build. It first tries to claim a real experiment_1 record and run as
// "explanation"; once experiment_1 data runs out (assign_dataset.php
// returns no_data_available), it falls back to generating a rule/urn
// config fresh client-side — exactly like exp2noexpl's own main.js — and
// runs the very same session as "no_explanation" instead, with no
// redirect or reload. FIXED_URN_COLORS/RULES/generateAllFourUrnCombos/
// buildRandomFourUrnAssignment below are copied verbatim from
// exp2noexpl/main.js for that fallback; exp2noexpl stays a separate,
// untouched deployment for now. Everything else shared between the two
// conditions (stimuli, condition-parameterized instructional text, the
// fixed familiarisation set, rule-role/rule-sentence helpers, urn
// rendering) lives in shared-stimuli.js instead of being duplicated here
// — see that file's header for what's shared and why. =====
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

// ===== Bootstrap: try to fetch the assigned experiment_1 dataset before
// building anything else, since the main task's urns/scenarios come from
// it when the session runs as "explanation".
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

async function bootstrap() {
  showLoadingMessage();

  // ===== Try to claim a real experiment_1 record and run as "explanation";
  // fall back to a fresh client-side rule/urn config and run as
  // "no_explanation" once experiment_1 data runs out. Either way this
  // produces the same four values the rest of bootstrap() needs, so
  // everything below runs as a single, condition-agnostic code path. =====
  let showExplanation, fourUrnMap, ruleKey, shuffledScenarios, exp1SubjectId;

  try {
    const record = await fetchDataset();
    showExplanation = true;
    exp1SubjectId = record.subject_id;
    ruleKey = record.rule_key;
    fourUrnMap = {};
    Object.keys(record.urn_colors).forEach((key) => {
      fourUrnMap[key] = { color: record.urn_colors[key], prob: record.urn_probs[key] };
    });
    shuffledScenarios = shuffleArray(record.scenarios.slice());
  } catch (err) {
    if (!(err && err.message === "no_data_available")) {
      console.error(err);
      showFatalError("There was a problem starting the study.");
      return;
    }
    showExplanation = false;
    exp1SubjectId = null;
    const assignment = buildRandomFourUrnAssignment();
    fourUrnMap = assignment.urnMap;
    ruleKey = assignment.ruleKey;
    shuffledScenarios = assignment.scenarios;
  }

  // ===== 4-urn config. In the explanation condition, taken from the
  // assigned experiment_1 record so the urns on screen match what its
  // explanations refer to; in the no_explanation fallback, generated fresh
  // above. =====
  const fourUrnLabels = buildUrnLabels(fourUrnMap);
  const fourUrnBallsData = getOrCreateUrnsData(fourUrnMap);
  const fourUrnHtmlInteractive = renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, true);
  const fourUrnHtmlStatic = renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, false);
  const urnKeysFour = Object.keys(fourUrnMap);

  document.body.innerHTML = ""; // clear the loading message before jsPsych attaches its own container
  jsPsych = initJsPsych();

  jsPsych.data.addProperties({
    subject_id: subject_id,
    condition: showExplanation ? "explanation" : "no_explanation",
    exp1_subject_id: exp1SubjectId,
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

  // ===== Step 1: 2-urn mechanics + rule + explanation walkthrough =====
  // The rule and explanation concepts are introduced right here, inside
  // the same walkthrough that teaches drawing mechanics — via the
  // plugin's own rule/result/explanation pages — rather than as separate
  // later trials. The draw is fixed (not random) so every participant
  // sees the same probability/outcome/explanation text, and so it can
  // double as the first of the two examples shown right after.
  // Repeated/free-practice draws are reserved for the four-urn stage
  // (step 5); this walkthrough has just the one guided draw.
  timeline.push({
    type: jsWalkthroughInstructions,
    intro_html: mechanicsIntroHTML(),
    urn_html: twoUrnHtmlInteractive,
    urn_map: twoUrnMap,
    draw: disjunctiveExamples[0].draw,
    urn_keys: ["A", "B"],
    rule_fn: disjunctiveRuleFn,
    rule_text: disjunctiveRuleText,
    include_rule_pages: true,
    show_explanation: showExplanation,
    cause_urn: disjunctiveExamples[0].cause_urn,
    cause_color: disjunctiveExamples[0].cause_color,
    question_id: "mechanics_walkthrough",
    finish_button_label: "Continue",
    data: { question_id: "mechanics_walkthrough" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
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
      <div class="instructions-container">${taskDescriptionHTML(showExplanation)}</div>`,
    choices: ["Continue"],
    data: { question_id: "task_description" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsExplanationExample,
    examples: disjunctiveExamples,
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "John",
    show_explanation: showExplanation,
    rule_text: disjunctivePracticeRuleText,
    question_id: "disjunctive_examples",
    finish_button_label: "Continue",
    data: { question_id: "disjunctive_examples" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsPredictionColumns,
    scenarios: buildTwoUrnScenarios(twoUrnMap, disjunctiveExamples),
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "John",
    rule_fn: disjunctiveRuleFn,
    show_explanation: showExplanation,
    given_column_highlight: true,
    rule_text: disjunctivePracticeRuleText,
    feedback_mode: "retry",
    question_id: "disjunctive_prediction",
    data: { question_id: "disjunctive_prediction" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Step 4: conjunctive rule — "Practice Task 2/2": one consolidated
  // intro, then the same examples-then-predict pattern with a genuinely
  // new rule, again with no rule box shown anywhere. =====
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      ${practiceLabelHTML(2, 2)}
      <div class="instructions-container">${aDifferentRuleHTML(showExplanation)}</div>`,
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
    show_explanation: showExplanation,
    rule_text: conjunctivePracticeRuleText,
    question_id: "conjunctive_examples",
    finish_button_label: "Continue",
    data: { question_id: "conjunctive_examples" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsPredictionColumns,
    scenarios: buildTwoUrnScenarios(twoUrnMap, conjunctiveExamples),
    urn_html: twoUrnHtmlStatic,
    urn_map: twoUrnMap,
    urn_keys: ["A", "B"],
    agent_name: "John",
    rule_fn: conjunctiveRuleFn,
    show_explanation: showExplanation,
    given_column_highlight: true,
    rule_text: conjunctivePracticeRuleText,
    feedback_mode: "retry",
    question_id: "conjunctive_prediction",
    data: { question_id: "conjunctive_prediction" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  // ===== Step 5: introduce the 4-urn setup, no rule shown =====
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="instructions-container">${theFullGameHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData)}</div>`,
    choices: ["Continue"],
    data: { question_id: "pre_four_urn_familiarisation" }
  });

  timeline.push({
    type: jsInteractiveDrawSingle,
    show_rule: false,
    show_result: false,
    urn_html: fourUrnHtmlInteractive,
    urn_map: fourUrnMap,
    draws: shuffleArray(buildFamiliarisationDraws(fourUrnMap)),
    urn_keys: urnKeysFour,
    agent_name: "you",
    question_id: "four_urn_familiarisation",
    max_samples: 10,
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
  const roundGivenCounts = [4, 8, 12];
  const totalRounds = roundGivenCounts.length;

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="instructions-container">${preExperimentHTML(showExplanation, totalRounds)}</div>`,
    choices: ["Start"],
    data: { question_id: "pre_experiment" }
  });

  roundGivenCounts.forEach((givenCount, roundIdx) => {
    const roundNumber = roundIdx + 1;

    timeline.push({
      type: jsPredictionColumns,
      scenarios: withGivenFlags(shuffledScenarios, givenCount),
      urn_html: fourUrnHtmlStatic,
      urn_map: fourUrnMap,
      urn_keys: urnKeysFour,
      agent_name: "John",
      show_explanation: showExplanation,
      given_column_highlight: true,
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
        start_index: givenCount,
        review_question_id: `prediction_round_${roundNumber}`,
        urn_html: fourUrnHtmlStatic,
        urn_map: fourUrnMap,
        urn_keys: urnKeysFour,
        agent_name: "John",
        show_explanation: showExplanation,
        question_id: `batch_feedback_${roundNumber}`,
        data: { question_id: `batch_feedback_${roundNumber}` },
        on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
      });
    }
  });

  timeline.push({
    type: jsPsychSurveyText,
    questions: [RULE_GUESS_QUESTION],
    data: { question_id: "rule_guess" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
  });

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: ruleRevealHTML(
      buildRuleSentence(ruleKey, fourUrnMap) || "we couldn't determine the exact rule for this session. Sorry about that!",
      fourUrnHtmlStatic
    ),
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

      const filenamePrefix = showExplanation ? "causal_inf_exp2" : "causal_inf_exp2_noexpl";
      const condition = showExplanation ? "explanation" : "no_explanation";
      saveDataToServerAsCSV(jsPsych, subject_id, filenamePrefix, useMockData, (success) => {
        if (success) {
          jsPsych.getDisplayElement().innerHTML = "";
          jsPsych.run([
            {
              type: jsPsychHtmlButtonResponse,
              stimulus: THANK_YOU_HTML,
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
      }, condition);
    }
  });

  jsPsych.run(timeline);
}

bootstrap();
