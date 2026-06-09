<?php
/**
 * Vibes P2P Signaling Server (PHP)
 * Implements a simple GET/POST corkboard for WebRTC SDP exchanges.
 */

// Enable CORS so the browser and mobile controller can communicate across domains
// The local .htaccess in this directory disables Apache's global CORS header,
// ensuring this is the ONLY Access-Control-Allow-Origin header sent to the browser.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Aggressive anti-caching headers prevent stale WebRTC SDP offer/answer retrievals
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Extract topic from PATH_INFO (e.g. /signal.php/vibes-rotate-7777-host)
$pathInfo = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
$topic = trim($pathInfo, '/');

if (empty($topic)) {
    // Fallback to query parameter if PATH_INFO is not populated by Apache
    $topic = isset($_GET['topic']) ? $_GET['topic'] : '';
}

// Sanitize topic to avoid path traversal
$topic = preg_replace('/[^a-zA-Z0-9_-]/', '', $topic);

if (empty($topic)) {
    http_response_code(400);
    echo "Error: Missing or invalid topic.";
    exit;
}

$storeDir = __DIR__ . '/p2p_signal_store';

// Automatically create directory if missing
if (!is_dir($storeDir)) {
    if (!mkdir($storeDir, 0755, true)) {
        http_response_code(500);
        echo "Error: Failed to create storage directory.";
        exit;
    }
    // Write .htaccess to block direct browser access to raw signal files
    file_put_contents($storeDir . '/.htaccess', "Deny from all\n");
}

$filePath = $storeDir . '/' . $topic . '.json';

// Garbage Collection: 5% chance to purge stale files older than 5 minutes
if (rand(1, 100) <= 5) {
    $files = glob($storeDir . '/*.json');
    $now = time();
    foreach ($files as $file) {
        if ($now - filemtime($file) > 300) {
            @unlink($file);
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input');
    
    // Safety check on request size
    if (strlen($body) > 65536) {
        http_response_code(413);
        echo "Error: Payload too large.";
        exit;
    }

    $payload = [
        'body' => $body,
        'timestamp' => time()
    ];

    if (file_put_contents($filePath, json_encode($payload)) === false) {
        http_response_code(500);
        echo "Error: Failed to write signal payload.";
        exit;
    }

    echo "ok";
    exit;
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        $data = json_decode($content, true);
        if ($data && (time() - $data['timestamp'] < 300)) {
            echo $data['body'];
            exit;
        }
    }
    // Return empty response if no active offer/answer exists
    echo "";
    exit;
} else {
    http_response_code(405);
    echo "Error: Method not allowed.";
    exit;
}
