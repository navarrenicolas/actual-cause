var instructions_presentation =
    "<h1>Instructions (1 of 5)</h1><p>In this experiment, you will perform the task of a data analyst a drug threatment research program. The task will consist of determening whether a certain drug treatment will have adverse side effects on a patient based on some genetic data.</p>";

var instructions_alleles = 
    "<h1>Instructions (2 of 5)</h1><p> The genetic data will depend on 4 alleles that may or may not be present in a patient. The alleles each are represented by their own colour. For each patient, we say they have the allele if the colour is present, otherwise it will be blank.</p>";
    
var instructions_grid1 =
    "<h1>Instructions (2 of 5)</h1><p>A table of data like the one below will appear on the screen <strong>for a very brief moment</strong>.</p><p>You have to memorize where the black squares are.</p><p>You should <strong>memorize</strong> the pattern, <strong>not use notes</strong> or diagrams!</p>";

var instructions_inferences =
    "<h1>Instructions (3 of 5)</h1><p>Then, you will be presented with sentences on the screen. After one or more sentences are presented, we will ask you <strong>whether you can draw a certain conclusion from them</strong>. We want to know whether, assuming that the sentences you are given are true, <strong>you think</strong> that the proposed conclusion is <strong>guaranteed to be true</strong>.<p class=\"premise\">Every man is mortal.</p><p class=\"premise\">John is a man.</p></p><p class=\"prompt\">Does the sentence below follow from the sentences above?</p><p class=\"conclusion\">John is mortal.</p>";

var instructions_grid2 =
    "<h1>Instructions (4 of 5)</h1><p>Finally, a blank grid will appear.</p><p>You have to reproduce the pattern from before by clicking on the grid.</p><p>It is important that you recreate the grid as accurately as possible.</p><p>After answering, you will be given feedback on your performance.</p><p>Take a minute to play around with the grid.  Once four squares in the grid are black, you can continue to the next page.</p>";

var instructions_inferences_example1 =
    "<h1>Instructions (5 of 5)</h1><p>We will now give you <strong>two examples</strong> of the kinds of questions you will be asked.</p>";

var instructions_inferences_example2 =
    "<h2>Example 1</h2><p>Assume the following two <strong>boldface</strong> sentences are true:</p><p><strong>If Mary is playing tennis, then Bill is at home.</strong></p><p><strong>If Bill is at home, then Ann is at work.</strong></p><p><i>Question:</i></p><p>Does it follow that <i>if Mary is playing tennis, then Ann is at work</i>?</p><p><i>Answer:</i></p><p>Yes. (Because, when the sentences in <strong>boldface</strong> are assumed to be true, the conclusion has to be true as well.)</p><p>Click below for another example.</p>";

var instructions_inferences_example3 =
    "<h2>Example 2</h2><p><strong>Mary is at home.</strong></p><p><strong>If Mary is at home and Ann is playing tennis, then Bill is at work.</strong></p><p><i>Question:</i></p><p>Does it follow that <i>Bill is at work</i>?</p><p><i>Answer:</i></p><p>No. (Because the sentences in <strong>boldface</strong> could be true and the conclusion false. If Mary is at home but Ann is not playing tennis, the boldface sentences are true, but the proposed conclusion is false.)</p>";

var instructions_training =
    "<p>We will now present you a few training trials.</p><p>The memory task is hard. We need you to do the best you can, even if it is not 100% perfect.</p>";

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
