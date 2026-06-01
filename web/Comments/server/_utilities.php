<?php
// --- CORE UTILITY FUNCTIONS ---

function log_to_file($message) {
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = is_string($message) ? $message : print_r($message, true);
    file_put_contents(DEBUG_LOG_FILE, "[$timestamp] " . $log_entry . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function send_json_error($message, $statusCode = 400) {
    log_to_file("ERROR: Sending JSON error to client. Status: $statusCode, Message: $message");
    http_response_code($statusCode);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

function read_json_lines($filePath) {
    if (!file_exists($filePath)) return [];
    
    // FIX: Use shared lock for reads to prevent reading during writes
    $fp = fopen($filePath, 'r');
    if (!$fp) return [];
    
    flock($fp, LOCK_SH); // Shared lock allows concurrent reads but blocks during writes
    $content = '';
    while (!feof($fp)) {
        $content .= fread($fp, 8192);
    }
    flock($fp, LOCK_UN);
    fclose($fp);
    
    $lines = explode("\n", $content);
    $decoded = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        $decoded_line = json_decode($line, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $decoded[] = $decoded_line;
        }
    }
    return $decoded;
}

function write_json_lines($filePath, $data) {
    // FIX: Write to temp file then atomically rename to prevent corruption
    $tempFile = $filePath . '.tmp.' . getmypid();
    $fp = fopen($tempFile, 'w');
    if (!$fp) {
        send_json_error('Could not open temp file for writing.', 500);
    }
    
    foreach ($data as $item) {
        fwrite($fp, json_encode($item) . PHP_EOL);
    }
    fclose($fp);
    
    // Acquire exclusive lock on actual file during the rename
    $lockFp = fopen($filePath, 'c');
    if (!$lockFp || !flock($lockFp, LOCK_EX)) {
        @unlink($tempFile);
        send_json_error('Could not acquire exclusive lock for writing.', 500);
    }
    
    rename($tempFile, $filePath);
    
    flock($lockFp, LOCK_UN);
    fclose($lockFp);
}

/**
 * Safely performs a read-modify-write operation on a JSON lines file.
 * The callback receives the current data array and must return the new data array.
 * The file is exclusively locked for the entire operation to prevent race conditions.
 */
function atomic_read_modify_write($filePath, $callback) {
    // Ensure the file exists
    if (!file_exists($filePath)) {
        file_put_contents($filePath, '');
    }
    
    $fp = fopen($filePath, 'r+');
    if (!$fp) {
        send_json_error('Could not open file for atomic operation.', 500);
    }
    
    // Exclusive lock for the entire read-modify-write cycle
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        send_json_error('Could not acquire exclusive lock.', 500);
    }
    
    // Read current data
    $content = '';
    while (!feof($fp)) {
        $content .= fread($fp, 8192);
    }
    
    $lines = explode("\n", $content);
    $data = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        $decoded = json_decode($line, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $data[] = $decoded;
        }
    }
    
    // Let the callback modify the data
    $result = $callback($data);
    $newData = $result['data'];
    
    // Write back
    ftruncate($fp, 0);
    rewind($fp);
    foreach ($newData as $item) {
        fwrite($fp, json_encode($item) . PHP_EOL);
    }
    
    flock($fp, LOCK_UN);
    fclose($fp);
    
    return $result;
}

function get_comments_file_path($threadId) {
    $cleanId = preg_replace('/[^a-zA-Z0-9_-]/', '', $threadId);
    if (empty($cleanId)) $cleanId = 'main';
    return DATA_PATH . 'comments_' . $cleanId . '.txt';
}

function ensure_data_files_exist() {
    if (!is_dir(DATA_PATH)) {
        if (!@mkdir(DATA_PATH, 0755)) send_json_error('Could not create data directory.', 500);
    }
    
    // FIX: Protect data directory with .htaccess to prevent direct web access
    $htaccessPath = DATA_PATH . '.htaccess';
    if (!file_exists($htaccessPath)) {
        file_put_contents($htaccessPath, "Deny from all\n");
    }
    
    if (!file_exists(USERS_FILE)) {
        if (@file_put_contents(USERS_FILE, '') === false) send_json_error('Could not create users file.', 500);
    }
}

function normalize_name($name) {
    $no_color = preg_replace('/@([0-9\.]*)?/', '', $name);
    if (class_exists('Transliterator')) {
        $transliterator = Transliterator::createFromRules(':: Any-Latin; :: Latin-ASCII; :: Lower;');
        return $transliterator->transliterate($no_color);
    }
    return strtolower(preg_replace('/[^A-Za-z0-9]/', '', $no_color));
}

function sanitize_comment_text($text) {
    $text = strip_tags(trim($text));
    // Remove any null bytes
    $text = str_replace("\0", '', $text);
    // Limit length to prevent abuse (10,000 chars is generous for a comment)
    if (mb_strlen($text) > 10000) {
        $text = mb_substr($text, 0, 10000);
    }
    return $text;
}

/**
 * Simple rate limiter based on IP address.
 * Returns true if the action is allowed, false if rate limited.
 */
function check_rate_limit($action, $maxAttempts, $windowSeconds) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateLimitFile = DATA_PATH . 'ratelimit.txt';
    
    $now = time();
    $entries = [];
    
    if (file_exists($rateLimitFile)) {
        $fp = fopen($rateLimitFile, 'r+');
        if ($fp && flock($fp, LOCK_EX)) {
            $content = '';
            while (!feof($fp)) {
                $content .= fread($fp, 8192);
            }
            
            $lines = explode("\n", $content);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) continue;
                $entry = json_decode($line, true);
                if (!$entry) continue;
                // Keep entries within the window
                if ($entry['time'] >= ($now - $windowSeconds)) {
                    $entries[] = $entry;
                }
            }
            
            // Count attempts for this IP and action
            $count = 0;
            foreach ($entries as $entry) {
                if ($entry['ip'] === $ip && $entry['action'] === $action) {
                    $count++;
                }
            }
            
            if ($count >= $maxAttempts) {
                flock($fp, LOCK_UN);
                fclose($fp);
                return false;
            }
            
            // Record this attempt
            $entries[] = ['ip' => $ip, 'action' => $action, 'time' => $now];
            
            // Write back cleaned entries
            ftruncate($fp, 0);
            rewind($fp);
            foreach ($entries as $entry) {
                fwrite($fp, json_encode($entry) . PHP_EOL);
            }
            
            flock($fp, LOCK_UN);
            fclose($fp);
            return true;
        }
        if ($fp) fclose($fp);
    } else {
        // First request ever
        $entry = ['ip' => $ip, 'action' => $action, 'time' => $now];
        file_put_contents($rateLimitFile, json_encode($entry) . PHP_EOL, LOCK_EX);
        return true;
    }
    
    return true; // Allow if we can't check (fail open)
}

/**
 * Hash a session token for storage (don't store raw tokens).
 */
function hash_session_token($token) {
    return hash('sha256', $token);
}
