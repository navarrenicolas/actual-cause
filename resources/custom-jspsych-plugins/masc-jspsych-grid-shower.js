/**
 * grid-shower
 * Salvador Mascarenhas & Léo Picat
 *
 * based on Josh de Leeuw's jspsych-serial-reaction-time
 *
 **/

jsPsych.plugins["grid-shower"] = (function() {

  var plugin = {};


  plugin.info = {
    name: 'grid-shower',
    description: '',
    parameters: {
      targets: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Targets',
        array: true,
        default: undefined,
        description: 'Location of targets to display.  Array of [row, column] coordinates'
      },
      grid: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Grid',
        array: true,
        default: [3,3],
        description: 'Dimensions of the array as [rows, columns]'
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
        default: String.fromCharCode(11044),
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
      target_color: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Target color",
        default: null,
        description: "Background color of the selected cells"
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
      display_element.innerHTML += thisPlugin.drawGrid(trial.grid, trial.grid_square_size, trial.border, trial.targets, trial.target_color);

      // display dots
      for (var i in trial.targets){
          $("#jspsych-memory-grid-cell-"
            + trial.targets[i][0] + '-'
            + trial.targets[i][1]).html(trial.target_symbol);;
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

  plugin.drawGrid = function(grid, square_size, full_box, targets, color) {
    var theGrid = "<div id=\"jspsych-memory-grid\" style=\"margin:auto; display:table; table-layout:fixed; border-spacing:0px\">";
    for (var i = 0; i < grid[0]; i++) {
      theGrid += "<div class=\"jspsych-memory-grid-row\" style=\"display:table-row;\">";
      for (var j = 0; j < grid[1]; j++) {
        var className = "jspsych-memory-grid-cell";
        theGrid += "<div class=\"" + className + "\" id=\"jspsych-memory-grid-cell-" + i + "-" + j + "\" data-row=\"" + i + "\" data-column=\"" + j + "\" style=\"width:" + square_size + "px; height:" + square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";
        for (var k in targets){
          if (targets[k][0] == i && targets[k][1] == j) {
            theGrid += "background-color: " + color + ";";
          }
        }
        if (typeof(full_box) !== 'undefined' && full_box == true) {
          if (i == grid[0]-1) theGrid += "border-top: 3px solid black; border-left: 3px solid black; border-bottom: 3px solid black;"
          else theGrid += "border-top: 3px solid black; border-left: 3px solid black;"
          if(j == grid[1]-1) theGrid += "border-top: 3px solid black; border-left: 3px solid black; border-right: 3px solid black;"
          else theGrid += "border-top: 3px solid black; border-left: 3px solid black;"
          }
        else
          switch (i) {
          case 0:
            switch (j) {
            case 0:
              theGrid+= "border-right: 1px solid black; border-bottom: 1px solid black;";
              break;
            case (grid[1] - 1):
              theGrid+= "border-left: 1px solid black; border-bottom: 1px solid black;";
              break;
            default:
              theGrid+= "border-left: 1px solid black; border-right: 1px solid black; border-bottom: 1px solid black;";
            }
            break;
          case (grid[0] - 1):
            switch (j) {
            case 0:
              theGrid+= "border-right: 1px solid black; border-top: 1px solid black;";
              break;
            case (grid[1] - 1):
              theGrid+= "border-left: 1px solid black; border-top: 1px solid black;";
              break;
            default:
              theGrid+= "border-left: 1px solid black; border-right: 1px solid black; border-top: 1px solid black;";
            }
            break;
          default:
            switch (j) {
            case 0:
              theGrid+= "border-right: 1px solid black; border-top: 1px solid black; border-bottom:1px solid black";
              break;
            case (grid[1] - 1):
              theGrid+= "border-left: 1px solid black; border-top: 1px solid black; border-bottom:1px solid black;";
              break;
            default:
              theGrid+= "border: 1px solid black;";
            }
            break;
          }
        theGrid += "\"></div>";
      }
      theGrid += "</div>";
    }
    theGrid += "</div>";

    return theGrid;
  };

  return plugin;
})();
