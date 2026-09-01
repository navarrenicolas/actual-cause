/** Actual Cause in causal inference experiment

Nicolas Navarre
Dec 7 2022
*/

//////////////////////////////////////////////////////////////////////////////////////
///////                   Definitions                           //////////////////////
//////////////////////////////////////////////////////////////////////////////////////

let subject = {};

const jsPsych = initJsPsych({
  // plugins: ["jsConsentDec"],
  show_progress_bar: true,
  message_progress_bar: '',
  on_finish: function (data) {
    SaveData("actual-cause-grid-0", subject.id, jsPsych.data.get().csv());
    $(".jspsych-content").html('<center><p>Thank you for completing the experiment. <strong>Please use the following link to confirm your participation: </strong><a href="https://app.prolific.co/submissions/complete?cc=4EE4DE9D">https://app.prolific.co/submissions/complete?cc=4EE4DE9D</a>. Your payment will be processed <strong>within 24 hours</strong>.</p></center>')
  }
});

// Simulate some random subject
subject.id = jsPsych.randomization.randomID(10);
jsPsych.data.addProperties({ 'subject_ID': subject.id });



////////////////////////////////////////////////////////////////////////////////////////////
//////////                     GRID FUNCTIONS              /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a list of target locations to go in the datagrid
 * Take a the set of observations 
 * Produce 4 of obs_1 and obs_2
 * Produce 1 of obs_3 and obs_4
 * shuffle the order of a,b,c,d
 * shuffle the order in which the trials appear
 * 
 * @param {*} is_test 
 * @param {*} targets 
 */
var dataCreator = function (urn_order, sample_order, rule) {
  let targets = [];
  for (var i = 0; i < 10; i++) {
    let sample_dict = D_observations[sample_order[i]];
    for (j = 0; j < 4; j++) {
      if (sample_dict[urn_order[j]]) { targets.push([i + 1, j + 1]) };
    }
    if (sample_dict[rule]) { targets.push([i + 1, 5]) };
  }
  return targets;
};


var D_ins = [{'a' : 1, 'b': 0, 'RO0': 1, 'RJ' : 'a'}, 
{'a': 0, 'b': 1, 'RO0': 1, 'RJ' : 'b'}, 
{'a': 0, 'b': 1, 'RO0': 1, 'RJ' : 'b'}, 
 //{'a': 1, 'b': 1, 'RO0': 1, 'RJ' : 'b'} 
]

var insCreator = function (urn_order, sample_order, rule) {
  let targets = [];
  for (var i = 0; i < 3; i++) {
    let sample_dict = D_ins[sample_order[i]];
    for (j = 0; j < 2; j++) {
      if (sample_dict[urn_order[j]]) { targets.push([i + 1, j + 1]) };
    }
    if (sample_dict[rule]) { targets.push([i + 1, 3])};
  }
  return targets;
};

// var causeCreator = function (urn_order, sample_order, rule, nullModel = false) {
//   let judgements = [];
//   let ruleKey = nullModel ? rule + 'NJ' : rule + 'J';

//   for (let i = 0; i < 10; i++) {
//     let sample_dict = D_observations[sample_order[i]];
//     let causes = nullModel
//       ? jsPsych.randomization.sampleWithoutReplacement(sample_dict[ruleKey], 1)[0]
//       : sample_dict[ruleKey];

//     judgements.push.apply(judgements, causes.map(j => urn_order.findIndex(el => el == j)).map(loc => [i + 1, loc + 1]));
//   }
//   return judgements;
// };






// Function to generate randomized null model judgments for all rules and each observation
const getRandomNullModelJudgments = () => {
  let randomJudgments = {};

  ['R1', 'R2', 'R3', 'R4'].forEach((rule) => {
    randomJudgments[rule] = {
      D_obs_1: jsPsych.randomization.sampleWithoutReplacement(D_obs_1[rule + 'NJ'], 1)[0],
      D_obs_2: jsPsych.randomization.sampleWithoutReplacement(D_obs_2[rule + 'NJ'], 1)[0],
      D_obs_3: jsPsych.randomization.sampleWithoutReplacement(D_obs_3[rule + 'NJ'], 1)[0],
      D_obs_4: jsPsych.randomization.sampleWithoutReplacement(D_obs_4[rule + 'NJ'], 1)[0],
    };
  });

  return randomJudgments;
};

