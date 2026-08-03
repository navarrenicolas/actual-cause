<?php
// Show errors for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get values from POST
$filename = basename($_POST['filename']); // Sanitizes input
$data = $_POST['filedata'] ?? '';

// Define save path
$target_dir = '/home/s2016170/server_data/experiment1';
$target_file = $target_dir . '/' . $filename;

// Create folder if it doesn't exist
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0775, true); // writable by owner/group
}

// Try writing file
if (file_put_contents($target_file, $data) !== false) {
    chmod($target_file, 0664); 
    echo "success";
} else {
    echo "error";
}
?>
