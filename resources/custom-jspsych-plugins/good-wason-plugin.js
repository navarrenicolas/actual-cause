// Wason selection task plugin by Michael Goodale, 2021

jsPsych.plugins['wason-selection-task'] = (function(){

	var plugin = {};

	plugin.info = {
		name: 'wason-selection-task',
		parameters: {
			prompt: {
				type: jsPsych.plugins.parameterType.STRING,
				pretty_name: 'Prompt',
				default: null,
				description: 'Any content here will be above below the stimulus.'
			},
			cards: {
				type: jsPsych.plugins.parameterType.HTML_STRING,
				array: true,
				pretty_name: 'Cards',
				default: null,
				description: 'The displayed card text'
			},
			card_colors: {
				type: jsPsych.plugins.parameterType.STRING,
				array: true, 
				pretty_name: "Card colours",
				default: "white",
				description: "The colour of each card"
			},
			card_text_colors: {
				type: jsPsych.plugins.parameterType.STRING,
				array: true, 
				pretty_name: "Card text colours",
				default: "black",
				description: "The colour of each card's text"
			},
			card_font_sizes: {
				type: jsPsych.plugins.parameterType.STRING,
				array: true, 
				pretty_name: "Card font sizes",
				default: "400%",
				description: "The size of the font of each card's text"
			},
			continue_text: {
				type: jsPsych.plugins.parameterType.STRING,
				pretty_name: 'Continue Text',
				default: 'Continue',
				description: 'This is the label on the continue button.'
			},
			min_number_of_selected_cards: {
				type: jsPsych.plugins.parameterType.INT,
				pretty_name: 'Minimum number of selected cards',
				default: 1,
				description: 'The mininum number of cards that can be selected before the participant can continue'
			},
			exact_number_of_selected_cards:{
				type: jsPsych.plugins.parameterType.BOOL,
				pretty_name: 'Exact number of selected cards',
				default: false,
				description: 'Participant may not select more than min_number_of_selected_cards cards'
			}

		}
	}

	function defaultTrialColors(trial){
		function fillArray(arr){
			if(Array.isArray(arr))
				return arr
			const default_val = arr;
			arr = [];
			for (let i = 0; i < trial.cards.length; i++)
				arr.push(default_val);
			return arr;
		}
		trial.card_colors = fillArray(trial.card_colors)
		trial.card_font_sizes = fillArray(trial.card_font_sizes)
		trial.card_text_colors = fillArray(trial.card_text_colors)
	}

	function displayCards(trial){
	        let html = '<div class="wason-selection-table" style="margin:auto; display: table; border-spacing: 20px;">';
		for (let i = 0; i < trial.cards.length; i++){
			const card = trial.cards[i];
			const color = trial.card_colors[i];
			const text_color = trial.card_text_colors[i];
			let style = 'border: 4px solid black;';
			style +=    'display:table-cell;';
			style +=    'border-radius: 20px;';
			style +=    'height: 240px; width: 170px;';
			style +=    `font-size: ${trial.card_font_sizes[i]};`;
			style +=    'text-align: center;';
			style +=    'vertical-align: middle;';
			style +=    'user-select: none;';
			style +=    `background-color:${color}; color:${text_color}`;
			let card_div = `<div class="wason-card-${i}" style="${style}"> ${card} </div>`
			html += card_div
		}
		html += '</div>'
		return html
	}


	plugin.trial = function(display_element, trial){
		defaultTrialColors(trial);
		let html = '<div id="wason-selection-task-plugin">';
		if (trial.prompt !== null)
			html += `<div class="wason-selection-task-prompt" style="width: 75%; margin:auto; padding-bottom: 40px;">${trial.prompt}</div>`; 

		html += displayCards(trial);
		html += `<div class="jspsych-html-button-response-button" style="padding-top:40px;"><button class="jspsych-btn wason-continue-button" ${trial.min_number_of_selected_cards > 0 ? 'disabled' : ''}>${trial.continue_text}</button></div>`;
		html += '</div></div>';
		display_element.innerHTML = html;


		let selected = [];
		let selected_order = [];
		let start_time = (new Date()).getTime();

		for (let i = 0; i < trial.cards.length; i++) {
			selected.push(false);
			display_element.querySelector(`.wason-card-${i}`)
				       .addEventListener('click', selectCard);
		}

		display_element.querySelector('.wason-continue-button')
		               .addEventListener('click', e => {
				       end_trial();
			       });

		function selectCard(e) {
			let elem = e.currentTarget
			const card_idx = Number(elem.className.split('-').pop());
			const old_selected_value = selected[card_idx];

			let n_selected  = selected.reduce((a, b) => a + (b ? 1 : 0)); //number of selected cards
			if (trial.exact_number_of_selected_cards && trial.min_number_of_selected_cards <= n_selected){
				selected[card_idx] = false;
			}else{
				selected[card_idx] = !selected[card_idx];
			}
			elem.style.borderColor = selected[card_idx] ? 'gold' : 'black';

			n_selected  = selected.reduce((a, b) => a + (b ? 1 : 0)); //number of selected cards
			let continue_btn = display_element.querySelector('.wason-continue-button')
			if (n_selected >= trial.min_number_of_selected_cards){
				continue_btn.removeAttribute("disabled");
			}
			else {
				continue_btn.setAttribute("disabled", "disabled");
			}

			if(old_selected_value != selected[card_idx]){
				let new_time = (new Date()).getTime();
				selected_order.push({"card": card_idx,
				"rt": new_time - start_time});
				start_time = new_time;
			}
		}

		function end_trial() {
			// clear the display
			display_element.innerHTML = '';

			// move on to the next trial
			jsPsych.finishTrial({"selected_cards": selected,
				"order_of_card_selection": selected_order,
				"cards": trial.cards
			});
		};
	}

	return plugin;
})();
