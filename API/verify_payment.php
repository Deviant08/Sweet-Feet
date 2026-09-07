<?php
// ============================================================
//  Sweet Feet — api/verify_payment.php
//  METHOD: GET (Paystack redirects the browser here)
//
//  This is Step 2 of the Paystack payment flow.
//  Paystack calls this URL automatically after the customer
//  pays (or cancels) on the Paystack payment page.
//
//  HOW IT WORKS:
//  ─────────────
//  1. After payment, Paystack redirects the customer's
//     browser to this URL with a "reference" in the URL:
//     /api/verify_payment.php?reference=SF_ABC123_1234567890
//
//  2. This file takes that reference and calls Paystack's
//     /transaction/verify/{reference} endpoint
//
//  3. Paystack confirms whether payment was successful
//
//  4. If confirmed: update the order in our database
//     from status "pending" → "paid"
//
//  5. Redirect the customer to a success or failure page
//
//  WHY DO WE VERIFY SERVER-SIDE?
//  ──────────────────────────────
//  Anyone could manually visit this URL with a fake reference.
//  By calling Paystack's API from our server and checking
//  their response, we confirm the payment actually happened.
//  NEVER trust client-side data alone for payments.
// ============================================================

require_once 'db.php';

// Use the same secret key as initiate_payment.php
define('PAYSTACK_SECRET_KEY', 'sk_test_REPLACE_WITH_YOUR_SECRET_KEY');

// Get the reference from the URL ?reference=...
$reference = $_GET['reference'] ?? '';

if (empty($reference)) {
    // No reference — redirect to homepage
    header('Location: /sweetfeet/index.html');
    exit;
}

// ── VERIFY WITH PAYSTACK ──────────────────────────────────────
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL            => 'https://api.paystack.co/transaction/verify/' . rawurlencode($reference),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . PAYSTACK_SECRET_KEY,
        'Cache-Control: no-cache',
    ],
]);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

$result = json_decode($response, true);

if ($httpCode === 200 && $result['status'] === true && $result['data']['status'] === 'success') {

    // ── PAYMENT CONFIRMED ─────────────────────────────────────
    // Paystack says the payment went through.
    // Update our order record from "pending" to "paid".

    try {
        $stmt = $pdo->prepare(
            'UPDATE orders SET status = ? WHERE paystack_ref = ? AND status = ?'
        );
        // The AND status = "pending" prevents double-processing
        // if Paystack somehow calls this twice
        $stmt->execute(['paid', $reference, 'pending']);

        // Redirect to a success page
        // You can create a simple success.html in the nav/ folder
        header('Location: /sweetfeet/nav/order_success.html?ref=' . urlencode($reference));
        exit;

    } catch (PDOException $e) {
        // Database update failed — log it and redirect to error
        error_log('Payment verified but DB update failed: ' . $e->getMessage());
        header('Location: /sweetfeet/nav/order_error.html?reason=db_error');
        exit;
    }

} else {

    // ── PAYMENT FAILED OR CANCELLED ───────────────────────────
    // Update status to "failed" in our database
    try {
        $stmt = $pdo->prepare(
            'UPDATE orders SET status = ? WHERE paystack_ref = ? AND status = ?'
        );
        $stmt->execute(['failed', $reference, 'pending']);
    } catch (PDOException $e) {
        error_log('Failed order DB update failed: ' . $e->getMessage());
    }

    // Redirect to an error/cancelled page
    header('Location: /sweetfeet/nav/order_error.html?reason=payment_failed');
    exit;
}
