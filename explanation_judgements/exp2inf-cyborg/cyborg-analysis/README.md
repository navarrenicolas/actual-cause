# Local cyborg-hunter report

Turns a local test run of `exp2inf-cyborg` into the `cyborg-hunter` triage report
(participant tiers, per-signal counts, mouse paths, and the session-replay scrub
viewer). Nothing here talks to production infrastructure — `main.js` only
downloads these files locally when run with `?mock=1`.

## Run

1. From `exp2inf-cyborg/`: `php -S localhost:8000`
2. Open `http://localhost:8000/main.html?mock=1` and complete the study.
   Two files land in your browser's Downloads folder:
   - `causal_inf_exp2[_noexpl]_<subject_id>.csv`
   - `<subject_id>-replay-<epoch>.json`
3. Move both files into `cyborg-analysis/data/`.
4. From `cyborg-analysis/`: `npx cyborg-hunter@0.8.0 report`
5. Open `cyborg-analysis/cyborg-hunter-report/index.html`.

Repeat for as many local runs as you want to compare — each one adds another
participant to `data/`, and the report re-triages all of them together.

`cyborg-hunter.config.json` points `participantIdField` at `subject_id` (the
column `main.js` already writes via `jsPsych.data.addProperties`) so the CLI
doesn't need any renaming of the downloaded files.
