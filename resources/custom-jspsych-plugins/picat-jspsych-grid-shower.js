/**
 * jspsych-serial-reaction-time
 * Josh de Leeuw
 *
 * plugin for running a serial reaction time task
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["grid-shower"] = (function() {

  var plugin = {};


  plugin.info = {
    name: 'grid-shower',
    description: '',
    parameters: {
      target: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Target',
        array: true,
        default: undefined,
        description: 'The location of the target. The array should be the [row, column] of the target.'
      },
      grid: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Grid',
        array: true,
        default: [[1,1,1,1]],
        description: 'This array represents the grid of boxes shown on the screen.'
      },
      grid_square_size: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Grid square size',
        default: 100,
        description: 'The width and height in pixels of each square in the grid.'
      },
      target_color: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Target color',
        default: "#999",
        description: 'The color of the target square.'
      },
      fade_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Fade duration',
        default: null,
        description: 'If a positive number, the target will progressively change color at the start of the trial, with the transition lasting this many milliseconds.'
      },
      allow_nontarget_responses: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Allow nontarget response',
        default: false,
        description: 'If true, then user can make nontarget response.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below the stimulus'
      },
      show_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'How long the grid should be displayed'
      },
      training: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Training',
        default: false,
        description: 'Show a button to click on instead of waiting for an answer'
      },
      fixation: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "Fixation",
        default: false,
        description: "Show a fixation cross for fixation_time milliseconds"
      },
      fixation_time: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Fixation time",
        default: 1000,
        description: "Time to show fixation cross, in milliseconds"
      }
    }
  };

  plugin.trial = function(display_element, trial) {
    var trial_data = {
      "grid": JSON.stringify(trial.grid),
      "target": JSON.stringify(trial.target)
    };

    var me = this;
    // show prompt if there is one
    if (trial.prompt !== null) {
      display_element.innerHTML += trial.prompt;
    }

    // show a fixation cross
    if (trial.fixation) {
      display_element.innerHTML = "";
      display_element.innerHTML = "<div id='header'></div>";
      $( "#header" ).append('<p id="fixation" class="grid-shower-fixation">+</p>');
      jsPsych.pluginAPI.setTimeout(function(){
        deleteScreen();
        afterFixation();
      }, trial.fixation_time);
    }
    else {afterFixation();}

    function deleteScreen() {
      display_element.innerHTML = "";
    }

    function afterFixation() {
      // create grid
      display_element.innerHTML += me.stimulus(trial.grid, trial.grid_square_size);

      // display dots
      for (var i in trial.target){
          $("#jspsych-serial-reaction-time-stimulus-cell-"
            + trial.target[i][0] + '-'
            + trial.target[i][1]).html(String.fromCharCode(11044));
      };

      if (trial.training){
        display_element.innerHTML += '<div id="jspsych-html-button-response-btngroup">';
        display_element.innerHTML += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:Opx 8px" id="jspsych-html-button-response-button-0" data-choice="0"><button class="jspsych-btn">Next</button></div></div>';
      }

      // wait show_duration ms before turning to next trial
      if (!trial.training) {
        jsPsych.pluginAPI.setTimeout(function(){
          jsPsych.finishTrial(trial_data);
        }, trial.show_duration);
      }

      if (trial.training) {
        display_element.querySelector('#jspsych-html-button-response-button-0').addEventListener('click', function(e){
          jsPsych.finishTrial(trial_data);
        });
      }
    }
  };

  plugin.stimulus = function(grid, square_size, target, target_color, labels) {
    var stimulus = "<div id='jspsych-serial-reaction-time-stimulus' style='margin:auto; display: table; table-layout: fixed; border-spacing:"+square_size/4+"px'>";
    for(var i=0; i<grid.length; i++){
      stimulus += "<div class='jspsych-serial-reaction-time-stimulus-row' style='display:table-row;'>";
      for(var j=0; j<grid[i].length; j++){
        var classname = 'jspsych-serial-reaction-time-stimulus-cell';

        stimulus += "<div class='"+classname+"' id='jspsych-serial-reaction-time-stimulus-cell-"+i+"-"+j+"' "+
          "data-row="+i+" data-column="+j+" "+
          "style='width:"+square_size+"px; height:"+square_size+"px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";
        if(grid[i][j] == 1){
          stimulus += "border: 2px solid black;";
        }
        if(typeof target !== 'undefined' && target[0] == i && target[1] == j){
          stimulus += "background-color: "+target_color+";";
        }
        stimulus += "'>";
        if(typeof labels !=='undefined' && labels[i][j] !== false){
          stimulus += labels[i][j];
        }
        stimulus += "</div>";
      }
      stimulus += "</div>";
    }
    stimulus += "</div>";

    return stimulus;
  };

  return plugin;
})();
