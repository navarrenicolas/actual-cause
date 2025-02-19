// const the_end = function (data) {
//   SaveData("quillien-2a-plural-version", subject_ID, jsPsych.data.get().csv);
// }

const paragraph_style = 'inline-size: 600px; margin: auto;';
const likert_scale = ["1<br>(Strongly disagree)", "2","3","4", "5", "6", "7", "8",  "9<br>(Strongly agree)"]

let subject = {}


const jsPsych = initJsPsych({
  // plugins: ["jsConsentDec"],
  show_progress_bar: true,
  message_progress_bar: '',
  on_finish: function (data) {
    SaveData("quillien-2a-plural-version", subject.id, jsPsych.data.get().csv());
    $(".jspsych-content").html('<center><p>Thank you for completing the experiment. <strong>Please use the following link to confirm your participation: </strong><a href="https://app.prolific.co/submissions/complete?cc=4EE4DE9D">https://app.prolific.co/submissions/complete?cc=4EE4DE9D</a>. Your payment will be processed <strong>within 24 hours</strong>.</p></center>')
  }
});

subject.id = jsPsych.randomization.randomID(10)


jsPsych.data.addProperties({ 
  subject_ID: subject.id,
  group: group,
})


let timeline = [];

let white_scoring = (urns) => {
	const str = '<p>Here is an example. When you click on the "draw" button, one ball will be randomly drawn from the box. Each ball in the box is equally likely to be selected.</p>'
  if (urns[0].selected) {
    return str + '<p>You have just drawn a white ball! Therefore, you get <b>0</b> points from this box.</p>'
  }
  return str + '<p> Click on "draw" to draw a ball</p>'
};

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
timeline.push(AskID)

