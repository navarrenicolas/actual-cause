<?php
declare(strict_types=1);

// Static consistency checker for the experiment_1 -> experiment_2 dataset
// ledger. Run from the command line: `php check_datasets.php` (uses
// config.php's mock_mode like everything else — flip it there to check
// the test-harness fixture instead of production). Prints a report and
// exits non-zero if it finds anything wrong, so it's safe to wire into a
// cron job or CI check later.
//
// Two checks, matching the two ways the ledger can drift from reality:
//
// 1. Every experiment_1 subject (found from nic_experiment1's own saved
//    CSVs, exp1_data_dir/causal_exp1_*.csv) should have exactly one
//    ledger record, and it should be in exactly one of
//    datasets/{available,in_progress,used}. This catches records that
//    were never exported, duplicated across folders, or that don't
//    correspond to any real experiment_1 participant.
//
// 2. Every record in datasets/used/ should have a matching *completed and
//    saved* experiment_2 result (exp2_data_dir/results/causal_inf_exp2_*.csv),
//    traced through assign_log.csv (which session claimed which record).
//    Symmetrically, every claim recorded in assign_log.csv that hasn't
//    produced a saved result yet should still be sitting in
//    datasets/in_progress/ — not lost, and not incorrectly promoted to
//    used/ without actually finishing. This is exactly the invariant
//    safe_save.php's in_progress -> used promotion is supposed to
//    maintain.

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "check_datasets.php is a command-line tool only (php check_datasets.php).\n";
    exit(1);
}

$config = require __DIR__ . '/config.php';
$exp1DataDir = $config['exp1_data_dir'];
$exp2DataDir = $config['exp2_data_dir'];
$datasetsDir = $config['datasets_dir'];
$resultsDir = $exp2DataDir . '/results';
$logFile = $exp2DataDir . '/assign_log.csv';

/** Subject id from a causal_exp1_<id>.csv or causal_inf_exp2_<id>.csv filename. */
function subjectIdFromCsvFilename(string $filename, string $prefix): ?string
{
    if (preg_match('/\A' . preg_quote($prefix, '/') . '(.+)\.csv\z/D', $filename, $m)) {
        return $m[1];
    }
    return null;
}

/** @return array<string, string> subject_id => absolute file path */
function listCsvSubjects(string $dir, string $prefix): array
{
    $subjects = [];
    foreach (glob($dir . '/*.csv') ?: [] as $path) {
        $id = subjectIdFromCsvFilename(basename($path), $prefix);
        if ($id !== null) {
            $subjects[$id] = $path;
        }
    }
    return $subjects;
}

/** @return array<string, string> subject_id (from the JSON's own `subject_id` field) => filename */
function listLedgerSubjects(string $dir): array
{
    $subjects = [];
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
            $subjects[$decoded['subject_id']] = basename($path);
        }
    }
    return $subjects;
}

/** @return list<array{timestamp: string, exp1_subject_id: string, exp2_subject_id: string, filename: string}> */
function readAssignLog(string $logFile): array
{
    if (!is_file($logFile)) {
        return [];
    }
    $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $rows = [];
    foreach ($lines as $line) {
        $fields = explode(',', $line);
        if (count($fields) === 4) {
            $rows[] = [
                'timestamp' => $fields[0],
                'exp1_subject_id' => $fields[1],
                'exp2_subject_id' => $fields[2],
                'filename' => $fields[3],
            ];
        }
    }
    return $rows;
}

$errors = [];
$notes = [];

if (!is_dir($exp1DataDir)) {
    $errors[] = "exp1_data_dir does not exist: $exp1DataDir";
}
if (!is_dir($datasetsDir)) {
    $errors[] = "datasets_dir does not exist: $datasetsDir";
}
if (!empty($errors)) {
    foreach ($errors as $e) {
        fwrite(STDERR, "ERROR: $e\n");
    }
    exit(1);
}

$exp1Subjects = listCsvSubjects($exp1DataDir, 'causal_exp1_');
$availableSubjects = listLedgerSubjects($datasetsDir . '/available');
$inProgressSubjects = listLedgerSubjects($datasetsDir . '/in_progress');
$usedSubjects = listLedgerSubjects($datasetsDir . '/used');
$resultSubjects = listCsvSubjects($resultsDir, 'causal_inf_exp2_');
$assignLog = readAssignLog($logFile);

echo "=== Dataset consistency check ===\n";
echo "exp1_data_dir:  $exp1DataDir (" . count($exp1Subjects) . " subjects)\n";
echo "datasets_dir:   $datasetsDir\n";
echo "  available:    " . count($availableSubjects) . "\n";
echo "  in_progress:  " . count($inProgressSubjects) . "\n";
echo "  used:         " . count($usedSubjects) . "\n";
echo "exp2 results:   $resultsDir (" . count($resultSubjects) . " saved)\n";
echo "assign_log.csv: " . count($assignLog) . " claim(s)\n\n";

