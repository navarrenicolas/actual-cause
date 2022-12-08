/*
  
  Salvador Mascarenhas, LPPRD
  June 11, 2015
  updated September 2016
  updated March 2018 for jsPsych 6

  Multiple choice, single response, dropdown menu questions

*/

jsPsych.plugins['dropdown'] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'dropdown',
    parameters: {
      preamble: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        default: ""
      },
      validation: {
        type: jsPsych.plugins.parameterType.STRING,
        default: ""
      },
      labels: {
        type: jsPsych.plugins.parameterType.STRING,
        array: true,
        default: ""
      },
      button_text: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "Continue"
      },
      questions: {
        type: jsPsych.plugins.parameterType.STRING,
        default: undefined,
        array: true
      },
      choices: {
        type: jsPsych.plugins.parameterType.STRING,
        default: undefined,
        array: true
      }
    }
  };

  plugin.trial = function(display_element, trial) {

    var plugin_id_name = "masc-jspsych-dropdown";
    var plugin_id_selector = '#' + plugin_id_name;
    var _join = function( /*args*/ ) {
      var arr = Array.prototype.slice.call(arguments, _join.length);
      return arr.join(separator = '-');
    }

    // trial defaults
    // trial.preamble = typeof trial.preamble == 'undefined' ? "" : trial.preamble;
    // trial.validation = typeof trial.validation == 'undefined' ? "" : trial.validation;
    // trial.labels = typeof trial.labels == 'undefined' ? "" : trial.labels
    // trial.button_text = typeof trial.button_text == 'undefined' ? "Continue" : trial.button_text

    // set up preamble text
    var html = "<div id=" + _join(plugin_id_name, 'preamble') +
        " class=" + _join(plugin_id_name, 'preamble') + ">" +
        trial.preamble + "</div>";
    
    // add questions
    for (var i = 0; i < trial.questions.length; i++) {
      
      // set up container
      html += "<div id=" + _join(plugin_id_name, i) +
        " class=" + _join(plugin_id_name, 'question') + ">"
      
      var question_selector = _join(plugin_id_selector, i);
      
      // add question text
      html += "<p class=" + _join(plugin_id_name, 'text') + ">" +
        trial.questions[i] + "</p>"
      
      // add dropdown menu
      html += "<select name=" + _join(plugin_id_name, i, 'answer') +
        " id=" + _join(plugin_id_name, i, 'answer') +
        " class=" + _join(plugin_id_name, 'menu') + ">";
      
      if (trial.labels == "") {
        for (var j = 0; j < trial.choices[i].length; j++)
          html += "<option value='" + j + "'>" +
          trial.choices[i][j] + "</option>";
      }
      else {
        for (var j = 0; j < trial.choices[i].length; j++)
          html += "<option value='" + trial.labels[i][j] + "'>" +
          trial.choices[i][j] + "</option>";
      }
      html += "</select></div>";
    }
    
    // SM: prepare validation dialog box
    html += "<div id='jspsych-validation-dialog' " +
      "class='jspsych-validation-dialog'></div>";
    
    var button_selector = _join(plugin_id_selector, "next");
    
    // add submit button
    html += "<p class='jspsych-btn-container'><button id=" + _join(plugin_id_name, 'next') +
      " class='" + plugin_id_name + " jspsych-btn'>" +
      trial.button_text + "</button></p>";

    display_element.innerHTML = html;
    
    var theDialog = 
        $('#jspsych-validation-dialog').dialog({
          autoOpen: false,
          buttons: [
            { text: "Continue without answering",
              click: function() {
                $(this).dialog("close");
                $(_join(plugin_id_selector, "next")).trigger("click", [true]);
              }
            },
            { text: "Answer the question",
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
          title: "Incomplete page",
        });
    
    $(button_selector).click(function(event, toContinue) {
      // first validate the response
      if (toContinue === undefined) toContinue = false;

      event.preventDefault();
      
      switch (trial.validation) {
      case "force" :
        var validOrNot = true;
        for (i = 0; i < trial.questions.length; i++)
          if ($("select[name='jspsych-lpprd-dropdown-" + i +
                "-answer']").val() == 0)
            validOrNot = false;
        if (validOrNot == false) alert("Please answer every question to continue.");
        break;
      case "request" :
        if ( toContinue == true) break;
        var validOrNot = true;
        for (i = 0; i < trial.questions.length; i++)
          if ($("select[name='" + _join(plugin_id_name, i, "answer") + "']").val() == 0 ||
              $("select[name='" + _join(plugin_id_name, i, "answer") + "']").val() == "NA")
            validOrNot = false;
        if (validOrNot == false) {
          theDialog.html("<p>You haven't answered every question on this page.</p>")
          theDialog.dialog("open");
          return null;}
        break;
      default :
        validOrNot = true;
      }
      
      
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
        "responses": JSON.stringify(question_data)
      };

      display_element.innerHTML = "";

      // next trial
      jsPsych.finishTrial(trial_data);
    });

    var startTime = (new Date()).getTime();
  };

  return plugin;
})();
