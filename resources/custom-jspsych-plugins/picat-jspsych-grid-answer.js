/**
 * jspsych-serial-reaction-time
 * Josh de Leeuw
 *
 * plugin for running a serial reaction time task
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["grid-answer"] = (function() {

  var plugin = {};


  plugin.info = {
    name: 'grid-answer',
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
      pre_target_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Pre-target duration',
        default: 0,
        description: 'The number of milliseconds to display the grid before the target changes color.'
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
      feedback_function: {
        type: jsPsych.plugins.parameterType.FUNCTION,
        default: {},
        description: "The feedback function to call after trials; function (correct)"
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

    // display stimulus
    var stimulus = this.stimulus(trial.grid, trial.grid_square_size);
    display_element.innerHTML = stimulus;

    // show prompt if there is one
    if (trial.prompt !== null) {
      display_element.innerHTML += trial.prompt;
    };

    display_element.innerHTML += '<div id="jspsych-html-button-response-btngroup">';
    display_element.innerHTML += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:'+'Opx'+' '+'8px'+'" id="jspsych-html-button-response-button-' + 0 +'" data-choice="'+0+'">'+'<button class="jspsych-btn">Continue</button>'+'</div>';
    display_element.innerHTML += '</div>';

		if(trial.pre_target_duration <= 0){
			showTarget();
		} else {
			jsPsych.pluginAPI.setTimeout(function(){
				showTarget();
			}, trial.pre_target_duration);
		};

		function showTarget(){
      var resp_targets;
      var trial_data;

      resp_targets = display_element.querySelectorAll('.jspsych-serial-reaction-time-stimulus-cell');

      for(var i=0; i<resp_targets.length; i++){
        resp_targets[i].addEventListener('mousedown', function(e){
          if(startTime == -1){
            return;
          } else {
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
      display_element.querySelector('#jspsych-html-button-response-button-' + '0').addEventListener('click', function(e){
        if (k >= trial.target.length) {
          k = 0;

          // display feedback
          var feedback = trial.feedback_function(trial_data.correct);

          display_element.innerHTML = "";
          display_element.innerHTML += feedback;
          jsPsych.pluginAPI.setTimeout(function(){
            display_element.innerHTML = "";
            jsPsych.finishTrial(trial_data);
          }, 2000);



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
        display_element.querySelector('#jspsych-serial-reaction-time-stimulus-cell-'
                                      +response.row+'-'
                                      +response.column).innerHTML = "";
        for (i in answ) {
          if (answ[i][0] == response.row && answ[i][1] == response.column) {
            answ.splice(i, 1);
          };
        };
      };

      // add clicked square to answer if not clicked before and less squares than targets has been clicked
      if (k < trial.target.length+1 && out_rep) {
        display_element.querySelector('#jspsych-serial-reaction-time-stimulus-cell-'
                                      +response.row+'-'
                                      +response.column).innerHTML = String.fromCharCode(11044);
        answ.push([response.row, response.column]);
      };

      // handle the number of clicks if more than the number of targets squares has been clicked
      if (k > trial.target.length && out_rep) {
        k -= 1;
      };



      // gather the data to store for the trial
      if (k >= trial.target.length){
        // tells if the answer is correct
        var corr = 0;
        for (i in answ){
          for (j in trial.target){
            corr = Math.min(answ[i][0] == trial.target[j][0])*(answ[i][1] == trial.target[j][1]);
            if (corr == 1){
              break;
            };
          };
          if (corr == 0){
            break;
          };
        };

        var trial_data = {
          "rt": response.rt,
          "grid": JSON.stringify(trial.grid),
          "target": JSON.stringify(trial.target),
          "answer": JSON.stringify(answ),
          "correct": corr == 1
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
