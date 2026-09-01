<?php
declare(strict_types=1);

// Converts nic_experiment1 (experiment_1)'s raw saved CSVs into the ledger
// JSON records assign_dataset.php hands out (datasets/available/*.json).
// Run from the command line: `php export_exp1_datasets.php` (uses
// config.php's mock_mode like everything else here).
//
// Safe to re-run any time (e.g. cron'd as new experiment_1 participants
// complete): a subject already represented anywhere in
// datasets/{available,in_progress,used} is skipped, never overwritten or
// duplicated. Only new-since-last-run CSVs actually produce a new file, in
// datasets/available/.
//
// Extraction logic (validated against all 132 real participant CSVs in
// analyses/cs_experiment1/data/exp1cs-1 while building this): a complete
// participant has exactly 16 rows with event_type ==
// "explanation_selection_submit" (nic_experiment1/explanation-grid-plugin.js
// writes exactly one such row per draw combination, across its 4 batches),
// with scenario_id covering 1..16 exactly once each. subject_id, rule_key,
// urn_probs, and urn_colors are session-level properties
// (jsPsych.data.addProperties) so they're identical on every row — read
// from the first matching row. urn_probs/urn_colors are JSON-encoded
// arrays in A,B,C,D order (see nic_experiment1/main.js) — decoded and
// zipped with that key order here to build the {A:.., B:.., ...} shape the
// rest of this experiment expects.
//
// A participant who didn't finish all 4 explanation batches (fewer than 16
// such rows) is skipped with a warning — there's no well-formed ledger
// record to build for them.

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "export_exp1_datasets.php is a command-line tool only (php export_exp1_datasets.php).\n";
    exit(1);
}

$config = require __DIR__ . '/config.php';
$exp1DataDir = $config['exp1_data_dir'];
$datasetsDir = $config['datasets_dir'];
$availableDir = $datasetsDir . '/available';
$inProgressDir = $datasetsDir . '/in_progress';
$usedDir = $datasetsDir . '/used';

const URN_KEYS = ['A', 'B', 'C', 'D'];

/** Subject id from a causal_exp1_<id>.csv filename. */
function subjectIdFromFilename(string $filename): ?string
{
    if (preg_match('/\Acausal_exp1_(.+)\.csv\z/D', $filename, $m)) {
        return $m[1];
    }
    return null;
}

/** @return list<array<string, string>>|null null on unreadable/unparseable file */
function readCsvRows(string $path): ?array
{
    $fh = fopen($path, 'r');
    if ($fh === false) {
        return null;
    }
    $header = fgetcsv($fh);
    if ($header === false) {
        fclose($fh);
        return null;
    }
    $rows = [];
    while (($fields = fgetcsv($fh)) !== false) {
        if (count($fields) !== count($header)) {
            continue; // malformed line — skip rather than misalign columns
        }
        $rows[] = array_combine($header, $fields);
    }
    fclose($fh);
    return $rows;
}

/** @return array<string, bool> every subject_id already present anywhere in the ledger */
function listExistingLedgerSubjects(string $availableDir, string $inProgressDir, string $usedDir): array
{
    $subjects = [];
    foreach ([$availableDir, $inProgressDir, $usedDir] as $dir) {
        foreach (glob($dir . '/*.json') ?: [] as $path) {
            $raw = file_get_contents($path);
            if ($raw === false) {
                continue;
            }
            try {
                $decoded = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
            } catch (JsonException $e) {
                continue;
            }
            if (is_array($decoded) && is_string($decoded['subject_id'] ?? null)) {
                $subjects[$decoded['subject_id']] = true;
            }
        }
    }
    return $subjects;
}

if (!is_dir($exp1DataDir)) {
    fwrite(STDERR, "ERROR: exp1_data_dir does not exist: $exp1DataDir\n");
    exit(1);
}
foreach (['available' => $availableDir, 'in_progress' => $inProgressDir, 'used' => $usedDir] as $label => $dir) {
    if (!is_dir($dir)) {
        fwrite(STDERR, "ERROR: datasets_dir/$label does not exist: $dir\n");
        exit(1);
    }
}

$existingSubjects = listExistingLedgerSubjects($availableDir, $inProgressDir, $usedDir);

