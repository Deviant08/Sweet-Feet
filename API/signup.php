<?php
// ============================================================
//  Sweet Feet — api/signup.php
//  METHOD: POST
//  BODY:   { "email": "...", "password": "..." }
//
//  Creates a new user account.
//
//  HOW IT WORKS:
//  1. JS collects email + password from the signup form
//  2. Sends a POST request here with JSON body
//  3. PHP reads the JSON, validates it
//  4. password_hash() turns "mypassword" into a long bcrypt
//     hash like "$2y$10$abc123..." — this is what gets stored.
//     The real password is NEVER stored anywhere.
//  5. Inserts the new user into the users table
//  6. Returns success → JS redirects to login page
//     OR returns error → JS shows the error message
// ============================================================

header('Content-Type: application/json');

require_once 'db.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

// Read the JSON body sent by JavaScript fetch()
$body = json_decode(file_get_contents('php://input'), true);

// Basic validation
$email    = trim($body['email']    ?? '');
$password = trim($body['password'] ?? '');

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter a valid email address.']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password must be at least 6 characters.']);
    exit;
}

// Hash the password — NEVER store plain text passwords
// PASSWORD_DEFAULT uses bcrypt, the industry standard
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

try {
    $stmt = $pdo->prepare('INSERT INTO users (email, password) VALUES (?, ?)');
    $stmt->execute([$email, $hashedPassword]);

    // Return the new user's ID so JS can store it if needed
    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully.',
        'user_id' => (int) $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    // MySQL error code 23000 = duplicate entry (email already exists)
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'An account with this email already exists.']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not create account. Please try again.']);
    }
}
