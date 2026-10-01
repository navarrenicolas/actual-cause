# Server replay saving

Deploy `main.html`, `main.js`, `replay-save.js`, and `save_replay.php` together
to the experiment's PHP server. Keep the existing server-specific `config.php`.
The recorder's `autoSave: none` is intentional for real sessions: version 0.8.0
does not provide a custom PHP upload mode, so `replay-save.js` uploads the result
of `getLastRecording()` after finalization. `?mock=1` still downloads locally.
The library emits an unconditional warning at session start for mode `none`;
it does not know that the experiment retrieves and uploads the recording.
The kit's `finishReplay()` also uses custom upload helpers (`remote-save.mjs`),
which are not included in the kit; it is not a built-in PHP transport.

The thank-you trial continues the original timeline through the save trial's
`done()` callback. Starting another `jsPsych.run()` here reinitializes extensions
and creates a second recorder after the completed recording has been saved.
This lifecycle fix passed JavaScript syntax and diff whitespace checks; the
completion flow still needs a browser check after deployment.

Replays are saved alongside each condition's raw CSVs, using the same paths
as `safe_save.php` (outside the public experiment directory):

- `/home/s2518809/server_data/cs/exp2inf/exp2inf-0/data/`
- `/home/s2518809/server_data/cs/exp2inf/exp2noexpl/data-0/`

The existing data directories must be writable by the PHP worker. Replay names
use `<participant_id>-replay-<hash>.json`, distinguishing them from raw `.csv`
files. Previously saved files in `replays/` are not moved automatically.
Replays are written atomically. After writing, the temporary file is chmod'ed to
`0666 & ~umask()` before renaming, matching the creation mode of participant CSVs
written by `safe_save.php` (typically `0644` under Apache's `0022` umask).
The file remains owned by the PHP worker; this changes permission bits, not
ownership. A permission-setting failure leaves any existing recording untouched
and returns an error. Earlier saves used `tempnam()`'s `0600` mode and need their
permissions corrected on the server or a successful re-save after deployment.
The endpoint accepts requests up to 64 MiB; configure the web server request-body
limit and PHP `post_max_size` accordingly, and allow enough PHP memory to decode
and encode recordings. A 413 response indicates an upload size limit.

After deploying, complete a non-mock test session. In browser Network tools,
`save_replay.php` should return HTTP 200 with `status: saved`. Confirm the JSON
exists in the appropriate directory and the participant CSV contains
`replayUploadStatus: saved` and its `replayFilename`. Failed requests retry three
times, then offer a retry button while retaining the recording in memory.
Missing recordings are marked in the CSV so behavioural data can still save.

This saves at experiment completion; closing/reloading the tab before saving
loses the in-memory recording. Pages already open when files are deployed keep
their old JavaScript. Previously completed sessions without an uploaded or
downloaded replay cannot be reconstructed from this change.

Local validation: PHP and JavaScript syntax checks; temporary PHP HTTP server
with synthetic recordings over 1 MB, both conditions, repeated identical uploads,
JSON round-trip, and invalid-request rejection. Live server deployment and a
full browser session still need verification.

Safety review (2026-09-24): aligned with `safe_save.php` on the allowed CORS
origin and OPTIONS handling, POST/JSON checks, canonical destination-directory
validation, symlink/non-file rejection, and write-error logging. Filenames are
server-generated from a restricted participant ID and a timestamp hash; JSON
decoding rejects invalid UTF-8. Temporary files must stay inside the destination
directory. Replays intentionally use a 64 MiB body limit and JSON depth 512
(CSV saves use 1 MB and depth 16), and atomic replacement instead of append.
Only CSV saving promotes dataset ledger records. Neither endpoint authenticates
participants or rate-limits requests; CORS is not authentication.

Safety tests passed against a temporary PHP server: preflight/method/content-type
handling, malformed/scalar/invalid-UTF8 JSON, invalid conditions and path traversal,
directory/file symlinks, non-file destinations, the previous 0600 saved-file permissions,
oversized-body rejection, both conditions, and retry/JSON round-trip behaviour.

Permission update (2026-09-30): `python3 test-harness/test-replay-permissions.py`
checks both conditions against ordinary CSV file creation under umasks 0022,
0027, and 0077; retry replacement of old 0600 recordings; JSON preservation;
and preservation of the previous file when chmod fails. This is a local change
until `save_replay.php` is deployed.
