/**
 * Instructions and trial prompts for the urn slot machine experiment
 */

var instructions_presentation_1 = `<h1>Instructions</h1><p>In this experiment, you will be playing with a slot machine that samples balls from four urns at the same time. For each urn, the probability of drawing a ball of a given color is relative to the proportion of balls of that color in the urn. </p>`;

var instructions_presentation_2 = "<h1>Instructions</h1><p>In the next trials, you will sample directly from a slot machine that draws balls at random from each of the urns for you. The samples occur in the context of a game of chance. In each round of the game, you win or lose depending on the balls you've drawn from the urns. Your goal is to observe the outcome corresponding to each draw, and try to guess the rule that links the balls you have drawn with the outcome (win or lose) associated with a given draw. </p>";

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
