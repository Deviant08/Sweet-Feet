<?php
header('Content-Type: application/json');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

$STATUS_FLOW = ['placed'=>'confirmed','confirmed'=>'packed','packed'=>'dispatched','dispatched'=>'delivered'];

// GET — public order tracking by reference
if ($method==='GET' && isset($_GET['order_ref'])) {
    $ref = trim($_GET['order_ref']);
    if (empty($ref)) respond(400,['error'=>'Order reference required.']);
    try {
        $stmt = $pdo->prepare('SELECT id,total,status,ordered_at FROM orders WHERE paystack_ref=? LIMIT 1');
        $stmt->execute([$ref]);
        $order = $stmt->fetch();
        if (!$order) respond(404,['error'=>'Order not found. Please check your reference number.']);
        if ($order['status']!=='paid') respond(200,['found'=>true,'paid'=>false,'message'=>'Payment for this order was not completed.']);

        $items_stmt = $pdo->prepare(
            'SELECT oi.*, r.business_name AS retailer_name, r.phone AS retailer_phone, r.location AS retailer_location
             FROM order_items oi JOIN retailers r ON oi.retailer_id=r.id
             WHERE oi.order_id=? ORDER BY oi.id ASC'
        );
        $items_stmt->execute([$order['id']]);
        $items = $items_stmt->fetchAll();

        $track_stmt = $pdo->prepare('SELECT status,note,created_at FROM order_tracking WHERE order_item_id=? ORDER BY created_at ASC');
        foreach ($items as &$item) {
            $item['id']       = (int)   $item['id'];
            $item['quantity'] = (int)   $item['quantity'];
            $item['subtotal'] = (float) $item['subtotal'];
            $track_stmt->execute([$item['id']]);
            $item['tracking_history'] = $track_stmt->fetchAll();
        }
        unset($item);
        respond(200,['found'=>true,'paid'=>true,'order_ref'=>$ref,'ordered_at'=>$order['ordered_at'],'total'=>(float)$order['total'],'items'=>$items]);
    } catch (PDOException $e) { respond(500,['error'=>'Could not load tracking information.']); }
}

// GET — retailer's orders dashboard
if ($method==='GET' && isset($_GET['retailer_orders'])) {
    $retailer = get_retailer();
    if (!$retailer) respond(401,['success'=>false,'error'=>'Retailer login required.']);
    try {
        $stmt = $pdo->prepare(
            'SELECT oi.*, o.paystack_ref, o.ordered_at,
                    u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
             FROM order_items oi JOIN orders o ON oi.order_id=o.id JOIN users u ON o.user_id=u.id
             WHERE oi.retailer_id=? AND o.status="paid" ORDER BY o.ordered_at DESC'
        );
        $stmt->execute([$retailer['id']]);
        $orders = $stmt->fetchAll();
        $track_stmt = $pdo->prepare('SELECT status,note,created_at FROM order_tracking WHERE order_item_id=? ORDER BY created_at ASC');
        foreach ($orders as &$item) {
            $item['id']       = (int)$item['id'];
            $item['quantity'] = (int)$item['quantity'];
            $track_stmt->execute([$item['id']]);
            $item['tracking_history'] = $track_stmt->fetchAll();
        }
        unset($item);
        respond(200,$orders);
    } catch (PDOException $e) { respond(500,['error'=>'Could not load orders.']); }
}

// POST — retailer posts a status update
if ($method==='POST') {
    $retailer = get_retailer();
    if (!$retailer) respond(401,['success'=>false,'error'=>'Retailer login required.']);

    $body          = get_body();
    $order_item_id = (int)($body['order_item_id'] ?? 0);
    $new_status    = trim($body['status']         ?? '');
    $note          = trim($body['note']           ?? '');

    if (!$order_item_id||empty($new_status)) respond(400,['success'=>false,'error'=>'order_item_id and status required.']);

    $check = $pdo->prepare('SELECT oi.id,oi.status FROM order_items oi JOIN orders o ON oi.order_id=o.id WHERE oi.id=? AND oi.retailer_id=? AND o.status="paid"');
    $check->execute([$order_item_id,$retailer['id']]);
    $item = $check->fetch();
    if (!$item) respond(403,['success'=>false,'error'=>'Order item not found or not yours.']);

    $current = $item['status'];
    if (in_array($current,['delivered','cancelled'])) respond(400,['success'=>false,'error'=>"Order is already {$current}."]);

    if ($new_status!=='cancelled') {
        $allowed = $STATUS_FLOW[$current] ?? null;
        if ($new_status!==$allowed) respond(400,['success'=>false,'error'=>"Cannot update from '{$current}' to '{$new_status}'. Next allowed: '{$allowed}'."]);
    }

    $defaults = [
        'confirmed'  => 'Your order has been confirmed.',
        'packed'     => 'Your order has been packed and is ready for dispatch.',
        'dispatched' => 'Your order is on its way.',
        'delivered'  => 'Your order has been delivered. Thank you for shopping with Sweet Feet!',
        'cancelled'  => 'This order has been cancelled. Please contact the retailer.'
    ];
    if (empty($note)) $note = $defaults[$new_status] ?? '';

    try {
        $pdo->prepare('INSERT INTO order_tracking (order_item_id,status,note,updated_by) VALUES (?,?,?,?)')->execute([$order_item_id,$new_status,$note,$retailer['id']]);
        $pdo->prepare('UPDATE order_items SET status=? WHERE id=?')->execute([$new_status,$order_item_id]);
        respond(200,['success'=>true,'message'=>"Updated to '{$new_status}'.","new_status"=>$new_status]);
    } catch (PDOException $e) { respond(500,['success'=>false,'error'=>'Could not update order status.']); }
}
