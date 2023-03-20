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
			cause: {
				type: jspsych.ParameterType.INT,
				pretty_name: 'Grid',
				default: true,
				description: 'Dimensions of the array as [rows, columns] (does not include the header)'
			},
			grid: {
				type: jspsych.ParameterType.INT,
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
				default: '',
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
			/** The text that appears on the button to go draw the next sample. */
			button_label_draw: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Button label draw slots",
				default: "Draw slots",
			},
			samples: {
				type: jspsych.ParameterType.INT,
				pretty_name: "Number or samples allowed",
				default: 10,
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

			//////////////////
			// Grid Functions
			//////////////////
			function drawObservation(sample_number,n_samples) {
				var observation = "<div class='jspsych-data-grid-row' style='display:table-row;'>";
				for (var j = 1; j <= trial.grid[1]; j++) {
					var className = 'jspsych-data-grid-cell';
					observation += "<div class=\"" + className + "\" id=\"jspsych-data-grid-cell-" + sample_number + "-" + j + "\" data-row=\"" + sample_number + "\" data-column=\"" + j + "\" style=\"width:" + trial.grid_square_size + "px; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";
	
					// Colour the targets
					for (var k in trial.targets) {
						if (trial.targets[k][0] == sample_number && trial.targets[k][1] == j) {
							if (j != trial.grid[1]) {
								observation += "background-color: " + trial.target_colour + ";";
								break;
							}
							if (j == trial.grid[1]) {
								observation += "background-color: " + trial.outcome_colour + ";";
							} else {
								observation += "background-color: " + trial.no_outcome_colour + ";";
							}
						}
					}
	
					if (sample_number == n_samples) observation += "border-top: 3px solid black; border-bottom: 3px solid black;"
					else observation += "border-top: 3px solid black;"
					if (j == trial.grid[1]) observation += "border-left: 5px solid black; border-right: 3px solid black;"
					else observation += "border-left: 3px solid black;"
	
					observation += "\"></div>";
				}
				observation += "</div>";
				return observation
			};

			function drawGrid(n_samples) {
				var theGrid = "<div id='jspsych-serial-reaction-time-stimulus' style='margin:auto; display: table; table-layout: fixed; border-spacing:"+0+"px'>";
				for (var i = 1; i <= n_samples; i++) {
					theGrid += drawObservation(i,n_samples);
				}
				theGrid += "</div>";
	
				return theGrid;
			}

			function deleteScreen() {
				display_element.innerHTML = "";
			}

			function showGridData(theGrid) {
				// show prompt if there is one
				if (trial.prompt !== null) {
					display_element.innerHTML += "<div class=\"jspsych-data-grid-prompt\">" + trial.prompt + "</div>";
				}

				
				display_element.innerHTML += theGrid;

				display_element.innerHTML += "<div class='jspsych-data-gid-prompt'> <b>Remaining samples:</b> " + (10-current_sample) + " </div>"

				if (current_sample < 10){
					display_element.innerHTML += "<button id='next-draw-button' class='jspsych-btn'" +
					"style='margin-left: 5px;'>" +
					"Next sample"+
					"</button>";
				}else{
					display_element.innerHTML += "<button id='next-draw-button' class='jspsych-btn'" +
					"style='margin-left: 5px;'>" +
					"Go to test"+
					"</button>";
				}
				
				let btn = document.getElementById("next-draw-button")
				btn.addEventListener("click", ()=> {
					next();
				});
				
			}
			//////////////////
			// Trial Finctions
			//////////////////

	
			function next() {
				current_sample++;
				// if done, finish up...
				if (current_sample > trial.samples) {
					endTrial();
				}
				else {
					deleteScreen();
					showGridData(grids[current_sample-1]);
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
			var grids = [];
			var current_sample = 0;
			var start_time = performance.now();
			for (var sample = 0; sample< trial.samples;sample++){
				grids.push(drawGrid(sample+1));
			}
			next();


		};

	}
	DataGridPlugin.info = info;
	return DataGridPlugin;
})(jsPsychModule);
