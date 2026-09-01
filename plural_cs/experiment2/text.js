/**
 * Instructions and trial prompts for the urn slot machine experiment
 */

var instructions_presentation_1 = '<div class="prose"><h1>Instructions</h1><p>In the following experiment, you will be playing a game of chance. The game consists of drawing colored balls at random from four different urns. Each draw from the urns will produce an outcome: win or lose. A draw is winning if the colored balls you\'ve drawn satisfy a certain condition regarding their <b>color, number, position, or some combination of these</b>, and losing otherwise. We will not reveal the conditions for winning. Your goal in this game is to guess them, based on the outcomes corresponding to the samples you\'ve drawn.</p></div>';

var urns_presentation_1 = `<h1>Instructions</h1> <p> Here are two example urns, to illustrate the process of random drawing.` +
  ` Each urn is composed of colored balls and gray balls, in different proportions. <br> When you clik on the 'Draw' button, one ball is drawn at random from each urn.` +
  ` Each ball in a given urn is equally likely to be drawn.` +
  ` <b>Therefore, the more balls of a certain color there are in an urn, the more likely you are to draw a ball of that color from that urn.</b> </p>`

var urns_presentation_2 = `<h1>Instructions</h1><p> Here you have drawn an orange ball from the first urn and a blue ball from the second urn.` +
  `After each draw, the balls are systematically replaced in the urn, ` +
  `so that the probability of drawing a ball of a certain color from a given urn is the same for each draw.` +
  `<br><br> Now that you understand how urns work, we will explain how the guessing game works.` +
  `<br><br> Click "continue" to move to the next page.</p>`

let example_scoring = (urns) => {
  const str = urns_presentation_1
  const str2 = urns_presentation_2
  if (urns[0].selected && urns[1].selected) {
    return str2
  }
  return str + '<br> Click on the "draw" button to draw a ball'
};

var pre_trial_sampling_prompt = '<div class="prose"><p> Now that you understand how the game works, you will play a more complicated version of the same game, with <b>different winning conditions</b>, this time involving <b>four urns instead of two</b>.</p><p>Before you start playing the game, we invite you to draw ten times from the four urns that will be used in the game, so you can get used to the way these urns work. In this first step, we won\'t tell you the outcome associated with each of the samples you draw. Again, the goal for now is just to get you used to these new urns. You\'ll get to play the full game shortly!</p></div>'

var prompt_no_jug = 'For each of these draws, we will tell you the outcome (win or lose) resulting from this draw in the game you are playing.'
var prompt_jug = 'For each of them, we will tell you the outcome (win or lose) corresponding to this draw in the game you are playing, and the cause of your win or your loss in this particular case.'

var instructions_presentation_2 = '<div class="prose"><h1>Ready to start the game!</h1><p> You are now ready to start playing the game. In the next pages, we will invite you to draw ten times from the same urns that you just saw. ' + (group == 1 ? prompt_no_jug : prompt_jug) + ' You should use all the information available to you to figure out the conditions for winning in this game.</p><p>After you have drawn ten samples, we will test your understanding of the conditions for winning in this game, by presenting you with a number of draws, and asking you to <b>predict the outcome of the game for these draws</b>. Later on, you will receive feedback on your answers.</p></div>'


var instructions_presentation_3 = '<h1>Debriefing questionnaire</h1><p>Thanks for having completed the test. Before we give you some feedback on your answers, we would like to ask you a few questions about the game you just played:</p>' 

var question_prompt_condition = ` What did you think was the condition for winning in the game you just played? `
var question_prompt_information = ` How did you use the information we gave you to try and figure out the condition for winning in the game? Describe your strategy in a few sentences. `
var question_prompt_priors = `In particular, did the frequency of colored and gray balls coming out of each urn have an influence on your guesses? `
var question_prompt_priors_explanation = ` Please explain why and in what ways those frequencies influenced your guesses or not. `