const instructions_page = {
    type: jsPsychInstructions,
    pages: [
      `<div style="${paragraph_style}">` +
      '<p>In this study you will play a simple game of chance.</p><p>There will be four boxes in front of you. Each box contains a mix of white balls and colored balls. Two of the boxes contain <span style="color:purple"><b>purple balls</b></span>, whereas the other two contain <span style="color:orange"><b>yellow balls</b></span>. You will be able to randomly draw a ball from each box. You win a round of the game if you draw at least two yellow balls, or two purple balls.'
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

const color_scoring = (urns) => {
  const str = `<p> The more colored balls there are in a box, the more likely you are to draw a colored ball. The box above has 12 colored balls out of 20 balls, so you have a 60% chance of drawing a colored ball.</p>`

  if (urns[0].selected) {
		return str + '<p>You have just drawn a colored ball! Therefore, you get <b>1</b> point from this box.</p>'
  }
	return str + '<p>Click on "draw" to draw a ball.</p>'
};


const example_urn_2 = {
  type: jsUrnSelection,
  groups: [],
  canvas_size: [45, 50],
  prompt: color_scoring,
  scoring: () => '',
  urns: [{ball_color: "red",
	  is_result_color: true,
	  n_colored_balls: 12,
	  n_balls: 20,
	  background_ball_color: "white",
	  width: 50,
	  coords: [15,20]} ]
}
timeline.push(example_urn_2);

const instructions_question_1 = {
  type: jsPsychInstructions,
  pages: [
    `<div style="${paragraph_style}">`+
		'<p> You will now play the game 10 times in a row.</p>'+
		'<p>Remember that to win, you need to draw at least <b>two</b> balls of the same color. You will need to draw a ball from each of the four boxes before moving on to the next round.</p>'+
		'<p> <i>Please pay close attention to how your score increases as you draw colored balls.</i></p>'+
		'</div>'
  ],

  allow_backward: false,
  button_label_next: "Next",
  show_clickable_nav: true,

}
timeline.push(instructions_question_1);


const comprehension_questions = {
  type: jsPsychSurvey,
  pages: [
    [
      {
        type: 'html',
        prompt: '<h1>Before starting, please take a moment to answer the following comprehension questions:</h1>',
      },
      {
        type: 'multi-choice',
        prompt: 'How many points do you get when you draw a white ball?',
        name: 'WhitePoints',
        columns: 0,
        options: ['0', '1', '2', '3', '4'],
        required: true
      },
      {
        type: 'multi-choice',
        prompt: "What is the condition for winning the game?",
        name: 'WinningCondition',
        options: ['You must draw two yellow, or two purpe balls', 'You must draw exactly zero white balls', 'You must get at least 2 points', 'You must draw an even number of white balls'],
        required: true,
      }

    ]

  ],
  button_label_finish: 'Submit'
};
//timeline.push(comprehension_questions)

let indices = ["A", "C", "D", "B"];
let colors = ["#CC00CC", "orange"]
// let colors = jsPsych.randomization.shuffle(["#CC00CC", "orange"]);

// var urns_matrix = jsPsych.randomization.shuffle([
// 	{id: indices[0], ball_color: colors[0], is_result_color: false, n_colored_balls: 14},
// 	{id: indices[1], ball_color: colors[1], is_result_color: false, n_colored_balls: 4},
// 	{id: indices[2], ball_color: colors[1], is_result_color: true, n_colored_balls: 2},
//     {id: indices[3], ball_color: colors[0], is_result_color: true, n_colored_balls: 18}
// ])
//For the moment, let's try it without shuffling
var urns_matrix = [
	{id: indices[3], ball_color: colors[0], is_result_color: false, n_colored_balls: 14},
	{id: indices[1], ball_color: colors[1], is_result_color: false, n_colored_balls: 4},
	{id: indices[2], ball_color: colors[1], is_result_color: true, n_colored_balls: 18},
    {id: indices[0], ball_color: colors[0], is_result_color: true, n_colored_balls: 2}
]

urns_matrix = urns_matrix.map((urn, index) => ({ ...urn, id: indices[index] }))

const winners = [[14, 18], [18, 14], [4, 18], [14, 18], [4, 14], [18],  [18,14,2], [18, 14], [18, 14], [18]]
const scoring = (urns) => {
	  const rules = `<b> Round ${urns[0].round} </b><br>  To win, you need two purple balls, or two yellow balls`
    let score = 0
	  var score_a = 0
    var score_b = 0
    var score_c = 0
    var score_d = 0
	  let all_selected = true;
    // var score_yellow = score_c + score_d
    // var score_purple = score_a + score_b
    

	  for (let i = 0; i < urns.length; i++) {
      score += (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0)
      if (urns[i].id  == 'A') {
	    score_a = (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0)
     }
      if (urns[i].id  == 'B') {
      score_b = (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0) 
    }
      if (urns[i].id  == 'C') {
      score_c = (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0) 
    }
      if (urns[i].id  == 'D') {
      score_d = (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0) 
    }
	    all_selected = all_selected && urns[i].selected;
	  }

	  if (all_selected && (((score_a + score_b) >= 2) || ((score_c + score_d) >= 2))){
	    return rules + `<br>Number of yellow balls:<b>${score_c + score_d}</b><br>Number of purple balls:<b>${score_a + score_b}</b>.  <br> <b><span style="color: green;">YOU WON :) !</span></b>`
	  }

	  if (all_selected && !(((score_a + score_b) >= 2) || ((score_c + score_d) >= 2))){
	    return rules + `<br>Number of yellow balls:<b>${score_c + score_d}</b><br>Number of purple balls:<b>${score_a + score_b}</b>.<br><b><span style="color: red;">YOU LOST :( !</span></b> `

	  }


	  // if (score >= 2) {
	  //   return rules + `<br>Your score is <b style="color: green;">${score}</b>.  Click the "draw" button to draw from the boxes.`;
	  // }
	  return rules + `<br>Number of yellow balls:<b>${score_c + score_d}</b><br>Number of purple balls:<b>${score_a + score_b}</b>. <br> Click the "draw" button to draw from the boxes.`;
}


function playerMapping(player, gender = false, balls = false) {
  if (gender) {
    var mapping = {
      'Player one': 'he',
      'Player two': 'she',
      'Player three': 'he',
      'Player four': 'she'
    };
  }
  else if (balls) {
    var mapping = {
      'Player one': 'Player one drew a colored ball from all of the urns, and won the game.',
      'Player two': 'Player two drew a white ball from one of the urns, a colored ball from all of the other urns, and won the game.',
      'Player three': 'Player three drew a colored ball from only one of the urns, a white ball from all of the others, and lost the game.',
      'Player four': 'Player four drew a white ball from all of the urns, and lost the game.'
    };

  }
  else {
  var mapping = {
    'Player one': 'first',
    'Player two': 'second',
    'Player three': 'third',
    'Player four': 'fourth'
  };
  }
  return mapping[player] || player;
}


const player_scoring = (urns, player) => {
  const rules = `To win, a player needs two purple balls, or two yellow balls`
  let score = 0
  var score_a = 0
  var score_b = 0
  var score_c = 0
  var score_d = 0
  let all_selected = true;
  // var score_yellow = score_c + score_d
  // var score_purple = score_a + score_b
  

  for (let i = 0; i < urns.length; i++) {
    score += (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0)
    if (urns[i].id  == 'A') {
    score_a = (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0)
   }
    if (urns[i].id  == 'B') {
    score_b = (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0) 
  }
    if (urns[i].id  == 'C') {
    score_c = (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0) 
  }
    if (urns[i].id  == 'D') {
    score_d = (urns[i].selected ? 1 : 0)*(urns[i].is_result_color ? 1: 0) 
  }
    all_selected = all_selected && urns[i].selected;
  }

  if (all_selected && (((score_a + score_b) >= 2) || ((score_c + score_d) >= 2))){
    return rules + `<br>Number of yellow balls:<b>${score_c + score_d}</b><br>Number of purple balls:<b>${score_a + score_b}</b>.  <br> <b><span style="color: green;">${player.toUpperCase()} WON :) !</span></b> ` +
    `<p> Here you can see the outcome of the round that the ${playerMapping(player)} player played. ${playerMapping(player, gender = false, balls = true)}</p> <p> Please take a moment to look at the boxes, and at the balls that he drew. In the next pages, you will see the same picture, and we will ask you some questions about why ${playerMapping(player, gender = true)} won the game. </p>` 

  }

  if (all_selected && !(((score_a + score_b) >= 2) || ((score_c + score_d) >= 2))){
    return rules + `<br>Number of yellow balls:<b>${score_c + score_d}</b><br>Number of purple balls:<b>${score_a + score_b}</b>.<br><b><span style="color: red;">${player.toUpperCase()} LOST :( !</span></b> `+
    `<p> Here you can see the outcome of the round that the ${playerMapping(player)} player played. ${playerMapping(player, gender = false, balls = true)} </p> <p> Please take a moment to look at the boxes, and at the balls that ${playerMapping(player, gender)} drew. In the next pages, you will see the same picture, and we will ask you some questions about why ${playerMapping(player, gender = true)} lost the game. </p>` 


  }


  // if (score >= 2) {
  //   return rules + `<br>Your score is <b style="color: green;">${score}</b>.  Click the "draw" button to draw from the boxes.`;
  // }
  return rules + `<br>Number of yellow balls:<b>${score_c + score_d}</b><br>Number of purple balls:<b>${score_a + score_b}</b>. <br> Click the "draw" button to draw from the boxes.`;
}


for (let i = 0; i < winners.length; i++) {
  const urns = {
    type: jsUrnSelection,
    theta: Math.PI*3/2,
    r: 1.05,
    groups: [],
    canvas_size: [70, 80],
    scoring: () => '',
    urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the follow two attributes
					   //Check if this urn has the same number of coloured balls as any of the winners.
					   is_result_color: winners[i].some((e) => urn.n_colored_balls == e),
					   round: i + 1}}),
    prompt: scoring}
  timeline.push(urns);
}


