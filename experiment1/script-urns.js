///////////////////////////////////////////////////////////
// SETUP
///////////////////////////////////////////////////////////

const paragraph_style = 'inline-size: 600px; margin: auto;';

let subject = {}

const jsPsych = initJsPsych({
  // plugins: ["jsConsentDec"],
  show_progress_bar: true,
  message_progress_bar: '',
  on_finish: function (data) {
    SaveData("actual-cause-urns", subject.id, jsPsych.data.get().csv());
    $(".jspsych-content").html('<center><p>Thank you for completing the experiment. <strong>Please use the following link to confirm your participation: </strong><a href="https://app.prolific.co/submissions/complete?cc=4EE4DE9D">https://app.prolific.co/submissions/complete?cc=4EE4DE9D</a>. Your payment will be processed <strong>within 24 hours</strong>.</p></center>')
  }
});

subject.id = jsPsych.randomization.randomID(10)

jsPsych.data.addProperties({
  subject_ID: subject.id,
  group: group,
})




///////////////////////////////////////////////////////////
// USEFUL FUNCTIONS
///////////////////////////////////////////////////////////

let white_scoring = (urns) => {
	const str = '<p>Here is an example. When you click on the "draw" button, one ball will be randomly drawn from the box. Each ball in the box is equally likely to be selected.</p>'
  if (urns[0].selected) {
    return str + '<p>You have just drawn a white ball! Therefore, you get <b>0</b> points from this box.</p>'
  }
  return str + '<p> Click on "draw" to draw a ball</p>'
};

const color_scoring = (urns) => {
    const str = `<p> The more colored balls there are in a box, the more likely you are to draw a colored ball. The box above has 12 colored balls out of 20 balls, so you have a 60% chance of drawing a colored ball.</p>`
  
    if (urns[0].selected) {
          return str + '<p>You have just drawn a colored ball! Therefore, you get <b>1</b> point from this box.</p>'
    }
      return str + '<p>Click on "draw" to draw a ball.</p>'
};


///////////////////////////////////////////////////////////
// TIMELINE
///////////////////////////////////////////////////////////

let timeline = [];

const AskID = {
  type: jsPsychSurvey,
  pages: [
           [
             {
               type: 'text',
               prompt: "Please enter your Prolific ID", 
               name: 'ProlificID',
               required: true
            }
          ]
        ],
        button_label_finish: 'Submit'
};


const consent = {
  type: jsConsentDec,
  description: 'Show a standard consent form for DEC, collect consent',
  platform: 'Prolific',
  language: 'en',
  about: 'causality'
}

timeline.push(consent);
timeline.push(AskID);




const instructions_page = {
    type: jsPsychInstructions,
    pages: [
      `<div style="${paragraph_style}">` +
      '<p>In this study you will play a simple game of chance.</p><p>There will be boxes in front of you. Each box contains a mix of <b>white balls</b> and <span style="color:red"><b>colored balls</b></span>. You will be able to randomly draw a ball from each box.</p><p>You start with a score of <b>0</b>. Every time you draw a colored ball from a box, you earn <b>1</b> point.</p><p>By contrast, white balls <b>do not give you any points</b>.</p><p>You win the game if you get at least <b>2</b> points.</p>'
    ],
    button_label_next: "Next",
    show_clickable_nav: true
  }
  timeline.push(instructions_page);

const example_urn_1 = {
  type: jsUrnSelection,
  groups: [],
  canvas_size: [45, 50],
  prompt: white_scoring,
  scoring: () => '',
  urns: [{ball_color: "red", is_result_color: false, n_colored_balls: 3, n_balls:20, background_ball_color: "white",width: 50, coords: [15,20]} ]
}
timeline.push(example_urn_1);



jsPsych.run(timeline);