<?php
declare(strict_types=1);

// Validate each condition independently. Cross-condition copies are expected;
// duplicates within a condition are errors. Never move/reset a dataset here.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Run php check_datasets.php from the command line.'); }
$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/dataset-ledger.php';
$errors = [];
$notes = [];
try {
    $lock = lockDatasetLedger($config);
    if (!is_dir($config['exp1_data_dir'])) throw new RuntimeException('exp1_data_dir does not exist');
    $exp1Ids = [];
    foreach (glob($config['exp1_data_dir'] . '/causal_exp1_*.csv') ?: [] as $path) {
        $exp1Ids[substr(basename($path), strlen('causal_exp1_'), -4)] = true;
    }
    $paired = [];
    foreach (DATASET_CONDITIONS as $condition) {
        echo "=== $condition ===\n";
        $records = [];
        $subjects = [];
        foreach (DATASET_STATES as $state) {
            $dir = datasetDirectory($config, $condition, $state);
            $paths = glob($dir . '/*.json') ?: [];
            echo basename($dir) . ': ' . count($paths) . "\n";
            foreach ($paths as $path) {
                $name = basename($path);
                try {
                    if (!validDatasetFilename($name) || is_link($path)) throw new RuntimeException('Invalid filename');
                    $record = readDatasetRecord($path);
                } catch (RuntimeException | JsonException $e) {
                    $errors[] = "$condition/$name: " . $e->getMessage();
                    continue;
                }
                $id = $record['subject_id'];
                if (isset($records[$name]) || isset($subjects[$id])) $errors[] = "$condition: duplicate record for $id";
                $records[$name] = ['state' => $state, 'subject_id' => $id];
                $subjects[$id] = $name;
                // Compare the rule, urns, draws, outcomes and their order. Selection
                // fields may be omitted in a manually prepared no-explanation copy.
                $core = datasetForCondition($record, 'no_explanation');
                if (isset($paired[$id]) && $paired[$id] != $core) $errors[] = "$id: condition copies contain different task data/order";
                $paired[$id] = $core;
                if (!isset($exp1Ids[$id])) $errors[] = "$condition/$id has no experiment_1 CSV";
            }
        }
        foreach ($exp1Ids as $id => $_) if (!isset($subjects[$id])) $errors[] = "$condition/$id has no dataset copy";
        $results = [];
        $root = rtrim($config[$condition]['exp2_data_dir'], '/');
        $prefix = $condition === 'explanation' ? 'causal_inf_exp2_' : 'causal_inf_exp2_noexpl_';
        // Read legacy no-explanation output too; all new writes use data/.
        foreach ($condition === 'no_explanation' ? [$root, $root . '/data'] : [$root . '/data'] as $dir) {
            foreach (glob($dir . '/' . $prefix . '*.csv') ?: [] as $path) {
                if (filesize($path) > 0) $results[substr(basename($path), strlen($prefix), -4)] = true;
            }
        }
        $latest = [];
        $sessions = [];
        foreach (readDatasetClaims($config, $condition) as $claim) {
            $name = $claim['filename'];
            $sid = $claim['exp2_subject_id'];
            $latest[$name] = $claim;
            if (isset($sessions[$sid]) && $sessions[$sid] !== $name) $errors[] = "$condition/$sid claimed multiple datasets";
            $sessions[$sid] = $name;
            if (!isset($records[$name]) || $records[$name]['subject_id'] !== $claim['exp1_subject_id']) {
                $errors[] = "$condition/$sid has a missing/mismatched dataset: $name";
            }
        }
        foreach ($records as $name => $record) {
            $claim = $latest[$name] ?? null;
            $sid = $claim['exp2_subject_id'] ?? '';
            $saved = isset($results[$sid]);
            if ($record['state'] === 'available') {
                if ($claim !== null) $notes[] = "$condition/$name: manually reset; previous claimant $sid is no longer active";
            } elseif ($claim === null) {
                $errors[] = "$condition/$name is {$record['state']} but has no assignment log entry";
            } elseif ($record['state'] === 'used' && !$saved) {
                $errors[] = "$condition/$name is used but $sid has no saved CSV";
            } elseif ($record['state'] === 'in_progress') {
                if ($saved) $errors[] = "$condition/$name: $sid saved but dataset remains in_progress";
                else $notes[] = "$condition/$name: pending participant $sid";
            }
        }
        foreach ($results as $sid => $_) {
            if (!isset($sessions[$sid])) $notes[] = "$condition/$sid has saved data without a claim (random fallback or legacy session)";
        }
        echo count($results) . " saved CSVs\n";
    }
} catch (RuntimeException $e) {
    $errors[] = $e->getMessage();
}
foreach ($notes as $note) echo "NOTE: $note\n";
foreach ($errors as $error) echo "ERROR: $error\n";
if ($errors) exit(1);
echo "All checks passed.\n";
