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


var dataCreator = function (is_test, targets) {

};




/////////////////////////////////////////////////////////
/////////////       GRID PARAMETERS   ///////////////////
/////////////////////////////////////////////////////////

// parameter for the memory-load task
// background color of the selected squares
var color_present = "black";
var colour_win = "green";
var colour_lose = "red";

// set to false to draw only inner borders in the grids
var border = true;
var grid_size = 70;
// symbol displayed in the selected squares
var symbol_show = "";

// Define the tutorial data
var instruction_1 = [[1, 1], [1, 4], [1, 5]];
var instruction_2 = [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [3, 0], [3, 1]];
var tutorial_1 = [[0, 2], [0, 3]];

var tutorial_1_dim = [4, 3];
var data_dim = [20, 5];
var test_dim = [10, 5];
var grid_dim_easy = [2, 2];
var grid_dim_hard = [4, 4];




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

const example_grid_1 = {
  type: jsGridData,
  training: true,
  prompt: instructions_alleles,
  grid: [1, 5],
  targets: instruction_1,
  target_color: color_present,
  border: border,
  grid_square_size: grid_size
};
timeline.push(example_grid_1);

const example_grid_2 = {
  type: jsGridData,
  training: true,
  prompt: instructions_alleles2,
  grid: [5, 3],
  targets: instruction_2,
  // target_color: color_present,
  // target_symbol: "",
  border: border,
  grid_square_size: grid_size
};
timeline.push(example_grid_2);

// const tutorial_grid_3 = {
//   type: jsGridData,
//   training: true,
//   prompt: tutorial_instructions_1,
//   grid: data_dim,
//   targets: data_targets,
//   // target_color: color_present,
//   // target_symbol: ,
//   border: border,

//   grid_square_size: grid_size
// };
// timeline.push(tutorial_grid_3);


jsPsych.run(timeline);