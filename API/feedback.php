<?php
// ============================================================
//  Sweet Feet — api/feedback.php
//  METHOD: POST
//  BODY:   { name, email, category, rating, message }
//
//  Saves a customer feedback submission to the database.
//
//  HOW IT WORKS:
//  1. User fills in the feedback form and clicks Submit
//  2. JS collects all field values into a JSON object
//  3. Sends POST request to this file
//  4. PHP validates, then inserts into the feedback table
//  5. Returns success → JS hides the form, shows thank-you card
// ============================================================

header('Content-Type: application/json');

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

// Sanitise inputs
$name     = trim($body['name']     ?? '');
$email    = trim($body['email']    ?? '');
$category = trim($body['category'] ?? '');
$rating   = (int) ($body['rating'] ?? 0);
$message  = trim($body['message']  ?? '');

// Basic validation
if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Name, email, and message are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter a valid email address.']);
    exit;
}

// Rating must be between 1 and 5
if ($rating < 1 || $rating > 5) {
    $rating = null; // allow null rating if not provided
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO feedback (name, email, category, rating, message)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$name, $email, $category, $rating, $message]);

    echo json_encode([
        'success' => true,
        'message' => 'Thank you for your feedback!'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not save feedback. Please try again.']);
}
