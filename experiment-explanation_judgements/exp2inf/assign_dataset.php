<?php
declare(strict_types=1);

// Claims one not-yet-claimed experiment_1 ledger record for this session.
//
// Ledger records are individual JSON files (schema below) dropped into
// datasets/available/ by whatever process exports them from
// nic_experiment1's saved data (see the plan doc / README for the exact
// schema — subject_id, rule_key, urn_colors, urn_probs, and 16 scenarios
// each with draw/result/selected_urn/selected_color).
//
// Claiming is a two-stage move, not a single available -> used step:
// available -> in_progress here, then in_progress -> used only once
// safe_save.php confirms this session actually completed and saved its
// data. That way a claim that never finishes (participant drops out) stays
// visible in in_progress instead of silently looking "used" forever — see
// check_datasets.php, which verifies that invariant holds.
//
// The move itself is a plain rename(): atomic on POSIX, so a request
// claims a file by successfully moving it out of available/ — a losing
// request's rename() simply fails (the source is already gone) and it
// tries the next candidate. No locking needed for the claim itself.

header('Access-Control-Allow-Origin: https://eco.ppls.ed.ac.uk');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/config.php';
$datasetsDir = $config['datasets_dir'];
$availableDir = $datasetsDir . '/available';
$inProgressDir = $datasetsDir . '/in_progress';
$logFile = $config['exp2_data_dir'] . '/assign_log.csv';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fail(int $status, string $message, string $code = ''): never
{
    http_response_code($status);
    echo json_encode(['error' => $message, 'code' => $code]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    fail(405, 'Method not allowed');
}

if (!is_dir($availableDir) || !is_dir($inProgressDir)) {
    fail(500, 'Data directories are unavailable');
}

// Optional, purely for the audit log — validated the same way safe_save.php
// validates filenames, so it can never escape the log line it's written into.
$exp2SubjectId = 'unknown';
if (isset($_GET['exp2_subject_id']) && is_string($_GET['exp2_subject_id'])) {
    $candidate = $_GET['exp2_subject_id'];
    if (preg_match('/\A[A-Za-z0-9_-]{1,100}\z/D', $candidate)) {
        $exp2SubjectId = $candidate;
    }
}

$candidates = glob($availableDir . '/*.json');
if ($candidates === false) {
    fail(500, 'Failed to list available datasets');
}
shuffle($candidates);

$claimedName = null;
$record = null;

foreach ($candidates as $srcPath) {
    $name = basename($srcPath);
    $dstPath = $inProgressDir . DIRECTORY_SEPARATOR . $name;

    if (!@rename($srcPath, $dstPath)) {
        continue; // another request claimed it first (or it's gone) — try the next one
    }

    $raw = file_get_contents($dstPath);
    if ($raw === false) {
        continue;
    }

    try {
        $decoded = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        error_log("assign_dataset.php: skipping malformed ledger file $name: " . $e->getMessage());
        continue; // malformed record — it's already claimed/removed from available/, just skip it
    }

    if (!is_array($decoded) || !isset($decoded['scenarios'])) {
        error_log("assign_dataset.php: skipping ledger file $name — missing required fields");
        continue;
    }

    $claimedName = $name;
    $record = $decoded;
    break;
}

if ($record === null) {
    fail(404, 'No unused experiment_1 data available right now', 'no_data_available');
}

$exp1SubjectId = is_string($record['subject_id'] ?? null) ? $record['subject_id'] : 'unknown';
$logLine = implode(',', [
    date('c'),
    $exp1SubjectId,
    $exp2SubjectId,
    $claimedName,
]) . "\n";
file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);

echo json_encode(['dataset' => $record]);
