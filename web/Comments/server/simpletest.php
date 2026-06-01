<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function is_allowed_origin($origin) {
    if (!$origin) return false;

    $allowed_origins = [
        'https://recursi.dev',
        'https://www.recursi.dev',
        'https://mindfulvibecoding.org',
        'http://mindfulvibecoding.org',
        'https://recursi.dev',
        'http://recursi.dev',
    ];

    if (in_array($origin, $allowed_origins, true)) {
        return true;
    }

    if (preg_match('/^http:\/\/localhost(?::\d+)?$/', $origin)) {
        return true;
    }

    if (preg_match('/^http:\/\/127\.0\.0\.1(?::\d+)?$/', $origin)) {
        return true;
    }

    return false;
}

function apply_cors_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    header_remove('Access-Control-Allow-Origin');
    header_remove('Access-Control-Allow-Credentials');
    header_remove('Access-Control-Allow-Methods');
    header_remove('Access-Control-Allow-Headers');
    header_remove('Access-Control-Max-Age');

    if (is_allowed_origin($origin)) {
        header('Access-Control-Allow-Origin: ' . $origin, true);
        header('Vary: Origin', false);
        header('Access-Control-Allow-Credentials: true', true);
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS', true);
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With', true);
        header('Access-Control-Max-Age: 600', true);
    }
}

apply_cors_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dataDir = __DIR__ . '/data/';
$dataFile = $dataDir . 'simpletest.txt';

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

if (!file_exists($dataFile)) {
    file_put_contents($dataFile, "Simple test file initialized at " . date('c') . "\n");
}

$action = $_GET['action'] ?? 'ping';

function send_json($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function read_body_json() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

switch ($action) {
    case 'ping':
        send_json([
            'success' => true,
            'action' => 'ping',
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
            'origin' => $_SERVER['HTTP_ORIGIN'] ?? null,
            'time' => date('c'),
            'message' => 'simpletest.php is alive',
        ]);
        break;

    case 'read':
        send_json([
            'success' => true,
            'action' => 'read',
            'text' => file_get_contents($dataFile),
            'bytes' => filesize($dataFile),
            'time' => date('c'),
        ]);
        break;

    case 'write':
        $input = read_body_json();
        $text = isset($input['text']) ? (string)$input['text'] : '';
        file_put_contents($dataFile, $text);
        send_json([
            'success' => true,
            'action' => 'write',
            'bytes' => strlen($text),
            'time' => date('c'),
        ]);
        break;

    case 'append':
        $input = read_body_json();
        $text = isset($input['text']) ? (string)$input['text'] : '';
        file_put_contents($dataFile, $text, FILE_APPEND | LOCK_EX);
        send_json([
            'success' => true,
            'action' => 'append',
            'bytes' => strlen($text),
            'time' => date('c'),
        ]);
        break;

    default:
        send_json([
            'success' => false,
            'error' => 'Invalid action specified.',
            'action' => $action,
        ], 404);
}
