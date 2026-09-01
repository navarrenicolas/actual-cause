<?php
declare(strict_types=1);

// Saves this experiment's own participant CSVs. Same validated-append
// pattern as exp2inf/safe_save.php, minus the dataset-ledger promotion —
// this experiment never claims experiment_1 data (see main.js), so
// there's no in_progress/used lifecycle to complete here.

header('Access-Control-Allow-Origin: https://eco.ppls.ed.ac.uk');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/config.php';
$resultsDir = $config['exp2_data_dir'] . '/results';

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

echo json_encode(['status' => 'saved']);
