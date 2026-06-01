<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

function shutdown_crash_handler() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_COMPILE_ERROR || $error['type'] === E_CORE_ERROR)) {
        if (ob_get_length()) ob_clean();

        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => "FATAL PHP ERROR: " . $error['message'],
            'file' => $error['file'],
            'line' => $error['line']
        ]);
        exit;
    }
}
register_shutdown_function('shutdown_crash_handler');

ob_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

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

define('DATA_PATH', __DIR__ . '/data/');
define('USERS_FILE', DATA_PATH . 'users.txt');
define('DEBUG_LOG_FILE', DATA_PATH . 'debug.log');
define('COOKIE_NAME', 'recurs_comment_session');

try {
    if (!file_exists(__DIR__ . '/_utilities.php')) throw new Exception("Missing file: _utilities.php");
    require_once __DIR__ . '/_utilities.php';

    if (!file_exists(__DIR__ . '/UserActions.php')) throw new Exception("Missing file: UserActions.php");
    require_once __DIR__ . '/UserActions.php';

    if (!file_exists(__DIR__ . '/CommentActions.php')) throw new Exception("Missing file: CommentActions.php");
    require_once __DIR__ . '/CommentActions.php';

    if (!file_exists(__DIR__ . '/AdminActions.php')) throw new Exception("Missing file: AdminActions.php");
    require_once __DIR__ . '/AdminActions.php';

    ensure_data_files_exist();
    log_to_file("--- API Request Received: " . ($_GET['action'] ?? 'No Action') . " ---");

    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'registerUser':            handle_register_user(); break;
        case 'loginUser':               handle_login_user(); break;
        case 'setPassword':             handle_set_password(); break;
        case 'getOrCreateUser':         handle_get_or_create_user(); break;
        case 'getCurrentUser':          handle_get_current_user(); break;
        case 'updateUserDisplayName':   handle_update_user_display_name(); break;

        case 'getThreadData':           handle_get_thread_data(); break;
        case 'postComment':             handle_post_comment(); break;
        case 'deleteComment':           handle_delete_comment(); break;
        case 'submitRating':            handle_submit_rating(); break;

        case 'clearAllData':            handle_clear_all_data(); break;
        case 'adminSeedComment':        handle_admin_seed_comment(); break;
        case 'adminGetThreadStats':     handle_admin_get_thread_stats(); break;
        case 'adminGetThreads':         handle_admin_get_threads(); break;
        case 'adminDeleteComment':      handle_admin_delete_comment(); break;
        case 'adminAssumeUserSession':  handle_admin_assume_user_session(); break;
        case 'adminLogout':             handle_admin_logout(); break;

        default:
            send_json_error('Invalid action specified.', 404);
    }

} catch (Exception $e) {
    if (ob_get_length()) ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

ob_end_flush();