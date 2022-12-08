/**
 *
 *
 */



jsPsych.plugins['survey-sort'] = (function() {

  var plugin = {};

  plugin.info = {
    name: "survey-sort",
    parameters: {
      preamble: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        default: ""
      },
      questions: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        default: undefined,
        array: true
      },
      required: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: null
      },
      validation: {
        type: jsPsych.plugins.parameterType.STRING,
        default: ""
      },
      button_text: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "Continue"
      },
      options: {
        type: jsPsych.plugins.parameterType.STRING,
        default: undefined,
        array: true
      },
      labels: {
        type: jsPsych.plugins.parameterType.STRING,
        default: undefined,
        array: true
      }
    }
  };

  plugin.trial = function(display_element, trial) {

    var plugin_id_name = "jspsych-survey-sort";
    var plugin_id_selector = '#' + plugin_id_name;
    var _join = function( /*args*/ ) {
      var arr = Array.prototype.slice.call(arguments, _join.length);
      return arr.join(separator = '-');
    };

    // trial defaults
    trial.preamble = typeof trial.preamble == 'undefined' ? "" : trial.preamble;
    trial.required = typeof trial.required == 'undefined' ? null : trial.required;
    trial.horizontal = typeof trial.required == 'undefined' ? false : trial.horizontal;
    trial.validation = typeof trial.validation == 'undefined' ? "" : trial.validation;
    trial.button_text = typeof trial.button_text == 'undefined' ? "Continue" : trial.button_text;
    trial.labels = typeof trial.labels == 'undefined' ? trial.options : trial.labels;

    // form element
    var trial_form_id = _join(plugin_id_name, "form");

    var html = "<form id=" + trial_form_id + "></form>";
    html += "<div id='jspsych-validation-dialog-survey-sort' class='jspsych-validation-dialog'></div>";
    display_element.innerHTML = html;

    var trial_form_selector = "#" + trial_form_id;

    // show preamble text
    var preamble_id_name = _join(plugin_id_name, 'preamble');
    $(trial_form_selector).append($('<div>', {
      "id": preamble_id_name,
      "class": preamble_id_name
    }));
    $('#' + preamble_id_name).html(trial.preamble);

    // add multiple-choice questions
    for (var i = 0; i < trial.questions.length; i++) {
      // create question container
      var question_classes = [_join(plugin_id_name, 'question')];
      if (trial.horizontal) {
        question_classes.push(_join(plugin_id_name, 'horizontal'));
      }

      $(trial_form_selector).append($('<div>', {
        "id": _join(plugin_id_name, i),
        "class": question_classes.join(' ')
      }));

      var question_selector = _join(plugin_id_selector, i);

      // add question text
      $(question_selector).append(
        '<p class="' + plugin_id_name + '-text survey-sort">' + trial.questions[i] + '</p>'
      );

      $(question_selector).append($("<ul>", {
        id: _join(plugin_id_name, "question", i),
        class: _join(plugin_id_name, "question")
      }));

      var ul_selector = _join(plugin_id_selector, "question", i);

      // create options
      for (var j = 0; j < trial.options[i].length; j++) {
        var option_id_name = _join(plugin_id_name, "option", i, j),
            option_id_selector = '#' + option_id_name;

        $(ul_selector).append($("<li>", {
          id: option_id_name,
          value: trial.labels[i][j],
          class: _join(plugin_id_name, "option")
        }));

        // add answer text
        $(option_id_selector).html(trial.options[i][j]);

        // initialize sorting thing
        $(ul_selector).sortable();
        $(ul_selector).disableSelection();

      }

      if (trial.required && trial.required[i]) {
        // add "question required" asterisk
        $(question_selector + " p").append("<span class='required'>*</span>");
      }
    }


    // SM: prepare validation dialog box

    var theDialog =
        $('#jspsych-validation-dialog-sort').dialog({
          autoOpen: false,
          buttons: [
            { text: "Continue without answering",
              click: function() {
                $(this).dialog("close");
                $(trial_form_selector).trigger("submit", [true]);
              }
            },
            { text: "Answer the question",
              click: function(){
                $(this).dialog("close");
              }
            }
          ],
          closeOnEscape: false,
          modal: true,
          dialogClass: "jspsych-validation-dialog-ui",
          resizable: false,
          minWidth: 500,
          title: "Incomplete page"
        });

    // add submit button
    $(trial_form_selector).append($('<p>', {
      'id': 'button-container',
      'class': 'jspsych-btn-container'
    }));

    $('#button-container').append($('<input>', {
      'type': 'submit',
      'id': plugin_id_name + '-next',
      'class': plugin_id_name + ' jspsych-btn',
      'value': trial.button_text
    }));

    $(trial_form_selector).submit(function(event, toContinue) {
      if (toContinue === undefined) toContinue = false;

      event.preventDefault();

      // TODO: validate question
      switch (trial.validation) {
      case "request" :
        if (toContinue == true) break;
        var validOrNot = true;
        $("div." + plugin_id_name + "-question").each(function(index) {
          if (typeof $(this).find("input:radio:checked").val() === 'undefined')
            validOrNot = false;
        });
        if (validOrNot == false) {
          theDialog.html("<p>You haven't answered every question on this page.</p>");
          theDialog.dialog("open");
          return null;}
        break;
      default:
        validOrNot = true;
      }


      // measure response time
      var endTime = (new Date()).getTime();
      var response_time = endTime - startTime;

      // create object to hold responses
      var question_data = {};
      $("div." + plugin_id_name + "-question").each(function(index) {
        var id = "Q" + index;
        var val = $(this).find("ul").sortable("toArray", {attribute: "value"});
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
