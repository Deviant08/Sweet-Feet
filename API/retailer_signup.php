<?php
header('Content-Type: application/json');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['success'=>false,'error'=>'Method not allowed.']);

$body          = get_body();
$business_name = trim($body['business_name'] ?? '');
$email         = trim($body['email']         ?? '');
$password      = trim($body['password']      ?? '');
$phone         = trim($body['phone']         ?? '');
$location      = trim($body['location']      ?? '');
$bio           = trim($body['bio']           ?? '');

if (empty($business_name)) respond(400,['success'=>false,'error'=>'Business name is required.']);
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400,['success'=>false,'error'=>'Valid email is required.']);
if (strlen($password) < 6) respond(400,['success'=>false,'error'=>'Password must be at least 6 characters.']);
if (empty($phone))    respond(400,['success'=>false,'error'=>'Phone number is required.']);
if (empty($location)) respond(400,['success'=>false,'error'=>'Location is required.']);

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $pdo->prepare('INSERT INTO retailers (business_name,email,password,phone,location,bio,status) VALUES (?,?,?,?,?,?,"pending")')
        ->execute([$business_name,$email,$hash,$phone,$location,$bio]);
    respond(201,['success'=>true,'message'=>'Registration submitted. Your account is pending admin approval. You will be notified once approved.','id'=>(int)$pdo->lastInsertId()]);
} catch (PDOException $e) {
    if ($e->getCode()==='23000') respond(409,['success'=>false,'error'=>'A retailer account with this email already exists.']);
    respond(500,['success'=>false,'error'=>'Registration failed. Please try again.']);
}
