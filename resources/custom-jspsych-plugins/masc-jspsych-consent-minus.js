/*
  
  Salvador Mascarenhas, LPPRD
  June 11, 2015
  updated March 2018 for jsPsych 6

  Custom consent form

*/

jsPsych.plugins['consent'] = (function() {

  var plugin = {};

  plugin.info = {
    name: "consent",
    parameters: {
      researcher_name: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "Prof. Salvador Mascarenhas"
      },
      researcher_affiliation: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "Ecole Normale Supérieure"
      },
      researcher_email: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "salvador.mascarenhas@ens.fr"
      },
      time_commitment: {
        type: jsPsych.plugins.parameterType.STRING,
        default: undefined
      },
      pay: {
        type: jsPsych.plugins.parameterType.STRING,
        default: undefined 
      },
      about: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "reasoning"
      }
    }
  }
  
  plugin.trial = function(display_element, trial) {
    
    var plugin_id_name = "masc-jspsych-consent";
    var plugin_id_selector = '#' + plugin_id_name;
    var _join = function( /*args*/ ) {
      var arr = Array.prototype.slice.call(arguments, _join.length);
      return arr.join(separator = '-');}

    // figure out short name of researcher
    var i = trial.researcher_name.indexOf(" ");        
    var researcher_name_short = trial.researcher_name.slice(0, i);
    i = trial.researcher_name.lastIndexOf(" ");
    researcher_name_short = researcher_name_short + " " +
      trial.researcher_name.slice(i, trial.researcher_name.length);
    
    // prepare container element
    var html = "<div id=" + plugin_id_name + " class=" + _join(plugin_id_name, 'text') + ">";

    // add intro and time commitment
    html += "<h1>Consent to participate in the study</h1> <p>We invite you to participate in a research study being conducted by investigators from " + trial.researcher_affiliation + ".  The purpose of the study is to learn about " + trial.about + ".</p><p>If you agree to participate, we would like you to fill out a brief questionnaire in English. You are free to skip any questions that you prefer not to answer. It will take " + trial.time_commitment + " to participate.</p>";

    // add info about pay
    html += "<p>You will receive " + trial.pay + " for your participation in this study. There are no known unusual risks associated with participation.</p> <p>We will not collect your name or any identifying information about you.  It will not be possible to link you to your responses on the survey.</p> <p>Taking part in this research study is completely voluntary.  If you do not wish to participate in this study, simply close this browser window.</p>";

    // add info about researcher
    html += " <p>This study is conducted by " + trial.researcher_name + ", " + trial.researcher_affiliation + ", who may be contacted at <a href='mailto:" + trial.researcher_email + "'>" + trial.researcher_email + "</a>.</p>";

    // add checkbox
    html += "<input type='checkbox' id=" + _join(plugin_id_name, 'checkbox') +
      " class=" + plugin_id_name + "><label for=" + _join(plugin_id_name, 'checkbox') +
      " id=" + _join(plugin_id_name, 'checkbox-text') +
      " >I agree to participate in this study</label>"

    
    // add validation dialog
    html += "<div id='jspsych-validation-dialog' class='jspsych-validation-dialog'></div>"
    
    var button_selector = _join(plugin_id_selector, "next");
    
    // add submit button
    html += "<p class='jspsych-btn-container'><button id=" + _join(plugin_id_name, 'next') +
      " class='jspsych-btn'>Continue</button></p>"

    // print out HTML
    display_element.innerHTML = html + "</div>";

    // prepare validation dialog
    $('#jspsych-validation-dialog').dialog({
      autoOpen: false,
      buttons: [
        { text: "OK",
          click: function() {
            $(this).dialog("close");
          }
        }
      ],
      closeOnEscape: false,
      modal: true,
      dialogClass: "jspsych-validation-dialog-ui",
      resizable: false,
      minWidth: 500,
      title: "Consent form",
    });

    // set up "Continue" button
    $(button_selector).click(function(event) {
      if (!$(_join(plugin_id_selector, 'checkbox')).is(':checked')) {
        $("#jspsych-validation-dialog").html("<p>You must check the box to state your agreement to participate in order to continue.</p>")
        $("#jspsych-validation-dialog").dialog("open");
        return null;
      }
      else {
        // measure response time
        var endTime = (new Date()).getTime();
        var response_time = endTime - startTime;

        // create object to hold responses
        var question_data = {};
        $("div." + plugin_id_name + "-question").each(function(index) {
          var id = "Q" + index;
          var val = $("select[name='" + _join(plugin_id_name, index, "answer") + "']").val();
          var obje = {};
          obje[id] = val;
          $.extend(question_data, obje);
        });

        // save data
        var trial_data = {
          "rt": response_time,
        };

        display_element.innerHTML = "";

        // next trial
        jsPsych.finishTrial(trial_data);
      }
    });

    var startTime = (new Date()).getTime();
  };

  return plugin;
})();
