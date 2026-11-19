// Study 3 uses an independent queue preserving the original yoked scenario order.
// ===== Bootstrap: try to fetch the assigned experiment_1 dataset before
// building anything else, since the main task's urns/scenarios come from
// the assigned Study 1 record.
//
// jsPsych doesn't create its display element until jsPsych.run() actually
// starts, so getDisplayElement() is unusable for the loading/error states
// shown *before* that — write to document.body directly instead, and
// clear it right before run() so nothing is left over alongside jsPsych's
// own container. =====
let jsPsych;
const subject_id = "subj_" + Math.random().toString(36).substring(2, 10);

// Only the explicit mock parameter disables assignment and server saving.
const useMockData = new URLSearchParams(window.location.search).get("mock") === "1";
// Probabilities for boxes A, B, C, D in mock mode. null preserves the sampled
// participant's assignment. Example: [0.9, 0.6, 0.4, 0.1].
const MOCK_URN_ORDER = null;

async function loadJSON(path) {
  if (useMockData) {
    const name = path.replace(/^data_harness\//, '');
    const data = window.Study3HarnessData?.[name];
    if (!data) throw new Error(`Missing mock harness data: ${name}`);
    return JSON.parse(JSON.stringify(data));
  }
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

function applyMockUrnOrder(record, order) {
  if (order === null) return record;
  const keys = ["A", "B", "C", "D"];
  if (!Array.isArray(order) || order.length !== 4 ||
      [...order].sort((a, b) => a - b).join(',') !== '0.1,0.4,0.6,0.9') {
    throw new Error('MOCK_URN_ORDER must contain 0.9, 0.6, 0.4, 0.1 exactly once');
  }
  const sourceKey = Object.fromEntries(keys.map((key, i) =>
    [key, keys.find(old => record.urn_probs[old] === order[i])]
  ));
  return {
    ...record,
    urn_probs: Object.fromEntries(keys.map((key, i) => [key, order[i]])),
    scenarios: record.scenarios.map(sc => ({
      id: sc.id,
      result: sc.result,
      draw: Object.fromEntries(keys.map(key => [key,
        sc.draw[sourceKey[key]] === 'lightgrey' ? 'lightgrey' : record.urn_colors[key]
      ]))
    }))
  };
}

async function fetchDataset() {
  if (useMockData) {
    const records = await loadJSON('data_harness/subject_data.json');
    if (!records.length) throw new Error('No mock participants available');
    const record = records[Math.floor(Math.random() * records.length)];
    return { dataset: applyMockUrnOrder(record, MOCK_URN_ORDER) };
  }
  const params = new URLSearchParams({ exp2_subject_id: subject_id });
  const res = await fetch(`assign_dataset.php?${params}`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok || !body.dataset) {
    const error = new Error([body.code, body.error].filter(Boolean).join(': ') || 'Failed to assign dataset');
    error.code = body.code;
    throw error;
  }
  return body;
}

function buildAssignedStudy(assignment) {
  const record = assignment.dataset;
  const fourUrnMap = {};
  Object.keys(record.urn_colors).forEach((key) => {
    fourUrnMap[key] = { color: record.urn_colors[key], prob: record.urn_probs[key] };
  });
  return {
    fourUrnMap, ruleKey: record.rule_key, exp1SubjectId: record.subject_id,
    assignmentSource: useMockData ? "mock" : "dataset",
    orderedScenarios: window.ExplanationCounts.attach(record)
  };
}

function showLoadingMessage() {
  document.body.innerHTML = `
    <div class="instructions-container">
      <p>Loading study...</p>
    </div>
  `;
}

function showFatalError(message, showRetryInstructions = true) {
  document.body.innerHTML = `
    <div class="instructions-container">
      <h2>Unable to start the study</h2>
      <p>${message}</p>
      ${showRetryInstructions ? "<p>Please try again later, or return this study on Prolific if it's no longer available.</p>" : ""}
    </div>
  `;
}

async function bootstrap() {
  showLoadingMessage();
  if (!useMockData && window.location.protocol === "file:") {
    showFatalError('Non-mock assignment requires PHP. Start the server with <code>sh serve.sh</code> in the experiment folder, then open <a href="http://127.0.0.1:8000/main.html">http://127.0.0.1:8000/main.html</a>.', false);
    return;
  }

  let assignedStudy;
  try {
    window.Study3CountsData = await loadJSON('data_harness/selections.json');
    assignedStudy = buildAssignedStudy(await fetchDataset());
  } catch (err) {
    console.error(err);
    const unavailable = err && err.code === "no_data_available";
    showFatalError(unavailable
      ? "This experiment is currently not available. Please return to Prolific."
      : "There was a problem starting the study.", !unavailable);
    return;
  }
  const { fourUrnMap, ruleKey, orderedScenarios, exp1SubjectId, assignmentSource } = assignedStudy;

  const fourUrnLabels = buildUrnLabels(fourUrnMap);
  const fourUrnBallsData = getOrCreateUrnsData(fourUrnMap);
  const fourUrnHtmlInteractive = renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, true);
  const fourUrnHtmlStatic = renderUrnsHTML(fourUrnMap, fourUrnLabels, fourUrnBallsData, false);
  const urnKeysFour = Object.keys(fourUrnMap);

  document.body.innerHTML = ""; // clear the loading message before jsPsych attaches its own container
  jsPsych = initJsPsych(
    {
    extensions: [
      { type: jsPsychCyborgHunter, params: { participantId: subject_id, preset: "standard" } },
      { type: jsPsychGuardFriction },
      {
        type: jsPsychCyborgHunterReplay,
        params: {
          participantId: subject_id,
          tier: "dom",
          // v0.8.0 supports download/DataPipe only. Our PHP upload below uses
          // getLastRecording(); the library's "none" warning is expected.
          autoSave: { mode: useMockData ? "download" : "none" }
        }
      }
    ]
  });

  jsPsych.data.addProperties({
    subject_id: subject_id,
    study: "exp3inf",
    explanation_format: "pooled_counts",
    explanation_counts_version: window.Study3CountsData.version,
    exp1_subject_id: exp1SubjectId,
    assignment_source: assignmentSource,
    rule_key: ruleKey,
    urn_colors: JSON.stringify(urnKeysFour.map((k) => fourUrnMap[k].color)),
    urn_probs: JSON.stringify(urnKeysFour.map((k) => parseFloat(fourUrnMap[k].prob.toFixed(2)))),
    webdriver_flag: navigator.webdriver === true,
    plugins_count: navigator.plugins ? navigator.plugins.length : 0,
    languages_count: navigator.languages ? navigator.languages.length : 0
  });

  const timeline = [];
  

  // ----- Consent, fullscreen, & Prolific ID -----
  timeline.push(consentTrial);
  timeline.push({
    type: jsPsychSurveyText,
    questions: [{
      prompt: `<div>Please enter your Prolific ID:</div><div class="prolific-text" data-testid="prolific-note">Start your response with ID:</div>`,
      name: "prolific_id",
      required: true
    }],
    data: { question_id: "prolific_entry" },
    on_finish: function (data) {
      const response = (data.response && data.response.prolific_id) || "";
      data.prolific_id = response;
      // Save the response verbatim; retrospective checks belong in the report.
      jsPsych.getDisplayElement().innerHTML = "";
    }
  });
  
  // timeline.push(GuardFriction.createEntryTrial({
  //   message: "<p>The study will now switch to fullscreen mode. Please stay in fullscreen, on this tab, for the rest of the study.</p>"
  // }));

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
      <div class="instructions-container">${taskDescriptionHTML()}</div>`,
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
      <div class="instructions-container">${aDifferentRuleHTML()}</div>`,
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
    data: { question_id: "pre_four_urn_familiarisation" },
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; }
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
  // The assigned ledger order for all 16 scenarios is used across all 3
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
    stimulus: `<div class="instructions-container">${preExperimentHTML(totalRounds)}</div>`,
    choices: ["Start"],
    on_finish: function () { jsPsych.getDisplayElement().innerHTML = ""; },
    data: { question_id: "pre_experiment" }
  });

  roundGivenCounts.forEach((givenCount, roundIdx) => {
    const roundNumber = roundIdx + 1;

    timeline.push({
      type: jsPredictionColumns,
      scenarios: withGivenFlags(orderedScenarios, givenCount),
      urn_html: fourUrnHtmlStatic,
      urn_map: fourUrnMap,
      urn_keys: urnKeysFour,
      agent_name: "John",
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
        scenarios: orderedScenarios.slice(givenCount, givenCount + 4),
        start_index: givenCount,
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

  // Attach monitoring to every trial above, but not to the save trial itself
  // below: it calls finalize() (which tears the monitor down) from inside its
  // own func, so it must not also be a monitored trial or the extension's own
  // on_finish would try to end a trial against an already-destroyed monitor.
  timeline.forEach((t) => {
    t.extensions = (t.extensions || []).concat([
      { type: jsPsychCyborgHunter },
      { type: jsPsychGuardFriction }
    ]);
  });

  timeline.push({
    type: jsPsychCallFunction,
    async: true,
    func: async (done) => {
      jsPsych.extensions["guard-friction"].finalize();
      jsPsych.extensions["cyborg-hunter"].finalize();
      await jsPsych.extensions["cyborg-hunter-replay"].finalize();

      if (!useMockData) {
        await saveReplayToServer(
          jsPsych,
          jsPsych.extensions["cyborg-hunter-replay"].getLastRecording()
        );
      }

      jsPsych.data.get().values().forEach((trial) => { delete trial.stimulus; });

      const filenamePrefix = "causal_inf_exp3";
      if (useMockData) {
        jsPsych.data.get().localSave("csv", `${filenamePrefix}_${subject_id}.csv`);
      }
      saveDataToServerAsCSV(jsPsych, subject_id, filenamePrefix, useMockData, (success) => {
        if (success) {
          jsPsych.getDisplayElement().innerHTML = "";
          done();
        } else {
          alert("There was a problem saving your data. Please check your connection and try again.");
        }
      });
    }
  });

  // Continue the existing timeline: calling run() again reinitializes the
  // extensions and starts a second, unsaved recorder on the thank-you screen.
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: THANK_YOU_HTML,
    choices: ["Go to Prolific"],
    on_finish: () => {
      // TODO: replace XXXXXXXX with this study's Prolific completion code.
      window.location.href = "https://app.prolific.com/submissions/complete?cc=C1K1S1PU";
    }
  });

  jsPsych.run(timeline);
}

bootstrap();
