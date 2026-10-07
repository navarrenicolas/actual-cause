<?php
declare(strict_types=1);

// Two independent queues below datasets_dir:
//   available -> in_progress -> used
//   available_noexpl -> in_progress_noexpl -> used_noexpl
// Export creates one copy per condition; claims and saves never cross queues.
// Both condition output roots contain assign_log.csv and data/ (CSVs + replays).
// New directories, including missing parents, use explicit 0777 permissions.
// Keep the server-specific paths below when deploying.
// mock_mode controls PHP fixtures; browser ?mock=1 bypasses PHP altogether.

$config = [
    'mock_mode' => false,

    'real' => [
        'explanation' => [
            'exp2_data_dir' => '/home/s2518809/server_data/cs/exp2inf/exp2expl-pilot/',
            // 'exp2_data_dir' => '/home/s2518809/server_data/cs/exp2inf/exp2inf-0/',
        ],
        'no_explanation' => [
            'exp2_data_dir' => '/home/s2518809/server_data/cs/exp2inf/exp2noexpl-pilot/',
            // 'exp2_data_dir' => '/home/s2518809/server_data/cs/exp2inf/exp2noexpl/data-0',
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
