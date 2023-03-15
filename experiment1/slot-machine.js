/**
 * Slot machine sampler for urn-style slot machines
 * Nicolas Navarre
 **/



function rescale_canvas(canvas){
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
	}
}

function cross(a, b, o){
	// Cross product of OA, OB vectors. Can be used to check if 3 points make a clockwise or counter-clockwise turn
	return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function mod(n, m) {
	//Javascript is weird for modulo with negative numbers.
	//This makes (-4) % 5 = 1 
	return ((n % m) + m) % m;
}

function MontoneChain(points){
	// See https://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain
	points.sort((a, b) => a.x == b.x ? a.y - b.y : a.x - b.x); //Sort by x values breaking ties with ys
	let U = [];
	let L = [];

	for (let i = 0; i < points.length; i++){
		while (L.length >= 2 && cross(L[L.length - 2], L[L.length - 1], points[i]) <= 0){
			L.pop();
		}
		L.push(points[i]);
	}

	for (let i = points.length - 1; i >= 0; i--){
		while (U.length >= 2 && cross(U[U.length -2], U[U.length -1], points[i]) <= 0){
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
		const next_p = L[mod(i+1, L.length)];
		const prev_p = L[mod(i-1, L.length)];
		const collinear = (p.x - prev_p.x)*(next_p.y - p.y) - (p.y - prev_p.y)*(next_p.x - p.x);
		if (!(-0.00001 < collinear && collinear < 0.00001)){
			hull.push(p);
		}
	}
	return hull
}

function UpdateUrnsPos(canvas, trial){
	const urns = trial.urns;
	const groups = trial.groups;
	const autoPlace = (urns[0].coords == null)
	let group_coords = groups.map(() => []);

	for (let i = 0; i < urns.length; i++){
		if ((autoPlace && urns[i].coords != null) || (!autoPlace && urns[i].coords == null)){
			console.error("All urns must have predetermined coords, or else none do.")
		}
		urns[i].width = (urns[i].width / 100) * canvas.width;
		urns[i].ball_circum = urns[i].width / (urns[i].ball_per_row + (urns[i].ball_per_row+1)*urns[i].ball_spacing);
		const n_rows = Math.ceil(urns[i].n_balls / urns[i].ball_per_row);
		urns[i].height = n_rows * urns[i].ball_circum + (n_rows+1)*(urns[i].ball_spacing*urns[i].ball_circum);
		if (autoPlace){
			// Place urns in a regular polygon shape based on the circle.
			// Ensure no urn is rendered off-screen
			const length = Math.sqrt(((urns[i].width + urns[i].ball_circum * 3) / 2)** 2 + ((urns[i].height + urns[i].ball_circum + 5)/2)** 2);
			const r = trial.r*(0.5*Math.min(canvas.width, canvas.height) - length);
			urns[i].coords = [ 
				r*Math.cos(trial.theta + 2 * Math.PI * i / urns.length) + canvas.width / 2 - (urns[i].width + urns[i].ball_circum * 3) / 2,
				r*Math.sin(trial.theta + 2 * Math.PI * i / urns.length) + canvas.height / 2 - urns[i].height / 2,
			]
		}else{
			//Update coords to be relative to the width of the canvas
			urns[i].coords = [(urns[i].coords[0]/100) * canvas.width,
					  (urns[i].coords[1]/100) * canvas.width];
		}
		for (let j = 0; j < groups.length; j++){
			const members_id = groups[j].members_id;
			for (let k = 0; k < members_id.length; k++){
				//O(n^3) but n is so small that who cares!
				if (urns[i].id == members_id[k]){
					//Add the bounding box for each!
					const x = urns[i].coords[0];
					const y = urns[i].coords[1];
					const offset = groups[j].offset;
					group_coords[j].push({x: x - offset, y: y - offset});
					group_coords[j].push({x: x + urns[i].width + offset + urns[i].ball_circum * 3, y: y + urns[i].height + offset});
					group_coords[j].push({x: x - offset, y: y + urns[i].height + offset});
					group_coords[j].push({x: x + urns[i].width + offset + urns[i].ball_circum * 3, y: y - offset});

					const big_ball = urns[i].ball_circum * 1.5;
					const text_pos = [urns[i].coords[0]+(urns[i].width+big_ball * 2)/2, urns[i].coords[1]-big_ball]

					group_coords[j].push({x: text_pos[0], y: text_pos[1]});
				}
			}
		}
	}

	const ctx = canvas.getContext('2d');

	for (let i = 0; i < groups.length; i++){
		const hull = MontoneChain(group_coords[i]);
		const K = groups[i].K;
		ctx.beginPath();
		ctx.strokeStyle = groups[i].color;
		ctx.lineWidth = groups[i].width;
		// see http://www.elvenprogrammer.org/projects/bezier/reference/index.html
		for (let i = 0; i < hull.length; i++){
			const next_next_i = mod(i+2, hull.length);
			const next_i = mod(i+1, hull.length);
			const prev_i = mod(i-1, hull.length);
			const c1 = {x: (hull[i].x + hull[prev_i].x) / 2,
				y: (hull[i].y + hull[prev_i].y) / 2}
			const c2 = {x: (hull[i].x + hull[next_i].x) / 2,
				y: (hull[i].y + hull[next_i].y) / 2}
			const c3 = {x: (hull[next_next_i].x + hull[next_i].x) / 2,
				y: (hull[next_next_i].y + hull[next_i].y) / 2}

			const len1 = Math.sqrt((hull[i].x - hull[prev_i].x) ** 2 + (hull[i].y - hull[prev_i].y) ** 2);
			const len2 = Math.sqrt((hull[next_i].x - hull[i].x) ** 2 + (hull[next_i].y - hull[i].y) ** 2);
			const len3 = Math.sqrt((hull[next_next_i].x - hull[next_i].x) ** 2 + (hull[next_next_i].y - hull[next_i].y) ** 2);

			const k1 = len1 / (len1 + len2);
			const k2 = len2 / (len2 + len3);
			
			const m1 = {x: c1.x + (c2.x - c1.x) * k1,
				y: c1.y + (c2.y - c1.y) * k1};

			const m2 = {x: c2.x + (c3.x - c2.x) * k2,
				y: c2.y + (c3.y - c2.y) * k2};

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


var jsUrnSelection = (function (jspsych) {
	"use strict";

	const info = {
		name: "Urn-Selection",
		parameters: {
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
			/** Function which looks at the currently chosen urns, and returns some string
			 *  (urns) => string
			 *
			 *  Set to null to disable.
			 * ***/
			scoring : {
				type: jspsych.ParameterType.FUNCTION,
				pretty_name: "Scoring function",
				default: (urns) => {
						let score = 0
						for (let i = 0; i < urns.length; i++) {
							score += (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0)
						}
						return `The score is ${score}`
					}
				},

			prompt: {
				type: jspsych.ParameterType.FUNCTION,
				pretty_name: "Prompt",
				default: (urns) => {
						return "<p> Click each urn to draw a ball </p>"
					}
				},

			/** Adds likert scale for questions.
			 * If used, it will disable drawing, and start with all balls pre-drawn
			 * Note: The actual question should be written in the prompt parameter */
			likert: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Likert scale labels",
				array: true,
				default: null,
			},

			seed: {
				type: jspsych.ParameterType.STRING,
				pretty_name: "Randomness seed",
				default: null,
			}
		},
	};

	/**
	* **Urn selection**
	*
	* Simple plugin to display urns filled with coloured balls which represent priors. 
	*
	* @author Michael Goodale
	* 
	*/
	class UrnSelectionPlugin {
		constructor(jsPsych) {
			this.jsPsych = jsPsych;
		}


		drawUrnAt(ctx, urn) {
			//Draw background container
			urn.path = new Path2D();
			const big_ball = urn.ball_circum * 1.5;
			urn.drawUrn = () => {

				ctx.beginPath();
				ctx.fillStyle = '#C0C0C0';
				ctx.strokeStyle = '#696969';
				ctx.lineWidth = urn.stroke_width;
				ctx.rect(urn.coords[0]+urn.width, urn.coords[1], big_ball * 2, urn.height);
				ctx.fill();
				ctx.stroke();

				ctx.beginPath();
				ctx.fillStyle = '#909090';
				ctx.rect(urn.coords[0]+urn.width + big_ball / 2, urn.coords[1]+urn.height-big_ball*1.5, big_ball, big_ball);
				ctx.fill();
				ctx.stroke();
				

				ctx.beginPath();
				ctx.fillStyle = urn.background_color;
				ctx.strokeStyle = urn.border_color;
				ctx.lineWidth = urn.stroke_width;
				ctx.rect(urn.coords[0], urn.coords[1], urn.width, urn.height);
				ctx.fill();
				ctx.stroke();
				

				ctx.fillStyle = '#FF0000';
				ctx.strokeStyle = '#696969';
				ctx.lineWidth = urn.stroke_width*4;
				urn.path.arc(urn.coords[0]+urn.width + big_ball, urn.coords[1]+big_ball, big_ball / 2, 0, 2 * Math.PI, false); 
				ctx.fill(urn.path);
				ctx.stroke(urn.path);

				ctx.font = `bold ${parseInt(big_ball/3)}px sans serif`;
				ctx.fillStyle = 'white';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText('Draw', urn.coords[0] + urn.width+big_ball, urn.coords[1]+big_ball);
				
				ctx.font = `${parseInt(urn.ball_circum)}px serif`;
				ctx.fillStyle = 'black';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText(urn.id, urn.coords[0]+(urn.width+big_ball * 2)/2, urn.coords[1]-5);
				
			}
			urn.drawUrn();


			urn.balls = Array(urn.n_balls).fill(urn.background_ball_color)
			urn.balls = urn.balls.fill(urn.ball_color, 0, urn.n_colored_balls)
			urn.ball_order = Array.from(Array(urn.balls.length).keys())
			urn.chosen_ball = urn.is_result_color ? 0 : urn.n_colored_balls 
			if (urn.shuffle_balls){
				urn.ball_order = this.jsPsych.randomization.shuffle(urn.ball_order);
			}
			urn.drawBalls = () => {
				ctx.strokeStyle = urn.ball_border_color;
				ctx.lineWidth = urn.stroke_width;

				let i = 0;
				let ball_idx = 0;
				while (ball_idx < urn.balls.length){
					const ball_y = urn.coords[1] + i*urn.ball_circum;
					const vertical_spacing = (i+1)*urn.ball_circum*urn.ball_spacing
					for (let j = 0; j < urn.ball_per_row; j++){
						if (ball_idx >= urn.n_balls){
							break;
						}
						if (urn.selected && urn.ball_order[ball_idx] == urn.chosen_ball){
							ctx.beginPath();
							ctx.fillStyle = urn.balls[urn.ball_order[ball_idx]]
							ctx.arc(urn.coords[0] + urn.width + big_ball, urn.coords[1] + urn.height + big_ball*0.5 - 2*urn.ball_circum, urn.ball_circum / 2, 0, 2 * Math.PI, false); // Change Ball coords
							ctx.fill();
							ctx.stroke();
							ball_idx++;
							continue;
						}
						const horizontal_spacing = (j+1)*urn.ball_circum*urn.ball_spacing
						const ball_x = urn.coords[0] + j*urn.ball_circum;
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

		trial(display_element, trial) {
			if (trial.seed == null){
				trial.seed = (Math.random() + 1).toString(36).substring(7);
			}
			this.jsPsych.randomization.setSeed(trial.seed)
			let urns = trial.urns
			const question_mode = (trial.likert != null);

			for (let i = 0; i < urns.length; i++){
				urns[i].selected = question_mode;
				if (trial.preselected != null){
					urns[i].selected = trial.preselected;
				}
			}



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

			if (trial.scoring != null) {
				html += `<div class="jspsych-survey-likert-statement" id='scorer'> ${trial.scoring(urns)}</div>`
			}

			html += '<div id="jspsych-urn-selection">' +
				'<canvas id="jspsych-urn-canvas" class="jspsych-urn"></canvas>'
				"</div>";


			if (question_mode){
				html += '<form id="jspsych-survey-likert-form" autocomplete="off">';
				html += `<div class="jspsych-survey-likert-statement" id='prompt'>${trial.prompt(urns)}</div>`;
				html += '<ul class="jspsych-survey-likert-opts">'
				for (let i = 0; i < trial.likert.length; i++){
					html += `<li style="width: ${100/trial.likert.length}%;">` +
						'<label class="jspsych-survey-likert-opt-label">' +
						`<input type="radio" name="Q" value=${i} required>` +
						trial.likert[i] +
						'</label></li>';
				}

				html += '</ul>';
				html += '<button class="jspsych-btn" id="continue_button" type=submit>Continue</button>';
				html += '</form>';
			}else{
				html += `<div id='prompt' class="jspsych-survey-likert-statement"> ${trial.prompt(urns)} </div>`
				html += '<button class="jspsych-btn" id="continue_button" disabled>Continue</button>';
			}
			display_element.innerHTML = html;


			const canvas = document.getElementById("jspsych-urn-canvas");
			rescale_canvas(canvas);
			const ctx = canvas.getContext("2d");

			urns = UpdateUrnsPos(canvas, trial);
			urns = urns.map(u => this.drawUrnAt(ctx, u))

			const updateScore = () => {
				let score = document.getElementById("scorer");
				score.innerHTML = trial.scoring(urns);
				let p = document.getElementById("prompt");
				p.innerHTML = trial.prompt(urns);
			};

			if (question_mode){
				updateScore();
			        display_element.querySelector("#jspsych-survey-likert-form").addEventListener("submit", (e) => {
					e.preventDefault();
					const response_time = Math.round(performance.now() - start_time);
					let choice = parseInt(document.querySelector('input[name="Q"]:checked').value);
					display_element.innerHTML = '';
					this.jsPsych.finishTrial({
						urns: urns.map(u => {return {id: u.id,
									    ball_color: u.ball_color,
							                    is_result_color: u.is_result_color,
							                    n_balls: u.n_balls,
							                    n_colored_balls: u.n_colored_balls}}),
						response: choice,
						responseText: trial.likert[choice],
						question: trial.prompt(urns),
						scoring: trial.scoring(urns),
						rt: response_time
					}); 
				});
			}else{
				let response_time = 0;
				let selection_order = [];
				let btn = document.getElementById("continue_button");
				btn.addEventListener('click', () => {
					display_element.innerHTML = '';
					this.jsPsych.finishTrial({
						selection_order: selection_order,
						rt: response_time,
						prompt: trial.prompt(urns),
						scoring: trial.scoring(urns),
						urns: urns.map(u => {return {id: u.id,
									    ball_color: u.ball_color,
							                    is_result_color: u.is_result_color,
							                    n_balls: u.n_balls,
							                    n_colored_balls: u.n_colored_balls}})
					});
				});
				let all_selected = true;
				for (const urn of urns){
					all_selected = urn.selected && all_selected;
				}
				if (all_selected){
					btn.removeAttribute('disabled');
				}else{
					canvas.addEventListener('click', (e) => {
						response_time = Math.round(performance.now() - start_time);
						let all_selected = true;
						for (let i = 0; i < urns.length; i++){
							if (ctx.isPointInPath(urns[i].path, e.offsetX, e.offsetY) && !urns[i].selected) {
								urns[i].selected = true;
								selection_order.push(urns[i].id);
								urns[i].drawUrn();
								urns[i].drawBalls();
								updateScore();
								canvas.style.cursor = 'default';
							}
							all_selected = all_selected && urns[i].selected;
						}
						if (all_selected){
							btn.removeAttribute('disabled');
						}
					});
					canvas.addEventListener('mousemove', (e) => {
						let any_hover = false;
						for (let i = 0; i < urns.length; i++){
							if (ctx.isPointInPath(urns[i].path, e.offsetX, e.offsetY) && !urns[i].selected) {
								any_hover = true;
							}
						}
						canvas.style.cursor = any_hover ? 'pointer' : 'default';
					});
				}
			}
			let start_time = performance.now();
		}

	}
	UrnSelectionPlugin.info = info;
	return UrnSelectionPlugin;
})(jsPsychModule);
