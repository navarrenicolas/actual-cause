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
`(The version you will play later will involve four different urns)<br></p>`

var inst_prompt12 = `<p>Push the 'Draw sample' button below to draw your first sample.</p>`


var inst_prompt2 = `Here in this first sample, you have drawn a yellow ball from the first urn, and a blue ball from the second urn.`+
`The outcome is a win, indicated by the green square to the right of the balls (for a loss, you'd see a red square).<br>`+
`<br> This observation can help you figure out what are the conditions for winning in this game.`+
`For example, here the condition for winning might be: 'You need to draw a yellow ball from the first urn to win',`+
` or 'You need to draw at least one blue ball to win', or any other possibility that is compatible with the observation you see.<br>`+
`<br>When you draw the next sample, this one sample will get saved on the screen, for you to look at it again later if you wish.<br>`+
`(The corresponding balls however are being replaced in the urns before the next random drawn)`

var inst_prompt22 = `<p>Push the 'Draw sample' button below to draw your next sample.</p>`


var inst_prompt3 = `In the second sample you drew, you drew a blue ball from the first urn, and a yellow ball from the second urn.` +
`The outcome is, here again, a win. Keep in mind that the rule that links observations and outcomes is <b> the same rule </b> for every draw in a given game.`+
` So you can use this observation, together with the previous one, to try to infer what is the condition for winning in this game.`+
`In this case, it would have to be a condition that is satisfied by both the first and the second sample. `

var inst_prompt32 = `<p>Push the 'Draw sample' button below to draw a new sample.</p>`

var inst_prompt4 = `Here you drew a blue ball from the first urn, and a yellow ball from the second urn.` +
`This draw is the same as the previous one. This can happen repeatedly in the game as each draw is random and independant from the others.`+
`<br> <br> After you've drawn a certain number of samples in this way, we will test your understanding of the condition`+
`that underlies the game, by presenting you with new samples, and ask you to predict the outcome of the game for these samples`

var inst_prompt42 = `<p>Push the button below to start the test.</p>`

var inst_test_1 = `Here we present you with every possible four draws from those two urns.`+
`Your goal is to use the knowledge of the rule you have gathered from previous observations in order to guess what`+
`the outcome of those draws is. This predictions directly depends on what you think the condition for winning/losing is`+
`<br><br> Click on the square to the right of the urns to turn it green if you think this sample corresponds to a win.`+
`Click twice to turn it red if you think this sample is a losing one.`

var inst_test_12 = `You must give a prediction for all samples before you can go move on to the next page.`

var inst_judg_1 = `As you probably have noted, it can be hard to ascertain what the condition for winning is.`+
`based on the limited number of observations you had at your avail.`+
`For that reason, in some cases we will give you an extra piece of information on top of those observations,`+
`in the form of explanations for why you won or lost in a particular case.`+
`Together with the observation, we provide you with a judgment that tells you which subset of the urns`+
`was particularly responsible for your win or your loss in that case.`


var inst_judg_12 = `Push the button below to continue`

var inst_judg_2 = `Those explanations will match the intuitive judgments that a person knowing the rule of the game would give you.`+
`For example, in the game you just played, if the condition was 'You win if you draw a yellow from either one of the urns'.`+
`<br> Which it could have been, given the observations you had, we would have told you that in the first case, you won the game`+

`<b> because of the yellow ball from urn 1 </b>, whereas in the second and third samples, you won`+ 
`<b> because of the yellow ball from urn 2 </b>`+
`was particularly responsible for your win or your loss in that case.`



var inst_judg_22 = `Push the button below to continue`


var inst_judg_3 = `The frame that is put around the relevant variable corresponds to the variable `+
`we pointed to you as an explanation for the outcome. It will allow you to keep track of what variables were`+
`particularly responsible for the outcome in each case, in order to make a more informed guess`+

`<br> <br> In the following, you will be presented with four games in total, each involving a total of four urns`+
`and asked to guess what is the condition for winning in each of those games`



var inst_judg_32 = `Once you are ready, you can push the button below to start the experiment.`



var rule_prompt = function(number){
    return `<h1> Game ${number}</h1> <p> Try to figure out the rule that links the balls you've picked and the outcome of the round</p>`;
};





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
