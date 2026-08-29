<?php
// ============================================================
//  Sweet Feet — api/db.php
//  Shared database connection file.
//  Every other PHP file starts with:  require_once 'db.php';
//
//  HOW IT WORKS:
//  PHP Data Objects (PDO) is used instead of the older
//  mysqli_ functions because PDO supports prepared statements
//  which prevent SQL injection attacks automatically.
//
//  BEFORE GOING LIVE:
//  Change DB_PASS to your real MySQL password.
//  On a live server, store credentials in environment
//  variables or a config file outside the web root.
// ============================================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'sweetfeet');
define('DB_USER', 'root');
define('DB_PASS', '');          // XAMPP default has no password

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            // Throw exceptions on error instead of silent failure
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            // Return rows as associative arrays by default
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Disable emulated prepared statements for real security
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    // Send a clean JSON error instead of exposing PHP internals
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database connection failed. Check your XAMPP MySQL service.']);
    exit;
}
