/** Actual Cause in causal inference experiment

Nicolas Navarre
Dec 7 2022
*/

//////////////////////////////////////////////////////////////////////////////////////
///////                   Definitions                           //////////////////////
//////////////////////////////////////////////////////////////////////////////////////

// function randomizeNoRepeats(arr) {
//   var currentIndex = arr.length, temporaryValue, randomIndex;
//   var count = 0;
//   while (currentIndex !== 0) {
//     randomIndex = Math.floor(Math.random() * currentIndex);
//     currentIndex--;
//     if (count < 2 || arr[currentIndex] !== arr[currentIndex + 1]) {
//       temporaryValue = arr[currentIndex];
//       arr[currentIndex] = arr[randomIndex];
//       arr[randomIndex] = temporaryValue;
//       count = (temporaryValue === arr[currentIndex - 1]) ? count + 1 : 0;
//     } else {
//       currentIndex++;
//     }
//   }
//   return arr;
// }







let subject = {};
let rule = 3;

const jsPsych = initJsPsych({
  // plugins: ["jsConsentDec"],
  show_progress_bar: true,
  message_progress_bar: '',
  on_finish: function (data) {
     SaveData("actual-cause-grid-1", subject.id, jsPsych.data.get().csv());
    //jsPsych.data.get().localSave("csv","local_save.csv");
    $(".jspsych-content").html('<center><p>Thank you for completing the experiment. <strong>Please use the following link to confirm your participation: </strong><a href="https://app.prolific.co/submissions/complete?cc=C1AGQUOF">https://app.prolific.co/submissions/complete?cc=C1AGQUOF</a>. Your payment will be processed <strong>within 24 hours</strong>.</p></center>')
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


var D_ins = [{ 'a': 1, 'b': 0, 'RO0': 1, 'RJ': 'a' },
{ 'a': 0, 'b': 1, 'RO0': 1, 'RJ': 'b' },
{ 'a': 0, 'b': 1, 'RO0': 1, 'RJ': 'b' },
  //{'a': 1, 'b': 1, 'RO0': 1, 'RJ' : 'b'} 
]

var insCreator = function (urn_order, sample_order, rule) {
  let targets = [];
  for (var i = 0; i < 3; i++) {
    let sample_dict = D_ins[sample_order[i]];
    for (j = 0; j < 2; j++) {
      if (sample_dict[urn_order[j]]) { targets.push([i + 1, j + 1]) };
    }
    if (sample_dict[rule]) { targets.push([i + 1, 3]) };
  }
  return targets;
};


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
  let sample_causes = [];
  for (let i = 0; i < 10; i++) {
    let sample_dict = D_observations[sample_order[i]];

    if (sample_dict.hasOwnProperty(ruleKey)) {
      let causes = nullModel
        ? randomizedNullModelJudgments[rule]['D_obs_' + (sample_order[i] + 1)] : sample_dict[ruleKey];

      sample_causes.push(causes)
      judgements.push.apply(judgements, causes.map(j => urn_order.findIndex(el => el == j)).map(loc => [i + 1, loc + 1]));
    }
  }
  return [sample_causes,judgements];
};

pre_trial_shuffle = function(urn_order)
{
  let original_mapping = {1:'a',2:'b',3:'c',4:'d'};
  let pre_trial_original = [[1, 2], [2, 1], [2, 2], [3, 1], [3, 2], [4, 1], [4, 3], [5, 1], [5, 2], [6, 1], [6, 2], [6, 3], [7, 1], [7, 3], [8, 1], [9, 1], [9, 2], [10, 1], [10, 3]]
  let urn_mapping = {};
  for (let i = 1; i <= urn_order.length;i++){
    urn_mapping[urn_order[i-1]] = i;
  };
  return pre_trial_original.map((el) => [el[0], (urn_mapping)[(original_mapping)[el[1]]] ]);
}


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

const pseudo_random_sample_order1 = [0, 1, 1, 2, 0, 1, 0, 3, 0, 1];
const pseudo_random_sample_order2 = [1, 0, 0, 3, 1, 1, 0, 1, 0, 2];

function hasRepeatedElement(arr) {
  for (let i = 0; i < arr.length - 2; i++) {
    if (arr[i] === arr[i + 1] && arr[i] === arr[i + 2]) {
      return true; // Found a repeated element
    }
  }
  return false; // No repeated element found
}

const get_sample_order = () => {
  let randomOrder = jsPsych.randomization.shuffle([0, 0, 0, 0, 1, 1, 1, 1, 2, 3]);
  while(hasRepeatedElement(randomOrder)){
    randomOrder = jsPsych.randomization.shuffle([0, 0, 0, 0, 1, 1, 1, 1, 2, 3]);
  }
  return randomOrder;
}
const get_urn_order = () => jsPsych.randomization.shuffle(['a', 'b', 'c', 'd']);
const get_test_order = () => jsPsych.randomization.shuffle([...Array(testTrials.length).keys()]);

/////////////////////////////////////////////////////////
/////////////       GRID PARAMETERS   ///////////////////
/////////////////////////////////////////////////////////

// parameter for the memory-load task
// background color of the selected squares
var color_present = "grey";

// set to false to draw only inner borders in the grids
var grid_size = 50;


// Define the urn orders
var urn_order_1 = get_urn_order();
var urn_order_2 = get_urn_order();
//var urn_order_3 = get_urn_order();
var urn_order_3 = ['a','b','c','d'];
var urn_order_4 = get_urn_order();

// Define the sample orders
var sample_order_1 = get_sample_order();
var sample_order_2 = get_sample_order();
//var sample_order_3 = get_sample_order();
var sample_order_3 = [1, 0, 2, 3, 0, 1, 1, 0, 0, 1];
var sample_order_4 = get_sample_order();

// Define the test orders
var test_order_1 = get_test_order();
var test_order_2 = get_test_order();
//var test_order_3 = get_test_order();
var test_order_3 = [5, 6, 3, 4, 2, 8, 0, 7, 1, 13, 9, 15, 12, 14, 11, 10];
var test_order_4 = get_test_order();

// Generate the coordinates to be used in the data, judgement and test creators
observation_data_1 = dataCreator(urn_order_1, sample_order_1, 'R1O');
observation_data_2 = dataCreator(urn_order_2, sample_order_2, 'R2O');
observation_data_3 = dataCreator(urn_order_3, sample_order_3, 'R3O');
observation_data_4 = dataCreator(urn_order_4, sample_order_4, 'R4O');


var is_null_model = group == 2;

[causes_1, cause_data_1] = causeCreator(urn_order_1, sample_order_1, 'R1', { randomizedNullModelJudgments, nullModel: is_null_model });
[causes_2, cause_data_2] = causeCreator(urn_order_2, sample_order_2, 'R2', { randomizedNullModelJudgments, nullModel: is_null_model });
[causes_3, cause_data_3] = causeCreator(urn_order_3, sample_order_3, 'R3', { randomizedNullModelJudgments, nullModel: is_null_model });
[causes_4, cause_data_4] = causeCreator(urn_order_4, sample_order_4, 'R4', { randomizedNullModelJudgments, nullModel: is_null_model });


test_data_1 = testCreator(urn_order_1, test_order_1, 'R1O');
test_data_2 = testCreator(urn_order_2, test_order_2, 'R2O');
test_data_3 = testCreator(urn_order_3, test_order_3, 'R3O');
test_data_4 = testCreator(urn_order_4, test_order_4, 'R4O');


var pre_trial_samples = pre_trial_shuffle(urn_order_3);
var instruction_data = insCreator(['a', 'b'], [0, 1, 2], 'RO0')
var instruction_judgments = [[1, 1], [2, 2], [3, 2]]

var instruction_test = [[2, 1], [2, 2], [3, 3], [3, 1], [4, 2]];
var instructions_test_non_sparse = [[0, 0], [1, 1], [1, 0], [0, 1]];
var instructions_test_correct = instructions_test_non_sparse.map((e) => rule0(e));


var test_key_1 = test_order_1.map(el => testTrials[el]["R1O"]);
var test_key_2 = test_order_2.map(el => testTrials[el]["R2O"]);
var test_key_3 = test_order_3.map(el => testTrials[el]["R3O"]);
var test_key_4 = test_order_4.map(el => testTrials[el]["R4O"]);

var test_orders = [test_order_1,test_order_2,test_order_3,test_order_4,];
var test_keys = [test_key_1,test_key_2,test_key_3,test_key_4,];
var urn_orders = [urn_order_1,urn_order_2,urn_order_3,urn_order_4,];
var sample_orders = [sample_order_1,sample_order_2,sample_order_3,sample_order_4,];
var world_map = {
 0:  "0,0,0,0", 
 1:  "0,0,0,1", 
 2:  "0,0,1,0", 
 3:  "0,0,1,1", 
 4:  "0,1,0,0", 
 5:  "0,1,0,1", 
 6:  "0,1,1,0", 
 7:  "0,1,1,1", 
 8:  "1,0,0,0", 
 9:  "1,0,0,1", 
 10: "1,0,1,0", 
 11: "1,0,1,1", 
 12: "1,1,0,0", 
 14: "1,1,1,0", 
 13: "1,1,0,1", 
 15: "1,1,1,1", 
};


var sample_map = {2:4,1:10,0:12,3:15};
var world_priors = [216, 24, 144, 16, 324, 36, 216, 24, 1944, 216, 1296, 144, 2916, 324,1944, 216]; 
var sample_order = sample_orders[rule-1].map(el=>sample_map[el]); 
var deja_vu_worlds = Object.values(sample_map);
var causes = [causes_1,causes_2,causes_3,causes_4,];
var causal_selections = causes[rule-1];

function powerSet(arr) {
  let result = [[]];
  for (let elem of arr) {
    result = [...result, ...result.map(set => [...set, elem])];
  }
  return result;
}




// Here we devise a way of mapping the causal selections to an identitifying index
selections = powerSet(['a','b','c','d']);
selection_map = selections.reduce((acc, val, idx) => {
  acc[idx] = val;
  return acc;
}, {});

// in case we ever want to go back from an index to the array of causes
function flipDict(dict){
  return Object.entries(dict).reduce((acc, [key, value]) => {
    return {...acc, [value]: key};
  }, {});
}
inverse_selection_map = flipDict(selection_map);

// Causal selections may be stored as full strings of number indeces


jsPsych.data.addProperties({
  group : group,
  null_model : is_null_model,
  rule : rule,
  test_order: test_orders[rule-1], // list of world indeces in the order they appeared 
  urn_order: urn_orders[rule-1], // ordering of the urns as a list of names ['a','b',...]
  sample_order: sample_order, // order of the samples with the corresponding world indeces
  world_priors: world_priors, // non-normalized priors
  causal_selections: causal_selections, // array of selected causes
  test_key: test_keys[rule-1], // the list of correct answers with respect to the test order
  // deja_vu_worlds,deja_vu_worlds, // indeces of the worlds thats are presented in the observations
  // world_map: world_map, // dictionary to keep track of what exact sample each index corresponds to
  // inverse_selection_map: inverse_selection_map,
});


/////////////////////////////////////////////////////////
/////////////       URN PARAMETERS   ///////////////////
/////////////////////////////////////////////////////////

var background_ball_color = '#CBCDCD';
var urn_background_color = "white";

instruction_urns = [
  {
    ball_color: "orange",
    is_result_color: false,
    n_colored_balls: 9,
    n_balls: 20,
    background_ball_color: background_ball_color,
    background_color: urn_background_color,
    width: 15,
    coords: [30, 5],
    id:'A',
  },
  {
    ball_color: "blue",
    is_result_color: false,
    n_colored_balls: 14,
    n_balls: 20,
    background_ball_color: background_ball_color,
    background_color: urn_background_color,
    width: 15,
    coords: [50, 5],
    id:'B',
  }
];

urn_colours = {'a':"orange",'b':"blue",'c':"purple",'d':"#eb33a1"};
function makeUrnColourMap(urn_order){
  return urn_order.reduce((acc, val, idx) => {
    acc[idx+1] = urn_colours[val];
    return acc;
  }, {});
}

instruction_urn_colour_map = {1:'orange',2:'blue'};
urn_colour_map_1 = makeUrnColourMap(urn_order_1);
urn_colour_map_2 = makeUrnColourMap(urn_order_2);
urn_colour_map_3 = makeUrnColourMap(urn_order_3);
urn_colour_map_4 = makeUrnColourMap(urn_order_4);


var makeTrialUrns = function (randomUrns) {
  let urns = []
  randomUrns.forEach((urnName) => {
    let urn = {};
    urn = ({
      'a': {
        ball_color: urn_colours['a'],
        is_result_color: false,
        n_colored_balls: 18,
        n_balls: 20,
        background_ball_color: background_ball_color,
        background_color: urn_background_color,
        // background_color: "#E8E0D9",
        width: 15,
      },
      'b': {
        ball_color: urn_colours['b'],
        is_result_color: false,
        n_colored_balls: 12,
        n_balls: 20,
        background_ball_color: background_ball_color,
        background_color: urn_background_color,
        // background_color: "#C2CFB2",
        width: 15,
      },
      'c': {
        ball_color: urn_colours['c'],
        is_result_color: false,
        n_colored_balls: 8,
        n_balls: 20,
        background_ball_color: background_ball_color,
        background_color: urn_background_color,
        // background_color: "#F3BA91",
        width: 15,
      },
      'd': {
        ball_color: urn_colours['d'],
        is_result_color: false,
        n_colored_balls: 2,
        n_balls: 20,
        background_ball_color: background_ball_color,
        background_color: urn_background_color,
        // background_color: "#77B2B8",
        width: 15,
      },
    })[urnName];
    urns.push(urn);
  });
  // Set the urn coordinates
  for (let i = 0; i < urns.length; i++) {
    urns[i].coords = [10 + i * 20, 5];
  }
  urns.forEach((el,idx)=> {el['id'] = ({0:'A',1:'B',2:'C',3:'D'})[idx]}); 
  return urns;
}
trial_urns = makeTrialUrns(urn_order_1);

//////////////////////////////////////////////////////////////////////////////////////
///////                   Timeline                              //////////////////////
//////////////////////////////////////////////////////////////////////////////////////

var timeline = new Array;

const consent = {
  type: jsConsentDec,
  description: 'Show a standard consent form for DEC, collect consent',
  platform: 'Prolific',
  language: 'en',
  about: 'reasoning',
  data: {'questionId':"consent"},
};

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
  button_label_finish: 'Submit',
  data: {'questionId':"ProlificID"},
};

////////////////////////////////////////////////////
////////        Trials       ///////////////////////
////////////////////////////////////////////////////

const instructions_page = {
  type: jsPsychInstructions,
  pages: [instructions_presentation_1],
  button_label_next: 'Next',
  show_clickable_nav: true,
  data: {'questionId': "instructions_introduction"},
};

// Sampling instructions
const instructions_sampling = {
  groups: [],
  type: jsUrnSlots,
  canvas_size: [30, 130],
  // prompt: example_scoring,
  urns: instruction_urns,
  urn_colours : instruction_urn_colour_map,
  prompt: [inst_prompt1, inst_prompt2, inst_prompt3, inst_prompt4],
  custom_prompt: [inst_prompt12, inst_prompt22, inst_prompt32, inst_prompt42],
  grid: [3, 3],
  targets: instruction_data,
  grid_square_size: grid_size,
  sample_trial: true,
  instruction_trial: true,
  data: {'questionId':"instructions_sampling"},
};


// Test instructions
const instructions_testing = {
  type: jsUrnSlots,
  groups: [],
  canvas_size: [30, 130],
  urns: instruction_urns,
  urn_colours : instruction_urn_colour_map,
  prompt: inst_test_1,
  custom_prompt: inst_test_12,
  grid: [3, 3],
  targets: instruction_data,
  test_targets: instruction_test,
  target_colour: color_present,
  sample_trial: false,
  grid_square_size: grid_size,
  data: {'questionId':"instructions_testing" },
}



const instructions_testing_2 = {
  type: jsUrnSlots,
  groups: [],
  canvas_size: [30, 130],
  urns: instruction_urns,
  urn_colours : instruction_urn_colour_map,
  prompt: feedback_prompt, /// HERE INSERT THE PROMPT
  custom_prompt: "",
  grid: [4, 3],
  targets: instruction_data,
  test_targets: instruction_test,
  target_colour: color_present,
  sample_trial: false,
  grid_square_size: grid_size,
  previous_responses: () => {
    // this question prompt is dynamic - the text that is shown 
    // will change based on the participant's earlier response
    return jsPsych.data.getLastTrialData().values()[0].response;
  },
  test_correct: instructions_test_correct,
  data: {'questionId':"instructions_feedback"},
}


const pre_trial_sampling =
{
  type: jsUrnSlots,
  grid: [10, 5],
  prompt: pre_trial_sampling_prompt,
  custom_prompt:'',
  targets: pre_trial_samples,
  grid_square_size: grid_size,
  // grid_size:50,
  instruction_trial: false,
  sample_trial: true,
  canvas_size: [30, 130],
  urns: makeTrialUrns(urn_order_3),
  urn_colours : urn_colour_map_3,
  pre_sample: true,
  groups: [],
  data: {'questionId':"trial_presample" },
}

const grid_1 = {
  type: jsUrnSlots,
  groups: [],
  canvas_size: [30, 130],
  // prompt: example_scoring,
  urns: trial_urns,
  urn_colours : urn_colour_map_1,
  prompt: rule_prompt1(1),
  grid: [10, 5],
  test_targets: [],
  targets: observation_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
  data: {'questionId':"trial_observations" },
};


const test_1 = {
  type: jsUrnSlots,
  groups: [],
  canvas_size: [30, 130],
  // prompt: example_scoring,
  urns: trial_urns,
  urn_colours : urn_colour_map_1,
  prompt: rule_prompt1(2),
  grid: [10, 5],
  test_grid: [16, 5],
  test_targets: test_data_1,
  targets: observation_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
  data: {'questionId':"trial_test" },
};


const grid_2 = {
  type: jsUrnSlots,
  grid: [10, 5],
  prompt: rule_prompt1(1),
  targets: observation_data_2,
  grid_square_size: grid_size,
  data: {'questionId':"trial_observations" },
};

const test_2 = {
  type: jsUrnSlots,
  prompt: rule_prompt1(2),
  grid: [10, 5],
  test_grid: [16, 5],
  test_targets: test_data_2,
  targets: observation_data_2,
  grid_square_size: grid_size,
  data: {'questionId': "trial_test"},
};

const grid_3 = {
  type: jsUrnSlots,
  prompt: rule_prompt1(1),
  grid: [10, 5],
  targets: observation_data_3,
  grid_square_size: grid_size,
  groups: [],
  canvas_size: [30, 130],
  urns: makeTrialUrns(urn_order_3),
  urn_colours : urn_colour_map_3,
  data: {'questionId': "trial_observations" },
};

const test_3 = {
  type: jsUrnSlots,
  prompt: rule_prompt1(2),
  grid: [10, 5],
  test_grid: [16, 5],
  test_targets: test_data_3,
  targets: observation_data_3,
  grid_square_size: grid_size,
  groups: [],
  canvas_size: [30, 130],
  // prompt: example_scoring,
  urns: makeTrialUrns(urn_order_3),
  urn_colours : urn_colour_map_3,
  data: {'questionId': "trial_test" },
};


const grid_4 = {
  type: jsUrnSlots,
  grid: [10, 5],
  prompt: rule_prompt1(1),
  targets: observation_data_4,
  target_colour: color_present,
  grid_square_size: grid_size,
  data: {'questionId': "trial_observations" },
};

const test_4 = {
  type: jsUrnSlots,
  prompt: rule_prompt1(2),
  grid: [10, 5],
  test_grid: [16, 5],
  test_targets: test_data_4,
  targets: observation_data_4,
  grid_square_size: grid_size,
  data: {'questionId': "trial_test" },
};

// Judgement instructions

const instructions_judgements =
{
  type: jsUrnSlots,
  canvas_size: [30, 130],
  // prompt: example_scoring,
  urns: instruction_urns,
  urn_colours : instruction_urn_colour_map,
  prompt: [inst_judg_1, inst_judg_2, inst_judg_3],
  custom_prompt: [inst_judg_12, inst_judg_22, inst_judg_32],
  grid: [3, 3],
  targets: instruction_data,
  grid_square_size: grid_size,
  judgements: instruction_judgments,
  sample_trial: false,
  instruction_trial: true,
  groups : [],
  data: {'questionId': "instructions_judgements" },
};

const grid_1_judgements = {
  type: jsUrnSlots,
  groups: [],
  urns: trial_urns,
  urn_colours : urn_colour_map_1,
  canvas_size: [30, 130],
  prompt: rule_prompt1(1),
  grid: [10, 5],
  test_targets: [],
  targets: observation_data_1,
  judgements: cause_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
  data: {'questionId': "trial_observations" },
};

const test_1_judgements = {
  type: jsUrnSlots,
  groups: [],
  urns: trial_urns,
  urn_colours : urn_colour_map_1,
  canvas_size: [30, 130],
  prompt: rule_prompt1(2),
  grid: [10, 5],
  test_grid: [16, 5],
  test_targets: test_data_1,
  targets: observation_data_1,
  judgements: cause_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
  data: {'questionId': "trial_test" },
};

const grid_2_judgements = {
  type: jsUrnSlots,
  prompt: rule_prompt1(1),
  grid: [10, 5],
  test_targets: [],
  targets: observation_data_2,
  judgements: cause_data_2,
  target_colour: color_present,
  grid_square_size: grid_size,
  groups : [],
  data: {'questionId': "trial_observations" },
};

const test_2_judgements = {
  type: jsUrnSlots,
  prompt: rule_prompt1(2),
  grid: [10, 5],
  test_grid: [16, 5],
  test_targets: test_data_2,
  targets: observation_data_2,
  judgements: cause_data_2,
  target_colour: color_present,
  grid_square_size: grid_size,
  groups : [],
  data: {'questionId': "trial_test" },
};

const grid_3_judgements = {
  type: jsUrnSlots,
  prompt: rule_prompt1(1),
  grid: [10, 5],
  test_targets: [],
  targets: observation_data_3,
  judgements: cause_data_3,
  target_colour: color_present,
  grid_square_size: grid_size,
  groups: [],
  canvas_size: [30, 130],
  urns: makeTrialUrns(urn_order_3),
  urn_colours : urn_colour_map_3,
  data: {'questionId': "trial_observations" },
};

const test_3_judgements = {
  type: jsUrnSlots,
  prompt: rule_prompt1(2),
  grid: [10, 5],
  test_grid: [16, 5],
  test_targets: test_data_3,
  targets: observation_data_3,
  judgements: cause_data_3,
  target_colour: color_present,
  grid_square_size: grid_size,
  groups: [],
  canvas_size: [30, 130],
  // prompt: example_scoring,
  urns: makeTrialUrns(urn_order_3),
  urn_colours : urn_colour_map_3,
  data: {'questionId': "trial_test" },
};

const grid_4_judgements = {
  type: jsUrnSlots,
  prompt: rule_prompt1(1),
  grid: [10, 5],
  test_targets: [],
  targets: observation_data_4,
  judgements: cause_data_4,
  target_colour: color_present,
  grid_square_size: grid_size,
  groups : [],
  data: {'questionId': "trial_observations" },
};

const test_4_judgements = {
  type: jsUrnSlots,
  prompt: rule_prompt1(2),
  grid: [10, 5],
  test_grid: [16, 5],
  test_targets: test_data_4,
  targets: observation_data_4,
  judgements: cause_data_4,
  target_colour: color_present,
  grid_square_size: grid_size,
  groups : [],
  data: {'questionId': "trial_test" },
};



const instructions_page2 = {
  type: jsPsychInstructions,
  pages: [instructions_presentation_2],
  button_label_next: 'Begin',
  show_clickable_nav: true,
  data: {'questionId': "pre_trial" },
};

const instructions_page3 = {
  type: jsPsychSurvey,
  pages: [
    [

      {
        type: 'html',
        prompt: instructions_presentation_3,
      },
      {
        type: 'text',
        prompt: question_prompt_condition,
        textbox_columns: 5,
        textbox_rows: 2,
        name: 'Supposed rule',
        required: false
      },
      {
        type: 'text',
        prompt: question_prompt_information,
        textbox_columns: 5,
        textbox_rows: 2,
        name: 'Strategy used',
        required: false
      },
      {
        type: 'multi-choice',
        prompt: question_prompt_priors,
        name: 'Use of priors',
        options: ['Yes', 'No'],
        required: true,
      },
      {
        type: 'text',
        prompt: question_prompt_priors_explanation,
        textbox_columns: 5,
        textbox_rows: 2,
        name: 'Explain priors',
        required: false,
      }

    ]

  ],
  button_label_finish: 'Submit',
  data: {"questionId": "follow-up_questions" },
};


const final_feedback = {
  type: jsUrnSlots,
  groups: [],
  canvas_size: [30, 130],
  urns: makeTrialUrns(urn_order_3),
  urn_colours : urn_colour_map_3,
  prompt: final_feedback_prompt(urn_order_3), 
  custom_prompt: "",
  grid: [16, 5],
  targets: observation_data_3,
  test_targets: test_data_3,
  target_colour: color_present,
  sample_trial: false,
  grid_square_size: grid_size,
  previous_responses: () => {
    // this question prompt is dynamic - the text that is shown 
    // will change based on the participant's earlier response
    // console.log(jsPsych.data.get().last(2).values());
    return jsPsych.data.get().last(2).values()[0].response;
  },
  test_correct: test_key_3,
  data: {"questionId": "trial_feedback" },
}


const final_questions = {
  type: jsPsychSurvey,
  pages: [
    [

      {
        type: 'html',
        prompt: final_questions_prompt,
      },
      {
        type: 'text',
        prompt: final_prompt_rule,
        textbox_columns: 7,
        textbox_rows: 10,
        name: 'Opinion on the rule',
        required: false
      },
      {
        type: 'text',
        prompt: final_prompt_rule_explanation,
        textbox_columns:7,
        textbox_rows: 10,
        name: 'Opinion on the judgments',
        required: false
      },
      {
        type: 'text',
        prompt: final_prompt_rule_comments,
        textbox_columns:7,
        textbox_rows: 10,
        name: 'General opinions on the game',
        required: false,
      }

    ]

  ],
  button_label_finish: 'Submit',
  data: {"questionId": "final_questions" },
};

////////////////////////
// Push timeline
///////////////////////
timeline.push(consent);
timeline.push(AskID)
timeline.push(instructions_page);
timeline.push(instructions_sampling);
timeline.push(instructions_testing);
timeline.push(instructions_testing_2);


if(group==1){

  timeline.push(pre_trial_sampling);
  timeline.push(instructions_page2)
  timeline.push(grid_3);
  timeline.push(test_3);

}else{
  timeline.push(instructions_judgements);
  timeline.push(pre_trial_sampling);
  timeline.push(instructions_page2)
  timeline.push(grid_3_judgements);
  timeline.push(test_3_judgements);

}

timeline.push(instructions_page3);
timeline.push(final_feedback);
// timeline.push(final_questions);
timeline.push(demographics_block);
timeline.push(demographics_block_2);

jsPsych.run(timeline);
