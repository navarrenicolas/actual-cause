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

// creates a trial where a grid is shown
// target is the pattern of squares, color the color of the target squares and 
// symbol what is shown on the target squares
var gridShower = function (target, color, grid_dimensions, symbol) {
  return {
    type: 'grid-shower',
    grid: grid_dimensions,
    targets: target,
    show_duration: 850,
    training: false,
    fixation: true,
    fixation_time: 1000,
    target_color: color,
    target_symbol: symbol,
    border: border,
    grid_square_size: grid_size
  };
};

// creates a trial to reproduce a pattern on a grid
var gridAnswer = function (target, color, grid_dimensions, symbol) {
  return {
    type: 'grid-answer',
    grid: grid_dimensions,
    targets: target,
    allow_nontarget_responses: true,
    target_color: color,
    target_symbol: symbol,
    border: border,
    grid_square_size: grid_size,
    feedback_function: feedbackGrid,
    on_finish: function (data) {
      data.correct = data.correct;
    }
  };
};

// function to display feedback after the memory-load task
// perc_correct refers to the percentage of correctly reproduced squares
var feedbackGrid = function (perc_correct) {
  var stimulus;
  if (perc_correct == 1) {
    stimulus = '<p class="leo_correct centered">Correct</p><font size = 5.5><p class="centered">Keep up the good work!</p></font>';
    return stimulus;
  } else if (perc_correct > 0.25) {
    stimulus = '<p class="leo_almost centered">Almost right!</p><font size = 5.5><p class="centered">Keep up the good work!</p></font>';
    return stimulus;
  } else {
    stimulus = '<p class="leo_wrong centered">Wrong pattern</p><font size = 5.5><p class="centered">It\'s very important that you get the pattern right!</p></font>';
    return stimulus;
  }
};

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
  for (var i = 0; i < 10;i++){
    let sample_dict = D_observations[sample_order[i]];  
    for (j=0;j< 4;j++){
      if (sample_dict[urn_order[j]]){targets.push([i+1,j+1])};
    }
    if(sample_dict[rule]) {targets.push([i+1,5])};
  }
  return targets;
};

var causeCreator = function(urn_order,sample_order,rule){
  let judgements = [];
  for (let i = 0; i < 10;i++){
    let sample_dict = D_observations[sample_order[i]];  
    let causes = sample_dict[rule];
    // Map over the defined judgements and place them in the correct order
    judgements.push.apply(judgements,causes.map(j => urn_order.findIndex(el => el == j)).map(loc => [i+1,loc+1])); 
  }
  return judgements;
};


// var judgmentCreator = function (urn_order,sample_order){

// };

const get_sample_order = () => jsPsych.randomization.shuffle([0,0,0,0,1,1,1,1,2,3]);
const get_urn_order = () => jsPsych.randomization.shuffle(['a','b','c','d']);


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

// Generate the coordinates to be used in the data and judgement creators
observation_data_1 = dataCreator(urn_order_1,sample_order_1,'R1O');
observation_data_2 = dataCreator(urn_order_2,sample_order_2,'R2O');
observation_data_3 = dataCreator(urn_order_3,sample_order_3,'R3O');
observation_data_4 = dataCreator(urn_order_4,sample_order_4,'R4O');

cause_data_1 = causeCreator(urn_order_1,sample_order_1,'R1J');
cause_data_2 = causeCreator(urn_order_2,sample_order_2,'R2J');
cause_data_3 = causeCreator(urn_order_3,sample_order_3,'R3J');
cause_data_4 = causeCreator(urn_order_4,sample_order_4,'R4J');


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
  training: true,
  prompt: rule_prompt(1),
  grid: [10,5],
  cause: true,
  targets: observation_data_1,
  judgements: cause_data_1,
  target_colour: color_present,
  // outcome_colour: colour_win,
  // no_outcome_colour: colour_lose,
  grid_square_size: grid_size,
};
timeline.push(grid_1);

const grid_2 = {
  type: jsGridData,
  training: true,
  grid: [10,5],
  prompt: rule_prompt(2),
  targets: observation_data_2,
  judgements: cause_data_2,
  target_colour: color_present,
  // outcome_colour: colour_win,
  // no_outcome_colour: colour_lose,
  grid_square_size: grid_size
};
timeline.push(grid_2);

const grid_3 = {
  type: jsGridData,
  training: true,
  prompt: rule_prompt(3),
  grid: [10,5],
  targets: observation_data_3,
  judgements: cause_data_3,
  target_colour: color_present,
  // outcome_colour: colour_win,
  // no_outcome_colour: colour_lose,
  grid_square_size: grid_size
};
timeline.push(grid_3);


const grid_4 = {
  type: jsGridData,
  training: true,
  grid: [10,5],
  prompt: rule_prompt(4),
  targets: observation_data_4,
  judgements: cause_data_4,
  target_colour: color_present,
  // outcome_colour: colour_win,
  // no_outcome_colour: colour_lose,
  grid_square_size: grid_size
};
timeline.push(grid_4);




jsPsych.run(timeline);