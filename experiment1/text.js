/**
 * Instructions and trial prompts for the urn slot machine experiment
 */

var instructions_presentation = "<h1>Instructions</h1><p>In this experiment, you will be playing with a slot machine that samples from four distinct urns at the same time. Each urn will have some probability of pulling either a white or a grey ball. Depending on the arrangement of the sample, the slot machine decides whether you win or lose. Your job is to identify how the slot machine is deciding how you win based on the samples you are allowed to take from that slot machine.</p>";

var rule_prompt = function(number){
    return `<h1> Slot Machine ${number}</h1> <p> Try to identify how the machine chooses your win conditions.</p>`;
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
