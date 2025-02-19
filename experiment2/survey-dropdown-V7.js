/**
 * JsPsych V7 adaptation of msm-jspsych-survey-fropdown * 
 */

/**
 * jspsych-survey-dropdown
 * a jspsych plugin for multiple choice survey questions
 *
 * 
 * Mathias Sablé Meyer, inspired by multi-choice from Shane Martin
 *
 * documentation: docs.jspsych.org
 *
 */


var jsSurveyDropdown = (function (jspsych){
    "use strict";
    const info = {
        name: 'survey-dropdown',
        parameters: {
          questions: {
            type: jspsych.ParameterType.COMPLEX,
            array: true,
            pretty_name: 'Questions',
            nested: {
              prompt: {type: jspsych.ParameterType.STRING,
                         pretty_name: 'Prompt',
                         default: undefined,
                         description: 'The strings that will be associated with a group of options.'},
              options: {type: jspsych.ParameterType.STRING,
                         pretty_name: 'Options',
                         array: true,
                         default: undefined,
                         description: 'Displays options for an individual question.'},
              labels: {type: jspsych.ParameterType.STRING,
                         pretty_name: 'labels',
                         array: true,
                         default: undefined,
                         description: 'HTML-safe identifiers for each option'},
              required: {type: jspsych.ParameterType.BOOL,
                         pretty_name: 'Required',
                         default: false,
                         description: 'Subject will be required to pick an option for each question.'},
            }
          },
          preamble: {
            type: jspsych.ParameterType.STRING,
            pretty_name: 'Preamble',
            default: null,
            description: 'HTML formatted string to display at the top of the page above all the questions.'
          },
          button_label: {
            type: jspsych.ParameterType.STRING,
            pretty_name: 'Button label',
            default:  'Continue',
            description: 'Label of the button.'
          }
        }
    }

    /**
     * Survey Dropdown
     */
    class SurveyDropDownPlugin{
        constructor(jsPsych){
            this.jsPsych = jsPsych;
        }
        
        trial(display_element, trial) {
            var plugin_id_name = "jspsych-survey-dropdown";
            var plugin_id_selector = '#' + plugin_id_name;
            var _join = function( /*args*/ ) {
              var arr = Array.prototype.slice.call(arguments, _join.length);
              return arr.join('-');
            }
        
            // inject CSS for trial
            display_element.innerHTML = '<style id="jspsych-survey-dropdown-css"></style>';
            var cssstr = ".jspsych-survey-dropdown-question { margin-top: 2em; margin-bottom: 2em; text-align: left; }"+
              ".jspsych-survey-dropdown-text span.required {color: darkred;}"+
              ".jspsych-survey-dropdown-option { line-height: 2; }"
        
            display_element.querySelector('#jspsych-survey-dropdown-css').innerHTML = cssstr;
        
            // form element
            var trial_form_id = _join(plugin_id_name, "form");
            display_element.innerHTML += '<form id="'+trial_form_id+'"></form>';
            var trial_form = display_element.querySelector("#" + trial_form_id);
            // show preamble text
            var preamble_id_name = _join(plugin_id_name, 'preamble');
            if(trial.preamble !== null){
              trial_form.innerHTML += '<div id="'+preamble_id_name+'" class="'+preamble_id_name+'">'+trial.preamble+'</div>';
            }
            // add multiple-choice questions
            for (var i = 0; i < trial.questions.length; i++) {
                // create question container
                var question_classes = [_join(plugin_id_name, 'question')];
        
                trial_form.innerHTML += '<div id="'+_join(plugin_id_name, i)+'" class="'+question_classes.join(' ')+'"></div>';
        
                var question_selector = _join(plugin_id_selector, i);
        
                // add question text
                display_element.querySelector(question_selector).innerHTML += '<p class="' + plugin_id_name + '-text survey-dropdown">' + trial.questions[i].prompt + '</p>';
        
              let select = "<select class='"+ plugin_id_name +"-select survey-dropdown' id="+i+">"
        
              // create option radio buttons
              for (var j = 0; j < trial.questions[i].options.length; j++) {
                select += '<option value="'+
                  trial.questions[i].labels[j]+
                  '">'+
                  trial.questions[i].options[j]+
                  '</option>'
              }
        
              select += "</select>"
              display_element.querySelector(question_selector).innerHTML += select
            }
            // add submit button
            trial_form.innerHTML += '<input type="submit" id="'+plugin_id_name+'-next" class="'+plugin_id_name+' jspsych-btn"' + (trial.button_label ? ' value="'+trial.button_label + '"': '') + '></input>';
            trial_form.addEventListener('submit', function(event) {
              event.preventDefault();
              var matches = display_element.querySelectorAll("div." + plugin_id_name + "-question");
              // measure response time
              var endTime = (new Date()).getTime();
              var response_time = endTime - startTime;
        
              // create object to hold responses
              var question_data = {};
              var matches = display_element.querySelectorAll("div." + plugin_id_name + "-question");
              for(var i=0; i<matches.length; i++){
                let match = matches[i];
                var id = i;
                if(match.querySelector("select") !== null){
                  var val = match.querySelector("select").value;
                } else {
                  var val = "";
                }
                var obje = {};
                obje['Q' + id] = val;
                Object.assign(question_data, obje);
              }
              // save data
              var trial_data = {
                "rt": response_time,
                "response": JSON.stringify(question_data)
              };
              display_element.innerHTML = '';
        
              // next trial
              jsPsych.finishTrial(trial_data);
            });
        
            var startTime = (new Date()).getTime();
        }
        
    }
    SurveyDropDownPlugin.info = info;
    return SurveyDropDownPlugin;

})(jsPsychModule);