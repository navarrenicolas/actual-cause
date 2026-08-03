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

// ===== Rule Definitions =====
const rules = {
  rule1: {
    evaluate: (draws, keys) => (draws[keys.highKey] !== 'lightgrey' && draws[keys.lowKey] !== 'lightgrey') || draws[keys.medLowKey] !== 'lightgrey'
  },
  rule2: {
    evaluate: (draws, keys) => (draws[keys.highKey] !== 'lightgrey' || draws[keys.lowKey] !== 'lightgrey') && draws[keys.medLowKey] !== 'lightgrey'
  },
  rule3: {
    evaluate: (draws, keys) => draws[keys.highKey] !== 'lightgrey' && draws[keys.medHighKey] !== 'lightgrey' && draws[keys.lowKey] !== 'lightgrey'
  },
  rule4: {
    evaluate: (draws, keys) => draws[keys.highKey] !== 'lightgrey' && [draws[keys.medHighKey], draws[keys.medLowKey], draws[keys.lowKey]].filter(c => c !== 'lightgrey').length >= 1
  },
  rule5: {
    evaluate: (draws, keys) => {const count = [draws[keys.highKey], draws[keys.medLowKey], draws[keys.lowKey]].filter(c => c !== 'lightgrey').length;
      return count === 1;
    }
  },
  rule6: {
    evaluate: (draws, keys) => (draws[keys.highKey] !== 'lightgrey') !== (draws[keys.lowKey] !== 'lightgrey')
  }
};

const ruleTemplates = {
  rule1: "{low} and {high} ball, or {medLow} ball",
  rule2: "{low} or {high} ball, and {medLow} ball",
  rule3: "{low} ball, {medHigh} ball, and {high} ball",
  rule4: "{high} ball, and at least one of the {medHigh}, {medLow}, or {low} balls",
  rule5: "exactly one of {high}, {medLow}, or {low} ball",
  rule6: "either {high} or {low} ball, but not both"
};

const getArticle = (word) => {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  return vowels.includes(word[0].toLowerCase()) ? 'an' : 'a';
};

const fillRuleTemplate = (template, labels) => {
  let filled = template.replace(/{(high|medHigh|medLow|low)}/g, (_, role) => labels[role]);

  // Rule 1: X and Y ball, or Z ball
  filled = filled.replace(
    /(pink|orange|blue|purple) and (pink|orange|blue|purple) ball, or (pink|orange|blue|purple) ball/,
    (_, c1, c2, c3) => `${getArticle(c1)} ${c1} and ${getArticle(c2)} ${c2} ball, or ${getArticle(c3)} ${c3} ball`
  );

  // Rule 2: X or Y ball, and Z ball
  filled = filled.replace(
    /(pink|orange|blue|purple) or (pink|orange|blue|purple) ball, and (pink|orange|blue|purple) ball/,
    (_, c1, c2, c3) => `${getArticle(c1)} ${c1} or ${getArticle(c2)} ${c2} ball, and ${getArticle(c3)} ${c3} ball`
  );

  // Rule 3: X ball, Y ball, and Z ball
  filled = filled.replace(
    /(pink|orange|blue|purple) ball, (pink|orange|blue|purple) ball, and (pink|orange|blue|purple) ball/,
    (_, c1, c2, c3) => `${getArticle(c1)} ${c1} ball, ${getArticle(c2)} ${c2} ball, and ${getArticle(c3)} ${c3} ball`
  );

  // Rule 4: X ball, and at least one of the Y, Z, or W balls
  filled = filled.replace(
    /(pink|orange|blue|purple) ball, and at least one of the (pink|orange|blue|purple), (pink|orange|blue|purple), or (pink|orange|blue|purple) balls/,
    (_, c1, c2, c3, c4) => `${getArticle(c1)} ${c1} ball, and at least one of the ${c2}, ${c3}, or ${c4} balls`
  );

  // Rule 5: exactly one X, Y, or Z ball
  filled = filled.replace(
    /exactly one of (pink|orange|blue|purple), (pink|orange|blue|purple), or (pink|orange|blue|purple) ball/,
    (_, c1, c2, c3) => `exactly one of ${c1}, ${c2}, or ${c3} ball`
  );

  // Rule 6: either X or Y ball
  filled = filled.replace(
    /either (pink|orange|blue|purple) or (pink|orange|blue|purple) ball/,
    (_, c1, c2) => `either ${getArticle(c1)} ${c1} or ${getArticle(c2)} ${c2} ball`
  );

  return filled;
};

const colorizeWithSpans = (text) => {
  const colorMap = {
    pink: 'hotpink',
    orange: 'orange',
    blue: 'blue',
    purple: 'purple'
  };
  return text.replace(/\b(pink|orange|blue|purple)\b/g, (color) => {
    return `<span style="color:${colorMap[color]}">${color}</span>`;
  });
};

