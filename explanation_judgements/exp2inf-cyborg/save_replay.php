<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: https://eco.ppls.ed.ac.uk');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function replayFail(int $status, string $message): never {
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') replayFail(405, 'Method not allowed');
if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
    replayFail(415, 'Content-Type must be application/json');
}
// DOM replays include stylesheets and can be much larger than participant CSVs.
$limit = 64 * 1024 * 1024;
$raw = file_get_contents('php://input', false, null, 0, $limit + 1);
if ($raw === false || strlen($raw) > $limit) replayFail(413, 'Replay is too large');
try {
    $obj = json_decode($raw, false, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    replayFail(400, 'Invalid JSON');
}
if (!is_object($obj)) replayFail(400, 'Request must be a JSON object');
$recording = $obj->recording ?? null;
$condition = $obj->condition ?? null;
$format = $obj->format ?? 'json';
if (!in_array($format, ['json', 'csv'], true)) replayFail(400, 'Invalid replay format');
if (!in_array($condition, ['explanation', 'no_explanation'], true)
    || !is_object($recording)
    || ($recording->schema_version ?? null) !== 2
    || !is_array($recording->segments ?? null)
    || !is_string($recording->participant_id ?? null)
    || !preg_match('/\A[A-Za-z0-9_-]{1,100}\z/D', $recording->participant_id)
    || !is_string($recording->recording_started_at ?? null)
    || strtotime($recording->recording_started_at) === false) {
    replayFail(400, 'Invalid recording or condition');
}
$config = require __DIR__ . '/config.php';
$parent = $config[$condition]['exp2_data_dir'];
// Match safe_save.php: explanation CSVs use /data; no-explanation CSVs
// are stored directly in their configured exp2_data_dir.
$dir = $condition === 'explanation' ? $parent . '/data' : rtrim($parent, '/');
if (!is_dir($parent) || is_link(rtrim($parent, '/')) || is_link($dir)) {
    replayFail(500, 'Replay directory is unavailable');
}
$base = realpath($dir);
if ($base === false || !is_dir($base) || is_link($dir) || !is_writable($base)) {
    replayFail(500, 'Replay directory is unavailable');
}
// A stable name makes retries replace the same recording, never append JSON.
$filename = $recording->participant_id . '-replay-'
    . substr(hash('sha256', $recording->recording_started_at), 0, 16) . '.' . $format;
$path = $base . DIRECTORY_SEPARATOR . $filename;
if (is_link($path) || (file_exists($path) && !is_file($path))) {
    replayFail(400, 'Invalid destination');
}
$json = json_encode($recording, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
if ($format === 'csv') {
    $stream = fopen('php://temp', 'w+');
    if ($stream === false) replayFail(500, 'Could not encode replay');
    $headerWritten = fputcsv($stream, ['replay_csv_version', 'participant_id', 'recording_started_at', 'replay_json'], ',', '"', '');
    $rowWritten = fputcsv($stream, ['1', $recording->participant_id, $recording->recording_started_at, $json], ',', '"', '');
    rewind($stream);
    $csv = stream_get_contents($stream);
    fclose($stream);
    if ($headerWritten === false || $rowWritten === false || $csv === false) replayFail(500, 'Could not encode replay');
    $json = $csv;
}
$temp = @tempnam($base, '.replay-');
// tempnam can fall back to the system temp directory: reject that fallback.
if ($temp === false || dirname($temp) !== $base) {
    if ($temp !== false) @unlink($temp);
    error_log('save_replay.php: could not create replay temporary file');
    replayFail(500, 'Could not save replay');
}
if (@file_put_contents($temp, $json, LOCK_EX) !== strlen($json)) {
    @unlink($temp);
    error_log('save_replay.php: failed to write replay');
    replayFail(500, 'Could not save replay');
}
// tempnam() forces 0600; rename() would preserve that restrictive mode.
// Match a NEW CSV created by safe_save.php's file_put_contents(): 0666
// filtered by the PHP worker's umask (normally 0022, giving 0644).
// Set permissions only after the recording is complete, before publishing it.
$fileMode = 0666 & ~umask();
if (!@chmod($temp, $fileMode)) {
    @unlink($temp);
    error_log('save_replay.php: failed to set replay permissions');
    replayFail(500, 'Could not set replay permissions');
}
if (!@rename($temp, $path)) {
    @unlink($temp);
    error_log('save_replay.php: failed to publish replay');
    replayFail(500, 'Could not save replay');
}
echo json_encode(['status' => 'saved', 'filename' => $filename]);
