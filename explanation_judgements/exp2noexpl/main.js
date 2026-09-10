// ===== 4-urn rule + config: generated fresh for every session, exactly
// like nic_experiment1's own setup (same fixed colors, same shuffled
// probability set, same 5 rules over probability-rank roles) — this
// condition never claims experiment_1 data, since there's no explanation
// to show and so nothing about a specific past participant's selections
// is needed. A rule is just picked at random from the same 5. Everything
// shared between this and the explanation condition (stimuli,
// condition-parameterized instructional text, the fixed familiarisation
// set, rule-role/rule-sentence helpers, urn rendering) lives in
// shared-stimuli.js instead of being duplicated here — see that file's
// header for what's shared and why. =====
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

  // ===== Step 1: 2-urn mechanics + rule walkthrough =====
  // The rule concept is introduced right here, inside the same walkthrough
  // that teaches drawing mechanics — via the plugin's own rule/result
  // pages. The draw is fixed (not random) so every participant sees the
  // same probability/outcome text, and so it can double as the first of
  // the two examples shown right after. (No explanation pages here — this
  // condition never shows one, and pages 6-8 already cover the outcome.)
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
    show_explanation: false,
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
      <div class="instructions-container">${taskDescriptionHTML(false)}</div>`,
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
    show_explanation: false,
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
    show_explanation: false,
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
      <div class="instructions-container">${aDifferentRuleHTML(false)}</div>`,
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
    show_explanation: false,
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
    show_explanation: false,
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
  // rounds. Round 1 starts with the first 4 already given (highlighted) —
  // the participant predicts the remaining 12. After Submit, a
  // streamlined feedback slide shows just a correct/incorrect flag for
  // the *first* 4 of those 12 predictions (comparing their own submitted
  // answer against the truth) — then round 2 shows those same 4
  // pre-filled as "given," predicting the remaining 8, flags the next 4,
  // and so on. The last 4 scenarios (round 3's remaining predictions) are
  // never revealed at all, and get no feedback — they're the held-out
  // generalization test.
  const roundGivenCounts = [4, 8, 12];
  const totalRounds = roundGivenCounts.length;

  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="instructions-container">${preExperimentHTML(false, totalRounds)}</div>`,
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
      show_explanation: false,
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
        show_explanation: false,
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

      saveDataToServerAsCSV(jsPsych, subject_id, "causal_inf_exp2_noexpl", useMockData, (success) => {
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
      });
    }
  });

  jsPsych.run(timeline);
}

bootstrap();