// ===== Rule Selection and Familiarisation Draws =====
const ruleKeys = Object.keys(rules);
const selectedRuleKey = ruleKeys[Math.floor(Math.random() * ruleKeys.length)];
const selectedRule = rules[selectedRuleKey];

const fixedFamiliarisation = {
    rule1: [ // (A and D) or C
      { high: 1, medHigh: 1, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 1 }, // A and D, not C
      { high: 0, medHigh: 1, medLow: 1, low: 0 }, // not A, not D, C
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, // A, not D, not C
      { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 },
      { high: 1, medHigh: 1, medLow: 0, low: 0 } 
    ],
    rule2: [ // (A or D) and C
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, // A and C
      { high: 1, medHigh: 1, medLow: 1, low: 0 },  
      { high: 1, medHigh: 1, medLow: 0, low: 1 }, // A and D, not C
      { high: 0, medHigh: 1, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 0, low: 0 } 
    ],
    rule3: [ // A and B and D
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 1 }, // A and B and D
      { high: 0, medHigh: 1, medLow: 1, low: 0 },  
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 } 
    ],
    rule4: [ // A and (B or C or D)
      { high: 1, medHigh: 1, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 0, low: 0 },  
      { high: 0, medHigh: 1, medLow: 0, low: 0 }, // B
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, // A and B
      { high: 1, medHigh: 0, medLow: 1, low: 1 }, 
      { high: 1, medHigh: 1, medLow: 1, low: 0 }, // A and B and C
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 } 
    ],
    rule5: [ // Exactly one of (A or C or D)
      { high: 1, medHigh: 0, medLow: 0, low: 0 }, // A
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 1 },  
      { high: 0, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, // A and C
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 } 
    ],
    rule6: [ // A xor D
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, // A not D
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 1 }, // A and D
      { high: 0, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 0, medLow: 1, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 }, 
      { high: 1, medHigh: 1, medLow: 0, low: 0 } 
    ],
}

const fixedFamiliarisationDraws = fixedFamiliarisation[selectedRuleKey].map(draw => ({
  [highKey]: draw.high ? urnMap[highKey].color : 'lightgrey',
  [medHighKey]: draw.medHigh ? urnMap[medHighKey].color : 'lightgrey',
  [medLowKey]: draw.medLow ? urnMap[medLowKey].color : 'lightgrey',
  [lowKey]: draw.low ? urnMap[lowKey].color : 'lightgrey'
}));

const familiarisationDraws = shuffleArray(fixedFamiliarisationDraws.slice());
const rawRuleDescription = fillRuleTemplate(ruleTemplates[selectedRuleKey], labelByRole);
const ruleText = `<b>RULE:</b> To win, you must draw <strong>${colorizeWithSpans(rawRuleDescription)}.</strong>`;


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

function renderUrnsHTML() {
  return `<div class="urn-display">
    ${Object.keys(urnMap).map(urnKey => {
      const balls = generateUrnBalls(urnKey).map(color => `<div class="ball" style="background-color:${color}"></div>`).join('');
      return `<div>
                <div class="urn-label" style="color: ${urnMap[urnKey].color};">
                  ${urnLabels[urnKey]}
                </div> 
                <div class="urn">${balls}</div>
              </div>`;
    }).join('')}
  </div>`;
}

const staticUrns = renderUrnsHTML();


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

// ===== Save Data to Server =====
function saveDataToServerAsCSV(done = null) {
  const csv = jsPsych.data.get().csv();
  const subject_id = jsPsych.data.get().values()[0]?.subject_id || 'anon';
  const filename = `causal_exp1_${subject_id}.csv`;

  // --- Local download for debugging ---
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (done) done(true);
  // ------------------------------------

  // fetch('save_data.php', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: new URLSearchParams({ filename, filedata: csv })
  // })
  //   .then(res => res.text())
  //   .then(result => {
  //     if (result.trim() === 'success') {
  //       if (done) done(true);
  //       else alert("Data saved successfully!");
  //     } else {
  //       alert("Server returned error.");
  //       if (done) done(false);
  //     }
  //   })
  //   .catch(err => {
  //     console.error('Fetch error:', err);
  //     alert("There was a problem saving your data.");
  //     if (done) done(false);
  //   });
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
    data: { questionID: "prolific_entry" },
      on_finish: function(data) {
    jsPsych.getDisplayElement().innerHTML = ''; 
  }
  });
  
