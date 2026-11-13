<?php
// CORS & Headers setup
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// ==========================================
// 1. APNI META DETAILS (ALREADY SET)
// ==========================================
$pixel_id        = '1069242212826477'; // Aapka Pixel ID
$access_token    = 'EAAQPoXcPCrEBSypifnOlJcvkuLxhcMIhhaskFit4LoRxeJBKQbHK3KUiTcnySTOZCZBV9ZBIfZBiALPBXiNP4jnEYdGv4fOup4FdByZBU7agtiNWNowhw0SCG1LbBp9giKJWJK0s5zhGZCOtZB5LkNy7SrhvCzHkZAUw9TqqwXTlQh2KLWx7zw7XfaZCEN5J97AZDZD'; // Aapka Access Token
$test_event_code = 'TEST12345'; // Test karne ke baad isko khali '' kar dein
// ==========================================

// Frontend se aaya hua JSON data read karein
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true);

if (!$data || empty($data['event_name']) || empty($data['event_id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid payload']);
    exit;
}

// Client IP Address (Cloudflare/Proxy support ke sath)
$client_ip = $_SERVER['REMOTE_ADDR'] ?? '';
if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    $client_ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $client_ip = trim($ips[0]);
}

$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

// User Data prepare karein (High Event Match Quality ke liye)
$user_data = [
    'client_ip_address' => $client_ip,
    'client_user_agent' => $user_agent,
];

if (!empty($data['fbp'])) {
    $user_data['fbp'] = $data['fbp'];
}
if (!empty($data['fbc'])) {
    $user_data['fbc'] = $data['fbc'];
}

// Meta Graph API Payload
$event_payload = [
    'data' => [
        [
            'event_name'       => $data['event_name'],
            'event_time'       => time(),
            'event_id'         => $data['event_id'], // Browser Pixel se match hone wali ID
            'event_source_url' => $data['event_source_url'] ?? '',
            'action_source'    => 'website',
            'user_data'        => $user_data,
        ]
    ]
];

// Agar Test Event Code dala gaya hai toh payload mein add karein
if (!empty($test_event_code)) {
    $event_payload['test_event_code'] = $test_event_code;
}

// Meta Conversions API Endpoint (v21.0)
$url = "https://graph.facebook.com/v21.0/{$pixel_id}/events?access_token={$access_token}";

// cURL Request bhejein
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($event_payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Response return karein
http_response_code($http_code);
echo $response;
?>
