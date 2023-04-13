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
				default: false,

			},
			instruction_trial: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: "Instruction trial",
				default: false,
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
			var total_observations = trial.grid[0];

			function main() {
				showInstructionData(0);
				if (trial.instruction_trial) {
					showInstructionData(0);
				} else if (trial.test_targets.length > 0) {
					showTestData();
				} else {
					showObservationData(0);
				}
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
			function quickHTML(input, type, class_name) {
				if (input == null || type == null) {
					return;
				}
				if (class_name == null) {
					return `<${type}>` + input + `</${type}>`;
				} else {
					return `<${type} class="${class_name}">` + input + `</${type}>`;
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
					customText = quickHTML("Push the button below to draw a new sample!",'div');
				} else {
					customText = quickHTML(trial.custom_prompt[current_sample],"div");
				}
				if (trial.sample_trial) {
					customText += quickHTML("<b>Remaining samples: </b>" + (total_observations - current_sample), 'div', "jspsych-data-gid-prompt");
				}

				if(current_sample == total_observations ){
					display_element.innerHTML += gridhtml;
				}else{
					display_element.innerHTML += prompt + gridhtml + customText;
				}
				

				// Button for sampling
				if (current_sample == total_observations) {
					display_element.innerHTML += "<button id='end-trial-button' class='jspsych-btn' style='margin-left: 5px;'> Go to test! </button>";
					let btn_end_instructions = document.getElementById("end-trial-button");
					btn_end_instructions.addEventListener("click", () => {
						endTrial();
					});
				} else if (!trial.sample_trial) {
					display_element.innerHTML += "<button id='next-prompt-button' class='jspsych-btn' style='margin-left: 5px;'> Next </button>";
					let btn_next_instructions = document.getElementById("next-prompt-button");
					btn_next_instructions.addEventListener("click", () => {
						showInstructionData(current_sample + 1);
					});
				} else {
					display_element.innerHTML += "<button id='next-draw-button' class='jspsych-btn' style='margin-left: 5px;'> Draw Sample </button>";
					let btn_draw_instructions = document.getElementById("next-draw-button");
					btn_draw_instructions.addEventListener("click", () => {
						showInstructionData(current_sample + 1);
					});
				}
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

				let customText = quickHTML("Push the button below to draw a new sample!",'div') + 
					quickHTML("<b>Remaining samples: </b>" + (total_observations - current_sample), 'div', "jspsych-data-gid-prompt");
				
				
				if(current_sample == total_observations ){
					display_element.innerHTML += gridhtml;
				}else{
					display_element.innerHTML += prompt + gridhtml + customText;
				}


				// Button for proceeding
				if (current_sample == total_observations) {
					display_element.innerHTML += "<button id='end-trial-button' class='jspsych-btn' style='margin-left: 5px;'> Go to test! </button>";
					let btn_end = document.getElementById("end-trial-button");
					btn_end.addEventListener("click", () => {
						endTrial();
					});
				} else {
					display_element.innerHTML += "<button id='next-draw-button' class='jspsych-btn' style='margin-left: 5px;'> Draw Sample </button>";
					let btn_draw = document.getElementById("next-draw-button");
					btn_draw.addEventListener("click", () => {
						display_element.innerHTML += quickHTML(trial.prompt[current_sample], 'div', "jspsych-data-grid-prompt");
						//put the iterator here

						showObservationData(current_sample + 1);
					});
				}

			}


			/**
			 * Displays the test data grid.
			 */
			function showTestData() {

				// show prompt if there is one
				if (trial.prompt.length > 0) {
					display_element.innerHTML += quickHTML(trial.prompt, 'div', "jspsych-data-grid-prompt");
				}

				let test_column = quickHTML(drawGrid(16, true), "div", "column border-right");
				let observation_column = quickHTML(quickHTML("<b>Observation History</b>", "div") + drawGrid(10, false), "div", "column");
				let data_columns = quickHTML(test_column + observation_column, "div", "row");

				// let data_columns = drawGrid(16, true);

				display_element.innerHTML += data_columns;

				/////////////////////////////

				display_element.innerHTML += "<button id='save-test-button' class='jspsych-btn'" +
					"style='margin-left: 5px;'>" +
					"Save answers" +
					"</button>";
				let outcomes = document.getElementsByClassName("jspsych-test-grid-outcome");
				let btn_save = document.getElementById("save-test-button");
				let answer_blank = false;
				btn_save.addEventListener("mousedown", () => {
					for (let i = 0; i < outcomes.length; i++) {
						if (outcomes[i].style.backgroundColor.length == 0) {
							answer_blank = true;
						}
					};

					if (!answer_blank) {
						endTrial();
					} else {
						console.log("PLEASE PREDICT ALL SAMPLES");
					}
				});

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
			}


			const endTrial = () => {
				if (trial.allow_keys) {
					this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboard_listener);
				}
				display_element.innerHTML = "";
				var trial_data = {
					"grid": JSON.stringify(trial.grid),
					"targets": JSON.stringify(trial.targets),
					//TODO: FILL IN REMAINING TRIAL DATA
				};
				// deleteScreen();
				this.jsPsych.finishTrial(trial_data);
			};



			// Run main sequence
			main();
		}
	}
	DataGridPlugin.info = info;
	return DataGridPlugin;
})(jsPsychModule);
