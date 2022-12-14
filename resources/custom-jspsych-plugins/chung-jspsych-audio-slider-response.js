/**
 * jspsych-audio-slider-response
 * extends the original jspsych-audio-slider-response with replay functionality
 *
 * WooJin Chung
 *
 * documentation: docs.jspsych.org
 *
 */

jsPsych.plugins['audio-slider-response'] = (function() {
	var plugin = {};

	jsPsych.pluginAPI.registerPreload('audio-slider-response', 'stimulus', 'audio');

	plugin.info = {
		name: 'audio-slider-response',
		description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The image to be displayed'
      },
      min: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Min slider',
        default: 0,
        description: 'Sets the minimum value of the slider.'
      },
      max: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Max slider',
        default: 100,
        description: 'Sets the maximum value of the slider',
      },
			start: {
				type: jsPsych.plugins.parameterType.INT,
				pretty_name: 'Slider starting value',
				default: 50,
				description: 'Sets the starting value of the slider',
			},
      step: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Step',
        default: 1,
        description: 'Sets the step of the slider'
      },
      labels: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name:'Labels',
        default: [],
        array: true,
        description: 'Labels of the slider.',
      },
      button_label: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button label',
        default: 'Continue',
        array: false,
        description: 'Label of the button to advance.'
      },
      replay_button_label: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Replay Button label',
        default: 'Replay',
        array: false,
        description: 'Label of the button to replay.'
      },
      max_replays: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Maximum replays',
        default: 0,
        description: 'Maximum number of replays.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below the slider.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'How long to show the trial.'
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, trial will end when user makes a response.'
      },
    }
  }

  plugin.trial = function(display_element, trial) {

    // setup stimulus
    var context = jsPsych.pluginAPI.audioContext();
    if(context !== null){
      var source = context.createBufferSource();
      source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
      source.connect(context.destination);
    } else {
      var audio = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
      audio.currentTime = 0;
    }

    // set up end event if trial needs it
    // otherwise add event which enables replay button
    if (trial.trial_ends_after_audio) {
      if (context !== null) {
        source.onended = function() {
          end_trial();
        }
      } else {
        audio.addEventListener('ended', end_trial);
      }
    }
    else if (trial.max_replays > 0) {
      if(context !== null){
        source.onended = function() {
          display_element.querySelector('#jspsych-audio-slider-response-replay').disabled = false;
        }
      } else {
        audio.addEventListener('ended', function() {
          display_element.querySelector('#jspsych-audio-slider-response-replay').disabled = false;
        });
      }
    }

    var html = '<div id="jspsych-audio-slider-response-wrapper" style="margin: 50px 0px;">';
  	html += '<div class="jspsych-audio-slider-response-container" style="position:relative;">';
    html += '<input type="range" value="'+trial.start+'" min="'+trial.min+'" max="'+trial.max+'" step="'+trial.step+'" style="width: 100%;" id="jspsych-audio-slider-response-response"></input>';
    html += '<div>'
    for(var j=0; j < trial.labels.length; j++){
      var width = 100/(trial.labels.length-1);
      var left_offset = (j * (100 /(trial.labels.length - 1))) - (width/2);
      html += '<div style="display: inline-block; position: absolute; left:'+left_offset+'%; text-align: center; width: '+width+'%;">';
      html += '<span style="text-align: center; font-size: 80%;">'+trial.labels[j]+'</span>';
      html += '</div>'
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';

		if (trial.prompt !== null){
	    html += trial.prompt;
		}

    html += '<div style="margin: 0px;">';
    
    // add replay button
    if (trial.max_replays > 0) {
      html += '<button id="jspsych-audio-slider-response-replay" class="jspsych-btn">'+trial.replay_button_label+'</button>';
    }

    // add submit button
    html += '<button id="jspsych-audio-slider-response-next" class="jspsych-btn">'+trial.button_label+'</button>';

    html += '</div>';

    display_element.innerHTML = html;

    var replay_count = 0;
    var response = {
      rt: null,
      response: null
    };

    display_element.querySelector('#jspsych-audio-slider-response-next').addEventListener('click', function() {
      // reset replay_count
      replay_count = 0;

      // measure response time
      var endTime = (new Date()).getTime();
			var rt = endTime - startTime;
			if(context !== null){
				endTime = context.currentTime;
				rt = Math.round((endTime - startTime) * 1000);
			}
      response.rt = rt;
      response.response = display_element.querySelector('#jspsych-audio-slider-response-response').value;

      if(trial.response_ends_trial){
        end_trial();
      } else {
        display_element.querySelector('#jspsych-audio-slider-response-next').disabled = true;
      }

    });

    if (trial.max_replays > 0) {
      display_element.querySelector('#jspsych-audio-slider-response-replay').addEventListener('click', function() {
        display_element.querySelector('#jspsych-audio-slider-response-replay').disabled = true;
        replay_count += 1;

        if(context !== null){
          let source = context.createBufferSource();
          source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
          source.connect(context.destination);
          source.onended = function() {
            if (replay_count < trial.max_replays) {
              display_element.querySelector('#jspsych-audio-slider-response-replay').disabled = false;
            }
          }
          source.start();
        } else {
          let audio = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
          audio.currentTime = 0;
          audio.addEventListener('ended', function() {
            if (replay_count < trial.max_replays) {
              display_element.querySelector('#jspsych-audio-slider-response-replay').disabled = false;
            }
          });
          audio.play();
        }
      });
    }

    function end_trial(){

      jsPsych.pluginAPI.clearAllTimeouts();

			if(context !== null){
        source.stop();
        source.onended = function() { }
      } else {
        audio.pause();
        audio.removeEventListener('ended', end_trial);
      }

      // save data
      var trialdata = {
        "rt": response.rt,
				"stimulus": trial.stimulus,
        "response": response.response
      };

      display_element.innerHTML = '';

      // next trial
      jsPsych.finishTrial(trialdata);
    }

		var startTime = (new Date()).getTime();
    // start audio
    if (trial.max_replays > 0) {
      display_element.querySelector('#jspsych-audio-slider-response-replay').disabled = true;
    }
    
    if(context !== null){
      startTime = context.currentTime;
      source.start(startTime);
    } else {
      audio.play();
    }

    // end trial if trial_duration is set
    if (trial.trial_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        end_trial();
      }, trial.trial_duration);
    }


  };

  return plugin;
})();
