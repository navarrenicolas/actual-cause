// Keep the completed recording in memory until the server acknowledges it.
async function saveReplayToServer(jsPsych, recording, condition) {
  if (!recording) {
    console.error("Replay recorder did not produce a recording");
    jsPsych.data.addProperties({ replayUploadStatus: "missing_recording" });
    return; // Still save the participant's behavioural data.
  }
  const body = JSON.stringify({ recording, condition });
  const display = jsPsych.getDisplayElement();
  for (;;) {
    display.innerHTML = "<p>Saving your session. Please keep this page open.</p>";
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      try {
        const response = await fetch("save_replay.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Replay upload HTTP ${response.status}`);
        const result = await response.json();
        if (result.status !== "saved") throw new Error("Replay save was not acknowledged");
        jsPsych.data.addProperties({ replayUploadStatus: "saved", replayFilename: result.filename });
        return;
      } catch (error) {
        console.error("Replay upload failed", error);
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
    display.innerHTML = '<p>Your session could not be saved. Please check your connection and try again. Keep this page open.</p><button class="jspsych-btn" id="retry-replay-save">Try again</button>';
    await new Promise(resolve => {
      display.querySelector("#retry-replay-save").addEventListener("click", resolve, { once: true });
    });
  }
}
