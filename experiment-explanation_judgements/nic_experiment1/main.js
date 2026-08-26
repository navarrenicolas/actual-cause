// ===== Shuffle Helper =====
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ===== Urn Configuration =====
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

const shuffledProbs = shuffleArray([0.9, 0.6, 0.4, 0.1]);
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

// ===== Rule Selection =====
const ruleKeys = Object.keys(rules);
const selectedRuleKey = ruleKeys[Math.floor(Math.random() * ruleKeys.length)];
const selectedRule = rules[selectedRuleKey];

const fixedFamiliarisationDraws = fixedFamiliarisation[selectedRuleKey].map(draw => ({
  [highKey]: draw.high ? urnMap[highKey].color : 'lightgrey',
  [medHighKey]: draw.medHigh ? urnMap[medHighKey].color : 'lightgrey',
  [medLowKey]: draw.medLow ? urnMap[medLowKey].color : 'lightgrey',
  [lowKey]: draw.low ? urnMap[lowKey].color : 'lightgrey'
}));

const familiarisationDraws = shuffleArray(fixedFamiliarisationDraws.slice());

// ===== Prediction Draws =====
// order the map with the probability order
const fixedPredictionDraws = fixedPrediction[selectedRuleKey].map(draw => ({
  [highKey]: draw.high ? urnMap[highKey].color : 'lightgrey',
  [medHighKey]: draw.medHigh ? urnMap[medHighKey].color : 'lightgrey',
  [medLowKey]: draw.medLow ? urnMap[medLowKey].color : 'lightgrey',
  [lowKey]: draw.low ? urnMap[lowKey].color : 'lightgrey'
}));

const predictionDraws = shuffleArray(fixedPredictionDraws.slice());


const rawRuleDescription = fillRuleTemplate(ruleTemplates[selectedRuleKey], labelByRole);
const ruleText = `<h2> RULE </h2>  <p> <strong>  To win, you must draw ${colorizeWithSpans(rawRuleDescription)}</strong> </p>`;

const ruleBox = `<div class="highlight-box"> ${ruleText} </div>`;

// ===== Helper Functions =====
function rule(draw) {
  return selectedRule.evaluate(draw, { highKey, medHighKey, medLowKey, lowKey });
}

function generateUrnBalls(urnKey, total = 20) {
  const { color, prob } = urnMap[urnKey];
  const n_colored = Math.round(prob * total);
  const n_lightgrey = total - n_colored;
  return shuffleArray(Array(n_colored).fill(color).concat(Array(n_lightgrey).fill('lightgrey')));
}

function sampleDraw() {
  const draw = {};
  for (const urnKey in urnMap) {
    draw[urnKey] = Math.random() < urnMap[urnKey].prob ? urnMap[urnKey].color : 'lightgrey';
  }
  return draw;
}

// Step 1: Pre-generate or centralize the state elsewhere
function getOrCreateUrnsData() {
  const urnsData = {};
  Object.keys(urnMap).forEach(urnKey => {
    urnsData[urnKey] = generateUrnBallsData(urnKey);
  });
  return urnsData;
}

// Global or shared state instance
const sharedUrnsData = getOrCreateUrnsData();


function generateUrnBallsData(urnKey, total = 20) {
  const { color, prob } = urnMap[urnKey];
  const nColored = Math.round(prob * total);
  const rawColors = shuffleArray(Array(nColored).fill(color).concat(Array(total - nColored).fill('lightgrey')));

  return rawColors.map((col, idx) => ({
    id: `ball-${urnKey}-${idx}`,
    color: col
  }));
}