var final_feedback_prompt = function(urn_order) {

  let original_mapping = {0:'A',1:'B',2:'C',3:'D'};
  let urn_mapping = {};
  for (let i = 0; i < urn_order.length;i++){
    urn_mapping[urn_order[i]] = i;
  };
  return '<h1>Feedback</h1><div class="prose"><p> Thanks for your answers! Below is some feedback on your answers to the test questions. To win the game, you needed to draw colored balls from either urn <b>' + (original_mapping)[urn_mapping["c"]] + '</b>, or from both urns <b>' + (original_mapping)[urn_mapping["a"]] + '</b> and <b>' + (original_mapping)[urn_mapping["d"]] + '</b>. All of the outcomes that did not satisfy this condition were losing outcomes. Note that <b>your payment will not be affected by how many rows you got right!</b> We\'re only sharing this feedback with you to satisfy your curiosity about the game.</p></div>'

}
var final_questions_prompt = `<p> Please take a moment to answer the following last questions about the experiment. </p>` 

var final_prompt_rule = ` Now that you know the winning condition in this, does the information we gave you make more sense to you? Do you think you could have guessed it with the information you had? `
var final_prompt_rule_explanation = ` In particular, do you find that the explanations that we gave you for the outcomes you obtained in the game are coherent with the rule you just learned? `
var final_prompt_rule_comments = ` Please mention any other comments you might have about the game you just played, incuding any difficulties you might have encountered. `

var inst_prompt1 = '<div class="prose"><p>Let us first introduce a simplified version of the game, to get you used to the components. For now, you will only draw from two urns, represented below. The version you will play later will involve four different urns.</p><p>When you click on the \'Draw sample\' button below, one ball will be drawn at random from each of the urns, and we will tell you whether that draw is a win or a lose.</p></div>'


var inst_prompt12 = `<p>Push the 'Draw sample' button below to draw your first sample.</p>`


var inst_prompt2 = '<div class="prose"><p>Here in this first draw, you got an orange ball from urn <b>A</b>, and a gray ball from urn <b>B</b>. The outcome is a win, indicated by the green square to the right of the draw (for a loss, you\'d see a red square).</p><p>This observation can help you figure out the conditions for winning in this game. For example, here the condition for winning might be: "You need to draw an orange ball from urn A to win," or "You need to draw at least one colored ball to win," or any other possibility that is compatible with the observation you see.</p><p>When you draw again, the current draw will remain on the screen, for you to look at it again later if you wish. <b>But</b> the corresponding balls are always being replaced in the urns before the next random drawn.</p></div>'


var inst_prompt22 = `<p>Push the 'Draw sample' button below to draw your next sample.</p>`

var inst_prompt3 = `<p>In the second sample, you drew a gray ball from the first urn, and a blue ball from the second urn. ` +
  `The outcome is, here again, a win. Keep in mind that the rule that links observations and outcomes is <b> the same rule </b> for every draw in a given game.` +
  ` So you can use both to try to infer what is the condition for winning in this game, knowing that it has to be a condition that is satisfied by both samples.</p>`


var inst_prompt32 = `<p>Push the 'Draw sample' button below to draw a new sample.</p>`

var inst_prompt4 = `<p>Here you drew a gray ball from the first urn, and a blue ball from the second urn again. ` +
  `This draw is the same as the previous one. This can happen repeatedly in the game as each draw is random and independant from the others. ` +
  `<br> <br> In each game you're going to play, after you've drawn a certain number of samples in this way, we will test your understanding of the condition ` +
  `that rules the game, by presenting you with new samples, and ask you to predict the outcome of the game for these samples. ` +
  `You can click on 'Go to test' below in order to get a preview of what the test phase is going to look like. </p>`;

var inst_prompt42 = `<p>Push the button below to start the test.</p>`

