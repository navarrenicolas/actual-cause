/** Actual Cause in causal inference experiment

Nicolas Navarre
Dec 7 2022
*/

//////////////////////////////////////////////////////////////////////////////////////
///////                   Definitions                           //////////////////////
//////////////////////////////////////////////////////////////////////////////////////

// Simulate some random subject
var subject_ID = jsPsych.randomization.randomID(10);
jsPsych.data.addProperties({ 'subject_ID': subject_ID });

var make_instruction = function(stimulus){
  return {
    type: 'html-button-response',
    stimulus: stimulus,
    choices: ['Next'],
    data: {questionId: 'Instruction'}
  };
};


////////////////////////////////////////////////////////////////////////////////////////////
//////////                     GRID FUNCTIONS              /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

// creates a trial where a grid is shown
// target is the pattern of squares, color the color of the target squares and 
// symbol what is shown on the target squares
var gridShower = function(target, color, grid_dimensions, symbol) {
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
var gridAnswer = function(target, color, grid_dimensions, symbol) {
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
    on_finish: function(data) {
      data.correct = data.correct;
    }
  };
};

// function to display feedback after the memory-load task
// perc_correct refers to the percentage of correctly reproduced squares
var feedbackGrid = function(perc_correct) {
  var stimulus;
  if (perc_correct == 1) {
    stimulus = '<p class="leo_correct centered">Correct</p><font size = 5.5><p class="centered">Keep up the good work!</p></font>';
    return stimulus;
  } else if  (perc_correct > 0.25) {
    stimulus = '<p class="leo_almost centered">Almost right!</p><font size = 5.5><p class="centered">Keep up the good work!</p></font>';
    return stimulus;
  } else {
    stimulus = '<p class="leo_wrong centered">Wrong pattern</p><font size = 5.5><p class="centered">It\'s very important that you get the pattern right!</p></font>';
    return stimulus;
  }
};

var dataCreator = function (is_test,targets){

};
// creates nb targets of level of difficulty lvl for a grid of dimensions
// grid_dim 
// the target maker function is under resourses/common
var gridTargetCreator = function(nb, lvl, grid_dim) {
  var targets = [];
  if (lvl == 1) {
    for (var i = 0; i < nb; i++) {
      targets.push(target_maker([1], grid_dim_easy));
    }
  }
  if (lvl == 2) {
    var possible_patterns = [[2,1,1], [1,1,1,1]];
    var current;
    for (var i = 0; i < nb; i++) {
      current = jsPsych.randomization.sampleWithReplacement(possible_patterns, 1)[0];
      targets.push(target_maker(current, grid_dim));
    }
  }
  return targets;
};



/////////////////////////////////////////////////////////
/////////////       GRID PARAMETERS   ///////////////////
/////////////////////////////////////////////////////////

// parameter for the memory-load task
// background color of the selected squares
var color_present = "black";
var color_safe = "green";
var color_unsafe = "red";

// set to false to draw only inner borders in the grids
var border = true; 
var grid_size =70;
// symbol displayed in the selected squares
var symbol_show = "";

