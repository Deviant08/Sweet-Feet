<?php
// ============================================================
//  Sweet Feet — api/initiate_payment.php
//  METHOD: POST
//  BODY:   { "cart": [...], "email": "customer@email.com" }
//
//  This is Step 1 of the Paystack payment flow.
//
//  HOW PAYSTACK WORKS (read this carefully):
//  ─────────────────────────────────────────
//  Paystack does NOT take card details on your site.
//  Instead, the flow is:
//
//  1. Customer clicks "Proceed to Checkout"
//  2. JS sends the cart + email to THIS file
//  3. This file saves a "pending" order to the database
//     and calls the Paystack API to initialise a transaction
//  4. Paystack returns a unique payment URL
//  5. This file sends that URL back to JS
//  6. JS redirects the customer to the Paystack payment page
//     (hosted on Paystack's servers — totally secure)
//  7. Customer pays on Paystack's page
//  8. Paystack redirects back to YOUR callback URL
//     (which is verify_payment.php)
//  9. verify_payment.php confirms the payment with Paystack
//     and marks the order as "paid" in your database
//
//  SETUP REQUIRED:
//  ───────────────
//  1. Go to https://dashboard.paystack.com
//  2. Create a free account
//  3. Go to Settings → API Keys & Webhooks
//  4. Copy your SECRET KEY (starts with sk_test_ for testing)
//  5. Paste it below where it says PAYSTACK_SECRET_KEY
//  6. Set CALLBACK_URL to your site's verify_payment.php URL
//     e.g. http://localhost/sweetfeet/api/verify_payment.php
//     (when live: https://yourdomain.com/api/verify_payment.php)
// ============================================================

header('Content-Type: application/json');

require_once 'db.php';

// ── YOUR PAYSTACK KEYS ───────────────────────────────────────
// Test keys start with sk_test_ (use these during development)
// Live keys start with sk_live_ (use these when your site is live)
define('PAYSTACK_SECRET_KEY', 'sk_test_REPLACE_WITH_YOUR_SECRET_KEY');
define('CALLBACK_URL', 'http://localhost/sweetfeet/api/verify_payment.php');

// ─────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

$body  = json_decode(file_get_contents('php://input'), true);
$cart  = $body['cart']  ?? [];
$email = trim($body['email'] ?? '');

// Validate inputs
if (empty($cart) || empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Cart and email are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email address.']);
    exit;
}

// Calculate the total from the cart
// price is in Naira, Paystack expects KOBO (1 Naira = 100 Kobo)
$totalNaira = 0;
foreach ($cart as $item) {
    $totalNaira += (float)($item['price'] ?? 0) * (int)($item['qty'] ?? 1);
}
$totalKobo = (int) round($totalNaira * 100);

if ($totalKobo <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Cart total is invalid.']);
    exit;
}

// Generate a unique reference for this transaction
// This reference ties your database record to the Paystack transaction
$reference = 'SF_' . strtoupper(bin2hex(random_bytes(8))) . '_' . time();

// Save the order to the database with status "pending"
// We save it NOW before going to Paystack so we have a record
// even if the customer abandons the payment
try {
    $stmt = $pdo->prepare(
        'INSERT INTO orders (user_id, items, total, paystack_ref, status)
         VALUES (?, ?, ?, ?, ?)'
    );

    // Get user_id from session if logged in, otherwise null
    session_start();
    $userId = $_SESSION['user_id'] ?? null;

    $stmt->execute([
        $userId,
        json_encode($cart),
        $totalNaira,
        $reference,
        'pending'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not create order record.']);
    exit;
}

// ── CALL THE PAYSTACK API ─────────────────────────────────────
// We use PHP's curl to make a server-to-server request
// to Paystack's /transaction/initialize endpoint.
// This is done on the SERVER so your secret key is never
// exposed to the browser.

$paystackData = json_encode([
    'email'     => $email,
    'amount'    => $totalKobo,         // must be in kobo
    'reference' => $reference,
    'callback_url' => CALLBACK_URL,    // where to redirect after payment
    'currency'  => 'NGN',
    'metadata'  => [
        'order_ref'   => $reference,
        'cancel_action' => 'http://localhost/sweetfeet/nav/products.html'
    ]
]);

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL            => 'https://api.paystack.co/transaction/initialize',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $paystackData,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . PAYSTACK_SECRET_KEY,
        'Content-Type: application/json',
        'Cache-Control: no-cache',
    ],
]);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

// Parse Paystack's response
$result = json_decode($response, true);

if ($httpCode === 200 && $result['status'] === true) {
    // Paystack gave us a payment URL — send it to the frontend
    echo json_encode([
        'success'       => true,
        'payment_url'   => $result['data']['authorization_url'],
        'reference'     => $reference
    ]);
} else {
    // Paystack returned an error
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error'   => $result['message'] ?? 'Payment initialisation failed. Try again.'
    ]);
}