function renderUrnsHTML(urnsData = sharedUrnsData, interactive = false) {
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
        <div class="urn-controls-compact">
          <button class="push-draw-btn" data-urn="${urnKey}" ${interactive ? '' : 'disabled'}>DRAW</button>
          <div class="urn-slot" id="slot-${urnKey}"></div>
        </div>
      </div>`;
  }).join('');

  return `<div class="urn-display">${columns}</div>`;
}


// Interactive version for your new trial
const staticUrns = renderUrnsHTML(sharedUrnsData, false);
const interactiveUrns = renderUrnsHTML(sharedUrnsData, true);



function generateAllDraws() {
  const options = {};
  for (const key in urnMap) options[key] = [urnMap[key].color, 'lightgrey'];
  const all = [];
  for (const A of options.A)
    for (const B of options.B)
      for (const C of options.C)
        for (const D of options.D)
          all.push({ A, B, C, D });
  return all;
}

function generateAllDrawCombinations(urnMap) {
  const urnKeys = ["A", "B", "C", "D"];
  const combinations = [];

  function helper(depth, currentDraw) {
    if (depth === urnKeys.length) {
      combinations.push({ ...currentDraw });
      return;
    }
    const key = urnKeys[depth];
    const coloredBall = urnMap[key].color;

    currentDraw[key] = coloredBall;
    helper(depth + 1, currentDraw);

    currentDraw[key] = "lightgrey";
    helper(depth + 1, currentDraw);
  }

  helper(0, {});
  return combinations;
}

// ===== Save Data Helper =====
// Saves to safe_save.php on the server, which is hardcoded to write into
// this experiment's own folder under ~/server_data/ (see safe_save.php) —
// the only durable copy once this is deployed for real participants.
//
// Local-download backup (disabled by default now that server saving is
// confirmed working; uncomment the two calls below to also force a local
// CSV download whenever the server save fails, e.g. while testing without
// a server):
//
// function downloadCSVLocally(filename, csv) {
//   const blob = new Blob([csv], { type: 'text/csv' });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   URL.revokeObjectURL(url);
// }

function saveDataToServerAsCSV(done = null) {
  const csv = jsPsych.data.get().csv();
  const subject_id = jsPsych.data.get().values()[0]?.subject_id || 'anon';
  const filename = `causal_exp1_${subject_id}.csv`;

  fetch('safe_save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: filename, filedata: csv })
  })
    .then((res) => res.json().then((result) => ({ ok: res.ok, result })))
    .then(({ ok, result }) => {
      if (ok && result.status === 'saved') {
        if (done) done(true);
      } else {
        console.error('safe_save.php error:', result && result.error);
        // downloadCSVLocally(filename, csv);
        if (done) done(false);
      }
    })
    .catch((err) => {
      console.error('Network error saving data:', err);
      // downloadCSVLocally(filename, csv);
      if (done) done(false);
    });
}

// ===== jsPsych and Data Properties =====
const urnProbs = {};
for (const urnKey in urnMap) {
  urnProbs[urnKey] = parseFloat(urnMap[urnKey].prob.toFixed(2));
}

const jsPsych = initJsPsych();

const subject_id = 'subj_' + Math.random().toString(36).substring(2, 10);

jsPsych.data.addProperties({
  subject_id: subject_id,
  urn_probs: JSON.stringify(['A', 'B', 'C', 'D'].map(k => urnProbs[k])),
  urn_colors: JSON.stringify(['A', 'B', 'C', 'D'].map(k => urnMap[k].color)),
  rule_key: selectedRuleKey,
});

const timeline = [];

// Consent
timeline.push(consentTrial);

// Prolific ID
timeline.push({
  type: jsPsychSurveyText,
  questions: [
    {
      prompt: "Please enter your Prolific ID:",
      name: "prolific_id",
      required: true
    }
  ],
  data: { question_id: "prolific_entry" },
  on_finish: function(data) {
    jsPsych.getDisplayElement().innerHTML = ''; 
  }
});

// Instruction trial: static familiarisation page followed by a staggered,
// interactive walkthrough of drawing, feedback, and the rule. All pages
// share one trial so participants can navigate back and forth throughout.
const instructionsIntroHTML = `
  <div class="instructions-container">
    <h2>Instructions</h2>
    <p>In this study, you will interact with four boxes, each containing a mix of grey balls and balls in a color unique to that box:</p>
    ${staticUrns}
    <p style="font-style: italic;">Some boxes have more colored balls than others, so your chances of drawing a colored ball differ from box to box.</p>
  </div>
`;

const walkthroughOutroHTML = `
  <div class="instructions-container">
    <h2>Practice Rounds</h2>
    <p>Now it's your turn. You'll get to draw balls from the boxes yourself a few times, so you can get a feel for how the game works before the real trials begin.</p>
  </div>
`;

timeline.push({
  type: jsWalkthroughInstructions,
  intro_html: instructionsIntroHTML,
  outro_html: walkthroughOutroHTML,
  rule_text: ruleBox,
  urn_html: interactiveUrns,
  urn_map: urnMap,
  draw: familiarisationDraws[0],
  urn_keys: ["A", "B", "C", "D"],
  rule_fn: rule,
  question_id: "instructions_walkthrough",
  finish_button_label: "Continue to Practice Rounds",
  data: { question_id: "instructions_walkthrough" }
});


// Familiarisation trial
timeline.push({
  type: jsInteractiveDrawSingle,
  rule_text: ruleBox,
  urn_html: interactiveUrns,
  urn_map: urnMap,
  show_result: true,
  draws: familiarisationDraws,
  urn_keys: ["A", "B", "C", "D"],
  question_id: "familiarisation",
  max_samples: 10,
  rule_fn: rule,
  data: { question_id: "familiarisation" },
  on_finish: function () {
    jsPsych.getDisplayElement().innerHTML = '';
  }
});

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <div class="instructions-container">
    <h2>Comprehension Check 1/2</h2>
    <p>
      Now that you are familiar with the game, we will check your understanding of the rule.
    </p>
    <p>
      In the following comprehension check, you will see several sample draws from the boxes from another player.
      Your job is to determine whether the scenario would lead to a <span class="win">win</span> or a <span class="lose">loss</span> based on the rule. 
      To continue to the experiment you must answer all questions correctly. If you answer incorrectly, you will be prompted to try again.
    </p>
    <p>
      Click <b>Continue</b> to proceed.
    </p>
  </div>`,
  choices: ['Continue'],
  data: { question_id: "pre_comp_selection" },
});

