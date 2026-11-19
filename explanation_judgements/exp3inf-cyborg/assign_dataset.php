<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: https://eco.ppls.ed.ac.uk');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
function fail(int $status, string $message, string $code = ''): never
{
    http_response_code($status);
    echo json_encode(['error' => $message, 'code' => $code]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail(405, 'Method not allowed');
$subjectId = $_GET['exp2_subject_id'] ?? null;
if (!is_string($subjectId) || !preg_match('/\A[A-Za-z0-9_-]{1,100}\z/D', $subjectId)) {
    fail(400, 'A valid exp2_subject_id is required');
}
$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/dataset-ledger.php';
$stage = 'ledger';
try {
    $lock = lockDatasetLedger($config);
    // Repeated requests for the same participant retain their original claim.
    $stage = 'assignment_log_read';
    $claims = readDatasetClaims($config);
    $claim = findDatasetClaim($claims, 'exp2_subject_id', $subjectId);
    if ($claim !== null) {
        $stage = 'existing_assignment';
        $latest = findDatasetClaim($claims, 'filename', $claim['filename']);
        $state = locateDataset($config, $claim['filename']);
        if ($latest['exp2_subject_id'] !== $subjectId || $state === 'available') {
            fail(409, 'This assignment has been reset', 'assignment_reset');
        }
        if ($state === null) throw new RuntimeException('Assigned dataset is missing');
        $record = readDatasetRecord(datasetDirectory($config, $state) . '/' . $claim['filename']);
        echo json_encode(['dataset' => $record]);
        exit;
    }
    $stage = 'dataset_scan';
    $candidates = glob(datasetDirectory($config, 'available') . '/*.json');
    if ($candidates === false) throw new RuntimeException('Could not list datasets');
    shuffle($candidates);
    foreach ($candidates as $src) {
        $name = basename($src);
        if (!validDatasetFilename($name)) continue;
        if (locateDataset($config, $name) !== 'available') continue;
        try {
            $record = readDatasetRecord($src);
        } catch (RuntimeException | JsonException $e) {
            error_log("assign_dataset.php: skipping $name: " . $e->getMessage());
            continue; // leave malformed data in place for inspection
        }
        $stage = 'save_directory';
        ensureSaveDirectory($config);
        $stage = 'dataset_move';
        $dst = datasetDirectory($config, 'in_progress') . '/' . $name;
        if (!@rename($src, $dst)) throw new RuntimeException('Could not claim dataset');
        $stage = 'assignment_log_write';
        $line = implode(',', [date('c'), $record['subject_id'], $subjectId, $name]) . "\n";
        if (@file_put_contents(datasetLogPath($config), $line, FILE_APPEND | LOCK_EX) !== strlen($line)) {
            if (!@rename($dst, $src)) error_log("assign_dataset.php: could not roll back $name");
            throw new RuntimeException('Could not log dataset assignment');
        }
        echo json_encode(['dataset' => $record]);
        exit;
    }
    fail(404, 'No datasets are available right now', 'no_data_available');
} catch (RuntimeException | JsonException $e) {
    error_log('assign_dataset.php: [' . $stage . '] ' . $e->getMessage());
    fail(500, $e->getMessage(), 'allocation_' . $stage . '_failed');
}