// Generate randomized null model judgments for each trial
var randomizedNullModelJudgments = getRandomNullModelJudgments();

// Updated causeCreator function
var causeCreator = function (urn_order, sample_order, rule, { randomizedNullModelJudgments, nullModel = false }) {
  let judgements = [];
  let ruleKey = nullModel ? rule + 'NJ' : rule + 'J';

  for (let i = 0; i < 10; i++) {
    let sample_dict = D_observations[sample_order[i]];

    if (sample_dict.hasOwnProperty(ruleKey)) {
      let causes = nullModel
        ? randomizedNullModelJudgments[rule]['D_obs_' + (sample_order[i] + 1)]
        : sample_dict[ruleKey];

      judgements.push.apply(judgements, causes.map(j => urn_order.findIndex(el => el == j)).map(loc => [i + 1, loc + 1]));
    }
  }
  return judgements;
};







var instruction_data = insCreator(['a', 'b'], [0, 1, 2], 'RO0' )
var instruction_judgments = [[1, 1], [2, 2], [3, 2]]


// var causeCreator = function (urn_order, sample_order, rule) {
//   let judgements = [];
//   for (let i = 0; i < 10; i++) {
//     let sample_dict = D_observations[sample_order[i]];
//     let causes = sample_dict[rule];
//     // Map over the defined judgements and place them in the correct order
//     judgements.push.apply(judgements, causes.map(j => urn_order.findIndex(el => el == j)).map(loc => [i + 1, loc + 1]));
//   }
//   return judgements;
// };
var testCreator = function (urn_order, test_order, rule) {
  let targets = [];
  for (var i = 0; i < test_order.length; i++) {
    let sample_dict = testTrials[test_order[i]];
    for (j = 0; j < 4; j++) {
      if (sample_dict[urn_order[j]]) { targets.push([i + 1, j + 1]) };
    }
    if (sample_dict[rule]) { targets.push([i + 1, 5]) };
  }
  return targets;
}




const get_sample_order = () => jsPsych.randomization.shuffle([0, 0, 0, 0, 1, 1, 1, 1, 2, 3]);
const get_urn_order = () => jsPsych.randomization.shuffle(['a', 'b', 'c', 'd']);
const get_test_order = () => jsPsych.randomization.shuffle([...Array(testTrials.length).keys()]);

/////////////////////////////////////////////////////////
/////////////       GRID PARAMETERS   ///////////////////
/////////////////////////////////////////////////////////

// parameter for the memory-load task
// background color of the selected squares
var color_present = "grey";
var colour_win = "green";
var colour_lose = "red";

// set to false to draw only inner borders in the grids
var border = true;
var grid_size = 50;
// symbol displayed in the selected squares
var symbol_show = "";


// Define the urn orders
var urn_order_1 = get_urn_order();
var urn_order_2 = get_urn_order();
var urn_order_3 = get_urn_order();
var urn_order_4 = get_urn_order();


// Define the sample orders
var sample_order_1 = get_sample_order();
var sample_order_2 = get_sample_order();
var sample_order_3 = get_sample_order();
var sample_order_4 = get_sample_order();

// Define the test orders
var test_order_1 = get_test_order();
var test_order_2 = get_test_order();
var test_order_3 = get_test_order();
var test_order_4 = get_test_order();

// Generate the coordinates to be used in the data, judgement and test creators
observation_data_1 = dataCreator(urn_order_1, sample_order_1, 'R1O');
observation_data_2 = dataCreator(urn_order_2, sample_order_2, 'R2O');
observation_data_3 = dataCreator(urn_order_3, sample_order_3, 'R3O');
observation_data_4 = dataCreator(urn_order_4, sample_order_4, 'R4O');