// Welcome and instructions
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <h2>Welcome to the experiment!</h2>
  <div class="instructions-container">
        <p><b>Before you continue, please note that this experiment must be completed on a computer</b>. 
        It is not compatible with mobile phones or tablets.  
        For the best experience and to ensure your responses are saved correctly, 
        please use the <b>Google Chrome</b> browser on your computer.</p>
    </div>`,
  choices: ['Next'],
  data: { questionID: "welcome" },
    on_finish: function(data) {
  jsPsych.getDisplayElement().innerHTML = ''; 
}
});


timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <div class="instructions-container">
      <h2>Instructions Part 1/2</h2>
      <p>In this study, you will be interacting with four urns, <span style="color: orange;"><b>A</b></span>, <span style="color: blue;"><b>B</b></span>, <span style="color: purple;"><b>C</b></span>, and <span style="color: hotpink;"><b>D</b></span>.
      Below is an example of the urns. An <b>urn</b> is simply a container that holds a mix of balls. Some balls are <b>colored</b> (e.g., orange, blue, purple, or pink), and others are <b>grey</b>.</p>
      <br>
      ${renderUrnsHTML()}
      <p>On each trial, you will draw one ball at random from each of four different urns. Each trial will produce a result: a <span class="win">win</span> or a <span class="lose">loss</span>.
      A trial is considered a win if the colored balls you draw satisfy a certain rule based on their <b>color, number, or a combination of both</b>.  
      If the rule is not satisfied, the trial will result in a loss.</p>
    </div>
  `,
  choices: ['Try a few draws'],
  data: { questionID: "instructions" }

});


// Familiarisation trial
timeline.push({
  type: jsDrawTable,
  rule_text: `
  <div class="instructions-container">
  <h2>Instructions Part 2/2</h2>
  <p>When you click the <b>Draw sample</b> button below, one ball will be drawn at random from each of the four urns. This set of four draws is called a trial.
  Note that some combinations of draws may appear more than once across trials, as certain urns contain more colored balls than others, making some draw patterns more likely.</p>
  <p>You will have 10 trials to explore and get a feel for how the rule works. The results of these trials will remain visible until you move on to the next part of the experiment.</p>
  <p id = "rule-text">${ruleText}</p>
  </div>
    `,
  urn_html: renderUrnsHTML(),
  show_result: true,
  draws: familiarisationDraws,
  urn_keys: ["A", "B", "C", "D"],
  question_id: "familiarisation",
  max_samples: 10,
  rule_fn: rule,
  data: { questionID: "familiarisation" }
});


// timeline.push({
//   type: jsPsychHtmlButtonResponse,
//   stimulus: `
//   <div class="instructions-container">
//       <h2>Comprehension Check 2/2</h2>
//       <p>In this experiment you will make selections of the colored balls to explain the results.
//       Before producing specific trial explanations you should get familiar with the selection process as well.
//       In the following task you will be asked to select the balls based on the current criteria.</p>
//       <p>When you are ready, click the <b>Test selections</b> button to proceed.</p>
//     </div>`,
//   choices: ['Test selections'],
//   data: { questionID: "pre_comp_selection" }
// });

// Example Sample Observation Data
const compDraw = { A: 'orange', B: 'lightgrey', C: 'purple', D: 'lightgrey' };

// Task 1: Select all colored balls (A and C)
timeline.push({
  type: jsComprehensionSelection,
  draw: compDraw,
  rule_text: `
   <div class="instructions-container">
      <h2>Comprehension Check 1/2</h2>
      <p>In this experiment you will select the balls that best explain the current sample's results.
      But beofre that, we'll allso get familiar with the selection process.
      </p>
      <p>
      In the following task you will be asked to select the balls based on the current criteria.
      You can select multiple balls if needed. Once you are done, click the <b>Continue</b> button to proceed.</p>
      </p>
    </div>
  `,
  urn_html: staticUrns,
  urn_keys: ["A", "B", "C", "D"],
  correct_keys: ["A", "C"],
  question_id: "comp_colored_balls",
  prompt: "Select all the <b>colored balls</b> in the observation panel above.",
  on_finish: function() { jsPsych.getDisplayElement().innerHTML = ''; }
});

// Task 2: Select all grey balls (B and D)
timeline.push({
  type: jsComprehensionSelection,
  draw: compDraw,
  rule_text: `
  <div class="instructions-container">
      <h2>Comprehension Check 1/2</h2>
      <p>In this experiment you will select the balls that best explain the current sample's results.
      But beofre that, we'll allso get familiar with the selection process.
      </p>
      <p>
      In the following task you will be asked to select the balls based on the current criteria.
      You can select multiple balls if needed. Once you are done, click the <b>Continue</b> button to proceed.</p>
      </p>
    </div>
    `,
  urn_html: staticUrns,
  urn_keys: ["A", "B", "C", "D"],
  correct_keys: ["B", "D"],
  question_id: "comp_grey_balls",
  prompt: "Select all the <b>grey balls</b> in the observation panel above.",
  on_finish: function() { jsPsych.getDisplayElement().innerHTML = ''; }
});

// Task 3: Select the most likely balls (Assuming A has prob 0.9 and B has prob 0.6)
const mostLikelyUrns = Object.keys(urnMap).filter(k => urnMap[k].prob >= 0.5);

