const feedbackTrial = {
  type: jsPsychSurveyHtmlForm,
  preamble: "",
  html: `
  <div class="instructions-container">
      <h2>Final Feedback</h2>
      <p>Before you finish, we'd love to hear about your experience. These questions are optional — leave any of them blank if you'd rather not answer.</p>
      <br>

      <label>Did you experience any technical difficulties during this study (e.g. images not loading, buttons not responding)? If so, please describe them.<br>
        <textarea name="technical_issues" rows="3" style="width:100%; box-sizing:border-box;"></textarea>
      </label><br><br>

      <label>Did you use any particular strategy when predicting whether John would win or lose?<br>
        <textarea name="strategy" rows="3" style="width:100%; box-sizing:border-box;"></textarea>
      </label><br><br>

      <label>Were the instructions and rule clear? Was anything confusing?<br>
        <textarea name="clarity" rows="3" style="width:100%; box-sizing:border-box;"></textarea>
      </label><br><br>

      <label>Any other comments or feedback about this study?<br>
        <textarea name="comments" rows="3" style="width:100%; box-sizing:border-box;"></textarea>
      </label><br><br>
    </div>
  `,
  button_label: "Submit",
  data: { question_id: "feedback" },
  on_finish: function(data) {}
};
