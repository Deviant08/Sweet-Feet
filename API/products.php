<?php
// ============================================================
//  Sweet Feet — api/products.php
//  METHOD: GET
//  URL:    /api/products.php
//
//  Returns all products from the database as a JSON array.
//  JavaScript calls this on products page load and uses the
//  returned data instead of the old hardcoded array.
//
//  HOW IT WORKS:
//  1. JS calls fetch('/api/products.php')
//  2. This file queries the products table
//  3. It converts the sizes string "39,40,41" → [39, 40, 41]
//  4. It echoes JSON back to the browser
//  5. JS receives the array and renders the product grid
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');  // allow requests from the frontend

require_once 'db.php';

try {
    // Fetch every product. No WHERE clause — the frontend
    // handles all filtering client-side using JavaScript.
    $stmt = $pdo->query('SELECT * FROM products ORDER BY id ASC');
    $products = $stmt->fetchAll();

    // The database stores sizes as "39,40,41,42"
    // Convert each back to an integer array for JavaScript
    foreach ($products as &$product) {
        $product['sizes'] = array_map('intval', explode(',', $product['sizes']));

        // Convert numeric strings to proper numbers
        $product['id']           = (int)   $product['id'];
        $product['price']        = (float) $product['price'];
        $product['rating']       = (float) $product['rating'];
        $product['rating_count'] = (int)   $product['rating_count'];

        // old_price is nullable — keep it as null if not set
        $product['old_price'] = $product['old_price'] !== null
            ? (float) $product['old_price']
            : null;

        // Map snake_case DB columns to camelCase for JavaScript
        // so the frontend code doesn't need to change
        $product['oldPrice']    = $product['old_price'];
        $product['ratingCount'] = $product['rating_count'];
        $product['badgeLabel']  = $product['badge_label'];

        // Remove the snake_case duplicates
        unset($product['old_price'], $product['rating_count'], $product['badge_label']);
    }
    unset($product); // break the reference

    echo json_encode($products);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not load products.']);
}
