<?php
header('Content-Type: application/json');
require_once 'db.php';
if (session_status()===PHP_SESSION_NONE) session_start();

if ($_SERVER['REQUEST_METHOD']!=='POST') respond(405,['success'=>false,'error'=>'Method not allowed.']);

$body     = get_body();
$email    = trim($body['email']    ?? '');
$password = trim($body['password'] ?? '');

if (empty($email)||empty($password)) respond(400,['success'=>false,'error'=>'Email and password are required.']);

try {
    $stmt = $pdo->prepare('SELECT * FROM retailers WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $retailer = $stmt->fetch();

    if (!$retailer || !password_verify($password,$retailer['password']))
        respond(401,['success'=>false,'error'=>'Invalid email or password.']);

    if ($retailer['status']==='pending')
        respond(403,['success'=>false,'error'=>'Your account is awaiting admin approval. You will be notified once approved.']);

    if ($retailer['status']==='suspended')
        respond(403,['success'=>false,'error'=>'Your account has been suspended. Please contact Sweet Feet support.']);

    session_regenerate_id(true);
    $_SESSION['retailer_id']    = (int)$retailer['id'];
    $_SESSION['retailer_email'] = $retailer['email'];
    $_SESSION['retailer_name']  = $retailer['business_name'];

    respond(200,['success'=>true,'retailer_id'=>(int)$retailer['id'],'business_name'=>$retailer['business_name'],'email'=>$retailer['email'],'location'=>$retailer['location']]);

} catch (PDOException $e) {
    respond(500,['success'=>false,'error'=>'Login failed. Please try again.']);
}
