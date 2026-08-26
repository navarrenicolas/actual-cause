const demographicTrial = {
  type: jsPsychSurveyHtmlForm,
  preamble: "",
  html: `
  <div class="instructions-container">
      <h2>Demographic Questionnaire</h2>
      <br>
      <label>What is your age?<br>
        <input name="age" type="number" min="18" max="100" required>
      </label><br><br>

      <label>What is your gender?<br>
        <select name="gender" required>
          <option value="">----</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="non_binary">Non-binary</option>
          <option value="prefer_not_say">Prefer not to say</option>
          <option value="other">Other</option>
        </select>
      </label><br><br>
  
      <label>What is the highest degree or level of school you have completed?<br>
        <select name="education" required>
          <option value="">----</option>
          <option value="high_school">High school or equivalent</option>
          <option value="some_college">Some college</option>
          <option value="bachelor">Bachelor's degree</option>
          <option value="master">Master's degree</option>
          <option value="doctorate">Doctorate</option>
        </select>
      </label><br><br>
  
      <label>What is your college-level background in logic?<br>
        <select name="logic_background" required>
          <option value="">----</option>
          <option value="none">None</option>
          <option value="some">Some courses</option>
          <option value="extensive">Extensive background</option>
        </select>
      </label><br><br>
  
      <label>What is your college-level background in mathematics?<br>
        <select name="math_background" required>
          <option value="">----</option>
          <option value="none">None</option>
          <option value="some">Some courses</option>
          <option value="extensive">Extensive background</option>
        </select>
      </label><br><br>
  
      <label>How much did you rely on notes or diagrams during this experiment?<br>
        <select name="notes_used" required>
          <option value="">----</option>
          <option value="not_at_all">Not at all</option>
          <option value="a_little">A little</option>
          <option value="moderately">Moderately</option>
          <option value="heavily">Heavily</option>
        </select>
      </label><br><br>

      <div class="likert-slider-container">
        <label>How difficult do you think the rule from the previous task was?</label><br><br>
        <div class="likert-slider-row">
          <span class="likert-end-label left">Very Easy</span>
          <input type="range" name="rule_understanding_difficulty" min="1" max="5" step="1" value="1" required class="likert-slider">
          <span class="likert-end-label right">Very Difficult</span>
        </div>
        <div class="likert-scale-labels">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
      </div><br>

      <div class="likert-slider-container">
        <label>How difficult was it to apply the rule when explaining the result?</label><br><br>
        <div class="likert-slider-row">
          <span class="likert-end-label left">Very Easy</span>
          <input type="range" name="rule_application_difficulty" min="1" max="5" step="1" value="1" required class="likert-slider">
          <span class="likert-end-label right">Very Difficult</span>
        </div>
        <div class="likert-scale-labels">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
      </div><br>
    </div>
  `,
  button_label: "Submit",
  data: { question_id: "demographics" },
  on_finish: function(data) {}
};
