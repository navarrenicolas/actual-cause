/**
 * prime-images
 * Salvador Mascarenhas, WooJin Chung, and Nadine Bade
 *
 * Spring 2020
 *
 **/

jsPsych.plugins["prime-images"] = (function() {

  var plugin = {};

  /*
   * Define each parameter the plugin takes, with its type and default value if
   * any.
   */
  plugin.info = {
    name: "prime-images",
    description: "",            // TODO: provide description before releasing
    parameters: {
      target_sentence: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: "Target sentence",
        default: undefined,
        description: "Target sentence for judgment"
      },
      target_sentence_type: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Target sentence type",
        default: null,
        description: "Code with the type of the target displayed, for calculating feedback"
      },
      prompt: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: "Prompt",
        default: "",
        description: "Prompt that appears below the priming picture"
      },
      responses: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Responses",
        array: true,
        default: undefined,
        description: "Array of labels for response buttons"
      },
      images: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: "Images",
        array: true,
        default: undefined,
        description: "Array of unicode characters as html strings, with possible <span>s"
      },
      images_padding: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Image padding",
        array: true,
        default: [],
        description: "Array of integers determining the padding between images, in px"
      },
      feedback_function: {
        type: jsPsych.plugins.parameterType.FUNCTION,
        pretty_name: "Feedback function",
        default: null,
        description: "function(images, colors, sentence-type, answer), returning the message to display as feedback"
      },
      feedback_delay: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Feedback delay",
        default: 1000,
        description: "Time to display feedback message before continue button appears"
      },
      picture_delay: {
          type: jsPsych.plugins.parameterType.INT,
          pretty_name: 'picture delay',
          default: null,
          description: 'Delays until picture is shown.'
          },
      continue_text: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Continue button text",
        default: "Continue",
        description: "Text for the button to continue after feedback message"
      }
    }
  };

  /*
   * This is what instantiates the trial: `display_element` is the DOM object
   * where we'll be creating stuff, `trial` is a dictionary with all the
   * parameters as defined above.
   */
  plugin.trial = function(display_element, trial) {
    var pluginPrefix = "lang-reason-prime-images-";
    var trial_data;
    var i;

    // At the top we find the target sentence
    display_element.innerHTML = "<div class=\"" + pluginPrefix + "target-sentence\">" + trial.target_sentence + "</div>";

    // Then the picture.  We make a little one-row table that we fill with the
    // elements of the `images` array
    var thePicture = "<div id=\"" + pluginPrefix + "images-table\" style=\"margin:auto; display:table;table-layout:fixed; border-spacing:0px\"><div class=\"" + pluginPrefix + "images-table-row\" style=\"display:table-row;\">";

    // Padding is annoying.  The parameters wants an array with the space
    // _between_ images, so we need to translate this into left and right padding
    // for each of the images
    if (trial.images_padding.length == 0)
      // Default padding is 10px
      trial.images_padding = Array(trial.images.length * 3).fill(30);
    else {
      // TODO: custom-defined padding for transitions between items
      //
      // trial.images_padding is originally an array of length n - 1, where n is
      // the length of trial.images.  It's meant to represent the transitions.
      // Here we want to transform this n - 1 array into a 2n array, with left
      // and right padding values that are implemented by the for-loop below.
    }

    for (i = 0; i < trial.images.length; i++)
      thePicture += "<span class=\"" + pluginPrefix + "images-table-cell\" style=\"display:table-cell;color:" + " red " + "; padding-left:" + trial.images_padding[2 * i] + "px;padding-right:" + trial.images_padding[2 * i + 1] + "px; \">" + trial.images[i] + "</span>";
    display_element.innerHTML += thePicture + "</div></div>";

    var y = document.getElementsByClassName("lang-reason-prime-images-images-table-cell");
    var i;
    for (i = 0; i < y.length; i++) {
      y[i].style.visibility = "hidden";
    }



  if (trial.picture_delay !== null) {
   jsPsych.pluginAPI.setTimeout(function() {
     for (i = 0; i < y.length; i++) {
       y[i].style.visibility = "visible";
     }
   }, trial.picture_delay);
 } else {
   for (i = 0; i < y.length; i++) {
     y[i].style.visibility = "visible";
   }
 }

    // Show prompt if there is one
    if (trial.prompt !== "" || trial.feedback_function != null) {
      if (trial.prompt == "")
        trial.prompt = "<p>&nbsp;</p>";
      display_element.innerHTML += "<div id=\"" + pluginPrefix + "prompt\" class=\"" + pluginPrefix + "prompt\">" + trial.prompt + "</div>";
    }

    // Set up response buttons
    // This function will be added to each response button
    responseButtonClicked = function(e) {
      // Set up the trial data to be passed along
      trial_data = {
        rt: (new Date()).getTime() - t0,
        responses: this.value,
        target_sentence_type: trial.target_sentence_type,
        target_sentence: trial.target_sentence
      };

      if (trial.feedback_function != null) {
        // If a feedback function was provided, call it and display its result
        // as a message
        display_element.querySelector("#" + pluginPrefix + "prompt").innerHTML
          = "<p>" + trial.feedback_function(trial.images,
                                    //        trial.colors,
                                            trial.target_sentence_type,
                                            this.value) + "</p>";

        // deactivate the response buttons, and set up a timer for displaying a
        // continue button
        display_element.querySelector("#" + pluginPrefix + "buttons").style.visibility = "hidden";
        jsPsych.pluginAPI.setTimeout(
          function() {
            display_element.querySelector("#" + pluginPrefix + "buttons").innerHTML =
              "<button class=\"" + pluginPrefix + "button jspsych-btn\" id=\"" +
              pluginPrefix + "button-continue\">" + trial.continue_text + "</button>";
            display_element.querySelector("#" + pluginPrefix + "buttons").style.visibility =
              "visible";
            display_element.querySelector("#" + pluginPrefix + "buttons").
              addEventListener("click", function(e) { jsPsych.finishTrial(trial_data); });
          }, trial.feedback_delay);
      }
      else
        jsPsych.finishTrial(trial_data);
    };

    var theButtons = "<div id=\"" + pluginPrefix + "buttons\" class=\"" + pluginPrefix + "btngroup\">";
    for (i = 0; i < trial.responses.length; i++) {
      theButtons += "<button class=\"" + pluginPrefix + "button jspsych-btn\" id=\"" + pluginPrefix + "button-" + i + "\" value=\"" + i + "\">" + trial.responses[i] + "</button>";
    }
    display_element.innerHTML += theButtons + "</div>";
    for (i = 0; i < trial.responses.length; i++) {
      display_element.querySelector("#" + pluginPrefix + "button-" + i).addEventListener("click", responseButtonClicked);
    }

    var t0 = (new Date()).getTime();
  };

  return plugin;
})();
