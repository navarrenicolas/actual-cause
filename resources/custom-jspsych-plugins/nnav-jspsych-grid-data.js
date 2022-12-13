/**
 * Grid data showing data with outcomes
 * Nicolas Navarre
 * Based on masc-jspsych-grid-shower
 *
 **/

jsPsych.plugins["grid-data"] = (function() {

  var plugin = {};


  plugin.info = {
    name: 'grid-data',
    description: '',
    parameters: {
      causals: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Causal targets',
        array: true,
        default: [[0,0],[0,1],[1,2]],
        description: 'Location of causal targets to display.  Array of [row, column] coordinates'
      },
      targets: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Targets',
        array: true,
        default: [[0,0],[0,1],[1,2]],
        description: 'Location of targets to display.  Array of [row, column] coordinates'
      },
      grid: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Grid',
        array: true,
        default: [4,3],
        description: 'Dimensions of the array as [rows, columns] (does not include the header)'
      },
      grid_square_size: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Grid square size',
        default: 100,
        description: 'Width and height in pixels of each cell in the grid'
      },
      target_symbol: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Target symbol',
        default: '',//String.fromCharCode(11044),
        description: 'Symbol to be displayed in target cells'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed above the grid'
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
      },
      outcome_colour: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Outcome colour",
        default: '#FF1654',
        // default: 'green',
        description: "Background color of the selected cells"
      },
      no_outcome_colour: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "No outcome colour",
        default: '#70c1b3',
        description: "Background color of the selected cells"
      },
      cause_colour: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Causal judgment colour",
        default: "#F3FFBD",
        description: "Colour of the borders surrounding causal cells"
      },
      border: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "Border",
        default: false,
        description: "Draw only inner borders when set to false"
      }
    }
  };

  plugin.trial = function(display_element, trial) {
    var trial_data = {
      "grid": JSON.stringify(trial.grid),
      "targets": JSON.stringify(trial.targets)
    };

    var thisPlugin = this;

    deleteScreen();
    // show a fixation cross
    if (trial.fixation) {
      deleteScreen();
      display_element.innerHTML = "<div id='header'></div>";
      $( "#header" ).append('<p id="fixation" class="fixation-cross">+</p>');
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
      // show prompt if there is one
      if (trial.prompt !== null) {
        display_element.innerHTML += "<div class=\"jspsych-memory-grid-prompt\">" + trial.prompt + "</div>";
      }

      // create grid
      display_element.innerHTML += thisPlugin.drawGrid(trial.grid, trial.grid_square_size, trial.border, trial.targets, trial.causals, trial.outcome_colour,trial.no_outcome_colour);

      //Display Header
      var headers = ['A','B','C','D','E'];
      for (var i =0; i< trial.grid[1];i++){
        
        if(i == trial.grid[1]-1){
          $("#jspsych-memory-grid-cell-0"+'-'+ i).html('Safe?');
        }else{
          $("#jspsych-memory-grid-cell-0"+'-'+ i).html(headers[i]);
        };
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

  
  plugin.drawGrid = function(grid, square_size, full_box, targets, causals, outcome_colour, no_outcome_colour) {
    
    arrayEquals = function(a, b) {
      return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index]);
    };

    checkArray = function(array, val) {
      for (const arr of array) {
        if (arrayEquals(val, arr)){
          return true;
        }
      };
      return false;
    };

    drawBorders = function (row, col){
      if (row==0){
        return "border-top: 1px solid black; border-left: 1px solid black; border-bottom: 3px solid black; border-right: 1px solid black;"
      };
      if (checkArray(causals, [row-1,col-1])){
        return "border-top: 2px solid yellow; border-left: 2px solid yellow; border-bottom: 2px solid yellow; border-right: 2px solid yellow;"
      }
      return "border-top: 1px solid black; border-left: 1px solid black; border-bottom: 1px solid black; border-right: 1px solid black;"
    };
    
    var theGrid = "<div id=\"jspsych-memory-grid\" style=\"margin:auto; display:table; table-layout:fixed; border-spacing:0px\">";
    // Itterate all cells based on grid size
    for (var i = 0; i < grid[0]+1; i++) {
      theGrid += "<div class=\"jspsych-memory-grid-row\" style=\"display:table-row;\">";
      for (var j = 0; j < grid[1]; j++) {
        var className = "jspsych-memory-grid-cell";
        theGrid += "<div class=\"" + className + "\" id=\"jspsych-memory-grid-cell-" + i + "-" + j + "\" data-row=\"" + i + "\" data-column=\"" + j + "\" style=\"width:" + square_size + "px; height:" + square_size*0.3 + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";
        // Fill the target cells with colours
        for (var k in targets){
          if (targets[k][0] == i-1 && targets[k][1] == j) {
            if(j<grid[1]-1){
              theGrid += "background-color: " + "black" + ";";
            }else{
              theGrid += "background-color: " + outcome_colour + ";";
            }
          }else if((j == grid[1]-1) && i > 0){
            console.log("Made it");
            theGrid += "background-color: " + no_outcome_colour + ";";
          }
        }
        //Add borders
        theGrid += drawBorders(i,j);

        theGrid += "\"></div>";
      }
      theGrid += "</div>";
    }
    theGrid += "</div>";
    



    return theGrid;
  };

  return plugin;
})();