const survey = {
  type: jsPsychSurveyLikert,
  questions:
  [
    {
      prompt: `<div style="${paragraph_style}"> <h3>You have now played ten rounds of the game. Please take a moment to answer the following question:</h3> <p> How likely is one to win on any given round? </p></div>`,
      labels: [
        '1<br>(Very unlikely)','2','3','4','5','6','7','8',
        '9<br>(Very likely)'
      ],
      required: true
    }

  ],

};
timeline.push(survey)


const instructions_question = {
  type: jsPsychInstructions,
  pages: [`<div style="${paragraph_style}">` +
          '<p> Some four other players played the same game. </p>'+
	  '<p> In the rest of the study, we will show you the outcome of a round of the game played by each of those four different players played, and we will ask you some questions about why they won or lost the game.</p>'+
	  '</div>'],
  allow_backward: false,
  button_label_next: "Click here to continue",
  show_clickable_nav: true

}
timeline.push(instructions_question);

var john_urns = urns_matrix.map(urn => { return {...urn, is_result_color: true, selected: true} })
var john_prompt = player_scoring(john_urns, 'Player one')

const john_draw = {
  type: jsUrnSelection,
  theta: Math.PI*3/2,
  r: 1.05,
  canvas_size: [70, 80],
  seed: 'seed',
  groups: [   ],
  preselected: true,
  scoring: () => '',
  urns:  john_urns, //urns_matrix.map(urn => { return {...urn, is_result_color: true} }),
  prompt: () => john_prompt
          }

