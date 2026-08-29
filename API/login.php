<?php
// ============================================================
//  Sweet Feet — api/login.php
//  METHOD: POST
//  BODY:   { "email": "...", "password": "..." }
//
//  Verifies login credentials and starts a PHP session.
//
//  HOW IT WORKS:
//  1. JS sends email + password from the login form
//  2. PHP looks up the email in the users table
//  3. password_verify() compares the submitted password
//     against the stored bcrypt hash.
//     It does NOT decrypt — it re-hashes and compares.
//     This is why even if someone steals the database,
//     they cannot recover the real passwords.
//  4. If correct: PHP session is started, user ID and email
//     are stored in $_SESSION so the server remembers
//     who is logged in across page visits.
//  5. JS receives success and redirects to the homepage.
//  6. If wrong: error is returned, JS shows it on the form.
// ============================================================

header('Content-Type: application/json');

require_once 'db.php';

// Start the session so we can store login state
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

$body     = json_decode(file_get_contents('php://input'), true);
$email    = trim($body['email']    ?? '');
$password = trim($body['password'] ?? '');

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
    exit;
}

try {
    // Find the user by email
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // password_verify() is the correct way to check a bcrypt hash
    // Do NOT use == or === to compare hashes directly
    if ($user && password_verify($password, $user['password'])) {

        // Regenerate session ID on login — prevents session fixation attacks
        session_regenerate_id(true);

        // Store the user's info in the session
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['email']   = $user['email'];

        echo json_encode([
            'success' => true,
            'user_id' => (int) $user['id'],
            'email'   => $user['email']
        ]);

    } else {
        // Deliberately vague message — do not reveal whether
        // the email exists or the password was wrong.
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid email or password.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Login failed. Please try again.']);
}
