<?php
declare(strict_types=1);

// Save a full participant CSV, then complete only this condition's claim.
// A reset/superseded participant can save data but cannot advance another claim.

header('Access-Control-Allow-Origin: https://eco.ppls.ed.ac.uk');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/dataset-ledger.php';

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

$condition = $obj['condition'] ?? 'explanation';
if (!in_array($condition, DATASET_CONDITIONS, true)) fail(400, 'Invalid condition');
try {
    $base = ensureSaveDirectory($config, $condition);
} catch (RuntimeException $e) {
    error_log('safe_save.php: ' . $e->getMessage());
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

$subjectId = $obj['exp2_subject_id'] ?? null;
if ($subjectId !== null && (!is_string($subjectId) || !preg_match('/\A[A-Za-z0-9_-]{1,100}\z/D', $subjectId))) {
    fail(400, 'Invalid exp2_subject_id');
}
if ($subjectId !== null) {
    $prefix = $condition === 'explanation' ? 'causal_inf_exp2_' : 'causal_inf_exp2_noexpl_';
    if ($filename !== $prefix . $subjectId . '.csv') fail(400, 'Filename does not match participant');
}
$temp = false;
try {
    $lock = lockDatasetLedger($config);
    if ($subjectId !== null) {
        $other = $condition === 'explanation' ? 'no_explanation' : 'explanation';
        if (findDatasetClaim(readDatasetClaims($config, $other), 'exp2_subject_id', $subjectId) !== null) {
            fail(409, 'Condition does not match assignment');
        }
    }
    // Atomic full snapshots make save retries safe, including after a failed
    // promotion. Existing participant data are never appended a second time.
    $temp = @tempnam($base, '.csv-');
    if ($temp === false || dirname($temp) !== $base
        || @file_put_contents($temp, $filedata, LOCK_EX) !== strlen($filedata)
        || !@chmod($temp, 0666 & ~umask()) || !@rename($temp, $path)) {
        throw new RuntimeException('Could not save participant CSV');
    }
    $temp = false;
    $state = $subjectId === null ? 'unassigned' : completeDatasetClaim($config, $condition, $subjectId);
    echo json_encode(['status' => 'saved', 'dataset_status' => $state]);
} catch (RuntimeException $e) {
    if ($temp !== false) @unlink($temp);
    error_log('safe_save.php: ' . $e->getMessage());
    fail(500, 'Could not finish saving data; please retry');
}
