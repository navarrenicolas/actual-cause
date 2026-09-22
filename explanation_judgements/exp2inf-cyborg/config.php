<?php
declare(strict_types=1);

// Central runtime configuration for exp2inf's PHP endpoints
// (assign_dataset.php, safe_save.php) and the static checker
// (check_datasets.php). Every script that touches the filesystem should
// `require` this file rather than hardcoding a path directly, so there's
// exactly one place to point at the real server locations before
// deploying.
//
// This single deployment now runs BOTH conditions (see main.js: it tries
// to claim a real experiment_1 record and runs as "explanation"; once
// experiment_1 data runs out, it falls back to generating a rule/urn
// config client-side and runs the same session as "no_explanation" — the
// same condition exp2noexpl's separate deployment covers). Each condition
// writes its completed participant CSVs to its own directory, so
// exp2_data_dir is nested under 'explanation'/'no_explanation' below.
//
// Flip 'mock_mode' to true to run everything against the local
// test-harness/ fixture instead of the real directories below — this is a
// server-side switch (affects assign_dataset.php/safe_save.php/
// check_datasets.php no matter who calls them), independent of
// main.html's own client-side ?mock=1 preview, which bypasses the PHP
// endpoints entirely and never touches the filesystem at all.
//
// Directory roles:
//   explanation.exp2_data_dir    - where "explanation"-condition
//                                  participant CSVs are saved
//                                  (safe_save.php), plus assign_log.csv
//                                  (only this condition ever claims a
//                                  ledger record, so its log lives here).
//   no_explanation.exp2_data_dir - where "no_explanation"-condition
//                                  participant CSVs are saved. No ledger
//                                  involved for this condition, so no
//                                  assign_log.csv or /data subdirectory
//                                  here — mirrors exp2noexpl's own
//                                  config.php, which this path was copied
//                                  from.
//   exp1_data_dir                - where nic_experiment1 (experiment_1)'s
//                                  raw saved CSVs live. Only
//                                  check_datasets.php reads this — it's
//                                  never written to by anything here.
//   datasets_dir                 - the ledger: datasets_dir/available,
//                                  .../in_progress, .../used. A record
//                                  moves available -> in_progress the
//                                  moment assign_dataset.php claims it,
//                                  then in_progress -> used only once
//                                  safe_save.php confirms that session
//                                  actually completed and saved its data —
//                                  so a claim that never finishes stays
//                                  visible in in_progress instead of
//                                  silently looking "used."

$config = [
    'mock_mode' => false,

    'real' => [
        'explanation' => [
            'exp2_data_dir' => '/home/s2518809/server_data/cs/exp2inf/exp2inf-0',
        ],
        'no_explanation' => [
            'exp2_data_dir' => '/home/s2518809/server_data/cs/exp2inf/exp2noexpl/data-0',
        ],
        'exp1_data_dir' => '/home/s2518809/server_data/cs/exp1cs/exp1cs-1',
        'datasets_dir'  => '/home/s2518809/server_data/cs/exp2inf/datasets',
    ],

    'mock' => [
        'explanation' => [
            'exp2_data_dir' => __DIR__ . '/test-harness/server_data/exp2inf-0/',
        ],
        'no_explanation' => [
            'exp2_data_dir' => __DIR__ . '/test-harness/server_data/exp2noexpl-0',
        ],
        'exp1_data_dir' => __DIR__ . '/test-harness/server_data/exp1cs-1',
        'datasets_dir'  => __DIR__ . '/test-harness/server_data/inference_exp2/datasets',
    ],
];

return $config['mock_mode'] ? $config['mock'] : $config['real'];
