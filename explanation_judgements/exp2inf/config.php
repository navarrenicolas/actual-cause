<?php
declare(strict_types=1);

// Central runtime configuration for inference_experiment2's PHP endpoints
// (assign_dataset.php, safe_save.php) and the static checker
// (check_datasets.php). Every script that touches the filesystem should
// `require` this file rather than hardcoding a path directly, so there's
// exactly one place to point at the real server locations before
// deploying.
//
// Flip 'mock_mode' to true to run everything against the local
// test-harness/ fixture instead of the real directories below — this is a
// server-side switch (affects assign_dataset.php/safe_save.php/
// check_datasets.php no matter who calls them), independent of
// main.html's own client-side ?mock=1 preview, which bypasses the PHP
// endpoints entirely and never touches the filesystem at all.
//
// Directory roles:
//   exp2_data_dir  - where THIS experiment's own completed participant
//                    CSVs are saved (safe_save.php), plus assign_log.csv.
//   exp1_data_dir  - where nic_experiment1 (experiment_1)'s raw saved CSVs
//                    live. Only check_datasets.php reads this — it's never
//                    written to by anything here.
//   datasets_dir   - the ledger: datasets_dir/available, .../in_progress,
//                    .../used. A record moves available -> in_progress the
//                    moment assign_dataset.php claims it, then
//                    in_progress -> used only once safe_save.php confirms
//                    that session actually completed and saved its data —
//                    so a claim that never finishes stays visible in
//                    in_progress instead of silently looking "used."

$config = [
    'mock_mode' => true,

    'real' => [
        'exp2_data_dir' => '/home/s2518809/server_data/cs/exp2inf/exp2inf-0',
        'exp1_data_dir' => '/home/s2518809/server_data/cs/exp1cs/exp1cs-1',
        'datasets_dir'  => '/home/s2518809/server_data/cs/exp2inf/datasets',
    ],

    'mock' => [
        'exp2_data_dir' => __DIR__ . '/test-harness/server_data/exp2inf-0/',
        'exp1_data_dir' => __DIR__ . '/test-harness/server_data/exp1cs-1',
        'datasets_dir'  => __DIR__ . '/test-harness/server_data/inference_exp2/datasets',
    ],
];

return $config['mock_mode'] ? $config['mock'] : $config['real'];
