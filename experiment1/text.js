/**
 * Instructions and trial prompts for the urn slot machine experiment
 */

var instructions_presentation_1 = `<h1>Instructions</h1><p>In the following experiment, you will be playing a game of chance.`+
`The game consists in drawing colored balls at random from four different urns. To each draw from the urns corresponds an outcome: win or lose.`+
`A draw is winning if the colored balls you've drawn satisfy a certain condition with respects to their color, number, position, or some combination fo those, and losing otherwise.`+
`The condition for winning is not revealed to you however. Your goal in this game is to guess it based on the outcomes corresponding to the samples you've drawn </p>`;

var urns_presentation_1 = `<h1>Instructions</h1><p>. Here are two example urns, to illustrate the process of random drawing.`+
` Each urn is composed of yellow balls and blue balls, in different proportions. When you clik on the 'Draw' button, one ball is drawn at random from each urn.`+
` Each ball in a given urn is equally likely to be drawn.`+
` Therefore, the more ball of a certain color there are in an urn, the more likely you are to draw a ball of that color from that urn. </p>`

var urns_presentation_2 = `<h1>Instructions</h1><p> Here you have drawn a yellow ball from the first urn and a blue ball from the second urn.`+
`After each draw, the balls are systematically replaced in the urn,`+
`so that the probability of drawing a ball of a certain color from a given urn is the same for each draw.`+
`<br> Now that you understand how urns work, we will explain how the guessing game works.`+
`<br><br> Click "continue" to move to the next page.</p>`

let example_scoring = (urns) => {
	const str = instructions_presentation_1
  const str2 = urns_presentation_2
if (urns[0].selected && urns[1].selected) {
    return str2 + `<p> Here you have drawn a yellow ball from the first urn and a blue ball from the second urn.`+
    `<br><br> Click "continue" to move to the next page.</p>`
  }
  return str + '<p> Click on "draw" to draw a ball</p>'
};


var inst_prompt1 = `<p>Let's first introduce a simplified version of the game, where you only draw from the two urns that you have seen just before.<br>`+
`(The version you will play later will involve four different urns)<br>`+
`Click on the 'Draw sample' button below to start the game. </p>` //This line to be removed once we have the proper prompt for it


var inst_prompt2 = `Here in this first sample, you have drawn a yellow ball from the first urn, and a blue ball from the second urn.`+
`The outcome is a win, indicated by the green square to the right of the balls (for a loss, you'd see a red square).<br>`+
`<br> This observation can help you figure out what are the conditions for winning in this game.`+
`For example, here the condition for winning might be: 'You need to draw a yellow ball from the first urn to win',`+
` or 'You need to draw at least one blue ball to win', or any other possibility that is compatible with the observation you see.<br>`+
`<br>When you draw the next sample, this one sample will get saved on the screen, for you to look at it again later if you wish.<br>`+
`(The corresponding balls however are being replaced in the urns before the next random drawn)`


var inst_prompt3 = 'In the second sample you drew, you drew a blue ball from the first urn, and a yellow ball from the second urn. The outcome is, here again, a win. The rule that links observations and outcomes is <b> the same rule </b> for every draw in a given game. So you can use this observation, together with the previous one, to try to infer what is the rule that underlies this dataset.'



var rule_prompt = function(number){
    return `<h1> Slot Machine ${number}</h1> <p> Try to figure out the rule that links the balls you've picked and the outcome of the round</p>`;
};



// Here one needs to make the second part of the prompt appear only after they have drawn.
// Here you can see the balls that you have drawn from each of the urns, in respective order of the urns. 
// You can also see the outcome that corresponds to the balls you have drawn. A red square means that this is a losing sample, whereas a green square
// means that this is a winning sample.

// NB: Actually, we could modify this in order to make it even more explicit, by replacing the squares with crosses and checkmarks?

// Based on the samples and the outcomes you observe, try to figure out the rule that links the balls you have drawn with the outcome of the round.
// You will not necessarily always be able to figure out the rule exactly, but you should try to give it your best guess.

// Later on, we will give you cues about the relationship between the balls and the outcome, by providing you with explanations 
// of the rule that links the balls. 

// Those explanations tell you which ball or balls were the cause of your win or loss *in a particular case*. 

// (maybe) They correspond to what a human, that knew how the game worked would say, if they were explaining the outcome of a particular round to you.
// -> This sounds great actually. 

// You can use these explanations to help you figure out what is the rule that links the balls 
// After that, we'll ask you... etc. 


var start_text = [
  "<p>That's all the practice questions we have for you.</p>" +
  "<p><strong>Remember:</strong> your task is to remember patterns of squares on a grid and decide if a sentence is guaranteed to be true assuming previous sentences are true.</p>" +
  "<p>You will get feedback on how you did on the memory question after each grid.</p>" +
  "<p>Feedback is <strong>only about the memory question</strong>, we will give you <strong>no feedback on the sentences</strong>.</p>" +
  "<p>You should <strong>memorize</strong> the patterns, <strong>not use notes</strong> or diagrams!</p>"+"<p>The experiment will now begin.</p>"
    ];

var inter_conditions_text =
  "<p>You are halfway through the experiment.</p>" +
  "<p>The memory task will now get a bit easier.</p>";
