<?php
declare(strict_types=1);

// Export each complete experiment_1 participant into two independent queues.
// Existing records in any state of a condition are never overwritten/reset.
// If just one condition has a record, seed the other from that exact JSON.

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "export_exp1_datasets.php is a command-line tool only (php export_exp1_datasets.php).\n";
    exit(1);
}

$config = require __DIR__ . '/config.php';
$exp1DataDir = $config['exp1_data_dir'];
require_once __DIR__ . '/dataset-ledger.php';

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
    $header = fgetcsv($fh, 0, ',', '"', '');
    if ($header === false) {
        fclose($fh);
        return null;
    }
    $rows = [];
    while (($fields = fgetcsv($fh, 0, ',', '"', '')) !== false) {
        if (count($fields) !== count($header)) {
            continue; // malformed line — skip rather than misalign columns
        }
        $rows[] = array_combine($header, $fields);
    }
    fclose($fh);
    return $rows;
}

function listExistingLedgerSubjects(array $config, string $condition): array
{
    $subjects = [];
    foreach (DATASET_STATES as $state) {
        foreach (glob(datasetDirectory($config, $condition, $state) . '/*.json') ?: [] as $path) {
            if (is_link($path)) throw new RuntimeException('Invalid ledger path');
            $record = readDatasetRecord($path);
            $id = $record['subject_id'];
            if (isset($subjects[$id])) throw new RuntimeException("Duplicate $condition dataset for $id");
            $subjects[$id] = $path;
        }
    }
    return $subjects;
}

function publishDatasetCopies(array $config, array $record, array &$existing): int
{
    $id = $record['subject_id'];
    $name = $id . '.json';
    if (!validDatasetFilename($name)) throw new RuntimeException('Invalid exported dataset filename');
    $json = json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $created = 0;
    foreach (DATASET_CONDITIONS as $condition) {
        if (isset($existing[$condition][$id])) continue;
        $dir = datasetDirectory($config, $condition, 'available');
        $path = $dir . '/' . $name;
        if (locateDataset($config, $condition, $name) !== null) throw new RuntimeException('Export destination already exists');
        $temp = @tempnam($dir, '.export-');
        if ($temp === false || dirname($temp) !== realpath($dir)
            || @file_put_contents($temp, $json) !== strlen($json)
            || !@chmod($temp, 0666 & ~umask()) || !@rename($temp, $path)) {
            if ($temp !== false) @unlink($temp);
            throw new RuntimeException('Could not publish exported dataset');
        }
        $existing[$condition][$id] = $path;
        $created++;
    }
    return $created;
}

if (!is_dir($exp1DataDir)) {
    fwrite(STDERR, "ERROR: exp1_data_dir does not exist: $exp1DataDir\n");
    exit(1);
}
try {
    $lock = lockDatasetLedger($config);
    $existingSubjects = [];
    foreach (DATASET_CONDITIONS as $condition) {
        $existingSubjects[$condition] = listExistingLedgerSubjects($config, $condition);
    }
} catch (RuntimeException | JsonException $e) {
    fwrite(STDERR, "ERROR: " . $e->getMessage() . "\n");
    exit(1);
}

$created = 0;
$skippedExisting = 0;
$skippedIncomplete = [];

foreach (glob($exp1DataDir . '/causal_exp1_*.csv') ?: [] as $csvPath) {
    $filename = basename($csvPath);
    $subjectIdFromName = subjectIdFromFilename($filename);
    if ($subjectIdFromName === null) {
        continue;
    }

    if (isset($existingSubjects['explanation'][$subjectIdFromName], $existingSubjects['no_explanation'][$subjectIdFromName])) {
        $skippedExisting++;
        continue;
    }
    $existingPath = $existingSubjects['explanation'][$subjectIdFromName]
        ?? $existingSubjects['no_explanation'][$subjectIdFromName] ?? null;
    if ($existingPath !== null) {
        try {
            $created += publishDatasetCopies($config, readDatasetRecord($existingPath), $existingSubjects);
        } catch (RuntimeException | JsonException $e) {
            $skippedIncomplete[] = "$filename: " . $e->getMessage();
        }
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

    try {
        $created += publishDatasetCopies($config, $record, $existingSubjects);
    } catch (RuntimeException | JsonException $e) {
        $skippedIncomplete[] = "$filename: " . $e->getMessage();
    }

}

echo "=== experiment_1 -> ledger export ===\n";
echo "Created:            $created new queue record(s)\n";
echo "Already in ledger:  $skippedExisting subject(s) skipped (already present in both condition queues)\n";
echo "Incomplete/invalid: " . count($skippedIncomplete) . " CSV(s) skipped\n";
foreach ($skippedIncomplete as $reason) {
    echo "  - $reason\n";
}
