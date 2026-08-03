const consentTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div id="ConsentStyle">
        <br>
        <img src="logo.png" alt="ex1" style="width:500px;"> <br>
        <h1 style="text-align: center;">Information Sheet for Participants</h1>
        <h3><b>Study title:</b> A study on causal explanation</h3>
        <h3><b>Principal Investigator:</b> Neil Bramley</h3>
        <h3><b>Researcher collecting data:</b> Stephanie Chen, Nicolas Navarre</h3>
  
        <p><b>What is this document?</b> This document explains what kind of study we're doing, what your rights 
            are, and what will be done with your data. You should print this page for your records.</p>
  
        <p><b>Nature of the study.</b> You are invited to participate in a study involving judgments about a game of chance. 
        After completing the task, you will be asked to provide basic demographics (e.g., age, gender). Your responses will be recorded. 
        The session should take approximately 5 minutes. Full instructions will be provided shortly.</p>
  
        <p><b>Compensation.</b> You will be paid for your participation in this study in accordance with the Prolific description.</p>
  
        <p><b>Risks and benefits.</b> There are no known risks to participation in this study. Other than the payment 
            mentioned, there are no tangible benefits to you, however you will be contributing to our knowledge about 
            causal explanation.</p>
  
        <p><b>Confidentiality and use of data.</b> All the information we collect during the course of the research 
            will be processed in accordance with Data Protection Law. In order to safeguard your privacy, we will never 
            share personal information (like names or dates of birth) with anyone outside the research team. Your data 
            will be referred to by a unique participant number rather than by name. Please note that we will temporarily 
            collect your worker ID to allow payment and prevent repeat participation; however, we will never share this 
            information with anyone outside the research team. The anonymized data collected during this study will be used 
            for research purposes.</p>
  
        <p><b>What are my data protection rights?</b> The University of Edinburgh is a Data Controller for the information 
            you provide. You have the right to access information held about you. Your right of access can be exercised 
            in accordance with Data Protection Law. You also have other rights including rights of correction, erasure, and 
            objection. For more details, including the right to lodge a complaint with the Information Commissioner’s 
            Office, please visit <a href="https://www.ico.org.uk" target="_blank">www.ico.org.uk</a>. Questions, comments, and requests about your personal data can also be 
            sent to the University Data Protection Officer at <a href="mailto:dpo@ed.ac.uk">dpo@ed.ac.uk</a>.</p>
  
        <p><b>Voluntary participation and right to withdraw.</b> Your participation is voluntary, and you may withdraw 
            from the study at any time and for any reason.
            If you wish to withdraw after data gathering, you have a period of two weeks after data collection to request deletion via the recruitment platform. 
            As data is anonymized, it is not possible to withdraw after this period.
            If you withdraw from the study during or after data gathering, we will delete your data and there is no penalty; however, you will <b>not</b> receive payment.</p>
  
        <p>If you have any questions about what you've just read, please feel free to ask or contact us later. You
            can contact us by email at 
            <a href="mailto:ss2518809@ed.ac.uk">s2518809@ed.ac.uk</a>. This project has been approved by PPLS Ethics Committee, RT number TODO. 
            If you have questions or comments regarding your rights as a participant, they can be contacted at +44 0131 650 4020 
            or <a href="mailto:ppls.ethics@ed.ac.uk">ppls.ethics@ed.ac.uk</a>.</p>
  
        <p>By ticking the box and clicking the button below, you consent to the following:</p>
        <ul>
          <li><b>I am 18 years old or older.</b></li>
          <li>I confirm that I have read and understood <b>how my data will be stored and used.</b></li>
          <li>I understand that I have the <b>right to terminate this session at any point.</b></li></p>
        </ul>

        <div style="margin-top: 20px;">
          <input type="checkbox" id="consent-checkbox">
          I agree to participate in this experiment
        </label>
      </div>
    </div>
  `,
  choices: ['Start the experiment'],
  data: { questionID: "consent" },
  on_load: function() {
    const continueButton = document.querySelector('button.jspsych-btn');
    continueButton.disabled = true; 

    const checkbox = document.getElementById('consent-checkbox');
    checkbox.addEventListener('change', function() {
      continueButton.disabled = !this.checked; 
    });
  }
};
  