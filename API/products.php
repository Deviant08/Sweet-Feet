<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET — public listing (all approved products with retailer info)
if ($method==='GET' && !isset($_GET['retailer'])) {
    try {
        $stmt = $pdo->query(
            'SELECT p.*, r.business_name AS retailer_name, r.location AS retailer_location,
                    r.logo AS retailer_logo, r.phone AS retailer_phone
             FROM products p
             JOIN retailers r ON p.retailer_id = r.id
             WHERE p.is_active=1 AND r.status="approved"
             ORDER BY p.id ASC'
        );
        $products = $stmt->fetchAll();
        foreach ($products as &$p) {
            $p['sizes']        = array_map('intval', explode(',', $p['sizes']));
            $p['id']           = (int)   $p['id'];
            $p['retailer_id']  = (int)   $p['retailer_id'];
            $p['price']        = (float) $p['price'];
            $p['rating']       = (float) $p['rating'];
            $p['rating_count'] = (int)   $p['rating_count'];
            $p['old_price']    = $p['old_price']!==null ? (float)$p['old_price'] : null;
            $p['oldPrice']     = $p['old_price'];
            $p['ratingCount']  = $p['rating_count'];
            $p['badgeLabel']   = $p['badge_label'];
            $p['retailerName'] = $p['retailer_name'];
            $p['retailerLocation'] = $p['retailer_location'];
            unset($p['old_price'],$p['rating_count'],$p['badge_label'],$p['retailer_name'],$p['retailer_location']);
        }
        unset($p);
        respond(200,$products);
    } catch (PDOException $e) { respond(500,['error'=>'Could not load products.']); }
}

// GET — retailer's own products
if ($method==='GET' && isset($_GET['retailer'])) {
    $retailer = get_retailer();
    if (!$retailer) respond(401,['success'=>false,'error'=>'Retailer login required.']);
    try {
        $stmt = $pdo->prepare('SELECT * FROM products WHERE retailer_id=? ORDER BY created_at DESC');
        $stmt->execute([$retailer['id']]);
        $products = $stmt->fetchAll();
        foreach ($products as &$p) {
            $p['sizes']     = array_map('intval',explode(',',$p['sizes']));
            $p['id']        = (int)   $p['id'];
            $p['price']     = (float) $p['price'];
            $p['old_price'] = $p['old_price']!==null ? (float)$p['old_price'] : null;
            $p['rating']    = (float) $p['rating'];
            $p['is_active'] = (bool)  $p['is_active'];
        }
        unset($p);
        respond(200,$products);
    } catch (PDOException $e) { respond(500,['error'=>'Could not load your products.']); }
}

// POST — create product
if ($method==='POST') {
    $retailer = get_retailer();
    if (!$retailer) respond(401,['success'=>false,'error'=>'Retailer login required.']);
    $body = get_body();
    $name      = trim($body['name']      ?? '');
    $category  = trim($body['category']  ?? '');
    $gender    = trim($body['gender']    ?? 'unisex');
    $price     = (float)($body['price']  ?? 0);
    $old_price = isset($body['old_price']) ? (float)$body['old_price'] : null;
    $color     = trim($body['color']     ?? '');
    $badge     = trim($body['badge']     ?? '') ?: null;
    $badge_label = trim($body['badge_label'] ?? '') ?: null;
    $img       = trim($body['img']       ?? '');
    $sizes     = is_array($body['sizes'] ?? null) ? implode(',',$body['sizes']) : trim($body['sizes'] ?? '');
    if (empty($name)||$price<=0||empty($img)||empty($sizes))
        respond(400,['success'=>false,'error'=>'Name, price, image and sizes are required.']);
    try {
        $pdo->prepare('INSERT INTO products (retailer_id,name,category,gender,price,old_price,color,badge,badge_label,img,sizes) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$retailer['id'],$name,$category,$gender,$price,$old_price,$color,$badge,$badge_label,$img,$sizes]);
        respond(201,['success'=>true,'message'=>'Product listed.','id'=>(int)$pdo->lastInsertId()]);
    } catch (PDOException $e) { respond(500,['success'=>false,'error'=>'Could not create listing.']); }
}

// PUT — update product
if ($method==='PUT') {
    $retailer = get_retailer();
    if (!$retailer) respond(401,['success'=>false,'error'=>'Retailer login required.']);
    $body = get_body();
    $id = (int)($body['id'] ?? 0);
    if (!$id) respond(400,['success'=>false,'error'=>'Product ID required.']);
    $check = $pdo->prepare('SELECT id FROM products WHERE id=? AND retailer_id=?');
    $check->execute([$id,$retailer['id']]);
    if (!$check->fetch()) respond(403,['success'=>false,'error'=>'You do not own this product.']);
    $fields = ['name','category','gender','price','old_price','color','badge','badge_label','img','is_active'];
    $updates=[]; $values=[];
    foreach ($fields as $f) { if (isset($body[$f])) { $updates[]="$f=?"; $values[]=$body[$f]; } }
    if (isset($body['sizes'])) { $updates[]='sizes=?'; $values[]=is_array($body['sizes'])?implode(',',$body['sizes']):$body['sizes']; }
    if (empty($updates)) respond(400,['success'=>false,'error'=>'No fields to update.']);
    $values[]=$id;
    try {
        $pdo->prepare('UPDATE products SET '.implode(',',$updates).' WHERE id=?')->execute($values);
        respond(200,['success'=>true,'message'=>'Product updated.']);
    } catch (PDOException $e) { respond(500,['success'=>false,'error'=>'Could not update.']); }
}

// DELETE — soft delete
if ($method==='DELETE') {
    $retailer = get_retailer();
    if (!$retailer) respond(401,['success'=>false,'error'=>'Retailer login required.']);
    $body = get_body();
    $id = (int)($body['id'] ?? 0);
    if (!$id) respond(400,['success'=>false,'error'=>'Product ID required.']);
    $check = $pdo->prepare('SELECT id FROM products WHERE id=? AND retailer_id=?');
    $check->execute([$id,$retailer['id']]);
    if (!$check->fetch()) respond(403,['success'=>false,'error'=>'You do not own this product.']);
    try {
        $pdo->prepare('UPDATE products SET is_active=0 WHERE id=?')->execute([$id]);
        respond(200,['success'=>true,'message'=>'Product removed from listing.']);
    } catch (PDOException $e) { respond(500,['success'=>false,'error'=>'Could not remove product.']); }
}
