<?php
// ============================================================
//  Sweet Feet — api/logout.php
//  METHOD: POST
//
//  Destroys the user's session (logs them out).
//  Call this when the user clicks a logout button.
//
//  JS usage:
//    await fetch('/api/logout.php', { method: 'POST' });
//    window.location.href = '/index.html';
// ============================================================

header('Content-Type: application/json');
session_start();

// Clear all session data
$_SESSION = [];

// Delete the session cookie from the browser
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(), '', time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
    );
}

// Destroy the session on the server
session_destroy();

echo json_encode(['success' => true, 'message' => 'Logged out successfully.']);