cause_data_1 = causeCreator(urn_order_1, sample_order_1, 'R1', { randomizedNullModelJudgments, nullModel: true });

cause_data_2 = causeCreator(urn_order_2, sample_order_2, 'R2', { randomizedNullModelJudgments, nullModel: true });

cause_data_3 = causeCreator(urn_order_3, sample_order_3, 'R3', { randomizedNullModelJudgments, nullModel: true });

cause_data_4 = causeCreator(urn_order_4, sample_order_4, 'R4', { randomizedNullModelJudgments, nullModel: true });

test_data_1 = testCreator(urn_order_1, test_order_1, 'R1O');
test_data_2 = testCreator(urn_order_2, test_order_2, 'R2O');
test_data_3 = testCreator(urn_order_3, test_order_3, 'R3O');
test_data_4 = testCreator(urn_order_4, test_order_4, 'R4O');

console.log("here is test data")
console.log(cause_data_1)

jsPsych.data.addProperties({
  "pilot_group": group,
  'test_order1': test_order_1,
  'test_order2': test_order_2,
  'test_order3': test_order_3,
  'test_order4': test_order_4,
  "urn_order1" : urn_order_1,
  "urn_order2" : urn_order_2,
  "urn_order3" : urn_order_3,
  "urn_order4" : urn_order_4,
  "sample_order1": sample_order_1,
  "sample_order2": sample_order_2,
  "sample_order3": sample_order_3,
  "sample_order4": sample_order_4,
});

/////////////////////////////////////////////////////////
/////////////       URN PARAMETERS   ///////////////////
/////////////////////////////////////////////////////////

let white_scoring = (urns) => {
	const str = '<p>Here are two example urns. When you click on the "draw" button, one ball will be randomly drawn from the box. Each ball in the box is equally likely to be selected.</p>'
  if (urns[0].selected && !urns[1].selected) {
    return str + '<p>You have just drawn a white ball from the first urn! Click on the other urn to draw from it. </p>'
  }
   else if (urns[1].selected && !urns[0].selected) {
    return str + '<p>You have just drawn a colored ball from the second urn! Click on the other urn to draw from it.</p>'
  }
  else if (urns[0].selected && urns[1].selected) {
    return str + '<p>You have drawn a white ball from the first urn and a colored ball from the second urn. Click "continue" to move to the next page.</p>'
  }
  return str + '<p> Click on "draw" to draw a ball</p>'
};


//////////////////////////////////////////////////////////////////////////////////////
///////                   Timeline                              //////////////////////
//////////////////////////////////////////////////////////////////////////////////////

var timeline = new Array;

const consent = {
  type: jsConsentDec,
  description: 'Show a standard consent form for DEC, collect consent',
  platform: 'Prolific',
  language: 'en',
  about: 'causality'
};
// timeline.push(consent);

// Record subject's Prolific ID
const AskID = {
  type: jsPsychSurvey,
  pages: [
    [
      {
        type: 'text',
        prompt: "Please enter your Prolific ID",
        name: 'ProlificID',
        required: true
      }
    ]
  ],
  button_label_finish: 'Submit'
};
// timeline.push(AskID)

////////////////////////////////////////////////////
////////        Trials       ///////////////////////
////////////////////////////////////////////////////

const instructions_page = {
  type: jsPsychInstructions,
  pages: [instructions_presentation_1],
  button_label_next: 'Next',
  show_clickable_nav: true
};
timeline.push(instructions_page);