$created = 0;
$skippedExisting = 0;
$skippedIncomplete = [];

foreach (glob($exp1DataDir . '/causal_exp1_*.csv') ?: [] as $csvPath) {
    $filename = basename($csvPath);
    $subjectIdFromName = subjectIdFromFilename($filename);
    if ($subjectIdFromName === null) {
        continue;
    }

    if (isset($existingSubjects[$subjectIdFromName])) {
        $skippedExisting++;
        continue;
    }

    $rows = readCsvRows($csvPath);
    if ($rows === null) {
        $skippedIncomplete[] = "$filename: could not read/parse CSV";
        continue;
    }

    $submissionRows = array_values(array_filter(
        $rows,
        fn($row) => ($row['event_type'] ?? null) === 'explanation_selection_submit'
    ));

    if (count($submissionRows) !== 16) {
        $skippedIncomplete[] = "$filename: found " . count($submissionRows) . " explanation_selection_submit rows, expected 16";
        continue;
    }

    $first = $submissionRows[0];
    $subjectId = $first['subject_id'] ?? '';
    $ruleKey = $first['rule_key'] ?? '';

    if ($subjectId === '' || $ruleKey === '') {
        $skippedIncomplete[] = "$filename: missing subject_id or rule_key";
        continue;
    }

    if ($subjectId !== $subjectIdFromName) {
        $skippedIncomplete[] = "$filename: filename subject_id ($subjectIdFromName) doesn't match the CSV's own subject_id ($subjectId)";
        continue;
    }

    try {
        $probsArray = json_decode($first['urn_probs'] ?? '', true, 4, JSON_THROW_ON_ERROR);
        $colorsArray = json_decode($first['urn_colors'] ?? '', true, 4, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        $skippedIncomplete[] = "$filename: urn_probs/urn_colors is not valid JSON";
        continue;
    }

    if (!is_array($probsArray) || !is_array($colorsArray) || count($probsArray) !== 4 || count($colorsArray) !== 4) {
        $skippedIncomplete[] = "$filename: urn_probs/urn_colors don't have exactly 4 entries";
        continue;
    }

    $urnProbs = array_combine(URN_KEYS, $probsArray);
    $urnColors = array_combine(URN_KEYS, $colorsArray);

    $scenariosById = [];
    $malformedScenario = false;
    foreach ($submissionRows as $row) {
        $id = (int) ($row['scenario_id'] ?? 0);
        if ($id < 1 || $id > 16 || isset($scenariosById[$id])) {
            $malformedScenario = true;
            break;
        }
        $draw = [];
        foreach (URN_KEYS as $key) {
            $draw[$key] = $row["draw_$key"] ?? '';
        }
        $scenariosById[$id] = [
            'id' => $id,
            'draw' => $draw,
            'result' => $row['result'] ?? '',
            'selected_urn' => $row['selected_urn'] ?? '',
            'selected_color' => $row['selected_color'] ?? '',
        ];
    }

    if ($malformedScenario || count($scenariosById) !== 16) {
        $skippedIncomplete[] = "$filename: scenario_id values aren't exactly 1..16, once each";
        continue;
    }

    ksort($scenariosById);

    $record = [
        'subject_id' => $subjectId,
        'rule_key' => $ruleKey,
        'urn_colors' => $urnColors,
        'urn_probs' => $urnProbs,
        'scenarios' => array_values($scenariosById),
    ];

    $outPath = $availableDir . '/' . $subjectId . '.json';
    $json = json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($outPath, $json) === false) {
        $skippedIncomplete[] = "$filename: failed to write $outPath";
        continue;
    }

    $existingSubjects[$subjectId] = true; // guard against duplicate CSVs for the same subject within this same run
    $created++;
}

echo "=== experiment_1 -> ledger export ===\n";
echo "Created:            $created new record(s) in $availableDir\n";
echo "Already in ledger:  $skippedExisting subject(s) skipped (already available/in_progress/used)\n";
echo "Incomplete/invalid: " . count($skippedIncomplete) . " CSV(s) skipped\n";
foreach ($skippedIncomplete as $reason) {
    echo "  - $reason\n";
}
