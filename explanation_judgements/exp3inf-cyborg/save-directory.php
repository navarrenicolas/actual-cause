<?php
declare(strict_types=1);

// New directories get the requested 0777 mode even under a restrictive umask.
// Existing directories retain their permissions; symlinks/nonfolders are rejected.
function createStudyDirectory(string $dir): void
{
    clearstatcache(true, $dir);
    if (is_link($dir) || (file_exists($dir) && !is_dir($dir))) {
        throw new RuntimeException('Invalid study directory');
    }
    if (is_dir($dir)) return;
    createStudyDirectory(dirname($dir));
    $created = @mkdir($dir, 0777);
    if (!$created && !is_dir($dir)) throw new RuntimeException('Could not create study directory');
    if (is_link($dir)) throw new RuntimeException('Invalid study directory');
    if ($created && !@chmod($dir, 0777)) {
        @rmdir($dir);
        throw new RuntimeException('Could not set directory permissions');
    }
}

function ensureSaveDirectory(array $config, string $condition): string
{
    $parent = rtrim($config[$condition]['exp2_data_dir'], '/');
    if ($parent === '') throw new RuntimeException('Save directory is not configured');
    createStudyDirectory($parent);
    createStudyDirectory($parent . '/data');
    $base = realpath($parent . '/data');
    if ($base === false || !is_writable($base)) throw new RuntimeException('Save directory is not writable');
    return $base;
}