const example_urn = {
  type: jsUrnSelectionMulti,
  groups: [],
  canvas_size: [30, 130],
  prompt: example_scoring,
  scoring: () => '',
  urns: [
    {
      ball_color: "orange",
      is_result_color: false,
      n_colored_balls: 3,
      n_balls: 20,
      background_ball_color: "blue",
      background_color: "#BBBAC6",
      width: 10,
      coords: [20, 10],
    },
    {
      ball_color: "orange",
      is_result_color: false,
      n_colored_balls: 3,
      n_balls: 20,
      background_ball_color: "blue",
      background_color: "#BBBAC6",
      width: 10,
      coords: [35, 10],
    },
    {
      ball_color: "orange",
      is_result_color: false,
      n_colored_balls: 3,
      n_balls: 20,
      background_ball_color: "blue",
      background_color: "#BBBAC6",
      width: 10,
      coords: [50, 10],
    },
    {
      ball_color: "orange",
      is_result_color: true,
      n_colored_balls: 15,
      n_balls: 20,
      background_ball_color: "blue",
      background_color: "#77B2B8",
      width: 10,
      coords: [65, 10],
    },
  ],
};
timeline.push(example_urn);

var instruction_judgments = [[1, 1], [2, 2], [3, 2]]

// Sampling instructions
const instructions_sampling = {
  type: jsGridData,
  prompt: [inst_prompt1,inst_prompt2,inst_prompt3,inst_prompt4],
  custom_prompt: [inst_prompt12,inst_prompt22,inst_prompt32,inst_prompt42],
  grid: [3, 3],
  targets: instruction_data,
  grid_square_size: grid_size,
  sample_trial: true,
  instruction_trial: true,
};
timeline.push(instructions_sampling);


var instruction_test = [ [2, 1], [2, 2], [3, 3], [3, 1], [4, 2]];
var instructions_test_non_sparse = [[0,0],[1,1],[1,0],[0,1]];
var instructions_test_correct = instructions_test_non_sparse.map((e)=> rule0(e))

// Test instructions
const instructions_testing = {
  type: jsGridData,
  prompt: inst_test_1,
  custom_prompt: inst_test_12,
  grid: [3, 3], 
  targets: instruction_data, 
  test_targets: instruction_test, 
  target_colour: color_present,
  sample_trial: false,
  grid_square_size: grid_size,
  cause: false,
}
timeline.push(instructions_testing)


/////// I don't understand how the prompt for the trial below work. When I change the prompt it doesn't change what shows up on the screen ///////
////// on top of the feedback, it always just says: 'Response feedback' ///////////////////

const instructions_testing_2 = {
  type: jsGridData,
  prompt: "Something that should show up on the screen but doesn't",
  custom_prompt: inst_test_12,
  grid: [4, 3],
  targets: instruction_data, 
  test_targets: instruction_test, 
  target_colour: color_present,
  sample_trial: false,
  grid_square_size: grid_size,
  cause: false,
  previous_responses: () =>  {  
    // this question prompt is dynamic - the text that is shown 
    // will change based on the participant's earlier response
    return jsPsych.data.getLastTrialData().values()[0].test_responses;
  },
  test_correct: instructions_test_correct,
}
timeline.push(instructions_testing_2)


