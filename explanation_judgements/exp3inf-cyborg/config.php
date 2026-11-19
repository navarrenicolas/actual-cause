<?php
declare(strict_types=1);
// Study 3 owns its queue and output; never point these at Study 2 paths.
return [
    'data_dir' => getenv('STUDY3_DATA_DIR') ?: '/home/s2518809/server_data/cs/exp3inf/pilot/',
    'datasets_dir' => __DIR__ . '/data_harness',
];
