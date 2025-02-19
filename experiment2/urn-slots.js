function rescale_canvas(canvas) {
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	// console.log("RESCALING", width, height);
	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
	}
}
function cross(a, b, o) {
	// Cross product of OA, OB vectors. Can be used to check if 3 points make a clockwise or counter-clockwise turn
	return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function mod(n, m) {
	//Javascript is weird for modulo with negative numbers.
	//This makes (-4) % 5 = 1 
	return ((n % m) + m) % m;
}

function MontoneChain(points) {
	// See https://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain
	points.sort((a, b) => a.x == b.x ? a.y - b.y : a.x - b.x); //Sort by x values breaking ties with ys
	let U = [];
	let L = [];

	for (let i = 0; i < points.length; i++) {
		while (L.length >= 2 && cross(L[L.length - 2], L[L.length - 1], points[i]) <= 0) {
			L.pop();
		}
		L.push(points[i]);
	}

	for (let i = points.length - 1; i >= 0; i--) {
		while (U.length >= 2 && cross(U[U.length - 2], U[U.length - 1], points[i]) <= 0) {
			U.pop();
		}
		U.push(points[i]);
	}

	U.pop();
	L.pop();
	L = L.concat(U);
	let hull = [];
	for (let i = 0; i < L.length; i++) {
		const p = L[i];
		const next_p = L[mod(i + 1, L.length)];
		const prev_p = L[mod(i - 1, L.length)];
		const collinear = (p.x - prev_p.x) * (next_p.y - p.y) - (p.y - prev_p.y) * (next_p.x - p.x);
		if (!(-0.00001 < collinear && collinear < 0.00001)) {
			hull.push(p);
		}
	}
	return hull
}

function UpdateUrnsPos(canvas, ctx, trial) {
	const urns = trial.urns;
	const groups = trial.groups;
	const autoPlace = (urns[0].coords == null)
	let group_coords = groups.map(() => []);

	for (let i = 0; i < urns.length; i++) {
		if ((autoPlace && urns[i].coords != null) || (!autoPlace && urns[i].coords == null)) {
			console.error("All urns must have predetermined coords, or else none do.")
		}
		urns[i].width = (urns[i].width / 100) * canvas.width;
		urns[i].ball_circum = urns[i].width / (urns[i].ball_per_row + (urns[i].ball_per_row + 1) * urns[i].ball_spacing);
		const n_rows = Math.ceil(urns[i].n_balls / urns[i].ball_per_row);
		urns[i].height = n_rows * urns[i].ball_circum + (n_rows + 1) * (urns[i].ball_spacing * urns[i].ball_circum);
		if (autoPlace) {
			// Place urns in a regular polygon shape based on the circle.
			// Ensure no urn is rendered off-screen
			const length = Math.sqrt(((urns[i].width + urns[i].ball_circum * 3) / 2) ** 2 + ((urns[i].height + urns[i].ball_circum + 5) / 2) ** 2);
			const r = trial.r * (0.5 * Math.min(canvas.width, canvas.height) - length);
			urns[i].coords = [
				r * Math.cos(trial.theta + 2 * Math.PI * i / urns.length) + canvas.width / 2 - (urns[i].width + urns[i].ball_circum * 3) / 2,
				r * Math.sin(trial.theta + 2 * Math.PI * i / urns.length) + canvas.height / 2 - urns[i].height / 2,
			]
		} else {
			//Update coords to be relative to the width of the canvas
			urns[i].coords = [(urns[i].coords[0] / 100) * canvas.width,
			(urns[i].coords[1] / 100) * canvas.width];
		}
		for (let j = 0; j < groups.length; j++) {
			const members_id = groups[j].members_id;
			for (let k = 0; k < members_id.length; k++) {
				//O(n^3) but n is so small that who cares!
				if (urns[i].id == members_id[k]) {
					//Add the bounding box for each!
					const x = urns[i].coords[0];
					const y = urns[i].coords[1];
					const offset = groups[j].offset;
					group_coords[j].push({ x: x - offset, y: y - offset });
					group_coords[j].push({ x: x + urns[i].width + offset + urns[i].ball_circum * 3, y: y + urns[i].height + offset });
					group_coords[j].push({ x: x - offset, y: y + urns[i].height + offset });
					group_coords[j].push({ x: x + urns[i].width + offset + urns[i].ball_circum * 3, y: y - offset });

					const big_ball = urns[i].ball_circum * 1.5;
					const text_pos = [urns[i].coords[0] + (urns[i].width + big_ball * 2) / 2, urns[i].coords[1] - big_ball]

					group_coords[j].push({ x: text_pos[0], y: text_pos[1] });
				}
			}
		}
	}

	// const ctx = canvas.getContext('2d');

	for (let i = 0; i < groups.length; i++) {
		const hull = MontoneChain(group_coords[i]);
		const K = groups[i].K;
		ctx.beginPath();
		ctx.strokeStyle = groups[i].color;
		ctx.lineWidth = groups[i].width;
		// see http://www.elvenprogrammer.org/projects/bezier/reference/index.html
		for (let i = 0; i < hull.length; i++) {
			const next_next_i = mod(i + 2, hull.length);
			const next_i = mod(i + 1, hull.length);
			const prev_i = mod(i - 1, hull.length);
			const c1 = {
				x: (hull[i].x + hull[prev_i].x) / 2,
				y: (hull[i].y + hull[prev_i].y) / 2
			}
			const c2 = {
				x: (hull[i].x + hull[next_i].x) / 2,
				y: (hull[i].y + hull[next_i].y) / 2
			}
			const c3 = {
				x: (hull[next_next_i].x + hull[next_i].x) / 2,
				y: (hull[next_next_i].y + hull[next_i].y) / 2
			}

			const len1 = Math.sqrt((hull[i].x - hull[prev_i].x) ** 2 + (hull[i].y - hull[prev_i].y) ** 2);
			const len2 = Math.sqrt((hull[next_i].x - hull[i].x) ** 2 + (hull[next_i].y - hull[i].y) ** 2);
			const len3 = Math.sqrt((hull[next_next_i].x - hull[next_i].x) ** 2 + (hull[next_next_i].y - hull[next_i].y) ** 2);

			const k1 = len1 / (len1 + len2);
			const k2 = len2 / (len2 + len3);

			const m1 = {
				x: c1.x + (c2.x - c1.x) * k1,
				y: c1.y + (c2.y - c1.y) * k1
			};

			const m2 = {
				x: c2.x + (c3.x - c2.x) * k2,
				y: c2.y + (c3.y - c2.y) * k2
			};

			ctx.moveTo(hull[i].x, hull[i].y);
			ctx.bezierCurveTo(
				m1.x + (c2.x - m1.x) * K + hull[i].x - m1.x,
				m1.y + (c2.y - m1.y) * K + hull[i].y - m1.y,
				m2.x + (c2.x - m2.x) * K + hull[next_i].x - m2.x,
				m2.y + (c2.y - m2.y) * K + hull[next_i].y - m2.y,
				hull[next_i].x, hull[next_i].y);
		}
		ctx.stroke();
		ctx.closePath();
	}
	return urns;
}

function listConjoin(items){
	if (items.length>1){
		let conjunction = '';
		for (let i = 0 ; i<items.length-1;i++ ){
			conjunction += items[i] + " and ";
		}
		conjunction += items[items.length-1];
		return conjunction;
	}else{
		return items;
	}
}

var jsUrnSlots = (function (jspsych) {
	"use strict";

	const info = {
		name: "Urn-Selection",
		parameters: {
///////////////////////////////////////////////////////////////////////////
			// GRID PARAMETERS
			///////////////////////////////////////////////////////////////////////////
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
				default: "grey",
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
			},
			pre_sample: {
				type: jspsych.ParameterType.BOOL,
				default: false,
			},

			/////////////////////////
			// URN PARAMETERS
			/////////////////////////
			urns: {
				type: jspsych.ParameterType.COMPLEX,
				array: true,
				pretty_name: "Urns",
				default: undefined,
				nested: {
					/** Total number of balls */
					n_balls: {
						type: jspsych.ParameterType.int,
						pretty_name: "Total number of balls",
						default: 20,
					},
					/** Number of coloured balls */
					n_colored_balls: {
						type: jspsych.ParameterType.INT,
						pretty_name: "Number of coloured balls",
						default: 10,
					},
					/** Number of balls in each row*/
					ball_per_row: {
						type: jspsych.ParameterType.INT,
						pretty_name: "Balls per row",
						default: 5,
					},
					/** Whether to shuffle the balls in the urn or have them in an ordered row */
					shuffle_balls: {
						type: jspsych.ParameterType.BOOL,
						pretty_name: "Shuffle the balls",
						default: true,
					},
					/**  Ball colour **/
					ball_color: {
						type: jspsych.ParameterType.STRING,
						pretty_name: "Number of coloured balls",
						default: "#3498db",
					},
					/** Background ball colour (e.g. failure balls)*/
					background_ball_color: {
						type: jspsych.ParameterType.STRING,
						pretty_name: "Background ball colour",
						default: "#FFFFFF",
					},

					/** Ball border colour */
					ball_border_color: {
						type: jspsych.ParameterType.STRING,
						pretty_name: "Ball border colour",
						default: "#7D6608",
					},

					/** Urn background colour */
					background_color: {
						type: jspsych.ParameterType.STRING,
						pretty_name: "Urn background colour",
						default: "#FFFDE7",
					},
					/** Urn border colour */
					border_color: {
						type: jspsych.ParameterType.STRING,
						pretty_name: "Urn border colour",
						default: "#7D6608",
					},
					/** Is the ball drawn a coloured ball?*/
					is_result_color: {
						type: jspsych.ParameterType.BOOL,
						pretty_name: "Drawn ball is coloured",
						default: true,
					},
					/** Coordinates of the urn body (where 100=the width of the canvas) */
					coords: {
						type: jspsych.ParameterType.INT,
						pretty_name: "Urn coordinates",
						array: true,
						default: null
					},
					stroke_width: {
						type: jspsych.ParameterType.INT,
						pretty_name: "Stroke width for group",
						default: 1,
					},

					/** Width of the urn (where 100=the width of the canvas) */
					width: {
						type: jspsych.ParameterType.INT,
						pretty_name: "Urn width",
						default: 23,
					},

					/** What is the name/ID of the urn for data purposes */
					id: {
						type: jspsych.ParameterType.STRING,
						pretty_name: "Urn ID",
						default: '',

					},

					/** How much spacing between balls proportional to ball width */
					ball_spacing: {
						type: jspsych.ParameterType.FLOAT,
						pretty_name: "Spacing between balls",
						default: 0.25,
					},
				},
			},
			urn_colours:{
				type: jspsych.ParameterType.COMPLEX,
				pretty_name: "Urn colours ",
				default: null,
			},

			preselected: {
				type: jspsych.ParameterType.BOOL,
				pretty_name: "Urns preselected",
				default: null,
			},


			/** Angle (in radians) of offset of the first urn drawn automatically 
			 *
			 * */
			theta: {
				type: jspsych.ParameterType.FLOAT,
				pretty_name: "Theta (angle offset)",
				default: 0,
			},

			/** Radius of the urn circle where 1 is a reasonable default value
			 *
			 * */
			r: {
				type: jspsych.ParameterType.FLOAT,
				pretty_name: "Radius of urn circle",
				default: 1,
			},

			/** (width % of viewport, height% of viewport) of canvas in array of length 2 */
			canvas_size: {
				type: jspsych.ParameterType.INT,
				array: true,
				pretty_name: "Canvas size",
				default: [75, 75],
			},

			/** List of groups of arrays */
			groups: {
				type: jspsych.ParameterType.COMPLEX,
				array: true,
				pretty_name: "Groups",
				default: [],
				nested: {
					/** List of members (urn id) of groups */
					members_id: {
						type: jspsych.ParameterType.STRING,
						pretty_name: "Group members' ID",
						array: true,
						default: "",
					},
					/** How thick is the stroke's width */
					width: {
						type: jspsych.ParameterType.INT,
						pretty_name: "Stroke width for group",
						default: 5,
					},
					/** What colour is the group's stroke */
					color: {
						type: jspsych.ParameterType.STRING,
						pretty_name: "Colour of group",
						default: "#000000",
					},

					/** How far from the edges of the urn is the stroke */
					offset: {
						type: jspsych.ParameterType.INT,
						pretty_name: "Group line offset",
						default: 10,
					},

					/** Degree of smoothing for the group, good value is between 0.1 and 1, \
					 * but can be any positive real number */
					K: {
						type: jspsych.ParameterType.FLOAT,
						pretty_name: "Smoothing factor (k)",
						default: 0.75,
					}
				}
			},

			seed: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Randomness seed",
				default: null,
			}
		},
	};

	/**
	* **Urn Slots**
	*
	* Simple plugin to display urns filled with coloured balls which represent priors. 
	*
	* @author Nicolas Navarre
	* 
	*/
	class UrnSlotsPlugin {
		constructor(jsPsych) {
			this.jsPsych = jsPsych;
		}



		trial(display_element, trial) {

			///////////////////////////////////////////////////////////////////////////
			// GRID FUNCTIONS
			///////////////////////////////////////////////////////////////////////////

			/**
			 * Execute the main trial.
			 * Checks if the trial is an observation or instruction trial.
			*/
			function main() {

				deleteScreen();

				let gridDiv = null;
				if (trial.previous_responses) {
					gridDiv = showTestResults();
				} else if (trial.instruction_trial) {
					gridDiv = showInstructionData();
				} else if (trial.test_targets.length > 0) {
					gridDiv = showTestData();
				} else {
					gridDiv = showObservationData();
				}
				// setTimeout(() => display_element.appendChild(gridDiv), 500);
				// display_element.appendChild(gridDiv);
				display_element.insertBefore(gridDiv, display_element.firstChild);
				grid_drawn = true;

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
				if (style==null && class_name == null){
					return `<${type}>` + input + `</${type}>`;
				} else if (class_name == null) {
					return `<${type} style="${style}">` + input + `</${type}>`;
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
				if (grid_drawn) {
					display_element.removeChild(display_element.firstChild);
					grid_drawn = false;
				}
				// while (display_element.firstChild) {
				// display_element.innerHTML = "";
				// 	console.log(display_element.lastChild);
				// display_element.removeChild(display_element.lastChild);
				// }
				// display_element.innerHTML = "";
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

			function drawHeader() {
	 	 		let nameDict = {1:'A',2:'B',3:'C',4:'D'};
				let idHeader = `jspsych-data-grid-cell`;
				let classHeader = `jspsych-data-grid-cell`;
				let header = "<div class='jspsych-data-grid-row' style='display:table-row;'>";
				let nrows = trial.pre_sample? trial.grid[1]-1 :(trial.grid[1]);
				for (let j = 1; j<= nrows ;j++){
					header += "<div class=\"" + classHeader + "\" id=\"" + idHeader + 0 + "-" + j + "\" data-row=\"" + 0 + "\" data-column=\"" + j + "\" style=\"width:" + trial.grid_square_size + "px; color:" + "black" + "; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";
					header += "\">"; 
					if (j==trial.grid[1]){
						header += "";
					}else{
						header += nameDict[j];
					}
					header += "</div>";
				}
				header +="</div>";
				return header;
			};

			/**
			 * Draws a row of the defined grid. 
			 * Used as a helper function for the standalone grids in drawObservation and drawGrid.
			 * @param {int} row_number
			 * @param {boolean} test_trial 
			 * @param {boolean} judgment_flag 
			 * @returns 
			 */
			function drawGridRow(row_number, test_trial) {
				let row_kind = test_trial ? 'test' : 'data';
				var row = "<div class='jspsych-data-grid-row' style='display:table-row;'>";
				let nrows = trial.grid[1];
				if(trial.pre_sample){
					nrows = trial.grid[1]-1;
				}
				for (let j = 1; j <= nrows; j++) {

					let idName = `jspsych-${row_kind}-grid-cell`;
					let className = '';
					let background_color = '';
					let ball_colour = `color : ${trial.urns[0].background_ball_color};`;
					let symbol = trial.target_symbol;
					if (j == trial.grid[1]) {
						background_color = "background-color: " + trial.no_outcome_colour + ";";
						className = `jspsych-${row_kind}-grid-outcome`;
					} else {
						className = `jspsych-${row_kind}-grid-cell`;
					}
					row += "<div class=\"" + className + "\" id=\"" + idName + row_number + "-" + j + "\" data-row=\"" + row_number + "\" data-column=\"" + j + "\" style=\"width:" + trial.grid_square_size + "px; color:" + trial.cause_colour + "; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";


					// Colour the target cells with orange balls (instead of blue)
					// Colour the outcome trials
					if (checkArray((test_trial) ? trial.test_targets : trial.targets, [row_number, j])) {
						if (j != trial.grid[1]) {
							ball_colour = "color: " + trial.urn_colours[j] + ";";
							// ball_colour = "color: " + 'orange' + ";";
						} else {
							background_color = "background-color: " + trial.outcome_colour + ";";
						}
					}
					if (test_trial) {
						background_color = '';
					}
					row += background_color + ball_colour;

					// Causal judgements
					if (checkArray(trial.judgements, [row_number, j]) && !test_trial && trial.judgements != null) {
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
			 * @param {int} row_number 
			 * @param {boolean} test_trial 
			 * @param {boolean} judgment_flag 
			 * @returns 
			 */
			function drawFeedbackRow(row_number) {
				let row_kind = 'data';
				let test_trial = true;
				let idName = `jspsych-${row_kind}-grid-cell`;
				var row = "<div class='jspsych-data-grid-row' style='display:table-row;'>";
				for (let j = 1; j <= trial.grid[1]; j++) {

					let className = '';
					let background_color = '';
					let ball_colour = `color : ${trial.urns[0].background_ball_color};`;
					let symbol = trial.target_symbol;
					if (j == trial.grid[1]) {
						background_color = "background-color: " + trial.no_outcome_colour + ";";
						className = `jspsych-${row_kind}-grid-outcome`;
					} else {
						className = `jspsych-${row_kind}-grid-cell`;
					}
					row += "<div class=\"" + className + "\" id=\"" + idName + row_number + "-" + j + "\" data-row=\"" + row_number + "\" data-column=\"" + j + "\" style=\"width:" + trial.grid_square_size + "px; color:" + trial.cause_colour + "; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";


					// Colour the target cells with orange balls (instead of blue)
					// Colour the outcome trials
					if (checkArray((test_trial) ? trial.test_targets : trial.targets, [row_number, j])) {
						if (j != trial.grid[1]) {
							// ball_colour = "color: " + 'orange' + ";";
							ball_colour = "color: " + trial.urn_colours[j] + ";";
						}
					}

					if (j == trial.grid[1]) {
						let prev_bg = (trial.previous_responses[row_number - 1]) ? trial.outcome_colour : trial.no_outcome_colour;
						background_color = "background-color: " + prev_bg + ";";
						// background_color = "background-color: " + trial.outcome_colour + ";";
					}

					row += background_color + ball_colour;

					// Causal judgements
					if (checkArray(trial.judgements, [row_number, j]) && !test_trial && trial.judgements != null) {
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
				row += "<div class=\"" + "jspsych-data-grid-feedback" + "\" id=\"" + idName + row_number + "-" + j + "\" data-row=\"" + row_number + "\" data-column=\"" + trial.grid[1] + 1 + "\" style=\"width:" + trial.grid_square_size + "px; height:" + trial.grid_square_size + "px; display:table-cell; vertical-align:middle; text-align: center; cursor: pointer;";
				let resp = (trial.test_correct[row_number - 1] == trial.previous_responses[row_number - 1]) ? quickHTML(trial.feedback_correct_symbol,'span',null,`color:green`) : quickHTML(trial.feedback_wrong_symbol,'span',null,`color:red`);
				row += "\">" + resp + "</div>";
				row += "</div>";
				return row;
			};

			/**
			 * 
			 * @returns HTML grid of the feedback on the previously answered responses
			 */
			function drawFeedbackGrid() {
				let border = "border-top: 2px solid black; border-bottom: 2px solid black; border-left: 2px solid black; border-right: solid black;";
				let theGrid = `<div id='jspsych-serial-reaction-time-stimulus' style='margin:auto; display: table; table-layout: fixed; border-spacing: 5px 5px;${border}'>`;
				for (let i = 1; i <= trial.grid[0]; i++) {
					theGrid += drawFeedbackRow(i);
				}
				theGrid += "</div>";
				return theGrid;
			}

			/**
			 * Draws a complete grid up to the current sample of observations
			 * @param {boolean} test_trial 
			 * @returns 
			 */
			function drawGrid(current_row, test_trial) {
				let border = '';
				if (!test_trial) {
					border = "border-top: 2px solid black; border-bottom: 2px solid black; border-left: 2px solid black; border-right: solid black;";
				}
				let theGrid = `<div id='jspsych-serial-reaction-time-stimulus' style='margin:auto; display: table; table-layout: fixed; border-spacing: 5px 5px;${border}'>`;
				theGrid += drawHeader();
				for (let i = 1; i <= current_row; i++) {
					theGrid += drawGridRow(i, test_trial);
				}
				theGrid += "</div>";

				return theGrid;
			}


			/**
			 * Displays the instrictions up to the current sample as well as the desired prompt index.
			 * When the current sample is at the maximum value
			 * the button will allow for the trial to end.
			 */
			function showInstructionData() {

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
					customText = (!(total_observations - current_sample)==0)? (quickHTML("Push the button below to draw a new sample!", 'div')): "";
				} else {
					customText = quickHTML(trial.custom_prompt[current_sample], "div");
				}
				if (trial.sample_trial) {
					customText += quickHTML("<b>Remaining samples: </b>" + (total_observations - current_sample), 'div', "jspsych-data-gid-prompt");
				}

				// if (current_sample == total_observations) {
				// 	instructionDiv.innerHTML += quickHTML("All observations", "h2") + gridhtml + quickHTML("Click below to preceed to the trial.","div");
				// } else {
				// 	instructionDiv.innerHTML += prompt + gridhtml + customText;
				// }
				instructionDiv.innerHTML += prompt + gridhtml + customText;


				// Button for sampling
				let btn = document.createElement("button");
				btn.className = "jspsych-btn";
				btn.style = 'margin-left: 5px;';

				if (current_sample == total_observations ) {
					btn.id = "end-trial-button";
					btn.textContent = "Start trial";
					btn.addEventListener("click", () => {
						endTrial();
					});
				}else if (!trial.sample_trial) {
					btn.id = "next-prompt-button";
					btn.textContent = "Next"
					btn.addEventListener("click", () => {
						current_sample++;
						main();
					});
				} 
				else {
					btn.textContent = "Draw sample"
					btn.id = "next-sample-button";
					btn.addEventListener("click", () => {
						current_sample++;
						main();
					});
				}
				instructionDiv.appendChild(btn);
				return instructionDiv;
			}

			/**
			 * Displays the observation grid up to the current sample
			 * When the current sample is at the maximum value
			 * the button will allow for the trial to end.
			 * 
			 */
			function showObservationData() {

				let contentDiv = document.createElement("div");

				// index the prompt you want by the current sample
				let prompt = '';
				if (Array.isArray(trial.prompt)) {
					prompt += quickHTML(trial.prompt[current_sample], 'div', "jspsych-data-grid-prompt");
				} else if (typeof trial.prompt === "string") {
					prompt += quickHTML(trial.prompt, 'div', "jspsych-data-grid-prompt");
				}

				let gridhtml = '';
				let judgement_text = '';
				if (current_sample > 0) {
					gridhtml = drawGrid(current_sample, false);
					if(trial.judgements.length>0){
						let cause_balls = [];
						let won_lost = (checkArray(trial.targets,[ current_sample  , trial.grid[1] ]))? true : false;
						for (let i=1;i<trial.grid[1];i++){
							if (checkArray(trial.judgements, [current_sample,i])){
								cause_balls.push(i);
							}
						} 
						judgement_text = quickHTML(`<br>Here, you <b><span style=color:${won_lost?'green':'red'}>${won_lost?"won":"lost"}</span> because</b> you drew ${(cause_balls.length>1)? "": "a"} ${(won_lost)? 'colored' :'gray'} ${(cause_balls.length>1)? "balls from urns": "ball from urn"} <b>${listConjoin(cause_balls.map((ball) => ({1:'A',2:'B',3:'C',4:'D'})[ball]))}!</b>`, "div",'','color;');
					}
				}
				
				
				

				let customText = 
				judgement_text +
				// (!(total_observations - current_sample)==0)? (quickHTML("Push the button below to draw a new sample!", 'div')): quickHTML("","div")+
				// quickHTML("Push the button below to draw a new sample!", 'div')+
				quickHTML("<br>Remaining samples: " + (total_observations - current_sample)+"<br></br>", 'div', "jspsych-data-gid-prompt");


				// if (current_sample == total_observations) {
				// 	contentDiv.innerHTML += quickHTML("All observations", "h2") + gridhtml + quickHTML("Click below to preceed to the trial.","div");
				// } else {
				// 	contentDiv.innerHTML += prompt + gridhtml + customText;
				// }
				contentDiv.innerHTML += prompt + gridhtml + customText;

				// Button for proceeding
				let btn = document.createElement("button");
				btn.className = "jspsych-btn";
				btn.style = 'margin-left: 5px;';
				if (current_sample == total_observations) {
					btn.textContent = "Go to test!"
					btn.id = "end-trial-button";
					btn.addEventListener("click", () => {
						endTrial();
					});
				} else {
					btn.textContent = "Draw sample"
					btn.id = "next-sample-button";
					btn.addEventListener("click", () => {
						current_sample++;
						main();
					});
				}
				// else if(is_sampled) {
				// 	btn.textContent = "Save sample"
				// 	btn.id = "save-sample-button";
				// 	if (is_sampled) {
				// 		btn.addEventListener("click", () => {
				// 			current_sample++;
				// 			main();
				// 		});
				// 	}
				// } 

				contentDiv.appendChild(btn);

				return contentDiv;



			}

			/**
			 * Feedback to the test responses from the previous trial
			 */
			function showTestResults() {

				// Main Grid Content
				let resultDiv = document.createElement("div");

				let gridhtml = trial.prompt + drawFeedbackGrid() + trial.custom_prompt;

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

				let testDiv = document.createElement("div");

				// show prompt if there is one
				if (trial.prompt.length > 0) {
					testDiv.innerHTML += quickHTML(trial.prompt, 'div', "jspsych-data-grid-prompt");
				}

				let test_column = quickHTML(quickHTML("<b>Predict the following outcomes: </b>", "div") + quickHTML(drawGrid(trial.test_grid[0], true), "div", "", "overflow:scroll; height:" + trial.grid_square_size * (3 + trial.grid[0]) + "px;"), "div", "column column-left");
				let observation_column = quickHTML(quickHTML("<b>Observation history:</b>", "div") + drawGrid(trial.grid[0], false), "div", "column column-left");
				let data_columns = quickHTML(test_column + observation_column, "div", "row");


				testDiv.innerHTML += data_columns;

				/////////////////////////////

				let btn_save = document.createElement("button");
				btn_save.className = "jspsych-btn";
				btn_save.style = "margin-left: 5px;";
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
						let selectAll = document.createElement("div");
						selectAll.innerHTML = quickHTML("Please select all outcome predictions before proceeding!","h2");

						
						display_element.insertBefore(selectAll, display_element.firstChild);
						document.getElementById("jspsych-urn-selection").hidden=true;
						

						setTimeout(() => {
							display_element.removeChild(display_element.firstChild);
							document.getElementById("jspsych-urn-selection").hidden=false;
							main();
						}, 2000);
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
						

						if(!e.currentTarget.style.backgroundColor){
							e.currentTarget.style.backgroundColor = trial.outcome_colour;
						}
						else if (e.currentTarget.style.backgroundColor== trial.outcome_colour){
							e.currentTarget.style.backgroundColor = trial.no_outcome_colour;
						}else {
							e.currentTarget.style.backgroundColor = null;
						}
					});
				};
				testDiv.appendChild(btn_save);
				return testDiv;
			}



			const endTrial = (test_responses) => {
				display_element.innerHTML = "";
                let response_time = Math.round(performance.now() - start_time);
				var trial_data = {
					// grid: trial.grid,
					// targets: trial.targets,
					// test_grid: trial.test_grid,
					// test_targets: trial.test_targets,
					// prompt: trial.prompt,
					// custom_prompt: trial.custom_prompt,
					// ball_colours: trial.ball_colours,
					// sample_trial: trial.sample_trial, 
                    rt: response_time,
					response: (test_responses != null) ? test_responses.map((e) => ({ "green": 1, "red": 0 })[e]) : null //turn colours into os and ones
				};
				this.jsPsych.finishTrial(trial_data);
			};



			///////////////////////////////////////////////////////////////////////////
			// URN FUNCTIONS
			///////////////////////////////////////////////////////////////////////////



			function drawUrnAt(ctx, urn) {
				//Draw background container
				const big_ball = urn.ball_circum * 1.5;
				urn.drawUrn = () => {

					// ctx.beginPath();
					// ctx.fillStyle = '#C0C0C0';
					// ctx.strokeStyle = '#696969';
					// ctx.lineWidth = urn.stroke_width;
					// ctx.rect(urn.coords[0]+urn.width, urn.coords[1], big_ball * 2, urn.height);
					// ctx.fill();
					// ctx.stroke();

					// ctx.beginPath();
					// ctx.fillStyle = '#909090';
					// ctx.rect(urn.coords[0]+urn.width + big_ball / 2, urn.coords[1]+urn.height-big_ball*1.5, big_ball, big_ball);
					// ctx.fill();
					// ctx.stroke();
					
					
					ctx.beginPath();
					ctx.fillStyle = urn.background_color;
					ctx.strokeStyle = urn.border_color;
					ctx.lineWidth = urn.stroke_width;
					ctx.rect(urn.coords[0], urn.coords[1], urn.width, urn.height);
					ctx.fill();
					ctx.stroke();
					
					
					
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';


					ctx.font = `${parseInt(urn.ball_circum)}px serif`;
					ctx.fillStyle = 'black';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'bottom';
					ctx.fillText(urn.id, urn.coords[0] + (urn.width  ) / 2, urn.coords[1] - 5);
					// ctx.fillText(urn.id, urn.coords[0] , urn.coords[1] + 50 );

				}
				urn.drawUrn();


				urn.balls = Array(urn.n_balls).fill(urn.background_ball_color)
				urn.balls = urn.balls.fill(urn.ball_color, 0, urn.n_colored_balls)
				urn.ball_order = Array.from(Array(urn.balls.length).keys())
				urn.chosen_ball = urn.is_result_color ? 0 : urn.n_colored_balls
				if (urn.shuffle_balls) {
					urn.ball_order = jsPsych.randomization.shuffle(urn.ball_order);
				}
				urn.drawBalls = () => {
					ctx.strokeStyle = urn.ball_border_color;
					ctx.lineWidth = urn.stroke_width;

					let i = 0;
					let ball_idx = 0;
					while (ball_idx < urn.balls.length) {
						const ball_y = urn.coords[1] + i * urn.ball_circum;
						const vertical_spacing = (i + 1) * urn.ball_circum * urn.ball_spacing
						for (let j = 0; j < urn.ball_per_row; j++) {
							if (ball_idx >= urn.n_balls) {
								break;
							}
							if (urn.selected && urn.ball_order[ball_idx] == urn.chosen_ball) {
								ctx.beginPath();
								ctx.fillStyle = urn.balls[urn.ball_order[ball_idx]]
								ctx.arc(urn.coords[0] + 0.27 * urn.width + big_ball, urn.coords[1] + 1.4 * urn.height + big_ball * 0.5 - 2 * urn.ball_circum, urn.ball_circum / 2, 0, 2 * Math.PI, false);
								ctx.fill();
								ctx.stroke();
								ball_idx++;
								continue;
							}
							const horizontal_spacing = (j + 1) * urn.ball_circum * urn.ball_spacing
							const ball_x = urn.coords[0] + j * urn.ball_circum;
							ctx.beginPath();
							ctx.fillStyle = urn.balls[urn.ball_order[ball_idx]]
							ctx.arc(ball_x + urn.ball_circum / 2 + horizontal_spacing, ball_y + urn.ball_circum / 2 + vertical_spacing, urn.ball_circum / 2, 0, 2 * Math.PI, false);
							ctx.fill();
							ctx.stroke();
							ball_idx++;
						}
						i++;
					}
				}
				urn.drawBalls();

				return urn;
			}
			function makeUrns() {

				//Style adapted from plugin-survey-likert in jsPsycj
				let html = '<style id="jspsych-survey-likert-css">';
				html +=
					".jspsych-survey-likert-statement { display:block; font-size: 20px; margin-bottom:5px; margin: auto; inline-size: 600px; }" +
					".jspsych-survey-likert-opts { list-style:none; width: 100%" +
					"; margin:auto; padding:0 0 35px; display:block; font-size: 14px; line-height:1.1em; }" +
					".jspsych-survey-likert-opt-label { line-height: 1.1em; color: #444; }" +
					".jspsych-survey-likert-opts:before { content: ''; position:relative; top:11px; /*left:9.5%;*/ display:block; background-color:#efefef; height:4px; width:100%; }" +
					".jspsych-survey-likert-opts:last-of-type { border-bottom: 0; }" +
					".jspsych-survey-likert-opts li { display:inline-block; /*width:19%;*/ text-align:center; vertical-align: top; }" +
					".jspsych-survey-likert-opts li input[type=radio] { display:block; position:relative; top:0; left:50%; margin-left:-6px; }" +
					`.jspsych-urn {height: ${trial.canvas_size[0]}vh; width:${trial.canvas_size[1]}vh;}`;
				html += "</style>";


				return html;
			}

			function showUrns() {

				if (trial.seed == null) {
					trial.seed = (Math.random() + 1).toString(36).substring(7);
				}
				// this.jsPsych.randomization.setSeed(trial.seed)
				let urns = trial.urns;


				for (let i = 0; i < urns.length; i++) {
					urns[i].selected = false;
					if (trial.preselected != null) {
						urns[i].selected = trial.preselected;
					}
					// if (is_sampled) {
					// 	urns[i].selected = true;
					// }
				}

				// html += '<div id="jspsych-urn-selection">' +
				// 	'<canvas id="jspsych-urn-canvas" class="jspsych-urn"></canvas>' +
				// 	"</div>";
				// html += `<div id='prompt' class="jspsych-survey-likert-statement"> ${trial.prompt(urns)} </div>`
				// html += '<button class="jspsych-btn" id="continue_button" disabled>Continue</button>';
				// display_element.innerHTML = html;
				// const canvas = document.getElementById("jspsych-urn-canvas");

				let urnSelection = document.createElement("div");
				urnSelection.id = "jspsych-urn-selection";
				urnSelection.innerHTML = makeUrns();

				let canvas = document.createElement("canvas");
				canvas.id = "jspsych-urn-canvas";
				canvas.className = "jspsych-urn";

				urnSelection.appendChild(canvas);
				display_element.appendChild(urnSelection);
				// display_element.innerHTML = urnSelection.innerHTML;


				rescale_canvas(canvas);

				var ctx = canvas.getContext("2d");

				urns = UpdateUrnsPos(canvas, ctx, trial);
				// console.log(urns);
				urns = urns.map((u) => drawUrnAt(ctx, u));
				
				
				if ( false ) {
					// console.log("hello");
					const buttonPath = new Path2D();
					let distance = 70;

					const leftmostUrn = urns[0];
					const urnX = leftmostUrn.coords[0];
					const urnY = leftmostUrn.coords[1];

					// Calculate the circle's center coordinates
					const circleX = urnX - distance;
					const circleY = urnY + leftmostUrn.height / 2;

					// Draw the circle
					buttonPath.arc(circleX, circleY, 35, 0, 2 * Math.PI);
					ctx.fillStyle = 'red';
					ctx.fill(buttonPath);

					ctx.fillStyle = '#FF0000';
					ctx.strokeStyle = '#696969';
					ctx.lineWidth = leftmostUrn.stroke_width * 4;
					//buttonPath.arc(50, 100, 50, 0, 2 * Math.PI);
					ctx.fillStyle = 'red';
					ctx.fill(buttonPath);
					ctx.stroke(buttonPath);

					// Write 'draw" on the button
					ctx.fillStyle = 'white';
					ctx.font = 'bold 20px sans serif';
					const text = 'Draw';
					const textWidth = ctx.measureText(text).width;
					const textHeight = parseInt(ctx.font, 10);

					ctx.textBaseline = 'middle';
					ctx.fillText('Draw', circleX, circleY);
					//ctx.font = `bold ${parseInt(big_ball/3)}px sans serif`;



					// Make red button sample
					canvas.addEventListener('click', (e) => {
						if (ctx.isPointInPath(buttonPath, e.offsetX, e.offsetY)) {
							// if (!is_sampled) {
							// 	canvas.style.cursor = 'default';
							// 	for (let i = 0; i < urns.length; i++) {
							// 		urns[i].drawUrn();
							// 		urns[i].drawBalls();
							// 	}
							// 	is_sampled = true;
							// }
							if (current_sample != total_observations) {
								current_sample++;
								main();
							}
						}

					});

					// Click pointer for the sample button
					canvas.addEventListener('mousemove', (e) => {
						let any_hover = false;
						for (let i = 0; i < urns.length; i++) {
							if (ctx.isPointInPath(buttonPath, e.offsetX, e.offsetY)) {
								any_hover = true;
							}
						}
						canvas.style.cursor = any_hover ? 'pointer' : 'default';
					});

				}

			}


			/// Execute trial
			if (! trial.instruction_trial) {
				var total_observations = trial.grid[0]  ;
			} else {
				var total_observations = trial.prompt.length - 1 ;
			}
			var test_outcomes = null;
			var start_time = performance.now();
			var is_sampled = false;
			var current_sample = trial.start_sample;
			var grid_drawn = false;

			// let counter = 0;
			// showUrns();
			// // counter = 1

			// showUrns();
			// setTimeout(() => {
			// 	deleteScreen();
			// }, 2000);
			// setTimeout(() => {
			// 	showUrns();
			// }, 5000);

			main();
			showUrns();

		}

	}
	UrnSlotsPlugin.info = info;
	return UrnSlotsPlugin;
})(jsPsychModule);
