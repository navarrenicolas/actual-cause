# Study 3: pooled explanations

This follow-up keeps each Study 2 source record's rule, box probabilities/colors,
scenario IDs, scenario order, and the 4/8/12 observation schedule. It replaces
individual explanations in the main observation and feedback cards with counts
below all four balls, with green rings for wins and red rings for losses (including
zero counts). Prediction controls and held-out final scenarios are unchanged.
The two-box practice still introduces the meaning of an individual explanation;
the pre-study instructions introduce the transition to counts.

Counts are frozen from all 132 complete Study 1 records in the local Study 2
ledger: rule1=26, rule2=35, rule3=23, rule4=27, rule5=21. Each person contributes
one selection per scenario. Scenario IDs are presentation positions, not shared
scenario identities. Aggregation therefore uses rule + colored/grey pattern in
descending probability order (0.9, 0.6, 0.4, 0.1), then maps counts back to the
assigned participant's boxes A–D. This preserves yoking while making explanation
distributions identical for equivalent rule/scenario pairs. No new participant
exclusions were applied. `tests/validate_counts.py` independently verifies all
320 counts against the raw Study 1 CSVs.

`explanation-counts-data.js` contains aggregate counts only, plus a source hash.
Saved sessions include `study=exp3inf`, `explanation_format=pooled_counts`, that
hash, and the original yoked `exp1_subject_id`. Observation and feedback events
also save their displayed counts. The inherited API field `exp2_subject_id` and
internal condition `explanation` are retained for backend compatibility; all
Study 3 files and queues use separate paths. CSV filenames start `causal_inf_exp3`.

## Preview and deployment

Open `main.html?mock=1` for a preview using real pooled counts and a synthetic
yoked record. This bypasses server assignment/saving. External jsPsych and
cyborg-hunter dependencies require internet access.

For live collection, deploy this folder with PHP 8.1+ and configure the Study 3
paths in `config.php`. Seed a **new, empty** Study 3 queue using the original
Study 2 ledger snapshot (read-only input):

```sh
python3 build_study_data.py --source /path/to/study2/datasets --queue-dir /path/to/study3/datasets
```

The default source is the repository's local Study 2 ledger. The builder reads
all queue states, deduplicates identical copies by Study 1 subject, rejects
conflicting copies, and preserves each source record exactly in the new queue.
It refuses an existing destination directory. The web server needs write access
to the new ledger and output directories. Do not point Study 3 at Study 2's
live queue or output paths. Keep the frozen count file unchanged during collection.
No server deployment or live queue seeding has been performed in this workspace.

## Validation

```sh
python3 tests/validate_counts.py
node --test tests/test-client.cjs
```

Client tests verify preservation of yoked stimuli and round structure, pooled
feedback, mock startup, and remapping under swapped box assignments. JS and PHP
syntax checks also pass. A live browser walkthrough and deployed-server smoke
test remain necessary before recruitment.
