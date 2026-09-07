<?php
header('Content-Type: application/json');
require_once 'db.php';

$method   = $_SERVER['REQUEST_METHOD'];
$customer = get_customer();
$retailer = get_retailer();

if (!$customer && !$retailer) respond(401,['success'=>false,'error'=>'Login required.']);

// GET — inbox summary
if ($method==='GET' && isset($_GET['inbox'])) {
    try {
        if ($customer) {
            $stmt = $pdo->prepare(
                'SELECT r.id AS retailer_id, r.business_name AS retailer_name, r.logo AS retailer_logo,
                        MAX(m.created_at) AS last_message_time,
                        (SELECT message FROM messages WHERE customer_id=? AND retailer_id=r.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                        SUM(CASE WHEN m.is_read=0 AND m.sender_type="retailer" THEN 1 ELSE 0 END) AS unread_count
                 FROM messages m JOIN retailers r ON m.retailer_id=r.id
                 WHERE m.customer_id=? GROUP BY r.id ORDER BY last_message_time DESC'
            );
            $stmt->execute([$customer['id'],$customer['id']]);
        } else {
            $stmt = $pdo->prepare(
                'SELECT u.id AS customer_id, u.full_name AS customer_name, u.email AS customer_email,
                        MAX(m.created_at) AS last_message_time,
                        (SELECT message FROM messages WHERE retailer_id=? AND customer_id=u.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                        SUM(CASE WHEN m.is_read=0 AND m.sender_type="customer" THEN 1 ELSE 0 END) AS unread_count
                 FROM messages m JOIN users u ON m.customer_id=u.id
                 WHERE m.retailer_id=? GROUP BY u.id ORDER BY last_message_time DESC'
            );
            $stmt->execute([$retailer['id'],$retailer['id']]);
        }
        respond(200,$stmt->fetchAll());
    } catch (PDOException $e) { respond(500,['error'=>'Could not load inbox.']); }
}

// GET — fetch conversation
if ($method==='GET' && !isset($_GET['inbox'])) {
    $retailer_id = (int)($_GET['retailer_id'] ?? 0);
    $customer_id = (int)($_GET['customer_id'] ?? 0);
    $product_id  = (int)($_GET['product_id']  ?? 0);

    if ($customer) {
        if (!$retailer_id) respond(400,['error'=>'retailer_id required.']);
        $c_id=$customer['id']; $r_id=$retailer_id;
    } else {
        if (!$customer_id) respond(400,['error'=>'customer_id required.']);
        $c_id=$customer_id; $r_id=$retailer['id'];
    }

    try {
        $sql    = 'SELECT m.*, u.full_name AS customer_name, r.business_name AS retailer_name FROM messages m JOIN users u ON m.customer_id=u.id JOIN retailers r ON m.retailer_id=r.id WHERE m.customer_id=? AND m.retailer_id=?';
        $params = [$c_id,$r_id];
        if ($product_id) { $sql.=' AND m.product_id=?'; $params[]=$product_id; }
        $sql.=' ORDER BY m.created_at ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $msgs = $stmt->fetchAll();

        // Mark as read
        $reader_type = $customer ? 'retailer' : 'customer';
        $pdo->prepare('UPDATE messages SET is_read=1 WHERE customer_id=? AND retailer_id=? AND sender_type=? AND is_read=0')
            ->execute([$c_id,$r_id,$reader_type]);

        foreach ($msgs as &$m) {
            $m['id']          = (int)$m['id'];
            $m['customer_id'] = (int)$m['customer_id'];
            $m['retailer_id'] = (int)$m['retailer_id'];
            $m['is_read']     = (bool)$m['is_read'];
        }
        unset($m);
        respond(200,$msgs);
    } catch (PDOException $e) { respond(500,['error'=>'Could not load messages.']); }
}

// POST — send message
if ($method==='POST') {
    $body    = get_body();
    $message = trim($body['message'] ?? '');
    if (empty($message)) respond(400,['success'=>false,'error'=>'Message cannot be empty.']);

    if ($customer) {
        $retailer_id = (int)($body['retailer_id'] ?? 0);
        $product_id  = (int)($body['product_id']  ?? 0) ?: null;
        $order_id    = (int)($body['order_id']    ?? 0) ?: null;
        if (!$retailer_id) respond(400,['success'=>false,'error'=>'retailer_id required.']);
        $check = $pdo->prepare("SELECT id FROM retailers WHERE id=? AND status='approved'");
        $check->execute([$retailer_id]);
        if (!$check->fetch()) respond(404,['success'=>false,'error'=>'Retailer not found.']);
        try {
            $pdo->prepare('INSERT INTO messages (customer_id,retailer_id,product_id,order_id,sender_type,message) VALUES (?,?,?,?,"customer",?)')
                ->execute([$customer['id'],$retailer_id,$product_id,$order_id,$message]);
            respond(201,['success'=>true,'message_id'=>(int)$pdo->lastInsertId()]);
        } catch (PDOException $e) { respond(500,['success'=>false,'error'=>'Could not send message.']); }
    } else {
        $customer_id = (int)($body['customer_id'] ?? 0);
        $product_id  = (int)($body['product_id']  ?? 0) ?: null;
        $order_id    = (int)($body['order_id']    ?? 0) ?: null;
        if (!$customer_id) respond(400,['success'=>false,'error'=>'customer_id required.']);
        $check = $pdo->prepare('SELECT id FROM users WHERE id=?');
        $check->execute([$customer_id]);
        if (!$check->fetch()) respond(404,['success'=>false,'error'=>'Customer not found.']);
        try {
            $pdo->prepare('INSERT INTO messages (customer_id,retailer_id,product_id,order_id,sender_type,message) VALUES (?,?,?,?,"retailer",?)')
                ->execute([$customer_id,$retailer['id'],$product_id,$order_id,$message]);
            respond(201,['success'=>true,'message_id'=>(int)$pdo->lastInsertId()]);
        } catch (PDOException $e) { respond(500,['success'=>false,'error'=>'Could not send message.']); }
    }
}