var inst_test_1 = '<div class="prose"><p>Below, on the left, we show you every possible draw from these two urns. Your goal is to use the knowledge of the winning conditions you have gathered from previous observations, which remain onscreen on the right, in order to guess what the outcomes are. These predictions directly depend on what you think the conditions for winning are.</p><p>Click on each individual square to the right of each draw below to turn it green if you think this particular draw corresponds to a win. Each click on these squares will cycle its color between <b>green</b> (a win), <b>red</b> (a loss) and <b>blank</b> (not yet decided). You must make a concrete win/loss prediction for all of the draws before you can move on to the next screen. You can\'t leave any draws undecided.</p></div>'

  var inst_test_12 = `You must give a prediction for all samples before you can go move on to the next page.`

  var feedback_prompt = '<div class="prose"><p>In this case, the condition for winning was that you needed to get <b>at least one orange ball from urn A, or one blue ball from urn B</b> (or in other words, at least one colored ball from any of the urns). This means that, for example, in the first draw below, where you get a gray ball from both urns, you lose the game, since the condition for winning is not satisfied by this draw.</p><p>Below is some feedback on the answers you just gave. A correct answer is indicated by a checkmark, and a wrong answer by a cross.</p></div>'
  
  
  
  var inst_judg_1 = '<div class="prose"><p>To help you figure out the winning conditions, we will also provide another kind of information, in the form of <b>explanations</b> for why you won or lost in a particular case. These point to <b>a specific subset of the urns</b> that were particularly instrumental in bringing about the outcome you obtained for a given draw.</p><p>The urns in question are highlighted by a dotted frame, as you can see below.</p></div>'
  
  
  var inst_judg_12 = `Push the button below to continue`
  
  var inst_judg_2 = '<div class="prose"><p>These explanations depend on the conditions for winning in a particular game. They correspond to the explanations that a person knowing those conditions would give you for a particular draw.</p><p>For example, in the game you just played, you needed to draw a colored ball from either one of the urns to win the game. So, in the first draw below, we would tell you that you won <b>because you drew a colored ball from urn A</b>. In the second and third draws, we would tell you that you won <b>because you drew a colored ball from urn B</b>.</p></div>'
  
  

var inst_judg_22 = `Push the button below to continue`


var inst_judg_3 = '<div class="prose"><p>Because these judgments are directly dependent on the conditions for winning in this particular game, they will be of help as you try to guess what those conditions might be. We will also tell you the reason why you <b>didn\'t win</b> on a particular draw from the urns.</p></div>'


var inst_judg_32 = `Push the button below to start the game`

var inst_prompt22 = `<p>Push the 'Draw sample' button below to draw your next sample.</p>`


var inst_prompt3 = '<div class="prose"><p>In this second draw, you got a gray ball from urn <b>A</b>, and a blue ball from urn <b>B</b>. The outcome is, here again, a win. Keep in mind that the rule that links observations and outcomes is <b>the same rule</b> for every draw in a given game. So you can use this observation, together with the previous one, to try to infer the conditions for winning in this game. In this case, it would have to be a condition that is satisfied by both the first and the second draw.</p></div>'

var inst_prompt32 = `<p>Push the 'Draw sample' button below to draw a new sample.</p>`

var inst_prompt4 = '<div class="prose"><p>Here you drew a gray ball from urn <b>A</b>, and a blue ball from urn <b>B</b>. This draw is the same as the previous one. This can happen repeatedly in the game as each draw is random and independent from the others.</p><p>After you\'ve drawn a certain number of samples in this way, we will test your understanding of the condition that underlies the game, by presenting you with a list of possible draws, and asking you to predict the outcome of the game for each of these possible draws.</p></div>'

var inst_prompt42 = `<p>Push the button below to start the test.</p>`


var rule_prompt = function (number) {
  return `<h1> Game ${number}</h1> <p> Try to figure out the rule that links the balls you've picked and the outcome of the round</p>`;
};
var rule_prompt1 = function (number) {
  if (number == 1) {
  return `<h1> Draw</h1>` }
  else if (number == 2) {
    return `<h1> Predict</h1>` }
  else if (number == 3) {
    return `<h1> Feedback</h1>` }
  ;
};///// Flag here. 
