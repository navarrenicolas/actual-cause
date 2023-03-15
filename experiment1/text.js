var instructions_presentation =
/*
    Possible changes:
        - Give the drug treatment, so that it is not confused with multiple treatments
*/
    "<h1>Instructions (1 of 3)</h1><p>In this experiment, you will perform the task of a medical student trying to determine if it is safe for a patient to take a drug treatment. The adverse side-effects occur based on each patient's genetic data. As a medical student, you will be presented with many known patient's reactions to the drug treatment. Your job is to use that information to make predictions on new unknown patients.</p>";

var instructions_alleles = 
    // Treatments as safe unsafe
    // Make sure it is clear that the safeness is a sharp binary variable
    "<h1>Instructions (2 of 3)</h1><p> The genetic data will depend on a collection of alleles that may or may not be present in each patient. In the folowing example there are 4 alleles which we will call A,B,C,and D. The presence of each allele is indicated by a black square, and the absence with a blank square. The last cell declares whether the treatment will have adverse side effects. Red when there are adverse side-effects, and green when it is safe to administer the drug.</p>";
var instructions_alleles2 = 
    // Give specific examples of indivisual rows
    "<h1>Instructions (3 of 3)</h1><p>  These are examples examples of known patients' data for one specific drug. Individual patients are represented by each row. Note that it is possible for two patients to have the same allele structures (some arrangements are more likely than others). For this specific drug, it is know to only depend on two alleles, A and B. It is further known that the drug will have adverse side-effects when A is present and B is not, as is shown in the patient data bellow.</p>";
var tutorial_instructions_1 =
    "<h1>Instructions (1 of 3)</h1><p>Finally, a blank grid will appear.</p><p>You have to reproduce the pattern from before by clicking on the grid.</p><p>It is important that you recreate the grid as accurately as possible.</p><p>After answering, you will be given feedback on your performance.</p><p>Take a minute to play around with the grid.  Once four squares in the grid are black, you can continue to the next page.</p>";

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