timeline.push({
  type: jsComprehensionSelection,
  draw: compDraw,
  rule_text: `<div class="instructions-container">
      <h2>Comprehension Check 1/2</h2>
      <p>In this experiment you will select the balls that best explain the current sample's results.
      But beofre that, we'll allso get familiar with the selection process.
      </p>
      <p>
      In the following task you will be asked to select the balls based on the current criteria.
      You can select multiple balls if needed. Once you are done, click the <b>Continue</b> button to proceed.</p>
      </p>
    </div>`,
  urn_html: staticUrns,
  urn_keys: ["A", "B", "C", "D"],
  correct_keys: mostLikelyUrns,
  question_id: "comp_likely_balls",
  prompt: "Select the balls that come from the urns <b>most likely</b> to produce a colored ball.",
  on_finish: function() { jsPsych.getDisplayElement().innerHTML = ''; }
});


// // Pre-rule comprehension
// timeline.push({
//   type: jsPsychHtmlButtonResponse,
//   stimulus: `
//     <div class="instructions-container">
//       <h2>Comprehension Check 1/2</h2>
//       <p>Now that you are familiar with how the draws are generated, we will check your understanding of the rule.
//       In the following task, you will determine if each sample from the urns will be a <span class="win">win</span> or a <span class="lose">loss</span>. 
//       </p>
//     </div>
//   `,
//   choices: ['Check rule comprehension'],
//   data: { questionID: "pre_comp_rule" }
// });


// Function to generate all 16 possible color combinations across Urns A, B, C, D
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
    
    // Combination 1: Coloured Ball
    currentDraw[key] = coloredBall;
    helper(depth + 1, currentDraw);

    // Combination 2: Grey Ball
    currentDraw[key] = "lightgrey";
    helper(depth + 1, currentDraw);
  }

  helper(0, {});
  return combinations;
}

const allDraws = generateAllDrawCombinations(urnMap);

// Add Prediction Task Trial to Timeline
timeline.push({
  type: jsPredictionTable,
  rule_text: `
  <div class="instructions-container">
    <h2>Comprehension Check 2/2</h2>
    <p>
      Now that you are familiar with how the draws are generated and how to make selections, we will check your understanding of the rule.
    </p>
    ${ruleText}
  </div>
  `,
  urn_html: renderUrnsHTML(),
  draws: allDraws,
  urn_keys: ["A", "B", "C", "D"],
  rule_fn: rule,
  question_id: "comprehension_rule",
  prompt: `<p>Please predict the outcome for every draw below.</p><p>Click the result boxes to switch between <span style='color: green; font-weight: bold;'>WIN</span> and <span style='color: red; font-weight: bold;'>LOSE</span>.</p>`,
  on_finish: function() {
    jsPsych.getDisplayElement().innerHTML = '';
  }
});



timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
  <div class="instructions-container">
  <h2>You are now ready for the experiment!</h2>
    <p> In the following task you will draw a sample from the urns and observe the results.
    Suppose someone who does not know the rule of the game asks you the following question:
    </p>
    <div class="highlight-box">
    <p> Why did you <span class="win">win</span> or <span class="lose">lose</span>?</p>
    </div>
    <p>
    Your job is to select the balls that best explain the result.
    When you are ready, click the <b>Start experiment</b> button.</p>
    </div>
    `,
  choices: ['Start experiment'],
  data: { questionID: "pre_experiment" }
});


// Explanation selection trial
const staticUrnHTML = renderUrnsHTML();
const explanationDraws = generateAllDraws().sort(() => 0.5 - Math.random()); 

explanationDraws.forEach((draw, index) => {
  timeline.push({
    type: jsExplanationSelection,
    draw: draw,
    rule_text: `
      <p id = "rule-text" text-align="center">${ruleText}</p>`,
    urn_keys: ["A", "B", "C", "D"],
    urn_html: staticUrnHTML,
    is_win: rule(draw),
    current_title: 'Observation',
    // selection_prompt: `Why did you ${rule(draw) ? '<span class="win">win</span>' : '<span class="lose">lose</span>'}?`,
    continue_button_label: 'Continue',
    data: {
      questionID: "explanation_selection",
      trial_number: index + 1,
      draw_A: draw.A,
      draw_B: draw.B,
      draw_C: draw.C,
      draw_D: draw.D,
      result: rule(draw) ? "win" : "lose"
    }
  });
});

// // Demographics
// timeline.push(demographicTrial);

// Save data
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
                <p>Please click the <b>‘Finish’</b> button below, or use the code <b>CODE</b> to confirm your participation on Prolific.</p>
              </div>`,
            choices: ['Finish'],
            on_finish: () => {
              window.location.href = "https://app.prolific.com/submissions/complete?cc=CODE";
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