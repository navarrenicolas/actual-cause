<?php
declare(strict_types=1);

// Saves this experiment's own participant CSVs — a separate directory from
// nic_experiment1's (and from this experiment's own datasets/ ledger),
// same validated-append pattern as nic_experiment1/safe_save.php.
//
// Also completes the dataset lifecycle: once the CSV is safely written, if
// the request identifies which session saved it (exp2_subject_id), this
// looks up which experiment_1 record was assigned to that session (via
// assign_dataset.php's assign_log.csv) and promotes it from
// datasets/in_progress/ to datasets/used/ — the confirmation that this
// claim actually completed, not just started. See check_datasets.php,
// which verifies every used/ record has a matching saved result and vice
// versa. A missing/unmatched exp2_subject_id doesn't fail the save itself
// (saving the participant's data is the primary job here) — it's just
// logged, and check_datasets.php will surface the resulting inconsistency.

header('Access-Control-Allow-Origin: https://eco.ppls.ed.ac.uk');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/config.php';
$resultsDir = $config['exp2_data_dir'] . '/results';
$logFile = $config['exp2_data_dir'] . '/assign_log.csv';
$inProgressDir = $config['datasets_dir'] . '/in_progress';
$usedDir = $config['datasets_dir'] . '/used';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fail(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Method not allowed');
}

if (!str_starts_with(
    strtolower($_SERVER['CONTENT_TYPE'] ?? ''),
    'application/json'
)) {
    fail(415, 'Content-Type must be application/json');
}

$raw = file_get_contents('php://input', false, null, 0, 1_000_001);
if ($raw === false || strlen($raw) > 1_000_000) {
    fail(413, 'Request body is too large');
}

try {
    $obj = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    fail(400, 'Invalid JSON');
}

if (!is_array($obj)
    || !isset($obj['filename'], $obj['filedata'])
    || !is_string($obj['filename'])
    || !is_string($obj['filedata'])) {
    fail(400, 'filename, filedata must be strings');
}

$base = realpath($resultsDir);

if ($base === false || !is_dir($base) || is_link($resultsDir)) {
    fail(500, 'Data directory is unavailable');
}

$filename = $obj['filename'];

if (
    strlen($filename) > 100
    || !preg_match('/\A[A-Za-z0-9][A-Za-z0-9_-]{0,94}\.csv\z/D', $filename)
    || basename($filename) !== $filename
) {
    fail(400, 'Invalid filename');
}

$path = $base . DIRECTORY_SEPARATOR . $filename;

if (is_link($path) || (file_exists($path) && !is_file($path))) {
    fail(400, 'Invalid destination');
}

$filedata = $obj['filedata'];

if (function_exists('mb_check_encoding')) {
    if (!mb_check_encoding($filedata, 'UTF-8')) {
        fail(400, 'filedata must be valid UTF-8');
    }
}

if (strlen($filedata) > 1_000_000) {
    fail(413, 'filedata is too large');
}

$bytes = file_put_contents($path, $filedata, FILE_APPEND | LOCK_EX);

if ($bytes === false) {
    error_log('Failed to write experiment data');
    fail(500, 'Failed to save data');
}

// Promote the assigned dataset from in_progress/ to used/ now that this
// session's data is actually saved. Best-effort: the participant's data is
// already safely written above, so nothing here should turn that into a
// failure response.
$exp2SubjectId = null;
if (isset($obj['exp2_subject_id']) && is_string($obj['exp2_subject_id'])) {
    if (preg_match('/\A[A-Za-z0-9_-]{1,100}\z/D', $obj['exp2_subject_id'])) {
        $exp2SubjectId = $obj['exp2_subject_id'];
    }
}

if ($exp2SubjectId !== null && is_file($logFile)) {
    $datasetFilename = null;
    $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        // Rows are only ever appended, so the last match for this session
        // is the authoritative (most recent) claim.
        foreach ($lines as $line) {
            $fields = explode(',', $line);
            if (count($fields) === 4 && $fields[2] === $exp2SubjectId) {
                $datasetFilename = $fields[3];
            }
        }
    }

    if ($datasetFilename !== null && preg_match('/\A[A-Za-z0-9][A-Za-z0-9_-]{0,94}\.json\z/D', $datasetFilename)) {
        $srcPath = $inProgressDir . DIRECTORY_SEPARATOR . $datasetFilename;
        $dstPath = $usedDir . DIRECTORY_SEPARATOR . $datasetFilename;
        if (is_dir($inProgressDir) && is_dir($usedDir) && !@rename($srcPath, $dstPath)) {
            error_log("safe_save.php: could not promote $datasetFilename to used/ for exp2_subject_id=$exp2SubjectId");
        }
    } else {
        error_log("safe_save.php: no assign_log.csv match for exp2_subject_id=$exp2SubjectId");
    }
}

echo json_encode(['status' => 'saved']);
