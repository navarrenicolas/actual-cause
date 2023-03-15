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
				default: [[0, 0], [0, 1]],
				description: 'Location of targets to display.  Array of [row, column] coordinates'
			},
			grid: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: 'Grid',
				array: true,
				default: [4, 3],
				description: 'Dimensions of the array as [rows, columns] (does not include the header)'
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
				default: '',//String.fromCharCode(11044),
				description: 'Symbol to be displayed in target cells'
			},
			prompt: {
				type: jspsych.ParameterType.HTML_STRING,
				pretty_name: 'Prompt',
				default: null,
				description: 'Any content here will be displayed above the grid'
			},
			show_duration: {
				type: jspsych.ParameterType.INT,
				pretty_name: 'Trial duration',
				default: null,
				description: 'How long the grid should be displayed'
			},
			training: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: 'Training',
				default: false,
				description: 'Show a button to click on instead of waiting for an answer'
			},
			fixation: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: "Fixation",
				default: false,
				description: "Show a fixation cross for fixation_time milliseconds"
			},
			fixation_time: {
				type: jspsych.ParameterType.INT,
				pretty_name: "Fixation time",
				default: 1000,
				description: "Time to show fixation cross, in milliseconds"
			},
			target_colour: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Outcome colour",
				default: '#000000',
				description: "Background color of the selected cells"
			},
			outcome_colour: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Outcome colour",
				default: '#70c1b3',
				description: "Background color of the selected cells"
			},
			no_outcome_colour: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "No outcome colour",
				default: '#FF1654',
				description: "Background color of the selected cells"
			},
			cause_colour: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Causal judgment colour",
				default: "#F3FFBD",
				description: "Colour of the borders surrounding causal cells"
			},
			border: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: "Border",
				default: false,
				description: "Draw only inner borders when set to false"
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

		drawGrid(grid, square_size, targets, target_colour, outcome_colour, no_outcome_colour) {
			var theGrid = "<div id=\"jspsych-data-grid\" style=\"margin:auto; display:table; table-layout:fixed; border-spacing:0px\">";
			for (var i = 1; i <= grid[0]; i++) {
				theGrid += "<div class=\"jspsych-data-grid-row\" style=\"display:table-row;\">";
				for (var j = 1; j <= grid[1]; j++) {
					var className = "jspsych-data-grid-cell";
					theGrid += "<div class=\"" + className + "\" id=\"jspsych-data-grid-cell-" + i + "-" + j + "\" data-row=\"" + i + "\" data-column=\"" + j + "\" style=\"width:" + square_size + "px; height:" + square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";
				
					// Colour the targets
					for (var k in targets) {
						if (targets[k][0] == i  && targets[k][1] == j) {
							if (j != grid[1]){
								theGrid += "background-color: " + target_colour + ";";
								break;
							}
							if (j == grid[1]) {
								theGrid += "background-color: " + outcome_colour + ";";
							} else {
								theGrid += "background-color: " + no_outcome_colour + ";";
							}
						}
					}
					
					if (i == grid[0]) theGrid += "border-top: 3px solid black; border-bottom: 3px solid black;"
					else theGrid += "border-top: 3px solid black;"
					if (j == grid[1]) theGrid += "border-left: 5px solid black; border-right: 3px solid black;"
					else theGrid += "border-left: 3px solid black;"
					
					theGrid += "\"></div>";
				}
				theGrid += "</div>";
			}
			theGrid += "</div>";

			return theGrid;
		};

		trial(display_element, trial) {
			var trial_data = {
				"grid": JSON.stringify(trial.grid),
				"targets": JSON.stringify(trial.targets)
			};

			var thisPlugin = this;

			deleteScreen();
			// show a fixation cross
			if (trial.fixation) {
				deleteScreen();
				display_element.innerHTML = "<div id='header'></div>";
				$("#header").append('<p id="fixation" class="fixation-cross">+</p>');
				jsPsych.pluginAPI.setTimeout(function () {
					deleteScreen();
					afterFixation();
				}, trial.fixation_time);
			}
			else { afterFixation(); }

			function deleteScreen() {
				display_element.innerHTML = "";
			}

			function afterFixation() {
				// show prompt if there is one
				if (trial.prompt !== null) {
					display_element.innerHTML += "<div class=\"jspsych-data-grid-prompt\">" + trial.prompt + "</div>";
				}

				// create grid
				display_element.innerHTML += thisPlugin.drawGrid(trial.grid, trial.grid_square_size, trial.targets, trial.target_colour, trial.outcome_colour, trial.no_outcome_colour);

				// display dots
				for (var i in trial.targets) {
					$("#jspsych-data-grid-cell-"
						+ trial.targets[i][0] + '-'
						+ trial.targets[i][1]).html(trial.target_symbol);;
				};

				if (trial.training) {
					display_element.innerHTML += '<div id="jspsych-html-button-response-btngroup">';
					display_element.innerHTML += '<div class="jspsych-html-button-response-button" style="display: inline-block; margin:Opx 8px" id="jspsych-html-button-response-button-0" data-choice="0"><button class="jspsych-btn">Next</button></div></div>';
				}

				// wait show_duration ms before turning to next trial
				if (!trial.training) {
					jsPsych.pluginAPI.setTimeout(function () {
						jsPsych.finishTrial(trial_data);
					}, trial.show_duration);
				}

				if (trial.training) {
					display_element.querySelector('#jspsych-html-button-response-button-0').addEventListener('click', function (e) {
						jsPsych.finishTrial(trial_data);
					});
				}
			}
		};

	}
	DataGridPlugin.info = info;
	return DataGridPlugin;
})(jsPsychModule);