const allDraws = generateAllDrawCombinations(urnMap);
const testDraws = shuffleArray(allDraws.slice()).slice(0, 5);

timeline.push({
  type: jsComprehensionGridPrediction,
  rule_text: ruleBox,
  urn_html: renderUrnsHTML(),
  urn_map: urnMap,
  scenarios: predictionDraws, 
  urn_keys: ["A", "B", "C", "D"],
  agent_name: "John",
  rule_fn: rule, // Evaluation function returning true (win) or false (lose)
  question_id: "comprehension_rule_prediction_grid",
  submit_button_label: "Submit All",
  continue_button_label: "Continue to Next Section",
  on_finish: function () {
    jsPsych.getDisplayElement().innerHTML = '';
  }
});

// timeline.push({
//   type: jsPredictionTask,
//   rule_text: ruleBox,
//   urn_html: renderUrnsHTML(),
//   urn_map: urnMap,
//   draws: predictionDraws,
//   urn_keys: ["A", "B", "C", "D"],
//   rule_fn: rule,
//   question_id: "comprehension_rule",
//   prompt: `<p>Please predict the outcome for every draw below.</p><p>Click the result boxes to switch between <span style='color: green; font-weight: bold;'>WIN</span> and <span style='color: red; font-weight: bold;'>LOSE</span>.</p>`,
//   on_finish: function () {
//     jsPsych.getDisplayElement().innerHTML = '';
//   }
// });


timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div class="instructions-container">
    <h2>Comprehension Check 2/2</h2>
    <p>
      In this study your task will be to provide an explanation for the outcome of different scenarios under this rule.
      Before that however, we'll also get familiar with the selection process.
    </p>
    <p>
      In the following comprehension check, you will be asked to select the ball that matches the given prompt.
      When a ball is selected, a circle will appear around it to indicate that it has been selected.
      You can submit the selection by clicking the <b>Submit</b> button. 
      You must get all the questions correct to proceed to the next section. If you answer incorrectly, you will be prompted to try again.
    </p>
    <p>
      Click <b>Continue</b> to proceed.
    </p>
    </div>`,
  choices: ['Continue'],
  data: { question_id: "pre_comp_selection" },
});

// ===== Dynamically Rank Urns by Probability =====
const sortedUrnsByProb = Object.keys(urnMap).sort((a, b) => urnMap[b].prob - urnMap[a].prob);

const mostLikelyUrnKey = sortedUrnsByProb[0];       // 1st highest (0.9)
const secondMostLikelyUrnKey = sortedUrnsByProb[1]; // 2nd highest (0.6)
const thirdMostLikelyUrnKey = sortedUrnsByProb[2];  // 3rd highest (0.4)
const leastLikelyUrnKey = sortedUrnsByProb[3];      // 4th highest (0.1)

// ===== Sample Observation Draws =====
// Draw with exactly one colored ball (Urn A)
const singleColoredDraw = {
  A: urnMap.A.color,
  B: 'lightgrey',
  C: 'lightgrey',
  D: 'lightgrey'
};

// Draw with exactly one grey ball (Urn D)
const singleGreyDraw = {
  A: urnMap.A.color,
  B: urnMap.B.color,
  C: urnMap.C.color,
  D: 'lightgrey'
};

// Standard draw with all colored balls showing
const standardDraw = {
  A: urnMap.A.color,
  B: urnMap.B.color,
  C: urnMap.C.color,
  D: urnMap.D.color
};

const multiColorDraw = {
  A: urnMap.A.color,
  B: urnMap.B.color,
  C: 'lightgrey',
  D: urnMap.D.color
};


// TRIAL 1: Identification Tasks Grid (4 Scenarios)
const compTrial1 = {
  type: jsComprehensionGridSelection,
  question_id: "comp_grid_identification",
  rule_text: ruleBox,
  urn_html: staticUrns,
  urn_map: urnMap,
  submit_button_label: "Submit Selections",
  scenarios: [
    {
      id: "comp_only_colored_ball",
      draw: singleColoredDraw,
      correct: ["A"],
      prompt: "Select the ONLY COLORED ball."
    },
    {
      id: "comp_only_grey_ball",
      draw: singleGreyDraw,
      correct: ["D"],
      prompt: "Select the ONLY GREY ball."
    },
    {
      id: "comp_any_colored_ball",
      draw: multiColorDraw,
      correct: [["A"], ["B"], ["D"]], // or specify accepted key
      prompt: "Select ANY COLORED ball."
    },
    {
      id: "comp_any_grey_ball",
      draw: singleColoredDraw,
      correct: [["B"], ["C"], ["D"]], // or specify accepted key
      prompt: "Select ANY GREY ball."
    }
  ],
  on_finish: function () {
    jsPsych.getDisplayElement().innerHTML = '';
  }

};

// TRIAL 2: Probability Ranking Tasks Grid (4 Tasks, Same Sample)
const compTrial2 = {
  type: jsComprehensionGridSelection,
  question_id: "comp_grid_probability_ranking",
  rule_text: ruleBox,
  urn_html: staticUrns,
  urn_map: urnMap,
  submit_button_label: "Submit Selections",
  scenarios: [
    {
      id: "comp_most_likely_ball",
      draw: standardDraw,
      correct: [mostLikelyUrnKey],
      prompt: "Select the ball drawn from the box with the MOST colored balls."
    },
    {
      id: "comp_second_most_likely_ball",
      draw: standardDraw,
      correct: [secondMostLikelyUrnKey],
      prompt: "Select the ball drawn from the box with the SECOND MOST colored balls."
    },
    {
      id: "comp_third_most_likely_ball",
      draw: standardDraw,
      correct: [thirdMostLikelyUrnKey],
      prompt: "Select the ball drawn from the box with the THIRD MOST colored balls."
    },
    {
      id: "comp_least_likely_ball",
      draw: standardDraw,
      correct: [leastLikelyUrnKey],
      prompt: "Select the ball drawn from the box with the LEAST colored balls."
    }
  ],
  on_finish: function () {
    jsPsych.getDisplayElement().innerHTML = '';
  }
};

// Push to jsPsych Timeline
timeline.push(compTrial1);
timeline.push(compTrial2);


timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <div class="instructions-container">
  <h2>You are now ready for the experiment!</h2>
    <p> In the following task you will see several several scenarios that were drawn by another player, John, who does not know the rule of the game.
    John is trying to learn the rule of the game based on the scenarios that appear, and will also be requesting specific explanations for each of the outcomes.
    </p>
    <p>
    Your task is to select the ball that best explains the result to John.
    </p>
    <p>
    When you are ready, click the <b>Start experiment</b> button.</p>
    </div>
    `,
  choices: ['Start experiment'],
  data: { question_id: "pre_experiment" }
});

