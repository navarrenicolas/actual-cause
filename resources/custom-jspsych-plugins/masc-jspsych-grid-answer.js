/**
 * grid-answer
 * Salvador Mascarenhas & Léo Picat
 *
 * based on Josh de Leeuw's jspsych-serial-reaction-time
 *
 **/

jsPsych.plugins["grid-answer"] = (function() {

  var plugin = {};


  plugin.info = {
    name: 'grid-answer',
    description: '',
    parameters: {
      targets: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Targets',
        array: true,
        default: undefined,
        description: 'Location of targets to check.  Array of [row, column] coordinates'
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
        default: 50,
        description: 'Width and height in pixels of each cell in the grid'
      },
      target_symbol: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Target symbol',
        default: String.fromCharCode(11044),
        description: 'Symbol to be displayed in target cells'
      },
      allow_nontarget_responses: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Allow nontarget response',
        default: false,
        description: 'If true, then user can make nontarget response'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed above the grid'
      },
      feedback_function: {
        type: jsPsych.plugins.parameterType.FUNCTION,
        default: null,
        description: "Feedback function to call after trials; function (correct)",
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

    var startTime = -1;
    var response = {
      rt: null,
      row: null,
      column: null
    };

    var k = 0;
    var answ = [];

    deleteScreen();

    // show prompt if there is one
    if (trial.prompt !== null) {
      display_element.innerHTML += "<div class=\"jspsych-memory-grid-prompt\">" + trial.prompt + "</div>";
    }

    // display grid
    display_element.innerHTML += this.drawGrid(trial.grid, trial.grid_square_size, trial.border, trial.target_color);

    display_element.innerHTML += '<div id="jspsych-html-button-response-btngroup">';
    display_element.innerHTML += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:'+'Opx'+' '+'8px'+'" id="jspsych-html-button-response-button-' + 0 +'" data-choice="'+0+'">'+'<button class="jspsych-btn">Continue</button>'+'</div>';
    display_element.innerHTML += '</div>';

    showTarget();

    function deleteScreen() {
      display_element.innerHTML = "";
    }

    function showTarget(){
      var resp_targets;
      var trial_data;

      resp_targets = display_element.querySelectorAll('.jspsych-memory-grid-cell');

      for (var i = 0; i < resp_targets.length; i++) {
        resp_targets[i].addEventListener('mousedown', function(e){
          if(startTime == -1){
            return;
          }
          else {
            var info = {};
            info.row = e.currentTarget.getAttribute('data-row');
            info.column = e.currentTarget.getAttribute('data-column');
            info.rt = Date.now() - startTime;
            info.resp = resp_targets;
            after_response(info);
            trial_data = afterClick();
          }
        });
      };

      // end trial when a key is pressed iff as many squares as targets has been clicked
      display_element.querySelector('#jspsych-html-button-response-button-0').addEventListener ('click', function(e){
        if (k >= trial.targets.length) {
          k = 0;

          if (trial.feedback_function !== null) {
            // display feedback
            var feedback = trial.feedback_function(trial_data.perc_correct);

            display_element.innerHTML = "";
            display_element.innerHTML += feedback;
            jsPsych.pluginAPI.setTimeout(function(){
              display_element.innerHTML = "";
              jsPsych.finishTrial(trial_data);
            }, 2000);
          }
          else
            jsPsych.finishTrial(trial_data);
        };
      });

      startTime = Date.now();

      function afterClick() {
        // kill any remaining setTimeout handlers
        jsPsych.pluginAPI.clearAllTimeouts();
        k += 1;

        var out_rep = true;

        // tells if the clicked square has been clicked before
        for (i in answ) {
          if (answ[i][0] == response.row && answ[i][1] == response.column) {
            out_rep = false;
          };
        };

        // delete the clicked square from answer if clicked before
        if (out_rep == false) {
          k -= 2;
          display_element.querySelector('#jspsych-memory-grid-cell-'
                                        +response.row+'-'
                                        +response.column).style.backgroundColor = "";
          display_element.querySelector('#jspsych-memory-grid-cell-'
                                        +response.row+'-'
                                        +response.column).innerHTML = "";
          for (i in answ) {
            if (answ[i][0] == response.row && answ[i][1] == response.column) {
              answ.splice(i, 1);
            };
          };
        };

        // add clicked square to answer if not clicked before and less squares than targets has been clicked
        if (k < trial.targets.length+1 && out_rep) {
          display_element.querySelector('#jspsych-memory-grid-cell-'
                                        +response.row+'-'
                                        +response.column).style.backgroundColor = trial.target_color;
          display_element.querySelector('#jspsych-memory-grid-cell-'
                                        +response.row+'-'
                                        +response.column).innerHTML = trial.target_symbol;
          answ.push([response.row, response.column]);
        };

        // handle the number of clicks if more than the number of targets squares has been clicked
        if (k > trial.targets.length && out_rep) {
          k -= 1;
        };



        // gather the data to store for the trial
        if (k >= trial.targets.length){
          // tells if the answer is correct
          var corr = 0;
          var nb_corr = 0;
          for (i in answ){
            for (var j in trial.targets){
              corr = Math.min(answ[i][0] == trial.targets[j][0])*(answ[i][1] == trial.targets[j][1]);
              if (corr == 1){
                nb_corr += 1
                break;
              };
            };
            // if (corr == 0){
            //   break;
            // };
          };

          var trial_data = {
            "rt": response.rt,
            "grid": JSON.stringify(trial.grid),
            "targets": JSON.stringify(trial.targets),
            "answer": JSON.stringify(answ),
            "correct": corr == 1,
            "nb_correct": nb_corr,
            "perc_correct": nb_corr/trial.targets.length
          };

          return(trial_data);
        };

      };

      // record the clicked square
      function after_response(info) {
        response = response.rt == null ? info : response;
        response.row = info.row;
        response.column = info.column;
      };

    };

  };

  plugin.drawGrid = function(grid, square_size, full_box, color) {
    var theGrid = "<div id=\"jspsych-memory-grid\" style=\"margin:auto; display: table;table-layout:fixed; border-spacing:0px\">";
    for (var i = 0; i < grid[0]; i++) {
      theGrid += "<div class=\"jspsych-memory-grid-row\" style=\"display:table-row;\">";
      for (var j = 0; j < grid[1]; j++) {
        var className = "jspsych-memory-grid-cell";
        theGrid += "<div class=\"" + className + "\" id=\"jspsych-memory-grid-cell-" + i + "-" + j + "\"data-row=\"" + i + "\" data-column=\"" + j + "\" style=\"width:" + square_size + "px; height:" + square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";
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
