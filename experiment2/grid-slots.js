/**
 * Slot machine sampler for urn-style slot machines
 * Nicolas Navarre
 **/

/**
 * Grid data showing data with outcomes
 * Nicolas Navarre
 * Based on masc-jspsych-grid-shower
 *
 **/



var jsGridData = (function (jspsych) {
	"use strict";

	const info = {
		name: 'grid-data',
		parameters: {
			targets: {
				type: jspsych.ParameterType.INT,
				pretty_name: 'Targets',
				array: true,
				default: [],
				description: 'Location of targets to display.  Array of [row, column] coordinates'
			},

			test_targets: {
				type: jspsych.ParameterType.INT,
				pretty_name: 'Targets',
				array: true,
				default: [],
				description: 'Location of targets to display in the test grid.  Array of [row, column] coordinates'
			},
			judgements: {
				type: jspsych.ParameterType.INT,
				pretty_name: 'Causal judgements',
				array: true,
				default: [],
				description: 'Location of targets to display.  Array of [row, column] coordinates'
			},
			grid: {
				type: jspsych.ParameterType.INT,
				pretty_name: 'Grid',
				array: true,
				default: [4, 3],
				description: 'Dimensions of the array as [rows, columns] (does not include the header)'
			},
			test_grid: {
				type: jspsych.ParameterType.INT,
				pretty_name: 'Test Grid',
				array: true,
				default: [4, 3],
				description: 'Dimensions of the array as [rows, columns] (does not include the header)'
			},
			show_urns: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: 'Show urns when sampling',
				default: true,
				description: 'Determines if the two columns should be shown'
			},
			grid_square_size: {
				type: jspsych.ParameterType.INT,
				pretty_name: 'Grid square size',
				default: 100,
				description: 'Width and height in pixels of each cell in the grid'
			},
			target_symbol: {
				type: jspsych.ParameterType.STRING,
				pretty_name: 'Target symbol',
				default: String.fromCharCode(9679),
				description: 'Symbol to be displayed in target cells'
			},
			prompt: {
				type: jspsych.ParameterType.HTML_STRING,
				pretty_name: 'Prompt',
				array: true,
				default: [],
				description: 'An array of prompts or a simple string to be displayed above the grid, one for each click'
			},
			custom_prompt: {
				type: jspsych.ParameterType.HTML_STRING,
				pretty_name: 'Custom prompt',
				array: true,
				default: [],
				description: 'The prompt to be added following the specific sample information'
			},
			ball_colours: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Ball Colours",
				array: true,
				default: ['blue', 'orange'],
				description: "Colour of the balls sampled from the urns and shown on the sample grid"
			},
			outcome_colour: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Outcome colour",
				// default: '#70C1B3',
				default: 'green',
				description: "Background color of the selected cells"
			},
			no_outcome_colour: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "No outcome colour",
				default: 'red',
				description: "Background color of the selected cells"
			},
			cause_colour: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Causal judgment colour",
				default: "gold",
				description: "Colour of the borders surrounding causal cells"
			},
			sample_trial: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: "Sampling required?",
				default: true,

			},
			instruction_trial: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: "Instruction trial",
				default: false,
			},
			previous_responses: {
				type: jspsych.ParameterType.COMPLEX,
				pretty_name: "Previous responses",
				default: null,
			},
			test_correct: {
				type: jspsych.ParameterType.INT,
				array: true,
				default: [],
			},
			feedback_correct_symbol: {
				type: jspsych.ParameterType.STRING,
				default: "\u2713",
			},
			feedback_wrong_symbol: {
				type: jspsych.ParameterType.STRING,
				default: "X",
			},
			start_sample: {
				type: jspsych.ParameterType.INT,
				default: 0,
			}
		}
	};

	/**
	 * Data Grid Shower
	 * 
	 * Simple plugin to display Sparse array data in a grid.
	 * Allows for 
	 * - cell highligting
	 * - Cell clicking
	 * @author Nicolas Navarre
	 */
	class DataGridPlugin {
		constructor(jsPsych) {
			this.jsPsych = jsPsych;
		}


		trial(display_element, trial) {

			/**
			 * Execute the main trial.
			 * Checks if the trial is an observation or instruction trial.
			*/
			if (trial.sample_trial) {
				var total_observations = trial.grid[0];
			} else {
				var total_observations = trial.prompt.length;
			}

			var test_outcomes = null;


			function main(current_sample) {

				let gridDiv = null;


				if (trial.previous_responses) {
					console.log("Showing some results");
					gridDiv = showTestResults();
				} else if (trial.instruction_trial) {
					gridDiv = showInstructionData(current_sample);
				} else if (trial.test_targets.length > 0) {
					gridDiv = showTestData();
				} else {
					gridDiv = showObservationData(current_sample);
				}

				display_element.appendChild(gridDiv)
			}


			//////////////////
			// Helper Functions
			//////////////////

			/**
			 * Creates an html object with with desired class and type specifications.
			 * Meant to be used for simple classes without too many styling restrictions.
			 * @param {string} input 
			 * @param {string} type 
			 * @param {string} class_name 
			 * @returns 
			 */
			function quickHTML(input, type, class_name, style) {
				if (input == null || type == null) {
					return;
				}
				if (class_name == null) {
					return `<${type}>` + input + `</${type}>`;
				} else if (style == null) {
					return `<${type} class="${class_name}">` + input + `</${type}>`;
				} else {
					return `<${type} class="${class_name}" style="${style}">` + input + `</${type}>`;
				}
			}

			/**
			 * Quick function to clear the display.
			 */
			function deleteScreen() {
				display_element.innerHTML = "";
			}

			//////////////////
			// Grid Functions
			//////////////////

			/**
			 * Draws a standalone observation (row) in the 
			 * provided data grid in trial.grid
			 * @param {int} sample_number 
			 * @param {int} test_trial 
			 * @returns 
			 */
			function drawObservation(sample_number, test_trial) {

				var observation = "<div id='jspsych-serial-reaction-time-stimulus' style='margin:auto; display: table; table-layout: fixed; border-spacing: 5px 5px'>";
				observation += drawGridRow(sample_number, test_trial);
				observation += "</div>";
				return observation;
			};

			/**
			 * Draws a row of the defined grid. 
			 * Used as a helper function for the standalone grids in drawObservation and drawGrid.
			 * @param {int} sample_number 
			 * @param {boolean} test_trial 
			 * @param {boolean} judgment_flag 
			 * @returns 
			 */
			function drawGridRow(sample_number, test_trial) {
				let row_kind = test_trial ? 'test' : 'data';
				var row = "<div class='jspsych-data-grid-row' style='display:table-row;'>";
				for (let j = 1; j <= trial.grid[1]; j++) {

					let idName = `jspsych-${row_kind}-grid-cell`;
					let className = '';
					let background_color = '';
					let ball_colour = 'color : blue;';
					let symbol = trial.target_symbol;
					if (j == trial.grid[1]) {
						background_color = "background-color: " + trial.no_outcome_colour + ";";
						className = `jspsych-${row_kind}-grid-outcome`;
					} else {
						className = `jspsych-${row_kind}-grid-cell`;
					}
					row += "<div class=\"" + className + "\" id=\"" + idName + sample_number + "-" + j + "\" data-row=\"" + sample_number + "\" data-column=\"" + j + "\" style=\"width:" + trial.grid_square_size + "px; color:" + trial.cause_colour + "; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";


					// Colour the target cells with orange balls (instead of blue)
					// Colour the outcome trials
					if (checkArray((test_trial) ? trial.test_targets : trial.targets, [sample_number, j])) {
						if (j != trial.grid[1]) {
							ball_colour = "color: " + 'orange' + ";";
						} else {
							background_color = "background-color: " + trial.outcome_colour + ";";
						}
					}
					if (test_trial) {
						background_color = '';
					}
					row += background_color + ball_colour;

					// Causal judgements
					if (checkArray(trial.judgements, [sample_number, j]) && !test_trial && trial.judgements != null) {
						row += "border-top: 3px " + 'dashed ' + trial.cause_colour + "; border-bottom: 3px " + 'dashed ' + trial.cause_colour + ";" +
							"border-left: 3px dashed " + trial.cause_colour + "; border-right: 3px dashed " + trial.cause_colour + ";";
					}

					// Border the outcome cells
					if (j == trial.grid[1]) {
						row += "border-left: 3px solid black; border-right: 3px solid black;" +
							"border-bottom: 3px solid black; border-top: 3px solid black;";
						symbol = '';
					}

					row += "\">" + symbol + "</div>";
				}
				row += "</div>";
				return row
			};

			/**
			 * Draws a row of the feedback grid 
			 * Used as a helper function for the standalone grids in drawObservation and drawGrid.
			 * @param {int} sample_number 
			 * @param {boolean} test_trial 
			 * @param {boolean} judgment_flag 
			 * @returns 
			 */
			function drawFeedbackRow(sample_number) {
				let row_kind = 'data';
				let test_trial = true;
				let idName = `jspsych-${row_kind}-grid-cell`;
				var row = "<div class='jspsych-data-grid-row' style='display:table-row;'>";
				for (let j = 1; j <= trial.grid[1]; j++) {

					let className = '';
					let background_color = '';
					let ball_colour = 'color : blue;';
					let symbol = trial.target_symbol;
					if (j == trial.grid[1]) {
						background_color = "background-color: " + trial.no_outcome_colour + ";";
						className = `jspsych-${row_kind}-grid-outcome`;
					} else {
						className = `jspsych-${row_kind}-grid-cell`;
					}
					row += "<div class=\"" + className + "\" id=\"" + idName + sample_number + "-" + j + "\" data-row=\"" + sample_number + "\" data-column=\"" + j + "\" style=\"width:" + trial.grid_square_size + "px; color:" + trial.cause_colour + "; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";


					// Colour the target cells with orange balls (instead of blue)
					// Colour the outcome trials
					if (checkArray((test_trial) ? trial.test_targets : trial.targets, [sample_number, j])) {
						if (j != trial.grid[1]) {
							ball_colour = "color: " + 'orange' + ";";
						}
					}

					if (j == trial.grid[1]) {
						let prev_bg = (trial.previous_responses[sample_number - 1]) ? trial.outcome_colour : trial.no_outcome_colour;
						background_color = "background-color: " + prev_bg + ";";
						// background_color = "background-color: " + trial.outcome_colour + ";";
					}

					row += background_color + ball_colour;

					// Causal judgements
					if (checkArray(trial.judgements, [sample_number, j]) && !test_trial && trial.judgements != null) {
						row += "border-top: 3px " + 'dashed ' + trial.cause_colour + "; border-bottom: 3px " + 'dashed ' + trial.cause_colour + ";" +
							"border-left: 3px dashed " + trial.cause_colour + "; border-right: 3px dashed " + trial.cause_colour + ";";
					}

					// Border the outcome cells
					if (j == trial.grid[1]) {
						row += "border-left: 3px solid black; border-right: 3px solid black;" +
							"border-bottom: 3px solid black; border-top: 3px solid black;";
						symbol = '';
					}

					row += "\">" + symbol + "</div>";
				}
				row += "<div class=\"" + "jspsych-data-grid-feedback" + "\" id=\"" + idName + sample_number + "-" + j + "\" data-row=\"" + sample_number + "\" data-column=\"" + trial.grid[1] + 1 + "\" style=\"width:" + trial.grid_square_size + "px; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";

				let resp = (trial.test_correct[sample_number - 1] == trial.previous_responses[sample_number - 1]) ? trial.feedback_correct_symbol : trial.feedback_wrong_symbol;
				row += "\">" + resp + "</div>";
				row += "</div>";
				return row;
			};

			/**
			 * 
			 * @returns HTML grid of the feedback on the previously answered responses
			 */
			function drawFeedbackGrid() {
				border = "border-top: 2px solid black; border-bottom: 2px solid black; border-left: 2px solid black; border-right: solid black;";
				let theGrid = `<div id='jspsych-serial-reaction-time-stimulus' style='margin:auto; display: table; table-layout: fixed; border-spacing: 5px 5px;${border}'>`;
				for (let i = 1; i <= trial.grid[0]; i++) {
					theGrid += drawFeedbackRow(i);
				}
				theGrid += "</div>";
				return theGrid;
			}

			/**
			 * Draws a complete grid up to the current sample of observations
			 * @param {int} current_sample 
			 * @param {boolean} test_trial 
			 * @returns 
			 */
			function drawGrid(current_sample, test_trial) {
				let border = '';
				if (!test_trial) {
					border = "border-top: 2px solid black; border-bottom: 2px solid black; border-left: 2px solid black; border-right: solid black;";
				}
				let theGrid = `<div id='jspsych-serial-reaction-time-stimulus' style='margin:auto; display: table; table-layout: fixed; border-spacing: 5px 5px;${border}'>`;
				for (let i = 1; i <= current_sample; i++) {
					theGrid += drawGridRow(i, test_trial);
				}
				theGrid += "</div>";

				return theGrid;
			}


			/**
			 * Displays the instrictions up to the current sample as well as the desired prompt index.
			 * When the current sample is at the maximum value
			 * the button will allow for the trial to end.
			 * @param {INT} current_sample 
			 */
			function showInstructionData(current_sample) {

				// Clear the screen
				deleteScreen();

				let instructionDiv = document.createElement("div");

				// index the prompt you want by the current sample
				let prompt = '';
				if (Array.isArray(trial.prompt)) {
					prompt += quickHTML(trial.prompt[current_sample], 'div', "jspsych-data-grid-prompt");
				} else if (typeof trial.prompt === "string") {
					prompt += quickHTML(trial.prompt, 'div', "jspsych-data-grid-prompt");
				}

				var gridhtml = '';
				if (!trial.sample_trial) {
					gridhtml += drawGrid(trial.grid[0], false);
				} else if (current_sample > 0) {
					gridhtml += drawGrid(current_sample, false);
				}

				let customText = '';
				if (trial.sample_trial) {
					customText = quickHTML("Push the button below to draw a new sample!", 'div');
				} else {
					customText = quickHTML(trial.custom_prompt[current_sample], "div");
				}
				if (trial.sample_trial) {
					customText += quickHTML("<b>Remaining samples: </b>" + (total_observations - current_sample), 'div', "jspsych-data-gid-prompt");
				}

				if (current_sample == total_observations) {
					instructionDiv.innerHTML += quickHTML("All observations", "h2") + gridhtml;
				} else {
					instructionDiv.innerHTML += prompt + gridhtml + customText;
				}


				// Button for sampling
				let btn = document.createElement("button");
				btn.className = "jspsych-btn";
				btn.style = 'margin-left: 5px;';

				if (current_sample == total_observations) {
					// display_element.innerHTML += "<button id='end-trial-button' class='jspsych-btn' style='margin-left: 5px;'> Go to test! </button>";
					btn.id = "end-trial-button";
					btn.textContent = "Start trial";
					btn.addEventListener("click", () => {
						endTrial();
					});
				} else if (!trial.sample_trial) {
					// display_element.innerHTML += "<button id='next-prompt-button' class='jspsych-btn' style='margin-left: 5px;'> Next </button>";
					btn.id = "next-prompt-button";
					btn.textContent = "Next"
					btn.addEventListener("click", () => {
						main(current_sample + 1);
					});
				} else {
					// display_element.innerHTML += "<button id='next-draw-button' class='jspsych-btn' style='margin-left: 5px;'> Draw Sample </button>";
					btn.id = "next-draw-button";
					btn.textContent = "Draw sample";
					btn.addEventListener("click", () => {
						main(current_sample + 1);
					});
				}
				instructionDiv.appendChild(btn);
				return instructionDiv;
			}

			/**
			 * Displays the observation grid up to the current sample
			 * When the current sample is at the maximum value
			 * the button will allow for the trial to end.
			 * @param {int} current_sample 
			 */
			function showObservationData(current_sample) {

				// Clear the screen
				deleteScreen();


				let contentDiv = document.createElement("div");

				// index the prompt you want by the current sample
				let prompt = '';
				if (Array.isArray(trial.prompt)) {
					prompt += quickHTML(trial.prompt[current_sample], 'div', "jspsych-data-grid-prompt");
				} else if (typeof trial.prompt === "string") {
					prompt += quickHTML(trial.prompt, 'div', "jspsych-data-grid-prompt");
				}

				let gridhtml = '';
				if (current_sample > 0) {
					gridhtml = drawGrid(current_sample, false);
				}

				let customText = quickHTML("Push the button below to draw a new sample!", 'div') +
					quickHTML("<b>Remaining samples: </b>" + (total_observations - current_sample), 'div', "jspsych-data-gid-prompt");


				if (current_sample == total_observations) {
					contentDiv.innerHTML += quickHTML("All observations", "h2") + gridhtml;
				} else {
					contentDiv.innerHTML += prompt + gridhtml + customText;
				}

				// Button for proceeding
				let btn = document.createElement("button");
				btn.className = "jspsych-btn";
				btn.style = 'margin-left: 5px;';
				if (current_sample == total_observations) {
					// display_element.innerHTML += "<button id='end-trial-button' class='jspsych-btn' style='margin-left: 5px;'> Go to test! </button>";
					btn.textContent = "Go to test!"
					btn.id = "end-trial-button";
					btn.addEventListener("click", () => {
						endTrial();
					});
				} else {
					// display_element.innerHTML += "<button id='next-draw-button' class='jspsych-btn' style='margin-left: 5px;'> Draw Sample </button>";
					btn.textContent = "Draw"
					btn.id = "next-draw-button";
					btn.addEventListener("click", () => {
						// display_element.innerHTML += quickHTML(trial.prompt[current_sample], 'div', "jspsych-data-grid-prompt");

						main(current_sample + 1);
					});
				}

				contentDiv.appendChild(btn);

				return contentDiv;



			}

			/**
			 * Feedback to the test responses from the previous trial
			 */
			function showTestResults() {
				deleteScreen();

				// Main Grid Content
				let resultDiv = document.createElement("div");

				//TODO: Make better
				let gridhtml =  quickHTML("Response feedback:", "div")+drawFeedbackGrid();

				resultDiv.innerHTML = gridhtml;


				// Make the necessary button
				// gridhtml += "<button id='end-trial-button' class='jspsych-btn' style='margin-left: 5px;'> Continue </button>";
				let btn_end = document.createElement("button");
				btn_end.className = "jspsych-btn";
				btn_end.id = "end-trial-button";
				btn_end.style = "margin-left: 5px;";
				btn_end.innerHTML = "Continue";

				// Add a listener for the button
				btn_end.addEventListener("click", () => {
					endTrial();
				});



				resultDiv.appendChild(btn_end);

				return resultDiv;

			}

			/**
			 * Displays the test data grid.
			 */
			function showTestData() {


				deleteScreen();

				let testDiv = document.createElement("div");

				// show prompt if there is one
				if (trial.prompt.length > 0) {
					testDiv.innerHTML += quickHTML(trial.prompt, 'div', "jspsych-data-grid-prompt");
				}
				// display_element.innerHTML += trial.prompt;

				let test_column = quickHTML(quickHTML("<b>Predict the following outcomes: </b>", "div") + quickHTML(drawGrid(trial.test_grid[0], true), "div", "", "overflow:scroll; height:" + trial.grid_square_size * (1 + trial.grid[0]) + "px;"), "div", "column column-left");
				let observation_column = quickHTML(quickHTML("<b>Observation history:</b>", "div") + drawGrid(trial.grid[0], false), "div", "column column-left");
				let data_columns = quickHTML(test_column + observation_column, "div", "row");


				testDiv.innerHTML += data_columns;
				
				/////////////////////////////

				let btn_save = document.createElement("button");
				btn_save.className = "jspsych-btn";
				btn_save.style = "style='margin-left: 5px;";
				btn_save.id = "save-test-button";
				btn_save.textContent = "Save answers";

				// display_element.innerHTML += "<button id='save-test-button' class='jspsych-btn'" +
				// 	"style='margin-left: 5px;'>" +
				// 	"Save answers" +
				// 	"</button>";
				

				// Retrieve the elements with the class "jspsych-test-grid-outcome"
				let outcomes = testDiv.getElementsByClassName("jspsych-test-grid-outcome");
				let answer_blank = false;
				btn_save.addEventListener("mousedown", () => {
					for (let i = 0; i < outcomes.length; i++) {
						if (outcomes[i].style.backgroundColor.length == 0) {
							answer_blank = true;
						}
					};

					let outcome_resps = [];
					for (let i = 0; i < outcomes.length; i++) {
						outcome_resps.push(outcomes[i].style.backgroundColor);
					};

					if (!answer_blank) {
						endTrial(outcome_resps);
					} else {
						test_outcomes = outcome_resps;
						deleteScreen();
						display_element.innerHTML += quickHTML("<b>Please select all outcome predictions before proceeding!</b>", "div");
						setTimeout(() => main(), 1000);
					}
				});

				// Fill in previous answers if originally selected				
				if (test_outcomes != null) {
					for (let i = 0; i < outcomes.length; i++) {
						outcomes[i].style.backgroundColor = test_outcomes[i];
					};
				}

				// Make the test outcomes editable
				for (let i = 0; i < outcomes.length; i++) {
					outcomes[i].addEventListener("mousedown", function (e) {
						// var info = {};
						// info.row = e.currentTarget.getAttribute('data-row');
						// info.column = e.currentTarget.getAttribute('data-column');
						// info.outs = outcomes;
						if (e.currentTarget.style.backgroundColor == trial.outcome_colour) {
							e.currentTarget.style.backgroundColor = trial.no_outcome_colour;
						} else {
							e.currentTarget.style.backgroundColor = trial.outcome_colour;
						}
					});
				};
				testDiv.appendChild(btn_save);
				return testDiv;
			}



			const endTrial = (test_responses) => {
				// if (trial.allow_keys) {
				// 	this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboard_listener);
				// }
				let finalHTML = display_element.innerHTML;
				deleteScreen();
				var trial_data = {
					// TODO: Get urn order and sample orders from the timeline script
					grid: trial.grid,
					targets: trial.targets,
					test_grid: trial.test_grid,
					test_targets: trial.test_targets,
					prompt: trial.prompt,
					custom_prompt: trial.custom_prompt,
					ball_colours: trial.ball_colours,
					sample_trial: trial.sample_trial,
					instruction_trial: trial.instruction_trial,
					finalHTML: finalHTML,
					test_responses: (test_responses != null) ? test_responses.map((e) => ({ "green": 1, "red": 0 })[e]) : null //turn colours into os and ones
				};
				this.jsPsych.finishTrial(trial_data);
			};

			// Run main sequence
			main(trial.start_sample);

		}
	}
	DataGridPlugin.info = info;
	return DataGridPlugin;
})(jsPsychModule);
