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
				default: [[1, 1]],
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
			cause: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: 'Grid',
				default: true,
				description: 'Determines if causal judgements should be given'
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
				default: String.fromCharCode(9650),
				description: 'Symbol to be displayed in target cells'
			},
			prompt: {
				type: jspsych.ParameterType.HTML_STRING,
				pretty_name: 'Prompt',
				default: null,
				description: 'Any content here will be displayed above the grid'
			},
			target_colour: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Outcome colour",
				default: 'grey',
				description: "Background color of the selected cells"
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
				default: "FFFF00",
				description: "Colour of the borders surrounding causal cells"
			},
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

			//////////////////
			// Grid Functions
			//////////////////
			function drawObservation(sample_number, targets) {
				let row_kind = test_trial ? 'test' : 'data';
				var observation = "<div class='jspsych-" + row_kind + "-grid-row' style='display:table-row;'>";
				for (let j = 1; j <= trial.grid[1]; j++) {
					let idName = 'jspsych-' + row_kind + '-grid-cell';
					let className = '';
					let background_color = '';
					if (j == trial.grid[1]) {
						className = 'jspsych-' + row_kind + '-grid-outcome';
					} else {
						className = 'jspsych-' + row_kind + '-grid-cell';
					}
					observation += "<div class=\"" + className + "\" id=\"" + idName + sample_number + "-" + j + "\" data-row=\"" + sample_number + "\" data-column=\"" + j + "\" style=\"width:" + trial.grid_square_size + "px; color:" + trial.cause_colour + "; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";

					// Colour the targets
					for (let k in targets) {
						if (targets[k][0] == sample_number && targets[k][1] == j) {
							if (j != trial.grid[1]) {
								background_color = "background-color: " + trial.target_colour + ";";
								break;
							}
							if (j == trial.grid[1]) {
								background_color = "background-color: " + trial.outcome_colour + ";";
							} else {
								background_color = "background-color: " + trial.no_outcome_colour + ";";
							}
						}
					}
					if (test_trial && j == trial.grid[1]) {
						background_color = ";";
					}
					observation += background_color;

					observation += "border-top: 3px solid black; border-bottom: 3px solid black;";
					if (j == trial.grid[1]) observation += "border-left: 5px solid black; border-right: 3px solid black;"
					else observation += "border-left: 3px solid black;"

					observation += "\">" + "</div>";
				}
				observation += "</div>";
				return observation
			};

			function quickHTML(input, type , class_name) {
				if (input == null || type == null) {
					return;
				}
				if (class_name == null) {
					return `<${type}>` + input + `</${type}>`;
				} else {
					return `<${type} class=${class_name}>` + input + `</${type}>`;
				}
			}

			function drawGridRow(sample_number, n_samples, targets) {
				var observation = "<div class='jspsych-data-grid-row' style='display:table-row;'>";
				for (let j = 1; j <= trial.grid[1]; j++) {
					let idName = 'jspsych-data-grid-cell';
					let className = '';
					let background_color = '';
					if (j == trial.grid[1]) {
						className = 'jspsych-data-grid-outcome';
					} else {
						className = 'jspsych-data-grid-cell';
					}
					observation += "<div class=\"" + className + "\" id=\"" + idName + sample_number + "-" + j + "\" data-row=\"" + sample_number + "\" data-column=\"" + j + "\" style=\"width:" + trial.grid_square_size + "px; color:" + trial.cause_colour + "; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";

					// Colour the targets
					for (let k in targets) {
						if (targets[k][0] == sample_number && targets[k][1] == j) {
							if (j != trial.grid[1]) {
								background_color = "background-color: " + trial.target_colour + ";";
								break;
							}
							if (j == trial.grid[1]) {
								background_color = "background-color: " + trial.outcome_colour + ";";
							} else {
								background_color = "background-color: " + trial.no_outcome_colour + ";";
							}
						}
					}
					observation += background_color;

					if (sample_number == n_samples) observation += "border-top: 3px solid black; border-bottom: 3px solid black;"
					else observation += "border-top: 3px solid black;"
					if (j == trial.grid[1]) observation += "border-left: 5px solid black; border-right: 3px solid black;"
					else observation += "border-left: 3px solid black;"

					observation += "\">" + (checkArray(trial.judgements, [sample_number, j]) && trial.cause ? trial.target_symbol : '') + "</div>";
				}
				observation += "</div>";
				return observation
			};

			function drawGrid(n_samples, targets) {
				var theGrid = "<div id='jspsych-serial-reaction-time-stimulus' style='margin:auto; display: table; table-layout: fixed; border-spacing:" + 0 + "px'>";
				for (let i = 1; i <= n_samples; i++) {
					theGrid += drawGridRow(i, n_samples, targets);
				}
				theGrid += "</div>";

				return theGrid;
			}

			function deleteScreen() {
				display_element.innerHTML = "";
			}

			function showObservationData() {

				// show prompt if there is one
				if (trial.prompt !== null) {
					display_element.innerHTML += quickHTML(trial.prompt,'div', "jspsych-data-grid-prompt");
				}

				

				let gridhtml = `<div class = "row">`;
				// Left column
				// Displays the individual urn sample for either the test or the data
				gridhtml += `<div class = "column">`;
				if (!sample_drawn) {
					gridhtml += quickHTML("Push the button below to draw a sample form the slot machine!",'p');
				} else {
					gridhtml += drawObservation(current_sample + 1, test_trial ? trial.test_targets : trial.targets);
				}
				gridhtml += `</div>`; // end column

				// Rigth column
				// Display the data history
				gridhtml += `<div class = "column">`;
				gridhtml += test_trial ? grids[10] : grids[current_sample];
				gridhtml += `</div>`; // end column
				gridhtml += `</div>`; // end row
				gridhtml += quickHTML("<b>Remaining samples:</b>" + (total_samples - current_sample) ,'div',"jspsych-data-gid-prompt");

				display_element.innerHTML += gridhtml;
				// Button for sampling
				if (!sample_drawn) {
					display_element.innerHTML += "<button id='next-draw-button' class='jspsych-btn' style='margin-left: 5px;'> Draw Sample </button>";
					var btn_draw = document.getElementById("next-draw-button");
					btn_draw.addEventListener("click", () => {
						sample_drawn = true;
						next_observation()
					});
				} else {
					display_element.innerHTML += "<button id='save-draw-button' class='jspsych-btn'" +
						"style='margin-left: 5px;'>" +
						"Save sample" +
						"</button>";
					var btn_save = document.getElementById("save-draw-button");
					btn_save.addEventListener("click", () => {
						sample_drawn = false;
						current_sample++;
						next_observation();
					});
				}
				/////////////////////////////

				// Make the test outcomes editable
				let outcomes = document.getElementsByClassName("jspsych-test-grid-outcome");
				for (let i = 0; i < outcomes.length; i++) {
					outcomes[i].addEventListener('mousedown', function (e) {
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

			//////////////////
			// Trial Functions
			//////////////////

			function next_observation() {
				// if done, finish up...
				if (current_sample < total_samples) {
					deleteScreen();
					showObservationData();
				} else {
					deleteScreen();

					// show prompt if there is one
					if (trial.prompt !== null) {
						display_element.innerHTML += quickHTML(trial.prompt, "jspsych-data-grid-prompt",'div');
					}

					display_element.innerHTML += quickHTML("<b>All Observed Samples</b>",'div')
					display_element.innerHTML += grids[10];
					display_element.innerHTML += "<button id='save-draw-button' class='jspsych-btn'" +
						"style='margin-left: 5px;'>" +
						"Go to test" +
						"</button>"
					let btn_save = document.getElementById("save-draw-button");
					btn_save.addEventListener("click", () => {
						sample_drawn = false;
						current_sample++;
						endTrial();
					});
				}
			}
			
			const endTrial = () => {
				if (trial.allow_keys) {
					this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboard_listener);
				}
				display_element.innerHTML = "";
				var trial_data = {
					rt: Math.round(performance.now() - start_time),
					"grid": JSON.stringify(trial.grid),
					"targets": JSON.stringify(trial.targets),
					//TODO: FILL IN REMAINING TRIAL DATA
				};
				this.jsPsych.finishTrial(trial_data);
			};

			//////////////////
			// Trial sequence
			//////////////////
			var grids = [''];
			var current_sample = 0;

			var sample_drawn = false;

			var start_time = performance.now();
			var test_trial = (trial.test_targets.length > 0);
			var total_samples = test_trial ? 16 : 10;


			for (let sample = 1; sample <= 10; sample++) {
				grids.push(drawGrid(sample, trial.targets));
			}

			showObservationData();
		}
	}
	DataGridPlugin.info = info;
	return DataGridPlugin;
})(jsPsychModule);