// Explanation selection trial

// Compute probability percentage for each draw combination
function computeDrawProbability(draw, urnMap) {
  let jointProb = 1.0;
  for (const urnKey in urnMap) {
    const urnColor = urnMap[urnKey].color;
    const urnProb = urnMap[urnKey].prob;
    const isColored = draw[urnKey] === urnColor;
    jointProb *= isColored ? urnProb : (1 - urnProb);
  }
  return jointProb;
}

function prepareGridScenarios(allDraws, urnMap, ruleFn) {
  const scenarios = allDraws.map((draw, idx) => {
    const probVal = computeDrawProbability(draw, urnMap);
    const percentageStr = (probVal * 100).toFixed(1) + '%';
    const isWin = ruleFn(draw);

    return {
      id: idx + 1,
      urns: draw,
      outcome: isWin ? 'win' : 'lose',
      prob: percentageStr,
      raw_prob: probVal
    };
  });

  return shuffleArray(scenarios);
}


// 1. Prepare and shuffle all 16 scenarios
const gridScenarios = prepareGridScenarios(allDraws, urnMap, rule);

// 2. Chunk scenarios into arrays of 4
function chunkArray(arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

const scenarioBatches = chunkArray(gridScenarios, 4);

// 3. Push 4 trials (1 for each 2x2 batch) to timeline
scenarioBatches.forEach((batch, batchIdx) => {
  timeline.push({
    type: jsPsychExplanationGrid,
    urn_html: staticUrns,
    rule_text: ruleBox,
    urn_map: urnMap,
    urn_keys: ["A", "B", "C", "D"],
    agent_name: "John",
    scenarios: batch,
    rule_fn: rule,
    question_id: `explanation_batch_${batchIdx + 1}`,
  });
});

// Demographics (asked last, since two questions ask about the rule just used)
timeline.push(demographicTrial);

// Open-ended feedback questionnaire
timeline.push(feedbackTrial);

// Save data & finish
timeline.push({
  type: jsPsychCallFunction,
  async: true,
  func: (done) => {
    jsPsych.data.get().values().forEach(trial => {
      delete trial.stimulus;
    });

    saveDataToServerAsCSV((success) => {
      if (success) {
        jsPsych.getDisplayElement().innerHTML = '';

        jsPsych.run([
          {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
              <h2>Thank you for participating!</h2>
              <div class="instructions-container">
                <p>Please click the <b>‘Go to Prolific’</b> button below, or use the code <b>CVV8Z1EI</b> to confirm your participation on Prolific.</p>
              </div>`,
            choices: ['Go to Prolific'],
            on_finish: () => {
              window.location.href = "https://app.prolific.com/submissions/complete?cc=CVV8Z1EI";
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