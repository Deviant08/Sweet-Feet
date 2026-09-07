<?php
header('Content-Type: application/json');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD']!=='POST') respond(405,['success'=>false,'error'=>'Method not allowed.']);

$body      = get_body();
$full_name = trim($body['full_name'] ?? '');
$email     = trim($body['email']     ?? '');
$password  = trim($body['password']  ?? '');
$phone     = trim($body['phone']     ?? '');

if (empty($email)||!filter_var($email,FILTER_VALIDATE_EMAIL)) respond(400,['success'=>false,'error'=>'Valid email is required.']);
if (strlen($password)<6) respond(400,['success'=>false,'error'=>'Password must be at least 6 characters.']);

$hash = password_hash($password,PASSWORD_DEFAULT);

try {
    $pdo->prepare('INSERT INTO users (full_name,email,password,phone) VALUES (?,?,?,?)')
        ->execute([$full_name,$email,$hash,$phone]);
    respond(201,['success'=>true,'message'=>'Account created. Please log in.','user_id'=>(int)$pdo->lastInsertId()]);
} catch (PDOException $e) {
    if ($e->getCode()==='23000') respond(409,['success'=>false,'error'=>'An account with this email already exists.']);
    respond(500,['success'=>false,'error'=>'Registration failed.']);
}