const grid_1 = {
  type: jsGridData,
  prompt: rule_prompt(1),
  grid: [10, 5],
  test_targets:[],
  targets: observation_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(grid_1);

const test_1 = {
  type: jsGridData,
  prompt: rule_prompt(1),
  grid: [10, 5],
  test_grid: [16,5],
  test_targets: test_data_1,
  targets: observation_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(test_1);


const grid_2 = {
  type: jsGridData,
  grid: [10, 5],
  prompt: rule_prompt(2),
  targets: observation_data_2,
  grid_square_size: grid_size
};
// timeline.push(grid_2);

const test_2 = {
  type: jsGridData,
  prompt: rule_prompt(2),
  grid: [10, 5],
  test_grid: [16,5],
  test_targets: test_data_2,
  targets: observation_data_2,
  grid_square_size: grid_size,
};
// timeline.push(test_2);

const grid_3 = {
  type: jsGridData,
  prompt: rule_prompt(3),
  grid: [10, 5],
  targets: observation_data_3,
  // judgements: cause_data_3,
  grid_square_size: grid_size
};

// timeline.push(grid_3);

const test_3 = {
  type: jsGridData,
  prompt: rule_prompt(3),
  grid: [10, 5],
  test_grid: [16,5],
  test_targets: test_data_3,
  targets: observation_data_3,
  grid_square_size: grid_size,
};
// timeline.push(test_3);


const grid_4 = {
  type: jsGridData,
  grid: [10, 5],
  prompt: rule_prompt(4),
  targets: observation_data_4,
  target_colour: color_present,
  grid_square_size: grid_size
};
// timeline.push(grid_4);

const test_4 = {
  type: jsGridData,
  prompt: rule_prompt(4),
  grid: [10, 5],
  test_grid: [16,5],
  test_targets: test_data_4,
  targets: observation_data_4,
  grid_square_size: grid_size,
};
//timeline.push(test_4);


// if (group == 1) {
//   timeline.push(grid_1);
//   timeline.push(test_1);
// }
// else if (group == 2) {
//   timeline.push(grid_2);
//   timeline.push(test_2);
// }
// else if (group == 3) {
//   timeline.push(grid_3);
//   timeline.push(test_3);
// }
// else if (group == 4) {
//   timeline.push(grid_4);
//   timeline.push(test_4);
// }


// Judgement instructions
const instructions_judgements= {
  type: jsGridData,
  prompt: [inst_judg_1,inst_judg_2,inst_judg_3],
  custom_prompt: [inst_judg_12,inst_judg_22,inst_judg_32],
  grid: [3, 3],
  targets: instruction_data,
  grid_square_size: grid_size,
  judgements: instruction_judgments,
  sample_trial: false,
  instruction_trial: true,
};
 //timeline.push(instructions_judgements);




const grid_1_judgements = {
  type: jsGridData,
  prompt: rule_prompt(1),
  grid: [10, 5],
  test_targets:[],
  targets: observation_data_1,
  judgements: cause_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(grid_1_judgements);

const test_1_judgements = {
  type: jsGridData,
  prompt: rule_prompt(1),
  grid: [10, 5],
  test_grid: [16,5],
  test_targets: test_data_1,
  targets: observation_data_1,
  judgements: cause_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(test_1_judgements);

const grid_2_judgements = {
  type: jsGridData,
  prompt: rule_prompt(2),
  grid: [10, 5],
  test_targets:[],
  targets: observation_data_2,
  judgements: cause_data_2,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(grid_2_judgements);

const test_2_judgements = {
  type: jsGridData,
  prompt: rule_prompt(2),
  grid: [10, 5],
  test_grid: [16,5],
  test_targets: test_data_2,
  targets: observation_data_2,
  judgements: cause_data_2,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(test_1_judgements);

const grid_3_judgements = {
  type: jsGridData,
  prompt: rule_prompt(3),
  grid: [10, 5],
  test_targets:[],
  targets: observation_data_3,
  judgements: cause_data_3,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(grid_3_judgements);

const test_3_judgements = {
  type: jsGridData,
  prompt: rule_prompt(3),
  grid: [10, 5],
  test_grid: [16,5],
  test_targets: test_data_3,
  targets: observation_data_3,
  judgements: cause_data_3,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(test_3_judgements);

const grid_4_judgements = {
  type: jsGridData,
  prompt: rule_prompt(4),
  grid: [10, 5],
  test_targets:[],
  targets: observation_data_4,
  judgements: cause_data_4,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(grid_4_judgements);

const test_4_judgements = {
  type: jsGridData,
  prompt: rule_prompt(4),
  grid: [10, 5],
  test_grid: [16,5],
  test_targets: test_data_4,
  targets: observation_data_4,
  judgements: cause_data_4,
  target_colour: color_present,
  grid_square_size: grid_size,
};
// timeline.push(test_4_judgements);


if (group == 1) {
  timeline.push(grid_1_judgements);
  timeline.push(test_1_judgements);
}
else if (group == 2) {
  timeline.push(grid_2_judgements);
  timeline.push(test_2_judgements);
}
else if (group == 3) {
  timeline.push(grid_3_judgements);
  timeline.push(test_3_judgements);
}
else if (group == 4) {
  timeline.push(grid_4_judgements);
  timeline.push(test_4_judgements);
}


jsPsych.run(timeline);