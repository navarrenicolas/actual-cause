const demographics_block = {
  type: jsSurveyDropdown,
  preamble: "<h1>Demographic questionnaire</h1>\n\n<p>Please answer the following demographic questions.  Your payment will not be\n  affected by your answers.</p>",
  questions: [
    { prompt: "What is the highest degree or level of school you have completed?",
      options: [ "----",
                 "Less than a high school degree",
                 "High school degree or equivalent",
                 "Some college, no degree",
                 "Associate degree",
                 "Bachelor's degree",
                 "Master's degree",
                 "Professional degree",
                 "Doctorate"],
      labels: [ "NA", "notHS", "HS", "CnotD", "AD", "Bsc", "Msc", "PD", "PhD" ]},
    { prompt: "What is your college-level background in logic?",
      options: [ "----",
                 "None",
                 "1 undergraduate-level course",
                 "2 or more undergraduate-level courses",
                 "1 graduate-level course",
                 "2 or more graduate-level courses"],
      labels: [ "NA", "none", "1ug", "2+ug", "1g", "2+ug" ]},
    { prompt: "What is your college-level background in mathematics?",
      options: [ "----",
                 "None",
                 "1 undergraduate-level course",
                 "2 or more undergraduate-level courses",
                 "1 graduate-level course",
                 "2 or more graduate-level courses"],
      labels: [ "NA", "none", "1ug", "2+ug", "1g", "2+g" ]},
    { prompt: "How much did you rely on notes or diagrams during this experiment?",
      options: [ "----",
                 "Not at all",
                 "Somewhat",
                 "A lot" ],
      labels: [ "NA", "not", "somewhat", "lots" ]},
    { prompt: "What is your gender?",
      options: [ "----", "Male", "Female", "Other" ],
      labels: [ "NA", "male", "female", "other"] },
  ],
  data: { questionId: "demo" }
};

const demographics_block_2 = {
  type: jsPsychSurveyText,
  questions: [
    {prompt: 'What is your age?', name: 'age'},

  ],
  data: { questionId: "demo.age" }
}
