<?php
declare(strict_types=1);
require_once __DIR__ . '/save-directory.php';

const DATASET_STATES = ['available', 'in_progress', 'used'];

function datasetDirectory(array $config, string $state): string
{
    return rtrim($config['datasets_dir'], '/') . '/' . $state;
}

function validDatasetFilename(string $name): bool
{
    return preg_match('/\A[A-Za-z0-9][A-Za-z0-9_-]{0,94}\.json\z/D', $name) === 1;
}

// Claims, saves, and exports share this lock; file existence is not a held lock.
function lockDatasetLedger(array $config)
{
    $base = rtrim($config['datasets_dir'], '/');
    if ($base === '') throw new RuntimeException('Dataset directory is not configured');
    createStudyDirectory($base);
    if (!is_writable($base)) throw new RuntimeException('data_harness is not writable by PHP');
    foreach (DATASET_STATES as $state) {
        $dir = datasetDirectory($config, $state);
        createStudyDirectory($dir);
        if (!is_readable($dir) || !is_writable($dir)) {
            throw new RuntimeException('Dataset folder ' . $state . ' must be readable and writable by PHP');
        }
    }
    $lockPath = $base . '/.ledger.lock';
    if (is_link($lockPath)) throw new RuntimeException('Invalid ledger lock');
    $lock = @fopen($lockPath, 'x');
    if ($lock !== false) {
        // The CLI exporter and Apache may have different owners. This file
        // contains no data and needs shared write access for flock users.
        if (!@chmod($lockPath, 0666)) {
            fclose($lock);
            throw new RuntimeException('Could not set ledger lock permissions');
        }
    } else {
        $lock = @fopen($lockPath, 'c');
    }
    if ($lock === false || !flock($lock, LOCK_EX)) throw new RuntimeException('Could not lock dataset ledger');
    return $lock;
}

function datasetLogPath(array $config): string
{
    return rtrim($config['data_dir'], '/') . '/assign_log.csv';
}

function readDatasetClaims(array $config): array
{
    $path = datasetLogPath($config);
    if (!file_exists($path)) return [];
    if (!is_file($path) || is_link($path)) throw new RuntimeException('Invalid assignment log');
    $handle = @fopen($path, 'r');
    if ($handle === false) throw new RuntimeException('Could not read assignment log');
    $rows = [];
    while (($fields = fgetcsv($handle, 0, ',', '"', '')) !== false) {
        if (count($fields) !== 4) continue;
        $rows[] = ['timestamp' => $fields[0], 'exp1_subject_id' => $fields[1],
            'exp2_subject_id' => $fields[2], 'filename' => $fields[3]];
    }
    fclose($handle);
    return $rows;
}

function findDatasetClaim(array $claims, string $field, string $value): ?array
{
    $found = null;
    foreach ($claims as $claim) if ($claim[$field] === $value) $found = $claim;
    return $found;
}

// Each filename may exist in only one queue state.
function locateDataset(array $config, string $name): ?string
{
    if (!validDatasetFilename($name)) throw new RuntimeException('Invalid dataset filename');
    $found = null;
    foreach (DATASET_STATES as $state) {
        $path = datasetDirectory($config, $state) . '/' . $name;
        if (is_link($path)) throw new RuntimeException('Invalid dataset path');
        if (!file_exists($path)) continue;
        if (!is_file($path) || $found !== null) throw new RuntimeException('Duplicate or invalid dataset in queue');
        $found = $state;
    }
    return $found;
}

function readDatasetRecord(string $path): array
{
    $raw = @file_get_contents($path);
    if ($raw === false) throw new RuntimeException('Could not read dataset');
    $record = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
    if (!is_array($record) || !is_string($record['subject_id'] ?? null)
        || !preg_match('/\A[A-Za-z0-9_-]{1,100}\z/D', $record['subject_id'])
        || !in_array($record['rule_key'] ?? null, ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'], true)
        || !is_array($record['scenarios'] ?? null) || !array_is_list($record['scenarios'])
        || count($record['scenarios']) !== 16) throw new RuntimeException('Invalid dataset fields');
    foreach (['A', 'B', 'C', 'D'] as $key) {
        if (!is_string($record['urn_colors'][$key] ?? null) || $record['urn_colors'][$key] === ''
            || !is_numeric($record['urn_probs'][$key] ?? null)
            || $record['urn_probs'][$key] < 0 || $record['urn_probs'][$key] > 1) {
            throw new RuntimeException('Invalid urn configuration');
        }
    }
    $ids = [];
    foreach ($record['scenarios'] as $sc) {
        if (!is_array($sc) || !is_int($sc['id'] ?? null) || $sc['id'] < 1 || $sc['id'] > 16
            || isset($ids[$sc['id']]) || !in_array($sc['result'] ?? null, ['win', 'lose'], true)) {
            throw new RuntimeException('Invalid dataset scenarios');
        }
        $ids[$sc['id']] = true;
        foreach (['A', 'B', 'C', 'D'] as $key) {
            if (!in_array($sc['draw'][$key] ?? null, [$record['urn_colors'][$key], 'lightgrey'], true)) {
                throw new RuntimeException('Invalid scenario draw');
            }
        }
    }
    return $record;
}

// Called after CSV publication under the ledger lock. Saving an old/reset
// session is allowed, but only the latest claimant may advance the queue.
function completeDatasetClaim(array $config, string $subjectId): string
{
    $claims = readDatasetClaims($config);
    $claim = findDatasetClaim($claims, 'exp2_subject_id', $subjectId);
    if ($claim === null) return 'unassigned'; // random fallback or legacy sessions
    $latest = findDatasetClaim($claims, 'filename', $claim['filename']);
    $state = locateDataset($config, $claim['filename']);
    if ($latest['exp2_subject_id'] !== $subjectId || $state === 'available') return 'superseded';
    if ($state === 'used') return 'used'; // idempotent retry
    if ($state !== 'in_progress') throw new RuntimeException('Assigned dataset is missing');
    $src = datasetDirectory($config, 'in_progress') . '/' . $claim['filename'];
    $dst = datasetDirectory($config, 'used') . '/' . $claim['filename'];
    if (!@rename($src, $dst)) throw new RuntimeException('Could not complete dataset claim');
    return 'used';
}