timeline.push(john_draw);


const singular_question_john = "Please tell us how much you agree with the following statement: <p> <b>Player one won because he drew a colored ball from box "
var questions_singulars_john = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 0.9,
      seed: 'seed',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable("groups"),
      scoring: () => '',
      urns:  urns_matrix.map(urn => { return {...urn, is_result_color: true} }),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }

  ],
  timeline_variables: [
    { groups: [ {members_id: ['A'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_john + 'A</b></p>'},
    { groups: [ {members_id: ['B'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_john + 'B</b></p>'},
    { groups: [ {members_id: ['C'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_john + 'C</b></p>'},
    { groups: [ {members_id: ['D'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_john + 'D</b></p>'}
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }
}

const pair_question_john = "Please tell us how much you agree with the following statement: <p> <b>Player one won because he drew colored balls from boxes "
const john_questions_pairs = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 1,
      seed: 'seed',
      scoring: () => '',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable('groups'),
      urns:  urns_matrix.map(urn => { return {...urn, is_result_color: true, round: 11}}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }
  ],
  timeline_variables: [
    { groups: [ {members_id: ['A', 'B'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_john + "A and B</b></p>" },
    { groups: [ {members_id: ['B', 'C'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_john + "B and C</b></p>" },
    { groups: [ {members_id: ['C', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_john + "C and D</b></p>" },
    { groups: [ {members_id: ['A', 'C'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_john + "A and C</b></p>" }, 
    // { groups: [ {members_id: ['A', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_john + "A and D</b></p>" },
    // { groups: [ {members_id: ['B', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_john + "B and D</b></p>" }
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }

}

if (group == 1) {
  //timeline.push(questions_singulars_john)
  timeline.push(john_questions_pairs)
}
else {
  timeline.push(john_questions_pairs)
  timeline.push(questions_singulars_john)
}

const john_triple = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI * 3 / 2,
      r: 1,
      seed: 'seed',
      canvas_size: [80, 80],
      scoring: () => '',
      urns: urns_matrix.map((urn) => {
        return { ...urn, is_result_color: true };
      }),
      groups: jsPsych.timelineVariable('groups'),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt'),
    },
  ],
  timeline_variables: [
    {
      groups: [
        { members_id: ['A', 'B', 'C'], color: 'blue', offset: 4, K: 0.3 },
      ],
      prompt: (urns) => pair_question_john + "A, B and C</b></p>",
    },
    {
      groups: [
        { members_id: ['A', 'B', 'D'], color: 'blue', offset: 4, K: 0.3 },
      ],
      prompt: (urns) => pair_question_john + "A, B and D</b></p>",
    },
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement',
  },
};

timeline.push(john_triple);

const instructions_question2 = {
  type: jsPsychInstructions,
  pages: [`<div style="${paragraph_style}">` +
          '<p> Thanks for your answers!</p>'+
	  '<p> Now you will see the outcome of a round played by a second player. Keep in mind that the condition for winning, as well as the urns, are still the same as in the game you played. </p>'+
	  '</div>'],
  allow_backward: false,
  button_label_next: "Click here to continue",
  show_clickable_nav: true

}
timeline.push(instructions_question2);

var Bill_score_A = {'A': true, 'B': true, 'C': false, 'D': true}

var bill_urns = urns_matrix.map(urn => {return {...urn, //Take urn and replace the follow two attributes
//Check if this urn has the same number of coloured balls as any of the winners.

is_result_color: Bill_score_A[urn.id], selected: true
}})
var bill_prompt = player_scoring(bill_urns, 'Player two')

var Bill_draw = {
  type: jsUrnSelection,
  theta: Math.PI*3/2,
  r: 1.05,
  canvas_size: [70, 80],
  seed: 'seed',
  groups: [   ],
  preselected: true,
  scoring: () => '',
  urns:  bill_urns,
  prompt: () => bill_prompt
}
timeline.push(Bill_draw);




const singular_question_bill = "Please tell us how much you agree with the following statement: <p> <b>Player two won because she drew a colored ball from box "
var questions_singulars_bill = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 0.9,
      seed: 'seed',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable("groups"),
      scoring: () => '',
      urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the follow two attributes
      //Check if this urn has the same number of coloured balls as any of the winners.
      
      is_result_color: Bill_score_A[urn.id],
      }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }

  ],
  timeline_variables: [
    { groups: [ {members_id: ['A'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_bill + 'A</b></p>'},
    { groups: [ {members_id: ['B'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_bill + 'B</b></p>'},
    { groups: [ {members_id: ['D'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_bill + 'D</b></p>'}
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }
}
timeline.push(questions_singulars_bill);



const pair_question_bill = "Please tell us how much you agree with the following statement: <p> <b>Player two won because she drew colored balls from boxes "
var bill_questions_pairs = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 1,
      seed: 'seed',
      scoring: () => '',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable('groups'),
           urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the is_result_color attribute
      
      is_result_color: Bill_score_A[urn.id],
    }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }
  ],
  timeline_variables: [
    { groups: [ {members_id: ['B', 'A'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_bill + "A and B</b></p>" },
    { groups: [ {members_id: ['B', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_bill + "B and D</b></p>" },
    { groups: [ {members_id: ['A', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_bill + "A and D</b></p>" },
    //{ groups: [ {members_id: ['A', 'C'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_bill + "A and C</b></p>" }, 
    // { groups: [ {members_id: ['A', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_bill + "A and D</b></p>" },
    // { groups: [ {members_id: ['B', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_bill + "B and D</b></p>" }
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }

}

timeline.push(bill_questions_pairs);

var bill_triple = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 1,
      seed: 'seed',
      scoring: () => '',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable('groups'),
           urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the is_result_color attribute
      
      is_result_color: Bill_score_A[urn.id],
    }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }
  ],
  timeline_variables: [
            { groups: [ {members_id: ['A', 'B', 'D'], color:'blue', offset:4, K: 0.3} ],    prompt: (urns) => pair_question_bill + "A, B and D</b></p>" }]
 ,
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }

}


timeline.push(bill_triple);

const instructions_question3 = {
  type: jsPsychInstructions,
  pages: [`<div style="${paragraph_style}">` +
          '<p> Thanks for your answers!</p>'+
	  '<p> Now you will see the outcome of a round played by a third player. Keep in mind that the condition for winning, as well as the urns, are still the same as in the game you played. </p>'+
	  '</div>'],
  allow_backward: false,
  button_label_next: "Click here to continue",
  show_clickable_nav: true

}
timeline.push(instructions_question3);


var David_score = {'A': false, 'B': false, 'C': false, 'D': false}
var david_urns = urns_matrix.map(urn => {return {...urn, //Take urn and replace the follow two attributes
//Check if this urn has the same number of coloured balls as any of the winners.

is_result_color: David_score[urn.id], selected:true
}})
var david_prompt = player_scoring(david_urns, 'Player three')

var David_draw = {
  type: jsUrnSelection,
  theta: Math.PI*3/2,
  r: 1.05,
  canvas_size: [70, 80],
  seed: 'seed',
  groups: [   ],
  preselected: true,
  scoring: () => '',
    urns:  david_urns,

  prompt: () => david_prompt }
timeline.push(David_draw);



const singular_question_David = "Please tell us how much you agree with the following statement: <p> <b>Player three lost because he drew a white ball from box "
var questions_singulars_David = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 0.9,
      seed: 'seed',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable("groups"),
      scoring: () => '',
      urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the follow two attributes
      //Check if this urn has the same number of coloured balls as any of the winners.
      
      is_result_color: David_score[urn.id],
      }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }

  ],
  timeline_variables: [
    { groups: [ {members_id: ['A'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_David + 'A</b></p>'},
    { groups: [ {members_id: ['B'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_David + 'B</b></p>'},
    { groups: [ {members_id: ['C'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_David + 'C</b></p>'},
    { groups: [ {members_id: ['D'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_David + 'D</b></p>'}
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }
}
timeline.push(questions_singulars_David);



const pair_question_David = "Please tell us how much you agree with the following statement: <p> <b>Player three lost because he drew white balls from boxes "
var David_questions_pairs = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 1,
      seed: 'seed',
      scoring: () => '',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable('groups'),
           urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the is_result_color attribute
      
      is_result_color: David_score[urn.id],
    }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }
  ],
  timeline_variables: [
    { groups: [ {members_id: ['B', 'C'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_David + "B and C</b></p>" },
    { groups: [ {members_id: ['B', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_David + "B and D</b></p>" },
    { groups: [ {members_id: ['C', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_David + "C and D</b></p>" },
    { groups: [ {members_id: ['A', 'C'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_David + "A and C</b></p>" }, 
    { groups: [ {members_id: ['A', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_David + "A and D</b></p>" },
    { groups: [ {members_id: ['A', 'B'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_David + "A and B</b></p>" },
    
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }

}

timeline.push(David_questions_pairs);

var David_triple = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 1,
      seed: 'seed',
      scoring: () => '',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable('groups'),
           urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the is_result_color attribute
      
      is_result_color: David_score[urn.id],
    }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }
  ],
  timeline_variables: [
            { groups: [ {members_id: ['B', 'C', 'D'], color:'blue', offset:4, K: 0.3} ],    prompt: (urns) => pair_question_David + "B, C and D</b></p>" },
            { groups: [ {members_id: ['A', 'C', 'D'], color:'blue', offset:4, K: 0.3} ],    prompt: (urns) => pair_question_David + "A, C and D</b></p>" }
 
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }

}


timeline.push(David_triple);


const instructions_question4 = {
  type: jsPsychInstructions,
  pages: [`<div style="${paragraph_style}">` +
          '<p> Thanks for your answers!</p>'+
	  '<p> Now you will see the outcome of a round played by a third player. Keep in mind that the condition for winning, as well as the urns, are still the same as in the game you played. </p>'+
	  '</div>'],
  allow_backward: false,
  button_label_next: "Click here to continue",
  show_clickable_nav: true

}
timeline.push(instructions_question4);

var Claire_score = {'A': false, 'B': false, 'C': true, 'D': false}
var claire_urns =  urns_matrix.map(urn => {return {...urn, //Take urn and replace the follow two attributes
//Check if this urn has the same number of coloured balls as any of the winners.

is_result_color: Claire_score[urn.id], selected:true
}})

var claire_prompt = player_scoring(claire_urns, 'Player four')
var Claire_draw = {
  type: jsUrnSelection,
  theta: Math.PI*3/2,
  r: 1.05,
  canvas_size: [70, 80],
  seed: 'seed',
  groups: [   ],
  preselected: true,
  scoring: () => '',
    urns: claire_urns,


  prompt:() => claire_prompt }//(urns) => 'To win, a player needs two purple balls, or two yellow balls.  <br>Number of yellow balls:<b>0</b><br>Number of purple balls:<b>1</b><br> <b><span style="color:red"> Player three LOST :( !</span></b>' + 
	            //'<p> Here you can see the outcome of the round that Player three played. Player three drew a colored ball from only one of the urns, a white ball from all of the others, and she lost the game.</p> <p> Please take a moment to look at the boxes, and at the balls that Player three drew. In the next pages, you will see the same picture, and we will ask you some questions about why she won the game. </p>' }

timeline.push(Claire_draw);



const singular_question_Claire = "Please tell us how much you agree with the following statement: <p> <b>Player three lost because she drew a white ball from box "
var questions_singulars_Claire = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 0.9,
      seed: 'seed',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable("groups"),
      scoring: () => '',
      urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the follow two attributes
      //Check if this urn has the same number of coloured balls as any of the winners.
      
      is_result_color: Claire_score[urn.id],
      }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }

  ],
  timeline_variables: [
    { groups: [ {members_id: ['A'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_Claire + 'A</b></p>'},
    { groups: [ {members_id: ['B'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_Claire + 'B</b></p>'},
    { groups: [ {members_id: ['D'], color:'blue', offset: 10, K: 0.3} ], prompt: (urns) => singular_question_Claire + 'D</b></p>'}
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }
}
//timeline.push(questions_singulars_Claire);



const pair_question_Claire = "Please tell us how much you agree with the following statement: <p> <b>Player four lost because she drew white balls from boxes "
var Claire_questions_pairs = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 1,
      seed: 'seed',
      scoring: () => '',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable('groups'),
           urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the is_result_color attribute
      
      is_result_color: Claire_score[urn.id],
    }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }
  ],
  timeline_variables: [
    // { groups: [ {members_id: ['B', 'C'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_Claire + "B and C</b></p>" },
    // { groups: [ {members_id: ['B', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_Claire + "B and D</b></p>" },
    { groups: [ {members_id: ['B', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_Claire + "B and D</b></p>" },
    { groups: [ {members_id: ['A', 'B'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_Claire + "A and B</b></p>" }, 
    { groups: [ {members_id: ['A', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_Claire + "A and D</b></p>" },
    // { groups: [ {members_id: ['B', 'D'], color:'blue', offset:4, K: 0.3} ],  prompt: (urns) => pair_question_Claire + "B and D</b></p>" }
  ],
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }

}

//timeline.push(Claire_questions_pairs);

var Claire_triple = {
  timeline: [
    {
      type: jsUrnSelection,
      theta: Math.PI*3/2,
      r: 1,
      seed: 'seed',
      scoring: () => '',
      canvas_size: [80, 80],
      groups: jsPsych.timelineVariable('groups'),
           urns:  urns_matrix.map(urn => {return {...urn, //Take urn and replace the is_result_color attribute
      
      is_result_color: Claire_score[urn.id],
    }}),
      likert: likert_scale,
      prompt: jsPsych.timelineVariable('prompt')
    }
  ],
  timeline_variables: [
            { groups: [ {members_id: ['A', 'B', 'D'], color:'blue', offset:4, K: 0.3} ],    prompt: (urns) => pair_question_Claire + "A, B and D</b></p>" }]
 ,
  randomize_order: true,
  sample: {
    type: 'without-replacement'
  }

}


timeline.push(Claire_triple);




var Demographics = {
  type: jsPsychSurvey,
  pages: [

    [
      {
        type: 'text',
        prompt: "How old are you?",
        name: 'age',
        textbox_columns: 5,
        required: true,
      },
      {
        type: 'multi-choice',
        prompt: "What is your gender?",
        options: ['Male','Female','Other','Prefer not to say'],
        columns: 0,
        name: 'Gender',
      },
      {
        type: 'multi-choice',
        prompt: "How many college or university level courses have you taken in probability theory and/or statistics?",
        options: ['None','1 undergraduate-level course','2 or more undergraduate-level courses','1 graduate-level course',
          '2 or more graduate-level courses'],
        columns: 0,
        name: 'background',
      },
      {
        type: 'text',
        prompt: "Please let us know if you have any comment about the study:",
        name: 'Additional comments',
        textbox_columns: 25,
        textbox_rows: 10,
        placeholder: 'Type your answer here',
        required: false,
      }
    ]
  ],
  title: 'Thank you for your participation! Before we finish, please tell us a few things about yourself:',
  button_label_next: 'Continue',
  button_label_back: 'Previous',
  button_label_finish: 'Submit',
  show_question_numbers: 'onPage'
};
timeline.push(Demographics)
jsPsych.run(timeline);
