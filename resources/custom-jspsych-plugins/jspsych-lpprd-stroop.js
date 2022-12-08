/*
  by Mark Gorenstein, 2016
  adapted by Salvador Mascarenhas for jsPsych 5, Fall 2017
                                  for jsPsych 6, Spring 2018
*/


jsPsych.plugins['stroop'] = (function() {
  var plugin = {};

  plugin.info = {
    name: 'stroop',
    description: "jsPsych plugin for Stroop task",
    parameters: {
      color: {
        type: jsPsych.plugins.parameterType.STRING,
        default: undefined,
        array: false,
        description: "A single color name determining the color of the trial text"
      },
      text: {
        type: jsPsych.plugins.parameterType.STRING,
        default: undefined,
        array: false,
        description: "A single word determining the trial text"
      },
      choices: {
        type: jsPsych.plugins.parameterType.INT,
        array: true,
        default: [],
        description: "An array of key codes determining response input"
      },
      timing_fixation: {
        type: jsPsych.plugins.parameterType.INT,
        default: 1000,
        description: "How long to display fixation cross, ms"
      },
      timing_stim: {
        type: jsPsych.plugins.parameterType.INT,
        default: -1,
        description: "How long to show stimulus, ms, if -1 then display indefinitely"
      },
      timing_response: {
        type: jsPsych.plugins.parameterType.INT,
        default: -1,
        description: "How long to wait for a response, ms, if -1 then wait indefinitely"
      },
      timing_post_stimulus: {
        type: jsPsych.plugins.parameterType.INT,
        default: 0,
        description: "Time to wait between trials"
      },
      show_keys: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: true,
        description: "Should the accepted input keys be displayed"
      },
      show_responses: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: true,
        description: "Should labels for responses be displayed"
      },
      keep_responses: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: false,
        description: "Should accepted input keys stay on the screen between trials"
      },
      responses: {
        type: jsPsych.plugins.parameterType.STRING,
        array: true,
        default: [],
        description: "An array determining the labels for the responses"
      },
      give_feedback: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: false,
        description: "Should the feedback_function be called after a trial"
      },
      timing_feedback: {
        type: jsPsych.plugins.parameterType.INT,
        default: 5000,
        description: "How long to show feedback message"
      },
      feedback_function: {
        type: jsPsych.plugins.parameterType.FUNCTION,
        default: {},
        description: "The feedback function to call after trials; function (color, text, response)"
      },
      when_feedback: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "always",
        description: "Indicate when feedback should be displayed (mistake, correct, always)"
      }
    }
  };
  

  plugin.trial = function(display_element, trial) {

    trial.stimulus_color = trial.color;
    trial.stimulus_text = trial.text;
    trial.stimulus = '<p style=" text-align:center; font-size:30px; color: ' + trial.stimulus_color + '">' + 
      trial.stimulus_text + '</p>';
    
    var setTimeoutHandlers = [];
    
    // display_element.append('<div id="header">');
    display_element.innerHTML = "<div id='header'></div>";
    show_fixation();

    // store response
    var response = {rt: -1, key: -1};

    function show_fixation() {
      // show fixation
      //MS : change the loading of a svg cross to a 30px "+" sign
      //MS : This may break on very very very weird computers where the 
      //     font does not have a well balanced "+" glyph, but that's rather
      //     unexpected and will break everything anyway...
      // $( "#header" ).append('<p id="fixation">+</p>');
      $( "#header" ).append('<p id="fixation"; style="text-align:center; font-size: 30px";>+</p>');
      if (trial.keep_responses) {
        show_options();
      };
      // wait
      setTimeout(function() {
        // after wait is over
        after_fixation();
      }, trial.timing_fixation);
    };

    function after_fixation() {
      $( "#fixation" ).remove();
      show_stimulus();

      if (!trial.keep_responses) {
        show_options();
      };

      // start the response listener
      if(JSON.stringify(trial.choices) != JSON.stringify(["none"])) {
        var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse(
          { callback_function: after_response,
            valid_responses: trial.choices,
            allow_held_key: false,
            persis: false
          });
      }
      
      set_timers();
    };

    function show_stimulus() {
      $( "#header" ).append($('<div>', {
        html: trial.stimulus,
        id: 'stroop-stimulus'
      }));
    };
    
    function show_options() {
      // create the options container
      display_element.innerHTML += "<div id='options'></div>";
      //display_element.append($('<div id="options">'));

      // create an empty container for each option
      for (var i = 0; i < trial.choices.length; i++) {
        $("#options").append($('<div class="option">'));
      };

      // if show_keys, add a rounded square with key name
      // to each .option
      if (trial.show_keys) {
        $('.option').each(function(index, element) {
          var key_name = String.fromCharCode(trial.choices[index]);
          $(element).append($('<p>', {
            class: 'rounded',
            text: key_name
          }));});
      };
      
      // if show_responses, add a span with corresponding response
      // to each .option
      if (trial.show_responses && trial.choices.length === trial.responses.length) {
        $('.option').each(function(index, element) {
          $( element ).append($('<span>', {
            class: 'response',
            text: trial.responses[index]
          }));});
      };
    };
    
    // function to end trial when it is time
    var end_trial = function() {
      
      // kill any remaining setTimeout handlers
      for (var i = 0; i < setTimeoutHandlers.length; i++) {
        clearTimeout(setTimeoutHandlers[i]);
      }

      // kill keyboard listeners
      if (typeof keyboardListener !== 'undefined'){
        jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
      }
      
      // gather the data to store for the trial
      var trial_data = {
        "rt": response.rt,
        "stimulus_color": trial.stimulus_color,
        "stimulus_text": trial.stimulus_text,
        "key_press": response.key,
        "response": get_response_text(response.key)
      };

      // jsPsych.data.write(trial_data);
      
      if (trial.timing_post_stimulus > 0) {
        if (trial.give_feedback && (trial.when_feedback == "always" | (trial.when_feedback == "mistake" && trial_data["response"] != trial.stimulus_color) | (trial.when_feedback == "correct" && trial_data["response"] == trial.stimulus_color) )) {
          clear_display();
          var feedback = trial.feedback_function(trial.stimulus_color, trial.stimulus_text, trial_data["response"]);
          display_element.innerHTML += "<div id='feedback'>" + feedback + "</div>";
          setTimeout(function() {
            // after waitin'
            clear_display();
            // wait some more
            setTimeout(function() {
              // after waitin'
              // now we're done
              jsPsych.finishTrial(trial_data);
            }, trial.timing_post_stimulus);
          }, trial.timing_feedback);
        } else if (trial.keep_responses) {
          // $( "#header" ).empty();
          setTimeout(function() {
            // after wait is over
            clear_display();
            jsPsych.finishTrial(trial_data);
          }, trial.timing_post_stimulus);
        } else {
          setTimeout(function() {
            // after wait is over
            clear_display();
            jsPsych.finishTrial(trial_data);
          }, trial.timing_post_stimulus);
        }
      } else {
        clear_display();
        jsPsych.finishTrial(trial_data);
      };
    };

    var get_response_text = function(key) {
      if (trial.responses.length > 0) {
        var key_index = trial.choices.indexOf(key);
        return trial.responses[key_index];
      } else {
        return undefined;
      };
    };
    
    // function to handle responses by the subject
    var after_response = function(info) {

      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      $("#stroop-stimulus").addClass('responded');

      // only record the first response
      if(response.key == -1){
        response = info;
      }

      end_trial();
    };

    function clear_display() {
      display_element.innerHTML = "";
    };
    
    function set_timers() {
      // hide if timing is set
      if (trial.timing_stim > 0) {
        var t1 = setTimeout(function() {
          $('#stroop-stimulus').remove();
        }, trial.timing_stim);
        setTimeoutHandlers.push(t1);
      }

      // end trial if time limit is set
      if (trial.timing_response > 0) {
        var t2 = setTimeout(function() {
          end_trial();
        }, trial.timing_response);
        setTimeoutHandlers.push(t2);
      }
    };
  };

  return plugin;
})();
