/**
 * lORe
 * a jspsych plugin for Lawyers vs Engineers type of problems, with two bags
 *
 * Mathias Sablé-Meyer
 *
 */


jsPsych.plugins['lORe'] = (function() {

    var plugin = {};

    plugin.info = {
        name: 'lORe',
        description: '',
        parameters: {
            lSymbol: {
                type: jsPsych.plugins.parameterType.HTML_STRING,
                pretty_name: 'UTF8_lawyer_symbol',
                default: "⏺",
                description: 'The symbol to use for lawyers'

            },
            eSymbol: {
                type: jsPsych.plugins.parameterType.HTML_STRING,
                pretty_name: 'UTF8_engineer_symbol',
                default: "⬟",
                description: 'The symbol to use for engineers'
            },
            lSymbolName: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name:'name_of_the_lSymbol',
                default: "circle",
                description: 'Full text name of the l symbol',
            },
            eSymbolName: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name:'name_of_the_eSymbol',
                default: "pentagon",
                description: 'Full text name of the e symbol',
            },
            markerCSSStyle: {
                type: jsPsych.plugins.parameterType.HTML_STRING,
                pretty_name: 'CSS_Style_For_Description',
                default: "color: red;",
                description: 'A valid CSS string to apply to the elements to put forward. Can be empty in which case no element will be put forward.'
            },
            nonMarkerCSSStyle: {
                type: jsPsych.plugins.parameterType.HTML_STRING,
                pretty_name: 'CSS_Style_For_Description',
                default: "color: black;",
                description: 'A valid CSS string to apply to the elements to put forward. Can be empty in which case no element will be put forward.'
            },
            prior: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'Prior_FLOAT_between_0_and_1',
                default: 0.7,
                description: 'The proportion of E and L in the base distribution. Make it an float between 0 and 1 for good measure.'
            },
            lFitD: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'How_many_l_fit_d_FLOAT_between_0_and_1',
                default: 0.3,
                description: 'How many lawyers fit the description D, in proportion.'
            },
            eFitD: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'How_many_e_fit_d_FLOAT_between_0_and_1',
                default: 0.7,
                description: 'How many engineers fit the description D, in proportion.'
            },
            printMe: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'for debug purpose only: print this in the console',
                default: "",
                description: 'How many engineers fit the description D, in proportion.'
            },
            initialDisplay_color: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'How_long_should_everything_be_black',
                default: 0,
                description: 'First display the grid as black then update colors'
            },
            transitionDelay_color: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'How_long_should_the transition_take',
                default: 0,
                description: 'How long should the color transition be?'
            },
            initialDisplay_pos: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'How_long_should_everything_be_black',
                default: 0,
                description: 'First display the grid as black then update colors'
            },
            transitionDelay_pos: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'How_long_should_the transition_take',
                default: 0,
                description: 'How long should the color transition be?'
            },
            lUp: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Should_l_be_on_top?',
                default: true,
                description: 'If true then lawyers will be on the top rows, otherwise bottom'
            },
            cUp: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Should_c_be_on_top?',
                default: false,
                description: 'Within category, should the colored stuff be up?'
            },
            showEquallyLikely: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Can_participants_bail_out?',
                default: false,
                description: 'If set to true the radio will have a dunno case'
            },
            geometryX: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Horizontal size of the grid',
                default: 10,
                description: 'How many items should there be in a row of the display?'
            },
            geometryY: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Vertical size of the grid',
                default: 10,
                description: 'How many items should there be in a column of the display?'
            },
            jitterX: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Horizontal jitter of the elements',
                default: 8,
                description: 'How much should the horizontal position have random noise?'
            },
            jitterY: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Vertical jitter of the elements',
                default: 8,
                description: 'How much should the vertical position have random noise?'
            },
            colorName: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name:'colorName',
                default: "red",
                description: 'A full text version of the CSS modifier',
            },
            button_label: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name:"Button's label",
                default: "Answer >",
                description: 'Labels of the button to end the trial.',
            },
            is_train: {
              type: jsPsych.plugins.parameterType.BOOL,
              pretty_name: "Is_this_a_training_trial?",
              default: null,
              description: "True if a training trial, null otherwise."
            }
        }
    };

    plugin.trial = function(display_element, trial) {
        var exclude = false; // default, assess if meets exclusionary criteria in on_finish. NB, exclusionary criteria check only implemented on training items (training block + middle and end monocolors)
        if (trial.printMe != "") {
          //console.log(trial.printMe);
        }

        // Prepare the big table of elements
        var tbl1 = document.createElement('table');
        var tbdy1 = document.createElement('tbody');
        var tbl2 = document.createElement('table');
        var tbdy2 = document.createElement('tbody');
        tbl1.id = "tbl1";
        tbl2.id = "tbl2";
        tbl1.style.border = "solid 2px rgba(1,1,1,0)";
        tbl2.style.border = "solid 2px rgba(1,1,1,0)";
        var total = trial.geometryY * trial.geometryX;
        var marked_list = [];
        var nonMarked_list = [];

        var total_top = Math.floor((trial.lUp ? total * trial.prior : (total - total * trial.prior)));
        var total_bottom = total - total_top;

        // shorthands for the big *if*
        var cUp = trial.cUp ;
        var lUp = trial.lUp ;
        var lFitD = trial.lFitD ;
        var eFitD = trial.eFitD ;
        var is_monocolor = lFitD==0 && eFitD==0;

        var tr = document.createElement('tr');
        var td, c, top, left;
        var shift = 0;
        var exact_marked_e = 0;
        var exact_e = 0;
        var exact_marked_l = 0;
        var exact_l = 0;
        for (var e = 0; e < total ; e++) {
            td = document.createElement('td');
            top = (trial.jitterY/2) - Math.floor(Math.random() * trial.jitterY);
            left = (trial.jitterX/2) - Math.floor(Math.random() * trial.jitterX);
            td.style.position = "relative";
            td.style.top = top + "px";
            td.style.left = left + "px";
            //td.style.width = "30px";
            //td.style.height = "30px";
            if (e < total_top) {
                //td.innerHTML = trial.lUp ? trial.lSymbol: trial.eSymbol;
                if (trial.lUp) {
                  td.innerHTML = trial.lSymbol;
                  exact_l = exact_l + 1;
                }
                else {
                  td.innerHTML = trial.eSymbol;
                  exact_e = exact_e + 1;
                }
                tr.appendChild(td);
            }
            if (e >= total_top){
                if (total_top === e) {
                    tbdy1.appendChild(tr);
                    tr = document.createElement('tr');
                    shift = (e % trial.geometryX);
                }
                //td.innerHTML = trial.lUp ? trial.eSymbol: trial.lSymbol;
                if (!trial.lUp) {
                  td.innerHTML = trial.lSymbol;
                  exact_l = exact_l + 1;
                }
                else {
                  td.innerHTML = trial.eSymbol;
                  exact_e = exact_e + 1;
                }
                tr.appendChild(td);
            }
            if ((e - shift + 1) % trial.geometryX === 0) {
                e < total_top ? tbdy1.appendChild(tr) : tbdy2.appendChild(tr);
                tr = document.createElement('tr');
            }
            if (e === total - 1) {
                tbdy2.appendChild(tr);
            }
            // Disgusting stuff goes here
            if (   (!is_monocolor) &&
                (   (cUp && lUp && (e < total_top) && (e/total_top <= lFitD))
                 || (cUp && lUp && (e >= total_top) && ((e-total_top+1)/(total_bottom) <= eFitD))
                 || (cUp && !lUp && (e < total_top) && (e/total_top <= eFitD))
                 || (cUp && !lUp && (e >= total_top) && ((e-total_top+1)/total_bottom <= lFitD))
                 || (!cUp && lUp && (e < total_top) && ((e+1)/total_top > 1-lFitD))
                 || (!cUp && lUp && (e >= total_top) && ((e-total_top)/total_bottom > 1-eFitD))
                 || (!cUp && !lUp && (e < total_top) && ((e+1)/total_top > 1-eFitD))
                 || (!cUp && !lUp && (e >= total_top) && ((e-total_top)/total_bottom > 1-lFitD)))
               ) {
                td.classList.add("marked");
              // TODO BEWARE ATTENTION
              // TODO BEWARE ATTENTION
              // The [0] below will cause issues down the line, right now this
              // is a hotfix for "<svg [blabla]/>" not being equal to "<svg
              // [sameblable]/>" so I just test "<", the first char.
              // TODO BEWARE ATTENTION
              // TODO BEWARE ATTENTION
                if (td.innerHTML[0] === trial.lSymbol[0]) {
                  exact_marked_l = exact_marked_l + 1;
                }
                else {
                  exact_marked_e = exact_marked_e + 1;
                }
                marked_list.push(td);
            }
            else {
                td.classList.add("nonmarked");
                nonMarked_list.push(td);
            }
        }

        // For easy debuging of the exact numbers, uncomment this:
        //console.log(exact_l, exact_e, exact_marked_l, exact_marked_e);
        //console.log("Sanity check: is ", exact_l + exact_e, " = 100?");
        //console.log("Sanity check: is ", exact_marked_l, " > ", exact_marked_e, "?");
        //console.log("nb : rational symbol is ", (!is_monocolor) ? trial.lSymbol : (trial.prior > 0.5 ? trial.lSymbol : trial.eSymbol));


        tbl1.appendChild(tbdy1);
        tbl2.appendChild(tbdy2);


        // prepare the prompt, i.e. the question
        var prompt = document.createElement('p');
        prompt.id = "prompt";
        if (trial.prompt !== null){
            prompt.innerHTML =
                "An object among the ones above was randomly chosen.<br/>" +
            ((lFitD + eFitD === 0) ? "" : "It happens to be a" + ((["a", "e", "i", "o"].includes(trial.colorName[0])) ? "n" : "") +  " <span style='" + trial.markerCSSStyle + "'><strong>" + trial.colorName + "</strong></span> object.<br/>") +
                "Which of the following would you guess it is?";
        }
        prompt.style.opacity = 0;
        prompt.style.transition = "opacity "+trial.transitionDelay/1000+"s";

        // Surely there's a better way than this mess?!
        var htmlForm = document.createElement("form");
        var c1 = document.createElement("input");
        var c2 = document.createElement("input");
        var c3 = document.createElement("input");
        var label1 = document.createElement('label');
        var label2 = document.createElement('label');
        var label3 = document.createElement('label');
        c1.type = "radio";
        c1.name = "response";
        c1.value = "l";
        c1.id = "l";
        label1.setAttribute('for', "l");
        label1.innerHTML = trial.lSymbol + "<br>";
        c2.type = "radio",
        c2.name = "response";
        c2.value = "e";
        c2.id = "e";
        label2.setAttribute('for', "e");
        label2.innerHTML = trial.eSymbol + "<br>";
        c3.type = "radio";
        c3.name = "response";
        c3.value = "equally_likely";
        c3.id = "equally_likely";
        label3.setAttribute('for', "equally_likely");
        label3.innerHTML = "Equally likely<br>";
        c1.disabled = true;
        c2.disabled = true;
        c3.disabled = true;

        // Add classes for CSS
        htmlForm.classList.add("lore-form");
        c1.classList.add("lore-radio");
        c2.classList.add("lore-radio");
        c3.classList.add("lore-radio");
        label1.classList.add("lore-label");
        label2.classList.add("lore-label");
        label3.classList.add("lore-label");
        label3.classList.add("small-label");

        l_position = (Math.random() < 0.5);
        if (l_position) {
            htmlForm.appendChild(c1);
            htmlForm.appendChild(label1);
            htmlForm.appendChild(c2);
            htmlForm.appendChild(label2);
        }
        else {
            htmlForm.appendChild(c2);
            htmlForm.appendChild(label2);
            htmlForm.appendChild(c1);
            htmlForm.appendChild(label1);
        }
        if (trial.showEquallyLikely) {
          htmlForm.appendChild(c3);
          htmlForm.appendChild(label3);
        }

        // prepare the wrapper div for the slider
        var div = document.createElement('div');
        div.id = "lORe-wrapper";
        // append the slide to the div to separate it from the rest
        div.appendChild(htmlForm);

        // prepare the response button
        var button = document.createElement("button");
        button.id = "lORe-response-next";
        button.classList.add("jspsych-btn");
        button.innerHTML = trial.button_label;
        button.disabled = true;

        // Make it before showing the elements to avoid color flash
        if (trial.initialDisplay_color + trial.transitionDelay_color === 0) {
            for (i = 0; i < marked_list.length; i++) {
                if (lFitD + eFitD === 0) {
                    marked_list[i].style.cssText += trial.nonMarkerCSSStyle;
                }
                else {
                    marked_list[i].style.cssText += trial.markerCSSStyle;
                }
            }
            for (i = 0; i < nonMarked_list.length; i++) {
                nonMarked_list[i].style.cssText += trial.nonMarkerCSSStyle;
            }
            button.disabled = false;
            c1.disabled = false;
            c2.disabled = false;
            c3.disabled = false;
            prompt.style.opacity = 1.;
        }


        // Make table of table
        tbl1.id = "tbl1";
        tbl2.id = "tbl2";
        var tbl = document.createElement('table');
        var tbdy = document.createElement('tbody');
        var td1 = document.createElement("td");
        var td2 = document.createElement("td");
        tr = document.createElement("tr");
        td1.appendChild(tbl1);
        td2.appendChild(tbl2);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbdy.appendChild(tr);
        tbl.appendChild(tbdy);

        var fakebox = document.createElement('div');
        var rest = document.createElement('div');
        rest.appendChild(prompt);
        rest.appendChild(div);
        rest.appendChild(button);
        // append all relevant elements in the right order to the main document
        display_element.appendChild(tbl);
        display_element.appendChild(fakebox);
        display_element.appendChild(rest);


        var tbl1_xy = [], tbl2_xy = [];
        var c = 0;
        var v_up1 = (tbl.clientHeight/2) - (tbl1.clientHeight/2);
        var v_up2 = (tbl.clientHeight/2) - (tbl2.clientHeight/2);
        var v_right = (tbl.clientWidth/2) - (tbl1.clientWidth/2) - 10;
        var d_tlbs = (tbl2.clientHeight - tbl1.clientHeight);
        var total = tbl1.clientHeight + tbl2.clientHeight;

        fakebox.style.border = "solid 2px";
        fakebox.style.height = ""+total+"px";
        fakebox.style.width = ""+tbl1.clientWidth+"px";
        fakebox.style.position = "relative";
        fakebox.style.top = "-"+(Math.max(tbl1.clientHeight,tbl2.clientHeight)+11)+"px";
        fakebox.style.left = ""+(v_right+10)+"px";

        rest.style.position = "relative";
        rest.style.top = "-"+(Math.max(tbl1.clientHeight,tbl2.clientHeight)+11)+"px";


        tbl1.style.position = "relative";
        tbl2.style.position = "relative";


        tbl1.style.top = "" + (-v_up1) +"px";
        tbl1.style.left = "" + (v_right) +"px";

        tbl2.style.top = "" + (-v_up2+tbl1.clientHeight - 15) +"px";
        tbl2.style.left = "" + (-v_right) +"px";

        if (!(trial.initialDisplay_color + trial.transitionDelay_color ===0)) {
          setTimeout(function() {
            button.disabled = false;
            c1.disabled = false;
            c2.disabled = false;
            c3.disabled = false;
          }, trial.initialDisplay_color + trial.transitionDelay_color);
          setTimeout(function() {
              prompt.style.opacity = 1.;
              delay = trial.transitionDelay_color / 1000;
              for (i = 0; i < marked_list.length; i++) {
                  marked_list[i].style.transition = "color "+delay+"s, fill "+delay+"s";
                  marked_list[i].style.cssText += trial.markerCSSStyle;
              }
              for (i = 0; i < nonMarked_list.length; i++) {
                  nonMarked_list[i].style.transition = "color "+delay+"s, fill "+delay+"s";
                  nonMarked_list[i].style.cssText += trial.nonMarkerCSSStyle;
              }
          }, trial.initialDisplay_color);
        }

        var l_tbl1_xy = tbl1_xy.length, l_tbl2_xy = tbl2_xy.length
        var c = 0;

        if (!(trial.initialDisplay_pos + trial.transitionDelay_pos ===0)) {
          duration = trial.transitionDelay_pos / 1000;
          tbl1.style.transition = "all "+duration+"s";
          tbl2.style.transition = "all "+duration+"s";
          fakebox.style.transition = "border "+duration+"s";
          setTimeout(function() {
            tbl1.style.border = "solid 2px rgba(1,1,1,1)";
            tbl1.style.top = "0px";
            tbl1.style.left = "0px";

            tbl2.style.border = "solid 2px rgba(1,1,1,1)";
            tbl2.style.top = "0px";
            tbl2.style.left = "0px";

            fakebox.style.border = "solid 2px rgba(1,1,1,0)";
          }, trial.initialDisplay_pos);
        }
      else {
          tbl1.style.border = "solid 2px rgba(1,1,1,1)";
          tbl1.style.top = "0px";
          tbl1.style.left = "0px";

          tbl2.style.border = "solid 2px rgba(1,1,1,1)";
          tbl2.style.top = "0px";
          tbl2.style.left = "0px";

          fakebox.style.border = "solid 2px rgba(1,1,1,0)";
      }

        var response = {
            rt: null,
            response: null,
            position: l_position
        };

        display_element.querySelector('#lORe-response-next').addEventListener('click', function() {
            // measure response time
            var endTime = (new Date()).getTime();
            response.rt = endTime - startTime;
            response.response = document.querySelector('input[name="response"]:checked').value;

            end_trial();
        });

        function end_trial(){

            jsPsych.pluginAPI.clearAllTimeouts();

            // Calculate and log if meets exclusionary criteria
            var is_monocolor = lFitD==0 && eFitD==0;

            if(trial.is_train && is_monocolor && Math.abs(total_top-total_bottom)>=20 && response.response=='equally_likely'){
              exclude = true;
            }

            // Log the ENTIRE trial : responses, but also conditions.
            var trialdata = {
                excludeCrit: exclude,
                is_train: trial.is_train,
                responses: response.response,
                rt: response.rt,
                prior: trial.prior,
                lFitD: trial.lFitD,
                eFitD: trial.eFitD,
                l_position: response.position,
                markerCSSStyle: trial.markerCSSStyle,
                geometryX: trial.geometryX,
                geometryY: trial.geometryY,
                prompt: trial.prompt,
                labels: trial.labels,
                button_label: trial.button_label,
                lSymbol: trial.lSymbol,
                eSymbol: trial.eSymbol,
                lSymbolName: trial.lSymbolName,
                eSymbolName: trial.eSymbolName,
                jitterX: trial.jitterX,
                jitterY: trial.jitterY,
                lUp: trial.lUp,
                cUp: trial.cUp,
                exact_e: exact_e,
                exact_l: exact_l,
                exact_marked_e: exact_marked_e,
                exact_marked_l: exact_marked_l,
            };

            display_element.innerHTML = '';

            // next trial
            jsPsych.finishTrial(trialdata);
        }

        var startTime = (new Date()).getTime();
    };

    return plugin;
})();
