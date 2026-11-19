# Study 3: pooled explanations

This follow-up preserves the Study 2 yoked records: rule, box colors/probabilities,
scenario IDs, scenario order, and the 4/8/12 observation schedule. Observation
and feedback cards show pooled counts below all four balls, with green rings for
wins and red for losses. Clicking a ball/count toggles its explanation callout.
Prediction controls and the final held-out scenarios are unchanged.

## Data harness

- `data_harness/selections.json`: Study 1 selections grouped by rule and binary
  scenario pattern, with four counts, contributing subject IDs and selected
  probability ranks. Rank order is high, medHigh, medLow, low (0.9/0.6/0.4/0.1).
  The client maps these ranks back to each yoked participant's boxes A–D.
- `data_harness/available/`, `in_progress/`, `used/`: one JSON per Study 1 subject,
  preserving the exact source scenario order. Assignment moves a record from
  available to in_progress; successful saving moves it to used.
- `data_harness/subject_data.json`: immutable snapshot of all 132 source records
  for random mock sampling, independent of live queue state.

The builder extracts selections from the original datasets directory and checks
all 2,112 individual selections against
`analyses/cs_experiment1/data_processed/exp1cs-1_judgments.csv`, matching on subject,
rule, and scenario pattern. It checks each choice and outcome, not just the grand
total. Scenario presentation order comes from the yoked datasets; the processed
CSV's selection-time order is not used to reorder stimuli.

Verified participants per rule: rule1=26, rule2=35, rule3=23, rule4=27, rule5=21.
No additional participant exclusions are applied. The JSON includes source and
judgments hashes. Sessions save the source version and yoked Study 1 subject ID.

To create a fresh harness (the destination must not already exist):

```sh
python3 build_study_data.py --source /path/to/datasets --harness /path/to/new/data_harness
```

The default source is the repository's Study 2 dataset ledger. The default
verification CSV is the processed judgments file above; override with
`--judgments`. The default destination is this experiment's `data_harness`.
The builder never resets existing claims or changes source files.

## Mock preview

There are exactly two modes:

- `main.html?mock=1`: sample a random participant from the generated harness
  snapshot. No queue claims or server saves. Responses can be downloaded.
- `main.html` (or `?mock=0`): load the harness JSON, claim a dataset through PHP,
  and save responses on the server. Assignment moves `available` → `in_progress`;
  successful response saving moves `in_progress` → `used`.

Mock mode loads `data_harness/browser-data.js`, generated from the JSON files,
so it also works when opening the HTML directly. Non-mock mode requires serving
this folder through PHP; opening an HTML file cannot execute PHP or move files.
There is no automatic fallback to mock mode.

To refresh the mock snapshot after changing the JSON, without touching queues:

```sh
python3 build_study_data.py --refresh-browser-bundle
```

In `main.js`, `MOCK_URN_ORDER` specifies probabilities for boxes **A, B, C, D**:

```js
const MOCK_URN_ORDER = [0.9, 0.6, 0.4, 0.1];
```

Use `null` (the default) to keep the sampled participant's box assignment. An
override must contain each of the four probabilities exactly once. The override
remaps scenario draws by probability rank, preserving the rule, scenario order,
outcomes, and pooled explanation counts. Box colors remain attached to their
letters. The override applies only in mock mode.

## Deployment and saving

`config.php` uses `__DIR__ . '/data_harness'` as the queue root and
`/home/s2518809/server_data/cs/exp3inf/pilot/` as the output root. Deploy with
PHP 8.1+ and give the web server write access to queue state directories and
output directories. Do not overwrite a live harness with the initial available
records when redeploying. Counts and the preview snapshot stay fixed throughout
collection. No live server deployment has been performed here.

There is one queue and no condition dispatch. CSV filenames start
`causal_inf_exp3`. The inherited API parameter `exp2_subject_id` retains the
existing assignment-log format. `stimuli.js` owns instructional copy.

## Validation

```sh
python3 tests/validate_counts.py
node --test tests/test-client.cjs
python3 tests/test_backend.py
```

Validation checks all 320 counts against both original Study 1 CSV submissions
and processed judgments, and checks all 132 harness records against the immutable
snapshot. Client tests cover yoked stimuli, rounds, mock loading, probability
remapping, and callouts. Backend tests use temporary directories for assignment,
repeat claims, exhaustion, and completion. A visual browser walkthrough and live
server smoke test remain outstanding.

## Deployment allocation errors

Allocation errors include a stage code in the browser console and a matching
`assign_dataset.php: [stage] ...` entry in the PHP error log. These distinguish
ledger setup, reading the assignment log, scanning datasets, preparing the save
folder, moving the dataset, and writing the assignment log.

The PHP worker must have read/write/traverse access to `data_harness` and its
`available`, `in_progress`, and `used` folders. Uploading directories commonly
leaves them writable only by the upload user, not the PHP worker. Existing
folder permissions are deliberately not changed by the experiment. Grant the
PHP worker access through the server's owner/group or ACL settings. It also
needs write access to `.ledger.lock`, the configured save root, its `data`
subfolder, and an existing `assign_log.csv`. The save root defaults to
`/home/s2518809/server_data/cs/exp3inf/pilot/`.

## Debugging PHP allocation on this computer

From the experiment folder, run `sh serve.sh`, then open
`http://127.0.0.1:8000/main.html`. Keep the terminal open to see PHP requests and
allocation errors. Stop the server with Ctrl+C.

This runs the same non-mock PHP allocation: it moves records in the actual
`data_harness` queue. Use `?mock=1` to bypass allocation and server saving.
The launcher defaults `STUDY3_DATA_DIR` to `participant_output` in this folder,
which receives `assign_log.csv` and a `data` subfolder for responses/replays.
An existing `STUDY3_DATA_DIR` environment variable takes precedence. Deployed
PHP without that override retains the configured `/home/.../exp3inf/pilot/` path.
Do not upload test queue changes or test assignment logs into an active study.
