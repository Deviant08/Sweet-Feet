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
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user||!password_verify($password,$user['password']))
        respond(401,['success'=>false,'error'=>'Invalid email or password.']);

    session_regenerate_id(true);
    $_SESSION['customer_id']    = (int)$user['id'];
    $_SESSION['customer_email'] = $user['email'];
    $_SESSION['customer_name']  = $user['full_name'];

    respond(200,['success'=>true,'user_id'=>(int)$user['id'],'email'=>$user['email'],'name'=>$user['full_name']]);
} catch (PDOException $e) {
    respond(500,['success'=>false,'error'=>'Login failed.']);
}
