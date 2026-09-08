<?php
declare(strict_types=1);

// Central runtime configuration for this experiment's PHP endpoint
// (safe_save.php). Simpler than exp2inf's config.php: this experiment
// never claims experiment_1 data (it generates its own rule/urn config
// client-side — see main.js), so there's no exp1_data_dir or datasets_dir
// to configure, only where its own completed participant CSVs get saved.
//
// Flip 'mock_mode' to true to save against the local test-harness/
// fixture instead of the real directory below — a server-side switch,
// independent of main.html's own client-side ?mock=1 preview.

$config = [
    'mock_mode' => false,

    'real' => [
        'exp2_data_dir' => '/home/s2518809/server_data/cs/exp2inf/exp2noexpl/data-0',
    ],

    'mock' => [
        'exp2_data_dir' => __DIR__ . '/test-harness/server_data/exp2noexpl-0',
    ],
];

return $config['mock_mode'] ? $config['mock'] : $config['real'];
