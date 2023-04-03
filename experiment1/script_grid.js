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

cause_data_1 = causeCreator(urn_order_1, sample_order_1, 'R1J');
cause_data_2 = causeCreator(urn_order_2, sample_order_2, 'R2J');
cause_data_3 = causeCreator(urn_order_3, sample_order_3, 'R3J');
cause_data_4 = causeCreator(urn_order_4, sample_order_4, 'R4J');

test_data_1 = testCreator(urn_order_1, test_order_1, 'R1O');
test_data_2 = testCreator(urn_order_2, test_order_2, 'R2O');
test_data_3 = testCreator(urn_order_3, test_order_3, 'R3O');
test_data_4 = testCreator(urn_order_4, test_order_4, 'R4O');


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
  pages: [instructions_presentation],
  button_label_next: 'Next',
  show_clickable_nav: true
};
timeline.push(instructions_page);

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