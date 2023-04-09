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
    SaveData("actual-cause-grid", subject.id, jsPsych.data.get().csv());
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

var instruction_data = insCreator(['a', 'b'], [0, 1, 2], 'RO0' )


var cinsCreator = function (urn_order, sample_order, rule) {
  let judgements = [];
  for (let i = 0; i < 2; i++) {
    let sample_dict = D_observations[sample_order[i]];
    let causes = sample_dict[rule];
    // Map over the defined judgements and place them in the correct order
    judgements.push.apply(judgements, causes.map(j => urn_order.findIndex(el => el == j)).map(loc => [i + 1, loc + 1]));
  }
  return judgements;
};

var causeCreator = function (urn_order, sample_order, rule) {
  let judgements = [];
  for (let i = 0; i < 10; i++) {
    let sample_dict = D_observations[sample_order[i]];
    let causes = sample_dict[rule];
    // Map over the defined judgements and place them in the correct order
    judgements.push.apply(judgements, causes.map(j => urn_order.findIndex(el => el == j)).map(loc => [i + 1, loc + 1]));
  }
  return judgements;
};
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
console.log(observation_data_1)


cause_data_1 = causeCreator(urn_order_1, sample_order_1, 'R1J');
cause_data_2 = causeCreator(urn_order_2, sample_order_2, 'R2J');
cause_data_3 = causeCreator(urn_order_3, sample_order_3, 'R3J');
cause_data_4 = causeCreator(urn_order_4, sample_order_4, 'R4J');

test_data_1 = testCreator(urn_order_1, test_order_1, 'R1O');
test_data_2 = testCreator(urn_order_2, test_order_2, 'R2O');
test_data_3 = testCreator(urn_order_3, test_order_3, 'R3O');
test_data_4 = testCreator(urn_order_4, test_order_4, 'R4O');




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
//timeline.push(instructions_page);

const example_urn_1 = {
  type: jsUrnSelection,
  groups: [],
  canvas_size: [50, 140],
  prompt: white_scoring,
  scoring: () => '',
  urns: [{ball_color: "purple", is_result_color: false, n_colored_balls: 3, n_balls:20, background_ball_color: "white",width: 25, coords: [0,10]},
  {ball_color: "yellow", is_result_color: true, n_colored_balls: 15, n_balls:20, background_ball_color: "white",width: 25, coords: [50,10]}, ]
}


//timeline.push(example_urn_1);


const example_urn_2 = {
  type: jsUrnSelectionMulti,
  groups: [],
  canvas_size: [50, 140],
  prompt: white_scoring,
  scoring: () => '',
  urns: [
    {
      ball_color: "purple",
      is_result_color: false,
      n_colored_balls: 3,
      n_balls: 20,
      background_ball_color: "white",
      width: 25,
      coords: [25, 10],
    },
    {
      ball_color: "yellow",
      is_result_color: true,
      n_colored_balls: 15,
      n_balls: 20,
      background_ball_color: "white",
      width: 25,
      coords: [60, 10],
    },
  ],
};
//timeline.push(example_urn_2);

// Text:

var ins_prompt1 = `We will first present you with a simplified example of the game, where you draw urns from only two urns, and are given the outcome that results from your draw.</br> Click on the 'Draw sample' button to start the game.`
var ins_prompt2 = "Here in this first sample, you have drawn a yellow ball from the first urn, and a blue ball from the second urn. The outcome is a win, indicated by a green square. This observation can help you figure out what are the conditions for winning in this game.</br>For example, here the condition for winning might be: 'You need to draw a blue ball from the second urn to win', or 'You need to draw at least one yellow ball to win', or any other possibility that is compatible with the observation you see. </br>Once you've drawn a sample, you can clik on `save sample ` to save it and look at it later, together with the other samples you draw. "
var ins_prompt3 = 'In the second sample you drew, you drew a blue ball from the first urn, and a yellow ball from the second urn. The outcome is, here again, a win. The rule that links observations and outcomes is <b> the same rule </b> for every draw in a given game. So you can use this observation, together with the previous one, to try to infer what is the rule that underlies this dataset.'

var ins_prompt4 = 'For some of those examples, we will provide you with <b> causal explanations </b>'


// Here I would neeed a way to make it such that the causal judgments appear after one clicks
// on the 'draw sample' button the second time around. This is a bit harder to do, so I can make this the focus of tomorrow. 


// Another thing I could take care of even now, is to make the string that appears when you psuh the draw button 
// a parameter à part entière, so that one can manipulate it. 

// One question this is going to raise is what do we do when there is 




var instruction_prompt = function(number){
  // if (current_sample == 1) {
  //   return 'Here for example, you drew a yellow ball from the first urn, and a blue ball from the second urn. The outcome associated with that draw is a loss.'
  // }
  return `<h1> Here is a simplified example, where you draw balls from just two different balls. The balls in question come from the urns that you have seen before. Click the 'Draw sample', to draw a ball from each of the urns' </p>`;
}
const grid_0 = {
  type: jsGridData,
  prompt: [
ins_prompt1, ins_prompt2, ins_prompt3, ins_prompt4
],
  custom_prompt: ['This is one', 'This two', 'lemon'],
  grid: [4, 3],
  cause: true,
  test_targets:[],
  timed_judgment: [false, false, true],
  judgements: cause_data_1,
  targets: instruction_data,
  judgements: [],
  target_colour: color_present,
  grid_square_size: grid_size,
};


timeline.push(grid_0);





/**
 * Example 1
 * Disjunctive 2 variable case
 * Pull 5 rows
 * 0 0
 * 1 0
 * 0 1
 */

const grid_1 = {
  type: jsGridData,
  prompt: rule_prompt(1),
  grid: [10, 5],
  cause: true,
  test_targets:[],
  targets: observation_data_1,
  judgements: cause_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
};
timeline.push(grid_1);
const test_1 = {
  type: jsGridData,
  prompt: rule_prompt(1),
  grid: [10, 5],
  cause: true,
  test_targets: test_data_1,
  targets: observation_data_1,
  judgements: cause_data_1,
  target_colour: color_present,
  grid_square_size: grid_size,
};
timeline.push(test_1);

const grid_2 = {
  type: jsGridData,
  grid: [10, 5],
  prompt: rule_prompt(2),
  targets: observation_data_2,
  cause: false,
  judgements: cause_data_2,
  target_colour: color_present,
  grid_square_size: grid_size
};
timeline.push(grid_2);

const grid_3 = {
  type: jsGridData,
  prompt: rule_prompt(3),
  grid: [10, 5],
  targets: observation_data_3,
  judgements: cause_data_3,
  target_colour: color_present,
  grid_square_size: grid_size
};
timeline.push(grid_3);

const grid_4 = {
  type: jsGridData,
  grid: [10, 5],
  prompt: rule_prompt(4),
  targets: observation_data_4,
  judgements: cause_data_4,
  target_colour: color_present,
  grid_square_size: grid_size
};
timeline.push(grid_4);




jsPsych.run(timeline);