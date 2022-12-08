/**
 * jspsych-html-button-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["html-button-response"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'html-button-response',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The HTML string to be displayed'
      },
      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Choices',
        default: [],
        array: true,
        description: 'The labels for the buttons.'
      },
      button_html: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button html',
        default: '<button class="jspsych-btn">%choice%</button>',
        array: true,
        description: 'The html of the button. Can create own style.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed under the button.'
      },
      stimulus_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Stimulus duration',
        default: null,
        description: 'How long to hide the stimulus.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'How long to show the trial.'
      },
      margin_vertical: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Margin vertical',
        default: '0px',
        description: 'The vertical margin of the button.'
      },
      margin_horizontal: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Margin horizontal',
        default: '8px',
        description: 'The horizontal margin of the button.'
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, then trial will end when user responds.'
      },
      feedback_function: {
        type: jsPsych.plugins.parameterType.FUNCTION,
        default: null,
        description: "Feedback function to call after trials; function (correct)."
      },
      fixation: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "Fixation",
        default: false,
        description: "Show a fixation symbol for fixation_time milliseconds."
      },
      fixation_symbol: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Fixation symbol',
        default: '+',
        description: 'Symbol to be displayed during the fixation.'
      },
      fixation_time: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Fixation time",
        default: 1000,
        description: "Time to show fixation cross, in milliseconds."
      },
      feedback_delay: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Feedback delay",
        default: 1000,
        description: "Time to let between feedbacka appearance and button appearance."
      }
    }
  };

  plugin.trial = function(display_element, trial) {

    deleteScreen();
    // show a fixation cross
    if (trial.fixation) {
      deleteScreen();
      display_element.innerHTML = "<div id='header'><p id='fixation' class='fixation-cross'>"+trial.fixation_symbol+"</p></div>";
      jsPsych.pluginAPI.setTimeout(function(){
        deleteScreen();
        afterFixation();
      }, trial.fixation_time);
    }
    else {afterFixation();}

    function deleteScreen() {
      display_element.innerHTML = "";
    }

    function afterFixation()  {
        // display stimulus
      var html = '<div id="jspsych-html-button-response-stimulus">'+trial.stimulus+'</div>';

      //will display a blank line to accomodate for the feedback
      if (trial.feedback_function != null) html += "<p class = 'leo_space'></p>";

      //display buttons
      var buttons = [];
      if (Array.isArray(trial.button_html)) {
        if (trial.button_html.length == trial.choices.length) {
          buttons = trial.button_html;
        } else {
          console.error('Error in html-button-response plugin. The length of the button_html array does not equal the length of the choices array');
        }
      } else {
        for (var i = 0; i < trial.choices.length; i++) {
          buttons.push(trial.button_html);
        }
      }
      html += '<div id="jspsych-html-button-response-btngroup">';
      for (var i = 0; i < trial.choices.length; i++) {
        var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
        html += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
      }
      html += '</div>';

      //show prompt if there is one
      if (trial.prompt !== null) {
        html += trial.prompt;
      }
      display_element.innerHTML = html;

      $("button").each(function(index){this.setAttribute("data-choice", index);});


      // start time
      var start_time = Date.now();

      // add event listeners to buttons
      for (var i = 0; i < trial.choices.length; i++) {
        $("button")[i].addEventListener('click', function(e){
          var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
          after_response(choice);
        });
      }

      // store response
      var response = {
        rt: null,
        button: null
      };

      // function to handle responses by the subject
      function after_response(choice) {

        // measure rt
        var end_time = Date.now();
        var rt = end_time - start_time;
        response.button = choice;
        response.rt = rt;

        // after a valid response, the stimulus will have the CSS class 'responded'
        // which can be used to provide visual feedback that a response was recorded
        display_element.querySelector('#jspsych-html-button-response-stimulus').className += ' responded';

        // disable all the buttons after a response
        var btns = document.querySelectorAll('.jspsych-html-button-response-button button');
        for(var i=0; i<btns.length; i++){
          //btns[i].removeEventListener('click');
          btns[i].setAttribute('disabled', 'disabled');
        }

        if (trial.response_ends_trial) {
          end_trial();
        }
      };

      // function to end trial when it is time
      function end_trial() {

        // kill any remaining setTimeout handlers
        jsPsych.pluginAPI.clearAllTimeouts();

        // gather the data to store for the trial
        var trial_data = {
          "rt": response.rt,
          "stimulus": trial.stimulus,
          "button_pressed": response.button
        };

        // clear the display
        display_element.innerHTML = '';

        // display feedback or move on
        if (trial.feedback_function != null) {
          var feedback = '<div "jspsych-html-button-response-stimulus">' + trial.feedback_function(trial.data, trial_data.button_pressed) + '</div>';

          if (trial.feedback_function(trial.data, trial_data.button_pressed) == null) jsPsych.finishTrial(trial_data);
          else {
            var html = '<div id="jspsych-html-button-response-stimulus">'+trial.stimulus+'</div>';

            var button = '<button id="jspsych-html-button-response-continue-button" class="jspsych-btn">%choice% </button>';
            var button_text = 'Next';

            var html2 = '<div id="jspsych-html-button-response-btngroup">';
            var str = button.replace(/%choice%/g, button_text);
            html2 += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-html-button-response-button-' + 0 +'" data-choice="'+0+'">'+str+'</div>';
            html2 += '</div>';

            html += feedback;
            display_element.innerHTML += html;
            display_element.innerHTML += html2;
            $('#jspsych-html-button-response-continue-button').css("visibility", "hidden");


            jsPsych.pluginAPI.setTimeout(function(){
              $('#jspsych-html-button-response-continue-button').css("visibility", "visible")
              display_element.querySelector('#jspsych-html-button-response-continue-button').addEventListener('click', function(e){
                jsPsych.finishTrial(trial_data);
              })
            }, trial.feedback_delay);
          }
          } else jsPsych.finishTrial(trial_data);

      };

      // hide image if timing is set
      if (trial.stimulus_duration !== null) {
        jsPsych.pluginAPI.setTimeout(function() {
          display_element.querySelector('#jspsych-html-button-response-stimulus').style.visibility = 'hidden';
        }, trial.stimulus_duration);
      }

      // end trial if time limit is set
      if (trial.trial_duration !== null) {
        jsPsych.pluginAPI.setTimeout(function() {
          end_trial();
        }, trial.trial_duration);
      }}

  };

  return plugin;
})();