// Define the tutorial data
var instruction_1 = [[0,0],[0,3],[0,5]];
var instruction_2 = [[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[3,0],[3,1]];
var tutorial_1 = [[0,2],[0,3]];

var tutorial_1_dim = [4,3];
var data_dim = [20,5];
var test_dim = [10,5];
var grid_dim_easy = [2,2];
var grid_dim_hard = [4,4];


////////////////////////////////////////////////////
////////        Trials       ///////////////////////
////////////////////////////////////////////////////

var consent_block = {
  type: "consent-dec",
  cont_btn: "start",
  data: { questionId: "consent" }
};


// Record subject's Prolific ID
var prolificID = {
  type: 'survey-text',
  questions: [
    {prompt: "Please enter your Prolific ID below.", name: 'Comments', rows: 1, columns: 30, font_size: 18}
  ],
  data: { questionId: "ProlificID" }
};

jsPsych.data.addProperties({'subject_ID': subject_ID});
jsPsych.data.addProperties({'group_number': group_number});


var survey_trial = {
  type: 'survey-text',
  questions: [{prompt: "Do you have any remark to make about this experiment?", rows: 10, columns: 50}],
};

var prolific_id_trial = {
  type: 'survey-text',
  questions: [{prompt: "Please enter your Prolific ID:", rows: 1, columns: 50}],
};

var instructions = [
  {
    type: 'html-button-response',
    stimulus: instructions_presentation,
    choices: ['Next']
  },
  {
    type: 'grid-data',
    training: true,
    prompt: instructions_alleles,
    grid: [1,5],
    targets: instruction_1,
    // target_color: color_present,
    // target_symbol: symbol_show,
    border: border,
    grid_square_size: grid_size
  },
  {
    type: 'grid-data',
    training: true,
    prompt: instructions_alleles2,
    grid: [5,3],
    targets: instruction_2,
    // target_color: color_present,
    target_symbol: "hello",
    border: border,
    grid_square_size: grid_size
  },
  {
    type: 'grid-data',
    training: true,
    prompt: tutorial_instructions_1,
    grid: data_dim,
    targets: data_targets,
    // target_color: color_present,
    // target_symbol: ,
    border: border,
    grid_square_size: grid_size
  }
];

// var instructions = [
//   {
//     type: 'html-button-response',
//     stimulus: instructions_presentation,
//     choices: ['Next']
//   },
//   {
//     type: 'grid-shower',
//     training: true,
//     prompt: instructions_grid1,
//     grid: [4,4],
//     targets: [[0,0],[1,1],[2,2],[3,3]],
//     target_color: color_present,
//     target_symbol: symbol_show,
//     border: border,
//     grid_square_size: grid_size
//   },
//   {
//     type: 'html-button-response',
//     stimulus: instructions_inferences,
//     choices: ['Next']
//   },
//   {
//     type: 'grid-answer',
//     training: true,
//     prompt: instructions_grid2,
//     grid: [4,4],
//     targets: [[0,0],[1,1],[2,2],[3,3]],
//     allow_nontarget_responses: true,
//     target_color: color_present,
//     target_symbol: symbol_show,
//     border: border,
//     grid_square_size: grid_size
//   },
//   {
//     type: 'html-button-response',
//     stimulus: instructions_inferences_example1,
//     choices: ['Next']
//   },
//   {
//     type: 'html-button-response',
//     stimulus: instructions_inferences_example2,
//     choices: ['Next']
//   },
//   {
//     type: 'html-button-response',
//     stimulus: instructions_inferences_example3,
//     choices: ['Next']
//   }
// ];

///////////////////////////////////////////////////////////////////////////////////////////
/////////////////////              MAKING GRIDS       //////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////



var grid_pattern_training = gridTargetCreator(6, lvl = 2, grid_dim_hard);
var grid_pattern_list_1 = gridTargetCreator(24, lvl = 2, grid_dim_hard);
var grid_pattern_list_2 = gridTargetCreator(24, lvl = 1, grid_dim_easy);


var materials_training = jsPsych.randomization.repeat(training, 1);

var training = new Array;
training.push({
  type: 'html-button-response',
  stimulus: instructions_training,
  choices: ['Next']
})

for (i in materials_training) {
  training.push(gridShower(grid_pattern_training[i], color_safe, grid_dim_hard, symbol_show));
  training.push(gridAnswer(grid_pattern_training[i], color_unsafe, grid_dim_hard, symbol_show));
}



//////////////////////////////////////////////////////////////////////////////////////
///////                   Timeline                              //////////////////////
//////////////////////////////////////////////////////////////////////////////////////

var timeline = new Array;
// timeline.push(consent_block);
timeline.push.apply(timeline, instructions);
timeline.push.apply(timeline, training);


// timeline.push(demographics_block);
// timeline.push(survey_trial);
// timeline.push(prolific_id_trial);

jsPsych.init({
  timeline: timeline,
  show_progress_bar: true,
  on_finish: function (data) {
    // SaveData("causal-conf-1", subject_ID, jsPsych.data.get().json);
    // $(".jspsych-content").html("<center>\n  <p>Thank you for completing the experiment.  <strong>Please enter the code\n      below into Prolific</strong>.  Your payment will be processed <strong>within\n      24 hours</strong>.</p>\n</center>\n\n<div class='jspsych-submit-code'>" + '194HI397J' + "</div>");
    $(".jspsych-content").html("<center><p>Thank you for completing the experiment. <strong>Please use the following link to confirm your participation:</strong> https://app.prolific.co/submissions/complete?cc=4EE4DE9D. Your payment will be processed <strong>within 24 hours</strong>.</p>");
    
  }
});