// ----- Check 1: available ∪ used should equal the original experiment_1 subjects -----
echo "--- Check 1: available + used subjects vs. original experiment_1 subjects ---\n";

$errorsBeforeCheck1 = count($errors);

$combinedAvailableUsed = array_unique(array_merge(array_keys($availableSubjects), array_keys($usedSubjects)));
$exp1Ids = array_keys($exp1Subjects);

$missingFromCombined = array_diff($exp1Ids, $combinedAvailableUsed);
foreach ($missingFromCombined as $id) {
    if (isset($inProgressSubjects[$id])) {
        $notes[] = "$id is not in available/ or used/, but is correctly in in_progress/ (claimed, not yet completed) — OK";
    } else {
        $errors[] = "$id is an experiment_1 subject but has no ledger record in available/, in_progress/, or used/ (lost record)";
    }
}

$extraInCombined = array_diff($combinedAvailableUsed, $exp1Ids);
foreach ($extraInCombined as $id) {
    $errors[] = "$id appears in available/ or used/ but is not an experiment_1 subject (fabricated or mismatched record)";
}

// A record filed in more than one folder at once is always a bug,
// regardless of what check 1's literal available+used comparison catches.
foreach (array_keys($availableSubjects) as $id) {
    if (isset($inProgressSubjects[$id])) {
        $errors[] = "$id is in both available/ and in_progress/";
    }
    if (isset($usedSubjects[$id])) {
        $errors[] = "$id is in both available/ and used/";
    }
}
foreach (array_keys($inProgressSubjects) as $id) {
    if (isset($usedSubjects[$id])) {
        $errors[] = "$id is in both in_progress/ and used/";
    }
}

echo count($errors) === $errorsBeforeCheck1
    ? "OK — every experiment_1 subject is accounted for in available/, in_progress/, or used/, with no duplicates.\n\n"
    : "See errors below.\n\n";

// ----- Check 2: used <-> completed results, and in-progress claims stay in in_progress -----
echo "--- Check 2: used/ vs. completed experiment_2 results ---\n";

// Most recent claim per experiment_1 subject wins, matching safe_save.php's lookup.
$latestClaimByExp1Subject = [];
foreach ($assignLog as $row) {
    $latestClaimByExp1Subject[$row['exp1_subject_id']] = $row;
}

foreach (array_keys($usedSubjects) as $exp1Id) {
    if (!isset($latestClaimByExp1Subject[$exp1Id])) {
        $errors[] = "$exp1Id is in used/ but has no assign_log.csv entry — can't tell which session it was assigned to";
        continue;
    }
    $exp2Id = $latestClaimByExp1Subject[$exp1Id]['exp2_subject_id'];
    if (!isset($resultSubjects[$exp2Id])) {
        $errors[] = "$exp1Id is in used/ (claimed by exp2 subject $exp2Id) but no saved result exists for $exp2Id in $resultsDir";
    }
}

foreach ($latestClaimByExp1Subject as $exp1Id => $row) {
    if (isset($usedSubjects[$exp1Id])) {
        continue; // already checked above
    }
    $exp2Id = $row['exp2_subject_id'];
    if (isset($resultSubjects[$exp2Id])) {
        $errors[] = "exp2 subject $exp2Id completed and saved a result, but its claimed dataset ($exp1Id) was never promoted to used/ (still in " . (isset($inProgressSubjects[$exp1Id]) ? 'in_progress/' : 'available/ or missing entirely') . ")";
    } elseif (isset($inProgressSubjects[$exp1Id])) {
        $notes[] = "$exp1Id is claimed by exp2 subject $exp2Id with no result yet, and is correctly parked in in_progress/ — OK";
    } elseif (isset($availableSubjects[$exp1Id])) {
        $errors[] = "$exp1Id was claimed (assign_log.csv) but is back in available/ instead of in_progress/ or used/";
    } else {
        $errors[] = "$exp1Id was claimed (assign_log.csv) but its record isn't in available/, in_progress/, or used/ (lost record)";
    }
}

echo "\n";

if (!empty($notes)) {
    echo "--- Notes ---\n";
    foreach ($notes as $n) {
        echo "  $n\n";
    }
    echo "\n";
}

if (!empty($errors)) {
    echo "--- " . count($errors) . " error(s) ---\n";
    foreach ($errors as $e) {
        echo "  ERROR: $e\n";
    }
    exit(1);
}

echo "All checks passed.\n";
exit(0);
