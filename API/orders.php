<?php
require_once 'db.php';

define('PAYSTACK_SECRET_KEY','sk_test_REPLACE_WITH_YOUR_KEY');
define('CALLBACK_URL','http://localhost/sweetfeet/api/orders.php');

$method = $_SERVER['REQUEST_METHOD'];

// POST — initiate Paystack payment
if ($method==='POST') {
    header('Content-Type: application/json');
    $body  = get_body();
    $cart  = $body['cart']  ?? [];
    $email = trim($body['email'] ?? '');

    if (empty($cart)||!is_array($cart)) respond(400,['success'=>false,'error'=>'Cart is empty.']);
    if (empty($email)||!filter_var($email,FILTER_VALIDATE_EMAIL)) respond(400,['success'=>false,'error'=>'Valid email required.']);

    $totalNaira = 0;
    foreach ($cart as $item) $totalNaira += (float)($item['price']??0) * (int)($item['qty']??1);
    if ($totalNaira<=0) respond(400,['success'=>false,'error'=>'Invalid cart total.']);

    $totalKobo = (int)round($totalNaira*100);
    $reference = 'SF_'.strtoupper(bin2hex(random_bytes(8))).'_'.time();
    $customer  = get_customer();
    $userId    = $customer['id'] ?? null;

    try {
        $pdo->prepare('INSERT INTO orders (user_id,total,paystack_ref,status) VALUES (?,?,?,"pending")')->execute([$userId,$totalNaira,$reference]);
        $orderId = (int)$pdo->lastInsertId();

        $item_stmt = $pdo->prepare('INSERT INTO order_items (order_id,retailer_id,product_id,product_name,size,quantity,unit_price,subtotal,status) VALUES (?,?,?,?,?,?,?,?,"placed")');
        $track_stmt = $pdo->prepare('INSERT INTO order_tracking (order_item_id,status,note,updated_by) VALUES (?,"placed","Order received. Awaiting retailer confirmation.",?)');

        foreach ($cart as $item) {
            $product_id   = (int)  ($item['id']          ?? 0);
            $retailer_id  = (int)  ($item['retailer_id'] ?? 0);
            $product_name = trim($item['name']            ?? 'Unknown Product');
            $size         = trim($item['selectedSize']    ?? '');
            $qty          = (int)  ($item['qty']          ?? 1);
            $unit_price   = (float)($item['price']        ?? 0);
            $subtotal     = $unit_price * $qty;
            if (!$retailer_id) continue;
            $item_stmt->execute([$orderId,$retailer_id,$product_id?:null,$product_name,$size,$qty,$unit_price,$subtotal]);
            $orderItemId = (int)$pdo->lastInsertId();
            $track_stmt->execute([$orderItemId,$retailer_id]);
        }
    } catch (PDOException $e) { respond(500,['success'=>false,'error'=>'Could not create order record.']); }

    $paystackData = json_encode(['email'=>$email,'amount'=>$totalKobo,'reference'=>$reference,'callback_url'=>CALLBACK_URL.'?reference='.$reference,'currency'=>'NGN']);
    $curl = curl_init();
    curl_setopt_array($curl,[CURLOPT_URL=>'https://api.paystack.co/transaction/initialize',CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$paystackData,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.PAYSTACK_SECRET_KEY,'Content-Type: application/json']]);
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl,CURLINFO_HTTP_CODE);
    curl_close($curl);
    $result = json_decode($response,true);

    if ($httpCode===200 && $result['status']===true)
        respond(200,['success'=>true,'payment_url'=>$result['data']['authorization_url'],'reference'=>$reference]);
    else
        respond(502,['success'=>false,'error'=>$result['message']??'Payment initialisation failed.']);
}

// GET — Paystack callback after payment
if ($method==='GET' && isset($_GET['reference'])) {
    $reference = trim($_GET['reference']);
    if (empty($reference)) { header('Location: /sweetfeet/index.html'); exit; }

    $curl = curl_init();
    curl_setopt_array($curl,[CURLOPT_URL=>'https://api.paystack.co/transaction/verify/'.rawurlencode($reference),CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.PAYSTACK_SECRET_KEY]]);
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl,CURLINFO_HTTP_CODE);
    curl_close($curl);
    $result = json_decode($response,true);

    if ($httpCode===200 && $result['status']===true && $result['data']['status']==='success') {
        try {
            $pdo->prepare('UPDATE orders SET status="paid" WHERE paystack_ref=? AND status="pending"')->execute([$reference]);
            header('Location: /sweetfeet/nav/order_success.html?ref='.urlencode($reference)); exit;
        } catch (PDOException $e) {
            error_log('Payment verified but DB update failed: '.$e->getMessage());
            header('Location: /sweetfeet/nav/order_error.html?reason=db_error'); exit;
        }
    } else {
        try { $pdo->prepare('UPDATE orders SET status="failed" WHERE paystack_ref=? AND status="pending"')->execute([$reference]); } catch (PDOException $e) {}
        header('Location: /sweetfeet/nav/order_error.html?reason=payment_failed'); exit;
    }
}
