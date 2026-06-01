<?php

function handle_admin_get_threads() {
    log_to_file("Executing: handle_admin_get_threads");
    $threads = [];
    if (is_dir(DATA_PATH)) {
        $files = scandir(DATA_PATH);
        foreach ($files as $file) {
            if (preg_match('/^comments_(.+)\.txt$/', $file, $matches)) {
                $threads[] = $matches[1];
            }
        }
    }
    // Always ensure at least 'main' exists in the list to prevent empty states
    if (empty($threads)) {
        $threads[] = 'main';
    }
    echo json_encode(['success' => true, 'threads' => array_values(array_unique($threads))]);
}

function handle_admin_logout() {
    log_to_file("Executing: handle_admin_logout");
    // Unset the session cookie
    setcookie(COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'None',
    ]);
    echo json_encode(['success' => true, 'message' => 'Session cleared.']);
}

function handle_clear_all_data() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (isset($input['threadId'])) {
        $threadId = $input['threadId'];
        log_to_file("Executing: handle_clear_all_data - CLEARING THREAD: $threadId");
        $commentsFilePath = get_comments_file_path($threadId);
        file_put_contents($commentsFilePath, '', LOCK_EX);
        echo json_encode(['success' => true, 'message' => "Thread '$threadId' has been cleared."]);
        return;
    }

    log_to_file("Executing: handle_clear_all_data - CLEARING USERS AND MAIN COMMENTS.");
    file_put_contents(USERS_FILE, '', LOCK_EX);
    $commentsFilePath = get_comments_file_path('main');
    file_put_contents($commentsFilePath, '', LOCK_EX);

    echo json_encode(['success' => true, 'message' => 'Users and main thread data cleared.']);
}

function handle_admin_delete_comment() {
    log_to_file("Executing: handle_admin_delete_comment");
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['targetId'])) {
        send_json_error('targetId is required.');
    }

    $threadId = isset($input['threadId']) ? $input['threadId'] : 'main';
    $commentsFilePath = get_comments_file_path($threadId);

    $tombstone = [
        'type' => 'delete',
        'targetId' => $input['targetId'],
        'deletedBy' => isset($input['deletedBy']) ? $input['deletedBy'] : 'admin-debug',
        'timestamp' => date('c'),
    ];

    _append_to_file($commentsFilePath, $tombstone);
    echo json_encode(['success' => true, 'deletedId' => $input['targetId']]);
}

function handle_admin_get_thread_stats() {
    log_to_file("Executing: handle_admin_get_thread_stats");
    $threadId = isset($_GET['threadId']) ? $_GET['threadId'] : 'main';

    $commentsFilePath = get_comments_file_path($threadId);
    $users = read_json_lines(USERS_FILE);
    $rawLines = read_json_lines($commentsFilePath);

    $commentCount = 0;
    $tombstoneCount = 0;
    $rootCount = 0;
    $latestTimestamp = null;
    $threadUserIds = [];

    foreach ($rawLines as $item) {
        if (!is_array($item)) continue;

        if (isset($item['type']) && $item['type'] === 'delete') {
            $tombstoneCount++;
            continue;
        }

        if (!isset($item['id'])) continue;

        $commentCount++;
        if (empty($item['parentId'])) {
            $rootCount++;
        }

        if (isset($item['userId'])) {
            $threadUserIds[$item['userId']] = true;
        }

        if (isset($item['timestamp'])) {
            if ($latestTimestamp === null || strcmp($item['timestamp'], $latestTimestamp) > 0) {
                $latestTimestamp = $item['timestamp'];
            }
        }
    }

    echo json_encode([
        'success' => true,
        'stats' => [
            'threadId' => $threadId,
            'totalUsers' => count($users),
            'threadUserCount' => count($threadUserIds),
            'commentRecordCount' => $commentCount,
            'tombstoneCount' => $tombstoneCount,
            'rootCommentCount' => $rootCount,
            'latestTimestamp' => $latestTimestamp,
            'commentsFile' => basename($commentsFilePath),
        ],
    ]);
}

function handle_admin_assume_user_session() {
    log_to_file("Executing: handle_admin_assume_user_session");
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['userId']) || !$input['userId']) {
        send_json_error('userId is required.');
    }

    $userId = $input['userId'];
    $sessionToken = bin2hex(random_bytes(32));
    $tokenHash = hash_session_token($sessionToken);

    $result = atomic_read_modify_write(USERS_FILE, function($users) use ($userId, $tokenHash) {
        $foundIndex = -1;

        foreach ($users as $index => $user) {
            if (isset($user['id']) && $user['id'] === $userId) {
                $foundIndex = $index;
                break;
            }
        }

        if ($foundIndex === -1) {
            send_json_error('User not found.', 404);
        }

        $users[$foundIndex]['sessionTokenHash'] = $tokenHash;
        unset($users[$foundIndex]['sessionToken']);

        return ['data' => $users, 'user' => $users[$foundIndex]];
    });

    _set_session_cookie($sessionToken);

    $user = $result['user'];
    _add_public_user_data($user);

    echo json_encode([
        'success' => true,
        'user' => $user,
        'message' => 'Session switched.'
    ]);
}
?>