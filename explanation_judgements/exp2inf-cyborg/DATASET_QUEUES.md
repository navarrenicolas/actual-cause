# Independent explanation and no-explanation queues

Each experiment_1 selection dataset has two copies, one per condition:

```text
datasets/
  available/          -> in_progress/          -> used/
  available_noexpl/   -> in_progress_noexpl/    -> used_noexpl/
```

A claim moves only the selected condition's copy to its in-progress folder.
Saving the participant CSV moves only that copy to its used folder. A dropout
remains in the corresponding in-progress folder regardless of what happens in
the other condition. The queues never borrow records from another condition's
in-progress or used folders. There is no shared `complete` stage or separate
completion-status CSV in this design.

Default allocation prefers `available`; once that pool has no valid unclaimed
records, it tries `available_noexpl`. The browser's `?condition=no_explanation`
requests the no-explanation queue directly. An empty applicable queue returns
`no_data_available`. When both default queues are exhausted (or the requested
no-explanation queue is exhausted), the browser displays "This experiment is
currently not available. Please return to Prolific." and stops before initializing jsPsych or building
the experiment timeline. No random fallback is generated. Assignment errors,
resets, and network failures also stop the study.

Both copies retain the same experiment_1 subject ID, rule, urn colors and
probabilities, outcomes, and scenario order. No-explanation responses omit the
selection fields, and all relevant trials use `show_explanation: false`.
Dataset-backed sessions record `exp1_subject_id` for later pairing and
`assignment_source: dataset`. Mock previews record `assignment_source: mock`.
The rule, priors, and presented scenarios are saved with the normal trial data.

## Initialize and export

Deploy the updated PHP files first, preserving the server's paths in
`config.php`. Run the exporter from the experiment directory:

```sh
php export_exp1_datasets.php
php check_datasets.php
```

The exporter creates all six folders and writes a copy to each available pool
for every newly exported complete experiment_1 participant. For each condition,
it checks all three states before exporting: an existing copy is not recreated,
reset, or overwritten. If just one condition has an existing JSON record, it
seeds the missing copy from that record, preserving its exact scenario order.
A normal re-export does not resurrect dropped-out participants.

Existing explanation records may stay in `available`, `in_progress`, or `used`.
The exporter can add their missing no-explanation copies. It reads only the six
folders above. If the server still has files from the abandoned shared flow
(`noexp_in_progress` or `complete`), reconcile those manually before starting
new sessions; they are not automatically moved or treated as fresh assignments.
For manually prepared queues, put the same record in each available folder.

## Saved data and permissions

Both condition output roots use:

```text
exp2expl-pilot/                  exp2noexpl-pilot/
  assign_log.csv                 assign_log.csv
  data/                          data/
    participant CSVs               participant CSVs
    replay files                   replay files
```

The names and locations of the roots come from `config.php`. Assignment appends
one line to that condition's `assign_log.csv`: timestamp, experiment_1 ID,
experiment_2 ID, dataset filename. CSV and replay saves both use `data/`.
Original response data are retained even for a late save from a reset session.
Older random fallback sessions can still finish saving CSVs and replays to the
no-explanation `data/` directory, but new sessions require an available dataset.
These older sessions do not claim files, append dataset assignment-log rows, or
move queue records. CSV saves return `dataset_status: unassigned` for them.

New folders, including missing condition-root parents and `data/`, are explicitly
set to `0777`, as requested. Existing directory permissions are retained. PHP
still needs permission to write to the nearest existing ancestor. CSV/replay
file modes follow the server's umask.

Assignment, saving, export, and checking share `datasets/.ledger.lock`. The file
normally remains on disk when idle; PHP releases the lock when the request ends.
A newly created lock file uses `0666` so the CLI and Apache can both open it.
An existing lock retains its mode and must be writable by both accounts if both
run these scripts. Do not delete the lock while requests may be active.

## Manual dropout reset

Move the file back within its own condition:

- `in_progress/name.json` → `available/name.json`
- `in_progress_noexpl/name.json` → `available_noexpl/name.json`

Move rather than copy, retain the assignment logs, and do not overwrite another
record. Perform resets with assignment/save traffic stopped, or while holding
an exclusive lock on the same `.ledger.lock` file (for example using the server's
`flock` command). The next participant receives a new assignment-log entry.

A late save by the old participant is still stored, but cannot promote a file
that has been reset or reassigned: `dataset_status` is `superseded`. The latest
claimant alone can move the in-progress file to used. The old participant also
cannot reclaim the reset dataset by retrying the assignment request. Normal
assignment/save retries are idempotent; repeated CSV saves do not duplicate rows.

`check_datasets.php` reconciles each queue with its own log and saved CSVs. It
reports pending participant IDs, recognizes manual resets, detects duplicate
copies within a condition, and checks that the two copies have matching task
data/order. Previous no-explanation CSVs saved at the condition root are still
recognized for historical reconciliation; all new writes use `data/`.
Saved sessions without claims are noted as random fallback or legacy sessions.

## Deployment and local checks

Deploy together:

- `main.js` and `shared-stimuli.js`
- `assign_dataset.php`, `safe_save.php`, and `save_replay.php`
- New helpers: `dataset-ledger.php` and `save-directory.php`
- `export_exp1_datasets.php` and `check_datasets.php`

The configuration keys and current server paths are unchanged. Generic browser
errors remain; PHP logs include the specific error. Start fresh browser sessions
after deployment so they use the new condition response from assignment.
`?mock=1` and `?mock=1&condition=no_explanation` remain browser-only previews and
do not claim files.

```sh
python3 tests/test-dataset-queues.py
node --test tests/test-dataset-client.cjs
python3 test-harness/test-replay-permissions.py
```

The PHP queue tests use synthetic data in temporary directories and exercise the
actual endpoint source, substituting only the CLI request-body stream. They
cover independent completion, dropouts, resets/late saves, concurrent claims,
retries, directory creation, export, checker reconciliation, and failed writes.
The client tests build the real timeline with jsPsych stubs to verify condition
flags, pairing metadata, scenario order, and selection omission. A full browser
session and server filesystem permissions still need deployment verification.
